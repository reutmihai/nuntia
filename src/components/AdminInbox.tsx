import type { BookingRequest } from '../types';

interface AdminInboxProps {
  bookingRequests: BookingRequest[];
  onApprove: (req: BookingRequest) => void;
  onReject: (id: string) => void;
}

export default function AdminInbox({ bookingRequests, onApprove, onReject }: AdminInboxProps) {
  return (
    <div className="bg-zinc-900/60 border border-white/10 p-6 rounded-3xl space-y-5 shadow-lg backdrop-blur-sm">
      <div>
        <h3 className="text-lg uppercase tracking-wider font-light text-white">
          Inbox Cereri Ofertă ({bookingRequests.length})
        </h3>
        <p className="text-xs text-zinc-400 mt-1">Solicitări proaspete trimise de utilizatori.</p>
      </div>

      <div className="space-y-4 overflow-y-auto max-h-[600px] pr-1">
        {bookingRequests.length === 0 ? (
          <p className="text-xs text-zinc-500 italic py-4 text-center">Nicio cerere nouă în inbox.</p>
        ) : (
          bookingRequests.map(req => (
            <div key={req.id} className="bg-black/50 border border-white/5 p-4 rounded-2xl space-y-3 text-xs">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-white font-semibold text-sm">{req.clientName}</h4>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-zinc-800 border border-white/10 text-zinc-300 rounded-md">
                      {req.salonName || 'Nespecificat'}
                    </span>
                  </div>
                  <p className="text-zinc-400 mt-1 font-medium">📞 {req.phone}</p>
                </div>
                <span className="bg-zinc-800 text-white font-mono px-2.5 py-1 rounded-lg border border-white/10 whitespace-nowrap">
                  {req.date}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] bg-zinc-950 p-2.5 rounded-xl border border-white/5">
                <div>
                  <span className="text-zinc-400 block font-light">Invitați:</span>
                  <span className="text-white font-semibold">{req.guests} pers.</span>
                </div>
                <div>
                  <span className="text-zinc-400 block font-light">Meniu:</span>
                  <span className="text-white font-semibold">{req.menuPreference}</span>
                </div>

                {req.extraServices && req.extraServices.length > 0 && (
                  <div className="col-span-2 mt-1 pt-2 border-t border-white/5">
                    <span className="text-zinc-400 block font-light mb-1">Servicii Extra:</span>
                    <div className="flex flex-wrap gap-1">
                      {req.extraServices.map((service, idx) => (
                        <span key={idx} className="bg-zinc-900 border border-white/5 text-zinc-400 px-2 py-0.5 rounded text-[10px]">
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="col-span-2 mt-1 pt-1 border-t border-white/5">
                  <span className="text-zinc-400 font-light">Buget Estimat:</span>
                  <span className="text-emerald-400 font-bold block">{req.estimatedBudget}</span>
                </div>
              </div>

              {req.message && (
                <p className="text-zinc-300 italic bg-zinc-950 p-2.5 rounded-xl border border-dashed border-white/10">
                  "{req.message}"
                </p>
              )}

              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={() => onReject(req.id)}
                  className="flex-1 bg-red-950/40 border border-red-900/50 text-red-300 py-2.5 rounded-xl uppercase tracking-widest text-[10px] hover:bg-red-900/40 transition-colors font-medium"
                >
                  Refuză
                </button>
                <button
                  onClick={() => onApprove(req)}
                  className="flex-1 bg-green-500 text-black font-bold py-2.5 rounded-xl uppercase tracking-widest text-[10px] hover:bg-zinc-200 transition-colors"
                >
                  Aprobă
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
