export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initializeAdminApp } from '@/firebase/admin-app';

const COUNCIL_CLOSURES_DIRECTORY: Array<{ keywords: string[]; councilName: string; url: string }> = [
  {
    keywords: ['highland', 'grantown', 'aviemore', 'inverness', 'nairn', 'badenoch', 'strathspey', 'fort william', 'skye', 'wick', 'thurso', 'dingwall', 'cairngorm'],
    councilName: 'The Highland Council',
    url: 'https://www.highland.gov.uk/schoolclosures',
  },
  {
    keywords: ['moray', 'elgin', 'forres', 'keith', 'buckie', 'aberlour', 'dufftown'],
    councilName: 'Moray Council',
    url: 'https://secure.moray.gov.uk/mconnect/p/school_closures',
  },
  {
    keywords: ['aberdeenshire', 'braemar', 'ballater', 'banchory', 'stonehaven', 'peterhead', 'fraserburgh', 'banff', 'huntly', 'inverurie'],
    councilName: 'Aberdeenshire Council',
    url: 'https://online.aberdeenshire.gov.uk/Apps/schools-closures/',
  },
  {
    keywords: ['aberdeen'],
    councilName: 'Aberdeen City Council',
    url: 'https://www.aberdeencity.gov.uk/services/education-and-childcare/schools-and-colleges/school-closures',
  },
  {
    keywords: ['perth', 'kinross', 'pitlochry', 'blairgowrie', 'crieff', 'kinross'],
    councilName: 'Perth & Kinross Council',
    url: 'https://www.pkc.gov.uk/schoolclosures',
  },
  {
    keywords: ['fife', 'st andrews', 'kirkcaldy', 'dunfermline', 'cupar', 'anstruther'],
    councilName: 'Fife Council',
    url: 'https://www.fife.gov.uk/kb/docs/articles/education2/schools-in-fife/school-closures',
  },
  {
    keywords: ['argyll', 'bute', 'oban', 'dunoon', 'helensburgh', 'campbeltown'],
    councilName: 'Argyll and Bute Council',
    url: 'https://www.argyll-bute.gov.uk/education-and-learning/schools/school-closures',
  },
  {
    keywords: ['stirling', 'callander', 'dunblane', 'aberfoyle'],
    councilName: 'Stirling Council',
    url: 'https://www.stirling.gov.uk/schools-and-education/school-closures/',
  },
  {
    keywords: ['edinburgh'],
    councilName: 'City of Edinburgh Council',
    url: 'https://www.edinburgh.gov.uk/schoolclosures',
  },
  {
    keywords: ['glasgow'],
    councilName: 'Glasgow City Council',
    url: 'https://www.glasgow.gov.uk/schoolclosures',
  },
];

function resolveCouncilPortal(commData: Record<string, any>): { councilName: string; url: string; division: 'scotland' | 'england-and-wales' | 'northern-ireland' } {
  const customUrl = commData?.schoolClosuresCouncilUrl;
  const searchText = [
    commData?.name,
    commData?.region,
    commData?.state,
    commData?.county,
    commData?.country,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const isScottish =
    searchText.includes('scotland') ||
    COUNCIL_CLOSURES_DIRECTORY.some((c) => c.keywords.some((k) => searchText.includes(k)));

  const division: 'scotland' | 'england-and-wales' | 'northern-ireland' = searchText.includes('northern ireland')
    ? 'northern-ireland'
    : isScottish
      ? 'scotland'
      : 'england-and-wales';

  if (customUrl && typeof customUrl === 'string') {
    return {
      councilName: commData?.localAuthority || 'Local Council',
      url: customUrl,
      division,
    };
  }

  for (const entry of COUNCIL_CLOSURES_DIRECTORY) {
    if (entry.keywords.some((kw) => searchText.includes(kw))) {
      return { councilName: entry.councilName, url: entry.url, division };
    }
  }

  return division === 'scotland'
    ? {
        councilName: 'Scottish Local Council Directory',
        url: 'https://www.mygov.scot/school-closures',
        division,
      }
    : {
        councilName: 'GOV.UK Local Council Closures',
        url: 'https://www.gov.uk/check-school-closure',
        division,
      };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const communityId = searchParams.get('communityId') || '';

    let commData: Record<string, any> = {};
    let alerts: any[] = [];
    let holidays: any[] = [];

    if (communityId) {
      const isDemo = communityId === '9ayHMyZf4SRw2gof1AM9' || communityId === 'c_showhome';
      const { firestore } = initializeAdminApp(isDemo ? 'comfeed' : undefined);

      const [commDoc, alertsSnap, holidaysSnap] = await Promise.all([
        firestore.collection('communities').doc(communityId).get(),
        firestore
          .collection('communities')
          .doc(communityId)
          .collection('schoolAlerts')
          .where('active', '==', true)
          .get(),
        firestore
          .collection('communities')
          .doc(communityId)
          .collection('schoolHolidays')
          .orderBy('startDate', 'asc')
          .limit(10)
          .get(),
      ]);

      commData = commDoc.data() || {};
      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const todayIso = nowIso.slice(0, 10);
      const cleanupBatch = firestore.batch();
      let hasCleanupWrites = false;

      alerts = [];
      for (const d of alertsSnap.docs) {
        const data = d.data() as any;
        const createdMs = data.createdAt ? new Date(data.createdAt).getTime() : 0;
        const isExpired =
          (typeof data.expiresAtMs === 'number' && data.expiresAtMs <= nowMs) ||
          (typeof data.expiresAt === 'string' && data.expiresAt <= nowIso) ||
          (!data.expiresAt && !data.expiresAtMs && createdMs > 0 && createdMs + 48 * 60 * 60 * 1000 <= nowMs);

        if (isExpired) {
          cleanupBatch.update(d.ref, {
            active: false,
            autoExpiredAt: nowIso,
          });
          hasCleanupWrites = true;
        } else {
          alerts.push({ id: d.id, ...data });
        }
      }

      holidays = [];
      for (const d of holidaysSnap.docs) {
        const data = d.data() as any;
        const effectiveEnd = data.endDate || data.startDate;
        if (effectiveEnd && effectiveEnd < todayIso) {
          cleanupBatch.delete(d.ref);
          hasCleanupWrites = true;
        } else {
          holidays.push({ id: d.id, ...data });
        }
      }

      if (hasCleanupWrites) {
        await cleanupBatch.commit().catch((err) => console.warn('School cleanup batch skipped:', err));
      }
    }

    const portal = resolveCouncilPortal(commData);

    // Fetch official upcoming UK Bank / Public Holidays from GOV.UK
    let upcomingBankHolidays: Array<{ title: string; date: string }> = [];
    try {
      const govRes = await fetch('https://www.gov.uk/bank-holidays.json', {
        next: { revalidate: 86400 },
      });
      if (govRes.ok) {
        const govJson = await govRes.json();
        const events: Array<{ title: string; date: string }> = govJson?.[portal.division]?.events || [];
        const todayIso = new Date().toISOString().slice(0, 10);
        upcomingBankHolidays = events.filter((e) => e.date >= todayIso).slice(0, 4);
      }
    } catch {
      upcomingBankHolidays = [];
    }

    return NextResponse.json(
      {
        success: true,
        communityName: commData?.name || 'Local Community',
        councilName: portal.councilName,
        councilUrl: portal.url,
        division: portal.division,
        alerts,
        holidays,
        upcomingBankHolidays,
        checkedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    console.error('School closures API error:', error);
    return NextResponse.json(
      {
        success: false,
        alerts: [],
        holidays: [],
        upcomingBankHolidays: [],
        error: error?.message || 'Failed to load school closure status.',
      },
      { status: 500 }
    );
  }
}
