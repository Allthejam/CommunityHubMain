'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function QrCodeCanvas({
  value,
  size = 220,
  title,
  subtitle,
  showActions = false,
}: {
  value: string;
  size?: number;
  title?: string;
  subtitle?: string;
  showActions?: boolean;
}) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    if (!value) return;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch((err) => console.error('QR generation failed:', err));
    return () => {
      active = false;
    };
  }, [value, size]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${(title || 'community-qr').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    link.click();
  };

  const handlePrintPoster = () => {
    if (!dataUrl) return;
    const win = window.open('', '_blank', 'width=680,height=860');
    if (!win) return;
    const safeTitle = (title || 'Support Our Community').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeSub = (subtitle || 'Scan with your phone camera to pay securely via Apple Pay, Google Pay, or Card.').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    win.document.write(`<!doctype html>
<html>
<head>
  <title>${safeTitle} - QR Poster</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 48px 32px; color: #0f172a; }
    .card { border: 3px solid #0f172a; border-radius: 24px; padding: 40px 32px; max-width: 520px; margin: 0 auto; }
    h1 { font-size: 28px; margin: 0 0 10px; }
    p { font-size: 16px; color: #475569; margin: 0 0 24px; }
    img { width: 320px; height: 320px; margin: 12px auto; display: block; }
    .badge { display: inline-block; margin-top: 18px; padding: 8px 16px; border-radius: 999px; background: #f1f5f9; font-weight: 600; font-size: 14px; }
    .url { margin-top: 14px; font-size: 11px; color: #64748b; word-break: break-all; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${safeTitle}</h1>
    <p>${safeSub}</p>
    <img src="${dataUrl}" alt="QR Code" />
    <div class="badge">Apple Pay &bull; Google Pay &bull; Card</div>
    <div class="url">${value}</div>
  </div>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`);
    win.document.close();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={title || 'Payment QR Code'}
          width={size}
          height={size}
          className="rounded-xl border bg-white p-2 shadow-sm"
        />
      ) : (
        <div
          style={{ width: size, height: size }}
          className="rounded-xl border bg-muted animate-pulse"
        />
      )}

      {showActions && dataUrl && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={handleDownload}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download PNG
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={handlePrintPoster}>
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Poster
          </Button>
          <Button type="button" size="sm" variant="ghost" asChild>
            <a href={value} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Preview Link
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
