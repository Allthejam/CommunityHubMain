import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host');

  // Check if the host exists and starts with 'www.'
  if (host && host.startsWith('www.')) {
    const newHost = host.substring(4);
    const newUrl = new URL(request.url);
    newUrl.host = newHost;
    
    // Use a permanent redirect (308) to preserve the request method (e.g., POST for webhooks)
    return NextResponse.redirect(newUrl, 308);
  }

  return NextResponse.next();
}

// This config ensures the middleware runs on all requests.
export const config = {
  matcher: '/:path*',
};
