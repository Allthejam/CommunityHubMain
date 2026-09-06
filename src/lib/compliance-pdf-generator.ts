/**
 * ISO 22301:2019 Auditor Brief & Compliance Document Generator
 * Standard Reference: ISO 22301:2019 Clause 8.4 (Business Continuity Procedures) & 8.4.4 (Mitigation and Response)
 * Generates an official, print-formatted multi-page Audit & Legal Compliance Document.
 */

export interface ComplianceBriefData {
  townshipName?: string;
  communityId?: string;
  generatedDate?: string;
}

export function generateComplianceBriefHtml(data: ComplianceBriefData = {}): string {
  const township = data.townshipName || 'Local Municipality / Community Council';
  const currentDate = data.generatedDate || new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>ISO 22301 COMPLIANCE BRIEF &amp; DISASTER RECOVERY ARCHITECTURE</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
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
      font-size: 10px;
      line-height: 1.45;
    }
    .page {
      page-break-after: always;
      min-height: 100%;
      padding-bottom: 20px;
    }
    .page:last-child {
      page-break-after: avoid;
    }
    .header {
      border-bottom: 3px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-size: 8.5px;
      font-weight: 900;
      padding: 3px 8px;
      border-radius: 4px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .title {
      font-size: 18px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -0.02em;
      color: #0f172a;
    }
    .subtitle {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      margin-top: 2px;
    }
    .meta {
      text-align: right;
      font-family: monospace;
      font-size: 9px;
      line-height: 1.35;
    }
    h2 {
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      background: #f1f5f9;
      border-left: 4px solid #0284c7;
      padding: 4px 8px;
      margin: 14px 0 8px 0;
      color: #0f172a;
    }
    h3 {
      font-size: 10.5px;
      font-weight: 800;
      color: #1e293b;
      margin: 8px 0 4px 0;
    }
    p {
      margin-bottom: 6px;
      color: #334155;
    }
    ul, ol {
      margin-left: 18px;
      margin-bottom: 8px;
    }
    li {
      margin-bottom: 3px;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
      font-size: 9px;
    }
    .table th {
      background: #e2e8f0;
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
      text-align: left;
      font-weight: 800;
      text-transform: uppercase;
    }
    .table td {
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
    }
    .callout {
      background: #eff6ff;
      border: 1.5px solid #3b82f6;
      border-radius: 6px;
      padding: 8px 12px;
      margin: 10px 0;
      font-size: 9.5px;
    }
    .warning {
      background: #fef2f2;
      border: 1.5px solid #dc2626;
      border-radius: 6px;
      padding: 8px 12px;
      margin: 10px 0;
      color: #991b1b;
      font-weight: 600;
    }
    .footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      margin-top: 16px;
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      color: #64748b;
      font-family: monospace;
    }
  </style>
</head>
<body>

  <!-- PAGE 1: ARCHITECTURE & TIERS -->
  <div class="page">
    <div class="header">
      <div>
        <span class="badge">ISO 22301:2019 AUDIT EVIDENCE &amp; OPERATIONAL SPECIFICATION</span>
        <h1 class="title">Civil Resilience &amp; Graceful Degradation Architecture</h1>
        <div class="subtitle">Platform Continuity Framework for Local Authorities, Municipalities &amp; Emergency Committees</div>
      </div>
      <div class="meta">
        <div>JURISDICTION: <strong>${township.toUpperCase()}</strong></div>
        <div>DATE: <strong>${currentDate}</strong></div>
        <div>STATUS: <strong>AUDIT READY</strong></div>
      </div>
    </div>

    <h2>1. Executive Summary for Emergency Resilience Officers &amp; Compliance Auditors</h2>
    <p>
      Under <strong>ISO 22301 Clause 8.4 (Business Continuity Procedures)</strong> and <strong>Clause 8.4.4 (Mitigation and Response)</strong>, digital public safety platforms are evaluated on their ability to maintain continuity during major infrastructure failure.
    </p>
    <div class="callout">
      <strong>Core Audit Principle: Graceful Degradation</strong><br/>
      Systems are not required to defy physical laws when telecommunication backbones fail; rather, they are required to have pre-planned, tested fallback procedures that transition predictably into an offline operational state rather than crashing or displaying blank screens.
    </div>

    <h2>2. Technical Breakdown: 4-Tier Continuity Model</h2>
    <table class="table">
      <thead>
        <tr>
          <th style="width: 20%;">Continuity Tier</th>
          <th style="width: 25%;">Infrastructure State</th>
          <th style="width: 30%;">Operational Capability</th>
          <th style="width: 25%;">Data Latency &amp; Redundancy</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Tier 1: Cloud Edge</strong></td>
          <td>Full broadband &amp; 4G/5G mobile connection active</td>
          <td>Real-time emergency alert beacons, live GPS evacuation routes, volunteer dispatch, and public chat.</td>
          <td>Sub-second sync via multi-region edge infrastructure.</td>
        </tr>
        <tr>
          <td><strong>Tier 2: Client Memory</strong></td>
          <td>Cell towers lose power / fiber backhaul severed</td>
          <td>PWA Service Worker + IndexedDB. Full offline read access to cached rosters, maps, shelter keys, and SOPs in Airplane Mode.</td>
          <td>0ms local retrieval; offline form submissions queue in browser outbox.</td>
        </tr>
        <tr>
          <td><strong>Tier 3: Low-Bandwidth</strong></td>
          <td>Broadband severed; basic 2G / local generator power</td>
          <td>Automatic downgrade disabling heavy media; interfaces with low-overhead SMS dispatch (Twilio/GovNotify) and village hall WiFi subnets.</td>
          <td>Text-only packets operating on battery-backed 2G cellular channels.</td>
        </tr>
        <tr>
          <td><strong>Tier 4: Grab-Bag SOP</strong></td>
          <td>Extended power grid blackout; mobile batteries exhausted</td>
          <td>Quarterly pre-printed, 2-page waterproof physical contingency dossier stored in village emergency lockboxes.</td>
          <td>100% Non-digital hardcopy redundancy with generator keys and radio channels.</td>
        </tr>
      </tbody>
    </table>

    <h2>3. Offline Data Integrity &amp; Write Queue Synchronization</h2>
    <p>
      When coordinators record incident reports, keyholder changes, or muster counts while disconnected:
    </p>
    <ul>
      <li><strong>Local Encrypted Journaling:</strong> Data is written into an isolated IndexedDB write outbox with cryptographic timestamps.</li>
      <li><strong>Point-in-Time Reconciliation:</strong> When network connectivity is re-established (even intermittently), the queue automatically synchronizes with cloud Firestore servers using last-write-wins with conflict audit logging.</li>
    </ul>

    <div class="footer">
      <span>PAGE 1 OF 2 • ISO 22301 RESILIENCE ARCHITECTURE</span>
      <span>COMMUNITY HUB CIVIC PLATFORM</span>
      <span>OFFICIAL AUDITOR BRIEF</span>
    </div>
  </div>

  <!-- PAGE 2: AUDITOR DEFENSE SCRIPT & TERMS -->
  <div class="page">
    <div class="header">
      <div>
        <span class="badge">LEGAL COMPLIANCE &amp; DEFENSE SCRIPT</span>
        <h1 class="title">Auditor Defense Script &amp; Limitation of Service</h1>
        <div class="subtitle">Statutory Compliance with UK GDPR and Civil Contingencies Protocols</div>
      </div>
      <div class="meta">
        <div>STANDARD: <strong>ISO 22301:2019</strong></div>
        <div>DOCUMENT: <strong>DOC-CR-84-2026</strong></div>
      </div>
    </div>

    <h2>4. Auditor Q&amp;A Defense Script</h2>
    <table class="table">
      <thead>
        <tr>
          <th style="width: 35%;">Auditor Challenge</th>
          <th style="width: 65%;">ISO 22301 Compliant Defense Answer</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>"What happens to residents when mobile masts fail?"</strong></td>
          <td>"The application utilizes client-side Service Workers and IndexedDB local caching. Any resident who has previously accessed their local plan retains complete read access to maps, warden contacts, and checklists even in airplane mode."</td>
        </tr>
        <tr>
          <td><strong>"How do you prevent data loss if coordinators enter logs while offline?"</strong></td>
          <td>"The platform queues user submissions into an encrypted offline outbox within browser storage. Once any cellular or Wi-Fi handshake is detected, records sync automatically via Point-in-Time logs."</td>
        </tr>
        <tr>
          <td><strong>"What if local power is down for 5 days and devices run out of battery?"</strong></td>
          <td>"In accordance with ISO 22301 manual fallback guidelines, our platform features an automated quarterly grab-bag export. Community wardens hold physical, printed dossiers in emergency lockboxes containing all critical procedures, radio protocols, and asset access keys."</td>
        </tr>
      </tbody>
    </table>

    <h2>5. Statutory Emergency Service Continuity &amp; Limitation of Service Terms</h2>
    <div class="callout" style="background: #f8fafc; border-color: #94a3b8;">
      <p style="margin-bottom: 4px;">
        <strong>1. Intended Role:</strong> The Community Hub platform is a decentralized community resilience and coordination aid. It is designed to support local planning and mutual aid. It is <strong>not a replacement for statutory blue-light emergency services (e.g., 999, 911, or 112)</strong>. In any immediate life-safety emergency, always contact national emergency services first.
      </p>
      <p style="margin-bottom: 4px;">
        <strong>2. Telecommunications Dependence &amp; Offline Cache:</strong> While this platform incorporates offline caching (IndexedDB and Progressive Web App technology) and multi-region infrastructure to maximize availability during infrastructure disruptions, network delivery is dependent on public cellular networks and internet service providers.
      </p>
      <p>
        <strong>3. Grab-Bag Protocol Recommendation:</strong> In accordance with community emergency management best practices, community coordinators and administrators are strongly advised to generate, print, and securely store physical copies of their localized Emergency Action Dossier on a quarterly basis to ensure operational readiness during complete electrical or telecommunications outages.
      </p>
    </div>

    <h2>6. Data Protection &amp; GDPR Adherence</h2>
    <p>
      Community Hub is engineered under <strong>Privacy by Design (UK/EU GDPR)</strong>: zero tracking cookies, role-based encryption for vulnerable resident registries, and local tenant isolation ensuring community emergency rosters are never exposed to commercial advertising networks.
    </p>

    <div class="footer">
      <span>PAGE 2 OF 2 • END OF OFFICIAL COMPLIANCE BRIEF</span>
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
