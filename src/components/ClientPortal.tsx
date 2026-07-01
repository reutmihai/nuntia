import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { ConfirmedEvent, MenuData, MenuOption, ScheduleItem, CourseKey, SeatingTableLayout } from '../types';
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
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-full bg-white border border-rose-100 rounded-xl px-1 py-4 sm:py-6 text-center shadow-sm">
        <span className="text-3xl sm:text-5xl font-light text-rose-700 tabular-nums leading-none">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] text-stone-500 font-semibold">{label}</span>
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
      <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 text-center font-semibold">Timp rămas până la nuntă</p>
      <div className="grid grid-cols-4 gap-2 sm:gap-4">
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
    } finally { setSaving(false); }
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
      <p className="text-xs text-stone-400 uppercase tracking-widest animate-pulse">Se încarcă meniul...</p>
    </div>
  );

  const hasAnyOptions = menuOptions.length > 0;
  const selectOption = (key: CourseKey, title: string) =>
    setMenu(prev => ({ ...prev, [key]: prev[key] === title ? '' : title }));

  return (
    <div className="space-y-4">
      {!hasAnyOptions ? (
        <div className="bg-white border border-dashed border-stone-200 rounded-2xl p-10 text-center space-y-2">
          <p className="text-stone-600 text-sm">Opțiunile de meniu</p>
          <p className="text-stone-500 text-xs leading-relaxed">
            Echipa noastră va adăuga în curând variantele de meniu din care poți alege.
          </p>
        </div>
      ) : (
        COURSES.map(({ key, label, hint }, idx) => {
          const courseOptions = menuOptions.filter(o => o.course === key);
          const selected = menu[key];
          return (
            <div key={key} className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-stone-100 rounded-full flex items-center justify-center text-stone-600 text-xs font-semibold shrink-0">
                  {idx + 1}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-stone-700 font-semibold">{label}</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">{hint}</p>
                </div>
                {selected && (
                  <span className="ml-auto text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
                    ✓ Ales
                  </span>
                )}
              </div>

              {courseOptions.length === 0 ? (
                <p className="text-xs text-stone-400 italic px-1">Va fi completat de echipă.</p>
              ) : (
                <div className="space-y-2">
                  {courseOptions.map(opt => {
                    const isSelected = selected === opt.title;
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-stone-50 border-stone-200 hover:bg-white hover:border-stone-300'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-stone-300'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <input type="radio" className="sr-only" checked={isSelected} onChange={() => selectOption(key, opt.title)} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold leading-snug ${isSelected ? 'text-stone-900' : 'text-stone-700'}`}>
                            {opt.title}
                          </p>
                          {opt.description && (
                            <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{opt.description}</p>
                          )}
                        </div>
                        {opt.pricePerPerson !== undefined && (
                          <span className="text-xs font-semibold shrink-0 px-2 py-1 rounded-lg bg-stone-100 border border-stone-200 text-stone-600">
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
          className="w-full py-4 rounded-xl font-semibold uppercase tracking-widest text-xs transition-colors disabled:opacity-60 bg-stone-900 text-white hover:bg-stone-800">
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
          <p className="text-stone-500 text-sm">Niciun moment adăugat încă.</p>
          <p className="text-stone-400 text-xs mt-1">Adaugă primul moment al zilei mai jos.</p>
        </div>
      ) : (
        <div className="relative space-y-0">
          <div className="absolute left-[34px] top-5 bottom-5 w-px bg-rose-100 -z-0" />
          {items.map((item, idx) => (
            <div key={item.id} className="flex items-start gap-3 sm:gap-4 relative z-10 pb-3 last:pb-0">
              <div className="w-16 sm:w-[68px] bg-rose-50 border border-rose-100 text-rose-700 font-mono text-xs font-semibold px-2 py-2 rounded-lg text-center shrink-0">
                {item.ora}
              </div>
              <div className="flex-1 min-w-0 bg-white border border-stone-200 rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between gap-2 mt-0.5">
                <p className="text-sm text-stone-800 leading-snug break-words min-w-0">{item.descriere}</p>
                <button
                  onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                  className="text-stone-300 hover:text-red-400 transition-colors text-xl leading-none shrink-0 ml-1"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add moment — stacked layout prevents overflow on narrow screens */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
        <p className="text-xs uppercase tracking-wider text-stone-600 font-semibold">Adaugă moment</p>
        <div className="flex gap-2">
          <input
            type="time"
            value={newOra}
            onChange={e => setNewOra(e.target.value)}
            className="w-28 shrink-0 bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-stone-400 transition-colors"
          />
          <input
            type="text"
            value={newDescriere}
            onChange={e => setNewDescriere(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="ex: Sosirea invitaților"
            className="flex-1 min-w-0 bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-stone-400 placeholder:text-stone-400 transition-colors"
          />
        </div>
        <button
          onClick={addItem}
          disabled={!newOra || !newDescriere.trim()}
          className="w-full bg-stone-900 text-white py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-stone-800 transition-colors disabled:opacity-40"
        >
          + Adaugă
        </button>
      </div>

      <button
        onClick={() => save(items)}
        disabled={saving}
        className="w-full py-4 rounded-xl font-semibold uppercase tracking-widest text-xs transition-colors disabled:opacity-60 bg-stone-900 text-white hover:bg-stone-800"
      >
        {saving ? 'Se salvează...' : saved ? '✓ Salvat' : 'Salvează Programul'}
      </button>
    </div>
  );
}

// ─── Tab: Detalii ─────────────────────────────────────────────────────────────

function TabDetalii({ event }: { event: ConfirmedEvent }) {
  const totalEstimate = event.pricePerMeniu ? event.pricePerMeniu * event.guests : null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Data', value: event.date, mono: true },
          { label: 'Salon', value: event.salonName },
          { label: 'Invitați', value: `${event.guests} pers.` },
          { label: 'Preț Meniu', value: event.pricePerMeniu ? `${event.pricePerMeniu} € / pers` : 'Nespecificat' },
        ].map(({ label, value, mono }) => (
          <div key={label} className="bg-white border border-stone-200 rounded-2xl p-4 space-y-1.5 shadow-sm">
            <p className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">{label}</p>
            <p className={`font-semibold text-sm text-stone-900 ${mono ? 'font-mono' : ''}`}>{value}</p>
          </div>
        ))}
      </div>

      {totalEstimate && (
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 flex justify-between items-center shadow-sm">
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Estimare Totală</p>
            <p className="text-xs text-stone-400">{event.guests} pers. × {event.pricePerMeniu} €</p>
          </div>
          <p className="text-2xl font-light text-stone-900">{totalEstimate.toLocaleString('ro-RO')} €</p>
        </div>
      )}

      {event.extraServices.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-wider text-stone-600 font-semibold">Servicii Extra Incluse</p>
          <div className="flex flex-wrap gap-2">
            {event.extraServices.map((s, i) => (
              <span key={i} className="bg-stone-100 border border-stone-200 text-stone-700 px-3 py-1.5 rounded-xl text-xs font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-3">
        <p className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Contact</p>
        <div className="flex justify-between items-center text-sm">
          <span className="text-stone-500">Telefon</span>
          <span className="text-stone-900 font-mono font-semibold">{event.phone}</span>
        </div>
        {event.email && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-stone-500">Email</span>
            <span className="text-stone-900 text-xs sm:text-sm break-all">{event.email}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Portal ──────────────────────────────────────────────────────────────

type TabId = 'detalii' | 'meniu' | 'program' | 'mese';

const TABS: { id: TabId; label: string; mobileLabel: string }[] = [
  { id: 'detalii', label: 'Detalii', mobileLabel: 'Detalii' },
  { id: 'meniu', label: 'Meniu', mobileLabel: 'Meniu' },
  { id: 'program', label: 'Programul Zilei', mobileLabel: 'Program' },
  { id: 'mese', label: 'Aranjament Mese', mobileLabel: 'Mese' },
];

export default function ClientPortal() {
  const [codeInput, setCodeInput] = useState('');
  const [event, setEvent] = useState<ConfirmedEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('detalii');

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) { setCodeInput(code); lookupEvent(code); }
  }, []);

  const lookupEvent = async (code: string) => {
    setIsLoading(true); setError(''); setHasSearched(true);
    try {
      const { data, error: dbError } = await supabase
        .from('confirmed_events').select('*').eq('access_code', code.trim()).single();
      if (dbError || !data) { setEvent(null); setError('Cod de acces invalid sau inexistent.'); return; }
      setEvent({
        id: data.id, date: data.date, clientName: data.client_name,
        guests: data.guests, phone: data.phone, email: data.email || '',
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
      <p className="text-sm uppercase tracking-widest text-stone-500 animate-pulse">Se verifică codul de acces...</p>
    </div>
  );

  if (!event) return (
    <div className="max-w-md mx-auto py-12 sm:py-16">
      <div className="text-center mb-8 space-y-3">
        <div className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-3xl">
          💍
        </div>
        <h2 className="text-2xl font-semibold text-stone-900 tracking-tight">Portal Clienți</h2>
        <p className="text-sm text-stone-500 leading-relaxed max-w-xs mx-auto">
          Spațiul tău privat pentru a urmări și organiza toate detaliile nunții.
        </p>
      </div>

      <form onSubmit={e => { e.preventDefault(); if (codeInput.trim()) lookupEvent(codeInput.trim()); }}
        className="bg-white border border-stone-200 p-6 sm:p-8 rounded-3xl space-y-5 shadow-xl">
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3.5">
          <span className="text-rose-400 mt-0.5 shrink-0">✉️</span>
          <p className="text-xs text-stone-600 leading-relaxed">
            Codul de acces a fost trimis pe adresa ta de email imediat după confirmare.
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-stone-600 font-semibold block mb-2">Cod de Acces</label>
          <input
            type="text" value={codeInput} onChange={e => setCodeInput(e.target.value)}
            placeholder="ex: andrei-maria-x7k2p9ab"
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5 text-sm text-stone-900 font-mono focus:outline-none focus:border-stone-400 placeholder:text-stone-400 transition-colors"
          />
          {hasSearched && error && <p className="text-red-500 text-sm pt-1">{error}</p>}
        </div>
        <button type="submit"
          className="w-full bg-stone-900 text-white py-4 rounded-xl font-semibold uppercase tracking-widest text-xs hover:bg-stone-800 transition-colors">
          Accesează Portalul
        </button>
        <p className="text-center text-xs text-stone-400 pt-1">Nu ai primit codul? Contactează-ne la recepție.</p>
      </form>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5 sm:space-y-8 py-4 sm:py-8">

      {/* ── Welcome header ── */}
      <div className="space-y-1 px-1">
        <p className="text-[10px] uppercase tracking-widest text-stone-500 font-semibold">Bun venit,</p>
        <h2 className="text-2xl sm:text-3xl font-semibold text-stone-900 leading-tight">{event.clientName}</h2>
        <p className="text-sm text-stone-500 leading-relaxed mt-1">
          Mai jos găsești și poți organiza toate detaliile evenimentului tău.
        </p>
      </div>

      {/* ── Countdown ── */}
      <div className="bg-gradient-to-br from-rose-50 to-amber-50/40 border border-rose-100 rounded-3xl p-5 sm:p-8 shadow-sm">
        <Countdown dateStr={event.date} />
      </div>

      {/* ── Tabs ── */}
      <div className="space-y-5">

        {/* Segmented control — all 4 always visible, no scrolling needed */}
        <div className="sticky top-14 z-20 -mx-4 sm:mx-0 px-3 sm:px-0 pt-2 pb-3 bg-white/95 backdrop-blur-sm">
          <div className="grid grid-cols-4 gap-1 bg-stone-100 rounded-2xl p-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2.5 sm:py-3 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-stone-900 shadow-sm font-semibold'
                    : 'text-stone-500 hover:text-stone-700 font-medium'
                }`}
              >
                <span className="block sm:hidden text-[10px] uppercase tracking-wide">{tab.mobileLabel}</span>
                <span className="hidden sm:block text-[11px] uppercase tracking-wide">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'detalii' && <TabDetalii event={event} />}
        {activeTab === 'meniu' && <TabMeniu event={event} />}
        {activeTab === 'program' && <TabProgram event={event} />}
      </div>

      <button onClick={handleReset}
        className="text-xs text-stone-400 hover:text-stone-600 transition-colors underline underline-offset-4">
        Ieși din portal
      </button>

      {activeTab === 'mese' && (
        <SeatingDashboard event={event} onClose={() => setActiveTab('detalii')} />
      )}
    </div>
  );
}
