import { useState } from 'react';
import type { BookingRequest, ConfirmedEvent } from '../types';

interface PublicCalendarProps {
  confirmedEvents: ConfirmedEvent[];
  bookingRequests: BookingRequest[];
  onAddRequest: (newRequest: BookingRequest) => void;
}

const SALOANE = [
  {
    id: 'grand',
    name: 'Grand Salon',
    capacity: '300 - 500 invitați',
    theme: 'Elegance Clasic',
    description: 'Candelabre de cristal, lumini calde ambientale și un design aristocratic, perfect pentru nunți mari și fastuoase.',
    image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'imperial',
    name: 'Imperial Salon',
    capacity: '100 - 300 invitați',
    theme: 'Boho-Chic & Modern',
    description: 'Stil greenery cu accente minimaliste, terasă exterioară integrată și o atmosferă intimă, ideală pentru petreceri moderne.',
    image: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=85',
  }
];

const SERVICII_EXTRA = [
  {
    id: 'artificii',
    name: 'Artificii dansul mirilor',
    description: 'Spectacol de lumini la valsul de deschidere.',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'fum_greu',
    name: 'Gheață carbonică (Fum greu)',
    description: 'Efect de nori joși pentru o atmosferă de basm.',
    image: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'tort_shoturi',
    name: 'Tort de shot-uri (Shot Bar)',
    description: 'O experiență dinamică și modernă pentru invitați.',
    image: 'https://images.unsplash.com/photo-1574691250077-03a929faece5?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'candy_bar',
    name: 'Candy Bar Premium',
    description: 'Bufet de dulciuri artizanale personalizat tematic.',
    image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=80',
  }
];

const MONTHS = [
  { id: 0, name: 'Ianuarie' }, { id: 1, name: 'Februarie' }, { id: 2, name: 'Martie' },
  { id: 3, name: 'Aprilie' }, { id: 4, name: 'Mai' }, { id: 5, name: 'Iunie' },
  { id: 6, name: 'Iulie' }, { id: 7, name: 'August' }, { id: 8, name: 'Septembrie' },
  { id: 9, name: 'Octombrie' }, { id: 10, name: 'Noiembrie' }, { id: 11, name: 'Decembrie' }
];

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];

function getDaysInMonth(year: number, monthIndex: number) {
  const days: (number | null)[] = [];
  const firstDay = new Date(year, monthIndex, 1);
  const firstDayOfWeek = firstDay.getDay();
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  for (let i = 0; i < adjustedFirstDay; i++) days.push(null);
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  for (let i = 1; i <= totalDays; i++) days.push(i);
  return days;
}

export default function PublicCalendar({ confirmedEvents, bookingRequests, onAddRequest }: PublicCalendarProps) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDate = today.getDate();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [activeSalonFilter, setActiveSalonFilter] = useState('Grand Salon');
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedDateForRequest, setSelectedDateForRequest] = useState('');
  const [clientNameInput, setClientNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [guestsInput, setGuestsInput] = useState(150);
  const [menuInput, setMenuInput] = useState('Standard');
  const [budgetInput, setBudgetInput] = useState('10.000€ - 15.000€');
  const [messageInput, setMessageInput] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const yearsList = Array.from({ length: 10 }, (_, i) => currentYear + i);
  const currentMonthDays = getDaysInMonth(selectedYear, selectedMonth);

  const handleServiceChange = (serviceName: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceName) ? prev.filter(s => s !== serviceName) : [...prev, serviceName]
    );
  };

  const handleFormSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedDateForRequest || !clientNameInput || !phoneInput || !emailInput) return;

    const newRequest: BookingRequest = {
      id: Date.now().toString(),
      date: selectedDateForRequest,
      clientName: clientNameInput,
      phone: phoneInput,
      email: emailInput,
      guests: guestsInput,
      menuPreference: menuInput,
      estimatedBudget: budgetInput,
      message: messageInput,
      salonName: activeSalonFilter,
      extraServices: selectedServices
    };

    onAddRequest(newRequest);
    setShowFormModal(false);
    setClientNameInput('');
    setPhoneInput('');
    setEmailInput('');
    setMessageInput('');
    setSelectedServices([]);
    alert('Cererea de ofertă a fost trimisă cu succes pentru salonul ' + activeSalonFilter + '!');
  };

  const handleSelectSalonFromCard = (salonName: string) => {
    setActiveSalonFilter(salonName);
    document.getElementById('calendar-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-20 max-w-5xl mx-auto">

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1920&q=85')" }}
        />
        <div className="absolute inset-0 bg-white/65 backdrop-blur-[2px]" />
        <div className="relative z-10 text-center space-y-5 px-5 sm:px-8 py-16 sm:py-24">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-rose-600 font-semibold">Ballroom — Suceava</p>
          <h1 className="text-3xl sm:text-5xl font-semibold text-stone-900 leading-tight">
            Locul unde încep <span className="font-semibold text-rose-700">Poveștile</span>
          </h1>
          <p className="text-sm sm:text-base text-stone-500 font-light leading-relaxed max-w-xl mx-auto">
            Alege salonul dorit, verifică disponibilitatea în timp real și configurează o cerere de ofertă personalizată.
          </p>
          <button
            onClick={() => document.getElementById('calendar-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-block mt-2 px-6 sm:px-8 py-3 bg-rose-700 text-white text-xs font-semibold uppercase tracking-widest rounded-full hover:bg-rose-800 transition-colors"
          >
            Verifică disponibilitate
          </button>
        </div>
      </div>

      {/* ─── SALOANE ──────────────────────────────────────────── */}
      <div className="space-y-8">
        <div className="border-b border-stone-100 pb-4 flex items-center gap-3">
          <div className="w-1 h-5 bg-rose-600 rounded-full" />
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">Saloane Disponibile</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {SALOANE.map((salon) => (
            <div key={salon.id} className="bg-white border border-stone-100 rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-shadow flex flex-col group">
              <div className="h-64 overflow-hidden relative">
                <img
                  src={salon.image}
                  alt={salon.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white">{salon.theme}</span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xl font-light tracking-wide text-stone-900">{salon.name}</h3>
                  <p className="text-xs text-stone-500 font-light leading-relaxed">{salon.description}</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                  <span className="text-[11px] text-stone-500">
                    Capacitate: <strong className="text-stone-800">{salon.capacity}</strong>
                  </span>
                  <button
                    onClick={() => handleSelectSalonFromCard(salon.name)}
                    className="text-[10px] font-bold uppercase tracking-widest bg-rose-700 text-white px-4 py-2 rounded-xl hover:bg-rose-800 transition-colors"
                  >
                    Vezi Calendar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── SERVICII EXTRA ───────────────────────────────────── */}
      <div className="space-y-8">
        <div className="border-b border-stone-100 pb-4 flex items-center gap-3">
          <div className="w-1 h-5 bg-rose-600 rounded-full" />
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">Efecte & Servicii Opționale</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SERVICII_EXTRA.map((service) => (
            <div key={service.id} className="bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
              <div className="h-40 overflow-hidden relative">
                <img
                  src={service.image}
                  alt={service.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
              <div className="p-4 space-y-1.5">
                <h4 className="text-xs font-semibold text-stone-800 tracking-wide">{service.name}</h4>
                <p className="text-[11px] text-stone-500 font-light leading-relaxed">{service.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── CALENDAR ─────────────────────────────────────────── */}
      <div id="calendar-section" className="space-y-6 pt-6 scroll-mt-24">
        <div className="border-b border-stone-100 pb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-rose-600 rounded-full" />
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">Verifică disponibilitate calendar</h2>
          </div>
          <div className="flex w-full sm:w-auto bg-stone-100 p-1 border border-stone-200 rounded-xl">
            {SALOANE.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSalonFilter(s.name)}
                className={`flex-1 sm:flex-none text-[10px] font-bold uppercase tracking-wider px-3 sm:px-4 py-2 rounded-lg transition-all ${
                  activeSalonFilter === s.name
                    ? 'bg-white text-rose-700 shadow-sm border border-rose-100'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-stone-100 rounded-3xl p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 pb-6 border-b border-stone-100">
            <span className="text-lg font-light uppercase tracking-widest text-stone-900">
              {MONTHS[selectedMonth].name} {selectedYear}
              <span className="text-xs font-mono text-stone-400 ml-2">({activeSalonFilter})</span>
            </span>
            <div className="flex gap-3">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-stone-50 border border-stone-200 text-xs rounded-xl px-4 py-2 text-stone-800 font-medium focus:outline-none focus:border-rose-300 cursor-pointer transition-colors"
              >
                {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-stone-50 border border-stone-200 text-xs rounded-xl px-4 py-2 text-stone-800 font-medium focus:outline-none focus:border-rose-300 cursor-pointer transition-colors"
              >
                {MONTHS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs text-stone-400 font-semibold mb-3 uppercase tracking-wider">
            {WEEKDAYS.map(d => <div key={d}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {currentMonthDays.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} className="h-12 sm:h-20" />;

              const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isPast =
                selectedYear < currentYear ||
                (selectedYear === currentYear && selectedMonth < currentMonth) ||
                (selectedYear === currentYear && selectedMonth === currentMonth && day < currentDate);
              const isOcupat = confirmedEvents.some(e => e.date === dateStr && e.salonName === activeSalonFilter);
              const isPending = bookingRequests.some(r => r.date === dateStr && r.salonName === activeSalonFilter);
              const isDisabled = isOcupat || isPast;

              return (
                <button
                  key={day}
                  disabled={isDisabled}
                  onClick={() => {
                    setSelectedDateForRequest(dateStr);
                    setShowFormModal(true);
                  }}
                  className={`h-12 sm:h-20 p-1.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left flex flex-col justify-between transition-all group ${
                    isPast
                      ? 'bg-stone-50 border-stone-100 text-stone-300 cursor-not-allowed opacity-50 line-through'
                      : isOcupat
                        ? 'bg-rose-50 border-rose-200 text-rose-300 cursor-not-allowed'
                        : isPending
                          ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : 'bg-white border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50/50 text-stone-800 cursor-pointer shadow-sm hover:shadow-md'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-semibold">{day}</span>
                  {/* Status label desktop */}
                  <span className={`hidden sm:inline text-[10px] uppercase tracking-wider font-semibold ${
                    isPast
                      ? 'text-stone-400'
                      : isOcupat
                        ? 'text-rose-400'
                        : isPending
                          ? 'text-amber-500'
                          : 'text-emerald-600 group-hover:text-emerald-700'
                  }`}>
                    {isPast ? 'Expirat' : isOcupat ? 'Ocupat' : isPending ? 'În analiză' : 'Rezervă →'}
                  </span>
                  {/* Indicator mobil — punct colorat mai mare */}
                  <span className={`sm:hidden w-2 h-2 rounded-full ${
                    isPast ? 'bg-stone-300' : isOcupat ? 'bg-rose-400' : isPending ? 'bg-amber-400' : 'bg-emerald-300 group-hover:bg-emerald-500'
                  }`} />
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 sm:gap-5 mt-6 pt-6 border-t border-stone-100">
            {[
              { color: 'bg-white border-emerald-200 shadow-sm', dot: 'bg-emerald-400', label: 'Disponibil', hint: 'Click pentru a rezerva' },
              { color: 'bg-rose-50 border-rose-200', dot: 'bg-rose-400', label: 'Ocupat', hint: 'Data indisponibilă' },
              { color: 'bg-amber-50 border-amber-200', dot: 'bg-amber-400', label: 'În analiză', hint: 'Cerere în așteptare' },
              { color: 'bg-stone-50 border-stone-100 opacity-50', dot: 'bg-stone-300', label: 'Trecut', hint: 'Dată expirată' },
            ].map(({ color, dot, label, hint }) => (
              <div key={label} className="flex items-center gap-2.5 group">
                <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${color}`}>
                  <div className={`w-2 h-2 rounded-full ${dot}`} />
                </div>
                <div>
                  <span className="text-xs text-stone-600 font-medium block leading-none">{label}</span>
                  <span className="text-[11px] text-stone-500 hidden sm:block mt-0.5">{hint}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── MODAL FORMULAR ───────────────────────────────────── */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-stone-100 rounded-3xl max-w-md w-full p-6 text-xs shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-md uppercase tracking-widest text-stone-900 font-light">Cerere de Ofertă</h3>
                <p className="text-[10px] text-stone-400 font-mono mt-0.5">
                  {selectedDateForRequest} · {activeSalonFilter}
                </p>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-stone-400 hover:text-stone-700 text-sm p-1 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-stone-600 uppercase tracking-wider text-xs mb-1.5 font-semibold">Numele Cuplului (Miri)</label>
                <input
                  type="text" required value={clientNameInput} onChange={(e) => setClientNameInput(e.target.value)}
                  placeholder="Ex: Popescu Andrei & Maria"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:border-rose-300 text-sm transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 uppercase tracking-wider text-xs mb-1.5 font-semibold">Telefon</label>
                  <input
                    type="tel" required value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="07xxxxxxxx"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:border-rose-300 text-sm transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 uppercase tracking-wider text-xs mb-1.5 font-semibold">Email</label>
                  <input
                    type="email" required value={emailInput} onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="exemplu@gmail.com"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:border-rose-300 text-sm transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-600 uppercase tracking-wider text-xs mb-1.5 font-semibold">Nr. Anticipat Invitați</label>
                <input
                  type="number" value={guestsInput} onChange={(e) => setGuestsInput(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:border-rose-300 text-sm transition-colors"
                />
              </div>

              <div>
                <label className="block text-stone-600 uppercase tracking-wider text-xs mb-1.5 font-semibold">Salon Selectat</label>
                <div className="w-full bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-rose-700 font-semibold text-sm">
                  {activeSalonFilter}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 uppercase tracking-wider text-xs mb-1.5 font-semibold">Preferință Meniu</label>
                  <select
                    value={menuInput} onChange={(e) => setMenuInput(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-3 text-stone-800 text-xs cursor-pointer focus:outline-none focus:border-rose-300 transition-colors"
                  >
                    <option>Standard</option>
                    <option>Premium</option>
                    <option>Exclusive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-600 uppercase tracking-wider text-xs mb-1.5 font-semibold">Buget Estimat</label>
                  <select
                    value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-3 text-stone-800 text-xs cursor-pointer focus:outline-none focus:border-rose-300 transition-colors"
                  >
                    <option>10.000€ - 15.000€</option>
                    <option>15.000€ - 20.000€</option>
                    <option>20.000€ +</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-600 uppercase tracking-wider text-xs mb-2 font-semibold">Servicii Extra Opționale</label>
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2.5">
                  {SERVICII_EXTRA.map(service => (
                    <label key={service.id} className="flex items-start gap-3 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(service.name)}
                        onChange={() => handleServiceChange(service.name)}
                        className="mt-0.5 accent-rose-600 h-3.5 w-3.5 rounded"
                      />
                      <span className="text-stone-700 text-xs font-medium group-hover:text-rose-700 transition-colors">
                        {service.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-stone-600 uppercase tracking-wider text-xs mb-1.5 font-semibold">Solicitări speciale (Opțional)</label>
                <textarea
                  value={messageInput} onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Detalii suplimentare..." rows={2}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:border-rose-300 text-sm resize-none transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-rose-700 text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-[10px] mt-2 hover:bg-rose-800 transition-colors"
              >
                Trimite Cererea de Ofertă
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
