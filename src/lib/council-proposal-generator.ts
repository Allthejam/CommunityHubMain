/**
 * Town Council Meeting Presentation Pack & Proposal Generator
 * Generates an executive, print-ready 2-page A4 briefing document
 * designed for Community Council, Parish, and Chamber of Commerce meetings.
 */

export interface CouncilProposalData {
  townshipName?: string;
  directoryCount?: number;
  storefrontCount?: number;
  annualTreasuryYield?: number;
  courierPoolYield?: number;
  preparedBy?: string;
  meetingDate?: string;
}

export function generateCouncilProposalHtml(data: CouncilProposalData): string {
  const town = data.townshipName || 'Your Community';
  const directoryCount = data.directoryCount || 35;
  const storefrontCount = data.storefrontCount || 12;
  const directorySplit = directoryCount > 50 ? 60 : 40;
  const directoryRate = (20 * directorySplit) / 100;
  const annualTreasury = data.annualTreasuryYield || (directoryCount * directoryRate + storefrontCount * 1.0) * 12;
  const annualCourier = data.courierPoolYield || (storefrontCount * 4.0) * 12;
  const todayStr = data.meetingDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Community Hub — Town Council Briefing & Adoption Pack: ${town}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #000000;
      background: #f1f5f9;
      margin: 0;
      padding: 20px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      background: #ffffff;
      width: 210mm;
      min-height: 297mm;
      padding: 14mm 16mm;
      margin: 0 auto 20px auto;
      box-sizing: border-box;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      position: relative;
      page-break-after: always;
    }
    .page:last-child {
      page-break-after: avoid;
    }
    .top-bar {
      border-top: 4px solid #047857;
      padding-top: 5px;
      margin-bottom: 8px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    .header-table td {
      vertical-align: top;
    }
    .doc-badge {
      display: inline-block;
      background: #047857;
      color: #ffffff;
      font-size: 7pt;
      font-weight: 800;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      padding: 2px 7px;
      border-radius: 3px;
      margin-bottom: 4px;
    }
    .doc-title {
      font-size: 14pt;
      font-weight: 900;
      color: #064e3b;
      line-height: 1.15;
    }
    .doc-subtitle {
      font-size: 8.5pt;
      color: #475569;
      font-weight: 500;
      margin-top: 2px;
    }
    .meta-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 5px 8px;
      font-size: 7.5pt;
      text-align: right;
    }
    .meta-box strong {
      color: #0f172a;
    }
    .section-title {
      font-size: 9pt;
      font-weight: 800;
      color: #064e3b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1.5px solid #047857;
      padding-bottom: 2px;
      margin: 9px 0 5px 0;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .grid-2 {
      display: table;
      width: 100%;
      table-layout: fixed;
      border-collapse: separate;
      border-spacing: 6px 0;
    }
    .grid-col {
      display: table-cell;
      vertical-align: top;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 6px 8px;
      margin-bottom: 6px;
    }
    .card-title {
      font-size: 8pt;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 3px;
    }
    .card p, .card li {
      font-size: 7.5pt;
      color: #334155;
      line-height: 1.3;
    }
    .card ul {
      margin-left: 14px;
      margin-top: 3px;
    }
    .highlight-card {
      background: #ecfdf5;
      border: 1.5px solid #10b981;
      border-radius: 4px;
      padding: 8px 10px;
      margin-bottom: 8px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      margin: 4px 0 8px 0;
    }
    table.data-table th {
      background: #064e3b;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 4px 6px;
      font-size: 7pt;
      text-transform: uppercase;
    }
    table.data-table td {
      padding: 4px 6px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    table.data-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .stat-hero {
      text-align: center;
      background: #ecfdf5;
      border: 1.5px solid #059669;
      border-radius: 4px;
      padding: 8px 4px;
    }
    .stat-hero .num {
      font-size: 16pt;
      font-weight: 900;
      color: #064e3b;
    }
    .stat-hero .lbl {
      font-size: 7pt;
      font-weight: 700;
      color: #047857;
      text-transform: uppercase;
    }
    .motion-box {
      background: #f0fdf4;
      border: 2px dashed #059669;
      border-radius: 4px;
      padding: 8px 10px;
      margin-top: 6px;
    }
    .motion-title {
      font-size: 8.5pt;
      font-weight: 800;
      color: #064e3b;
      margin-bottom: 3px;
      text-transform: uppercase;
    }
    .motion-text {
      font-size: 8pt;
      font-style: italic;
      color: #0f172a;
      line-height: 1.35;
    }
    .footer-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      border-top: 1px solid #cbd5e1;
      padding-top: 4px;
      display: flex;
      justify-content: space-between;
      font-size: 6.5pt;
      color: #64748b;
    }
    .print-button-bar {
      background: #0f172a;
      color: #ffffff;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .btn {
      background: #059669;
      color: #ffffff;
      border: none;
      padding: 6px 14px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 9pt;
      cursor: pointer;
    }
    .btn:hover {
      background: #047857;
    }
    @media print {
      .print-button-bar { display: none !important; }
      body { margin: 0; background: #ffffff; }
    }
  </style>
</head>
<body>

  <!-- Floating Print Bar -->
  <div class="print-button-bar">
    <div>
      <span style="font-weight: 800; color: #34d399;">COMMUNITY HUB PROPOSAL PACK</span>
      <span style="margin: 0 8px; color: #475569;">|</span>
      <span>${town} — Official Council Briefing Document</span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
      <button class="btn" style="background: #334155;" onclick="window.close()">Close</button>
    </div>
  </div>

  <div style="max-width: 210mm; margin: 0 auto; padding: 10px 15px;">
    
    <!-- PAGE 1: Executive Overview, 4 Pillars & High Street Model -->
    <div class="page">
      <div class="top-bar"></div>
      
      <table class="header-table">
        <tr>
          <td style="width: 70%;">
            <div class="doc-badge">Official Civic Proposal</div>
            <div class="doc-title">${town} Community Hub Adoption Brief</div>
            <div class="doc-subtitle">A Modern Digital Civic Infrastructure, High Street Commercial Platform & ISO Emergency System</div>
          </td>
          <td style="width: 30%;">
            <div class="meta-box">
              <div><strong>Parish / Town:</strong> ${town}</div>
              <div><strong>Meeting Date:</strong> ${todayStr}</div>
              <div><strong>Upfront Cost:</strong> <span style="color:#059669; font-weight:800;">£0.00 (Zero Public Cost)</span></div>
              <div><strong>Annual Yield:</strong> <span style="color:#059669; font-weight:800;">£${annualTreasury.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/yr</span></div>
            </div>
          </td>
        </tr>
      </table>

      <!-- Executive Summary Box -->
      <div class="highlight-card">
        <div style="font-size: 8.5pt; font-weight: 800; color: #064e3b; margin-bottom: 2px;">
          EXECUTIVE SUMMARY: WHY COMMUNITY HUB?
        </div>
        <p style="font-size: 7.8pt; color: #0f172a; line-height: 1.35;">
          This proposal requests Council approval to adopt <strong>Community Hub</strong> as the official digital platform for <strong>${town}</strong>. Community Hub provides a dedicated, algorithm-free mobile app and web portal combining <strong>Virtual High Street shopping, statutory ISO 22301 Civil Emergency readiness, democratic citizen polling, and local courier logistics</strong>. The platform carries <strong>£0 setup, hosting, or maintenance fees</strong> to the Council, and returns <strong>40% to 75%+ of all local business subscription revenue directly to the Council Treasury</strong>.
        </p>
      </div>

      <!-- Core Pillars -->
      <div class="section-title">1. The Four Civic Pillars Delivered on Day One</div>
      
      <div class="grid-2">
        <div class="grid-col">
          <div class="card">
            <div class="card-title">🏪 Virtual High Street & Local Economy</div>
            <p>Empowers independent high street butchers, bakers, cafés, and local services with digital shopfronts, click & collect, and online catalogs.</p>
            <ul>
              <li>Defends independent shops against online monopolies.</li>
              <li>Keeps commercial spending circulating locally.</li>
            </ul>
          </div>

          <div class="card">
            <div class="card-title">🚨 ISO 22301 Civil Resilience & Sirens</div>
            <p>Statutory emergency readiness replacing paper binders with a live digital incident response dashboard.</p>
            <ul>
              <li>Instant multi-channel SMS & website banner sirens.</li>
              <li>Live warming centers, sandbag depots & 4x4 dispatch.</li>
              <li>1-Click Auditor Grab-Bag Dossiers for Police & Planners.</li>
            </ul>
          </div>
        </div>

        <div class="grid-col">
          <div class="card">
            <div class="card-title">🚚 Appointed Town Courier Network</div>
            <p>Integrated local delivery network sustaining local courier jobs and offering same-day doorstep drops from high street merchants.</p>
            <ul>
              <li><strong>Guaranteed Subsidy:</strong> 40% of storefront revenue (£4/mo) allocated to help couriers cover vehicle maintenance & fuel.</li>
              <li><strong>Primary Courier Earnings:</strong> Couriers earn 100% of delivery fees on every order they fulfill.</li>
              <li>Prescription and essential grocery doorstep drops for seniors and vulnerable residents.</li>
            </ul>
          </div>

          <div class="card">
            <div class="card-title">🗳️ Democratic Resident Polling & Governance</div>
            <p>Verified resident-only community petitions and advisory polls with full Council committee role delegation.</p>
            <ul>
              <li>Appoint Vice-President, Emergency Lead & Police Liaison.</li>
              <li>Zero social media algorithms, trolling, or spam clutter.</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Comparison Summary -->
      <div class="section-title">2. Civic Value Comparison: Traditional vs. Community Hub</div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 25%;">Area</th>
            <th style="width: 35%;">Traditional Council Reality</th>
            <th style="width: 40%;">With Community Hub Platform</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Town Communication</strong></td>
            <td>Fragmented Facebook groups; algorithms bury notices.</td>
            <td>Dedicated town app; chronologically sorted; instant SMS sirens.</td>
          </tr>
          <tr>
            <td><strong>Local High Street</strong></td>
            <td>Shops have no shared delivery or digital presence.</td>
            <td>Virtual High Street + local courier doorstep delivery fleet.</td>
          </tr>
          <tr>
            <td><strong>Emergency Readiness</strong></td>
            <td>Paper binder on a shelf; slow response in storms.</td>
            <td>ISO 22301 live console, muster points & 1-Click Grab-Bag.</td>
          </tr>
          <tr>
            <td><strong>Council Budget Impact</strong></td>
            <td>Council pays thousands for web hosting & printing.</td>
            <td><strong>£0 Cost</strong>; generates recurring revenue for town treasury.</td>
          </tr>
        </tbody>
      </table>

      <div class="footer-bar">
        <span>Community Hub Official Council Briefing — Page 1 of 2</span>
        <span>Confidential to ${town} Community Council & Stakeholders</span>
        <span>Document ID: CH-BRIEF-${Date.now().toString().slice(-6)}</span>
      </div>
    </div>


    <!-- PAGE 2: Financial Forecast, Logistics Model & Council Motion -->
    <div class="page">
      <div class="top-bar"></div>

      <div class="section-title">3. Self-Funding Financial Forecast for ${town}</div>
      <p style="font-size: 7.5pt; color: #000000; font-weight: 600; margin-bottom: 6px;">
        Community Hub operates on two affordable business participation models: <strong>£20/mo</strong> Directory Listings and <strong>£10/mo</strong> Virtual Storefronts. The community council retains the majority share of directory subscriptions and oversight fees.
      </p>

      <!-- Key Financial Metrics Table -->
      <div class="grid-2" style="margin-bottom: 6px;">
        <div class="grid-col" style="width: 32%;">
          <div class="stat-hero">
            <div class="num">£${annualTreasury.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <div class="lbl">Est. Annual Council Treasury Fund</div>
          </div>
        </div>
        <div class="grid-col" style="width: 32%;">
          <div class="stat-hero" style="background: #eff6ff; border-color: #3b82f6;">
            <div class="num" style="color: #1e40af;">£${annualCourier.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <div class="lbl" style="color: #1e40af;">Courier Fuel & Logistics Subsidy Fund*</div>
          </div>
        </div>
        <div class="grid-col" style="width: 36%;">
          <div class="stat-hero" style="background: #f8fafc; border-color: #64748b;">
            <div class="num" style="color: #000000;">£${(annualTreasury + annualCourier).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <div class="lbl" style="color: #000000;">Total Annual Local Economic Value</div>
          </div>
        </div>
      </div>
      <div style="font-size: 6.8pt; color: #000000; font-weight: 600; margin-bottom: 6px; font-style: italic;">
        *Note: The £4/mo courier subsidy covers fuel and running costs. Couriers also receive 100% of customer delivery fees on every order (their main earnings).
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>Scenario / Town Adoption</th>
            <th>Directory (£20/mo)</th>
            <th>Storefronts (£10/mo)</th>
            <th>Council Split %</th>
            <th>Monthly Treasury</th>
            <th>Annual Council Fund</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Small Rural Village</strong></td>
            <td>15 businesses</td>
            <td>5 storefronts</td>
            <td>40% (£8/mo)</td>
            <td>£125.00 / mo</td>
            <td><strong>£1,500.00 / yr</strong></td>
          </tr>
          <tr>
            <td><strong>Market Town (Target for ${town})</strong></td>
            <td><strong>${directoryCount} businesses</strong></td>
            <td><strong>${storefrontCount} storefronts</strong></td>
            <td><strong>${directorySplit}% (£${directoryRate.toFixed(2)}/mo)</strong></td>
            <td><strong>£${(annualTreasury / 12).toFixed(2)} / mo</strong></td>
            <td><strong style="color: #047857;">£${annualTreasury.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / yr</strong></td>
          </tr>
          <tr>
            <td><strong>Bustling Town (Tier 2 Jump)</strong></td>
            <td>75 businesses</td>
            <td>25 storefronts</td>
            <td>60% (£12/mo)</td>
            <td>£925.00 / mo</td>
            <td><strong>£11,100.00 / yr</strong></td>
          </tr>
          <tr>
            <td><strong>Premier / Model Town (Discretionary)</strong></td>
            <td>100 businesses</td>
            <td>35 storefronts</td>
            <td>75% (£15/mo)</td>
            <td>£1,535.00 / mo</td>
            <td><strong>£18,420.00 / yr</strong></td>
          </tr>
        </tbody>
      </table>

      <!-- What This Funds Box -->
      <div class="card" style="background: #f0fdf4; border-color: #059669; border-width: 1.5px; padding: 6px 10px;">
        <div class="card-title" style="color: #064e3b; font-size: 8.5pt;">💡 Illustrative Discretionary Civic Ideas for ${town}</div>
        <p style="color: #000000; font-weight: 600;">For inspiration, with an estimated annual treasury yield of <strong>£${annualTreasury.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</strong>, the Community Council could choose to support:</p>
        <ul style="margin-top: 2px; color: #000000; font-weight: 600;">
          <li>Annual Christmas lighting displays and village floral hanging baskets without council tax increases.</li>
          <li>Maintenance and supplies for 2x Public Access Defibrillators (PADs) and emergency winter flood stores.</li>
          <li>Grants for local youth clubs, sports teams, senior citizen transport, and village hall improvements.</li>
        </ul>
      </div>

      <!-- Formal Council Motion -->
      <div class="section-title">4. Recommended Formal Council Resolution (Draft Motion)</div>
      <div class="motion-box">
        <div class="motion-title">Motion for Adoption (To be entered into the official meeting minutes)</div>
        <p class="motion-text">
          "That <strong>${town} Community Council</strong> hereby approves the adoption and launch of the <strong>Community Hub</strong> digital platform as the official community communication, resilience, and local commerce system for the parish at <strong>£0 upfront capital cost</strong>; that the leadership team is authorized to configure the local emergency dashboard and appoint committee delegates; and that all accrued community subscription revenues be deposited directly into the Council Treasury fund for local civic projects."
        </p>
      </div>

      <!-- Signature & Sign-Off Section -->
      <div style="margin-top: 10px; border-top: 1px solid #cbd5e1; padding-top: 8px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 7.5pt;">
          <tr>
            <td style="width: 33%; vertical-align: top;">
              <div><strong>Proposer:</strong> ______________________</div>
              <div style="color: #64748b; font-size: 6.5pt; margin-top: 2px;">Community Council Member</div>
            </td>
            <td style="width: 33%; vertical-align: top;">
              <div><strong>Seconder:</strong> ______________________</div>
              <div style="color: #64748b; font-size: 6.5pt; margin-top: 2px;">Community Council Member</div>
            </td>
            <td style="width: 33%; vertical-align: top;">
              <div><strong>Council Chair / Clerk:</strong> _________________</div>
              <div style="color: #64748b; font-size: 6.5pt; margin-top: 2px;">Date of Approval: ___ / ___ / 202___</div>
            </td>
          </tr>
        </table>
      </div>

      <div class="footer-bar">
        <span>Community Hub Official Council Briefing — Page 2 of 2</span>
        <span>Generated for ${town} | Platform Powered by Community Hub UK</span>
        <span>www.my-community-hub.co.uk</span>
      </div>
    </div>

  </div>

</body>
</html>`;
}

export function triggerCouncilProposalPdf(data: CouncilProposalData) {
  const htmlContent = generateCouncilProposalHtml(data);
  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}
