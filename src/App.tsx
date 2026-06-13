import { useState, useEffect } from 'react';
import PublicCalendar from './components/PublicCalendar';
import AdminInbox from './components/AdminInbox';
import ConfirmedEvents from './components/ConfirmedEvents';
// IMPORTĂM NUMAI DACĂ EXISTĂ DEJA COMPONENTA NOUĂ (O vom crea în pasul următor)
// import ClientPortal from './components/ClientPortal'; 
import { supabase } from './supabaseClient';
// 1. Importăm pachetul oficial EmailJS pentru frontend
import emailjs from '@emailjs/browser';

export interface BookingRequest {
  id: string;
  date: string;
  clientName: string;
  phone: string;
  email: string; // <-- Adăugat
  guests: number;
  menuPreference: string;
  estimatedBudget: string;
  message?: string;
  salonName: string;         
  extraServices: string[];   
}

export interface ConfirmedEvent {
  id: string;
  date: string;
  clientName: string;
  guests: number;
  phone: string;
  email: string; // <-- Adăugat
  pricePerMeniu?: number;
  salonName: string;         
  extraServices: string[];   
  accessCode?: string; // <-- Adăugat
}

function App() {
  const restaurantConfig = {
    name: "Ballroom",
    location: "Suceava"
  };

  // Navigare extinsă pentru a include și Portalul Clientului
  const [viewMode, setViewMode] = useState<'public' | 'admin' | 'portal'>('public');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Modale aprobare
  const [approvingRequest, setApprovingRequest] = useState<BookingRequest | null>(null);
  const [negotiatedPrice, setNegotiatedPrice] = useState<number>(85);

  // --- STĂRI GLOBALE PENTRU DATE ---
  const [confirmedEvents, setConfirmedEvents] = useState<ConfirmedEvent[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Verificăm dacă există un cod în URL la prima încărcare (ex: ?code=nunta-mihai-1234)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setViewMode('portal');
    }
  }, []);

  // --- EFECT PENTRU ÎNCĂRCAREA DATELOR DIN SUPABASE ---
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // 1. Preluăm cererile de ofertă
        const { data: requestsData, error: reqError } = await supabase
          .from('booking_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (reqError) throw reqError;

        const mappedRequests: BookingRequest[] = (requestsData || []).map(req => ({
          id: req.id,
          date: req.date,
          clientName: req.client_name,
          phone: req.phone,
          email: req.email || '', // <-- Mapare email SQL -> React
          guests: req.guests,
          menuPreference: req.menu_preference,
          estimatedBudget: req.estimated_budget,
          message: req.message,
          salonName: req.salon_name || 'Grand Salon',      
          extraServices: req.extra_services || []            
        }));

        // 2. Preluăm evenimentele confirmate
        const { data: eventsData, error: evError } = await supabase
          .from('confirmed_events')
          .select('*')
          .order('date', { ascending: true });

        if (evError) throw evError;

        const mappedEvents: ConfirmedEvent[] = (eventsData || []).map(ev => ({
          id: ev.id,
          date: ev.date,
          clientName: ev.client_name,
          guests: ev.guests,
          phone: ev.phone,
          email: ev.email || '', // <-- Mapare email SQL -> React
          pricePerMeniu: ev.price_per_meniu,
          salonName: ev.salon_name || 'Grand Salon',      
          extraServices: ev.extra_services || [],
          accessCode: ev.access_code // <-- Mapare access_code SQL -> React
        }));

        setBookingRequests(mappedRequests);
        setConfirmedEvents(mappedEvents);
      } catch (error) {
        console.error("Eroare la încărcarea datelor din Supabase:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Adăugarea unei cereri noi (din formularul public)
  const handleAddRequest = async (newRequest: BookingRequest) => {
    try {
      const { error } = await supabase
        .from('booking_requests')
        .insert([{
          id: newRequest.id,
          date: newRequest.date,
          client_name: newRequest.clientName,
          phone: newRequest.phone,
          email: newRequest.email, // <-- Inserare email în BD
          guests: newRequest.guests,
          menu_preference: newRequest.menuPreference,
          estimated_budget: newRequest.estimatedBudget,
          message: newRequest.message,
          salon_name: newRequest.salonName,
          extra_services: newRequest.extraServices
        }]);

      if (error) throw error;
      
      setBookingRequests((prevRequests) => [newRequest, ...prevRequests]);
    } catch (error: any) {
      console.error("Eroare la adăugarea cererii:", error);
      alert(error.message?.includes('unique') 
        ? "Această dată este deja solicitată sau rezervată!" 
        : "A apărut o eroare la trimiterea cererii.");
    }
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

  // Declanșează fluxul de aprobare
  const triggerApproveFlow = (req: BookingRequest) => {
    setApprovingRequest(req);
    if (req.menuPreference.includes('75')) setNegotiatedPrice(75);
    else if (req.menuPreference.includes('95')) setNegotiatedPrice(95);
    else if (req.menuPreference.includes('120')) setNegotiatedPrice(120);
    else setNegotiatedPrice(85);
  };

  // Finalizează aprobarea și generează cheia unică + trimitere e-mail
  const handleConfirmApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingRequest) return;

    const eventId = `e-${Date.now()}`;
    
    // GENERARE COD DE ACCES UNIC (ex: nunta-mihai-5839)
    const cleanName = approvingRequest.clientName
      .split('&')[0]
      .split(' ')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const randomFourDigits = Math.floor(1000 + Math.random() * 9000);
    const generatedAccessCode = `nunta-${cleanName}-${randomFourDigits}`;
    
    try {
      // 1. Introducem evenimentul în tabelul de confirmate cu noul cod de acces și email
      const { error: insertError } = await supabase
        .from('confirmed_events')
        .insert([{
          id: eventId,
          date: approvingRequest.date,
          client_name: approvingRequest.clientName,
          guests: approvingRequest.guests,
          phone: approvingRequest.phone,
          email: approvingRequest.email, // <-- Trimitem email-ul
          price_per_meniu: negotiatedPrice,
          salon_name: approvingRequest.salonName,
          extra_services: approvingRequest.extraServices,
          access_code: generatedAccessCode // <-- Trimitem codul de acces
        }]);

      if (insertError) throw insertError;

      // 2. Ștergem cererea inițială din inbox
      const { error: deleteError } = await supabase
        .from('booking_requests')
        .delete()
        .eq('id', approvingRequest.id);

      if (deleteError) throw deleteError;

      // 3. INTEGRARE EMAILJS: Trimitem e-mailul de confirmare către client
      // TODO: Înlocuiește string-urile de mai jos cu cheile reale din contul tău EmailJS
      const serviceID = 'service_oltwxis'; 
      const templateID = 'template_twteifr'; // Înlocuiește cu Template ID-ul creat de tine
      const publicKey = 'NAOMobCBnJ4bDxI7g';   // Înlocuiește cu Public Key din Account -> API Keys

      // Generăm link-ul dinamic ce va fi trimis în e-mail pe baza originii curente a aplicației
      const clientLink = `${window.location.origin}?code=${generatedAccessCode}`;

      // Obiectul care mapează perfect variabilele din template-ul EmailJS
      const templateParams = {
        client_name: approvingRequest.clientName,
        event_date: approvingRequest.date,
        salon_name: approvingRequest.salonName,
        client_phone: approvingRequest.phone,
        email: approvingRequest.email, // Valoarea mapată pe câmpul To Email {{email}}
        auth_link: clientLink          // Valoarea mapată pe {{auth_link}} din textul e-mailului
      };

      try {
        await emailjs.send(serviceID, templateID, templateParams, publicKey);
        console.log('E-mail de confirmare trimis cu succes prin EmailJS.');
      } catch (emailError) {
        // Logăm eroarea separat pentru a nu bloca interfața dacă e-mailul dă fail temporar
        console.error('Eroare la trimiterea e-mailului prin EmailJS:', emailError);
      }

      // 4. Actualizăm stările în interfață
      const newEvent: ConfirmedEvent = {
        id: eventId,
        date: approvingRequest.date,
        clientName: approvingRequest.clientName,
        guests: approvingRequest.guests,
        phone: approvingRequest.phone,
        email: approvingRequest.email,
        pricePerMeniu: negotiatedPrice,
        salonName: approvingRequest.salonName,            
        extraServices: approvingRequest.extraServices,
        accessCode: generatedAccessCode
      };

      setConfirmedEvents((prev) => [...prev, newEvent]);
      setBookingRequests((prev) => prev.filter(b => b.id !== approvingRequest.id));
      setApprovingRequest(null);

      alert(`Contract confirmat cu succes!\n\nCod acces portal: ${generatedAccessCode}\nE-mailul de notificare a fost trimis către ${approvingRequest.email}.`);

    } catch (error) {
      console.error("Eroare la aprobarea cererii:", error);
      alert("Nu s-a putut finaliza aprobarea contractului.");
    }
  };

  // Respingere cerere din inbox
  const handleRejectRequest = async (id: string) => {
    if (!window.confirm("Sigur dorești să refuzi această cerere de ofertă?")) return;

    try {
      const { error } = await supabase
        .from('booking_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBookingRequests((prev) => prev.filter(b => b.id !== id));
    } catch (error) {
      console.error("Eroare la ștergerea cererii:", error);
    }
  };

  // Anulare nuntă confirmată
  const handleCancelEvent = async (id: string) => {
    if (!window.confirm("Anulezi acest contract? Data va fi eliberată în calendar.")) return;

    try {
      const { error } = await supabase
        .from('confirmed_events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setConfirmedEvents((prev) => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error("Eroare la anularea evenimentului:", error);
    }
  };

  return (
    <div className="w-full min-h-screen bg-zinc-950 text-zinc-100 antialiased font-sans relative pb-12">
      
      {/* Top Navigation Bar */}
      <div className="bg-zinc-900 border-b border-white/10 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-[0.2em] text-white uppercase cursor-pointer" onClick={() => setViewMode('public')}>
              {restaurantConfig.name}
            </span>
            <span className="text-xs text-zinc-400">({restaurantConfig.location})</span>
          </div>

          <div className="flex p-1 gap-3 rounded-xl text-xs">
            <button 
              onClick={() => setViewMode('public')}
              className={`px-4 py-2 rounded-lg transition-all ${viewMode === 'public' ? 'font-semibold text-white bg-white/10' : 'hover:text-zinc-200'}`}
            >
              Home
            </button>
            <button 
              onClick={() => setViewMode('portal')}
              className={`px-4 py-2 rounded-lg transition-all ${viewMode === 'portal' ? 'font-semibold text-white bg-white/10' : 'hover:text-zinc-200'}`}
            >
              Portal Mirat
            </button>
            <button 
              onClick={() => setViewMode('admin')}
              className={`px-4 py-2 rounded-lg transition-all ${viewMode === 'admin' ? 'font-semibold text-white bg-white/10' : 'hover:text-zinc-200'}`}
            >
              Dashboard Manager
            </button>
          </div>
        </div>
      </div>

      {/* Spațiul de lucru */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-sm uppercase tracking-widest text-zinc-400 animate-pulse">Se încarcă datele din sistem...</div>
          </div>
        ) : viewMode === 'public' ? (
          <PublicCalendar 
            confirmedEvents={confirmedEvents}
            bookingRequests={bookingRequests}
            onAddRequest={handleAddRequest}
          />
        ) : viewMode === 'portal' ? (
          /* Placeholder temporar până creăm fișierul componentă ClientPortal.tsx */
          <div className="text-center py-24 bg-zinc-900/40 border border-white/5 rounded-3xl">
            <h3 className="text-lg font-light uppercase tracking-widest mb-2 text-white">Portalul Clienților</h3>
            <p className="text-zinc-400 text-xs">Aici va fi formularul de introducere a codului unic și panoul de organizare mese.</p>
          </div>
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
                <AdminInbox 
                  bookingRequests={bookingRequests}
                  onApprove={triggerApproveFlow}
                  onReject={handleRejectRequest}
                />
                
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

      {/* MODAL CONFIGURARE PREȚ FINAL NEGOCIAT */}
      {approvingRequest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
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
                <p>✉️ Email: <span className="text-white ">{approvingRequest.email || 'Nespecificat'}</span></p>
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