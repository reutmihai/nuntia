import { ConfirmedEvent } from '../App';

interface ConfirmedEventsProps {
  confirmedEvents: (ConfirmedEvent & { pricePerMeniu?: number })[];
  onCancelEvent: (id: string) => void;
}

export default function ConfirmedEvents({ confirmedEvents, onCancelEvent }: ConfirmedEventsProps) {
  return (
    <div className="bg-zinc-900/60 border border-white/10 p-6 rounded-3xl space-y-6 shadow-lg backdrop-blur-sm">
      <div>
        <h3 className="text-lg uppercase tracking-wider font-light text-white">
          Gestiune Contracte & Date Ocupate ({confirmedEvents.length})
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          Vizualizează evenimentele confirmate, prețul final negociat sau eliberează datele din calendar.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto max-h-[580px] pr-1">
        {confirmedEvents.length === 0 ? (
          <p className="text-xs text-zinc-500 italic py-4 text-center col-span-2">
            Nu există nicio nuntă confirmată în calendar.
          </p>
        ) : (
          confirmedEvents.map(event => (
            <div key={event.id} className="bg-black/40 border border-white/5 p-4 rounded-2xl flex flex-col justify-between gap-5 border-l-2 border-l-emerald-500 transition-all hover:border-l-white">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white font-semibold font-mono">📅 {event.date}</span>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/40">
                    Confirmat
                  </span>
                </div>
                <h4 className="text-white text-base font-light tracking-wide uppercase pt-1">
                  {event.clientName}
                </h4>
                <div className="space-y-1 pt-1 border-t border-white/5">
                  <p className="text-xs text-zinc-300 font-medium">👥 Dimensiune: {event.guests} invitați</p>
                  <p className="text-xs text-zinc-300 font-medium">
                    💰 Meniu agreat: <span className="text-emerald-400 font-semibold">{event.pricePerMeniu ? `${event.pricePerMeniu} € / pers` : 'În curs de stabilire'}</span>
                  </p>
                  <p className="text-xs text-zinc-300 font-medium flex items-center gap-1.5">
                    <span>📞 Contact:</span> 
                    <span className="text-white font-mono font-semibold">{event.phone}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                <a 
                  href={`tel:${event.phone}`}
                  className="w-full bg-white text-black hover:bg-zinc-200 py-2.5 rounded-xl uppercase tracking-widest text-[10px] font-bold text-center block transition-colors"
                >
                  📞 Contactează Mirii
                </a>
                <button 
                  onClick={() => onCancelEvent(event.id)}
                  className="w-full bg-transparent border border-red-900/40 hover:border-red-500/50 text-red-400 hover:text-red-300 py-2 rounded-xl uppercase tracking-widest text-[9px] transition-all font-bold"
                >
                  🚫 Anulează Contract
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}