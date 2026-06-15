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
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-full">
        <div className="bg-zinc-900 border border-white/10 rounded-2xl px-4 py-6 text-center shadow-xl">
          <span className="text-5xl sm:text-6xl font-extralight text-white tabular-nums leading-none">
            {String(value).padStart(2, '0')}
          </span>
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-medium">{label}</span>
    </div>
  );
}

function Countdown({ dateStr }: { dateStr: string }) {
  const { days, hours, minutes, seconds, isPast } = useCountdown(dateStr);

  if (isPast) {
    return (
      <div className="text-center py-6">
        <p className="text-zinc-400 text-sm uppercase tracking-widest">Ziua nunții a sosit! 🎉</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 text-center">Timp rămas până la nuntă</p>
      <div className="grid grid-cols-4 gap-2 sm:gap-4 items-end">
        <CountdownUnit value={days} label="Zile" />
        <CountdownUnit value={hours} label="Ore" />
        <CountdownUnit value={minutes} label="Minute" />
        <CountdownUnit value={seconds} label="Secunde" />
      </div>
      <div className="grid grid-cols-4 gap-2 sm:gap-4 mt-1">
        {[days, hours, minutes, seconds].map((_, i) => (
          <div key={i} className="h-0.5 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full" />
        ))}
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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
        <p className="text-sm uppercase tracking-widest text-zinc-400 animate-pulse">
          Se verifică codul de acces...
        </p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-md mx-auto py-16">
        <div className="text-center mb-10 space-y-3">
          <h2 className="text-2xl font-extralight uppercase tracking-widest text-white">
            Portal Clienți
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Introduceți codul unic primit pe e-mail pentru a accesa detaliile evenimentului dumneavoastră.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-zinc-900/80 border border-white/10 p-8 rounded-3xl space-y-6 shadow-2xl"
        >
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-2">
              Cod de Acces
            </label>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="ex: abxs243sf9"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white font-mono focus:outline-none focus:border-white/30 placeholder:text-zinc-700"
            />
            {hasSearched && error && (
              <p className="text-red-400 text-xs pt-1">{error}</p>
            )}
          </div>
          <button
            type="submit"
            className="w-full bg-white text-black py-3.5 rounded-xl font-semibold uppercase tracking-widest text-xs hover:bg-zinc-200 transition-colors"
          >
            Accesează Portalul
          </button>
        </form>
      </div>
    );
  }

  const totalEstimate = event.pricePerMeniu ? event.pricePerMeniu * event.guests : null;

  return (
    <div className="max-w-2xl mx-auto space-y-10 py-8">

      {/* Header */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-mono">{event.accessCode}</p>
        <h2 className="text-3xl font-extralight uppercase tracking-widest text-white">{event.clientName}</h2>
        <p className="text-xs text-zinc-500">Bun venit! Mai jos găsești toate detaliile evenimentului tău.</p>
      </div>

      {/* Countdown */}
      <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 sm:p-8">
        <Countdown dateStr={event.date} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Data</p>
          <p className="text-white font-mono font-semibold text-sm">{event.date}</p>
        </div>
        <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Salon</p>
          <p className="text-white font-semibold text-sm">{event.salonName}</p>
        </div>
        <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Invitați</p>
          <p className="text-white font-semibold text-sm">{event.guests} pers.</p>
        </div>
        <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Preț Meniu</p>
          <p className="text-emerald-400 font-semibold text-sm">
            {event.pricePerMeniu ? `${event.pricePerMeniu} € / pers` : 'Nespecificat'}
          </p>
        </div>
      </div>

      {/* Budget estimate */}
      {totalEstimate && (
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 flex justify-between items-center">
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Estimare Totală</p>
            <p className="text-xs text-zinc-500">{event.guests} pers. × {event.pricePerMeniu} €</p>
          </div>
          <p className="text-2xl font-light text-white">{totalEstimate.toLocaleString('ro-RO')} €</p>
        </div>
      )}

      {/* Extra services */}
      {event.extraServices.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Servicii Extra Incluse</p>
          <div className="flex flex-wrap gap-2">
            {event.extraServices.map((service, idx) => (
              <span key={idx} className="bg-zinc-900 border border-white/10 text-zinc-300 px-3 py-1.5 rounded-xl text-xs">
                {service}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Contact */}
      <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 space-y-3 text-xs">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500">Contact</p>
        <div className="flex justify-between">
          <span className="text-zinc-400">Telefon</span>
          <span className="text-white font-mono">{event.phone}</span>
        </div>
        {event.email && (
          <div className="flex justify-between">
            <span className="text-zinc-400">Email</span>
            <span className="text-white">{event.email}</span>
          </div>
        )}
      </div>

      <button
        onClick={handleReset}
        className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-4"
      >
        Ieși din portal
      </button>
    </div>
  );
}
