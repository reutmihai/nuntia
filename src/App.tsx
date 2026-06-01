import { useState } from 'react';
import PublicCalendar from './components/PublicCalendar';
import AdminInbox from './components/ADminInbox';
import ConfirmedEvents from './components/ConfirmedEvents';

// Structurile de date de bază (folosite în aplicație)
export interface BookingRequest {
  id: string;
  date: string;
  clientName: string;
  phone: string;
  guests: number;
  menuPreference: string;
  estimatedBudget: string;
  message?: string;
}

export interface ConfirmedEvent {
  id: string;
  date: string;
  clientName: string;
  guests: number;
  phone: string;
  pricePerMeniu?: number; // Prețul agreat per meniu în urma negocierii telefonice
}

function App() {
  const currentYear = new Date().getFullYear();

  // Configurația de bază a restaurantului
  const restaurantConfig = {
    name: "Ballroom",
    location: "Suceava"
  };

  // Stările pentru navigarea principală și fluxul de aprobare
  const [viewMode, setViewMode] = useState<'public' | 'admin'>('public');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Stări pentru modalul de stabilire a prețului la aprobare
  const [approvingRequest, setApprovingRequest] = useState<BookingRequest | null>(null);
  const [negotiatedPrice, setNegotiatedPrice] = useState<number>(85);

  // --- STĂRI GLOBALE PENTRU DATE ---
  // State pentru evenimentele deja CONFIRMATE (zile blocate cu roșu)
  const [confirmedEvents, setConfirmedEvents] = useState<ConfirmedEvent[]>([
    { id: 'e1', date: `${currentYear}-06-20`, clientName: 'Andrei & Elena', guests: 250, phone: '0741223344', pricePerMeniu: 80 },
    { id: 'e2', date: `${currentYear}-09-12`, clientName: 'Mihai & Maria', guests: 300, phone: '0755998877', pricePerMeniu: 95 },
  ]);

  // State pentru CERERILE noi de ofertă trimise de miri
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([
    { 
      id: 'r1', 
      date: `${currentYear}-07-18`, 
      clientName: 'Cosmin & Alina', 
      phone: '0740123456', 
      guests: 180,
      menuPreference: 'Premium (95€)',
      estimatedBudget: '15.000€ - 20.000€',
      message: 'Doresc detalii despre pachetul de lumini.' 
    }
  ]);

  // --- FUNCȚII LOGICĂ APLICAȚIE ---

  // Adăugarea unei cereri noi din formularul public
  const handleAddRequest = (newRequest: BookingRequest) => {
    setBookingRequests((prevRequests) => [...prevRequests, newRequest]);
  };

  // Logare admin
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'admin123') {
      setIsAdminLoggedIn(true);
      setLoginError(false);
      setPasswordInput('');
    } else {
      setLoginError(true);
    }
  };

  // Declanșează fluxul de aprobare (deschide modalul pentru introducerea prețului)
  const triggerApproveFlow = (req: BookingRequest) => {
    setApprovingRequest(req);
    // Setăm un preț implicit bazat pe preferința selectată de ei în cerere
    if (req.menuPreference.includes('75')) setNegotiatedPrice(75);
    else if (req.menuPreference.includes('95')) setNegotiatedPrice(95);
    else if (req.menuPreference.includes('120')) setNegotiatedPrice(120);
    else setNegotiatedPrice(85);
  };

  // Finalizează aprobarea după introducerea prețului negociat
  const handleConfirmApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingRequest) return;

    const newEvent: ConfirmedEvent = {
      id: `e-${Date.now()}`,
      date: approvingRequest.date,
      clientName: approvingRequest.clientName,
      guests: approvingRequest.guests,
      phone: approvingRequest.phone,
      pricePerMeniu: negotiatedPrice
    };

    setConfirmedEvents((prev) => [...prev, newEvent]);
    setBookingRequests((prev) => prev.filter(b => b.id !== approvingRequest.id));
    setApprovingRequest(null);
  };

  // Respingere cerere direct din inbox
  const handleRejectRequest = (id: string) => {
    if (window.confirm("Sigur dorești să refuzi această cerere de ofertă?")) {
      setBookingRequests((prev) => prev.filter(b => b.id !== id));
    }
  };

  // Anulare nuntă confirmată
  const handleCancelEvent = (id: string) => {
    if (window.confirm("Anulezi acest contract? Data va fi eliberată în calendar.")) {
      setConfirmedEvents((prev) => prev.filter(e => e.id !== id));
    }
  };

  return (
    <div className="w-full min-h-screen bg-zinc-950 text-zinc-100 antialiased font-sans relative pb-12">
      
      {/* Top Navigation Bar */}
      <div className="bg-zinc-900 border-b border-white/10 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-[0.2em] text-white uppercase">
              {restaurantConfig.name}
            </span>
            <span className="text-xs text-zinc-400">({restaurantConfig.location})</span>
          </div>

          {/* Comutator pentru simularea rutei */}
          <div className="flex p-1 gap-2 rounded-xl text-xs bg-black/40 border border-white/5">
            <button 
              onClick={() => setViewMode('public')}
              className={`px-4 py-2 rounded-lg transition-all ${viewMode === 'public' ? 'bg-white text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Home
            </button>
            <button 
              onClick={() => setViewMode('admin')}
              className={`px-4 py-2 rounded-lg transition-all ${viewMode === 'admin' ? 'bg-white text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Dashboard Manager
            </button>
          </div>
        </div>
      </div>

      {/* Spațiul de lucru pentru componente */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {viewMode === 'public' ? (
          <PublicCalendar 
            confirmedEvents={confirmedEvents}
            bookingRequests={bookingRequests}
            onAddRequest={handleAddRequest}
          />
        ) : (
          <div className="space-y-12">
            {!isAdminLoggedIn ? (
              <div className="max-w-md mx-auto py-16">
                <form onSubmit={handleLogin} className="bg-zinc-900/80 border border-white/10 p-8 rounded-3xl space-y-6 shadow-2xl">
                  <h3 className="text-xl font-light uppercase tracking-widest text-center text-white">Logare Manager</h3>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">Parolă (folosiți admin123)</label>
                    <input 
                      type="password" 
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-white/30"
                    />
                    {loginError && <p className="text-red-400 text-xs pt-1 font-medium">Parolă incorectă.</p>}
                  </div>
                  <button type="submit" className="w-full bg-white text-black py-3.5 rounded-xl font-semibold uppercase tracking-widest text-xs hover:bg-zinc-200 transition-colors">
                    Intră în Dashboard
                  </button>
                </form>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Coloana Inbox Cereri */}
                <AdminInbox 
                  bookingRequests={bookingRequests}
                  onApprove={triggerApproveFlow}
                  onReject={handleRejectRequest}
                />
                
                {/* Coloana Gestiune Contracte */}
                <div className="lg:col-span-2">
                  <ConfirmedEvents 
                    confirmedEvents={confirmedEvents}
                    onCancelEvent={handleCancelEvent}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL CONFIGURARE PREȚ FINAL NEGOCIAT (La Aprobare) */}
      {approvingRequest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl max-w-sm w-full p-6 text-xs shadow-2xl">
            <div className="mb-6 space-y-1">
              <h3 className="text-base uppercase tracking-widest text-white font-light">Confirmă Contractul</h3>
              <p className="text-zinc-400">Stabilește prețul stabilit la telefon pentru {approvingRequest.clientName}.</p>
            </div>

            <form onSubmit={handleConfirmApproval} className="space-y-5">
              <div>
                <label className="block text-zinc-400 uppercase tracking-widest text-[9px] mb-2 font-semibold">Preț Negociat Meniu (€ / persoană)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    required 
                    min="1"
                    value={negotiatedPrice} 
                    onChange={(e) => setNegotiatedPrice(Number(e.target.value))}
                    className="w-full bg-black border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-white focus:outline-none focus:border-white/30 text-base font-semibold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500 font-semibold">€ / pers</span>
                </div>
              </div>

              <div className="bg-black/30 border border-white/5 p-3 rounded-xl space-y-1 text-zinc-400">
                <p>📅 Data: <span className="text-white font-mono">{approvingRequest.date}</span></p>
                <p>👥 Invitați: <span className="text-white font-semibold">{approvingRequest.guests} persoane</span></p>
                <p>📞 Contact: <span className="text-white font-mono">{approvingRequest.phone}</span></p>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setApprovingRequest(null)}
                  className="flex-1 bg-transparent border border-white/10 hover:bg-white/5 text-white py-3.5 rounded-xl uppercase tracking-widest text-[9px] font-semibold transition-colors"
                >
                  Anulează
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-white text-black hover:bg-zinc-200 py-3.5 rounded-xl font-bold uppercase tracking-widest text-[9px] transition-colors"
                >
                  Confirmă și Rezervă
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;