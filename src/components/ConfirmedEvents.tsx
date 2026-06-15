import type { ConfirmedEvent } from '../types';

interface ConfirmedEventsProps {
  confirmedEvents: ConfirmedEvent[];
  onCancelEvent: (id: string) => void;
}

export default function ConfirmedEvents({ confirmedEvents, onCancelEvent }: ConfirmedEventsProps) {
  return (
    <div className="bg-zinc-900/60 border border-white/10 p-6 rounded-3xl space-y-6 shadow-lg backdrop-blur-sm">
      <div>
        <h3 className="text-lg uppercase tracking-wider font-light text-white">
          Evenimente Confirmate ({confirmedEvents.length})
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          Contracte semnate și date blocate definitiv în calendar.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/40">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-zinc-950 text-zinc-400 uppercase tracking-wider text-[10px]">
              <th className="p-4 font-medium">Dată / Salon</th>
              <th className="p-4 font-medium">Client / Contact</th>
              <th className="p-4 font-medium text-center">Invitați</th>
              <th className="p-4 font-medium">Preț Meniu</th>
              <th className="p-4 font-medium">Servicii Extra</th>
              <th className="p-4 font-medium text-right">Acțiuni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {confirmedEvents.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-500 italic">
                  Niciun eveniment confirmat în listă.
                </td>
              </tr>
            ) : (
              confirmedEvents.map((event) => (
                <tr key={event.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 whitespace-nowrap">
                    <span className="bg-zinc-800 text-white font-mono px-2.5 py-1 rounded-lg border border-white/10 text-[11px] block w-fit">
                      {event.date}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-zinc-900 border border-white/5 text-zinc-400 rounded mt-1.5 inline-block">
                      {event.salonName}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="font-semibold text-white text-sm">{event.clientName}</div>
                    <div className="text-zinc-400 font-mono mt-0.5">{event.phone}</div>
                  </td>

                  <td className="p-4 text-center font-medium text-zinc-300 whitespace-nowrap">
                    {event.guests} pers.
                  </td>

                  <td className="p-4 font-semibold text-emerald-400 whitespace-nowrap">
                    {event.pricePerMeniu ? `${event.pricePerMeniu} € / pers` : 'Nespecificat'}
                  </td>

                  <td className="p-4 max-w-[200px]">
                    {event.extraServices && event.extraServices.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {event.extraServices.map((service, idx) => (
                          <span
                            key={idx}
                            className="bg-zinc-950 border border-white/5 text-zinc-400 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-zinc-600 italic text-[11px]">Fără extra opțiuni</span>
                    )}
                  </td>

                  <td className="p-4 text-right">
                    <button
                      onClick={() => onCancelEvent(event.id)}
                      className="bg-zinc-950 hover:bg-red-950/40 border border-white/10 hover:border-red-900/50 text-zinc-400 hover:text-red-400 px-3 py-1.5 rounded-xl transition-all uppercase tracking-wider text-[10px]"
                    >
                      Anulează
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
