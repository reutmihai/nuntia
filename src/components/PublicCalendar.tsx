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
  
  // Stări pentru modalul formularului
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedDateForRequest, setSelectedDateForRequest] = useState('');
  const [clientNameInput, setClientNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [guestsInput, setGuestsInput] = useState(150);
  const [menuInput, setMenuInput] = useState('Standard');
  const [budgetInput, setBudgetInput] = useState('10.000€ - 15.000€');
  const [messageInput, setMessageInput] = useState('');

  const months = [
    { id: 0, name: 'Ianuarie' }, { id: 1, name: 'Februarie' }, { id: 2, name: 'Martie' },
    { id: 3, name: 'Aprilie' }, { id: 4, name: 'Mai' }, { id: 5, name: 'Iunie' },
    { id: 6, name: 'Iulie' }, { id: 7, name: 'August' }, { id: 8, name: 'Septembrie' },
    { id: 9, name: 'Octombrie' }, { id: 10, name: 'Noiembrie' }, { id: 11, name: 'Decembrie' }
  ];

  const weekdays = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];
  
  // Generăm o listă de 10 ani în viitor începând cu anul curent
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDateForRequest || !clientNameInput || !phoneInput) return;

    const newRequest: BookingRequest = {
      id: Date.now().toString(),
      date: selectedDateForRequest,
      clientName: clientNameInput,
      phone: phoneInput,
      guests: guestsInput,
      menuPreference: menuInput,
      estimatedBudget: budgetInput,
      message: messageInput
    };

    onAddRequest(newRequest);
    setShowFormModal(false);
    
    // Resetare inputuri
    setClientNameInput('');
    setPhoneInput('');
    setMessageInput('');
    alert('Cererea de ofertă a fost trimisă cu succes! Managerul o va analiza în cel mai scurt timp.');
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h1 className="text-4xl font-extralight uppercase tracking-widest text-white">Planifică Nunta Ta</h1>
        <p className="text-sm text-zinc-400 font-light leading-relaxed">
          Verifică disponibilitatea online. Selectează orice dată liberă din calendarul de mai jos pentru a trimite o cerere de ofertă personalizată.
        </p>
      </div>

      <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
        {/* Controale Calendar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 pb-6 border-b border-white/5">
          <span className="text-lg font-light uppercase tracking-widest text-white">
            {months[selectedMonth].name} {selectedYear}
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
            
            // Verificare dacă data verificată aparține trecutului
            const isPast = 
              selectedYear < currentYear || 
              (selectedYear === currentYear && selectedMonth < currentMonth) || 
              (selectedYear === currentYear && selectedMonth === currentMonth && day < currentDate);

            const isOcupat = confirmedEvents.some(e => e.date === dateStr);
            const isPending = bookingRequests.some(r => r.date === dateStr);

            // Dezactivăm butonul dacă e ocupat SAU dacă a trecut deja data
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

      {/* MODAL FORMULAR CERERE */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl max-w-md w-full p-6 text-xs shadow-2xl relative">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-md uppercase tracking-widest text-white font-light">Cerere de Ofertă Nuntă</h3>
                <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Data selectată: {selectedDateForRequest}</p>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 uppercase tracking-widest text-[9px] mb-1.5 font-semibold">Telefon Contact</label>
                  <input 
                    type="tel" required value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="07xxxxxxxx"
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 uppercase tracking-widest text-[9px] mb-1.5 font-semibold">Nr. Anticipat Invitați</label>
                  <input 
                    type="number" value={guestsInput} onChange={(e) => setGuestsInput(Number(e.target.value))}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none text-sm"
                  />
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

              <div>
                <label className="block text-zinc-400 uppercase tracking-widest text-[9px] mb-1.5 font-semibold">Solicitări speciale (Opțional)</label>
                <textarea 
                  value={messageInput} onChange={(e) => setMessageInput(e.target.value)} placeholder="Detalii suplimentare..." rows={3}
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