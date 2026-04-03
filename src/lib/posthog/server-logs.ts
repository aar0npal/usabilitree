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

type RouteUserContext = {
  id?: string;
  email?: string;
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

  const routeUserContext: RouteUserContext = {};

  function currentAttributes(): LogAttributes {
    return {
      ...baseAttributes,
      user_id: routeUserContext.id,
      user_email: routeUserContext.email,
    };
  }

  return {
    setUser: (user: RouteUserContext) => {
      if (user.id) {
        routeUserContext.id = user.id;
      }
      if (user.email) {
        routeUserContext.email = user.email;
      }
    },
    info: (body: string, attributes: LogAttributes = {}) => {
      emit(SeverityNumber.INFO, body, { ...currentAttributes(), ...attributes });
    },
    warn: (body: string, attributes: LogAttributes = {}) => {
      emit(SeverityNumber.WARN, body, { ...currentAttributes(), ...attributes });
    },
    error: (body: string, error: unknown, attributes: LogAttributes = {}) => {
      emit(SeverityNumber.ERROR, body, {
        ...currentAttributes(),
        ...attributes,
        ...errorAttributes(error),
      });
    },
    flush: async () => {
      try {
        await loggerProvider.forceFlush();
      } catch {
        // Never fail request flow because of telemetry flush issues.
      }
    },
  };
}
