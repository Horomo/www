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
      <label className="text-xs font-medium text-slate-600">Birth Place</label>
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
          <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-3xl border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.86))] shadow-[0_25px_60px_rgba(2,8,23,0.56)] backdrop-blur-xl">
            {loading && <div className="px-4 py-3 text-sm text-slate-300">Searching places...</div>}
            {!loading && error && <div className="px-4 py-3 text-sm text-rose-300">{error}</div>}
            {!loading && !error && results.length === 0 && (
              <div className="px-4 py-3 text-sm text-slate-300">No matching places found.</div>
            )}
            {!loading && !error && results.map((place) => (
              <button
                key={`${place.id}-${place.latitude}-${place.longitude}`}
                type="button"
                onClick={() => {
                  onSelect(place);
                  setShowResults(false);
                }}
                className="block w-full border-b border-white/6 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-white/8"
              >
                <div className="text-sm font-medium text-slate-100">{formatPlaceLabel(place)}</div>
                <div className="text-xs text-slate-400">
                  {place.timezone} · {place.latitude.toFixed(2)}, {place.longitude.toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-0.5 text-[10px] text-slate-400">
        Search the place of birth and we&apos;ll fill timezone, longitude, and latitude automatically.
      </p>
      {selectedPlace && (
        <div className="rounded-2xl border border-cyan-300/18 bg-cyan-400/10 px-4 py-3 text-xs text-slate-300">
          <span className="font-medium text-slate-100">{formatPlaceLabel(selectedPlace)}</span>
          {' · '}
          {selectedPlace.timezone}
          {' · '}
          {selectedPlace.latitude.toFixed(2)}, {selectedPlace.longitude.toFixed(2)}
        </div>
      )}
    </div>
  );
}
