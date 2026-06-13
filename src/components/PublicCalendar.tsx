import { useState } from 'react';
import { BookingRequest, ConfirmedEvent } from '../App';

interface PublicCalendarProps {
  confirmedEvents: ConfirmedEvent[];
  bookingRequests: BookingRequest[];
  onAddRequest: (newRequest: BookingRequest) => void;
}

export default function PublicCalendar({ 
  confirmedEvents, 
  bookingRequests, 
  onAddRequest 
}: PublicCalendarProps) {
  
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDate = today.getDate();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  
  // --- SALONUL SELECTAT PENTRU FILTRAREA CALENDARULUI ---
  const [activeSalonFilter, setActiveSalonFilter] = useState('Grand Salon');

  // Stări pentru modalul formularului
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedDateForRequest, setSelectedDateForRequest] = useState('');
  const [clientNameInput, setClientNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState(''); // <-- Adăugat
  const [guestsInput, setGuestsInput] = useState(150);
  const [menuInput, setMenuInput] = useState('Standard');
  const [budgetInput, setBudgetInput] = useState('10.000€ - 15.000€');
  const [messageInput, setMessageInput] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // DATE STATICE PENTRU SALOANE ȘI SERVICII
  const SALOANE = [
    {
      id: 'grand',
      name: 'Grand Salon',
      capacity: '300 - 500 invitați',
      theme: 'Elegance Clasic',
      description: 'Candelabre de cristal, lumini calde ambientale și un design aristocratic, perfect pentru nunți mari și fastuoase.',
      image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'imperial',
      name: 'Imperial Salon',
      capacity: '100 - 300 invitați',
      theme: 'Boho-Chic & Modern',
      description: 'Stil greenery cu accente minimaliste, terasă exterioară integrată și o atmosferă intimă, ideală pentru petreceri moderne.',
      image: 'https://images.unsplash.com/photo-1549417229-aa67d3263c09?auto=format&fit=crop&w=800&q=80'
    }
  ];

  const SERVICII_EXTRA = [
    { id: 'artificii', name: 'Artificii dansul mirilor', description: 'Spectacol de lumini la valsul de deschidere.' },
    { id: 'fum_greu', name: 'Gheață carbonică (Fum greu)', description: 'Efect de nori joși pentru o atmosferă de basm.' },
    { id: 'tort_shoturi', name: 'Tort de shot-uri (Shot Bar)', description: 'O experiență dinamică și modernă pentru invitați.' },
    { id: 'candy_bar', name: 'Candy Bar Premium', description: 'Bufet de dulciuri artizanale personalizat tematic.' }
  ];

  const months = [
    { id: 0, name: 'Ianuarie' }, { id: 1, name: 'Februarie' }, { id: 2, name: 'Martie' },
    { id: 3, name: 'Aprilie' }, { id: 4, name: 'Mai' }, { id: 5, name: 'Iunie' },
    { id: 6, name: 'Iulie' }, { id: 7, name: 'August' }, { id: 8, name: 'Septembrie' },
    { id: 9, name: 'Octombrie' }, { id: 10, name: 'Noiembrie' }, { id: 11, name: 'Decembrie' }
  ];

  const weekdays = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];
  const yearsList = Array.from({ length: 10 }, (_, index) => currentYear + index);

  const getDaysInMonth = (year: number, monthIndex: number) => {
    const days = [];
    const firstDay = new Date(year, monthIndex, 1);
    const firstDayOfWeek = firstDay.getDay();
    const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    for (let i = 0; i < adjustedFirstDay; i++) days.push(null);
    const totalDays = new Date(year, monthIndex + 1, 0).getDate();
    for (let i = 1; i <= totalDays; i++) days.push(i);
    return days;
  };

  const currentMonthDays = getDaysInMonth(selectedYear, selectedMonth);

  const handleServiceChange = (serviceName: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceName)
        ? prev.filter(s => s !== serviceName)
        : [...prev, serviceName]
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDateForRequest || !clientNameInput || !phoneInput || !emailInput) return; // <-- Adăugat emailInput la validare

    const newRequest: BookingRequest = {
      id: Date.now().toString(),
      date: selectedDateForRequest,
      clientName: clientNameInput,
      phone: phoneInput,
      email: emailInput, // <-- Trimitem emailul colectat spre App.tsx
      guests: guestsInput,
      menuPreference: menuInput,
      estimatedBudget: budgetInput,
      message: messageInput,
      salonName: activeSalonFilter,
      extraServices: selectedServices
    };

    onAddRequest(newRequest);
    setShowFormModal(false);
    
    // Resetare inputuri
    setClientNameInput('');
    setPhoneInput('');
    setEmailInput(''); // <-- Adăugat resetare
    setMessageInput('');
    setSelectedServices([]);
    alert('Cererea de ofertă a fost trimisă cu succes pentru salonul ' + activeSalonFilter + '!');
  };

  const handleSelectSalonFromCard = (salonName: string) => {
    setActiveSalonFilter(salonName);
    const calendarEl = document.getElementById('calendar-section');
    if (calendarEl) {
      calendarEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-20 max-w-5xl mx-auto">
      
      {/* 1. HERO SECTION */}
      <div className="text-center space-y-6 max-w-3xl mx-auto py-8">
        <h1 className="text-5xl font-extralight uppercase tracking-widest text-white leading-tight">
          Locul unde încep <span className="font-normal text-zinc-400">Poveștile</span>
        </h1>
        <p className="text-base text-zinc-400 font-light leading-relaxed max-w-xl mx-auto">
          Alege salonul dorit, verifică disponibilitatea dedicată în timp real și configurează o cerere de ofertă personalizată.
        </p>
      </div>

      {/* 2. SECȚIUNE SALOANE */}
      <div className="space-y-8">
        <div className="border-b border-white/10 pb-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Saloane Disponibile</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {SALOANE.map((salon) => (
            <div key={salon.id} className="bg-zinc-900/40 border border-white/10 rounded-3xl overflow-hidden shadow-xl flex flex-col group">
              <div className="h-64 overflow-hidden relative">
                <img 
                  src={salon.image} 
                  alt={salon.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white">{salon.theme}</span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xl font-light tracking-wide text-white">{salon.name}</h3>
                  <p className="text-xs text-zinc-400 font-light leading-relaxed">{salon.description}</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span className="text-[11px] text-zinc-400">Capacitate: <strong className="text-white">{salon.capacity}</strong></span>
                  <button 
                    onClick={() => handleSelectSalonFromCard(salon.name)}
                    className="text-[10px] font-bold uppercase tracking-widest bg-white text-black px-4 py-2 rounded-xl hover:bg-zinc-200 transition-colors"
                  >
                    Vezi Calendar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. SECȚIUNE SERVICII EXTRA */}
      <div className="space-y-8">
        <div className="border-b border-white/10 pb-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Efecte & Servicii Opționale</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SERVICII_EXTRA.map((service) => (
            <div key={service.id} className="bg-zinc-900/30 border border-white/5 p-5 rounded-2xl space-y-2 hover:border-white/10 transition-colors">
              <h4 className="text-xs font-semibold text-white tracking-wide">{service.name}</h4>
              <p className="text-[11px] text-zinc-400 font-light leading-relaxed">{service.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. CALENDAR DINAMIC FILTRAT PE SALON */}
      <div id="calendar-section" className="space-y-6 pt-6">
        <div className="border-b border-white/10 pb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Verifică disponibilitate calendar</h2>
          
          {/* TABURI SELECȚIE SALON PENTRU CALENDAR */}
          <div className="flex bg-zinc-950 p-1 border border-white/5 rounded-xl">
            {SALOANE.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSalonFilter(s.name)}
                className={`text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all ${
                  activeSalonFilter === s.name 
                    ? 'bg-white text-black shadow-md' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
        
        <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
          {/* Controale Lună / An */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 pb-6 border-b border-white/5">
            <span className="text-lg font-light uppercase tracking-widest text-white">
              {months[selectedMonth].name} {selectedYear} <span className="text-xs font-mono text-zinc-500 ml-2">({activeSalonFilter})</span>
            </span>
            <div className="flex gap-3">
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-zinc-950 border border-white/10 text-xs rounded-xl px-4 py-2 text-white font-medium focus:outline-none cursor-pointer"
              >
                {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-zinc-950 border border-white/10 text-xs rounded-xl px-4 py-2 text-white font-medium focus:outline-none cursor-pointer"
              >
                {months.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          {/* Zilele Săptămânii */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs text-zinc-400 font-semibold mb-4 uppercase tracking-wider">
            {weekdays.map(d => <div key={d}>{d}</div>)}
          </div>

          {/* Zilele Lunii */}
          <div className="grid grid-cols-7 gap-2.5">
            {currentMonthDays.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} className="h-20" />;
              
              const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              
              const isPast = 
                selectedYear < currentYear || 
                (selectedYear === currentYear && selectedMonth < currentMonth) || 
                (selectedYear === currentYear && selectedMonth === currentMonth && day < currentDate);

              // --- FILTRAREA LOGICĂ PE BAZA SALONULUI SELECTAT ---
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
                  className={`h-20 p-3 rounded-2xl border text-left flex flex-col justify-between transition-all group relative ${
                    isPast
                      ? 'bg-zinc-950/20 border-zinc-900 text-zinc-600 cursor-not-allowed opacity-40 line-through'
                      : isOcupat 
                        ? 'bg-red-950/10 border-red-900/30 text-red-400/50 cursor-not-allowed'
                        : isPending
                          ? 'bg-amber-950/20 border-amber-900/40 text-amber-400'
                          : 'bg-zinc-950/50 border-white/5 hover:border-white/30 hover:bg-zinc-900 text-white'
                  }`}
                >
                  <span className="text-sm font-semibold">{day}</span>
                  <span className={`text-[9px] uppercase tracking-wider font-semibold ${
                    isPast ? 'text-zinc-600 no-underline inline-block' : isOcupat ? 'text-red-500' : isPending ? 'text-amber-400' : 'text-zinc-400 group-hover:text-white'
                  }`}>
                    {isPast ? 'Expirat' : isOcupat ? 'Ocupat' : isPending ? 'În analiză' : 'Rezervă'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL FORMULAR CERERE ADAPTAT */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl max-w-md w-full p-6 text-xs shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-md uppercase tracking-widest text-white font-light">Cerere de Ofertă Nuntă</h3>
                <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Data: {selectedDateForRequest} | Salon: {activeSalonFilter}</p>
              </div>
              <button onClick={() => setShowFormModal(false)} className="text-zinc-400 hover:text-white text-sm p-1">✕</button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-zinc-400 uppercase tracking-widest text-[9px] mb-1.5 font-semibold">Numele Cuplului (Miri)</label>
                <input 
                  type="text" required value={clientNameInput} onChange={(e) => setClientNameInput(e.target.value)} placeholder="Ex: Popescu Andrei & Maria"
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none text-sm"
                />
              </div>

              {/* GRILA PENTRU TELEFON ȘI EMAIL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 uppercase tracking-widest text-[9px] mb-1.5 font-semibold">Telefon Contact</label>
                  <input 
                    type="tel" required value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="07xxxxxxxx"
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 uppercase tracking-widest text-[9px] mb-1.5 font-semibold">Adresă Email</label>
                  <input 
                    type="email" required value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="exemplu@gmail.com"
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 uppercase tracking-widest text-[9px] mb-1.5 font-semibold">Nr. Anticipat Invitați</label>
                <input 
                  type="number" value={guestsInput} onChange={(e) => setGuestsInput(Number(e.target.value))}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none text-sm"
                />
              </div>

              {/* SALON AFIȘAT CA TEXT INFORMATIV */}
              <div>
                <label className="block text-zinc-400 uppercase tracking-widest text-[9px] mb-1.5 font-semibold">Salon Selectat</label>
                <div className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-zinc-300 font-medium text-sm">
                  {activeSalonFilter}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 uppercase tracking-widest text-[9px] mb-1.5 font-semibold">Preferință Meniu</label>
                  <select value={menuInput} onChange={(e) => setMenuInput(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-white text-xs cursor-pointer">
                    <option>Standard</option>
                    <option>Premium</option>
                    <option>Exclusive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 uppercase tracking-widest text-[9px] mb-1.5 font-semibold">Buget Estimat</label>
                  <select value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-3 py-3 text-white text-xs cursor-pointer">
                    <option>10.000€ - 15.000€</option>
                    <option>15.000€ - 20.000€</option>
                    <option>20.000€ +</option>
                  </select>
                </div>
              </div>

              {/* SERVICII EXTRA */}
              <div>
                <label className="block text-zinc-400 uppercase tracking-widest text-[9px] mb-2 font-semibold">Servicii Extra Opționale</label>
                <div className="bg-black/50 border border-white/10 rounded-xl p-3 space-y-2.5">
                  {SERVICII_EXTRA.map(service => (
                    <label key={service.id} className="flex items-start gap-3 cursor-pointer select-none group">
                      <input 
                        type="checkbox"
                        checked={selectedServices.includes(service.name)}
                        onChange={() => handleServiceChange(service.name)}
                        className="mt-0.5 accent-white h-3.5 w-3.5 bg-zinc-950 rounded border-white/10"
                      />
                      <div className="space-y-0.5">
                        <span className="text-zinc-200 text-xs font-medium group-hover:text-white transition-colors">{service.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 uppercase tracking-widest text-[9px] mb-1.5 font-semibold">Solicitări speciale (Opțional)</label>
                <textarea 
                  value={messageInput} onChange={(e) => setMessageInput(e.target.value)} placeholder="Detalii suplimentare..." rows={2}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none text-sm resize-none"
                />
              </div>

              <button type="submit" className="w-full bg-white text-black py-3.5 rounded-xl font-bold uppercase tracking-widest text-[10px] mt-2 hover:bg-zinc-200 transition-colors">
                Trimite Cererea de Ofertă
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}