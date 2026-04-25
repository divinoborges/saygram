import { VOICE } from "@/lib/config";
import { MODEL, REALTIME_CLIENT_SECRETS_URL } from "@/lib/constants";

const NO_STORE_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function jsonResponse(
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...NO_STORE_HEADERS, ...extraHeaders },
  });
}

function readBearer(request: Request): string | null {
  const raw = request.headers.get("authorization");
  if (!raw) return null;
  const match = raw.match(/^\s*Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

export async function GET(request: Request) {
  const headerKey = readBearer(request);
  const envKey = process.env.OPENAI_API_KEY?.trim() || null;
  const apiKey = headerKey ?? envKey;
  const source = headerKey ? "user" : "env";

  if (!apiKey) {
    return jsonResponse(401, { ok: false, error: "no_key" });
  }

  let upstream: Response;
  try {
    upstream = await fetch(REALTIME_CLIENT_SECRETS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_after: { anchor: "created_at", seconds: 600 },
        session: {
          type: "realtime",
          model: MODEL,
          audio: { output: { voice: VOICE } },
        },
      }),
      cache: "no-store",
    });
  } catch (error) {
    console.error(
      "Realtime client_secrets request failed before reaching upstream",
      error instanceof Error ? error.message : "unknown error",
    );
    return jsonResponse(502, { ok: false, error: "upstream_unreachable" });
  }

  if (upstream.status === 401) {
    return jsonResponse(401, { ok: false, error: "invalid_key" });
  }

  const upstreamBody = await upstream.text();

  if (!upstream.ok) {
    console.error(
      "Realtime client_secrets returned non-OK status",
      upstream.status,
    );
    return new Response(upstreamBody, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(upstreamBody, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
      "X-Session-Source": source,
    },
  });
}
