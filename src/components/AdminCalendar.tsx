import { useState } from 'react';
import type { ConfirmedEvent } from '../types';
import EventDetailsPanel from './EventDetailsPanel';

const MONTHS = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
];
const DAYS = ['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm', 'Dum'];

interface Props { confirmedEvents: ConfirmedEvent[]; }

export default function AdminCalendar({ confirmedEvents }: Props) {
  const todayDate = new Date();
  const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
  const [year, setYear] = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth()); // 0-indexed
  const [managingEventId, setManagingEventId] = useState<string | null>(null);

  const goBack = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const goFwd = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const goToday = () => { setYear(todayDate.getFullYear()); setMonth(todayDate.getMonth()); };

  // Build date → events map for current year/month
  const eventsInMonth: Map<string, ConfirmedEvent[]> = new Map();
  confirmedEvents.forEach(e => {
    if (!e.date) return;
    const [ey, em] = e.date.split('-').map(Number);
    if (ey === year && em - 1 === month) {
      const prev = eventsInMonth.get(e.date) ?? [];
      eventsInMonth.set(e.date, [...prev, e]);
    }
  });

  // Grid: Mon-first. Pad start with nulls, pad end to complete last week.
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // getDay(): 0=Sun,1=Mon... convert to Mon=0..Sun=6
  const startPad = (firstDay.getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const trailingPad = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < trailingPad; i++) cells.push(null);

  return (
    <div className="bg-white border border-stone-100 rounded-3xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <h3 className="text-lg uppercase tracking-wider font-light text-stone-900">
            {MONTHS[month]} {year}
          </h3>
          {(year !== todayDate.getFullYear() || month !== todayDate.getMonth()) && (
            <button onClick={goToday}
              className="text-[10px] uppercase tracking-widest text-rose-500 border border-rose-100 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors">
              Azi
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={goBack}
            className="w-8 h-8 rounded-xl border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50 transition-colors text-sm">
            ‹
          </button>
          <button onClick={goFwd}
            className="w-8 h-8 rounded-xl border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50 transition-colors text-sm">
            ›
          </button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 border-b border-stone-100">
        {DAYS.map(d => (
          <div key={d} className="py-2.5 text-center text-[10px] uppercase tracking-widest font-semibold text-stone-400">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) return <div key={`pad-${idx}`} className="aspect-square border-r border-b border-stone-50 bg-stone-50/40" />;

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const events = eventsInMonth.get(dateStr) ?? [];
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;
          const hasEvent = events.length > 0;

          return (
            <div
              key={day}
              onClick={() => { if (hasEvent && events[0]) setManagingEventId(events[0].id); }}
              className={`relative border-r border-b border-stone-100 p-1.5 sm:p-2 min-h-[56px] sm:min-h-[72px] flex flex-col transition-colors ${
                hasEvent
                  ? 'cursor-pointer hover:bg-rose-50/60 bg-rose-50/30'
                  : isPast
                  ? 'bg-stone-50/50'
                  : 'hover:bg-stone-50/50'
              }`}
            >
              {/* Day number */}
              <div className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-[11px] sm:text-xs font-semibold transition-colors ${
                isToday
                  ? 'bg-rose-600 text-white shadow-md'
                  : hasEvent
                  ? 'text-rose-700'
                  : isPast
                  ? 'text-stone-300'
                  : 'text-stone-500'
              }`}>
                {day}
              </div>

              {/* Event chips */}
              {events.map((e, i) => (
                <div key={e.id} className={`mt-1 hidden sm:block ${i > 1 ? 'hidden' : ''}`}>
                  <div className={`text-[9px] leading-tight rounded px-1 py-0.5 truncate font-medium ${
                    isPast
                      ? 'bg-stone-100 text-stone-400'
                      : 'bg-rose-100 text-rose-700 border border-rose-200'
                  }`}>
                    {e.clientName}
                  </div>
                </div>
              ))}
              {events.length > 2 && (
                <div className="text-[9px] text-rose-400 font-semibold px-1 hidden sm:block">+{events.length - 2}</div>
              )}

              {/* Mobile: just a dot */}
              {hasEvent && (
                <div className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full sm:hidden ${isPast ? 'bg-stone-300' : 'bg-rose-500'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-3 border-t border-stone-100 bg-stone-50/50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-600" />
          <span className="text-[10px] uppercase tracking-widest text-stone-400">Azi</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-rose-100 border border-rose-200" />
          <span className="text-[10px] uppercase tracking-widest text-stone-400">Ocupat</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-stone-100 border border-stone-200" />
          <span className="text-[10px] uppercase tracking-widest text-stone-400">Trecut</span>
        </div>
        <span className="text-[10px] text-stone-300 ml-auto hidden sm:block">Click pe o dată pentru detalii</span>
      </div>

      {managingEventId && (
        <EventDetailsPanel eventId={managingEventId} onClose={() => setManagingEventId(null)} />
      )}
    </div>
  );
}
