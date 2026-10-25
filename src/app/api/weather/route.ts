import { NextResponse } from 'next/server';

const WMO_DESCRIPTIONS: Record<number, { label: string; isSevere: boolean; severity: 'normal' | 'yellow' | 'amber' | 'red' }> = {
  0: { label: 'Clear Sky', isSevere: false, severity: 'normal' },
  1: { label: 'Mainly Clear', isSevere: false, severity: 'normal' },
  2: { label: 'Partly Cloudy', isSevere: false, severity: 'normal' },
  3: { label: 'Overcast', isSevere: false, severity: 'normal' },
  45: { label: 'Foggy', isSevere: false, severity: 'normal' },
  48: { label: 'Freezing Fog', isSevere: true, severity: 'yellow' },
  51: { label: 'Light Drizzle', isSevere: false, severity: 'normal' },
  53: { label: 'Moderate Drizzle', isSevere: false, severity: 'normal' },
  55: { label: 'Heavy Drizzle', isSevere: false, severity: 'normal' },
  56: { label: 'Freezing Drizzle', isSevere: true, severity: 'yellow' },
  57: { label: 'Heavy Freezing Drizzle', isSevere: true, severity: 'amber' },
  61: { label: 'Light Rain', isSevere: false, severity: 'normal' },
  63: { label: 'Moderate Rain', isSevere: false, severity: 'normal' },
  65: { label: 'Heavy Rain', isSevere: true, severity: 'yellow' },
  66: { label: 'Freezing Rain', isSevere: true, severity: 'amber' },
  67: { label: 'Heavy Freezing Rain', isSevere: true, severity: 'amber' },
  71: { label: 'Light Snow', isSevere: false, severity: 'normal' },
  73: { label: 'Moderate Snow', isSevere: true, severity: 'yellow' },
  75: { label: 'Heavy Snowfall', isSevere: true, severity: 'amber' },
  77: { label: 'Snow Grains / Ice', isSevere: true, severity: 'yellow' },
  80: { label: 'Rain Showers', isSevere: false, severity: 'normal' },
  81: { label: 'Heavy Rain Showers', isSevere: true, severity: 'yellow' },
  82: { label: 'Violent Storm Showers', isSevere: true, severity: 'amber' },
  85: { label: 'Snow Showers', isSevere: true, severity: 'yellow' },
  86: { label: 'Heavy Snow Showers', isSevere: true, severity: 'amber' },
  95: { label: 'Thunderstorm', isSevere: true, severity: 'yellow' },
  96: { label: 'Thunderstorm & Hail', isSevere: true, severity: 'amber' },
  99: { label: 'Severe Thunderstorm & Heavy Hail', isSevere: true, severity: 'red' },
};

interface MetOfficeWarning {
  title: string;
  description: string;
  link: string;
  level: 'yellow' | 'amber' | 'red';
}

async function fetchMetOfficeWarnings(): Promise<MetOfficeWarning[]> {
  // Check Highlands & Eilean Siar (he) and Grampian (gr) Met Office RSS feeds
  const feeds = [
    'https://www.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/he',
    'https://www.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/gr',
  ];

  const warnings: MetOfficeWarning[] = [];
  const seenTitles = new Set<string>();

  for (const url of feeds) {
    try {
      const res = await fetch(url, { next: { revalidate: 600 } });
      if (!res.ok) continue;
      const xml = await res.text();
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      let match: RegExpExecArray | null;
      while ((match = itemRegex.exec(xml)) !== null) {
        const block = match[1];
        const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/i);
        const descMatch = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/i);
        const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);

        const rawTitle = (titleMatch?.[1] || titleMatch?.[2] || '').trim();
        const rawDesc = (descMatch?.[1] || descMatch?.[2] || '').trim();
        const rawLink = (linkMatch?.[1] || 'https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings').trim();

        if (!rawTitle || seenTitles.has(rawTitle)) continue;
        seenTitles.add(rawTitle);

        const lowerTitle = rawTitle.toLowerCase();
        let level: 'yellow' | 'amber' | 'red' = 'yellow';
        if (lowerTitle.includes('red warning')) level = 'red';
        else if (lowerTitle.includes('amber warning')) level = 'amber';

        warnings.push({
          title: rawTitle,
          description: rawDesc,
          link: rawLink,
          level,
        });
      }
    } catch {
      // Ignore individual RSS feed errors
    }
  }

  return warnings;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let lat = parseFloat(searchParams.get('lat') || '');
    let lng = parseFloat(searchParams.get('lng') || '');
    const communityName = (searchParams.get('name') || 'Grantown-on-Spey').trim();

    // If no coordinates provided, geocode the community name or default to Grantown-on-Spey (57.329, -3.609)
    if (isNaN(lat) || isNaN(lng)) {
      const cleanName = communityName
        .replace(/show home community.*/i, '')
        .replace(/oakridge.*/i, 'Grantown-on-Spey')
        .trim();

      if (cleanName) {
        try {
          const geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanName)}&count=3&language=en&format=json`,
            { next: { revalidate: 86400 } }
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            const ukMatch = geoData?.results?.find((r: any) => r.country_code === 'GB') || geoData?.results?.[0];
            if (ukMatch && typeof ukMatch.latitude === 'number') {
              lat = ukMatch.latitude;
              lng = ukMatch.longitude;
            }
          }
        } catch {
          // Fallback below
        }
      }

      if (isNaN(lat) || isNaN(lng)) {
        lat = 57.329;
        lng = -3.609;
      }
    }

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max&wind_speed_unit=mph&timezone=Europe%2FLondon&forecast_days=2`;

    const [weatherRes, metWarnings] = await Promise.all([
      fetch(weatherUrl, { next: { revalidate: 300 } }),
      fetchMetOfficeWarnings(),
    ]);

    if (!weatherRes.ok) {
      throw new Error('Failed to fetch live weather data');
    }

    const weatherData = await weatherRes.json();
    const current = weatherData.current || {};
    const daily = weatherData.daily || {};

    const tempC = Math.round(current.temperature_2m ?? 8);
    const feelsLikeC = Math.round(current.apparent_temperature ?? tempC);
    const windSpeedMph = Math.round(current.wind_speed_10m ?? 0);
    const currentGustsMph = Math.round(current.wind_gusts_10m ?? windSpeedMph);
    const maxDailyGustsMph = Math.round(daily.wind_gusts_10m_max?.[0] ?? currentGustsMph);
    const peakGustsMph = Math.max(currentGustsMph, maxDailyGustsMph);
    const precipMm = Number(current.precipitation ?? 0);
    const dailyPrecipMm = Number(daily.precipitation_sum?.[0] ?? precipMm);

    const currentCode = Number(current.weather_code ?? 0);
    const dailyCode = Number(daily.weather_code?.[0] ?? currentCode);
    const wmoCurrent = WMO_DESCRIPTIONS[currentCode] || { label: 'Variable', isSevere: false, severity: 'normal' };
    const wmoDaily = WMO_DESCRIPTIONS[dailyCode] || wmoCurrent;

    // Determine alert status from Met Office warnings + live storm thresholds
    let alertLevel: 'clear' | 'yellow' | 'amber' | 'red' = 'clear';
    let alertHeadline = 'Weather Normal — No Active Warnings';
    let alertDescription = `Current conditions in ${communityName}: ${wmoCurrent.label}, ${tempC}°C with winds at ${windSpeedMph} mph (gusts up to ${peakGustsMph} mph).`;
    let externalUrl = 'https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings';

    if (metWarnings.length > 0) {
      const topWarning =
        metWarnings.find((w) => w.level === 'red') ||
        metWarnings.find((w) => w.level === 'amber') ||
        metWarnings[0];
      alertLevel = topWarning.level;
      alertHeadline = `Met Office: ${topWarning.title}`;
      alertDescription = topWarning.description;
      externalUrl = topWarning.link || externalUrl;
    } else if (peakGustsMph >= 60 || wmoCurrent.severity === 'red') {
      alertLevel = 'red';
      alertHeadline = `Severe Storm Warning — Gusts up to ${peakGustsMph} mph`;
      alertDescription = `Severe gale-force wind gusts up to ${peakGustsMph} mph and ${wmoCurrent.label.toLowerCase()} detected for ${communityName}. Take extra care on rural roads, watch for fallen trees, and secure loose outdoor items.`;
    } else if (peakGustsMph >= 45 || dailyPrecipMm >= 25 || wmoCurrent.severity === 'amber' || wmoDaily.severity === 'amber') {
      alertLevel = 'amber';
      alertHeadline = `Storm & High Wind Alert — Gusts ${peakGustsMph} mph`;
      alertDescription = `Strong storm conditions affecting ${communityName} (${wmoCurrent.label}, sustained winds ${windSpeedMph} mph with gusts reaching ${peakGustsMph} mph). Expect potential surface water or branch debris on local routes.`;
    } else if (peakGustsMph >= 32 || windSpeedMph >= 22 || dailyPrecipMm >= 12 || wmoCurrent.isSevere || wmoDaily.isSevere) {
      alertLevel = 'yellow';
      alertHeadline =
        peakGustsMph >= 32
          ? `Weather Advisory: High Winds (Gusts ${peakGustsMph} mph)`
          : `Weather Advisory: ${wmoCurrent.isSevere ? wmoCurrent.label : wmoDaily.label}`;
      alertDescription = `Adverse weather conditions active in ${communityName}: ${wmoCurrent.label} (${tempC}°C), wind speed ${windSpeedMph} mph with gusts up to ${peakGustsMph} mph${dailyPrecipMm > 0 ? `, rainfall ${dailyPrecipMm.toFixed(1)} mm` : ''}. Please take care when travelling.`;
    }

    return NextResponse.json({
      success: true,
      communityName,
      coordinates: { lat, lng },
      alertLevel,
      alertHeadline,
      alertDescription,
      externalUrl,
      metWarnings,
      current: {
        tempC,
        feelsLikeC,
        windSpeedMph,
        windGustsMph: currentGustsMph,
        peakGustsMph,
        precipMm,
        dailyPrecipMm,
        condition: wmoCurrent.label,
        weatherCode: currentCode,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unable to load weather alert status' },
      { status: 500 }
    );
  }
}
