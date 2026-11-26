export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/firebase/admin-app';
import { sendPushNotificationAction } from '@/lib/actions/notificationActions';
import { getRoadworksForLocation } from '@/lib/roadworks';

function getLondonTodayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getLondonHour(): number {
  const hr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    hour12: false,
  }).format(new Date());
  return Number(hr);
}

function diffDaysIso(fromIso: string, toIso: string): number {
  const fromMs = Date.parse(`${fromIso}T00:00:00Z`);
  const toMs = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((toMs - fromMs) / (24 * 60 * 60 * 1000));
}

function addDaysIso(isoDate: string, days: number): string {
  const ms = Date.parse(`${isoDate}T00:00:00Z`) + days * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

function getCenterFromBoundary(boundary?: any): { lat: number; lng: number } | null {
  if (!boundary) return null;
  try {
    const geo = typeof boundary === 'string' ? JSON.parse(boundary) : boundary;
    const coords: [number, number][] = [];
    const collect = (arr: any) => {
      if (!Array.isArray(arr)) return;
      if (arr.length >= 2 && typeof arr[0] === 'number' && typeof arr[1] === 'number') {
        coords.push([arr[0], arr[1]]);
      } else {
        arr.forEach(collect);
      }
    };
    if (geo.type === 'FeatureCollection' && Array.isArray(geo.features)) {
      geo.features.forEach((f: any) => collect(f.geometry?.coordinates));
    } else if (geo.type === 'Feature') {
      collect(geo.geometry?.coordinates);
    } else {
      collect(geo.coordinates);
    }
    if (coords.length === 0) return null;
    let minLng = Infinity,
      maxLng = -Infinity,
      minLat = Infinity,
      maxLat = -Infinity;
    coords.forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });
    if (minLat === Infinity) return null;
    return { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
  } catch {
    return null;
  }
}

async function fetchWeatherLine(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,wind_gusts_10m&daily=temperature_2m_max,precipitation_sum,wind_gusts_10m_max&wind_speed_unit=mph&timezone=Europe%2FLondon&forecast_days=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return 'Weather check available in your hub';
    const d = await res.json();
    const temp = Math.round(d.current?.temperature_2m ?? 8);
    const maxTemp = Math.round(d.daily?.temperature_2m_max?.[0] ?? temp);
    const gusts = Math.round(d.daily?.wind_gusts_10m_max?.[0] ?? d.current?.wind_gusts_10m ?? 0);
    const rain = Number(d.daily?.precipitation_sum?.[0] ?? 0).toFixed(1);
    const warning = gusts >= 45 ? ' ⚠️ High winds' : Number(rain) >= 15 ? ' ⚠️ Heavy rain' : '';
    return `${temp}°C (high ${maxTemp}°C), gusts ${gusts} mph, rain ${rain} mm${warning}`;
  } catch {
    return 'Weather check available in your hub';
  }
}

async function fetchRoadworksLine(
  firestore: FirebaseFirestore.Firestore,
  communityId: string,
  name: string,
  lat: number,
  lng: number,
  fastMode = false
): Promise<string> {
  try {
    const nowMs = Date.now();
    const [officialResult, localSnap] = await Promise.all([
      getRoadworksForLocation({ communityName: name, lat, lng, radiusMiles: 30, fastMode }),
      firestore.collection(`communities/${communityId}/road_alerts`).get().catch(() => null),
    ]);

    const items = officialResult.items || [];
    let localClosures = 0;
    let localActive = 0;
    if (localSnap && !localSnap.empty) {
      localSnap.forEach((docSnap) => {
        const a = docSnap.data() || {};
        const expMs = typeof a.expiresAtMs === 'number' ? a.expiresAtMs : 0;
        if (expMs > 0 && expMs <= nowMs) return;
        if (a.alertType === 'closure') localClosures += 1;
        else localActive += 1;
      });
    }

    const closures = items.filter((i) => i.severity === 'closure').length + localClosures;
    const active = items.filter((i) => i.category === 'current_works').length + localActive;
    const topRoads = Array.from(
      new Set(
        items
          .map((i) => i.road)
          .filter((r) => Boolean(r) && r !== 'Local Route' && r !== 'Trunk')
      )
    ).slice(0, 4);
    const roadsSuffix = topRoads.length > 0 ? ` (incl. ${topRoads.join(', ')})` : '';

    if (closures > 0) {
      return `${closures} closure${closures > 1 ? 's' : ''} & ${active} active works within 30 miles of ${name}${roadsSuffix}`;
    }
    if (active > 0) {
      return `${active} active roadworks within 30 miles of ${name}${roadsSuffix}`;
    }
    return `Roads clear within 30 miles of ${name}`;
  } catch {
    return `Check Travel Noticeboard for live updates around ${name}`;
  }
}

async function buildCommunityBulletin(
  firestore: FirebaseFirestore.Firestore,
  communityId: string,
  todayIso: string,
  fastMode = false
) {
  const [commDoc, schoolAlertsSnap, schoolHolidaysSnap, leaderNoticesSnap] = await Promise.all([
    firestore.collection('communities').doc(communityId).get(),
    firestore.collection('communities').doc(communityId).collection('schoolAlerts').where('active', '==', true).get(),
    firestore.collection('communities').doc(communityId).collection('schoolHolidays').get(),
    firestore.collection('communities').doc(communityId).collection('dailyBriefingNotices').get(),
  ]);

  const commData = commDoc.data() || {};
  const communityName = commData.name || 'Your Community';
  const center =
    commData.centralCoordinates &&
    typeof commData.centralCoordinates.lat === 'number' &&
    typeof commData.centralCoordinates.lng === 'number'
      ? commData.centralCoordinates
      : getCenterFromBoundary(commData.boundary);

  const [weatherLine, roadsLine] = center
    ? await Promise.all([
        fetchWeatherLine(center.lat, center.lng),
        fetchRoadworksLine(firestore, communityId, communityName, center.lat, center.lng, fastMode),
      ])
    : ['No boundary mapped yet', 'No boundary mapped yet'];

  const activeClosures = schoolAlertsSnap.docs.map((d) => d.data() as any);
  const schoolLines: string[] = [];

  if (activeClosures.length > 0) {
    const names = activeClosures.slice(0, 3).map((a) => `${a.schoolName} (${a.status})`).join(', ');
    schoolLines.push(`School Alerts: ${names}`);
  } else {
    schoolLines.push('All local schools currently open');
  }

  const holidays = schoolHolidaysSnap.docs.map((d) => d.data() as any);
  for (const h of holidays) {
    if (!h.startDate) continue;
    const daysToStart = diffDaysIso(todayIso, h.startDate);
    if (daysToStart === 0) {
      schoolLines.push(`🎉 ${h.title} starts today!`);
    } else if (daysToStart >= 1 && daysToStart <= 5) {
      schoolLines.push(`⏳ ${daysToStart} day${daysToStart > 1 ? 's' : ''} until ${h.title}`);
    }

    const endDate = h.endDate || h.startDate;
    const backToSchoolIso = addDaysIso(endDate, 1);
    const daysToReturn = diffDaysIso(todayIso, backToSchoolIso);
    if (daysToReturn >= 1 && daysToReturn <= 5 && todayIso >= h.startDate && todayIso <= endDate) {
      schoolLines.push(
        `🎒 ${daysToReturn} day${daysToReturn > 1 ? 's' : ''} until back to school (after ${h.title})`
      );
    }
  }

  const nowMs = Date.now();
  const leaderNotices: Array<{ id: string; title: string; message: string; linkUrl?: string }> = [];
  const cleanupNoticeBatch = firestore.batch();
  let hasNoticeCleanup = false;
  leaderNoticesSnap.forEach((docSnap) => {
    const n = docSnap.data() as any;
    if (typeof n.expiresAtMs === 'number' && n.expiresAtMs <= nowMs) {
      cleanupNoticeBatch.delete(docSnap.ref);
      hasNoticeCleanup = true;
      return;
    }
    if (n.targetDate === todayIso) {
      leaderNotices.push({
        id: docSnap.id,
        title: n.title || '',
        message: n.message || '',
        linkUrl: n.linkUrl || '',
      });
    }
  });
  if (hasNoticeCleanup) {
    cleanupNoticeBatch.commit().catch(() => {});
  }

  return { communityName, weatherLine, roadsLine, schoolLines, leaderNotices };
}

async function cleanupExpiredDailyBriefings(firestore: FirebaseFirestore.Firestore, nowMs: number) {
  try {
    const oldSnap = await firestore
      .collection('notifications')
      .where('type', '==', 'Daily Morning Briefing')
      .limit(200)
      .get();

    if (oldSnap.empty) return 0;
    const batch = firestore.batch();
    let count = 0;

    oldSnap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const expMs =
        typeof data.expiresAtMs === 'number'
          ? data.expiresAtMs
          : data.date?.toMillis
            ? data.date.toMillis() + 20 * 60 * 60 * 1000
            : 0;
      if (expMs > 0 && expMs <= nowMs) {
        batch.delete(docSnap.ref);
        count += 1;
      }
    });

    if (count > 0) {
      await batch.commit();
    }
    return count;
  } catch {
    return 0;
  }
}

async function handleDailyBriefing(request: Request) {
  const { searchParams } = new URL(request.url);
  const previewUserId = searchParams.get('userId');
  const cronCheck = searchParams.get('cronCheck') === '1';

  // Single-user live bulletin fetch for the in-app Morning Bulletin popup
  if (previewUserId) {
    try {
      const { firestore } = initializeAdminApp();
      const todayIso = getLondonTodayIso();
      const origin = new URL(request.url).origin;
      const userDoc = await firestore.collection('users').doc(previewUserId).get();
      if (!userDoc.exists) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }
      const u = userDoc.data() || {};
      const commId = u.primaryHomeCommunityId || u.homeCommunityId || u.communityId;
      if (!commId) {
        return NextResponse.json({ success: false, error: 'No home community set' });
      }
      const firstName = String(u.firstName || u.name || 'Neighbour').trim().split(/\s+/)[0];
      const bulletin = await buildCommunityBulletin(firestore, commId, todayIso, false);
      const greeting = `Good morning ${firstName}, this is your morning bulletin from your community ${bulletin.communityName}.`;

      // Ensure today's Daily Morning Briefing is also recorded in the user's Notification Center if not sent yet today
      if (
        getLondonHour() >= 8 &&
        u.dailyBriefingLastSentDate !== todayIso &&
        u.mailingLists?.standard !== false &&
        u.mailingLists?.dailyBriefing !== false
      ) {
        const nowMs = Date.now();
        const expiresAtMs = nowMs + 20 * 60 * 60 * 1000;
        const leaderSummary =
          bulletin.leaderNotices.length > 0
            ? bulletin.leaderNotices.map((n) => `📌 ${n.title}: ${n.message}`)
            : [];
        const summaryBody = [
          ...leaderSummary,
          `Weather: ${bulletin.weatherLine}`,
          `Roads: ${bulletin.roadsLine}`,
          ...bulletin.schoolLines,
        ].join(' • ');

        await Promise.all([
          firestore.collection('notifications').add({
            type: 'Daily Morning Briefing',
            subject: greeting,
            from: `${bulletin.communityName} Morning Bulletin`,
            date: Timestamp.fromMillis(nowMs),
            expiresAt: Timestamp.fromMillis(expiresAtMs),
            expiresAtMs,
            status: 'new',
            recipientId: previewUserId,
            relatedId: `briefing-${todayIso}`,
            actionUrl: '/home?briefing=1',
            details: {
              communityId: commId,
              communityName: bulletin.communityName,
              greeting,
              weatherLine: bulletin.weatherLine,
              roadsLine: bulletin.roadsLine,
              schoolLines: bulletin.schoolLines,
              leaderNotices: bulletin.leaderNotices,
              message: `${greeting} ${summaryBody}`,
            },
          }),
          firestore.collection('users').doc(previewUserId).update({
            dailyBriefingLastSentDate: todayIso,
          }),
        ]).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        date: todayIso,
        greeting,
        ...bulletin,
      });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 });
    }
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization') || '';
    const querySecret = searchParams.get('secret') || '';
    if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  // When called by the 07:00/08:00 UTC GitHub cron, only send from 08:00 Europe/London onwards
  if (cronCheck && getLondonHour() < 8) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: `Current Europe/London hour is ${getLondonHour()}, waiting for 8am.`,
    });
  }

  try {
    const { firestore } = initializeAdminApp();
    const nowMs = Date.now();
    const expiresAtMs = nowMs + 20 * 60 * 60 * 1000; // Auto-delete after 20 hours
    const todayIso = getLondonTodayIso();

    const cleanedExpired = await cleanupExpiredDailyBriefings(firestore, nowMs);

    const usersSnap = await firestore.collection('users').get();
    if (usersSnap.empty) {
      return NextResponse.json({ success: true, sentUsers: 0, communitiesProcessed: 0, cleanedExpired });
    }

    const usersByCommunity = new Map<string, Array<{ uid: string; firstName: string }>>();
    usersSnap.forEach((docSnap) => {
      const u = docSnap.data() || {};
      if (u.mailingLists?.standard === false || u.mailingLists?.dailyBriefing === false) return;
      if (u.dailyBriefingLastSentDate === todayIso) return;
      const commId = u.primaryHomeCommunityId || u.homeCommunityId || u.communityId;
      if (!commId) return;
      const firstName = String(u.firstName || u.name || 'Neighbour').trim().split(/\s+/)[0];
      const list = usersByCommunity.get(commId) || [];
      list.push({ uid: docSnap.id, firstName });
      usersByCommunity.set(commId, list);
    });

    let sentUsers = 0;
    let communitiesProcessed = 0;

    const communityEntries = Array.from(usersByCommunity.entries());
    const CONCURRENCY = 4;
    for (let cIdx = 0; cIdx < communityEntries.length; cIdx += CONCURRENCY) {
      const batchEntries = communityEntries.slice(cIdx, cIdx + CONCURRENCY);
      await Promise.all(
        batchEntries.map(async ([communityId, recipients]) => {
          if (recipients.length === 0) return;

          const bulletin = await buildCommunityBulletin(firestore, communityId, todayIso, true);
          const leaderSummary =
            bulletin.leaderNotices.length > 0
              ? bulletin.leaderNotices.map((n) => `📌 ${n.title}: ${n.message}`)
              : [];
          const summaryBody = [
            ...leaderSummary,
            `Weather: ${bulletin.weatherLine}`,
            `Roads: ${bulletin.roadsLine}`,
            ...bulletin.schoolLines,
          ].join(' • ');

          await sendPushNotificationAction({
            audience: { type: 'users', value: recipients.map((r) => r.uid) },
            notification: {
              title: `☀️ Morning Bulletin — ${bulletin.communityName}`,
              body: summaryBody.length > 180 ? `${summaryBody.slice(0, 177)}...` : summaryBody,
              tag: `daily-briefing-${communityId}-${todayIso}`,
              url: '/home?briefing=1',
            },
          }).catch((err) => {
            console.error(`Daily briefing push failed for ${communityId}:`, err);
          });

          const CHUNK_SIZE = 200;
          for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
            const chunk = recipients.slice(i, i + CHUNK_SIZE);
            const batch = firestore.batch();
            const ts = Timestamp.fromMillis(nowMs);

            chunk.forEach(({ uid, firstName }) => {
              const greeting = `Good morning ${firstName}, this is your morning bulletin from your community ${bulletin.communityName}.`;
              const notifRef = firestore.collection('notifications').doc();
              batch.set(notifRef, {
                type: 'Daily Morning Briefing',
                subject: greeting,
                from: `${bulletin.communityName} Morning Bulletin`,
                date: ts,
                expiresAt: Timestamp.fromMillis(expiresAtMs),
                expiresAtMs,
                status: 'new',
                recipientId: uid,
                relatedId: `briefing-${todayIso}`,
                actionUrl: '/home?briefing=1',
                details: {
                  communityId,
                  communityName: bulletin.communityName,
                  greeting,
                  weatherLine: bulletin.weatherLine,
                  roadsLine: bulletin.roadsLine,
                  schoolLines: bulletin.schoolLines,
                  leaderNotices: bulletin.leaderNotices,
                  message: `${greeting} ${summaryBody}`,
                },
              });
              batch.update(firestore.collection('users').doc(uid), {
                dailyBriefingLastSentDate: todayIso,
              });
            });

            await batch.commit();
          }

          sentUsers += recipients.length;
          communitiesProcessed += 1;
        })
      );
    }

    return NextResponse.json({
      success: true,
      date: todayIso,
      communitiesProcessed,
      sentUsers,
      cleanedExpired,
    });
  } catch (error: any) {
    console.error('Daily briefing cron error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to send daily briefing.' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handleDailyBriefing(request);
}

export async function POST(request: Request) {
  return handleDailyBriefing(request);
}
