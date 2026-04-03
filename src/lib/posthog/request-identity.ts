type HeaderReader = {
  get(name: string): string | null;
};

type PosthogIdentity = {
  distinctId?: string;
  sessionId?: string;
};

function decodeCookieValue(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function parseCookieHeader(cookieHeader: string): Record<string, string> {
  const parsed: Record<string, string> = {};

  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const name = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!name) continue;

    parsed[name] = value;
  }

  return parsed;
}

function parseSessionId(raw: unknown): string | undefined {
  if (typeof raw === "string") {
    return raw;
  }

  if (Array.isArray(raw) && typeof raw[1] === "string") {
    return raw[1];
  }

  return undefined;
}

export function getPosthogIdentityFromHeaders(headers?: HeaderReader): PosthogIdentity {
  const fromHeaders: PosthogIdentity = {
    distinctId: headers?.get("x-posthog-distinct-id")?.trim() || undefined,
    sessionId: headers?.get("x-posthog-session-id")?.trim() || undefined,
  };

  if (fromHeaders.distinctId && fromHeaders.sessionId) {
    return fromHeaders;
  }

  const cookieHeader = headers?.get("cookie") || "";
  if (!cookieHeader) {
    return fromHeaders;
  }

  const cookies = parseCookieHeader(cookieHeader);
  const posthogCookieName = Object.keys(cookies).find(
    (name) => name.startsWith("ph_") && name.endsWith("_posthog")
  );

  if (!posthogCookieName) {
    return fromHeaders;
  }

  const rawCookieValue = cookies[posthogCookieName];
  if (!rawCookieValue) {
    return fromHeaders;
  }

  try {
    const decoded = decodeCookieValue(rawCookieValue);
    const parsed = JSON.parse(decoded) as Record<string, unknown>;

    const cookieDistinctId =
      typeof parsed.distinct_id === "string" ? parsed.distinct_id : undefined;
    const cookieSessionId = parseSessionId(parsed.$sesid);

    return {
      distinctId: fromHeaders.distinctId || cookieDistinctId,
      sessionId: fromHeaders.sessionId || cookieSessionId,
    };
  } catch {
    return fromHeaders;
  }
}
