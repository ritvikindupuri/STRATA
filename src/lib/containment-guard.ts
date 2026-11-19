import { nestedString } from "./type-utils.ts";

export type CompromisedKey = { userName: string; accessKeyId: string };

export function parseApprovalAction(action: unknown): "approve" | "reject" | null {
  if (action === "approve" || action === "reject") return action;
  return null;
}

export function extractCompromisedKey(f: {
  username?: string | null;
  raw?: unknown;
}): CompromisedKey | null {
  const raw = f.raw;
  const userName =
    f.username ??
    nestedString(raw, ["userIdentity", "userName"]) ??
    nestedString(raw, ["Resource", "AccessKeyDetails", "UserName"]);
  const accessKeyId =
    nestedString(raw, ["userIdentity", "accessKeyId"]) ??
    nestedString(raw, ["Resource", "AccessKeyDetails", "AccessKeyId"]);
  if (!userName || !accessKeyId) return null;
  return { userName, accessKeyId };
}

/** The key disabled must be the key still on the finding, not a rewritten approval target. */
export function approvalTargetMatchesFinding(
  approvalTarget: string,
  finding: { username?: string | null; raw?: unknown },
): CompromisedKey | null {
  const extracted = extractCompromisedKey(finding);
  if (!extracted) return null;
  if (`${extracted.userName}:${extracted.accessKeyId}` !== approvalTarget) return null;
  return extracted;
}
