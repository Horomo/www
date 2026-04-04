import { NextRequest, NextResponse } from 'next/server';

import type { PlaceSearchResult } from '@/lib/places';

type OpenMeteoResult = {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  country_code?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

type OpenMeteoResponse = {
  results?: OpenMeteoResult[];
};

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (query.length < 2) {
    return NextResponse.json({ results: [] satisfies PlaceSearchResult[] });
  }

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', query);
  url.searchParams.set('count', '8');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Place search is unavailable right now.' }, { status: 502 });
    }

    const data = (await response.json()) as OpenMeteoResponse;
    const results: PlaceSearchResult[] = (data.results ?? [])
      .filter((item) => item.timezone && item.country)
      .map((item) => ({
        id: item.id,
        name: item.name,
        admin1: item.admin1 ?? null,
        country: item.country ?? 'Unknown',
        countryCode: item.country_code ?? null,
        latitude: item.latitude,
        longitude: item.longitude,
        timezone: item.timezone ?? 'UTC',
      }));

    return NextResponse.json({ results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown place search error';
    console.error('Place search failed', { query, message });
    return NextResponse.json({ error: 'Place search failed.' }, { status: 500 });
  }
}
