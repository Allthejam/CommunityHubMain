export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/firebase/admin-app';
import { sendPushNotificationAction } from '@/lib/actions/notificationActions';

function getLondonTodayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
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
    if (!res.ok) return 'Weather check available in hub';
    const d = await res.json();
    const temp = Math.round(d.current?.temperature_2m ?? 8);
    const maxTemp = Math.round(d.daily?.temperature_2m_max?.[0] ?? temp);
    const gusts = Math.round(d.daily?.wind_gusts_10m_max?.[0] ?? d.current?.wind_gusts_10m ?? 0);
    const rain = Number(d.daily?.precipitation_sum?.[0] ?? 0).toFixed(1);
    const warning = gusts >= 45 ? ' ⚠️ High winds' : Number(rain) >= 15 ? ' ⚠️ Heavy rain' : '';
    return `Weather: ${temp}°C (high ${maxTemp}°C), gusts ${gusts} mph, rain ${rain} mm${warning}`;
  } catch {
    return 'Weather check available in hub';
  }
}

async function fetchRoadworksLine(origin: string, name: string, lat: number, lng: number): Promise<string> {
  try {
    const url = `${origin}/api/roadworks?name=${encodeURIComponent(name)}&lat=${lat}&lng=${lng}&radiusMiles=30`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return 'Roads: Check Travel Noticeboard';
    const data = await res.json();
    const items: any[] = Array.isArray(data.items) ? data.items : [];
    const closures = items.filter((i) => i.severity === 'closure').length;
    const active = items.filter((i) => i.category === 'current_works').length;
    if (closures > 0) {
      return `Roads: ${closures} closure${closures > 1 ? 's' : ''} & ${active} active works within 30 mi`;
    }
    if (active > 0) {
      return `Roads: ${active} active roadworks within 30 mi`;
    }
    return 'Roads: Clear within 30 mi';
  } catch {
    return 'Roads: Check Travel Noticeboard';
  }
}

async function handleDailyBriefing(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization') || '';
    const { searchParams } = new URL(request.url);
    const querySecret = searchParams.get('secret') || '';
    if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const { firestore } = initializeAdminApp();
    const todayIso = getLondonTodayIso();
    const origin = new URL(request.url).origin;

    const usersSnap = await firestore
      .collection('users')
      .where('mailingLists.dailyBriefing', '==', true)
      .get();

    if (usersSnap.empty) {
      return NextResponse.json({ success: true, sentUsers: 0, communitiesProcessed: 0 });
    }

    // Group opted-in users by home community
    const usersByCommunity = new Map<string, string[]>();
    usersSnap.forEach((docSnap) => {
      const u = docSnap.data() || {};
      if (u.dailyBriefingLastSentDate === todayIso) return;
      const commId = u.primaryHomeCommunityId || u.homeCommunityId || u.communityId;
      if (!commId) return;
      const list = usersByCommunity.get(commId) || [];
      list.push(docSnap.id);
      usersByCommunity.set(commId, list);
    });

    let sentUsers = 0;
    let communitiesProcessed = 0;

    for (const [communityId, targetIds] of usersByCommunity.entries()) {
      if (targetIds.length === 0) continue;

      const [commDoc, schoolAlertsSnap, schoolHolidaysSnap] = await Promise.all([
        firestore.collection('communities').doc(communityId).get(),
        firestore.collection('communities').doc(communityId).collection('schoolAlerts').where('active', '==', true).get(),
        firestore.collection('communities').doc(communityId).collection('schoolHolidays').get(),
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
            fetchRoadworksLine(origin, communityName, center.lat, center.lng),
          ])
        : ['Weather: No boundary mapped yet', 'Roads: No boundary mapped yet'];

      // School closures & 5-day holiday / back-to-school countdowns
      const activeClosures = schoolAlertsSnap.docs.map((d) => d.data() as any);
      const schoolLines: string[] = [];

      if (activeClosures.length > 0) {
        const names = activeClosures.slice(0, 2).map((a) => `${a.schoolName} (${a.status})`).join(', ');
        schoolLines.push(`🏫 School Alerts: ${names}`);
      } else {
        schoolLines.push('🏫 Schools: All clear');
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

      const subject = `☀️ 8am Briefing — ${communityName}`;
      const body = [weatherLine, roadsLine, ...schoolLines].join(' • ');

      await sendPushNotificationAction({
        audience: { type: 'users', value: targetIds },
        notification: {
          title: subject,
          body: body.length > 180 ? `${body.slice(0, 177)}...` : body,
          tag: `daily-briefing-${communityId}-${todayIso}`,
          url: '/home',
        },
      });

      const CHUNK_SIZE = 350;
      for (let i = 0; i < targetIds.length; i += CHUNK_SIZE) {
        const chunk = targetIds.slice(i, i + CHUNK_SIZE);
        const batch = firestore.batch();
        const ts = Timestamp.now();

        chunk.forEach((uid) => {
          const notifRef = firestore.collection('notifications').doc();
          batch.set(notifRef, {
            type: 'Daily Morning Briefing',
            subject,
            from: `${communityName} Morning Briefing`,
            date: ts,
            status: 'new',
            recipientId: uid,
            relatedId: `briefing-${todayIso}`,
            actionUrl: '/home',
            details: {
              communityId,
              message: body,
            },
          });
          batch.update(firestore.collection('users').doc(uid), {
            dailyBriefingLastSentDate: todayIso,
          });
        });

        await batch.commit();
      }

      sentUsers += targetIds.length;
      communitiesProcessed += 1;
    }

    return NextResponse.json({
      success: true,
      date: todayIso,
      communitiesProcessed,
      sentUsers,
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
