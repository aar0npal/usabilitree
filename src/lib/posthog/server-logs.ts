import { SeverityNumber } from "@opentelemetry/api-logs";
import { loggerProvider } from "@/instrumentation";
import { getPosthogIdentityFromHeaders } from "@/lib/posthog/request-identity";

type LogPrimitive = string | number | boolean;
type LogAttributes = Record<string, LogPrimitive | null | undefined>;
type RequestContext = {
  headers?: {
    get(name: string): string | null;
  };
};

const routeLogger = loggerProvider.getLogger("nextjs.route");

function sanitizeAttributes(attributes: LogAttributes): Record<string, LogPrimitive> {
  return Object.fromEntries(
    Object.entries(attributes).filter(
      (entry): entry is [string, LogPrimitive] => entry[1] !== undefined && entry[1] !== null
    )
  );
}

function errorAttributes(error: unknown): Record<string, string> {
  if (error === undefined) return {};

  if (error instanceof Error) {
    return {
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack?.slice(0, 4000) ?? "",
    };
  }

  return {
    error_name: typeof error,
    error_message: String(error),
  };
}

function emit(severityNumber: SeverityNumber, body: string, attributes: LogAttributes) {
  routeLogger.emit({
    body,
    severityNumber,
    attributes: sanitizeAttributes(attributes),
  });
}

function posthogIdentityAttributes(requestContext?: RequestContext): LogAttributes {
  const identity = getPosthogIdentityFromHeaders(requestContext?.headers);

  return {
    posthogDistinctId: identity.distinctId,
    sessionId: identity.sessionId,
  };
}

export function createRouteLogger(route: string, method: string, requestContext?: RequestContext) {
  const baseAttributes = {
    route,
    method,
    source: "nextjs.route-handler",
    ...posthogIdentityAttributes(requestContext),
  };

  return {
    info: (body: string, attributes: LogAttributes = {}) => {
      emit(SeverityNumber.INFO, body, { ...baseAttributes, ...attributes });
    },
    warn: (body: string, attributes: LogAttributes = {}) => {
      emit(SeverityNumber.WARN, body, { ...baseAttributes, ...attributes });
    },
    error: (body: string, error: unknown, attributes: LogAttributes = {}) => {
      emit(SeverityNumber.ERROR, body, {
        ...baseAttributes,
        ...attributes,
        ...errorAttributes(error),
      });
    },
    flush: () => {
      // With SimpleLogRecordProcessor, each log is exported immediately.
    },
  };
}
