import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { ConfirmedEvent } from '../types';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

function useCountdown(dateStr: string): TimeLeft {
  const calculate = (): TimeLeft => {
    const eventDate = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    const diff = eventDate.getTime() - now.getTime();

    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      isPast: false
    };
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculate);

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(calculate()), 1000);
    return () => clearInterval(interval);
  }, [dateStr]);

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

  if (isPast) {
    return (
      <div className="text-center py-8">
        <p className="text-rose-600 text-sm uppercase tracking-widest font-medium">Ziua cea mare a sosit! ✨</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-[0.25em] text-stone-400 text-center font-semibold">
        Timp rămas până la nuntă
      </p>
      <div className="grid grid-cols-4 gap-3 sm:gap-4">
        <CountdownUnit value={days} label="Zile" />
        <CountdownUnit value={hours} label="Ore" />
        <CountdownUnit value={minutes} label="Minute" />
        <CountdownUnit value={seconds} label="Secunde" />
      </div>
    </div>
  );
}

export default function ClientPortal() {
  const [codeInput, setCodeInput] = useState('');
  const [event, setEvent] = useState<ConfirmedEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setCodeInput(code);
      lookupEvent(code);
    }
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

      if (dbError || !data) {
        setEvent(null);
        setError('Cod de acces invalid sau inexistent.');
        return;
      }

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
        accessCode: data.access_code
      });
    } catch {
      setError('A apărut o eroare. Încearcă din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (codeInput.trim()) lookupEvent(codeInput.trim());
  };

  const handleReset = () => {
    setEvent(null);
    setCodeInput('');
    setHasSearched(false);
    setError('');
    window.history.replaceState({}, '', window.location.pathname);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-sm uppercase tracking-widest text-stone-400 animate-pulse">
          Se verifică codul de acces...
        </p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-md mx-auto py-16">
        <div className="text-center mb-10 space-y-3">
          <div className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <span className="text-3xl">💍</span>
          </div>
          <h2 className="text-2xl font-extralight uppercase tracking-widest text-stone-900">
            Portal Clienți
          </h2>
          <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto">
            Spațiul tău privat pentru a urmări toate detaliile nunții.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-stone-100 p-8 rounded-3xl space-y-5 shadow-xl"
        >
          {/* Context explicativ */}
          <div className="flex items-start gap-3 bg-rose-50/70 border border-rose-100 rounded-2xl px-4 py-3.5">
            <span className="text-rose-400 mt-0.5 shrink-0">✉️</span>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Codul de acces a fost trimis pe adresa ta de email imediat după ce evenimentul a fost confirmat de echipa noastră.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-stone-500 block mb-2">
              Cod de Acces
            </label>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="ex: abxs243sf9"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5 text-sm text-stone-900 font-mono focus:outline-none focus:border-rose-300 placeholder:text-stone-300 transition-colors"
            />
            {hasSearched && error && (
              <p className="text-red-500 text-xs pt-1">{error}</p>
            )}
          </div>
          <button
            type="submit"
            className="w-full bg-rose-700 text-white py-3.5 rounded-xl font-semibold uppercase tracking-widest text-xs hover:bg-rose-800 transition-colors"
          >
            Accesează Portalul
          </button>

          <p className="text-center text-[10px] text-stone-300 pt-1">
            Nu ai primit codul? Contactează-ne la recepție.
          </p>
        </form>
      </div>
    );
  }

  const totalEstimate = event.pricePerMeniu ? event.pricePerMeniu * event.guests : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 py-4 sm:py-8">

      {/* Header */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-stone-300 font-mono">{event.accessCode}</p>
        <h2 className="text-3xl font-extralight uppercase tracking-widest text-stone-900">{event.clientName}</h2>
        <p className="text-xs text-stone-400">Bun venit! Mai jos găsești toate detaliile evenimentului tău.</p>
      </div>

      {/* Countdown */}
      <div className="bg-gradient-to-br from-rose-50 to-amber-50/40 border border-rose-100 rounded-3xl p-6 sm:p-8 shadow-sm">
        <Countdown dateStr={event.date} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-100 rounded-2xl p-5 space-y-1.5 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-stone-400">Data</p>
          <p className="text-stone-900 font-mono font-semibold text-sm">{event.date}</p>
        </div>
        <div className="bg-white border border-stone-100 rounded-2xl p-5 space-y-1.5 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-stone-400">Salon</p>
          <p className="text-stone-900 font-semibold text-sm">{event.salonName}</p>
        </div>
        <div className="bg-white border border-stone-100 rounded-2xl p-5 space-y-1.5 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-stone-400">Invitați</p>
          <p className="text-stone-900 font-semibold text-sm">{event.guests} pers.</p>
        </div>
        <div className="bg-white border border-stone-100 rounded-2xl p-5 space-y-1.5 shadow-sm">
          <p className="text-[10px] uppercase tracking-widest text-stone-400">Preț Meniu</p>
          <p className="text-emerald-600 font-semibold text-sm">
            {event.pricePerMeniu ? `${event.pricePerMeniu} € / pers` : 'Nespecificat'}
          </p>
        </div>
      </div>

      {/* Budget estimate */}
      {totalEstimate && (
        <div className="bg-white border border-stone-100 rounded-2xl p-5 flex justify-between items-center shadow-sm">
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-widest text-stone-400">Estimare Totală</p>
            <p className="text-xs text-stone-400">{event.guests} pers. × {event.pricePerMeniu} €</p>
          </div>
          <p className="text-2xl font-light text-stone-900">{totalEstimate.toLocaleString('ro-RO')} €</p>
        </div>
      )}

      {/* Extra services */}
      {event.extraServices.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-stone-400">Servicii Extra Incluse</p>
          <div className="flex flex-wrap gap-2">
            {event.extraServices.map((service, idx) => (
              <span
                key={idx}
                className="bg-rose-50 border border-rose-100 text-rose-700 px-3 py-1.5 rounded-xl text-xs font-medium"
              >
                {service}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Contact */}
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

      <button
        onClick={handleReset}
        className="text-xs text-stone-400 hover:text-stone-600 transition-colors underline underline-offset-4"
      >
        Ieși din portal
      </button>
    </div>
  );
}
