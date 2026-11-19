import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { approvalTargetMatchesFinding, parseApprovalAction } from "./containment-guard.ts";

const finding = {
  username: "admin.prod",
  raw: {
    userIdentity: { userName: "admin.prod", accessKeyId: "caller-key-1" },
  },
};

test("action please is rejected", () => {
  assert.equal(parseApprovalAction("please"), null);
  assert.equal(parseApprovalAction("Approve"), null);
  assert.equal(parseApprovalAction(""), null);
  assert.equal(parseApprovalAction("approve"), "approve");
  assert.equal(parseApprovalAction("reject"), "reject");
});

test("a tampered approval target is rejected", () => {
  assert.equal(approvalTargetMatchesFinding("victim.user:other-key-9", finding), null);
  const bound = approvalTargetMatchesFinding("admin.prod:caller-key-1", finding);
  assert.deepEqual(bound, { userName: "admin.prod", accessKeyId: "caller-key-1" });
});

test("containment screen lists approval_request and clients cannot rewrite the target", () => {
  const screen = readFileSync(new URL("../routes/app.blocked.tsx", import.meta.url), "utf8");
  assert.match(screen, /action_type", "approval_request"/);
  assert.doesNotMatch(screen, /action_type", "block"/);

  const migration = readFileSync(
    new URL(
      "../../supabase/migrations/20261119120000_h2_bind_containment_approval.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(migration, /DROP POLICY IF EXISTS "own approvals update"/);
  assert.match(migration, /DROP POLICY IF EXISTS "own findings insert"/);
  assert.match(migration, /DROP POLICY IF EXISTS "own findings update"/);
  assert.match(migration, /REVOKE UPDATE ON public.pending_approvals/);
  assert.match(migration, /REVOKE INSERT, UPDATE ON public.findings/);
});
