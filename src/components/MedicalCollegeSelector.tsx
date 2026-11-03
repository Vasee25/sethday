import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  X,
  Check,
  Building2,
  MapPin,
  ArrowLeft,
  Loader2,
  ChevronDown,
  Sparkles,
  HelpCircle,
  GraduationCap,
  RotateCcw,
} from 'lucide-react';
import { MedicalCollegeItem } from '../types.ts';

export interface SelectedCollegeValue {
  id?: number;
  name: string;
  city?: string;
  district?: string;
  state?: string;
  type?: string;
}

interface MedicalCollegeSelectorProps {
  value?: SelectedCollegeValue;
  onChange: (college: SelectedCollegeValue) => void;
  error?: string;
}

// Accessible text highlighter helper
const HighlightMatch: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query || !query.trim() || !text) return <span>{text}</span>;

  const trimmed = query.trim().toLowerCase();
  const index = text.toLowerCase().indexOf(trimmed);

  if (index === -1) return <span>{text}</span>;

  const before = text.substring(0, index);
  const match = text.substring(index, index + trimmed.length);
  const after = text.substring(index + trimmed.length);

  return (
    <span>
      {before}
      <mark className="bg-amber-200/80 text-slate-900 rounded-xs px-0.5 font-semibold">
        {match}
      </mark>
      <HighlightMatch text={after} query={query} />
    </span>
  );
};

export const MedicalCollegeSelector: React.FC<MedicalCollegeSelectorProps> = ({
  value,
  onChange,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>('ALL');
  
  // Data state
  const [colleges, setColleges] = useState<MedicalCollegeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Debounce search input (220ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
      setPage(1);
    }, 220);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch colleges from API when modal opens or search/state/page changes
  const fetchColleges = useCallback(async (isLoadMore = false) => {
    setLoading(true);
    try {
      const targetPage = isLoadMore ? page + 1 : 1;
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: '35',
      });
      if (debouncedQuery) {
        params.set('search', debouncedQuery);
      }
      if (selectedState && selectedState !== 'ALL') {
        params.set('state', selectedState);
      }

      const res = await fetch(`/api/colleges?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      const newColleges = data.colleges || [];
      if (isLoadMore) {
        setColleges((prev) => [...prev, ...newColleges]);
        setPage(targetPage);
      } else {
        setColleges(newColleges);
        setPage(1);
      }

      setTotalCount(data.total || 0);
      setHasMore(targetPage < (data.totalPages || 1));
      setDidYouMean(data.didYouMean || null);
      setDetectedLocation(data.detectedLocation || null);
    } catch (err) {
      console.error('Error fetching colleges:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, selectedState, page]);

  // Trigger search on debounced query or filter change
  useEffect(() => {
    if (isOpen) {
      fetchColleges(false);
    }
  }, [isOpen, debouncedQuery, selectedState]);

  // Focus search input automatically when sheet opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Prevent background scrolling when modal is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSelect = (college: MedicalCollegeItem) => {
    onChange({
      id: college.id,
      name: college.name,
      city: college.city,
      district: college.district || college.city,
      state: college.state,
      type: college.type || undefined,
    });
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ name: '', state: '', city: '' });
  };

  // Group results if location search detected
  const { priorityList, otherList } = useMemo(() => {
    if (!debouncedQuery || colleges.length === 0) {
      return { priorityList: [], otherList: colleges };
    }

    const locLower = (detectedLocation || debouncedQuery).toLowerCase();
    const locMatches: MedicalCollegeItem[] = [];
    const others: MedicalCollegeItem[] = [];

    for (const c of colleges) {
      const cityMatches = c.city && c.city.toLowerCase().includes(locLower);
      const districtMatches = c.district && c.district.toLowerCase().includes(locLower);
      const stateMatches = c.state && c.state.toLowerCase() === locLower;

      if (cityMatches || districtMatches || stateMatches) {
        locMatches.push(c);
      } else {
        others.push(c);
      }
    }

    if (locMatches.length > 0 && others.length > 0) {
      return { priorityList: locMatches, otherList: others };
    }

    return { priorityList: [], otherList: colleges };
  }, [colleges, debouncedQuery, detectedLocation]);

  // Quick filter chips & full states list
  const quickFilters = [
    'ALL',
    'Tamil Nadu',
    'Kerala',
    'Karnataka',
    'Andhra Pradesh',
    'Telangana',
    'Delhi',
    'Maharashtra',
    'Uttar Pradesh',
    'West Bengal',
    'Gujarat',
    'Rajasthan',
    'Bihar',
    'Madhya Pradesh',
    'Assam',
    'Odisha',
    'Punjab',
    'Haryana',
    'Puducherry',
  ];

  const allStates = [
    'ALL',
    'Andaman and Nicobar Islands',
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chandigarh',
    'Chhattisgarh',
    'Dadra and Nagar Haveli',
    'Delhi',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jammu and Kashmir',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Odisha',
    'Puducherry',
    'Punjab',
    'Rajasthan',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal',
  ];

  return (
    <div className="space-y-1.5">
      {/* Label */}
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
        Medical College <span className="text-red-500">*</span>
      </label>

      {/* Trigger Field */}
      {!value?.name ? (
        // Unselected Default Appearance
        <button
          type="button"
          id="college-selector-trigger"
          onClick={() => setIsOpen(true)}
          className={`w-full min-h-[52px] px-3.5 py-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition text-left bg-white shadow-2xs hover:border-teal-500/80 active:scale-[0.99] ${
            error
              ? 'border-red-400 bg-red-50/20'
              : 'border-slate-300 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200/70 flex items-center justify-center text-teal-700 flex-shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-slate-500 truncate">
              Search or select medical college...
            </span>
          </div>

          {/* Clearly visible Chevron Down button on the right */}
          <div className="flex items-center space-x-1 pl-2 text-slate-500">
            <ChevronDown className="w-5 h-5 text-slate-400 transition group-hover:text-slate-600" />
          </div>
        </button>
      ) : (
        // Selected College Appearance
        <div className="w-full min-h-[56px] px-4 py-3 rounded-xl border-2 border-teal-600/70 bg-teal-50/25 flex items-center justify-between shadow-2xs">
          <div className="flex items-start space-x-3 min-w-0 flex-1 pr-3">
            <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 leading-snug">
                {value.name}
              </p>
              <p className="text-xs text-teal-800 font-medium flex items-center space-x-1 mt-0.5">
                <MapPin className="w-3 h-3 text-teal-600 flex-shrink-0" />
                <span className="truncate">
                  {value.city ? `${value.city}, ` : ''}{value.state || 'India'}
                </span>
                {value.type && (
                  <span className="inline-block px-1.5 py-0.2 text-[10px] uppercase font-bold tracking-wide rounded bg-teal-100/80 text-teal-900 ml-1">
                    {value.type}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Change Action Button */}
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <button
              type="button"
              id="change-college-button"
              onClick={() => setIsOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-white border border-teal-300 text-teal-700 text-xs font-bold hover:bg-teal-50 active:scale-95 transition shadow-2xs"
            >
              Change
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 hover:bg-teal-100/50 rounded-lg text-slate-400 hover:text-slate-600 transition"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs font-semibold text-red-600 px-1">{error}</p>}

      {/* =========================================================================
          SMART MOBILE SEARCH & DROPDOWN MODAL
          ========================================================================= */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full h-full sm:h-[680px] sm:max-w-xl bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            
            {/* Sheet Header */}
            <div className="px-4 py-3.5 bg-slate-900 text-white flex items-center justify-between flex-shrink-0 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  id="close-college-selector"
                  onClick={() => setIsOpen(false)}
                  className="p-2 -ml-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="text-base font-bold text-white font-display flex items-center space-x-1.5">
                    <span>Select Medical College</span>
                  </h3>
                  <p className="text-[11px] text-teal-400 font-medium">
                    {totalCount > 0 ? `${totalCount} colleges available` : 'Accredited Medical Colleges across India'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sticky Search Input Bar */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2.5 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search college, city, district or state..."
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-2xs"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* State Filter Chips & Dropdown */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                {/* State selector dropdown */}
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-slate-100 text-slate-800 border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500 flex-shrink-0 cursor-pointer"
                  title="Filter by any State or Union Territory"
                >
                  <option value="ALL">All States & UTs (India)</option>
                  {allStates.filter((s) => s !== 'ALL').map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                {/* Quick Dental shortcut button */}
                <button
                  type="button"
                  onClick={() => {
                    if (searchQuery.toLowerCase().includes('dental')) {
                      setSearchQuery('');
                    } else {
                      setSearchQuery('Dental');
                    }
                  }}
                  className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition text-[11px] flex-shrink-0 ${
                    searchQuery.toLowerCase().includes('dental')
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  🦷 Dental (B.D.S.)
                </button>

                {quickFilters.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedState(st)}
                    className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition text-[11px] flex-shrink-0 ${
                      selectedState === st
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Content Area */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white"
            >
              {/* Loading indicator */}
              {loading && colleges.length === 0 && (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-7 h-7 text-teal-600 animate-spin" />
                  <p className="text-xs font-semibold text-slate-600">Searching medical colleges database...</p>
                </div>
              )}

              {/* Priority Location Group (e.g. "TIRUNELVELI" when searched) */}
              {priorityList.length > 0 && (
                <div>
                  <div className="sticky top-0 z-10 px-4 py-2 bg-teal-50/90 backdrop-blur-xs border-y border-teal-200 flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-900 flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-teal-700" />
                      <span>{detectedLocation ? detectedLocation.toUpperCase() : 'MATCHING LOCATION'}</span>
                    </span>
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-200/70 px-2 py-0.5 rounded-full">
                      {priorityList.length} colleges
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {priorityList.map((college) => renderCollegeItem(college))}
                  </div>
                </div>
              )}

              {/* Other Results / Main List */}
              {otherList.length > 0 && (
                <div>
                  {priorityList.length > 0 && (
                    <div className="sticky top-0 z-10 px-4 py-1.5 bg-slate-100/90 backdrop-blur-xs border-y border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                      Other Matching Results
                    </div>
                  )}

                  <div className="divide-y divide-slate-100">
                    {otherList.map((college) => renderCollegeItem(college))}
                  </div>
                </div>
              )}

              {/* No Results Found */}
              {!loading && colleges.length === 0 && (
                <div className="p-8 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 mx-auto flex items-center justify-center text-amber-600">
                    <HelpCircle className="w-7 h-7" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-slate-900 font-display">
                      No medical colleges found
                    </h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Try searching by college name, city, district, or state.
                    </p>
                  </div>

                  {/* Typo Correction / Did You Mean Suggestion */}
                  {didYouMean && (
                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-left max-w-sm mx-auto flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-teal-800 font-medium">Did you mean:</p>
                        <p className="text-sm font-bold text-teal-950">{didYouMean}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSearchQuery(didYouMean)}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-2xs transition active:scale-95"
                      >
                        Search "{didYouMean}"
                      </button>
                    </div>
                  )}

                  {selectedState !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setSelectedState('ALL')}
                      className="text-xs text-teal-700 hover:underline font-bold inline-flex items-center space-x-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Clear "{selectedState}" state filter</span>
                    </button>
                  )}
                </div>
              )}

              {/* Load More Button for Pagination */}
              {hasMore && !loading && (
                <div className="p-4 text-center border-t border-slate-100 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => fetchColleges(true)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-white border border-slate-300 hover:border-teal-500 text-slate-700 text-xs font-bold rounded-xl shadow-2xs hover:bg-slate-50 active:scale-95 transition"
                  >
                    Load More Medical Colleges...
                  </button>
                </div>
              )}

              {/* Infinite load footer spinner */}
              {loading && colleges.length > 0 && (
                <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                  <span>Loading more institutions...</span>
                </div>
              )}
            </div>

            {/* Sheet Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-center flex items-center justify-between flex-shrink-0 text-xs text-slate-500 px-4">
              <span className="text-[11px]">
                Showing <strong className="text-slate-800">{colleges.length}</strong> of{' '}
                <strong className="text-slate-800">{totalCount}</strong> accredited colleges
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 py-1 px-2.5 rounded-lg hover:bg-slate-200/60 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper render item
  function renderCollegeItem(college: MedicalCollegeItem) {
    const isSelected = value?.id === college.id || value?.name === college.name;

    return (
      <button
        key={college.id}
        type="button"
        onClick={() => handleSelect(college)}
        className={`w-full text-left p-3.5 hover:bg-teal-50/40 active:bg-teal-50 transition flex items-start justify-between space-x-3 group ${
          isSelected ? 'bg-teal-50/70' : ''
        }`}
      >
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition ${
              isSelected
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 group-hover:bg-teal-100 group-hover:text-teal-800'
            }`}
          >
            {isSelected ? (
              <Check className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <GraduationCap className="w-4 h-4" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h5 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-teal-900 transition">
              <HighlightMatch text={college.name} query={searchQuery} />
            </h5>

            <p className="text-xs text-slate-600 font-medium flex items-center space-x-1 mt-0.5">
              <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span>
                <HighlightMatch text={college.city} query={searchQuery} />
                {college.district && college.district !== college.city && (
                  <span className="text-slate-400"> ({college.district})</span>
                )}
                {', '}
                <HighlightMatch text={college.state} query={searchQuery} />
              </span>
            </p>

            {college.type && (
              <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 group-hover:bg-teal-100 group-hover:text-teal-800">
                {college.type}
              </span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 self-center pl-2">
          {isSelected ? (
            <span className="text-[11px] font-extrabold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md">
              Selected
            </span>
          ) : (
            <span className="text-xs font-bold text-teal-600 opacity-0 group-hover:opacity-100 transition">
              Select →
            </span>
          )}
        </div>
      </button>
    );
  }
};
