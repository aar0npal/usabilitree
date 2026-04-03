import * as Sentry from "@sentry/nextjs";
import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { getPosthogIdentityFromHeaders } from "@/lib/posthog/request-identity";

const serviceName = process.env.POSTHOG_SERVICE_NAME?.trim() || "usabilitree";
const nodeEnv = process.env.NODE_ENV ?? "development";
const posthogProjectToken = process.env.POSTHOG_PROJECT_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
const enableConsolePatch = process.env.POSTHOG_CAPTURE_CONSOLE_LOGS === "true";
const posthogLogsHost = (
  process.env.POSTHOG_LOGS_HOST ??
  process.env.NEXT_PUBLIC_POSTHOG_HOST ??
  "https://us.i.posthog.com"
).replace(/\/$/, "");
const posthogLogsUrl = process.env.POSTHOG_LOGS_URL ?? `${posthogLogsHost}/i/v1/logs`;

const logProcessors = posthogProjectToken
  ? [
      new BatchLogRecordProcessor(
        new OTLPLogExporter({
          url: posthogLogsUrl,
          headers: {
            Authorization: `Bearer ${posthogProjectToken}`,
            "Content-Type": "application/json",
          },
        })
      ),
    ]
  : [];

export const loggerProvider = new LoggerProvider({
  resource: resourceFromAttributes({
    "service.name": serviceName,
    "deployment.environment": nodeEnv,
  }),
  processors: logProcessors,
});

const instrumentationLogger = loggerProvider.getLogger("nextjs.instrumentation");

function toLogBody(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function sanitizeLogBody(body: string): string {
  const sensitivePatterns = [
    /Bearer\s+[A-Za-z0-9._-]+/gi,
    /sntrys_[A-Za-z0-9._=-]+/g,
    /SG\.[A-Za-z0-9._-]+/g,
    /whsec_[A-Za-z0-9._-]+/g,
    /creem_(?:test|live)_[A-Za-z0-9._-]+/g,
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  ];

  let sanitized = body;
  for (const pattern of sensitivePatterns) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }

  const maxBodyLength = 4000;
  if (sanitized.length > maxBodyLength) {
    return `${sanitized.slice(0, maxBodyLength)}...[truncated]`;
  }

  return sanitized;
}

function patchNodeConsoleLogs() {
  if (!posthogProjectToken || !enableConsolePatch) return;

  const globalState = globalThis as typeof globalThis & {
    __usabilitreePosthogConsolePatched?: boolean;
  };

  if (globalState.__usabilitreePosthogConsolePatched) return;

  globalState.__usabilitreePosthogConsolePatched = true;

  const consoleLogger = loggerProvider.getLogger("node.console");

  const patchMethod = (method: "log" | "warn" | "error", severityNumber: SeverityNumber) => {
    const original = console[method].bind(console);

    console[method] = (...args: unknown[]) => {
      try {
        consoleLogger.emit({
          body: sanitizeLogBody(args.map(toLogBody).join(" ")),
          severityNumber,
          attributes: {
            source: "console",
            console_method: method,
          },
        });
      } catch {
        // Never block original console behavior.
      }

      original(...args);
    };
  };

  patchMethod("log", SeverityNumber.INFO);
  patchMethod("warn", SeverityNumber.WARN);
  patchMethod("error", SeverityNumber.ERROR);
}

function toErrorAttributes(error: unknown): Record<string, string> {
  if (error instanceof Error) {
    return {
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack?.slice(0, 4000) ?? "",
    };
  }

  return {
    error_name: typeof error,
    error_message: toLogBody(error),
  };
}

function toPosthogRequestAttributes(request: unknown): Record<string, string> {
  const requestWithHeaders = request as {
    headers?: {
      get(name: string): string | null;
    };
  };

  const identity = getPosthogIdentityFromHeaders(requestWithHeaders.headers);

  const attributes: Record<string, string> = {};
  if (identity.distinctId) {
    attributes.posthogDistinctId = identity.distinctId;
  }
  if (identity.sessionId) {
    attributes.sessionId = identity.sessionId;
  }

  return attributes;
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");

    logs.setGlobalLoggerProvider(loggerProvider);
    patchNodeConsoleLogs();

    instrumentationLogger.emit({
      body: posthogProjectToken
        ? "PostHog Logs initialized"
        : "PostHog Logs disabled (missing token)",
      severityNumber: posthogProjectToken ? SeverityNumber.INFO : SeverityNumber.WARN,
      attributes: {
        source: "nextjs.instrumentation",
        logs_url: posthogLogsUrl,
        console_patch_enabled: enableConsolePatch,
      },
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError: typeof Sentry.captureRequestError = (...args) => {
  const [error, request] = args;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    let pathname = "unknown";
    let method = "unknown";

    const requestWithPath = request as { path?: unknown; method?: unknown };
    const requestWithUrl = request as { url?: unknown; method?: unknown };

    if (typeof requestWithPath.method === "string") {
      method = requestWithPath.method;
    } else if (typeof requestWithUrl.method === "string") {
      method = requestWithUrl.method;
    }

    if (typeof requestWithPath.path === "string") {
      pathname = requestWithPath.path;
    } else if (typeof requestWithUrl.url === "string") {
      try {
        pathname = new URL(requestWithUrl.url).pathname;
      } catch {
        pathname = requestWithUrl.url;
      }
    }

    instrumentationLogger.emit({
      body: "Unhandled Next.js request error",
      severityNumber: SeverityNumber.ERROR,
      attributes: {
        source: "nextjs.onRequestError",
        route: pathname,
        method,
        ...toPosthogRequestAttributes(request),
        ...toErrorAttributes(error),
      },
    });
  }

  return Sentry.captureRequestError(...args);
};
