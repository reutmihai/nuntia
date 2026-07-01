import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { ConfirmedEvent, SeatingTableLayout } from '../types';

// ─── Migrate old data format ──────────────────────────────────────────────────

function migrateTable(raw: Record<string, unknown>): SeatingTableLayout {
  let guests: string[] = [];
  if (Array.isArray(raw.guests))
    guests = (raw.guests as (string | null)[]).filter((g): g is string => Boolean(g));
  else if (Array.isArray(raw.assignments))
    guests = (raw.assignments as (string | null)[]).filter((g): g is string => Boolean(g));
  return {
    id: raw.id as string, name: raw.name as string,
    x: raw.x as number, y: raw.y as number,
    shape: (raw.shape as 'round' | 'rectangular') ?? 'round',
    seats: raw.seats as number, guests,
  };
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

// ─── SVG: Masă rotundă ────────────────────────────────────────────────────────

function RoundTableSVG({ table, selected }: { table: SeatingTableLayout; selected: boolean }) {
  const TR = 22, SR = 7, DIST = TR + SR + 7;
  const SIZE = (DIST + SR + 5) * 2, C = SIZE / 2;
  const occupied = table.guests.length;
  const label = table.name.length > 10 ? table.name.slice(0, 9) + '…' : table.name;
  return (
    <svg width={SIZE} height={SIZE} style={{ display: 'block', overflow: 'visible', pointerEvents: 'none' }}>
      <circle cx={C} cy={C} r={TR} fill="#fef2f2"
        stroke={selected ? '#e11d48' : '#fca5a5'} strokeWidth={selected ? 2.5 : 1.5} />
      <text x={C} y={C - 3.5} textAnchor="middle" dominantBaseline="middle" fontSize="6.5" fill="#9f1239" fontWeight="700">{label}</text>
      <text x={C} y={C + 5} textAnchor="middle" dominantBaseline="middle" fontSize="5.5" fill="#c4b5a5">{occupied}/{table.seats}</text>
      {Array.from({ length: table.seats }).map((_, i) => {
        const angle = (2 * Math.PI * i) / table.seats - Math.PI / 2;
        return <circle key={i} cx={C + DIST * Math.cos(angle)} cy={C + DIST * Math.sin(angle)} r={SR}
          fill={i < occupied ? '#fce7f3' : 'white'} stroke={i < occupied ? '#f9a8d4' : '#e5e7eb'} strokeWidth="1" />;
      })}
    </svg>
  );
}

// ─── SVG: Masă dreptunghiulară ────────────────────────────────────────────────

function RectTableSVG({ table, selected }: { table: SeatingTableLayout; selected: boolean }) {
  const SR = 7, PAD = SR + 7, topCount = Math.ceil(table.seats / 2), botCount = Math.floor(table.seats / 2);
  const TW = Math.max(Math.max(topCount, botCount, 1) * (SR * 2 + 9) + 10, 50);
  const TH = 38, TOTAL_H = TH + PAD * 2;
  const occupied = table.guests.length;
  const label = table.name.length > 12 ? table.name.slice(0, 11) + '…' : table.name;
  const sx = (count: number, i: number) => (TW / (count + 1)) * (i + 1);
  return (
    <svg width={TW} height={TOTAL_H} style={{ display: 'block', overflow: 'visible', pointerEvents: 'none' }}>
      <rect x={0} y={PAD} width={TW} height={TH} rx={6} fill="#fef2f2"
        stroke={selected ? '#e11d48' : '#fca5a5'} strokeWidth={selected ? 2.5 : 1.5} />
      <text x={TW / 2} y={PAD + TH / 2 - 4} textAnchor="middle" dominantBaseline="middle" fontSize="6.5" fill="#9f1239" fontWeight="700">{label}</text>
      <text x={TW / 2} y={PAD + TH / 2 + 5} textAnchor="middle" dominantBaseline="middle" fontSize="5.5" fill="#c4b5a5">{occupied}/{table.seats}</text>
      {Array.from({ length: topCount }).map((_, i) => (
        <circle key={`t${i}`} cx={sx(topCount, i)} cy={SR} r={SR}
          fill={i < occupied ? '#fce7f3' : 'white'} stroke={i < occupied ? '#f9a8d4' : '#e5e7eb'} strokeWidth="1" />
      ))}
      {Array.from({ length: botCount }).map((_, i) => {
        const idx = topCount + i;
        return <circle key={`b${i}`} cx={sx(botCount, i)} cy={TOTAL_H - SR} r={SR}
          fill={idx < occupied ? '#fce7f3' : 'white'} stroke={idx < occupied ? '#f9a8d4' : '#e5e7eb'} strokeWidth="1" />;
      })}
    </svg>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

interface Props { event: ConfirmedEvent; onClose: () => void; }
interface GuestEntry { guest: string; table: SeatingTableLayout; }

// Drag state lives entirely in refs — zero React re-renders during drag
interface DragRef {
  id: string;
  offsetX: number; offsetY: number;
  currentX: number; currentY: number;
  hasMoved: boolean;
}

export default function SeatingDashboard({ event, onClose }: Props) {
  const [tables, setTables] = useState<SeatingTableLayout[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [guestInput, setGuestInput] = useState('');
  const [newShape, setNewShape] = useState<'round' | 'rectangular'>('round');
  const [newSeats, setNewSeats] = useState(10);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [guestSearch, setGuestSearch] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<null | 'add' | 'search' | 'rename'>(null);

  // Imperative drag — no state updates until pointerup
  const draggingRef = useRef<DragRef | null>(null);
  // DOM element refs for direct style mutation during drag
  const tableElems = useRef<Map<string, HTMLDivElement>>(new Map());
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('confirmed_events').select('seating_layout').eq('id', event.id).single()
      .then(({ data }) => {
        const raw = (data?.seating_layout ?? []) as Record<string, unknown>[];
        setTables(raw.map(migrateTable));
      });
  }, [event.id]);

  // ─── Drag: all refs, zero React re-renders ────────────────────────────────

  const handleTablePointerDown = useCallback((e: React.PointerEvent, table: SeatingTableLayout) => {
    e.stopPropagation();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * 100;
    const cy = ((e.clientY - rect.top) / rect.height) * 100;
    draggingRef.current = {
      id: table.id,
      offsetX: cx - table.x, offsetY: cy - table.y,
      currentX: table.x, currentY: table.y,
      hasMoved: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handleCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    const d = draggingRef.current;
    if (!d || !canvasRef.current) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clamp(((e.clientX - rect.left) / rect.width) * 100 - d.offsetX, 2, 98);
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100 - d.offsetY, 2, 98);
    if (Math.abs(x - d.currentX) > 0.05 || Math.abs(y - d.currentY) > 0.05) d.hasMoved = true;
    d.currentX = x; d.currentY = y;
    // Direct DOM mutation — no React reconciliation
    const el = tableElems.current.get(d.id);
    if (el) { el.style.left = `${x}%`; el.style.top = `${y}%`; }
  }, []);

  const handleCanvasPointerUp = useCallback(() => {
    const d = draggingRef.current;
    if (!d) return;
    draggingRef.current = null;
    if (d.hasMoved) {
      setTables(prev => prev.map(t => t.id === d.id ? { ...t, x: d.currentX, y: d.currentY } : t));
    }
  }, []);

  // ─── Table click: tap once = select, tap again = open editor (mobile-friendly) ──

  const handleTableClick = useCallback((e: React.MouseEvent, table: SeatingTableLayout) => {
    e.stopPropagation();
    if (draggingRef.current?.hasMoved) return; // ignore click after drag
    setMobileSheet(null);
    if (selectedId === table.id) {
      // Second tap on already-selected table → open guest editor
      setEditingTableId(table.id);
      setGuestInput('');
    } else {
      setSelectedId(table.id);
    }
  }, [selectedId]);

  const handleTableDoubleClick = useCallback((e: React.MouseEvent, table: SeatingTableLayout) => {
    e.stopPropagation();
    setEditingTableId(table.id);
    setGuestInput('');
    setMobileSheet(null);
  }, []);

  // ─── Guest editor ──────────────────────────────────────────────────────────

  const addGuests = (tableId: string) => {
    const names = guestInput.split(/[\n,;]/).map(n => n.trim()).filter(Boolean);
    if (!names.length) return;
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, guests: [...t.guests, ...names] } : t));
    setGuestInput('');
  };

  const removeGuest = (tableId: string, idx: number) =>
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, guests: t.guests.filter((_, i) => i !== idx) } : t));

  // ─── Table management ──────────────────────────────────────────────────────

  const addTable = () => {
    const id = Date.now().toString();
    const col = tables.length % 6, row = Math.floor(tables.length / 6);
    setTables(prev => [...prev, {
      id, name: `Masa ${prev.length + 1}`,
      x: 10 + col * 15, y: 12 + row * 22,
      shape: newShape, seats: newSeats, guests: [],
    }]);
    setSelectedId(id);
    setMobileSheet(null);
  };

  const deleteSelected = () => {
    setTables(prev => prev.filter(t => t.id !== selectedId));
    setSelectedId(null); setMobileSheet(null);
  };

  const renameSelected = (name: string) =>
    setTables(prev => prev.map(t => t.id === selectedId ? { ...t, name } : t));

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('confirmed_events').update({ seating_layout: tables }).eq('id', event.id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const copyPublicLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?mese=${event.id}`;
    navigator.clipboard.writeText(url).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2500); });
  };

  const guestSearchResults: GuestEntry[] = guestSearch.trim().length >= 2
    ? tables.flatMap(t =>
        t.guests.filter(g => g.toLowerCase().includes(guestSearch.toLowerCase())).map(g => ({ guest: g, table: t })))
    : [];

  const selectedTable = tables.find(t => t.id === selectedId) ?? null;
  const editingTable = tables.find(t => t.id === editingTableId) ?? null;
  const totalGuests = tables.reduce((s, t) => s + t.guests.length, 0);
  const totalSeats = tables.reduce((s, t) => s + t.seats, 0);

  // ─── Shared sub-forms (used in desktop sidebar + mobile sheets) ───────────

  const AddTableForm = () => (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {(['round', 'rectangular'] as const).map(shape => (
          <button key={shape} onClick={() => setNewShape(shape)}
            className={`py-2.5 rounded-xl border text-[11px] uppercase tracking-wider font-semibold transition-colors ${
              newShape === shape ? 'bg-rose-50 border-rose-200 text-rose-700' : 'border-stone-200 text-stone-400 hover:border-stone-300'
            }`}>
            {shape === 'round' ? '⭕ Rotundă' : '▬ Rect.'}
          </button>
        ))}
      </div>
      <div>
        <div className="flex justify-between text-[10px] text-stone-400 mb-1">
          <span className="uppercase tracking-wider">Scaune</span>
          <span className="font-semibold text-stone-700">{newSeats}</span>
        </div>
        <input type="range" min={2} max={30} value={newSeats}
          onChange={e => setNewSeats(Number(e.target.value))} className="w-full accent-rose-600" />
        <div className="flex justify-between text-[9px] text-stone-300 mt-0.5"><span>2</span><span>30</span></div>
      </div>
      <button onClick={addTable}
        className="w-full bg-rose-700 hover:bg-rose-800 text-white py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors">
        + Adaugă masa
      </button>
    </div>
  );

  const SearchForm = () => (
    <div className="p-4 space-y-2">
      <div className="relative">
        <input type="text" autoFocus value={guestSearch} onChange={e => setGuestSearch(e.target.value)}
          placeholder="Caută invitat după nume..."
          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-rose-300 placeholder:text-stone-300 pr-8" />
        {guestSearch && (
          <button onClick={() => setGuestSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500 text-xl leading-none">×</button>
        )}
      </div>
      {guestSearch.trim().length >= 2 && (
        <div className="space-y-1 max-h-52 overflow-y-auto">
          {guestSearchResults.length === 0
            ? <p className="text-[11px] text-stone-300 italic text-center py-3">Niciun rezultat.</p>
            : guestSearchResults.map(({ guest, table }, i) => (
              <button key={i} onClick={() => { setSelectedId(table.id); setGuestSearch(''); setMobileSheet(null); }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors text-left">
                <span className="text-sm text-stone-700 truncate">{guest}</span>
                <span className="text-[11px] text-rose-500 font-semibold shrink-0 ml-2 bg-rose-50 px-2 py-0.5 rounded-full">{table.name}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-stone-100 flex flex-col" onClick={() => { setSelectedId(null); setMobileSheet(null); }}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 bg-white border-b border-stone-200 shadow-sm shrink-0" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-stone-200 text-stone-400 hover:text-stone-700 hover:border-stone-300 transition-colors text-lg shrink-0">
            ←
          </button>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-stone-400 hidden sm:block">Plan aranjament mese</p>
            <p className="text-sm font-semibold text-stone-800 truncate">
              {event.clientName} <span className="text-stone-400 font-normal hidden sm:inline">· {event.date}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="text-xs text-stone-400 hidden lg:block">{tables.length} mese · {totalGuests}/{totalSeats} locuri</span>
          <button onClick={copyPublicLink}
            className="hidden sm:flex items-center gap-1.5 border border-stone-200 hover:border-rose-200 text-stone-500 hover:text-rose-600 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap">
            {linkCopied ? '✓ Copiat!' : '⤢ Link public'}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="bg-rose-700 hover:bg-rose-800 text-white px-3 sm:px-5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-60 whitespace-nowrap">
            {saving ? '...' : saved ? '✓ Salvat' : 'Salvează'}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Desktop sidebar */}
        <div className="hidden md:flex w-56 bg-white border-r border-stone-200 flex-col shrink-0 overflow-y-auto" onClick={e => e.stopPropagation()}>

          <div className="p-3 pb-0 border-b border-stone-100">
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold px-1 pb-3">Adaugă masă</p>
            <AddTableForm />
          </div>

          {selectedTable ? (
            <div className="p-4 space-y-3 border-b border-stone-100">
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold">Masă selectată</p>
              <input type="text" value={selectedTable.name} onChange={e => renameSelected(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-rose-300 transition-colors" />
              <div className="flex justify-between text-xs text-stone-400">
                <span>{selectedTable.guests.length} invitați</span>
                <span>{selectedTable.seats} scaune</span>
              </div>
              <button onClick={() => { setEditingTableId(selectedTable.id); setGuestInput(''); }}
                className="w-full border border-rose-200 text-rose-600 hover:bg-rose-50 py-2 rounded-xl text-xs uppercase tracking-wider transition-colors">
                Editează invitați
              </button>
              <button onClick={deleteSelected}
                className="w-full border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 py-2 rounded-xl text-xs uppercase tracking-wider transition-colors">
                Șterge masa
              </button>
            </div>
          ) : (
            <div className="p-4 text-center border-b border-stone-100">
              <p className="text-[11px] text-stone-300 italic">Click pe masă pentru opțiuni.</p>
              <p className="text-[11px] text-stone-300 italic mt-1">Dublu-click pentru invitați.</p>
            </div>
          )}

          <div className="border-b border-stone-100">
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold px-4 pt-4 pb-1">Caută invitat</p>
            <SearchForm />
          </div>

          {tables.length > 0 && (
            <div className="p-3 space-y-1 flex-1 overflow-y-auto">
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold px-1 mb-2">Toate mesele ({tables.length})</p>
              {tables.map(t => (
                <button key={t.id}
                  onClick={e => { e.stopPropagation(); setSelectedId(t.id); }}
                  onDoubleClick={e => { e.stopPropagation(); setEditingTableId(t.id); setGuestInput(''); }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    selectedId === t.id ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'hover:bg-stone-50 text-stone-600'
                  }`}>
                  <span className="font-medium truncate">{t.name}</span>
                  <span className="text-[10px] text-stone-400 shrink-0 ml-2">{t.guests.length}/{t.seats}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Canvas: touch-action none is CRITICAL for mobile drag ── */}
        <div className="flex-1 relative overflow-hidden" onClick={() => { setSelectedId(null); setMobileSheet(null); }}>
          <div
            ref={canvasRef}
            className="w-full h-full relative"
            style={{
              backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              touchAction: 'none',  // prevent browser scroll during touch drag
              userSelect: 'none',
            }}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onClick={() => { setSelectedId(null); setMobileSheet(null); }}
          >
            {tables.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center space-y-2 px-8">
                  <p className="text-stone-300 text-sm">Nicio masă adăugată</p>
                  <p className="text-stone-200 text-xs hidden md:block">Folosește panoul stâng</p>
                  <p className="text-stone-200 text-xs md:hidden">Apasă <span className="font-semibold">+ Masă</span> de mai jos</p>
                </div>
              </div>
            )}

            {tables.map(table => (
              <div
                key={table.id}
                ref={el => { if (el) tableElems.current.set(table.id, el); else tableElems.current.delete(table.id); }}
                style={{
                  position: 'absolute',
                  left: `${table.x}%`,
                  top: `${table.y}%`,
                  transform: 'translate(-50%, -50%)',
                  cursor: 'grab',
                  zIndex: selectedId === table.id ? 10 : 1,
                  filter: selectedId === table.id
                    ? 'drop-shadow(0 4px 14px rgba(225,29,72,0.4))'
                    : 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))',
                  willChange: 'left, top',
                  touchAction: 'none',
                }}
                onPointerDown={e => handleTablePointerDown(e, table)}
                onClick={e => handleTableClick(e, table)}
                onDoubleClick={e => handleTableDoubleClick(e, table)}
              >
                {table.shape === 'round'
                  ? <RoundTableSVG table={table} selected={selectedId === table.id} />
                  : <RectTableSVG table={table} selected={selectedId === table.id} />
                }
              </div>
            ))}
          </div>

          {/* Guest editor modal */}
          {editingTable && (
            <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/25" onClick={() => setEditingTableId(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-[calc(100vw-1.5rem)] sm:w-80 flex flex-col max-h-[85vh] sm:max-h-[72vh] border border-stone-100" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                  <div>
                    <p className="font-semibold text-stone-900">{editingTable.name}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">{editingTable.guests.length} invitați · {editingTable.seats} scaune</p>
                  </div>
                  <button onClick={() => setEditingTableId(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full border border-stone-200 text-stone-400 hover:text-stone-700 transition-colors text-lg">×</button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
                  {editingTable.guests.length === 0
                    ? <p className="text-[11px] text-stone-300 italic text-center py-4">Niciun invitat adăugat.</p>
                    : editingTable.guests.map((guest, i) => (
                      <div key={i} className="flex items-center justify-between bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                        <span className="text-sm text-rose-800">{guest}</span>
                        <button onClick={() => removeGuest(editingTable.id, i)}
                          className="text-rose-300 hover:text-red-500 transition-colors text-lg leading-none ml-2 shrink-0">×</button>
                      </div>
                    ))
                  }
                </div>
                <div className="px-4 pb-4 pt-3 border-t border-stone-100 space-y-2">
                  <p className="text-[10px] text-stone-400 uppercase tracking-wider">Adaugă (Enter, virgulă sau ; pentru mai mulți)</p>
                  <textarea value={guestInput} onChange={e => setGuestInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addGuests(editingTable.id); } }}
                    placeholder={'Ion Popescu\nMaria Ionescu\n...'} rows={3} autoFocus
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-rose-300 placeholder:text-stone-300 resize-none" />
                  <button onClick={() => addGuests(editingTable.id)} disabled={!guestInput.trim()}
                    className="w-full bg-rose-700 hover:bg-rose-800 text-white py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-40">
                    Adaugă
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ MOBILE: slide-up sheets + bottom action bar (md:hidden) ══ */}

      {/* Sheet backdrop */}
      {mobileSheet && (
        <div className="md:hidden absolute inset-0 bg-black/20 z-30" onClick={() => setMobileSheet(null)} />
      )}

      {/* Slide-up sheet */}
      {mobileSheet && (
        <div className="md:hidden absolute bottom-[72px] left-0 right-0 z-40 bg-white rounded-t-2xl shadow-2xl border-t border-stone-100 overflow-y-auto max-h-[65vh]"
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100">
            <p className="text-[10px] uppercase tracking-widest text-stone-500 font-semibold">
              {mobileSheet === 'add' ? 'Adaugă masă nouă' : mobileSheet === 'search' ? 'Caută invitat' : 'Redenumește masa'}
            </p>
            <button onClick={() => setMobileSheet(null)}
              className="w-7 h-7 flex items-center justify-center rounded-full border border-stone-200 text-stone-400 text-lg leading-none">×</button>
          </div>
          {mobileSheet === 'add' && <AddTableForm />}
          {mobileSheet === 'search' && <SearchForm />}
          {mobileSheet === 'rename' && selectedTable && (
            <div className="p-4 space-y-3">
              <input type="text" autoFocus value={selectedTable.name} onChange={e => renameSelected(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 focus:outline-none focus:border-rose-300" />
              <button onClick={() => setMobileSheet(null)}
                className="w-full bg-rose-700 text-white py-3 rounded-xl text-xs font-semibold uppercase tracking-wider">Gata</button>
            </div>
          )}
        </div>
      )}

      {/* Mobile bottom action bar */}
      <div className="md:hidden shrink-0 bg-white border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.07)] z-30" onClick={e => e.stopPropagation()}>
        {selectedTable ? (
          <div className="flex items-center gap-2 px-4 py-3">
            <div className="flex-1 min-w-0 mr-1">
              <p className="text-[9px] text-stone-400 uppercase tracking-wider">Selectat</p>
              <p className="text-sm font-semibold text-stone-800 truncate">{selectedTable.name}</p>
            </div>
            <button onClick={() => { setEditingTableId(selectedTable.id); setGuestInput(''); }}
              className="bg-rose-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
              Invitați
            </button>
            <button onClick={() => setMobileSheet(m => m === 'rename' ? null : 'rename')}
              className="w-11 h-10 border border-stone-200 text-stone-500 rounded-xl flex items-center justify-center text-sm" title="Redenumește">
              ✏️
            </button>
            <button onClick={deleteSelected}
              className="w-11 h-10 border border-red-100 text-red-400 rounded-xl flex items-center justify-center text-base" title="Șterge">
              🗑
            </button>
            <button onClick={() => { setSelectedId(null); setMobileSheet(null); }}
              className="w-11 h-10 border border-stone-200 text-stone-400 rounded-xl flex items-center justify-center text-xl leading-none">
              ×
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-3">
            <button onClick={() => setMobileSheet(m => m === 'add' ? null : 'add')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors ${
                mobileSheet === 'add' ? 'bg-rose-800 text-white' : 'bg-rose-700 hover:bg-rose-800 text-white'
              }`}>
              + Masă
            </button>
            <button onClick={() => setMobileSheet(m => m === 'search' ? null : 'search')}
              className={`w-11 h-10 border rounded-xl flex items-center justify-center text-base transition-colors ${
                mobileSheet === 'search' ? 'bg-stone-100 border-stone-300 text-stone-600' : 'border-stone-200 text-stone-500 hover:bg-stone-50'
              }`} title="Caută invitat">
              🔍
            </button>
            <button onClick={copyPublicLink}
              className="w-11 h-10 border border-stone-200 text-stone-500 hover:bg-stone-50 rounded-xl flex items-center justify-center text-sm transition-colors" title="Copiază link public">
              {linkCopied ? '✓' : '⤢'}
            </button>
            <button onClick={handleSave} disabled={saving}
              className="bg-stone-800 hover:bg-stone-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-60 whitespace-nowrap">
              {saving ? '...' : saved ? '✓' : 'Salv.'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
