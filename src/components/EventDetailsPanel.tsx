import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { ConfirmedEvent, MenuData, MenuOption, ScheduleItem, MesaItem, CourseKey } from '../types';

const COURSES: { key: CourseKey; label: string; hint: string }[] = [
  { key: 'felul1', label: 'Felul 1', hint: 'Aperitive / Ciorbă' },
  { key: 'felul2', label: 'Felul 2', hint: 'Antreu' },
  { key: 'felul3', label: 'Felul 3', hint: 'Felul principal' },
  { key: 'felul4', label: 'Felul 4', hint: 'Desert / Tort' },
];

function normalizeMenuData(raw: unknown): MenuData {
  const empty: MenuData = { felul1: '', felul2: '', felul3: '', felul4: '' };
  if (!raw || typeof raw !== 'object') return empty;
  const r = raw as Record<string, unknown>;
  const str = (val: unknown): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return (val as { clientSelection?: string }).clientSelection ?? '';
    return '';
  };
  return { felul1: str(r.felul1), felul2: str(r.felul2), felul3: str(r.felul3), felul4: str(r.felul4) };
}

function mapRow(data: Record<string, unknown>): ConfirmedEvent {
  return {
    id: data.id as string,
    date: data.date as string,
    clientName: data.client_name as string,
    guests: data.guests as number,
    phone: data.phone as string,
    email: (data.email as string) || '',
    pricePerMeniu: data.price_per_meniu as number | undefined,
    salonName: (data.salon_name as string) || 'Grand Salon',
    extraServices: (data.extra_services as string[]) || [],
    accessCode: data.access_code as string | undefined,
    menuData: normalizeMenuData(data.menu_data),
    scheduleData: (data.schedule_data as ScheduleItem[]) || [],
    tablesData: (data.tables_data as MesaItem[]) || [],
  };
}

// ─── View: Meniu ──────────────────────────────────────────────────────────────

function ViewMeniu({ event }: { event: ConfirmedEvent }) {
  const [menuOptions, setMenuOptions] = useState<MenuOption[]>([]);

  useEffect(() => {
    supabase.from('menu_options').select('*').order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMenuOptions(data.map(r => ({
          id: r.id, course: r.course as CourseKey, title: r.title,
          description: r.description ?? undefined, pricePerPerson: r.price_per_person ?? undefined,
        })));
      });
  }, []);

  const menu = event.menuData;
  const hasSelections = menu && Object.values(menu).some(Boolean);

  return (
    <div className="space-y-4">
      {!hasSelections ? (
        <div className="bg-stone-50 border border-dashed border-stone-200 rounded-2xl p-10 text-center">
          <p className="text-stone-300 text-xs">Clientul nu a selectat niciun meniu încă.</p>
        </div>
      ) : (
        COURSES.map(({ key, label, hint }, idx) => {
          const selected = menu?.[key] || '';
          const option = menuOptions.find(o => o.course === key && o.title === selected);
          return (
            <div key={key} className="bg-white border border-stone-100 rounded-2xl p-5 space-y-2 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-stone-50 border border-stone-200 rounded-full flex items-center justify-center text-stone-500 text-xs shrink-0">
                  {idx + 1}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold">{label}</p>
                  <p className="text-[10px] text-stone-300">{hint}</p>
                </div>
              </div>
              {selected ? (
                <div className="flex items-start justify-between gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">{selected}</p>
                    {option?.description && <p className="text-[11px] text-emerald-600 mt-0.5">{option.description}</p>}
                  </div>
                  <span className="text-emerald-500 text-lg shrink-0">✓</span>
                </div>
              ) : (
                <p className="text-[11px] text-stone-300 italic px-1">Neselectat.</p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── View: Program ────────────────────────────────────────────────────────────

function ViewProgram({ event }: { event: ConfirmedEvent }) {
  const items = event.scheduleData ?? [];
  if (items.length === 0) return (
    <div className="bg-stone-50 border border-dashed border-stone-200 rounded-2xl p-10 text-center">
      <p className="text-stone-300 text-xs">Clientul nu a completat programul zilei încă.</p>
    </div>
  );
  return (
    <div className="relative space-y-0">
      <div className="absolute left-[34px] top-5 bottom-5 w-px bg-rose-100" />
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-4 relative z-10 pb-3 last:pb-0">
          <div className="w-[68px] bg-rose-50 border border-rose-100 text-rose-700 font-mono text-xs font-semibold px-2 py-1.5 rounded-lg text-center shrink-0">
            {item.ora}
          </div>
          <div className="flex-1 bg-white border border-stone-100 rounded-2xl px-4 py-3 shadow-sm mt-0.5">
            <p className="text-sm text-stone-800">{item.descriere}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── View: Mese ───────────────────────────────────────────────────────────────

function ViewMese({ event }: { event: ConfirmedEvent }) {
  const tables = event.tablesData ?? [];
  const totalGuests = tables.reduce((s, t) => s + t.invitati.length, 0);

  if (tables.length === 0) return (
    <div className="bg-stone-50 border border-dashed border-stone-200 rounded-2xl p-10 text-center">
      <p className="text-stone-300 text-xs">Clientul nu a completat aranjamentul meselor încă.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between px-1">
        <p className="text-[10px] uppercase tracking-widest text-stone-400">{tables.length} mese</p>
        <p className="text-[10px] uppercase tracking-widest text-stone-400">{totalGuests} invitați plasați</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tables.map(table => (
          <div key={table.id} className="bg-white border border-stone-100 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-stone-900 text-sm">{table.masa}</p>
              <span className="text-[10px] text-stone-400 bg-stone-50 border border-stone-100 px-2 py-0.5 rounded-full">
                {table.invitati.length} pers.
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {table.invitati.map((guest, idx) => (
                <span key={idx} className="bg-rose-50 border border-rose-100 text-rose-700 px-2.5 py-1 rounded-full text-xs">
                  {guest}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────

type AdminTab = 'meniu' | 'program' | 'mese';

const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: 'meniu', label: 'Meniu ales' },
  { id: 'program', label: 'Programul Zilei' },
  { id: 'mese', label: 'Aranjament Mese' },
];

interface Props { eventId: string; onClose: () => void; }

export default function EventDetailsPanel({ eventId, onClose }: Props) {
  const [event, setEvent] = useState<ConfirmedEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('meniu');

  useEffect(() => {
    supabase.from('confirmed_events').select('*').eq('id', eventId).single()
      .then(({ data }) => {
        if (data) setEvent(mapRow(data as Record<string, unknown>));
        setLoading(false);
      });
  }, [eventId]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-0 sm:py-6 px-0 sm:px-4">
      <div className="bg-white sm:rounded-3xl shadow-2xl w-full max-w-2xl min-h-screen sm:min-h-0">

        <div className="flex items-start justify-between p-6 border-b border-stone-100">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-1">Vizualizare eveniment</p>
            <h3 className="text-xl font-extralight uppercase tracking-wider text-stone-900">
              {loading ? '...' : event?.clientName}
            </h3>
            {!loading && event && (
              <p className="text-xs text-stone-400 font-mono mt-0.5">{event.date} · {event.salonName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-stone-200 text-stone-400 hover:text-stone-700 hover:border-stone-300 transition-colors text-lg"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <p className="text-xs text-stone-400 uppercase tracking-widest animate-pulse">Se încarcă...</p>
          </div>
        ) : event ? (
          <div className="p-6 space-y-5">
            <div className="flex border-b border-stone-100 overflow-x-auto">
              {ADMIN_TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-[11px] uppercase tracking-widest font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                    activeTab === tab.id ? 'border-rose-600 text-rose-700' : 'border-transparent text-stone-400 hover:text-stone-600'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
            {activeTab === 'meniu' && <ViewMeniu event={event} />}
            {activeTab === 'program' && <ViewProgram event={event} />}
            {activeTab === 'mese' && <ViewMese event={event} />}
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-xs text-red-400">Evenimentul nu a putut fi încărcat.</p>
          </div>
        )}
      </div>
    </div>
  );
}
