import React, { useState, useRef, useEffect } from 'react';
import {
  MapPin,
  ChevronDown,
  Search,
  Check,
  X,
  Building2,
  Navigation,
  Globe,
} from 'lucide-react';
import { KERALA_NEET_CAMPUSES } from '../data/campuses.ts';
import { CampusLocationItem } from '../types.ts';

interface CampusLocationSelectorProps {
  value: string;
  onChange: (campusName: string, campusObj?: CampusLocationItem) => void;
  error?: string;
  required?: boolean;
  label?: string;
  placeholder?: string;
  id?: string;
}

export const CampusLocationSelector: React.FC<CampusLocationSelectorProps> = ({
  value,
  onChange,
  error,
  required = true,
  label = 'Where Did You Study Kerala NEET Academy',
  placeholder = 'Type or select campus (e.g. Rohini Campus, Madurai)...',
  id = 'campus-location-selector',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'TIRUNELVELI' | 'REGIONAL' | 'ONLINE'>('ALL');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync internal query when value prop changes externally
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Filter campuses based on user typing & active tag filter
  const filteredCampuses = KERALA_NEET_CAMPUSES.filter((campus) => {
    // Tag filter
    if (activeFilter === 'TIRUNELVELI' && campus.tag !== 'Tirunelveli') return false;
    if (activeFilter === 'REGIONAL' && campus.tag !== 'Regional') return false;
    if (activeFilter === 'ONLINE' && campus.tag !== 'Online') return false;

    // Search query filter
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      campus.name.toLowerCase().includes(q) ||
      campus.city.toLowerCase().includes(q) ||
      campus.code.toLowerCase().includes(q) ||
      (campus.address ? campus.address.toLowerCase().includes(q) : false) ||
      campus.keywords.some((kw) => kw.toLowerCase().includes(q))
    );
  });

  // Separate into Tirunelveli, Regional, and Online for grouped display
  const tirunelveliCampuses = filteredCampuses.filter((c) => c.tag === 'Tirunelveli');
  const regionalCampuses = filteredCampuses.filter((c) => c.tag === 'Regional');
  const onlineCampuses = filteredCampuses.filter((c) => c.tag === 'Online');

  // Handle outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelectCampus = (campus: CampusLocationItem) => {
    // If clicking the currently selected campus, deselect it
    if (value && value.trim().toLowerCase() === campus.name.trim().toLowerCase()) {
      setQuery('');
      onChange('', undefined);
    } else {
      setQuery(campus.name);
      onChange(campus.name, campus);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery('');
    onChange('', undefined);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    const matched = KERALA_NEET_CAMPUSES.find(
      (c) => c.name.toLowerCase() === val.trim().toLowerCase()
    );
    onChange(val, matched);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setHighlightedIndex((prev) =>
        prev < filteredCampuses.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredCampuses.length - 1
      );
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredCampuses.length) {
        e.preventDefault();
        handleSelectCampus(filteredCampuses[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Find if currently typed query exactly matches any campus
  const selectedCampusObj = KERALA_NEET_CAMPUSES.find(
    (c) => c.name.toLowerCase() === value?.trim().toLowerCase()
  );

  return (
    <div className="space-y-1 relative" ref={containerRef} id={id}>
      <div className="flex items-center justify-between min-h-[18px]">
        <label
          htmlFor={`${id}-input`}
          className="block text-xs font-bold uppercase tracking-wider text-slate-700 truncate"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {selectedCampusObj && (
          <span className="inline-flex items-center text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md ml-1 flex-shrink-0">
            <Check className="w-2.5 h-2.5 mr-1 text-teal-600" />
            {selectedCampusObj.code}
          </span>
        )}
      </div>

      {/* Main Searchable Input Container */}
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-slate-400">
          <MapPin className={`w-4 h-4 ${isOpen ? 'text-teal-600' : 'text-slate-400'} transition-colors`} />
        </div>

        <input
          ref={inputRef}
          id={`${id}-input`}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full pl-10 pr-20 py-3 bg-white border-2 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition shadow-2xs ${
            error ? 'border-red-400 bg-red-50/20' : isOpen ? 'border-teal-500' : 'border-slate-300 hover:border-slate-400'
          }`}
        />

        {/* Right side controls: Clear Button & Chevron */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="Clear selection"
              aria-label="Clear campus location"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              inputRef.current?.focus();
            }}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label="Toggle campus dropdown"
          >
            <ChevronDown
              className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-teal-600' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs font-semibold text-red-600 flex items-center pt-0.5">
          {error}
        </p>
      )}

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Filter Pills Bar */}
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setActiveFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  activeFilter === 'ALL'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                All Branches ({KERALA_NEET_CAMPUSES.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('ONLINE')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  activeFilter === 'ONLINE'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                Online ({KERALA_NEET_CAMPUSES.filter((c) => c.tag === 'Online').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('TIRUNELVELI')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  activeFilter === 'TIRUNELVELI'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                Tirunelveli ({KERALA_NEET_CAMPUSES.filter((c) => c.tag === 'Tirunelveli').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('REGIONAL')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  activeFilter === 'REGIONAL'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                Regional ({KERALA_NEET_CAMPUSES.filter((c) => c.tag === 'Regional').length})
              </button>
            </div>

            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
              Type to filter
            </span>
          </div>

          {/* List of Campuses */}
          <div ref={listRef} className="max-h-72 overflow-y-auto divide-y divide-slate-100 p-1">
            {filteredCampuses.length === 0 ? (
              <div className="p-4 text-center">
                <Search className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-700">
                  No predefined branch found for "{query}"
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  You can still register with "{query}" as a custom location or clear your search to choose from our 11 official campuses.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onChange(query);
                    setIsOpen(false);
                  }}
                  className="mt-2.5 inline-flex items-center px-3 py-1.5 bg-teal-50 text-teal-800 text-xs font-bold rounded-lg border border-teal-200 hover:bg-teal-100 transition"
                >
                  Use "{query}" as Campus
                </button>
              </div>
            ) : (
              <>
                {/* 1. TOP 1: Online / Digital Learning Section */}
                {activeFilter !== 'TIRUNELVELI' && activeFilter !== 'REGIONAL' && onlineCampuses.length > 0 && (
                  <div className="py-1">
                    {onlineCampuses.map((campus) => {
                      const isSelected = value?.toLowerCase() === campus.name.toLowerCase();
                      return (
                        <div
                          key={campus.id}
                          onClick={() => handleSelectCampus(campus)}
                          className={`group px-3 py-2.5 rounded-xl cursor-pointer transition flex items-start justify-between ${
                            isSelected
                              ? 'bg-emerald-50/90 border border-emerald-300'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start space-x-2.5 min-w-0 pr-2">
                            <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-100/80 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white'
                            } transition-colors`}>
                              <Globe className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className={`text-sm font-bold ${isSelected ? 'text-emerald-950' : 'text-slate-900'}`}>
                                  {campus.name}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  {campus.code}
                                </span>
                              </div>
                              {campus.address && (
                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                  {campus.address}
                                </p>
                              )}
                            </div>
                          </div>

                          {isSelected && (
                            <span className="flex-shrink-0 mt-1 text-emerald-600">
                              <Check className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Tirunelveli Section */}
                {activeFilter !== 'REGIONAL' && activeFilter !== 'ONLINE' && tirunelveliCampuses.length > 0 && (
                  <div className="py-1">
                    <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-50/70 flex items-center justify-between rounded-md mx-1 mb-1">
                      <span className="flex items-center space-x-1.5">
                        <Building2 className="w-3 h-3 text-teal-600" />
                        <span>Tirunelveli Campuses ({tirunelveliCampuses.length})</span>
                      </span>
                      <span className="text-[9px] text-teal-600 font-bold">Main Headquarters</span>
                    </div>

                    {tirunelveliCampuses.map((campus) => {
                      const isSelected = value?.toLowerCase() === campus.name.toLowerCase();
                      return (
                        <div
                          key={campus.id}
                          onClick={() => handleSelectCampus(campus)}
                          className={`group px-3 py-2.5 rounded-xl cursor-pointer transition flex items-start justify-between ${
                            isSelected
                              ? 'bg-teal-50/90 border border-teal-200'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start space-x-2.5 min-w-0 pr-2">
                            <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${
                              isSelected
                                ? 'bg-teal-600 text-white'
                                : 'bg-slate-100 text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-700'
                            } transition-colors`}>
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className={`text-sm font-bold ${isSelected ? 'text-teal-900' : 'text-slate-900'}`}>
                                  {campus.name}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {campus.code}
                                </span>
                              </div>
                              {campus.address && (
                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                  {campus.address}
                                </p>
                              )}
                            </div>
                          </div>

                          {isSelected && (
                            <span className="flex-shrink-0 mt-1 text-teal-600">
                              <Check className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. Regional Branches Section */}
                {activeFilter !== 'TIRUNELVELI' && activeFilter !== 'ONLINE' && regionalCampuses.length > 0 && (
                  <div className="py-1">
                    <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 bg-slate-100 flex items-center justify-between rounded-md mx-1 mb-1">
                      <span className="flex items-center space-x-1.5">
                        <Navigation className="w-3 h-3 text-slate-500" />
                        <span>Regional Tamil Nadu Branches ({regionalCampuses.length})</span>
                      </span>
                      <span className="text-[9px] text-slate-500 font-bold">Direct Centers</span>
                    </div>

                    {regionalCampuses.map((campus) => {
                      const isSelected = value?.toLowerCase() === campus.name.toLowerCase();
                      return (
                        <div
                          key={campus.id}
                          onClick={() => handleSelectCampus(campus)}
                          className={`group px-3 py-2.5 rounded-xl cursor-pointer transition flex items-start justify-between ${
                            isSelected
                              ? 'bg-teal-50/90 border border-teal-200'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start space-x-2.5 min-w-0 pr-2">
                            <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${
                              isSelected
                                ? 'bg-teal-600 text-white'
                                : 'bg-slate-100 text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-700'
                            } transition-colors`}>
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className={`text-sm font-bold ${isSelected ? 'text-teal-900' : 'text-slate-900'}`}>
                                  {campus.name}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {campus.code}
                                </span>
                              </div>
                              {campus.address && (
                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                  {campus.address}
                                </p>
                              )}
                            </div>
                          </div>

                          {isSelected && (
                            <span className="flex-shrink-0 mt-1 text-teal-600">
                              <Check className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Dropdown Footer with Quick Count Info */}
          <div className="bg-slate-50 px-3 py-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Campuses in Tirunelveli (5), 8 Regional Branches + Online Course
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-teal-700 font-bold hover:underline"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
