# STRATA
**Autonomous intrusion detection system for your AWS cloud.**

STRATA is built to eliminate the alert fatigue and manual toil inherent in modern cloud security operations. By simply connecting a read-only AWS IAM key, STRATA deploys a fleet of six specialized autonomous agents that handle the entire incident response lifecycle from end to end.

Instead of forcing a human analyst to sift through endless logs, STRATA continuously polls AWS CloudTrail and GuardDuty (across identity, API, network, data, and control planes), normalizes the telemetry, and instantly feeds it into advanced LLMs for triage. High-volume events are rapidly categorized and severity-scored by Google's Gemini 2.5 Flash, while deep-reasoning tasks—such as drafting account-specific detection rules and writing CISO-ready incident reports—are handled by OpenAI's GPT-5.

Furthermore, STRATA doesn't just alert you to danger; it can actively stop it. When auto-response is enabled, deterministic containment agents instantly revoke compromised IAM credentials the moment a critical threat is confirmed, shrinking the window of compromise from hours down to seconds. From rule generation to containment and final reporting, STRATA provides a fully automated, transparent, and highly accurate cloud defense solution requiring zero human intervention.

## System Architecture

<p align="center">
  <img src="https://i.imgur.com/L4cImPW.png" alt="STRATA AWS Intrusion Detection Architecture" width="100%" />
</p>
<p align="center"><strong>Figure 1: STRATA System Architecture & Autonomous Agent Pipeline</strong></p>

### Flow-by-Flow Explanation

1. **Security Team & Dashboard (Box 1)**: Operators interact with the STRATA web dashboard to monitor live detections, review incident reports, manage ATT&CK-based detection rules, and configure account settings.
2. **AWS Telemetry Ingestion (Box 2)**: STRATA pulls live cloud security telemetry directly from **AWS CloudTrail** (API activity & audit logs) and **Amazon GuardDuty** (threat detections & security findings).
3. **STRATA 6-Agent Detection Pipeline (Box 3)**:
   - **Step 1: Rule Architect**: Dynamically generates and updates account-tailored detection rules mapped to MITRE ATT&CK tactics and AWS best practices.
   - **Step 2: Telemetry Collector**: Collects unanalyzed raw logs and findings from CloudTrail, GuardDuty, and optional log sources.
   - **Step 3: Threat Triage (AI)**: Evaluates raw security events using Gemini 2.5 Flash to score risk, de-duplicate alerts, and isolate confirmed threats with context and severity ratings.
   - **Step 4: Containment Agent**: Automatically deactivates compromised IAM access keys via `iam:UpdateAccessKey` the moment high-confidence, critical threats are confirmed (when auto-response is enabled).
   - **Step 5: Incident Reporter**: Clusters correlated high/critical findings over 24-hour windows to synthesize detailed executive incident reports (Markdown/JSON) and timelines using GPT-5.
   - **Step 6: Log Indexer (Elasticsearch)**: Concurrently indexes telemetry into Elasticsearch for high-performance log searching and correlation.
4. **Primary Data Store (Box 4)**: Persists all operational state in **Supabase PostgreSQL** (`agent_runs`, `findings`, `agent_actions`, `incident_reports`, `detection_rules`, and `aws_connections`).
5. **Search & Analytics Integration (Box 5)**: Optional **Elasticsearch / OpenSearch** cluster integration for fast log queries and cross-dataset threat correlation.
6. **Outputs & Visibility (Box 6)**: Exposes 6 dedicated dashboard modules: **Real-time Detections**, **Incident Timeline**, **Incident Reports**, **Containment Log**, **Search & Correlation**, and **Rule Management**.

## Technical Documentation

For a comprehensive explanation of every feature, agent role, and internal capability, please see the [Technical Documentation](./TECHNICAL_DOCUMENTATION.md).

## Tech Stack

* **Frontend:** React 19, Vite, Tailwind CSS 4, Radix UI, Lucide React.
* **Framework:** TanStack Start (Server Functions) & TanStack Router.
* **Backend & Persistence:** Supabase (PostgreSQL, Row Level Security, Edge Functions via Server integrations).
* **AI & LLMs:** Lovable AI Gateway integrating Google Gemini 2.5 Flash (high-volume triage) and OpenAI GPT-5 (deep reasoning).
* **Cloud Integration:** Native AWS Signature V4 signing, pure fetch-based API integration (CloudTrail, GuardDuty, STS, IAM), Elasticsearch / OpenSearch query integration.
* **Security:** AES-256-GCM encryption for stored AWS secrets.

## Setup & Installation Instructions

To get the STRATA application setup and running locally:

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Make sure you have your Supabase environment variables set (e.g. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and potentially `SUPABASE_SERVICE_ROLE_KEY` if running local scripts) and your Lovable API key (`LOVABLE_API_KEY`) available in a `.env` file.
3. Start the development server:
   ```bash
   npm run dev
   ```

**Connecting AWS:**
Once the application is running and you have logged in, **to see the instructions on how to connect the application to an AWS account, click the "Connect AWS" tab in the STRATA application.** The wizard will walk you through creating a secure, read-only IAM user for STRATA.

Once your account is successfully connected, you will see a connected status banner on this same page. Here, you have the option to click the **Enable auto-response** button. By default, STRATA operates with strictly read-only permissions. Enabling auto-response opts you in to active containment, allowing the Containment Agent to issue `iam:UpdateAccessKey` requests to instantly revoke compromised IAM credentials the moment a critical threat is detected.

**Connecting Elasticsearch / OpenSearch:**
In the same "Connect AWS" tab, you can connect an Elasticsearch cluster. **Please note that Elasticsearch findings are additive to AWS findings and that users must click Sync (or enable auto-sync) to pull logs into the STRATA pipeline.**
