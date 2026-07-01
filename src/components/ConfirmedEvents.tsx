import { useState } from 'react';
import type { ConfirmedEvent } from '../types';
import EventDetailsPanel from './EventDetailsPanel';
import AdminCalendar from './AdminCalendar';

type ViewMode = 'list' | 'calendar';

interface ConfirmedEventsProps {
  confirmedEvents: ConfirmedEvent[];
  onCancelEvent: (id: string) => void;
}

export default function ConfirmedEvents({ confirmedEvents, onCancelEvent }: ConfirmedEventsProps) {
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [managingEventId, setManagingEventId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const upcoming = confirmedEvents.filter(e => e.date >= todayStr);

  const handleConfirmCancel = (id: string) => {
    onCancelEvent(id);
    setCancelingId(null);
  };

  return (
    <div className="bg-white border border-stone-100 p-6 rounded-3xl space-y-6 shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg uppercase tracking-wider font-light text-stone-900">
            Evenimente Confirmate ({upcoming.length})
          </h3>
          <p className="text-xs text-stone-400 mt-1">
            Contracte semnate și date blocate definitiv în calendar.
          </p>
        </div>
        <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden shrink-0">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 text-[10px] uppercase tracking-widest font-semibold transition-colors ${
              viewMode === 'list' ? 'bg-stone-900 text-white' : 'text-stone-400 hover:bg-stone-50'
            }`}
          >
            Listă
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-2 text-[10px] uppercase tracking-widest font-semibold transition-colors ${
              viewMode === 'calendar' ? 'bg-stone-900 text-white' : 'text-stone-400 hover:bg-stone-50'
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {viewMode === 'calendar' && <AdminCalendar confirmedEvents={confirmedEvents} />}
      {viewMode === 'list' && (

      <div className="overflow-x-auto rounded-2xl border border-stone-100">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50 text-stone-400 uppercase tracking-wider text-[10px]">
              <th className="p-4 font-semibold">Dată / Salon</th>
              <th className="p-4 font-semibold">Miri / Contact</th>
              <th className="p-4 font-semibold text-center">Invitați</th>
              <th className="p-4 font-semibold">Preț Meniu</th>
              <th className="p-4 font-semibold">Servicii Extra</th>
              <th className="p-4 font-semibold text-right">Acțiuni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {upcoming.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-stone-400 italic">
                  Niciun eveniment confirmat în listă.
                </td>
              </tr>
            ) : (
              upcoming.map((event) => {
                const isCanceling = cancelingId === event.id;
                return (
                  <tr
                    key={event.id}
                    className={`transition-colors ${isCanceling ? 'bg-red-50/60' : 'hover:bg-rose-50/20'}`}
                  >
                    <td className="p-4 whitespace-nowrap">
                      <span className="bg-rose-50 text-rose-700 font-mono px-2.5 py-1 rounded-lg border border-rose-100 text-[11px] block w-fit">
                        {event.date}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-stone-100 border border-stone-200 text-stone-500 rounded mt-1.5 inline-block">
                        {event.salonName}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="font-semibold text-stone-900 text-sm">{event.clientName}</div>
                      <div className="text-stone-400 font-mono mt-0.5">{event.phone}</div>
                    </td>

                    <td className="p-4 text-center font-medium text-stone-600 whitespace-nowrap">
                      {event.guests} pers.
                    </td>

                    <td className="p-4 font-semibold text-emerald-600 whitespace-nowrap">
                      {event.pricePerMeniu ? `${event.pricePerMeniu} € / pers` : 'Nespecificat'}
                    </td>

                    <td className="p-4 max-w-[200px]">
                      {event.extraServices && event.extraServices.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {event.extraServices.map((service, idx) => (
                            <span
                              key={idx}
                              className="bg-rose-50 border border-rose-100 text-rose-600 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap"
                            >
                              {service}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-stone-400 italic text-[11px]">—</span>
                      )}
                    </td>

                    <td className="p-4 text-right whitespace-nowrap">
                      {isCanceling ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[10px] text-red-500 uppercase tracking-wider font-medium">Confirmi?</span>
                          <button
                            onClick={() => handleConfirmCancel(event.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-xl transition-all uppercase tracking-wider text-[10px] font-semibold"
                          >
                            Da
                          </button>
                          <button
                            onClick={() => setCancelingId(null)}
                            className="bg-white hover:bg-stone-50 border border-stone-200 text-stone-500 hover:text-stone-700 px-3 py-1.5 rounded-xl transition-all uppercase tracking-wider text-[10px]"
                          >
                            Nu
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setManagingEventId(event.id)}
                            className="bg-white hover:bg-rose-50 border border-stone-200 hover:border-rose-200 text-stone-500 hover:text-rose-600 px-3 py-1.5 rounded-xl transition-all uppercase tracking-wider text-[10px]"
                          >
                            Gestionează
                          </button>
                          <button
                            onClick={() => setCancelingId(event.id)}
                            className="bg-white hover:bg-red-50 border border-stone-200 hover:border-red-200 text-stone-400 hover:text-red-500 px-3 py-1.5 rounded-xl transition-all uppercase tracking-wider text-[10px]"
                          >
                            Anulează
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      )}

      {managingEventId && (
        <EventDetailsPanel
          eventId={managingEventId}
          onClose={() => setManagingEventId(null)}
        />
      )}
    </div>
  );
}
