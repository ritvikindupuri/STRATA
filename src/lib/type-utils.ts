/**
 * Small typing helpers so call sites can avoid `any` without changing behavior.
 */

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export async function readJson(res: Response): Promise<unknown> {
  return res.json().catch(() => ({}));
}

export function chatMessageContent(payload: unknown): string {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) return "";
  const first = payload.choices[0];
  if (!isRecord(first) || !isRecord(first.message)) return "";
  return typeof first.message.content === "string" ? first.message.content : "";
}

export function nestedString(obj: unknown, path: string[]): string | undefined {
  let current: unknown = obj;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return typeof current === "string" ? current : undefined;
}
