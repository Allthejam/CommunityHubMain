/**
 * ISO 22301:2019 Auditor Brief & Compliance Document Generator
 * Standard Reference: ISO 22301:2019 Clauses 7.5 (Documented Information), 8.1 (Operational Control), 
 * 8.4 (Business Continuity Procedures), and 8.4.4 (Mitigation and Response)
 * Generates an official, print-formatted multi-page Audit & Legal Compliance Document.
 */

export interface ComplianceBriefData {
  townshipName?: string;
  communityId?: string;
  generatedDate?: string;
  customNotes?: string;
}

export function generateComplianceBriefHtml(data: ComplianceBriefData = {}): string {
  const township = data.townshipName || 'Oakridge Community Council';
  const currentDate = data.generatedDate || new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>ISO 22301 GRACEFUL DEGRADATION ARCHITECTURE &amp; AUDITOR DEFENCE BRIEF</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 9.5px;
      line-height: 1.45;
    }
    .page {
      page-break-after: always;
      min-height: 100%;
      padding-bottom: 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .page:last-child {
      page-break-after: avoid;
    }
    .header {
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-size: 8px;
      font-weight: 900;
      padding: 3px 7px;
      border-radius: 4px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .title {
      font-size: 16px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -0.02em;
      color: #0f172a;
    }
    .subtitle {
      font-size: 10px;
      font-weight: 600;
      color: #475569;
      margin-top: 2px;
    }
    .meta {
      text-align: right;
      font-family: monospace;
      font-size: 8.5px;
      line-height: 1.35;
    }
    h2 {
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      background: #f1f5f9;
      border-left: 4px solid #0284c7;
      padding: 4px 8px;
      margin: 12px 0 6px 0;
      color: #0f172a;
    }
    h3 {
      font-size: 10px;
      font-weight: 800;
      color: #1e293b;
      margin: 8px 0 3px 0;
    }
    p {
      margin-bottom: 5px;
      color: #334155;
    }
    ul, ol {
      margin-left: 18px;
      margin-bottom: 6px;
    }
    li {
      margin-bottom: 2.5px;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0;
      font-size: 8.5px;
    }
    .table th {
      background: #e2e8f0;
      padding: 4px 7px;
      border: 1px solid #cbd5e1;
      text-align: left;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 8px;
    }
    .table td {
      padding: 4px 7px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
    }
    .callout {
      background: #eff6ff;
      border: 1.5px solid #3b82f6;
      border-radius: 6px;
      padding: 7px 10px;
      margin: 8px 0;
      font-size: 9px;
    }
    .diagram-box {
      font-family: monospace;
      background: #f8fafc;
      border: 1.5px solid #94a3b8;
      border-radius: 6px;
      padding: 8px;
      font-size: 8.5px;
      line-height: 1.35;
      margin: 8px 0;
      color: #0f172a;
      white-space: pre;
    }
    .footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 5px;
      margin-top: 10px;
      display: flex;
      justify-content: space-between;
      font-size: 7.5px;
      color: #64748b;
      font-family: monospace;
    }
  </style>
</head>
<body>

  <!-- ======================== PAGE 1 ======================== -->
  <div class="page">
    <div>
      <div class="header">
        <div>
          <span class="badge">ISO 22301:2019 AUDITOR DEFENCE BRIEF</span>
          <h1 class="title">ISO 22301 Graceful Degradation Architecture</h1>
          <div class="subtitle">Platform: Community Emergency Action Platform (Community Hub)</div>
        </div>
        <div class="meta">
          <div>JURISDICTION: <strong>${township.toUpperCase()}</strong></div>
          <div>DATE: <strong>${currentDate}</strong></div>
          <div>CLASSIFICATION: <strong>DEFENCE EVIDENCE</strong></div>
        </div>
      </div>

      <p style="font-size: 9px; color: #475569; margin-bottom: 8px;">
        <strong>Standard Reference:</strong> ISO 22301:2019 Clauses 7.5 (Documented Information), 8.1 (Operational Control), 8.4 (Business Continuity Procedures), and 8.4.4 (Mitigation and Response)<br/>
        <strong>Core Technologies:</strong> Google Firebase (Hosting, Multi-Region Firestore), Git Version Control, Google Antigravity (Governed Agentic IDE)
      </p>

      <h2>1. Executive Summary for Auditors &amp; Civil Resilience Teams</h2>
      <p>A recurring challenge during municipal resilience audits and emergency planning reviews is:</p>
      <div class="callout" style="font-style: italic; font-weight: 600; color: #1e3a8a;">
        "If cellular masts collapse and internet backbones fail, how does a digital web app provide continuity? Furthermore, how do you ensure rapid AI-driven code changes never compromise life-safety systems?"
      </div>

      <p>Under <strong>ISO 22301</strong>, organizations are not required to defy physical disruptions to public utilities. Rather, they are required to demonstrate:</p>
      <ol>
        <li><strong>Pre-planned, tested fallback procedures (Graceful Degradation)</strong> down to manual contingencies.</li>
        <li><strong>Immutable change control and codebase continuity</strong> so the platform itself can be restored, reviewed, or rolled back instantly.</li>
      </ol>

      <p>Community Hub accomplishes this through a <strong>4-Tier Continuity Model</strong> supported by an auditable Firebase + Git + Antigravity technical spine:</p>

      <div class="diagram-box">[Tier 1: Full Cloud Connection] ──► Firebase Multi-Region Edge, Web Sockets, Live GPS
 │ (Telecom masts congest/fail)
 ▼
[Tier 2: Offline Client Memory] ──► Firebase Persistent Disk Cache + Indexed DB (Local reads)
 │ (Wide-area ISP severed completely)
 ▼
[Tier 3: Low-Bandwidth Fallback] ──► 2G / SMS Gateways & Evacuation Shelter Subnet
 │ (Extended blackout / flat batteries)
 ▼
[Tier 4: Manual "Grab-Bag" SOP] ──► Pre-printed, waterproof quarterly physical PDF dossiers</div>

      <h2>2. Technical Breakdown Across Continuity Tiers</h2>
      <h3>Tier 1: Normal Operations (Firebase Multi-Region Cloud)</h3>
      <ul>
        <li><strong>Hosting &amp; Edge Delivery:</strong> Firebase Hosting backed by Google's global Edge CDN, serving pre-compressed assets from geo-distributed points of presence.</li>
        <li><strong>Database Layer:</strong> Cloud Firestore deployed in Multi-Region mode (e.g., nam5 or eur3), providing automatic replication across physically separate metropolitan zones with zero-downtime failover.</li>
        <li><strong>Point-in-Time Recovery (PITR):</strong> Continuous change-log retention enables microsecond-level state recovery up to 7 days if data corruption or unauthorised overwrites occur.</li>
      </ul>
    </div>

    <div class="footer">
      <span>PAGE 1 OF 3 • ISO 22301 CONTINUITY ARCHITECTURE</span>
      <span>COMMUNITY HUB CIVIL DEFENCE EVIDENCE</span>
      <span>${township.toUpperCase()}</span>
    </div>
  </div>

  <!-- ======================== PAGE 2 ======================== -->
  <div class="page">
    <div>
      <div class="header">
        <div>
          <span class="badge">TECHNICAL CONTINUITY &amp; GOVERNANCE</span>
          <h2 class="title">Tiers 2–4 &amp; Engineering Governance</h2>
          <div class="subtitle">Git Version Control &amp; Google Antigravity Agentic IDE</div>
        </div>
        <div class="meta">
          <div>DOCUMENT: <strong>DOC-CR-84-2026</strong></div>
          <div>STANDARD: <strong>ISO 22301:2019</strong></div>
        </div>
      </div>

      <h3>Tier 2: Degraded Network / Tower Loss (Offline-First Firebase PWA)</h3>
      <ul>
        <li><strong>Mechanism:</strong> Firebase Firestore Web SDK persistent Local Cache combined with custom Service Worker caching.</li>
        <li><strong>Auditable Evidence:</strong>
          <ul>
            <li>Emergency Action Plans (EAPs), shelter matrices, lockbox combinations, and warden call-trees are automatically written to local client storage (Indexed DB) on initial retrieval.</li>
            <li>When <code>navigator.onLine === false</code>, the application switches seamlessly to read from device flash storage without throwing unhandled exceptions or presenting blank screens.</li>
            <li>Outbound field updates (e.g., road blockage reports) are buffered into an encrypted local outbox queue and automatically replayed with timestamp preservation once connectivity resumes.</li>
          </ul>
        </li>
      </ul>

      <h3>Tier 3: Low-Bandwidth &amp; Islanded Network Redundancy</h3>
      <ul>
        <li><strong>SMS / 2G Cellular Bridge:</strong> High-payload UI assets (maps, satellite tiles) are bypassed. Incident notifications route through lightweight SMS gateways (e.g., GovNotify or Twilio) over 2G cellular frequencies that benefit from extended battery-backup survival at base stations.</li>
        <li><strong>Evacuation Shelter Micro-Hub:</strong> If a parish hall or evacuation shelter operates an isolated generator-powered Wi-Fi router without wide-area internet backhaul, clients connect locally to query cached peer data.</li>
      </ul>

      <h3>Tier 4: Non-Digital Contingency ("Grab-Bag" Protocol)</h3>
      <ul>
        <li><strong>Standard Alignment:</strong> ISO 22301 Clause 8.4 mandates manual workarounds when technology infrastructure outage limits are exceeded.</li>
        <li><strong>Implementation:</strong> An automated, client-side "Export Resilience Dossier" generates a high-contrast, 2-page print-optimised PDF. Parish coordinators are instructed to print hard copies quarterly and place them into physical emergency grab-bags and hall lockboxes containing analogue backup radio channels (PMR446 / VHF), generator cold-start SOPs, AED access keys, and vulnerable resident registers.</li>
      </ul>

      <h2>3. Engineering Governance &amp; Change Control: Git &amp; Google Antigravity</h2>
      <p>Auditors frequently inspect the software supply chain to verify that emergency tools cannot be taken down by faulty deployments or unverified AI agent contributions.</p>

      <div class="diagram-box">┌──────────────────────────────┐
│ Google Antigravity Agent     │ (Autonomous Development IDE)
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ Git Commit & PR Checkpoint   │ ──► Cryptographic signature, auditable commit author
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ Automated CI Continuity Gate │ ──► Verifies: 1) Offline PWA cache integrity
└──────────────┬───────────────┘               2) RTO/RPO SLA compliance
               ▼                               3) Firestore schema compliance
┌──────────────────────────────┐
│ Production Firebase Deploy   │ ──► Instant 1-click rollback via Firebase Hosting CLI
└──────────────────────────────┘</div>

      <h3>A. Git Version Control as Disaster Recovery (ISO 22301 Clause 7.5 &amp; 8.1)</h3>
      <ol>
        <li><strong>Cryptographic Audit Trail:</strong> Every configuration change, schema migration, and emergency protocol update is tracked via signed Git commits, ensuring absolute traceability of who approved each change.</li>
        <li><strong>Deterministic Infrastructure-as-Code (IaC):</strong> Firebase security rules, Firestore indexing definitions, and deployment targets are committed to the repository. The entire production stack can be rebuilt from scratch in another cloud project in minutes.</li>
        <li><strong>Instant Reversion (RTO Minute):</strong> If an errant update impacts field operations, Firebase Hosting combined with Git tags allows a 1-command rollback to the last verified release without rebuilding containers.</li>
      </ol>

      <h3>B. Google Antigravity Agentic Governance (ISO 22301 Clause 8.3 &amp; 7.2)</h3>
      <ol>
        <li><strong>Agentic Verification Gates:</strong> Because code modifications and emergency workflows can be authored by AI agents within Google Antigravity, all agent commits must pass continuous integration (CI) test suites before hitting main.</li>
        <li><strong>Offline-Mode Non-Regression Testing:</strong> Antigravity automated test scripts deliberately sever network mock connections (offline event emission) to verify that recent code iterations have not broken the Indexed DB cache or Service Worker precaching manifests.</li>
        <li><strong>Restricted Agentic Privileges:</strong> Antigravity agents cannot deploy directly to live production environments; deployments require explicit authenticated human sign-off via branch protection rules.</li>
      </ol>
    </div>

    <div class="footer">
      <span>PAGE 2 OF 3 • ENGINEERING GOVERNANCE &amp; GIT TRACEABILITY</span>
      <span>GOOGLE ANTIGRAVITY AGENTIC PIPELINE</span>
      <span>${township.toUpperCase()}</span>
    </div>
  </div>

  <!-- ======================== PAGE 3 ======================== -->
  <div class="page">
    <div>
      <div class="header">
        <div>
          <span class="badge">AUDITOR SCRIPT &amp; LEGAL DISCLAIMER</span>
          <h2 class="title">Auditor Q&amp;A Defence Script &amp; Terms</h2>
          <div class="subtitle">Statutory Compliance with UK GDPR and Civil Contingencies Protocols</div>
        </div>
        <div class="meta">
          <div>STANDARD: <strong>ISO 22301:2019</strong></div>
          <div>STATUS: <strong>LEGALLY PROTECTED</strong></div>
        </div>
      </div>

      <h2>4. Auditor Q&amp;A Defence Script</h2>
      <table class="table">
        <thead>
          <tr>
            <th style="width: 35%;">Auditor Question</th>
            <th style="width: 65%;">Compliant ISO 22301 Technical Answer</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>"What happens to citizens when cellular towers drop?"</strong></td>
            <td>"The application utilises client-side Service Workers and Firebase Indexed DB caching. Any resident who has previously accessed their local plan retains complete read access to maps, shelter lists, and warden contacts, even in complete airplane mode."</td>
          </tr>
          <tr>
            <td><strong>"How do you prevent data loss if coordinators enter reports while offline?"</strong></td>
            <td>"Submissions write immediately to an IndexedDB local outbox queue. Once any wireless handshake or cellular link re-establishes, records synchronise automatically to Cloud Firestore using Point-in-Time logs to prevent collision."</td>
          </tr>
          <tr>
            <td><strong>"What if local power is out for 5 days and mobile batteries die?"</strong></td>
            <td>"Conforming to ISO 22301 non-digital fallback mandates, the system includes a 1-click automated grab-bag exporter. Coordinators keep physical, laminated 2-page dossiers in parish hall safes containing radio channels and access PINs."</td>
          </tr>
          <tr>
            <td><strong>"What if Google Firebase suffers an outage?"</strong></td>
            <td>"Our database operates on Cloud Firestore Multi-Region infrastructure, spanning independent data centre zones with automatic failover. Additionally, the PWA client continues functioning on cached local device storage completely independent of cloud uptime."</td>
          </tr>
          <tr>
            <td><strong>"How do you govern AI agents in Google Antigravity so they don't break emergency continuity?"</strong></td>
            <td>"All code generated in Google Antigravity is bounded by strict Git version control and CI test suites. Automated tests simulate disconnected network environments to prove offline persistence before any deployment is accepted into production."</td>
          </tr>
        </tbody>
      </table>

      <h2>5. Public-Facing App Disclaimer &amp; Terms Wording</h2>
      <div class="callout" style="background: #f8fafc; border-color: #94a3b8;">
        <h4 style="font-size: 9.5px; font-weight: 900; margin-bottom: 4px; text-transform: uppercase; color: #0f172a;">
          ### Emergency Service Continuity &amp; Limitation of Service
        </h4>
        <p style="margin-bottom: 4px;">
          <strong>1. Intended Role:</strong> The Community Hub platform is a decentralised community resilience and coordination tool. It is designed to assist local neighbourhood preparedness, volunteer organisation, and mutual aid. It is <strong>NOT a replacement for statutory emergency blue-light services (e.g., 999, 911, or 112)</strong>. In any life-threatening situation, always attempt to contact official national emergency services first.
        </p>
        <p style="margin-bottom: 4px;">
          <strong>2. Telecommunications Dependence &amp; Local Caching:</strong> While this platform incorporates advanced offline persistence (Indexed DB, Service Worker caching, and multi-region cloud infrastructure) to maintain availability during disruptions, live telecommunications rely on third-party mobile operators and public utility grids.
        </p>
        <p>
          <strong>3. Grab-Bag Hard-Copy Protocol:</strong> In accordance with ISO 22301 community resilience guidelines, community wardens and coordinators are strongly advised to generate, print, and securely store physical hard copies of their emergency action dossier on a quarterly basis to guarantee operational readiness during total electrical or communications blackouts.
        </p>
      </div>

      <h2>6. Operational Multi-Layer Summary</h2>
      <table class="table">
        <thead>
          <tr>
            <th style="width: 40%;">Scenario</th>
            <th style="width: 60%;">How the Grab-Bag Works</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Normal Operations</strong></td>
            <td>Cloud syncs real-time changes instantly.</td>
          </tr>
          <tr>
            <td><strong>Internet &amp; Cell Towers Down</strong></td>
            <td>Device opens the cached Grab-Bag directly from phone/laptop local memory (Indexed DB).</td>
          </tr>
          <tr>
            <td><strong>Power Grid Out &amp; Batteries Dead (Day 4+)</strong></td>
            <td>Wardens pull the pre-printed, physical hard-copy dossier from the village hall lockbox.</td>
          </tr>
        </tbody>
      </table>
      <p style="font-weight: 800; color: #047857; margin-top: 4px;">
        ✓ This multi-layer redundancy is what guarantees zero single points of failure.
      </p>
    </div>

    <div class="footer">
      <span>PAGE 3 OF 3 • END OF OFFICIAL COMPLIANCE BRIEF</span>
      <span>COMMUNITY HUB RESILIENCE ENGINE</span>
      <span>CONFIDENTIAL OPERATIONAL &amp; AUDIT EVIDENCE</span>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;
}
