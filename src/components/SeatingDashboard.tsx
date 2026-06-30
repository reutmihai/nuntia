import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { ConfirmedEvent, SeatingTableLayout } from '../types';

// ─── Migrate old data format (assignments[] → guests[]) ───────────────────────

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

// ─── SVG: Masă rotundă ────────────────────────────────────────────────────────

function RoundTableSVG({ table, selected }: { table: SeatingTableLayout; selected: boolean }) {
  const TR = 22;
  const SR = 7;
  const DIST = TR + SR + 7;
  const SIZE = (DIST + SR + 5) * 2;
  const C = SIZE / 2;
  const occupied = table.guests.length;
  const label = table.name.length > 10 ? table.name.slice(0, 9) + '…' : table.name;

  return (
    <svg width={SIZE} height={SIZE} style={{ display: 'block', overflow: 'visible', pointerEvents: 'none' }}>
      <circle cx={C} cy={C} r={TR}
        fill="#fef2f2"
        stroke={selected ? '#e11d48' : '#fca5a5'}
        strokeWidth={selected ? 2.5 : 1.5}
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

// ─── SVG: Masă dreptunghiulară ────────────────────────────────────────────────

function RectTableSVG({ table, selected }: { table: SeatingTableLayout; selected: boolean }) {
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
      <rect x={0} y={PAD} width={TW} height={TH} rx={6}
        fill="#fef2f2"
        stroke={selected ? '#e11d48' : '#fca5a5'}
        strokeWidth={selected ? 2.5 : 1.5}
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
          stroke={i < occupied ? '#f9a8d4' : '#e5e7eb'}
          strokeWidth="1"
        />
      ))}
      {Array.from({ length: botCount }).map((_, i) => {
        const seatIdx = topCount + i;
        return (
          <circle key={`b${i}`} cx={sx(botCount, i)} cy={TOTAL_H - SR} r={SR}
            fill={seatIdx < occupied ? '#fce7f3' : 'white'}
            stroke={seatIdx < occupied ? '#f9a8d4' : '#e5e7eb'}
            strokeWidth="1"
          />
        );
      })}
    </svg>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

interface Props { event: ConfirmedEvent; onClose: () => void; }
interface DragState { id: string; offsetX: number; offsetY: number; moved: boolean; }

export default function SeatingDashboard({ event, onClose }: Props) {
  const [tables, setTables] = useState<SeatingTableLayout[]>([]);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [guestInput, setGuestInput] = useState('');
  const [newShape, setNewShape] = useState<'round' | 'rectangular'>('round');
  const [newSeats, setNewSeats] = useState(10);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastClickRef = useRef(0);

  useEffect(() => {
    supabase.from('confirmed_events').select('seating_layout').eq('id', event.id).single()
      .then(({ data }) => {
        const raw = (data?.seating_layout ?? []) as Record<string, unknown>[];
        setTables(raw.map(migrateTable));
      });
  }, [event.id]);

  // ─── Drag ──────────────────────────────────────────────────────────────────

  const handleTablePointerDown = (e: React.PointerEvent, table: SeatingTableLayout) => {
    const now = Date.now();
    if (now - lastClickRef.current < 280) return; // double-click — let onDoubleClick handle it
    e.stopPropagation();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * 100;
    const cy = ((e.clientY - rect.top) / rect.height) * 100;
    setDragging({ id: table.id, offsetX: cx - table.x, offsetY: cy - table.y, moved: false });
    setSelectedId(table.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100 - dragging.offsetX));
    const y = Math.max(2, Math.min(98, ((e.clientY - rect.top) / rect.height) * 100 - dragging.offsetY));
    setDragging(d => d ? { ...d, moved: true } : null);
    setTables(prev => prev.map(t => t.id === dragging.id ? { ...t, x, y } : t));
  };

  const handleCanvasPointerUp = () => setDragging(null);

  const handleTableDoubleClick = (e: React.MouseEvent, table: SeatingTableLayout) => {
    e.stopPropagation();
    lastClickRef.current = Date.now();
    setEditingTableId(table.id);
    setGuestInput('');
  };

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
    const col = tables.length % 6;
    const row = Math.floor(tables.length / 6);
    setTables(prev => [...prev, {
      id, name: `Masa ${prev.length + 1}`,
      x: 10 + col * 15, y: 12 + row * 22,
      shape: newShape, seats: newSeats, guests: [],
    }]);
    setSelectedId(id);
  };

  const deleteSelected = () => {
    setTables(prev => prev.filter(t => t.id !== selectedId));
    setSelectedId(null);
  };

  const renameSelected = (name: string) =>
    setTables(prev => prev.map(t => t.id === selectedId ? { ...t, name } : t));

  // ─── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('confirmed_events').update({ seating_layout: tables }).eq('id', event.id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const selectedTable = tables.find(t => t.id === selectedId) ?? null;
  const editingTable = tables.find(t => t.id === editingTableId) ?? null;
  const totalGuests = tables.reduce((s, t) => s + t.guests.length, 0);
  const totalSeats = tables.reduce((s, t) => s + t.seats, 0);

  return (
    <div className="fixed inset-0 z-50 bg-stone-100 flex flex-col" onClick={() => setSelectedId(null)}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-stone-200 shadow-sm shrink-0" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-4">
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-stone-200 text-stone-400 hover:text-stone-700 hover:border-stone-300 transition-colors text-lg">
            ←
          </button>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-400">Plan aranjament mese</p>
            <p className="text-sm font-semibold text-stone-800">{event.clientName} · <span className="text-stone-400 font-normal">{event.date}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-stone-400 hidden sm:block">
            {tables.length} mese · {totalGuests}/{totalSeats} locuri ocupate
          </span>
          <p className="text-[10px] text-stone-300 hidden md:block">Dublu-click pe masă pentru invitați</p>
          <button onClick={handleSave} disabled={saving}
            className="bg-rose-700 hover:bg-rose-800 text-white px-5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-60">
            {saving ? 'Se salvează...' : saved ? '✓ Salvat' : 'Salvează'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">

        {/* ── Left sidebar ── */}
        <div className="w-56 bg-white border-r border-stone-200 flex flex-col shrink-0 overflow-y-auto" onClick={e => e.stopPropagation()}>

          {/* Add table */}
          <div className="p-4 border-b border-stone-100 space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold">Adaugă masă</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(['round', 'rectangular'] as const).map(shape => (
                <button key={shape} onClick={() => setNewShape(shape)}
                  className={`py-2 rounded-xl border text-[10px] uppercase tracking-wider font-semibold transition-colors ${
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
                onChange={e => setNewSeats(Number(e.target.value))}
                className="w-full accent-rose-600" />
              <div className="flex justify-between text-[9px] text-stone-300 mt-0.5"><span>2</span><span>30</span></div>
            </div>
            <button onClick={addTable}
              className="w-full bg-rose-700 hover:bg-rose-800 text-white py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors">
              + Adaugă
            </button>
          </div>

          {/* Selected table */}
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
            <div className="p-4 text-center">
              <p className="text-[11px] text-stone-300 italic">Click pe o masă pentru opțiuni.</p>
              <p className="text-[11px] text-stone-300 italic mt-1">Dublu-click pentru invitați.</p>
            </div>
          )}

          {/* Table list */}
          {tables.length > 0 && (
            <div className="p-3 space-y-1 flex-1 overflow-y-auto">
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold px-1 mb-2">
                Toate mesele ({tables.length})
              </p>
              {tables.map(t => (
                <button key={t.id} onClick={e => { e.stopPropagation(); setSelectedId(t.id); }}
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

        {/* ── Canvas ── */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={canvasRef}
            className="w-full h-full relative select-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              cursor: dragging?.moved ? 'grabbing' : 'default',
            }}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onClick={() => setSelectedId(null)}
          >
            {tables.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center space-y-2">
                  <p className="text-stone-300 text-sm">Adaugă mese din panoul stâng</p>
                </div>
              </div>
            )}

            {tables.map(table => (
              <div
                key={table.id}
                style={{
                  position: 'absolute',
                  left: `${table.x}%`,
                  top: `${table.y}%`,
                  transform: 'translate(-50%, -50%)',
                  cursor: dragging?.id === table.id && dragging.moved ? 'grabbing' : 'grab',
                  zIndex: selectedId === table.id ? 10 : 1,
                  filter: selectedId === table.id
                    ? 'drop-shadow(0 4px 12px rgba(225,29,72,0.3))'
                    : 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))',
                  transition: dragging?.id === table.id ? 'none' : 'filter 0.15s',
                }}
                onPointerDown={e => handleTablePointerDown(e, table)}
                onClick={e => { e.stopPropagation(); setSelectedId(table.id); lastClickRef.current = Date.now(); }}
                onDoubleClick={e => handleTableDoubleClick(e, table)}
              >
                {table.shape === 'round'
                  ? <RoundTableSVG table={table} selected={selectedId === table.id} />
                  : <RectTableSVG table={table} selected={selectedId === table.id} />
                }
              </div>
            ))}
          </div>

          {/* ── Guest editor modal (double-click) ── */}
          {editingTable && (
            <div
              className="absolute inset-0 flex items-center justify-center z-30 bg-black/20"
              onClick={() => setEditingTableId(null)}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl w-80 flex flex-col max-h-[70vh] border border-stone-100"
                onClick={e => e.stopPropagation()}
              >
                {/* Modal header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                  <div>
                    <p className="font-semibold text-stone-900">{editingTable.name}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      {editingTable.guests.length} invitați · {editingTable.seats} scaune
                    </p>
                  </div>
                  <button onClick={() => setEditingTableId(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full border border-stone-200 text-stone-400 hover:text-stone-700 transition-colors text-lg">
                    ×
                  </button>
                </div>

                {/* Guest list */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
                  {editingTable.guests.length === 0 ? (
                    <p className="text-[11px] text-stone-300 italic text-center py-4">Niciun invitat adăugat.</p>
                  ) : (
                    editingTable.guests.map((guest, i) => (
                      <div key={i} className="flex items-center justify-between bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                        <span className="text-sm text-rose-800">{guest}</span>
                        <button onClick={() => removeGuest(editingTable.id, i)}
                          className="text-rose-300 hover:text-red-500 transition-colors text-lg leading-none ml-2 shrink-0">
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add guests */}
                <div className="px-4 pb-4 pt-3 border-t border-stone-100 space-y-2">
                  <p className="text-[10px] text-stone-400 uppercase tracking-wider">
                    Adaugă invitați (separat prin Enter, virgulă sau punct și virgulă)
                  </p>
                  <textarea
                    value={guestInput}
                    onChange={e => setGuestInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addGuests(editingTable.id); } }}
                    placeholder="Ion Popescu&#10;Maria Ionescu&#10;..."
                    rows={3}
                    autoFocus
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-rose-300 placeholder:text-stone-300 transition-colors resize-none"
                  />
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
    </div>
  );
}
