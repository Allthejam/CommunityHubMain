import { NextResponse } from 'next/server';
import { getRoadworksForLocation, type RoadworkItem } from '@/lib/roadworks';

export type { RoadworkItem };

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const radiusMiles = parseFloat(searchParams.get('radiusMiles') || '30');
    const communityName = (searchParams.get('name') || 'Local Community').trim();

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({
        success: false,
        noBoundary: true,
        communityName,
        totalFound: 0,
        items: [],
      });
    }

    const result = await getRoadworksForLocation({
      communityName,
      lat,
      lng,
      radiusMiles,
    });

    return NextResponse.json({
      success: true,
      ...result,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Roadworks API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load roadworks feed' },
      { status: 500 }
    );
  }
}
