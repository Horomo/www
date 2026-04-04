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
          className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        {showResults && (loading || error || results.length > 0) && (
          <div className="absolute z-10 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            {loading && <div className="px-3 py-2 text-sm text-slate-500">Searching places...</div>}
            {!loading && error && <div className="px-3 py-2 text-sm text-red-600">{error}</div>}
            {!loading && !error && results.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-500">No matching places found.</div>
            )}
            {!loading && !error && results.map((place) => (
              <button
                key={`${place.id}-${place.latitude}-${place.longitude}`}
                type="button"
                onClick={() => {
                  onSelect(place);
                  setShowResults(false);
                }}
                className="block w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="text-sm font-medium text-slate-800">{formatPlaceLabel(place)}</div>
                <div className="text-xs text-slate-500">
                  {place.timezone} · {place.latitude.toFixed(2)}, {place.longitude.toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-[10px] text-slate-400 mt-0.5">
        Search the place of birth and we&apos;ll fill timezone, longitude, and latitude automatically.
      </p>
      {selectedPlace && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-slate-600">
          <span className="font-medium text-slate-800">{formatPlaceLabel(selectedPlace)}</span>
          {' · '}
          {selectedPlace.timezone}
          {' · '}
          {selectedPlace.latitude.toFixed(2)}, {selectedPlace.longitude.toFixed(2)}
        </div>
      )}
    </div>
  );
}
