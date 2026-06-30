import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { ConfirmedEvent, SeatingTableLayout } from '../types';

// ─── SVG: Masă rotundă ────────────────────────────────────────────────────────

function RoundTableSVG({
  table,
  onSeatClick,
  selected,
}: {
  table: SeatingTableLayout;
  onSeatClick: (idx: number) => void;
  selected: boolean;
}) {
  const TR = 44;
  const SR = 15;
  const DIST = TR + SR + 9;
  const SIZE = (DIST + SR + 6) * 2;
  const C = SIZE / 2;

  return (
    <svg
      width={SIZE}
      height={SIZE}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <circle
        cx={C} cy={C} r={TR}
        fill="#fef2f2"
        stroke={selected ? '#e11d48' : '#fca5a5'}
        strokeWidth={selected ? 2.5 : 1.5}
      />
      <text x={C} y={C - 5} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#9f1239" fontWeight="600">
        {table.name}
      </text>
      <text x={C} y={C + 7} textAnchor="middle" dominantBaseline="middle" fontSize="7.5" fill="#c4b5a5">
        {table.seats} locuri
      </text>

      {Array.from({ length: table.seats }).map((_, i) => {
        const angle = (2 * Math.PI * i) / table.seats - Math.PI / 2;
        const sx = C + DIST * Math.cos(angle);
        const sy = C + DIST * Math.sin(angle);
        const guest = table.assignments[i];
        return (
          <g
            key={i}
            onClick={e => { e.stopPropagation(); onSeatClick(i); }}
            style={{ cursor: 'pointer' }}
          >
            <circle
              cx={sx} cy={sy} r={SR}
              fill={guest ? '#fce7f3' : 'white'}
              stroke={guest ? '#f9a8d4' : '#d1d5db'}
              strokeWidth="1.5"
            />
            <text
              x={sx} y={sy}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={guest ? '6' : '8'}
              fill={guest ? '#be185d' : '#9ca3af'}
            >
              {guest ? guest.split(' ')[0].slice(0, 7) : i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── SVG: Masă dreptunghiulară ────────────────────────────────────────────────

function RectTableSVG({
  table,
  onSeatClick,
  selected,
}: {
  table: SeatingTableLayout;
  onSeatClick: (idx: number) => void;
  selected: boolean;
}) {
  const SR = 14;
  const PAD = SR + 8;
  const topCount = Math.ceil(table.seats / 2);
  const botCount = Math.floor(table.seats / 2);
  const cols = Math.max(topCount, botCount, 1);
  const TW = cols * (SR * 2 + 10) + 12;
  const TH = 54;
  const TOTAL_H = TH + PAD * 2;

  const seatX = (count: number, i: number) => (TW / (count + 1)) * (i + 1);

  return (
    <svg width={TW} height={TOTAL_H} style={{ display: 'block', overflow: 'visible' }}>
      <rect
        x={0} y={PAD} width={TW} height={TH} rx={8}
        fill="#fef2f2"
        stroke={selected ? '#e11d48' : '#fca5a5'}
        strokeWidth={selected ? 2.5 : 1.5}
      />
      <text x={TW / 2} y={PAD + TH / 2 - 5} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#9f1239" fontWeight="600">
        {table.name}
      </text>
      <text x={TW / 2} y={PAD + TH / 2 + 7} textAnchor="middle" dominantBaseline="middle" fontSize="7.5" fill="#c4b5a5">
        {table.seats} locuri
      </text>

      {/* Top seats */}
      {Array.from({ length: topCount }).map((_, i) => {
        const guest = table.assignments[i];
        const sx = seatX(topCount, i);
        const sy = SR;
        return (
          <g key={`t${i}`} onClick={e => { e.stopPropagation(); onSeatClick(i); }} style={{ cursor: 'pointer' }}>
            <circle cx={sx} cy={sy} r={SR} fill={guest ? '#fce7f3' : 'white'} stroke={guest ? '#f9a8d4' : '#d1d5db'} strokeWidth="1.5" />
            <text x={sx} y={sy} textAnchor="middle" dominantBaseline="middle" fontSize={guest ? '6' : '8'} fill={guest ? '#be185d' : '#9ca3af'}>
              {guest ? guest.split(' ')[0].slice(0, 6) : i + 1}
            </text>
          </g>
        );
      })}

      {/* Bottom seats */}
      {Array.from({ length: botCount }).map((_, i) => {
        const seatIdx = topCount + i;
        const guest = table.assignments[seatIdx];
        const sx = seatX(botCount, i);
        const sy = TOTAL_H - SR;
        return (
          <g key={`b${i}`} onClick={e => { e.stopPropagation(); onSeatClick(seatIdx); }} style={{ cursor: 'pointer' }}>
            <circle cx={sx} cy={sy} r={SR} fill={guest ? '#fce7f3' : 'white'} stroke={guest ? '#f9a8d4' : '#d1d5db'} strokeWidth="1.5" />
            <text x={sx} y={sy} textAnchor="middle" dominantBaseline="middle" fontSize={guest ? '6' : '8'} fill={guest ? '#be185d' : '#9ca3af'}>
              {guest ? guest.split(' ')[0].slice(0, 6) : seatIdx + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────

interface Props {
  event: ConfirmedEvent;
  onClose: () => void;
}

interface EditingSeat { tableId: string; seatIdx: number; }
interface DragState { id: string; offsetX: number; offsetY: number; }

export default function SeatingDashboard({ event, onClose }: Props) {
  const [tables, setTables] = useState<SeatingTableLayout[]>(
    (event.seatingLayout ?? []) as SeatingTableLayout[]
  );
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [editingSeat, setEditingSeat] = useState<EditingSeat | null>(null);
  const [guestInput, setGuestInput] = useState('');
  const [newShape, setNewShape] = useState<'round' | 'rectangular'>('round');
  const [newSeats, setNewSeats] = useState(8);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load fresh layout from Supabase
  useEffect(() => {
    supabase
      .from('confirmed_events')
      .select('seating_layout')
      .eq('id', event.id)
      .single()
      .then(({ data }) => {
        if (data?.seating_layout?.length) {
          setTables(data.seating_layout as SeatingTableLayout[]);
        }
      });
  }, [event.id]);

  // ─── Drag ──────────────────────────────────────────────────────────────────

  const handleTablePointerDown = (e: React.PointerEvent, table: SeatingTableLayout) => {
    if (editingSeat) return;
    e.stopPropagation();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * 100;
    const cy = ((e.clientY - rect.top) / rect.height) * 100;
    setDragging({ id: table.id, offsetX: cx - table.x, offsetY: cy - table.y });
    setSelectedTableId(table.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100 - dragging.offsetX));
    const y = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100 - dragging.offsetY));
    setTables(prev => prev.map(t => t.id === dragging.id ? { ...t, x, y } : t));
  };

  const handleCanvasPointerUp = () => setDragging(null);

  // ─── Seat editing ──────────────────────────────────────────────────────────

  const openSeat = (tableId: string, seatIdx: number) => {
    if (dragging) return;
    const table = tables.find(t => t.id === tableId);
    const current = table?.assignments[seatIdx] ?? null;
    setGuestInput(current ?? '');
    setEditingSeat({ tableId, seatIdx });
    setSelectedTableId(tableId);
  };

  const commitSeat = () => {
    if (!editingSeat) return;
    const name = guestInput.trim() || null;
    setTables(prev => prev.map(t => {
      if (t.id !== editingSeat.tableId) return t;
      const a = [...t.assignments];
      a[editingSeat.seatIdx] = name;
      return { ...t, assignments: a };
    }));
    setEditingSeat(null);
    setGuestInput('');
  };

  // ─── Table management ──────────────────────────────────────────────────────

  const addTable = () => {
    const id = Date.now().toString();
    setTables(prev => [...prev, {
      id,
      name: `Masa ${prev.length + 1}`,
      x: 20 + (prev.length % 5) * 14,
      y: 20 + Math.floor(prev.length / 5) * 28,
      shape: newShape,
      seats: newSeats,
      assignments: Array(newSeats).fill(null),
    }]);
    setSelectedTableId(id);
  };

  const deleteSelected = () => {
    if (!selectedTableId) return;
    setTables(prev => prev.filter(t => t.id !== selectedTableId));
    setSelectedTableId(null);
  };

  const renameSelected = (name: string) => {
    if (!selectedTableId) return;
    setTables(prev => prev.map(t => t.id === selectedTableId ? { ...t, name } : t));
  };

  // ─── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('confirmed_events').update({ seating_layout: tables }).eq('id', event.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const selectedTable = tables.find(t => t.id === selectedTableId) ?? null;
  const totalAssigned = tables.reduce((s, t) => s + t.assignments.filter(Boolean).length, 0);
  const totalSeats = tables.reduce((s, t) => s + t.seats, 0);

  return (
    <div className="fixed inset-0 z-50 bg-stone-100 flex flex-col" onClick={() => { setSelectedTableId(null); setEditingSeat(null); }}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-stone-200 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full border border-stone-200 text-stone-400 hover:text-stone-700 hover:border-stone-300 transition-colors text-lg">
            ×
          </button>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-400">Plan aranjament mese</p>
            <p className="text-sm font-semibold text-stone-800">{event.clientName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-400">
            {totalAssigned}/{totalSeats} locuri ocupate · {tables.length} mese
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-rose-700 hover:bg-rose-800 text-white px-5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-60"
          >
            {saving ? 'Se salvează...' : saved ? '✓ Salvat' : 'Salvează'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">

        {/* ── Left sidebar ── */}
        <div className="w-64 bg-white border-r border-stone-200 flex flex-col shrink-0 overflow-y-auto" onClick={e => e.stopPropagation()}>

          {/* Add table */}
          <div className="p-4 border-b border-stone-100 space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold">Adaugă masă</p>

            <div className="grid grid-cols-2 gap-1.5">
              {(['round', 'rectangular'] as const).map(shape => (
                <button
                  key={shape}
                  onClick={() => setNewShape(shape)}
                  className={`py-2 rounded-xl border text-[10px] uppercase tracking-wider font-semibold transition-colors ${
                    newShape === shape
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'border-stone-200 text-stone-400 hover:border-stone-300'
                  }`}
                >
                  {shape === 'round' ? '⭕ Rotundă' : '▬ Dreptung.'}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <p className="text-[10px] text-stone-400 uppercase tracking-wider">Scaune: <span className="text-stone-700 font-semibold">{newSeats}</span></p>
              <input
                type="range" min={2} max={20} value={newSeats}
                onChange={e => setNewSeats(Number(e.target.value))}
                className="w-full accent-rose-600"
              />
              <div className="flex justify-between text-[9px] text-stone-300">
                <span>2</span><span>20</span>
              </div>
            </div>

            <button
              onClick={addTable}
              className="w-full bg-rose-700 hover:bg-rose-800 text-white py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              + Adaugă masă
            </button>
          </div>

          {/* Selected table inspector */}
          {selectedTable ? (
            <div className="p-4 space-y-3 border-b border-stone-100">
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold">Masă selectată</p>

              <div className="space-y-1">
                <label className="text-[10px] text-stone-400 uppercase tracking-wider">Nume</label>
                <input
                  type="text"
                  value={selectedTable.name}
                  onChange={e => renameSelected(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-rose-300 transition-colors"
                />
              </div>

              <div className="flex justify-between text-xs text-stone-500">
                <span>{selectedTable.shape === 'round' ? 'Masă rotundă' : 'Masă dreptunghiulară'}</span>
                <span>{selectedTable.assignments.filter(Boolean).length}/{selectedTable.seats} pers.</span>
              </div>

              <button
                onClick={deleteSelected}
                className="w-full border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 py-2 rounded-xl text-xs uppercase tracking-wider transition-colors"
              >
                Șterge masa
              </button>
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-[11px] text-stone-300 italic">Selectează o masă pentru opțiuni.</p>
            </div>
          )}

          {/* Table list */}
          {tables.length > 0 && (
            <div className="p-4 space-y-1.5 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold mb-2">Toate mesele</p>
              {tables.map(t => (
                <button
                  key={t.id}
                  onClick={e => { e.stopPropagation(); setSelectedTableId(t.id); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                    selectedTableId === t.id
                      ? 'bg-rose-50 border border-rose-200 text-rose-700'
                      : 'bg-stone-50 border border-stone-100 text-stone-600 hover:border-stone-200'
                  }`}
                >
                  <span className="font-medium">{t.name}</span>
                  <span className="text-[10px] text-stone-400">{t.assignments.filter(Boolean).length}/{t.seats}</span>
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
              backgroundSize: '28px 28px',
              cursor: dragging ? 'grabbing' : 'default',
            }}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onClick={() => { setSelectedTableId(null); setEditingSeat(null); }}
          >
            {tables.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center space-y-2">
                  <p className="text-stone-300 text-sm font-light">Canvas gol</p>
                  <p className="text-stone-200 text-xs">Adaugă mese din panoul din stânga</p>
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
                  cursor: dragging?.id === table.id ? 'grabbing' : 'grab',
                  pointerEvents: 'all',
                  zIndex: selectedTableId === table.id ? 10 : 1,
                  filter: selectedTableId === table.id ? 'drop-shadow(0 4px 16px rgba(225,29,72,0.25))' : 'drop-shadow(0 2px 6px rgba(0,0,0,0.08))',
                  transition: dragging?.id === table.id ? 'none' : 'filter 0.15s',
                }}
                onPointerDown={e => handleTablePointerDown(e, table)}
                onClick={e => { e.stopPropagation(); setSelectedTableId(table.id); }}
              >
                {table.shape === 'round' ? (
                  <RoundTableSVG
                    table={table}
                    selected={selectedTableId === table.id}
                    onSeatClick={idx => openSeat(table.id, idx)}
                  />
                ) : (
                  <RectTableSVG
                    table={table}
                    selected={selectedTableId === table.id}
                    onSeatClick={idx => openSeat(table.id, idx)}
                  />
                )}
              </div>
            ))}
          </div>

          {/* ── Seat editing popover ── */}
          {editingSeat && (
            <div
              className="absolute inset-0 flex items-center justify-center z-20 bg-black/10"
              onClick={() => setEditingSeat(null)}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl p-5 w-72 space-y-4 border border-stone-100"
                onClick={e => e.stopPropagation()}
              >
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold">
                    {tables.find(t => t.id === editingSeat.tableId)?.name} · Scaun {editingSeat.seatIdx + 1}
                  </p>
                  {tables.find(t => t.id === editingSeat.tableId)?.assignments[editingSeat.seatIdx] && (
                    <p className="text-xs text-stone-500 mt-0.5">
                      Ocupat de: <span className="font-semibold text-stone-700">{tables.find(t => t.id === editingSeat.tableId)?.assignments[editingSeat.seatIdx]}</span>
                    </p>
                  )}
                </div>
                <input
                  type="text"
                  value={guestInput}
                  onChange={e => setGuestInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && commitSeat()}
                  placeholder="Numele invitatului..."
                  autoFocus
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-rose-300 placeholder:text-stone-300 transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    onClick={commitSeat}
                    className="flex-1 bg-rose-700 text-white py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-rose-800 transition-colors"
                  >
                    {guestInput.trim() ? 'Asignează' : 'Eliberează'}
                  </button>
                  <button
                    onClick={() => setEditingSeat(null)}
                    className="px-4 py-2.5 rounded-xl text-xs text-stone-500 border border-stone-200 hover:bg-stone-50 transition-colors"
                  >
                    Anulează
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
