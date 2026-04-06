'use client';

import { useEffect, useRef, useState } from 'react';

import { formatPlaceLabel, type PlaceSearchResult } from '@/lib/places';

type BirthPlaceSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: PlaceSearchResult) => void;
  selectedPlace: PlaceSearchResult | null;
};

export default function BirthPlaceSearch(props: BirthPlaceSearchProps) {
  const { value, onChange, onSelect, selectedPlace } = props;
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [hasTyped, setHasTyped] = useState(false);
  const requestCounter = useRef(0);

  useEffect(() => {
    const query = value.trim();

    if (query.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const currentRequest = ++requestCounter.current;
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/places/search?q=${encodeURIComponent(query)}`);
        const data = (await response.json()) as { results?: PlaceSearchResult[]; error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? 'Unable to search for places right now.');
        }

        if (requestCounter.current === currentRequest) {
          setResults(data.results ?? []);
          setShowResults(hasTyped);
        }
      } catch (searchError: unknown) {
        if (requestCounter.current === currentRequest) {
          setResults([]);
          setError(searchError instanceof Error ? searchError.message : 'Unable to search for places right now.');
          setShowResults(hasTyped);
        }
      } finally {
        if (requestCounter.current === currentRequest) {
          setLoading(false);
        }
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [hasTyped, value]);

  return (
    <div className="flex flex-col gap-1 sm:col-span-2">
      <label className="text-xs font-medium uppercase tracking-[0.18em] text-[#151d22]/58">Birth Place</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(event) => {
            setHasTyped(true);
            onChange(event.target.value);
          }}
          onFocus={() => {
            if (hasTyped && (results.length > 0 || error)) {
              setShowResults(true);
            }
          }}
          placeholder="Search city, province, country, or hospital area"
          className="glass-input w-full rounded-2xl px-4 py-3 text-sm"
        />
        {showResults && (loading || error || results.length > 0) && (
          <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(246,252,255,0.84)_56%,rgba(255,244,246,0.84))] shadow-[0_24px_60px_rgba(0,106,98,0.12)] backdrop-blur-[24px]">
            {loading && <div className="px-4 py-3 text-sm text-[#151d22]/66">Searching places...</div>}
            {!loading && error && <div className="px-4 py-3 text-sm text-[#874e58]">{error}</div>}
            {!loading && !error && results.length === 0 && (
              <div className="px-4 py-3 text-sm text-[#151d22]/66">No matching places found.</div>
            )}
            {!loading && !error && results.map((place) => (
              <button
                key={`${place.id}-${place.latitude}-${place.longitude}`}
                type="button"
                onClick={() => {
                  onSelect(place);
                  setShowResults(false);
                }}
                className="block w-full px-4 py-3 text-left transition-colors hover:bg-white/46"
              >
                <div className="text-sm font-medium text-[#151d22]">{formatPlaceLabel(place)}</div>
                <div className="text-xs text-[#151d22]/56">
                  {place.timezone} · {place.latitude.toFixed(2)}, {place.longitude.toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-0.5 text-[10px] text-[#151d22]/52">
        Search the place of birth and we&apos;ll fill timezone, longitude, and latitude automatically.
      </p>
      {selectedPlace && (
        <div className="rounded-2xl bg-[linear-gradient(135deg,rgba(64,224,208,0.16),rgba(255,255,255,0.62))] px-4 py-3 text-xs text-[#151d22]/68 shadow-[inset_0_0_0_1px_rgba(64,224,208,0.16)]">
          <span className="font-medium text-[#151d22]">{formatPlaceLabel(selectedPlace)}</span>
          {' · '}
          {selectedPlace.timezone}
          {' · '}
          {selectedPlace.latitude.toFixed(2)}, {selectedPlace.longitude.toFixed(2)}
        </div>
      )}
    </div>
  );
}
