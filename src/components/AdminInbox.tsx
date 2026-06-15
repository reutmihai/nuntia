import type { BookingRequest } from '../types';

interface AdminInboxProps {
  bookingRequests: BookingRequest[];
  onApprove: (req: BookingRequest) => void;
  onReject: (id: string) => void;
}

export default function AdminInbox({ bookingRequests, onApprove, onReject }: AdminInboxProps) {
  return (
    <div className="bg-white border border-stone-100 p-6 rounded-3xl space-y-5 shadow-lg">
      <div>
        <h3 className="text-lg uppercase tracking-wider font-light text-stone-900">
          Inbox ({bookingRequests.length})
        </h3>
        <p className="text-xs text-stone-400 mt-1">Solicitări proaspete trimise de utilizatori.</p>
      </div>

      <div className="space-y-4 overflow-y-auto max-h-[600px] pr-1">
        {bookingRequests.length === 0 ? (
          <p className="text-xs text-stone-400 italic py-8 text-center">Nicio cerere nouă în inbox.</p>
        ) : (
          bookingRequests.map(req => (
            <div key={req.id} className="bg-stone-50 border border-stone-100 p-4 rounded-2xl space-y-3 text-xs hover:border-rose-100 transition-colors">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-stone-900 font-semibold text-sm">{req.clientName}</h4>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-md">
                      {req.salonName || 'Nespecificat'}
                    </span>
                  </div>
                  <p className="text-stone-400 mt-1 font-medium">📞 {req.phone}</p>
                </div>
                <span className="bg-rose-50 text-rose-700 font-mono px-2.5 py-1 rounded-lg border border-rose-100 whitespace-nowrap text-[11px]">
                  {req.date}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2.5 rounded-xl border border-stone-100">
                <div>
                  <span className="text-stone-400 block font-light">Invitați:</span>
                  <span className="text-stone-800 font-semibold">{req.guests} pers.</span>
                </div>
                <div>
                  <span className="text-stone-400 block font-light">Meniu:</span>
                  <span className="text-stone-800 font-semibold">{req.menuPreference}</span>
                </div>

                {req.extraServices && req.extraServices.length > 0 && (
                  <div className="col-span-2 mt-1 pt-2 border-t border-stone-100">
                    <span className="text-stone-400 block font-light mb-1">Servicii Extra:</span>
                    <div className="flex flex-wrap gap-1">
                      {req.extraServices.map((service, idx) => (
                        <span key={idx} className="bg-rose-50 border border-rose-100 text-rose-600 px-2 py-0.5 rounded text-[10px]">
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="col-span-2 mt-1 pt-1 border-t border-stone-100">
                  <span className="text-stone-400 font-light">Buget Estimat:</span>
                  <span className="text-emerald-600 font-bold block">{req.estimatedBudget}</span>
                </div>
              </div>

              {req.message && (
                <p className="text-stone-600 italic bg-white p-2.5 rounded-xl border border-dashed border-stone-200">
                  "{req.message}"
                </p>
              )}

              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={() => onReject(req.id)}
                  className="flex-1 bg-red-50 border border-red-200 text-red-500 py-2.5 rounded-xl uppercase tracking-widest text-[10px] hover:bg-red-100 transition-colors font-medium"
                >
                  Refuză
                </button>
                <button
                  onClick={() => onApprove(req)}
                  className="flex-1 bg-emerald-600 text-white font-bold py-2.5 rounded-xl uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition-colors"
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
