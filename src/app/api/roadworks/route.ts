import { NextResponse } from 'next/server';

export interface RoadworkItem {
  id: string;
  title: string;
  road: string;
  category: 'incident' | 'current_works' | 'planned_works';
  severity: 'closure' | 'active_works' | 'planned';
  summary: string;
  startDate?: string;
  endDate?: string;
  delayInfo?: string;
  link: string;
  lat: number | null;
  lng: number | null;
  milesAway: number | null;
  pubDate: string;
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function cleanXmlText(str: string): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseDescription(rawHtml: string): {
  summary: string;
  startDate?: string;
  endDate?: string;
  delayInfo?: string;
} {
  const decoded = cleanXmlText(rawHtml);
  const parts = decoded
    .split(/<br\s*\/?>/i)
    .map((p) => p.replace(/<[^>]*>/g, '').trim())
    .filter(Boolean);

  let startDate: string | undefined;
  let endDate: string | undefined;
  let delayInfo: string | undefined;
  const otherLines: string[] = [];

  for (const line of parts) {
    if (/^start date\s*:/i.test(line)) {
      startDate = line.replace(/^start date\s*:\s*/i, '').trim();
    } else if (/^end date\s*:/i.test(line)) {
      endDate = line.replace(/^end date\s*:\s*/i, '').trim();
    } else if (/^delay information\s*:/i.test(line)) {
      delayInfo = line.replace(/^delay information\s*:\s*/i, '').trim();
    } else {
      otherLines.push(line);
    }
  }

  const summary = otherLines.join(' — ') || delayInfo || 'See official Traffic Scotland notice for full details.';
  return { summary, startDate, endDate, delayInfo };
}

function extractRoadCode(title: string): string {
  const match = title.match(/\b([AM]\d{1,4}|B\d{3,4})\b/i);
  return match ? match[1].toUpperCase() : 'Local Route';
}

async function fetchTrafficScotlandFeed(
  url: string,
  category: 'incident' | 'current_works' | 'planned_works',
  centerLat: number,
  centerLng: number
): Promise<RoadworkItem[]> {
  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const xml = await res.text();
    const items: RoadworkItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/i);
      const descMatch = block.match(/<description>([\s\S]*?)<\/description>/i);
      const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
      const pointMatch = block.match(/<georss:point>([\s\S]*?)<\/georss:point>/i);
      const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

      const title = cleanXmlText(titleMatch?.[1] || '');
      if (!title) continue;

      const { summary, startDate, endDate, delayInfo } = parseDescription(descMatch?.[1] || '');
      const link = cleanXmlText(linkMatch?.[1] || 'https://www.traffic.gov.scot/');
      const pubDate = cleanXmlText(pubDateMatch?.[1] || '');

      let lat: number | null = null;
      let lng: number | null = null;
      let milesAway: number | null = null;

      if (pointMatch?.[1]) {
        const coords = pointMatch[1].trim().split(/\s+/);
        if (coords.length >= 2) {
          const parsedLat = parseFloat(coords[0]);
          const parsedLng = parseFloat(coords[1]);
          if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
            lat = parsedLat;
            lng = parsedLng;
            milesAway = haversineMiles(centerLat, centerLng, lat, lng);
          }
        }
      }

      const combinedText = `${title} ${summary} ${delayInfo || ''}`.toLowerCase();
      let severity: 'closure' | 'active_works' | 'planned' =
        category === 'incident'
          ? 'closure'
          : category === 'current_works'
          ? 'active_works'
          : 'planned';

      if (
        combinedText.includes('closed') ||
        combinedText.includes('closure') ||
        combinedText.includes('diversion') ||
        combinedText.includes('blocked')
      ) {
        severity = 'closure';
      }

      items.push({
        id: `${category}-${title}-${lat || 0}-${lng || 0}`.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 80),
        title,
        road: extractRoadCode(title),
        category,
        severity,
        summary,
        startDate,
        endDate,
        delayInfo,
        link,
        lat,
        lng,
        milesAway,
        pubDate,
      });
    }

    return items;
  } catch {
    return [];
  }
}

async function fetchLocalOverpassRoadworks(centerLat: number, centerLng: number): Promise<RoadworkItem[]> {
  try {
    // Query active road construction & tagged road closures within 18km (~11 miles) of the community polygon center
    const query = `[out:json][timeout:8];(way["highway"="construction"](around:18000,${centerLat},${centerLng});way["highway"~"^(trunk|primary|secondary|tertiary|residential)$"]["access"="no"](around:12000,${centerLat},${centerLng}););out center tags 20;`;
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      next: { revalidate: 900 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data.elements)) return [];

    const items: RoadworkItem[] = [];
    for (const el of data.elements) {
      const tags = el.tags || {};
      const lat = el.center?.lat ?? el.lat;
      const lng = el.center?.lon ?? el.lon;
      if (typeof lat !== 'number' || typeof lng !== 'number') continue;

      const roadRef = tags.ref || tags.construction || '';
      const roadName = tags.name || tags['addr:street'] || roadRef || 'Local Road';
      const isClosure = tags.access === 'no' && tags.highway !== 'construction';
      const note = tags.note || tags.description || tags['construction:note'] || tags.fixme || '';
      const openingDate = tags.opening_date || tags.check_date || '';

      // Skip private driveways or unnamed footpaths with access=no
      if (isClosure && !tags.name && !tags.ref) continue;

      const milesAway = haversineMiles(centerLat, centerLng, lat, lng);
      const roadBadge = roadRef ? String(roadRef).split(';')[0].trim() : extractRoadCode(roadName);

      items.push({
        id: `osm-${el.id}`,
        title: isClosure
          ? `${roadName} — Road Closed / Restricted Access`
          : `${roadName} — Active Roadworks / Construction`,
        road: roadBadge !== 'Local Route' ? roadBadge : roadName.slice(0, 18),
        category: isClosure ? 'incident' : 'current_works',
        severity: isClosure ? 'closure' : 'active_works',
        summary:
          note ||
          (isClosure
            ? `Road access restriction or closure recorded on ${roadName}. Check One.Network for local diversion details.`
            : `Active highway construction or street works recorded on ${roadName}${tags.operator ? ` (${tags.operator})` : ''}.`),
        startDate: 'Active Local Works',
        endDate: openingDate ? `Est. completion: ${openingDate}` : undefined,
        link: `https://www.one.network/?tm=GB#14/${lat}/${lng}`,
        lat,
        lng,
        milesAway,
        pubDate: '',
      });
    }
    return items;
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const radiusMiles = parseFloat(searchParams.get('radiusMiles') || '15');
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

    const isScotland = lat >= 54.6;

    const [incidents, currentWorks, plannedWorks, localOverpass] = await Promise.all([
      isScotland
        ? fetchTrafficScotlandFeed('https://trafficscotland.org/rss/feeds/currentincidents.aspx', 'incident', lat, lng)
        : Promise.resolve([]),
      isScotland
        ? fetchTrafficScotlandFeed('https://trafficscotland.org/rss/feeds/roadworks.aspx', 'current_works', lat, lng)
        : Promise.resolve([]),
      isScotland
        ? fetchTrafficScotlandFeed('https://trafficscotland.org/rss/feeds/plannedroadworks.aspx', 'planned_works', lat, lng)
        : Promise.resolve([]),
      fetchLocalOverpassRoadworks(lat, lng),
    ]);

    const allTrunkItems = [...incidents, ...currentWorks, ...plannedWorks];

    // Filter trunk road items strictly to within radiusMiles (15 miles default, expanding to 22 miles if < 2 found)
    let nearbyTrunk = allTrunkItems.filter((item) => item.milesAway !== null && item.milesAway <= radiusMiles);
    if (nearbyTrunk.length < 2) {
      nearbyTrunk = allTrunkItems.filter((item) => item.milesAway !== null && item.milesAway <= 22);
    }

    const allItems = [...nearbyTrunk, ...localOverpass];

    // Deduplicate by title + category
    const seen = new Set<string>();
    const deduped = allItems.filter((item) => {
      const key = `${item.category}:${item.title.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort: Incidents/Closures first, then Current Works, then Planned Works, then by distance
    const categoryOrder: Record<string, number> = {
      incident: 0,
      current_works: 1,
      planned_works: 2,
    };

    deduped.sort((a, b) => {
      if (a.severity === 'closure' && b.severity !== 'closure') return -1;
      if (b.severity === 'closure' && a.severity !== 'closure') return 1;
      const catDiff = (categoryOrder[a.category] ?? 9) - (categoryOrder[b.category] ?? 9);
      if (catDiff !== 0) return catDiff;
      return (a.milesAway ?? 999) - (b.milesAway ?? 999);
    });

    return NextResponse.json({
      success: true,
      communityName,
      coordinates: { lat, lng },
      totalFound: deduped.length,
      items: deduped.slice(0, 25),
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
