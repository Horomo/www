export interface PlaceSearchResult {
  id: number;
  name: string;
  admin1: string | null;
  country: string;
  countryCode: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
}

export function formatPlaceLabel(place: Pick<PlaceSearchResult, 'name' | 'admin1' | 'country'>): string {
  return [place.name, place.admin1, place.country].filter(Boolean).join(', ');
}
