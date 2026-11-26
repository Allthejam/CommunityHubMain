import zlib from 'node:zlib';

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
  const R = 3958.8;
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
  const match = title.match(/\b([AM]\d{1,4}|B\d{3,4})t?\b/i);
  return match ? match[1].toUpperCase() : 'Local Route';
}

interface SrwrCompactRow {
  ref: string;
  status: string;
  cat: string;
  impact: string;
  tm: string;
  street: string;
  town: string;
  auth: string;
  desc: string;
  start: string;
  end: string;
  lat: number;
  lng: number;
}

const SRWR_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const globalForSrwr = globalThis as unknown as {
  __srwrCache?: { fetchedAt: number; rows: SrwrCompactRow[] };
  __srwrPromise?: Promise<SrwrCompactRow[]>;
};

function parseCsvRow(line: string): string[] {
  const cols: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === ',' && !inQ) {
      cols.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur);
  return cols;
}

async function loadSrwrDataset(): Promise<SrwrCompactRow[]> {
  const now = Date.now();
  if (globalForSrwr.__srwrCache && now - globalForSrwr.__srwrCache.fetchedAt < SRWR_CACHE_TTL_MS) {
    return globalForSrwr.__srwrCache.rows;
  }
  if (globalForSrwr.__srwrPromise) {
    return globalForSrwr.__srwrPromise;
  }

  globalForSrwr.__srwrPromise = (async () => {
    try {
      const listRes = await fetch('https://downloads.srwr.scot/disruptions-export/api/v1/files', {
        headers: { 'User-Agent': 'CommunityHubUK/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (!listRes.ok) return globalForSrwr.__srwrCache?.rows || [];
      const listJson = await listRes.json();
      const latestFile = listJson?.files?.[0]?.name;
      if (!latestFile) return globalForSrwr.__srwrCache?.rows || [];

      const linkRes = await fetch(
        `https://downloads.srwr.scot/disruptions-export/api/v1/file/${encodeURIComponent(latestFile)}`,
        {
          headers: { 'User-Agent': 'CommunityHubUK/1.0' },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (!linkRes.ok) return globalForSrwr.__srwrCache?.rows || [];
      const linkJson = await linkRes.json();
      if (!linkJson?.url) return globalForSrwr.__srwrCache?.rows || [];

      const zipRes = await fetch(linkJson.url, { signal: AbortSignal.timeout(20000) });
      if (!zipRes.ok) return globalForSrwr.__srwrCache?.rows || [];
      const buf = Buffer.from(await zipRes.arrayBuffer());

      const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
      if (eocd < 0) return globalForSrwr.__srwrCache?.rows || [];
      const totalEntries = buf.readUInt16LE(eocd + 10);
      let pos = buf.readUInt32LE(eocd + 16);
      let csvText = '';

      for (let i = 0; i < totalEntries; i++) {
        const compSize = buf.readUInt32LE(pos + 20);
        const fnLen = buf.readUInt16LE(pos + 28);
        const exLen = buf.readUInt16LE(pos + 30);
        const cmLen = buf.readUInt16LE(pos + 32);
        const lfhOff = buf.readUInt32LE(pos + 42);
        const name = buf.slice(pos + 46, pos + 46 + fnLen).toString('utf8');
        if (name === 'CurrentActivities.csv') {
          const lFnLen = buf.readUInt16LE(lfhOff + 26);
          const lExLen = buf.readUInt16LE(lfhOff + 28);
          const dStart = lfhOff + 30 + lFnLen + lExLen;
          csvText = zlib.inflateRawSync(buf.slice(dStart, dStart + compSize)).toString('utf8');
          break;
        }
        pos += 46 + fnLen + exLen + cmLen;
      }

      if (!csvText) return globalForSrwr.__srwrCache?.rows || [];
      const lines = csvText.split(/\r?\n/);
      if (lines.length < 2) return [];

      const hdr = parseCsvRow(lines[0]);
      const idx = Object.fromEntries(hdr.map((h, k) => [h, k]));
      const cutoffIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const rows: SrwrCompactRow[] = [];

      for (let r = 1; r < lines.length; r++) {
        const line = lines[r];
        if (!line) continue;
        const c = parseCsvRow(line);
        const status = c[idx.ActivityStatus] || '';
        if (status !== 'In Progress' && status !== 'Proposed' && status !== 'Advance Planning') continue;
        const end = c[idx.EndDateTimeUTC] || '';
        if (end && end < cutoffIso) continue;
        const lat = parseFloat(c[idx.Latitude]);
        const lng = parseFloat(c[idx.Longitude]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        rows.push({
          ref: c[idx.ActivityReference] || String(r),
          status,
          cat: c[idx.Category] || '',
          impact: c[idx.TrafficImpact] || '',
          tm: c[idx.TrafficManagement] || '',
          street: (c[idx.Street] || c[idx.Location] || '').trim(),
          town: (c[idx.Town] || c[idx.Locality] || '').trim(),
          auth: (c[idx.RoadAuthorityName] || '').trim(),
          desc: (c[idx.Description] || '').trim(),
          start: c[idx.StartDateTimeUTC] || '',
          end,
          lat,
          lng,
        });
      }

      globalForSrwr.__srwrCache = { fetchedAt: Date.now(), rows };
      return rows;
    } catch (err) {
      console.error('SRWR dataset load failed:', err);
      return globalForSrwr.__srwrCache?.rows || [];
    } finally {
      globalForSrwr.__srwrPromise = undefined;
    }
  })();

  return globalForSrwr.__srwrPromise;
}

async function fetchScottishSrwrRoadworks(
  centerLat: number,
  centerLng: number,
  radiusMiles: number
): Promise<RoadworkItem[]> {
  const rows = await loadSrwrDataset();
  const items: RoadworkItem[] = [];

  for (const row of rows) {
    const milesAway = haversineMiles(centerLat, centerLng, row.lat, row.lng);
    if (milesAway > radiusMiles) continue;

    const cleanStreet = row.street.replace(/\b([AM]\d{1,4})t\b/gi, '$1') || row.town || 'Scottish Road';
    const roadCode = extractRoadCode(`${row.street} ${row.desc}`);
    const isInProgress = row.status === 'In Progress';
    const isClosure = /closure/i.test(row.impact) || /road closure/i.test(row.tm);
    const isTrunk = /transport scotland/i.test(row.auth) || /\bA\d{1,3}t\b/i.test(row.street);

    const category: RoadworkItem['category'] = isInProgress ? 'current_works' : 'planned_works';
    const severity: RoadworkItem['severity'] = isClosure
      ? 'closure'
      : isInProgress
        ? 'active_works'
        : 'planned';

    const locationLabel = row.town ? `${cleanStreet} (${row.town})` : cleanStreet;
    const actionLabel = row.tm || row.cat || (isInProgress ? 'Roadworks in Progress' : 'Planned Roadworks');

    items.push({
      id: `srwr-${row.ref}-${row.lat.toFixed(4)}`,
      title: `${locationLabel} — ${actionLabel}`,
      road: roadCode !== 'Local Route' ? roadCode : isTrunk ? 'Trunk' : row.town || 'Local Route',
      category,
      severity,
      summary: [
        row.desc || 'Scheduled roadworks registered on the Scottish Road Works Register.',
        row.tm ? `Traffic management: ${row.tm}` : '',
        row.auth ? `Authority: ${row.auth}` : '',
      ]
        .filter(Boolean)
        .join(' • '),
      startDate: row.start ? row.start.slice(0, 10) : undefined,
      endDate: row.end ? row.end.slice(0, 10) : undefined,
      delayInfo: row.impact ? `${row.impact} Impact` : undefined,
      link: 'https://www.roadworks.scot/',
      lat: row.lat,
      lng: row.lng,
      milesAway,
      pubDate: row.start,
    });
  }

  return items;
}

async function fetchTrafficScotlandFeed(
  url: string,
  category: 'incident' | 'current_works' | 'planned_works',
  centerLat: number,
  centerLng: number
): Promise<RoadworkItem[]> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4500), next: { revalidate: 600 } });
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
    const query = `[out:json][timeout:8];(way["highway"="construction"](around:18000,${centerLat},${centerLng});way["highway"~"^(trunk|primary|secondary|tertiary|residential)$"]["access"="no"](around:12000,${centerLat},${centerLng}););out center tags 20;`;
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': 'CommunityHubUK/1.0',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(6000),
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

export async function getRoadworksForLocation(params: {
  communityName: string;
  lat: number;
  lng: number;
  radiusMiles?: number;
  fastMode?: boolean;
}) {
  const { communityName, lat, lng, radiusMiles = 30, fastMode = false } = params;
  const isScotland = lat >= 54.6;

  const [incidents, currentWorks, plannedWorks, srwrWorks, localOverpass] = await Promise.all([
    isScotland && !fastMode
      ? fetchTrafficScotlandFeed('https://trafficscotland.org/rss/feeds/currentincidents.aspx', 'incident', lat, lng)
      : Promise.resolve([]),
    isScotland && !fastMode
      ? fetchTrafficScotlandFeed('https://trafficscotland.org/rss/feeds/roadworks.aspx', 'current_works', lat, lng)
      : Promise.resolve([]),
    isScotland && !fastMode
      ? fetchTrafficScotlandFeed('https://trafficscotland.org/rss/feeds/plannedroadworks.aspx', 'planned_works', lat, lng)
      : Promise.resolve([]),
    isScotland ? fetchScottishSrwrRoadworks(lat, lng, radiusMiles) : Promise.resolve([]),
    fastMode ? Promise.resolve([]) : fetchLocalOverpassRoadworks(lat, lng),
  ]);

  const allTrunkItems = [...incidents, ...currentWorks, ...plannedWorks];
  const nearbyTrunk = allTrunkItems.filter((item) => item.milesAway !== null && item.milesAway <= radiusMiles);
  const allItems = [...nearbyTrunk, ...srwrWorks, ...localOverpass];

  const seen = new Set<string>();
  const deduped = allItems.filter((item) => {
    const key = `${item.category}:${item.title.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const categoryOrder: Record<string, number> = {
    incident: 0,
    current_works: 1,
    planned_works: 2,
  };

  deduped.sort((a, b) => {
    const aActiveClosure = a.category !== 'planned_works' && a.severity === 'closure';
    const bActiveClosure = b.category !== 'planned_works' && b.severity === 'closure';
    if (aActiveClosure !== bActiveClosure) return aActiveClosure ? -1 : 1;

    const catDiff = (categoryOrder[a.category] ?? 9) - (categoryOrder[b.category] ?? 9);
    if (catDiff !== 0) return catDiff;

    if (a.severity === 'closure' && b.severity !== 'closure') return -1;
    if (b.severity === 'closure' && a.severity !== 'closure') return 1;

    const aHigh = /high/i.test(a.delayInfo || '') ? 0 : 1;
    const bHigh = /high/i.test(b.delayInfo || '') ? 0 : 1;
    if (aHigh !== bHigh) return aHigh - bHigh;

    const aTrunk = /^[AM]\d+$/i.test(a.road) ? 0 : 1;
    const bTrunk = /^[AM]\d+$/i.test(b.road) ? 0 : 1;
    if (aTrunk !== bTrunk) return aTrunk - bTrunk;

    return (a.milesAway ?? 999) - (b.milesAway ?? 999);
  });

  return {
    communityName,
    coordinates: { lat, lng },
    totalFound: deduped.length,
    items: deduped.slice(0, 35),
  };
}
