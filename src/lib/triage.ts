import {
  delimitUntrustedData,
  getSecurityAnalysisSystemPrompt,
  parseAndValidateLlmResponse,
  SecurityAnalysisSchema,
  type SecurityAnalysis,
} from "./prompt-injection-defense.ts";

const SEVERITIES = ["low", "medium", "high", "critical"] as const;
type Severity = (typeof SEVERITIES)[number];

const FAIL_CLOSED = {
  ai_severity: "low" as const,
  ai_category: "needs-review",
  ai_summary: "",
  ai_remediation: "",
};

function isSeverity(value: string): value is Severity {
  return (SEVERITIES as readonly string[]).includes(value);
}

/** User message is only the fenced event. Instructions live in the system prompt. */
export function buildTriageRequest(raw: unknown): { system: string; user: string } {
  const eventJson = JSON.stringify(raw ?? null, null, 2).slice(0, 6000);
  return {
    system: getSecurityAnalysisSystemPrompt(),
    user: delimitUntrustedData(eventJson, "SECURITY EVENT"),
  };
}

/**
 * Severity is taken only from SecurityAnalysisSchema's enum.
 * Anything else, including a coerced or injected "critical", is stored as low / needs-review.
 */
export function fieldsFromTriageContent(content: string): {
  ai_severity: Severity;
  ai_category: string;
  ai_summary: string;
  ai_remediation: string;
} {
  const parsed = parseAndValidateLlmResponse(content, SecurityAnalysisSchema);
  if (!parsed.success || !isSeverity(parsed.data.severity)) return { ...FAIL_CLOSED };
  const data: SecurityAnalysis = parsed.data;
  return {
    ai_severity: data.severity,
    ai_category: data.category,
    ai_summary: data.summary,
    ai_remediation: data.remediation,
  };
}
