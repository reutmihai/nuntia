import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import type { SeatingTableLayout } from '../types';

// ─── Migrate old data format ──────────────────────────────────────────────────

function migrateTable(raw: Record<string, unknown>): SeatingTableLayout {
  let guests: string[] = [];
  if (Array.isArray(raw.guests)) {
    guests = (raw.guests as (string | null)[]).filter((g): g is string => Boolean(g));
  } else if (Array.isArray(raw.assignments)) {
    guests = (raw.assignments as (string | null)[]).filter((g): g is string => Boolean(g));
  }
  return {
    id: raw.id as string,
    name: raw.name as string,
    x: raw.x as number,
    y: raw.y as number,
    shape: (raw.shape as 'round' | 'rectangular') ?? 'round',
    seats: raw.seats as number,
    guests,
  };
}

// ─── SVG components (read-only, with highlight ring) ─────────────────────────

function RoundTableSVG({ table, highlighted }: { table: SeatingTableLayout; highlighted: boolean }) {
  const TR = 22;
  const SR = 7;
  const DIST = TR + SR + 7;
  const SIZE = (DIST + SR + 5) * 2;
  const C = SIZE / 2;
  const occupied = table.guests.length;
  const label = table.name.length > 10 ? table.name.slice(0, 9) + '…' : table.name;

  return (
    <svg width={SIZE} height={SIZE} style={{ display: 'block', overflow: 'visible', pointerEvents: 'none' }}>
      {highlighted && (
        <circle cx={C} cy={C} r={TR + 10} fill="none" stroke="#e11d48" strokeWidth="2.5" strokeDasharray="6 3" opacity="0.7">
          <animateTransform attributeName="transform" attributeType="XML" type="rotate"
            from={`0 ${C} ${C}`} to={`360 ${C} ${C}`} dur="4s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx={C} cy={C} r={TR}
        fill={highlighted ? '#fff1f2' : '#fef2f2'}
        stroke={highlighted ? '#e11d48' : '#fca5a5'}
        strokeWidth={highlighted ? 2.5 : 1.5}
      />
      <text x={C} y={C - 3.5} textAnchor="middle" dominantBaseline="middle" fontSize="6.5" fill="#9f1239" fontWeight="700">
        {label}
      </text>
      <text x={C} y={C + 5} textAnchor="middle" dominantBaseline="middle" fontSize="5.5" fill="#c4b5a5">
        {occupied}/{table.seats}
      </text>
      {Array.from({ length: table.seats }).map((_, i) => {
        const angle = (2 * Math.PI * i) / table.seats - Math.PI / 2;
        const sx = C + DIST * Math.cos(angle);
        const sy = C + DIST * Math.sin(angle);
        return (
          <circle key={i} cx={sx} cy={sy} r={SR}
            fill={i < occupied ? '#fce7f3' : 'white'}
            stroke={i < occupied ? '#f9a8d4' : '#e5e7eb'}
            strokeWidth="1"
          />
        );
      })}
    </svg>
  );
}

function RectTableSVG({ table, highlighted }: { table: SeatingTableLayout; highlighted: boolean }) {
  const SR = 7;
  const PAD = SR + 7;
  const topCount = Math.ceil(table.seats / 2);
  const botCount = Math.floor(table.seats / 2);
  const cols = Math.max(topCount, botCount, 1);
  const TW = Math.max(cols * (SR * 2 + 9) + 10, 50);
  const TH = 38;
  const TOTAL_H = TH + PAD * 2;
  const occupied = table.guests.length;
  const label = table.name.length > 12 ? table.name.slice(0, 11) + '…' : table.name;
  const sx = (count: number, i: number) => (TW / (count + 1)) * (i + 1);

  return (
    <svg width={TW} height={TOTAL_H} style={{ display: 'block', overflow: 'visible', pointerEvents: 'none' }}>
      {highlighted && (
        <rect x={-8} y={PAD - 8} width={TW + 16} height={TH + 16} rx={12}
          fill="none" stroke="#e11d48" strokeWidth="2" strokeDasharray="6 3" opacity="0.7">
          <animateTransform attributeName="transform" attributeType="XML" type="rotate"
            from={`0 ${TW / 2} ${PAD + TH / 2}`} to={`360 ${TW / 2} ${PAD + TH / 2}`} dur="4s" repeatCount="indefinite" />
        </rect>
      )}
      <rect x={0} y={PAD} width={TW} height={TH} rx={6}
        fill={highlighted ? '#fff1f2' : '#fef2f2'}
        stroke={highlighted ? '#e11d48' : '#fca5a5'}
        strokeWidth={highlighted ? 2.5 : 1.5}
      />
      <text x={TW / 2} y={PAD + TH / 2 - 4} textAnchor="middle" dominantBaseline="middle" fontSize="6.5" fill="#9f1239" fontWeight="700">
        {label}
      </text>
      <text x={TW / 2} y={PAD + TH / 2 + 5} textAnchor="middle" dominantBaseline="middle" fontSize="5.5" fill="#c4b5a5">
        {occupied}/{table.seats}
      </text>
      {Array.from({ length: topCount }).map((_, i) => (
        <circle key={`t${i}`} cx={sx(topCount, i)} cy={SR} r={SR}
          fill={i < occupied ? '#fce7f3' : 'white'}
          stroke={i < occupied ? '#f9a8d4' : '#e5e7eb'} strokeWidth="1" />
      ))}
      {Array.from({ length: botCount }).map((_, i) => {
        const seatIdx = topCount + i;
        return (
          <circle key={`b${i}`} cx={sx(botCount, i)} cy={TOTAL_H - SR} r={SR}
            fill={seatIdx < occupied ? '#fce7f3' : 'white'}
            stroke={seatIdx < occupied ? '#f9a8d4' : '#e5e7eb'} strokeWidth="1" />
        );
      })}
    </svg>
  );
}

// ─── Public view ──────────────────────────────────────────────────────────────

interface Props { eventId: string; }

export default function SeatingPublicView({ eventId }: Props) {
  const [tables, setTables] = useState<SeatingTableLayout[]>([]);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedTableId, setHighlightedTableId] = useState<string | null>(null);
  const [showAllGuests, setShowAllGuests] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('confirmed_events')
      .select('client_name, date, seating_layout')
      .eq('id', eventId)
      .single()
      .then(({ data }) => {
        if (!data) { setNotFound(true); setLoading(false); return; }
        setEventName(data.client_name);
        setEventDate(data.date);
        const raw = (data.seating_layout ?? []) as Record<string, unknown>[];
        setTables(raw.map(migrateTable));
        setLoading(false);
      });
  }, [eventId]);

  const totalGuests = tables.reduce((s, t) => s + t.guests.length, 0);
  const totalSeats = tables.reduce((s, t) => s + t.seats, 0);

  const searchResults = searchQuery.trim().length >= 2
    ? tables.flatMap(t =>
        t.guests
          .filter(g => g.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(g => ({ guest: g, table: t }))
      )
    : [];

  const handleResultClick = (tableId: string) => {
    setHighlightedTableId(tableId);
    // clear highlight after 6s
    setTimeout(() => setHighlightedTableId(null), 6000);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <p className="text-xs text-stone-400 uppercase tracking-widest animate-pulse">Se încarcă planul meselor...</p>
    </div>
  );

  if (notFound) return (
    <div className="max-w-md mx-auto py-24 text-center space-y-3">
      <p className="text-stone-300 text-sm">Planul de mese nu a fost găsit sau nu este disponibil.</p>
    </div>
  );

  if (tables.length === 0) return (
    <div className="max-w-md mx-auto py-24 text-center space-y-3">
      <p className="text-[10px] uppercase tracking-widest text-stone-400">{eventName} · {eventDate}</p>
      <p className="text-stone-300 text-sm">Planul de mese nu a fost configurat încă.</p>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Page header */}
      <div className="text-center space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-rose-500 font-semibold">Aranjament Mese</p>
        <h2 className="text-2xl font-extralight uppercase tracking-widest text-stone-900">{eventName}</h2>
        <p className="text-xs text-stone-400 font-mono">{eventDate}</p>
        <p className="text-[10px] text-stone-300">
          {tables.length} mese · {totalGuests}/{totalSeats} locuri ocupate
        </p>
      </div>

      {/* Prominent search */}
      <div className="max-w-md mx-auto">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 text-base pointer-events-none select-none">⌕</span>
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setHighlightedTableId(null); }}
            placeholder="Caută-ți numele pentru a vedea unde stai..."
            autoFocus
            className="w-full bg-white border border-stone-200 rounded-2xl pl-10 pr-4 py-3.5 text-sm text-stone-800 focus:outline-none focus:border-rose-300 shadow-sm placeholder:text-stone-300 transition-colors"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setHighlightedTableId(null); searchRef.current?.focus(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500 transition-colors text-xl leading-none">
              ×
            </button>
          )}
        </div>

        {/* Search results */}
        {searchQuery.trim().length >= 2 && (
          <div className="mt-2 space-y-1">
            {searchResults.length === 0 ? (
              <p className="text-center text-xs text-stone-400 py-3 italic">Niciun rezultat pentru „{searchQuery}".</p>
            ) : (
              searchResults.map(({ guest, table }, i) => (
                <button key={i} onClick={() => handleResultClick(table.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
                    highlightedTableId === table.id
                      ? 'bg-rose-50 border-rose-200 shadow-sm'
                      : 'bg-white border-stone-100 hover:border-rose-100 hover:bg-rose-50/50'
                  }`}>
                  <span className="font-medium text-sm text-stone-800">{guest}</span>
                  <span className="text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full shrink-0 ml-3">
                    {table.name}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Two-column layout: list + canvas */}
      <div className="flex gap-4 items-start">

        {/* Guest list panel */}
        <div className="hidden lg:flex flex-col w-64 shrink-0 bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden max-h-[calc(100vh-320px)]">
          <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold">Lista invitați</p>
            <button onClick={() => setShowAllGuests(v => !v)}
              className="text-[10px] text-rose-500 hover:text-rose-700 transition-colors">
              {showAllGuests ? 'Restrânge' : 'Extinde'}
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {tables.map(table => (
              <div key={table.id}>
                <button
                  onClick={() => handleResultClick(table.id)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                    highlightedTableId === table.id ? 'bg-rose-50' : 'hover:bg-stone-50'
                  }`}
                >
                  <span className="text-xs font-semibold text-stone-700">{table.name}</span>
                  <span className="text-[10px] text-stone-400">{table.guests.length}</span>
                </button>
                {(showAllGuests || highlightedTableId === table.id) && table.guests.map((g, i) => (
                  <div key={i} className={`px-6 py-1 text-xs border-l-2 mx-3 mb-0.5 rounded-r-lg ${
                    highlightedTableId === table.id ? 'border-rose-200 text-rose-700 bg-rose-50/60' : 'border-stone-100 text-stone-500'
                  }`}>
                    {g}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Canvas — read-only */}
        <div className="flex-1 relative rounded-2xl overflow-hidden border border-stone-100 shadow-sm"
          style={{ height: 'calc(100vh - 320px)', minHeight: '480px' }}>
          <div
            className="w-full h-full relative"
            style={{
              backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              backgroundColor: '#fafafa',
            }}
          >
            {tables.map(table => (
              <div
                key={table.id}
                style={{
                  position: 'absolute',
                  left: `${table.x}%`,
                  top: `${table.y}%`,
                  transform: 'translate(-50%, -50%)',
                  cursor: 'pointer',
                  filter: highlightedTableId === table.id
                    ? 'drop-shadow(0 6px 16px rgba(225,29,72,0.4))'
                    : 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))',
                  transition: 'filter 0.3s',
                  zIndex: highlightedTableId === table.id ? 10 : 1,
                }}
                onClick={() => handleResultClick(table.id)}
              >
                {table.shape === 'round'
                  ? <RoundTableSVG table={table} highlighted={highlightedTableId === table.id} />
                  : <RectTableSVG table={table} highlighted={highlightedTableId === table.id} />
                }
              </div>
            ))}

            {highlightedTableId && (() => {
              const t = tables.find(t => t.id === highlightedTableId);
              if (!t) return null;
              return (
                <div style={{
                  position: 'absolute',
                  left: `${t.x}%`,
                  top: `calc(${t.y}% + 52px)`,
                  transform: 'translateX(-50%)',
                  zIndex: 20,
                  pointerEvents: 'none',
                }}>
                  <div className="bg-white border border-rose-200 shadow-lg rounded-xl px-3 py-2 text-center min-w-[120px]">
                    <p className="text-xs font-semibold text-rose-700">{t.name}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">{t.guests.length} invitați</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Mobile: guest list (accordion) */}
      <div className="lg:hidden space-y-2">
        <button onClick={() => setShowAllGuests(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-stone-100 rounded-2xl shadow-sm text-sm font-medium text-stone-700">
          <span>Lista completă a invitaților</span>
          <span className="text-stone-400 text-lg leading-none">{showAllGuests ? '↑' : '↓'}</span>
        </button>
        {showAllGuests && (
          <div className="bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden">
            {tables.map(table => (
              <div key={table.id} className="border-b border-stone-50 last:border-0">
                <div className="flex items-center justify-between px-4 py-3">
                  <p className="text-xs font-semibold text-stone-700">{table.name}</p>
                  <span className="text-[10px] text-stone-400">{table.guests.length} pers.</span>
                </div>
                <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                  {table.guests.map((g, i) => (
                    <span key={i} className="bg-rose-50 border border-rose-100 text-rose-700 px-2.5 py-1 rounded-full text-xs">{g}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-center text-[10px] text-stone-300 uppercase tracking-widest pb-4">
        Ballroom · Suceava
      </p>
    </div>
  );
}
