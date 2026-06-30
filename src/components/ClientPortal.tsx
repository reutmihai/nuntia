import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { ConfirmedEvent, MenuData, MenuOption, ScheduleItem, MesaItem, CourseKey, SeatingTableLayout } from '../types';
import SeatingDashboard from './SeatingDashboard';

// ─── Countdown ────────────────────────────────────────────────────────────────

interface TimeLeft { days: number; hours: number; minutes: number; seconds: number; isPast: boolean; }

function useCountdown(dateStr: string): TimeLeft {
  const calculate = (): TimeLeft => {
    const diff = new Date(dateStr + 'T00:00:00').getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      isPast: false,
    };
  };
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculate);
  useEffect(() => { const t = setInterval(() => setTimeLeft(calculate()), 1000); return () => clearInterval(t); }, [dateStr]);
  return timeLeft;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2.5">
      <div className="w-full bg-white border border-rose-100 rounded-xl sm:rounded-2xl px-1 sm:px-3 py-4 sm:py-6 text-center shadow-sm">
        <span className="text-3xl sm:text-5xl lg:text-6xl font-extralight text-rose-700 tabular-nums leading-none">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] sm:tracking-[0.2em] text-stone-400 font-semibold">{label}</span>
    </div>
  );
}

function Countdown({ dateStr }: { dateStr: string }) {
  const { days, hours, minutes, seconds, isPast } = useCountdown(dateStr);
  if (isPast) return (
    <div className="text-center py-8">
      <p className="text-rose-600 text-sm uppercase tracking-widest font-medium">Ziua cea mare a sosit!</p>
    </div>
  );
  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-[0.25em] text-stone-400 text-center font-semibold">Timp rămas până la nuntă</p>
      <div className="grid grid-cols-4 gap-3 sm:gap-4">
        <CountdownUnit value={days} label="Zile" />
        <CountdownUnit value={hours} label="Ore" />
        <CountdownUnit value={minutes} label="Minute" />
        <CountdownUnit value={seconds} label="Secunde" />
      </div>
    </div>
  );
}

// ─── Save hook ────────────────────────────────────────────────────────────────

function useSave(eventId: string, column: string) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async (data: unknown) => {
    setSaving(true);
    try {
      await supabase.from('confirmed_events').update({ [column]: data }).eq('id', eventId);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };
  return { save, saving, saved };
}

// ─── Tab: Meniu ───────────────────────────────────────────────────────────────

const COURSES: { key: CourseKey; label: string; hint: string }[] = [
  { key: 'felul1', label: 'Felul 1', hint: 'Aperitive / Ciorbă' },
  { key: 'felul2', label: 'Felul 2', hint: 'Antreu' },
  { key: 'felul3', label: 'Felul 3', hint: 'Felul principal' },
  { key: 'felul4', label: 'Felul 4', hint: 'Desert / Tort' },
];

const EMPTY_MENU: MenuData = { felul1: '', felul2: '', felul3: '', felul4: '' };

function normalizeMenu(raw: unknown): MenuData {
  if (!raw || typeof raw !== 'object') return EMPTY_MENU;
  const r = raw as Record<string, unknown>;
  const str = (val: unknown): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return (val as { clientSelection?: string }).clientSelection ?? '';
    return '';
  };
  return { felul1: str(r.felul1), felul2: str(r.felul2), felul3: str(r.felul3), felul4: str(r.felul4) };
}

function TabMeniu({ event }: { event: ConfirmedEvent }) {
  const [menu, setMenu] = useState<MenuData>(() => normalizeMenu(event.menuData));
  const [menuOptions, setMenuOptions] = useState<MenuOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const { save, saving, saved } = useSave(event.id, 'menu_data');

  useEffect(() => {
    supabase.from('menu_options').select('*').order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMenuOptions(data.map(r => ({
          id: r.id, course: r.course as CourseKey, title: r.title,
          description: r.description ?? undefined, pricePerPerson: r.price_per_person ?? undefined,
        })));
        setLoadingOptions(false);
      });
  }, []);

  if (loadingOptions) return (
    <div className="py-12 text-center">
      <p className="text-xs text-stone-300 uppercase tracking-widest animate-pulse">Se încarcă meniul...</p>
    </div>
  );

  const hasAnyOptions = menuOptions.length > 0;

  const selectOption = (key: CourseKey, title: string) =>
    setMenu(prev => ({ ...prev, [key]: prev[key] === title ? '' : title }));

  return (
    <div className="space-y-4">
      {!hasAnyOptions ? (
        <div className="bg-white border border-dashed border-stone-200 rounded-2xl p-10 text-center space-y-2">
          <p className="text-stone-400 text-sm">Opțiunile de meniu</p>
          <p className="text-stone-300 text-xs leading-relaxed">
            Echipa noastră va adăuga în curând variantele de meniu din care poți alege.
          </p>
        </div>
      ) : (
        COURSES.map(({ key, label, hint }, idx) => {
          const courseOptions = menuOptions.filter(o => o.course === key);
          const selected = menu[key];
          return (
            <div key={key} className="bg-white border border-stone-100 rounded-2xl p-5 space-y-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-600 text-sm font-light shrink-0">
                  {idx + 1}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-stone-500 font-semibold">{label}</p>
                  <p className="text-[10px] text-stone-300">{hint}</p>
                </div>
                {selected && (
                  <span className="ml-auto text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                    ✓ Ales
                  </span>
                )}
              </div>

              {courseOptions.length === 0 ? (
                <p className="text-[11px] text-stone-300 italic px-1">Va fi completat de echipă.</p>
              ) : (
                <div className="space-y-2">
                  {courseOptions.map(opt => {
                    const isSelected = selected === opt.title;
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-rose-50 border-rose-200'
                            : 'bg-stone-50 border-stone-200 hover:border-stone-300 hover:bg-white'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isSelected ? 'border-rose-500 bg-rose-500' : 'border-stone-300'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <input type="radio" className="sr-only" checked={isSelected} onChange={() => selectOption(key, opt.title)} />
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isSelected ? 'text-rose-800' : 'text-stone-700'}`}>{opt.title}</p>
                          {opt.description && <p className="text-[11px] text-stone-400 mt-0.5">{opt.description}</p>}
                        </div>
                        {opt.pricePerPerson !== undefined && (
                          <span className={`text-[11px] font-semibold shrink-0 px-2 py-0.5 rounded-lg ${
                            isSelected ? 'text-rose-600 bg-rose-100 border border-rose-200' : 'text-emerald-600 bg-emerald-50 border border-emerald-100'
                          }`}>
                            {opt.pricePerPerson} € / pers
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}

      {hasAnyOptions && (
        <button onClick={() => save(menu)} disabled={saving}
          className="w-full py-3.5 rounded-xl font-semibold uppercase tracking-widest text-xs transition-colors disabled:opacity-60 bg-rose-700 text-white hover:bg-rose-800">
          {saving ? 'Se salvează...' : saved ? '✓ Selecție salvată' : 'Confirmă Selecția'}
        </button>
      )}
    </div>
  );
}

// ─── Tab: Programul Zilei ─────────────────────────────────────────────────────

function TabProgram({ event }: { event: ConfirmedEvent }) {
  const [items, setItems] = useState<ScheduleItem[]>(event.scheduleData ?? []);
  const [newOra, setNewOra] = useState('');
  const [newDescriere, setNewDescriere] = useState('');
  const { save, saving, saved } = useSave(event.id, 'schedule_data');

  const addItem = () => {
    if (!newOra || !newDescriere.trim()) return;
    setItems(prev =>
      [...prev, { id: Date.now().toString(), ora: newOra, descriere: newDescriere.trim() }]
        .sort((a, b) => a.ora.localeCompare(b.ora))
    );
    setNewOra('');
    setNewDescriere('');
  };

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="bg-white border border-dashed border-stone-200 rounded-2xl p-10 text-center">
          <p className="text-stone-300 text-xs">Niciun moment adăugat încă.</p>
        </div>
      ) : (
        <div className="relative space-y-0">
          <div className="absolute left-[34px] top-5 bottom-5 w-px bg-rose-100 -z-0" />
          {items.map((item, idx) => (
            <div key={item.id} className="flex items-start gap-4 relative z-10 pb-3 last:pb-0">
              <div className="flex flex-col items-center shrink-0 gap-0">
                <div className="w-[68px] bg-rose-50 border border-rose-100 text-rose-700 font-mono text-xs font-semibold px-2 py-1.5 rounded-lg text-center">
                  {item.ora}
                </div>
              </div>
              <div className="flex-1 bg-white border border-stone-100 rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between gap-3 mt-0.5">
                <p className="text-sm text-stone-800">{item.descriere}</p>
                <button
                  onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                  className="text-stone-300 hover:text-red-400 transition-colors text-xl leading-none shrink-0"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4 space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold mb-3">Adaugă moment</p>
        <div className="flex gap-2">
          <input
            type="time"
            value={newOra}
            onChange={e => setNewOra(e.target.value)}
            className="bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-rose-300 transition-colors w-28 shrink-0"
          />
          <input
            type="text"
            value={newDescriere}
            onChange={e => setNewDescriere(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="ex: Sosirea invitaților"
            className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-rose-300 placeholder:text-stone-300 transition-colors"
          />
          <button
            onClick={addItem}
            disabled={!newOra || !newDescriere.trim()}
            className="bg-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-light hover:bg-rose-800 transition-colors disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <button
        onClick={() => save(items)}
        disabled={saving}
        className="w-full py-3.5 rounded-xl font-semibold uppercase tracking-widest text-xs transition-colors disabled:opacity-60 bg-rose-700 text-white hover:bg-rose-800"
      >
        {saving ? 'Se salvează...' : saved ? '✓ Salvat' : 'Salvează Programul'}
      </button>
    </div>
  );
}

// ─── Tab: Aranjament Mese ─────────────────────────────────────────────────────

function TabMese({ event, onOpenDashboard }: { event: ConfirmedEvent; onOpenDashboard: () => void }) {
  const [tables, setTables] = useState<MesaItem[]>(event.tablesData ?? []);
  const [newMasa, setNewMasa] = useState('');
  const [guestInputs, setGuestInputs] = useState<Record<string, string>>({});
  const { save, saving, saved } = useSave(event.id, 'tables_data');

  const addTable = () => {
    if (!newMasa.trim()) return;
    setTables(prev => [...prev, { id: Date.now().toString(), masa: newMasa.trim(), invitati: [] }]);
    setNewMasa('');
  };

  const addGuest = (tableId: string) => {
    const name = (guestInputs[tableId] ?? '').trim();
    if (!name) return;
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, invitati: [...t.invitati, name] } : t));
    setGuestInputs(prev => ({ ...prev, [tableId]: '' }));
  };

  const removeGuest = (tableId: string, idx: number) =>
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, invitati: t.invitati.filter((_, i) => i !== idx) } : t));

  const totalGuests = tables.reduce((sum, t) => sum + t.invitati.length, 0);

  return (
    <div className="space-y-4">
      {/* Visual dashboard button */}
      <button
        onClick={onOpenDashboard}
        className="w-full flex items-center justify-between bg-gradient-to-r from-rose-50 to-amber-50/40 border border-rose-100 hover:border-rose-200 hover:shadow-sm rounded-2xl px-5 py-4 transition-all group"
      >
        <div className="text-left space-y-0.5">
          <p className="text-sm font-semibold text-stone-800 group-hover:text-rose-700 transition-colors">Plan vizual interactiv</p>
          <p className="text-[11px] text-stone-400">Aranjează mesele pe canvas cu drag & drop, asignează invitați per scaun</p>
        </div>
        <span className="text-rose-400 text-2xl shrink-0 ml-4 group-hover:translate-x-1 transition-transform">→</span>
      </button>

      {tables.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] uppercase tracking-widest text-stone-400">{tables.length} mese</p>
          <p className="text-[10px] uppercase tracking-widest text-stone-400">{totalGuests} invitați plasați</p>
        </div>
      )}

      {tables.length === 0 ? (
        <div className="bg-white border border-dashed border-stone-200 rounded-2xl p-10 text-center">
          <p className="text-stone-300 text-xs">Nicio masă adăugată încă.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tables.map(table => (
            <div key={table.id} className="bg-white border border-stone-100 rounded-2xl p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-stone-900 text-sm">{table.masa}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stone-400 bg-stone-50 border border-stone-100 px-2 py-0.5 rounded-full">
                    {table.invitati.length} pers.
                  </span>
                  <button
                    onClick={() => setTables(prev => prev.filter(t => t.id !== table.id))}
                    className="text-stone-300 hover:text-red-400 transition-colors text-xl leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                {table.invitati.map((guest, idx) => (
                  <span
                    key={idx}
                    className="flex items-center gap-1 bg-rose-50 border border-rose-100 text-rose-700 pl-2.5 pr-1.5 py-1 rounded-full text-xs"
                  >
                    {guest}
                    <button
                      onClick={() => removeGuest(table.id, idx)}
                      className="text-rose-300 hover:text-rose-600 transition-colors leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={guestInputs[table.id] ?? ''}
                  onChange={e => setGuestInputs(prev => ({ ...prev, [table.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addGuest(table.id)}
                  placeholder="Adaugă invitat..."
                  className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-rose-300 placeholder:text-stone-300 transition-colors"
                />
                <button
                  onClick={() => addGuest(table.id)}
                  disabled={!(guestInputs[table.id] ?? '').trim()}
                  className="bg-stone-100 hover:bg-rose-50 hover:text-rose-600 text-stone-500 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4">
        <p className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold mb-3">Adaugă masă</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newMasa}
            onChange={e => setNewMasa(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTable()}
            placeholder="ex: Masa Mirilor, Masa 1, Nași..."
            className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-rose-300 placeholder:text-stone-300 transition-colors"
          />
          <button
            onClick={addTable}
            disabled={!newMasa.trim()}
            className="bg-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-light hover:bg-rose-800 transition-colors disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <button
        onClick={() => save(tables)}
        disabled={saving}
        className="w-full py-3.5 rounded-xl font-semibold uppercase tracking-widest text-xs transition-colors disabled:opacity-60 bg-rose-700 text-white hover:bg-rose-800"
      >
        {saving ? 'Se salvează...' : saved ? '✓ Salvat' : 'Salvează Aranjamentul'}
      </button>
    </div>
  );
}

// ─── Tab: Detalii (overview) ──────────────────────────────────────────────────

function TabDetalii({ event }: { event: ConfirmedEvent }) {
  const totalEstimate = event.pricePerMeniu ? event.pricePerMeniu * event.guests : null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Data', value: event.date, mono: true },
          { label: 'Salon', value: event.salonName },
          { label: 'Invitați', value: `${event.guests} pers.` },
          { label: 'Preț Meniu', value: event.pricePerMeniu ? `${event.pricePerMeniu} € / pers` : 'Nespecificat', emerald: true },
        ].map(({ label, value, mono, emerald }) => (
          <div key={label} className="bg-white border border-stone-100 rounded-2xl p-5 space-y-1.5 shadow-sm">
            <p className="text-[10px] uppercase tracking-widest text-stone-400">{label}</p>
            <p className={`font-semibold text-sm ${mono ? 'font-mono text-stone-900' : emerald ? 'text-emerald-600' : 'text-stone-900'}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {totalEstimate && (
        <div className="bg-white border border-stone-100 rounded-2xl p-5 flex justify-between items-center shadow-sm">
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-widest text-stone-400">Estimare Totală</p>
            <p className="text-xs text-stone-400">{event.guests} pers. × {event.pricePerMeniu} €</p>
          </div>
          <p className="text-2xl font-light text-stone-900">{totalEstimate.toLocaleString('ro-RO')} €</p>
        </div>
      )}

      {event.extraServices.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-stone-400">Servicii Extra Incluse</p>
          <div className="flex flex-wrap gap-2">
            {event.extraServices.map((s, i) => (
              <span key={i} className="bg-rose-50 border border-rose-100 text-rose-700 px-3 py-1.5 rounded-xl text-xs font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-stone-50 border border-stone-100 rounded-2xl p-5 space-y-3 text-xs">
        <p className="text-[10px] uppercase tracking-widest text-stone-400">Contact</p>
        <div className="flex justify-between">
          <span className="text-stone-400">Telefon</span>
          <span className="text-stone-800 font-mono">{event.phone}</span>
        </div>
        {event.email && (
          <div className="flex justify-between">
            <span className="text-stone-400">Email</span>
            <span className="text-stone-800">{event.email}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Portal ──────────────────────────────────────────────────────────────

type TabId = 'detalii' | 'meniu' | 'program' | 'mese';

const TABS: { id: TabId; label: string }[] = [
  { id: 'detalii', label: 'Detalii' },
  { id: 'meniu', label: 'Meniu' },
  { id: 'program', label: 'Programul Zilei' },
  { id: 'mese', label: 'Aranjament Mese' },
];

export default function ClientPortal() {
  const [codeInput, setCodeInput] = useState('');
  const [event, setEvent] = useState<ConfirmedEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('detalii');
  const [showSeatingDashboard, setShowSeatingDashboard] = useState(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) { setCodeInput(code); lookupEvent(code); }
  }, []);

  const lookupEvent = async (code: string) => {
    setIsLoading(true);
    setError('');
    setHasSearched(true);
    try {
      const { data, error: dbError } = await supabase
        .from('confirmed_events')
        .select('*')
        .eq('access_code', code.trim())
        .single();

      if (dbError || !data) { setEvent(null); setError('Cod de acces invalid sau inexistent.'); return; }

      setEvent({
        id: data.id,
        date: data.date,
        clientName: data.client_name,
        guests: data.guests,
        phone: data.phone,
        email: data.email || '',
        pricePerMeniu: data.price_per_meniu,
        salonName: data.salon_name || 'Grand Salon',
        extraServices: data.extra_services || [],
        accessCode: data.access_code,
        menuData: normalizeMenu(data.menu_data),
        scheduleData: data.schedule_data || [],
        tablesData: data.tables_data || [],
        seatingLayout: (data.seating_layout as SeatingTableLayout[]) || [],
      });
    } catch { setError('A apărut o eroare. Încearcă din nou.'); }
    finally { setIsLoading(false); }
  };

  const handleReset = () => {
    setEvent(null); setCodeInput(''); setHasSearched(false); setError('');
    window.history.replaceState({}, '', window.location.pathname);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-32">
      <p className="text-sm uppercase tracking-widest text-stone-400 animate-pulse">Se verifică codul de acces...</p>
    </div>
  );

  if (!event) return (
    <div className="max-w-md mx-auto py-16">
      <div className="text-center mb-10 space-y-3">
        <div className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-3xl">
          💍
        </div>
        <h2 className="text-2xl font-extralight uppercase tracking-widest text-stone-900">Portal Clienți</h2>
        <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
          Spațiul tău privat pentru a urmări și organiza toate detaliile nunții.
        </p>
      </div>

      <form onSubmit={e => { e.preventDefault(); if (codeInput.trim()) lookupEvent(codeInput.trim()); }}
        className="bg-white border border-stone-100 p-8 rounded-3xl space-y-5 shadow-xl">
        <div className="flex items-start gap-3 bg-rose-50/70 border border-rose-100 rounded-2xl px-4 py-3.5">
          <span className="text-rose-400 mt-0.5 shrink-0">✉️</span>
          <p className="text-[11px] text-stone-500 leading-relaxed">
            Codul de acces a fost trimis pe adresa ta de email imediat după confirmare.
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-stone-500 block mb-2">Cod de Acces</label>
          <input
            type="text" value={codeInput} onChange={e => setCodeInput(e.target.value)}
            placeholder="ex: andrei-maria-x7k2p9ab"
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5 text-sm text-stone-900 font-mono focus:outline-none focus:border-rose-300 placeholder:text-stone-300 transition-colors"
          />
          {hasSearched && error && <p className="text-red-500 text-xs pt-1">{error}</p>}
        </div>
        <button type="submit"
          className="w-full bg-rose-700 text-white py-3.5 rounded-xl font-semibold uppercase tracking-widest text-xs hover:bg-rose-800 transition-colors">
          Accesează Portalul
        </button>
        <p className="text-center text-[10px] text-stone-300 pt-1">Nu ai primit codul? Contactează-ne la recepție.</p>
      </form>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 py-4 sm:py-8">

      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-3xl font-extralight uppercase tracking-widest text-stone-900">{event.clientName}</h2>
        <p className="text-xs text-stone-400">Bun venit! Mai jos găsești și poți organiza toate detaliile evenimentului tău.</p>
      </div>

      {/* Countdown */}
      <div className="bg-gradient-to-br from-rose-50 to-amber-50/40 border border-rose-100 rounded-3xl p-6 sm:p-8 shadow-sm">
        <Countdown dateStr={event.date} />
      </div>

      {/* Tabs */}
      <div className="space-y-5">
        <div className="flex border-b border-stone-100 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-[11px] uppercase tracking-widest font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-rose-600 text-rose-700'
                  : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'detalii' && <TabDetalii event={event} />}
        {activeTab === 'meniu' && <TabMeniu event={event} />}
        {activeTab === 'program' && <TabProgram event={event} />}
        {activeTab === 'mese' && <TabMese event={event} onOpenDashboard={() => setShowSeatingDashboard(true)} />}
      </div>

      <button onClick={handleReset}
        className="text-xs text-stone-400 hover:text-stone-600 transition-colors underline underline-offset-4">
        Ieși din portal
      </button>

      {showSeatingDashboard && (
        <SeatingDashboard event={event} onClose={() => setShowSeatingDashboard(false)} />
      )}
    </div>
  );
}
