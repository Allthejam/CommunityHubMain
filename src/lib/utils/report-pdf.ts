import { format, isValid } from "date-fns";

export type PrintableReport = {
  id: string;
  subject: string;
  category: string;
  reporterName?: string;
  createdAt: any;
  status: string;
  description: string;
  severity: "Low" | "Moderate" | "Severe" | string;
  image?: string | null;
  images?: string[] | null;
  reporterId?: string;
  resolutionNotes?: string;
  resolvedAt?: any;
  resolvedBy?: string;
  acknowledgedAt?: any;
  acknowledgedBy?: string;
  contactPreference?: string;
  contactDetail?: string;
  communityName?: string;
  communityId?: string;
};

function formatPrintDate(d: any): string {
  if (!d) return "N/A";
  try {
    let dateObj: Date | null = null;
    if (typeof d?.toDate === "function") {
      dateObj = d.toDate();
    } else if (d instanceof Date) {
      dateObj = d;
    } else if (typeof d === "string" || typeof d === "number") {
      dateObj = new Date(d);
    } else if (typeof d === "object" && ("_seconds" in d || "seconds" in d)) {
      const secs = d._seconds ?? d.seconds;
      dateObj = new Date(secs * 1000);
    }
    if (dateObj && isValid(dateObj)) {
      return format(dateObj, "dd MMMM yyyy, HH:mm 'UTC'");
    }
    return "N/A";
  } catch {
    return "N/A";
  }
}

export function printReportAsPdf(report: PrintableReport) {
  if (typeof window === "undefined") return;

  const printWindow = window.open("", "_blank", "width=850,height=950");
  if (!printWindow) {
    alert("Please allow pop-ups in your browser to print or export the PDF report.");
    return;
  }

  const allImages = Array.isArray(report.images) && report.images.length > 0 
    ? report.images 
    : (report.image ? [report.image] : []);

  const createdDateStr = formatPrintDate(report.createdAt);
  const ackDateStr = formatPrintDate(report.acknowledgedAt);
  const resDateStr = formatPrintDate(report.resolvedAt);

  const imagesHtml = allImages.length > 0
    ? `
      <div class="section">
        <div class="section-title">Attached Evidence Photos (${allImages.length})</div>
        <div class="image-grid">
          ${allImages.map((url, i) => `
            <div class="image-card">
              <img src="${url}" alt="Evidence Photo #${i + 1}" crossorigin="anonymous" />
              <div class="image-caption">Photo #${i + 1}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `
    : `
      <div class="section">
        <div class="section-title">Attached Evidence Photos</div>
        <p style="color: #64748b; font-style: italic; font-size: 13px;">No photographic evidence was attached to this report.</p>
      </div>
    `;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Incident Report - ${report.id}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
          }
          * {
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          body {
            color: #0f172a;
            background: #fff;
            margin: 0;
            padding: 24px;
            font-size: 13px;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .brand {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.5px;
          }
          .sub-brand {
            font-size: 12px;
            color: #64748b;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 2px;
          }
          .doc-badge {
            text-align: right;
          }
          .doc-title {
            font-size: 14px;
            font-weight: 700;
            color: #dc2626;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .doc-id {
            font-size: 11px;
            color: #64748b;
            font-family: monospace;
            margin-top: 2px;
          }
          .report-subject {
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 16px 0;
            line-height: 1.3;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px;
            margin-bottom: 20px;
          }
          .meta-item {
            font-size: 12px;
          }
          .meta-label {
            font-weight: 600;
            color: #475569;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
          }
          .meta-value {
            font-weight: 600;
            color: #0f172a;
            margin-top: 2px;
          }
          .severity-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
          }
          .severity-Severe { background: #fee2e2; color: #991b1b; }
          .severity-Moderate { background: #fef3c7; color: #92400e; }
          .severity-Low { background: #dbeafe; color: #1e40af; }
          .section {
            margin-bottom: 20px;
          }
          .section-title {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #334155;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .description-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 12px;
            font-size: 13px;
            color: #1e293b;
            white-space: pre-wrap;
            line-height: 1.6;
          }
          .resolution-box {
            background: #f0fdf4;
            border: 1px solid #86efac;
            border-radius: 6px;
            padding: 12px;
            font-size: 13px;
            color: #166534;
            line-height: 1.6;
          }
          .image-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .image-card {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            overflow: hidden;
            background: #f8fafc;
          }
          .image-card img {
            width: 100%;
            height: 220px;
            object-fit: cover;
            display: block;
          }
          .image-caption {
            padding: 6px 10px;
            font-size: 11px;
            font-weight: 600;
            color: #475569;
            background: #fff;
            border-top: 1px solid #e2e8f0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 12px;
            border-top: 1px solid #cbd5e1;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #64748b;
          }
          .no-print-bar {
            background: #0f172a;
            color: #fff;
            padding: 12px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: -24px -24px 24px -24px;
          }
          .btn-print {
            background: #2563eb;
            color: #fff;
            border: none;
            padding: 8px 16px;
            font-weight: 700;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
          }
          @media print {
            .no-print-bar { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <div>
            <strong>Official Incident Report Export</strong> — Press Print to save as PDF or paper copy
          </div>
          <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
        </div>

        <div class="header">
          <div>
            <div class="brand">My Community Hub</div>
            <div class="sub-brand">Confidential Community Incident Record • ${report.communityName || 'Community Network'}</div>
          </div>
          <div class="doc-badge">
            <div class="doc-title">Official Incident Report</div>
            <div class="doc-id">REF: #${report.id}</div>
          </div>
        </div>

        <h1 class="report-subject">${report.subject}</h1>

        <div class="meta-grid">
          <div class="meta-item">
            <div class="meta-label">Date & Time Filed</div>
            <div class="meta-value">${createdDateStr}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Incident Severity</div>
            <div class="meta-value">
              <span class="severity-badge severity-${report.severity || 'Moderate'}">
                ${report.severity || 'Moderate'}
              </span>
            </div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Category</div>
            <div class="meta-value" style="text-transform: capitalize;">${report.category}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Current Status</div>
            <div class="meta-value">${report.status}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Reported By</div>
            <div class="meta-value">${report.reporterName || 'Anonymous Member of the Public'}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Contact Method</div>
            <div class="meta-value">${report.contactPreference ? (report.contactPreference === 'email' ? `Email (${report.contactDetail || 'Provided'})` : 'Platform In-App Chat') : 'Not specified / Anonymous'}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Incident Description</div>
          <div class="description-box">${report.description}</div>
        </div>

        ${imagesHtml}

        ${report.acknowledgedAt ? `
          <div class="section">
            <div class="section-title">Officer / Leader Acknowledgement</div>
            <p style="font-size: 12px; margin: 0; color: #334155;">
              Acknowledged by <strong>${report.acknowledgedBy || 'Community Leader'}</strong> on ${ackDateStr}.
            </p>
          </div>
        ` : ''}

        ${report.resolutionNotes ? `
          <div class="section">
            <div class="section-title">Resolution & Case Notes</div>
            <div class="resolution-box">
              <div style="font-weight: 700; margin-bottom: 4px;">Resolved on ${resDateStr} by ${report.resolvedBy || 'Community Officer'}</div>
              <div>${report.resolutionNotes}</div>
            </div>
          </div>
        ` : ''}

        <div class="footer">
          <div>Generated from My Community Hub on ${format(new Date(), "dd/MM/yyyy HH:mm 'UTC'")}</div>
          <div>Retain for Police Liaison / Community Leadership records in accordance with GDPR policy</div>
        </div>

        <script>
          // Automatically prompt print dialog after page assets load
          window.addEventListener('load', () => {
            setTimeout(() => { window.print(); }, 400);
          });
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
