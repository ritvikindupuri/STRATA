// AWS Signature V4 signer — pure Web Crypto, works in Cloudflare Workers.
// Spec: https://docs.aws.amazon.com/general/latest/gr/sigv4_signing.html

const enc = new TextEncoder();

async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const buf = typeof data === "string" ? enc.encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", buf as BufferSource);
  return toHex(new Uint8Array(hash));
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
}

function toHex(buf: Uint8Array): string {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface SignedRequestInit {
  method: string;
  service: string;       // e.g. "sts", "cloudtrail", "guardduty"
  region: string;        // e.g. "us-east-1"
  host: string;          // e.g. "sts.amazonaws.com"
  path?: string;         // default "/"
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export async function signAwsRequest(req: SignedRequestInit): Promise<{ url: string; headers: Record<string, string> }> {
  const method = req.method.toUpperCase();
  const path = req.path || "/";
  const body = req.body ?? "";
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);

  const headers: Record<string, string> = {
    host: req.host,
    "x-amz-date": amzDate,
    ...(req.sessionToken ? { "x-amz-security-token": req.sessionToken } : {}),
    ...(req.headers ?? {}),
  };

  const payloadHash = await sha256Hex(body);
  headers["x-amz-content-sha256"] = payloadHash;

  // Canonical query
  const queryEntries = Object.entries(req.query ?? {}).sort(([a], [b]) => (a < b ? -1 : 1));
  const canonicalQuery = queryEntries
    .map(([k, v]) => `${encodeRfc3986(k)}=${encodeRfc3986(v)}`)
    .join("&");

  // Canonical headers (lowercased keys, sorted)
  const sortedHeaderKeys = Object.keys(headers).map((k) => k.toLowerCase()).sort();
  const canonicalHeaders = sortedHeaderKeys
    .map((k) => `${k}:${String(headers[Object.keys(headers).find((h) => h.toLowerCase() === k)!]).trim().replace(/\s+/g, " ")}\n`)
    .join("");
  const signedHeaders = sortedHeaderKeys.join(";");

  const canonicalRequest = [method, path, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join("\n");

  const credentialScope = `${dateStamp}/${req.region}/${req.service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, await sha256Hex(canonicalRequest)].join("\n");

  const kDate = await hmac(enc.encode(`AWS4${req.secretAccessKey}`), dateStamp);
  const kRegion = await hmac(kDate, req.region);
  const kService = await hmac(kRegion, req.service);
  const kSigning = await hmac(kService, "aws4_request");
  const signature = toHex(new Uint8Array(await hmac(kSigning, stringToSign)));

  const authorization = `AWS4-HMAC-SHA256 Credential=${req.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    url: `https://${req.host}${path}${canonicalQuery ? `?${canonicalQuery}` : ""}`,
    headers: { ...headers, Authorization: authorization },
  };
}

function encodeRfc3986(s: string): string {
  return encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}
