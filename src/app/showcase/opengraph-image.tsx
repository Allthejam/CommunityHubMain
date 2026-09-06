import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Community Hub Showcase — Hyperlocal Civic Resilience & Digital High Street';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          backgroundImage: 'linear-gradient(135deg, #022c22 0%, #064e3b 45%, #042f2e 100%)',
          padding: '60px 70px',
          fontFamily: 'sans-serif',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px' }}>
              COMMUNITY HUB
            </span>
            <span style={{ fontSize: '13px', color: '#a7f3d0', fontWeight: 600, letterSpacing: '1px' }}>
              OFFICIAL PLATFORM SHOWCASE
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1050px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.18)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              fontSize: '15px',
              fontWeight: 700,
              width: 'fit-content',
            }}
          >
            <span>Hyperlocal Civic Resilience Network</span>
          </div>
          <h1
            style={{
              fontSize: '46px',
              fontWeight: 900,
              lineHeight: 1.15,
              margin: 0,
              letterSpacing: '-1px',
              color: '#ffffff',
            }}
          >
            Civic Resilience & Digital High Street Platform
          </h1>
          <p
            style={{
              fontSize: '21px',
              color: '#cbd5e1',
              margin: 0,
              lineHeight: 1.4,
              maxWidth: '960px',
            }}
          >
            Statutory civil protection plans, real-time emergency alert beacons, verified resident communication, and independent merchant discovery.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          <div style={{ display: 'flex', gap: '24px', fontSize: '15px', color: '#a7f3d0', fontWeight: 600 }}>
            <span>GDPR Compliant</span>
            <span>Zero Tracking Cookies</span>
            <span>Algorithm-Free Feed</span>
          </div>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>
            my-community-hub.co.uk
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
