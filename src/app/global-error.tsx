'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global App Error]:', error);

    const msg = error?.message?.toLowerCase() || '';
    if (
      msg.includes('chunkloaderror') ||
      msg.includes('loading chunk') ||
      msg.includes('failed to fetch dynamically imported module') ||
      msg.includes('error loading dynamically imported module') ||
      msg.includes('importing a module script failed')
    ) {
      const lastReload = sessionStorage.getItem('chunk_load_error_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 20000) {
        sessionStorage.setItem('chunk_load_error_reload', String(now));
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="font-sans antialiased bg-slate-950 text-white min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 flex items-center justify-center text-3xl">
            🔄
          </div>
          <h2 className="text-xl font-bold mb-2">Update Ready</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            A new version of Community Hub was deployed. Please refresh to load the latest features and updates.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm transition-all shadow-md active:scale-95"
          >
            Refresh Community Hub
          </button>
        </div>
      </body>
    </html>
  );
}
