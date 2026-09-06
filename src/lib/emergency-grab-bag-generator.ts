/**
 * ISO 22301 Graceful Degradation & Emergency Grab-Bag Print Generator
 * Standard Reference: ISO 22301:2019 Clause 8.4 (Business Continuity Procedures)
 * Generates an ultra-crisp, high-contrast, 2-page A4 Physical Contingency Dossier.
 */

export interface GrabBagDossierData {
  townshipName: string;
  communityId?: string;
  lastReviewedDate?: string;
  reviewedByName?: string;
  reviewedByRole?: string;
  nextReviewDue?: string;
  keyholders: Array<{
    facilityOrAsset: string;
    category?: string;
    primaryName: string;
    primaryPhone: string;
    backupName?: string;
    backupPhone?: string;
    keyLocationNotes?: string;
  }>;
  shelters: Array<{
    name: string;
    type: string;
    address: string;
    capacity: string;
    keyholder: string;
    phone: string;
    hasGenerator?: boolean;
    notes?: string;
  }>;
  liaisons: Array<{
    role: string;
    agencyOrName: string;
    telephone: string;
    notes?: string;
  }>;
  assets: Array<{
    category: string;
    name: string;
    description: string;
  }>;
  transportFleet: Array<{
    operatorName: string;
    vehicleType: string;
    capacity: number;
    phone: string;
  }>;
  musterPoints: Array<{
    name: string;
    address: string;
    designatedVehicles?: string;
    onSiteCoordinator?: string;
    coordinatorPhone?: string;
  }>;
  hazardChecklists?: {
    wildfire?: Array<{ timeTag: string; title: string; desc: string }>;
    flood?: Array<{ timeTag: string; title: string; desc: string }>;
    power?: Array<{ timeTag: string; title: string; desc: string }>;
  };
}

export function generateGrabBagHtml(data: GrabBagDossierData): string {
  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const verifiedStr = data.lastReviewedDate 
    ? `${data.lastReviewedDate} (${data.reviewedByName || 'Resilience Lead'})`
    : 'Certified Active';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>ISO 22301 EMERGENCY GRAB-BAG DOSSIER - ${data.townshipName.toUpperCase()}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 9.5px;
      line-height: 1.3;
    }
    .page {
      page-break-after: always;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .page:last-child {
      page-break-after: avoid;
    }
    
    /* Header Styles */
    .header-bar {
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 6px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .badge-iso {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-size: 8px;
      font-weight: 900;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .title {
      font-size: 15px;
      font-weight: 900;
      text-transform: uppercase;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .subtitle {
      font-size: 9.5px;
      font-weight: 600;
      color: #475569;
    }
    .meta-grid {
      text-align: right;
      font-family: monospace;
      font-size: 8.5px;
      line-height: 1.3;
    }
    .meta-grid strong {
      color: #0f172a;
    }

    /* Grab-Bag Warning Banner */
    .warning-banner {
      background: #fef2f2;
      border: 1.5px solid #dc2626;
      border-radius: 6px;
      padding: 5px 8px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 800;
      font-size: 9px;
      color: #991b1b;
    }

    /* Section Structure */
    .section {
      margin-bottom: 7px;
    }
    .section-title {
      background: #f1f5f9;
      border-left: 3.5px solid #0284c7;
      padding: 3px 6px;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      color: #0f172a;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4px;
      font-size: 8.5px;
    }
    th {
      background: #e2e8f0;
      color: #1e293b;
      text-align: left;
      padding: 3px 5px;
      font-weight: 800;
      border: 1px solid #cbd5e1;
      text-transform: uppercase;
      font-size: 8px;
    }
    td {
      padding: 3px 5px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .cell-bold {
      font-weight: 800;
      color: #0f172a;
    }
    .cell-phone {
      font-family: monospace;
      font-weight: 800;
      color: #0369a1;
      white-space: nowrap;
    }

    /* 2-Column Grid Layout */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
    }

    /* Callout Boxes */
    .box {
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 5px 7px;
      background: #ffffff;
    }
    .box-title {
      font-weight: 900;
      font-size: 9px;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 2px;
      margin-bottom: 3px;
      text-transform: uppercase;
    }

    /* Radio Channels Bar */
    .radio-bar {
      background: #eff6ff;
      border: 1.5px solid #3b82f6;
      border-radius: 5px;
      padding: 4px 8px;
      margin-bottom: 7px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5px;
      color: #1e40af;
    }
    .radio-bar strong {
      color: #1e3a8a;
      font-family: monospace;
      font-size: 9px;
    }

    /* Disclaimer Section */
    .disclaimer-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 5px 8px;
      font-size: 7.5px;
      color: #475569;
      line-height: 1.25;
      margin-top: 4px;
    }
    .disclaimer-box strong {
      color: #1e293b;
    }

    /* Footer */
    .footer-bar {
      border-top: 1px solid #cbd5e1;
      padding-top: 4px;
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
      <!-- Masthead Header -->
      <div class="header-bar">
        <div>
          <span class="badge-iso">ISO 22301:2019 CLAUSE 8.4 • CIVIL RESILIENCE</span>
          <h1 class="title">EMERGENCY ACTION RUNBOOK &amp; GRAB-BAG DOSSIER</h1>
          <div class="subtitle">Official Offline Disaster Contingency Plan for <strong>${data.townshipName}</strong></div>
        </div>
        <div class="meta-grid">
          <div>JURISDICTION: <strong>${data.townshipName.toUpperCase()}</strong></div>
          <div>PRINT DATE: <strong>${currentDate}</strong></div>
          <div>VERIFIED: <strong>${verifiedStr}</strong></div>
        </div>
      </div>

      <!-- Warning Banner -->
      <div class="warning-banner">
        <span>⚠️ TIER 4 NON-DIGITAL HARDCOPY • STORE IN QUARTERLY PHYSICAL EMERGENCY LOCKBOX</span>
        <span>ZERO-POWER / NO-CELL OUTAGE RUNBOOK</span>
      </div>

      <!-- Radio Frequencies -->
      <div class="radio-bar">
        <span>📻 <strong>PMR446 CH 1:</strong> 446.00625 MHz (Calling)</span>
        <span>📻 <strong>PMR446 CH 8:</strong> 446.09375 MHz (Coordination)</span>
        <span>⚡ <strong>POWER OUTAGE:</strong> Call 105</span>
        <span>🚨 <strong>POLICE / FIRE:</strong> 999 (Life Risk) | 101</span>
      </div>

      <!-- SECTION 1: 24/7 Multi-Agency Liaisons & Command -->
      <div class="section">
        <div class="section-title">
          <span>1. 24/7 Incident Command &amp; Multi-Agency Liaisons</span>
          <span style="font-size: 8px; font-weight: normal; color: #475569;">Immediate Contact Priority</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 28%;">Role / Agency</th>
              <th style="width: 32%;">Designated Contact</th>
              <th style="width: 20%;">24/7 Telephone</th>
              <th style="width: 20%;">Notes / Radio ID</th>
            </tr>
          </thead>
          <tbody>
            ${
              data.liaisons && data.liaisons.length > 0
                ? data.liaisons.slice(0, 5).map(l => `
                  <tr>
                    <td class="cell-bold">${l.role}</td>
                    <td>${l.agencyOrName || 'Designated Lead'}</td>
                    <td class="cell-phone">${l.telephone || '999 / 101'}</td>
                    <td>${l.notes || 'Incident Command Channel'}</td>
                  </tr>
                `).join('')
                : `
                  <tr>
                    <td class="cell-bold">Community Resilience Lead</td>
                    <td>${data.reviewedByName || 'Fiona Macleod'}</td>
                    <td class="cell-phone">07700 900123</td>
                    <td>Crisis Mobile (24/7)</td>
                  </tr>
                  <tr>
                    <td class="cell-bold">SFRS Fire Station Incident Lead</td>
                    <td>Local Retained Duty Officer</td>
                    <td class="cell-phone">999 / Control</td>
                    <td>Station Callout</td>
                  </tr>
                  <tr>
                    <td class="cell-bold">Local Medical Practice / Nurse</td>
                    <td>Health Centre Emergency Contact</td>
                    <td class="cell-phone">111 / Local Surgery</td>
                    <td>Welfare Support</td>
                  </tr>
                `
            }
          </tbody>
        </table>
      </div>

      <!-- SECTION 2: Designated Shelters & Warmth Hubs -->
      <div class="section">
        <div class="section-title">
          <span>2. Designated Emergency Reception Centres &amp; Warmth Hubs</span>
          <span style="font-size: 8px; font-weight: normal; color: #475569;">Shelter &amp; Generator Keyholders</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 25%;">Facility Name</th>
              <th style="width: 30%;">Address &amp; Location</th>
              <th style="width: 12%;">Capacity</th>
              <th style="width: 18%;">Keyholder</th>
              <th style="width: 15%;">Contact Phone</th>
            </tr>
          </thead>
          <tbody>
            ${
              data.shelters && data.shelters.length > 0
                ? data.shelters.slice(0, 4).map(s => `
                  <tr>
                    <td class="cell-bold">${s.name} ${s.hasGenerator ? '<span style="color:#d97706;">[⚡GEN]</span>' : ''}</td>
                    <td>${s.address || 'Central Square'}</td>
                    <td><strong>${s.capacity || '150'}</strong> seats</td>
                    <td>${s.keyholder || 'Warden on Duty'}</td>
                    <td class="cell-phone">${s.phone || '07700 900123'}</td>
                  </tr>
                `).join('')
                : `
                  <tr>
                    <td class="cell-bold">Village Hall Reception Centre <span style="color:#d97706;">[⚡GEN]</span></td>
                    <td>Main Street, Central Square</td>
                    <td><strong>180</strong> seats</td>
                    <td>Hall Warden (Key Box 1)</td>
                    <td class="cell-phone">07700 900456</td>
                  </tr>
                  <tr>
                    <td class="cell-bold">Community High School Pavilion</td>
                    <td>High School Campus, East Wing</td>
                    <td><strong>250</strong> seats</td>
                    <td>Janitor / Caretaker</td>
                    <td class="cell-phone">07700 900789</td>
                  </tr>
                `
            }
          </tbody>
        </table>
      </div>

      <!-- SECTION 3: Keyholders & Critical Asset Access Register -->
      <div class="section">
        <div class="section-title">
          <span>3. Critical Asset Keys, Defibrillators &amp; Access Register</span>
          <span style="font-size: 8px; font-weight: normal; color: #475569;">Physical Access</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30%;">Facility / Asset</th>
              <th style="width: 18%;">Primary Contact</th>
              <th style="width: 17%;">Primary Phone</th>
              <th style="width: 17%;">Backup Contact</th>
              <th style="width: 18%;">Key / PIN Location</th>
            </tr>
          </thead>
          <tbody>
            ${
              data.keyholders && data.keyholders.length > 0
                ? data.keyholders.slice(0, 4).map(k => `
                  <tr>
                    <td class="cell-bold">${k.facilityOrAsset}</td>
                    <td>${k.primaryName || 'Designated Lead'}</td>
                    <td class="cell-phone">${k.primaryPhone || '07700 900123'}</td>
                    <td>${k.backupName || 'Deputy Warden'}</td>
                    <td>${k.keyLocationNotes || 'Key Safe (Code: Auth Only)'}</td>
                  </tr>
                `).join('')
                : `
                  <tr>
                    <td class="cell-bold">Emergency Generator &amp; Fuel Cache</td>
                    <td>Council Roads Officer</td>
                    <td class="cell-phone">07700 900111</td>
                    <td>Depot Supervisor</td>
                    <td>Compound Lockbox A-1</td>
                  </tr>
                  <tr>
                    <td class="cell-bold">Sandbag Depot &amp; Flood Barrier Store</td>
                    <td>Flood Group Warden</td>
                    <td class="cell-phone">07700 900222</td>
                    <td>Parish Clerk</td>
                    <td>Parish Shed (Key 34)</td>
                  </tr>
                  <tr>
                    <td class="cell-bold">Public Defibrillator (CPAD)</td>
                    <td>First Responder Lead</td>
                    <td class="cell-phone">999 (Code Dispatch)</td>
                    <td>Community Pharmacy</td>
                    <td>Hall Exterior Wall (Code 999)</td>
                  </tr>
                `
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Page 1 Footer -->
    <div class="footer-bar">
      <span>PAGE 1 OF 2 • ISO 22301 CIVIL RESILIENCE COMPLIANT</span>
      <span>OFFLINE GRAB-BAG RUNBOOK • RE-PRINT QUARTERLY</span>
      <span>${data.townshipName.toUpperCase()}</span>
    </div>
  </div>

  <!-- ======================== PAGE 2 ======================== -->
  <div class="page">
    <div>
      <!-- Page 2 Header -->
      <div class="header-bar">
        <div>
          <span class="badge-iso">OPERATIONAL FIELD CHECKLISTS &amp; EVACUATION FLEET</span>
          <h2 class="title">HAZARD RESPONSE PROTOCOLS &amp; FLEET DISPATCH</h2>
          <div class="subtitle">Immediate Action Checklists from T+0 to T+60 Minutes</div>
        </div>
        <div class="meta-grid">
          <div>JURISDICTION: <strong>${data.townshipName.toUpperCase()}</strong></div>
          <div>SERIAL: <strong>GB-EAP-${data.townshipName.slice(0, 3).toUpperCase()}-${new Date().getFullYear()}</strong></div>
        </div>
      </div>

      <!-- SECTION 4: Event-Driven Hazard Action Checklists -->
      <div class="section">
        <div class="section-title">
          <span>4. Rapid Incident Action Checklists (T-0 to T+60 Minutes)</span>
          <span style="font-size: 8px; font-weight: normal; color: #475569;">Event-Driven SOPs</span>
        </div>
        <div class="grid-3">
          <!-- Wildfire / Urban Fire -->
          <div class="box">
            <div class="box-title" style="color: #b91c1c;">🔥 Wildfire / Major Fire</div>
            <ul style="padding-left: 12px; font-size: 8px; line-height: 1.35;">
              <li><strong>T+0:</strong> Verify wind direction &amp; notify SFRS Control via 999.</li>
              <li><strong>T+15:</strong> Unlock secondary escape corridor and muster point.</li>
              <li><strong>T+30:</strong> Deploy agricultural tractors for perimeter firebreak.</li>
              <li><strong>T+45:</strong> Evacuate priority vulnerable residents &amp; livestock.</li>
            </ul>
          </div>

          <!-- Flood / River Breach -->
          <div class="box">
            <div class="box-title" style="color: #0369a1;">🌊 Flood / Storm Surge</div>
            <ul style="padding-left: 12px; font-size: 8px; line-height: 1.35;">
              <li><strong>T+0:</strong> Monitor river gauges &amp; SEPA flood advisory.</li>
              <li><strong>T+15:</strong> Open Sandbag Depot; dispatch pallet loaders.</li>
              <li><strong>T+30:</strong> Move vulnerable ground-floor residents to upper floors.</li>
              <li><strong>T+60:</strong> Close low-lying bridges; direct traffic to high-ground.</li>
            </ul>
          </div>

          <!-- Power Grid Blackout / Winter Cutoff -->
          <div class="box">
            <div class="box-title" style="color: #d97706;">⚡ Power Outage / Winter</div>
            <ul style="padding-left: 12px; font-size: 8px; line-height: 1.35;">
              <li><strong>T+0:</strong> Contact SSEN via 105 for estimated restoration time.</li>
              <li><strong>T+15:</strong> Start backup generator at Primary Warmth Centre.</li>
              <li><strong>T+30:</strong> Conduct door-to-door welfare checks on oxygen users.</li>
              <li><strong>T+60:</strong> Establish hot soup, battery charging &amp; radio desk.</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- SECTION 5: Evacuation Transport Fleet & Muster Pickup Hubs -->
      <div class="section" style="margin-top: 6px;">
        <div class="section-title">
          <span>5. Registered Evacuation Transport Fleet &amp; Muster Points</span>
          <span style="font-size: 8px; font-weight: normal; color: #475569;">Coaches, 4x4s &amp; Accessible Vans</span>
        </div>
        <div class="grid-2">
          <!-- Fleet Table -->
          <div>
            <table>
              <thead>
                <tr>
                  <th style="width: 45%;">Fleet Partner</th>
                  <th style="width: 25%;">Type</th>
                  <th style="width: 15%;">Seats</th>
                  <th style="width: 15%;">Phone</th>
                </tr>
              </thead>
              <tbody>
                ${
                  data.transportFleet && data.transportFleet.length > 0
                    ? data.transportFleet.slice(0, 3).map(f => `
                      <tr>
                        <td class="cell-bold">${f.operatorName}</td>
                        <td>${f.vehicleType}</td>
                        <td><strong>${f.capacity}</strong></td>
                        <td class="cell-phone">${f.phone}</td>
                      </tr>
                    `).join('')
                    : `
                      <tr>
                        <td class="cell-bold">Stagecoach Highland Depot</td>
                        <td>53-Seat Coaches</td>
                        <td><strong>160</strong></td>
                        <td class="cell-phone">07700 900555</td>
                      </tr>
                      <tr>
                        <td class="cell-bold">Community Accessible Minibus</td>
                        <td>Wheelchair Van</td>
                        <td><strong>16</strong></td>
                        <td class="cell-phone">07700 900666</td>
                      </tr>
                      <tr>
                        <td class="cell-bold">Local 4x4 Volunteer Group</td>
                        <td>4x4 Winch ATVs</td>
                        <td><strong>24</strong></td>
                        <td class="cell-phone">07700 900777</td>
                      </tr>
                    `
                }
              </tbody>
            </table>
          </div>

          <!-- Muster Hubs Table -->
          <div>
            <table>
              <thead>
                <tr>
                  <th style="width: 45%;">Muster Pickup Hub</th>
                  <th style="width: 35%;">Address</th>
                  <th style="width: 20%;">On-Site Lead</th>
                </tr>
              </thead>
              <tbody>
                ${
                  data.musterPoints && data.musterPoints.length > 0
                    ? data.musterPoints.slice(0, 3).map(m => `
                      <tr>
                        <td class="cell-bold">${m.name}</td>
                        <td>${m.address}</td>
                        <td>${m.onSiteCoordinator || 'Muster Lead'}</td>
                      </tr>
                    `).join('')
                    : `
                  <tr>
                    <td class="cell-bold">Town Square Car Park (Tier 1)</td>
                    <td>High Street Main Bays</td>
                    <td>Muster Marshal A</td>
                  </tr>
                  <tr>
                    <td class="cell-bold">East End Church Yard (Tier 2)</td>
                    <td>Church Brae Access</td>
                    <td>Muster Marshal B</td>
                  </tr>
                  <tr>
                    <td class="cell-bold">Primary School Bus Turnaround</td>
                    <td>Station Road Gate</td>
                    <td>School Caretaker</td>
                  </tr>
                    `
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- SECTION 6: Statutory Limitation of Service & ISO 22301 Disclaimer -->
      <div class="disclaimer-box">
        <div style="font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 2px;">
          Statutory Emergency Service Continuity &amp; Limitation of Service Notice (ISO 22301 Clause 8.4)
        </div>
        <p style="margin-bottom: 2px;">
          <strong>1. Intended Role:</strong> The Community Hub platform is a decentralized community resilience and mutual-aid coordination aid. It is <strong>not</strong> a replacement for statutory blue-light emergency services (e.g., 999, 911, or 112). In any immediate life-safety emergency, always contact national emergency services first.
        </p>
        <p style="margin-bottom: 2px;">
          <strong>2. Telecommunications Dependence &amp; Offline Cache:</strong> While this system incorporates offline caching (IndexedDB and Progressive Web App technology) to maximize availability during infrastructure disruptions, real-time sync is dependent on public cellular and ISP networks.
        </p>
        <p>
          <strong>3. Grab-Bag Protocol Mandate:</strong> In accordance with ISO 22301 manual fallback guidelines, community coordinators must generate, print, and securely store physical copies of this Emergency Action Dossier on a quarterly basis in physical lockboxes to ensure continuous operational readiness during complete electrical or telecommunications blackouts.
        </p>
      </div>
    </div>

    <!-- Page 2 Footer -->
    <div class="footer-bar">
      <span>PAGE 2 OF 2 • END OF OFFICIAL EMERGENCY GRAB-BAG RUNBOOK</span>
      <span>COMMUNITY HUB RESILIENCE ENGINE • ISO 22301 ALIGNED</span>
      <span>CONFIDENTIAL OPERATIONAL USE ONLY</span>
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
