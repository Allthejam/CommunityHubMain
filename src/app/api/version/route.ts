import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

let cachedBuildId: string | null = null;

function getBuildId(): string {
  if (process.env.NODE_ENV !== 'production') {
    return 'dev';
  }
  if (cachedBuildId) return cachedBuildId;

  try {
    const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');
    if (fs.existsSync(buildIdPath)) {
      cachedBuildId = fs.readFileSync(buildIdPath, 'utf8').trim();
      return cachedBuildId;
    }
  } catch {
    // Fallback to environment revision if .next/BUILD_ID is unavailable
  }

  cachedBuildId =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.K_REVISION ||
    process.env.HOSTNAME ||
    'prod';
  return cachedBuildId;
}

export async function GET() {
  return NextResponse.json(
    { buildId: getBuildId() },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  );
}
