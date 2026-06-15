import { useState, useEffect } from 'react';
import PublicCalendar from './components/PublicCalendar';
import AdminInbox from './components/AdminInbox';
import ConfirmedEvents from './components/ConfirmedEvents';
import { supabase } from './supabaseClient';
import emailjs from '@emailjs/browser';
import ClientPortal from './components/ClientPortal';
import type { BookingRequest, ConfirmedEvent } from './types';

export type { BookingRequest, ConfirmedEvent };

const RESTAURANT = { name: 'Ballroom', location: 'Suceava' };

const EMAILJS = {
  serviceID: 'service_oltwxis',
  templateID: 'template_twteifr',
  publicKey: 'NAOMobCBnJ4bDxI7g',
};

function App() {
  const [viewMode, setViewMode] = useState<'public' | 'admin' | 'portal'>('public');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [approvingRequest, setApprovingRequest] = useState<BookingRequest | null>(null);
  const [negotiatedPrice, setNegotiatedPrice] = useState<number>(85);
  const [confirmedEvents, setConfirmedEvents] = useState<ConfirmedEvent[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('code')) setViewMode('portal');
  }, []);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
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
          email: req.email || '',
          guests: req.guests,
          menuPreference: req.menu_preference,
          estimatedBudget: req.estimated_budget,
          message: req.message,
          salonName: req.salon_name || 'Grand Salon',
          extraServices: req.extra_services || []
        }));

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
          email: ev.email || '',
          pricePerMeniu: ev.price_per_meniu,
          salonName: ev.salon_name || 'Grand Salon',
          extraServices: ev.extra_services || [],
          accessCode: ev.access_code
        }));

        setBookingRequests(mappedRequests);
        setConfirmedEvents(mappedEvents);
      } catch (error) {
        console.error('Error loading data from Supabase:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleAddRequest = async (newRequest: BookingRequest) => {
    try {
      const { error } = await supabase
        .from('booking_requests')
        .insert([{
          id: newRequest.id,
          date: newRequest.date,
          client_name: newRequest.clientName,
          phone: newRequest.phone,
          email: newRequest.email,
          guests: newRequest.guests,
          menu_preference: newRequest.menuPreference,
          estimated_budget: newRequest.estimatedBudget,
          message: newRequest.message,
          salon_name: newRequest.salonName,
          extra_services: newRequest.extraServices
        }]);

      if (error) throw error;
      setBookingRequests(prev => [newRequest, ...prev]);
    } catch (error: any) {
      console.error('Error adding booking request:', error);
      alert(error.message?.includes('unique')
        ? 'Această dată este deja solicitată sau rezervată!'
        : 'A apărut o eroare la trimiterea cererii.');
    }
  };

  const handleLogin = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (passwordInput === 'admin123') {
      setIsAdminLoggedIn(true);
      setLoginError(false);
      setPasswordInput('');
    } else {
      setLoginError(true);
    }
  };

  const triggerApproveFlow = (req: BookingRequest) => {
    setApprovingRequest(req);
    if (req.menuPreference.includes('75')) setNegotiatedPrice(75);
    else if (req.menuPreference.includes('95')) setNegotiatedPrice(95);
    else if (req.menuPreference.includes('120')) setNegotiatedPrice(120);
    else setNegotiatedPrice(85);
  };

  const handleConfirmApproval = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!approvingRequest) return;

    const eventId = `e-${Date.now()}`;
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const generatedAccessCode = Array.from(
      { length: 10 },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join('');

    try {
      const { error: insertError } = await supabase
        .from('confirmed_events')
        .insert([{
          id: eventId,
          date: approvingRequest.date,
          client_name: approvingRequest.clientName,
          guests: approvingRequest.guests,
          phone: approvingRequest.phone,
          email: approvingRequest.email,
          price_per_meniu: negotiatedPrice,
          salon_name: approvingRequest.salonName,
          extra_services: approvingRequest.extraServices,
          access_code: generatedAccessCode
        }]);

      if (insertError) throw insertError;

      const { error: deleteError } = await supabase
        .from('booking_requests')
        .delete()
        .eq('id', approvingRequest.id);

      if (deleteError) throw deleteError;

      const clientLink = `${window.location.origin}?code=${generatedAccessCode}`;
      try {
        await emailjs.send(EMAILJS.serviceID, EMAILJS.templateID, {
          client_name: approvingRequest.clientName,
          event_date: approvingRequest.date,
          salon_name: approvingRequest.salonName,
          client_phone: approvingRequest.phone,
          email: approvingRequest.email,
          auth_link: clientLink
        }, EMAILJS.publicKey);
      } catch (emailError) {
        console.error('EmailJS send failed:', emailError);
      }

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

      setConfirmedEvents(prev => [...prev, newEvent]);
      setBookingRequests(prev => prev.filter(b => b.id !== approvingRequest.id));
      setApprovingRequest(null);

      alert(`Contract confirmat cu succes!\n\nCod acces portal: ${generatedAccessCode}\nE-mailul a fost trimis către ${approvingRequest.email}.`);
    } catch (error) {
      console.error('Error approving booking request:', error);
      alert('Nu s-a putut finaliza aprobarea contractului.');
    }
  };

  const handleRejectRequest = async (id: string) => {
    if (!window.confirm('Sigur dorești să refuzi această cerere de ofertă?')) return;
    try {
      const { error } = await supabase.from('booking_requests').delete().eq('id', id);
      if (error) throw error;
      setBookingRequests(prev => prev.filter(b => b.id !== id));
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const handleCancelEvent = async (id: string) => {
    if (!window.confirm('Anulezi acest contract? Data va fi eliberată în calendar.')) return;
    try {
      const { error } = await supabase.from('confirmed_events').delete().eq('id', id);
      if (error) throw error;
      setConfirmedEvents(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error cancelling event:', error);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#fefcf9] text-stone-800 antialiased font-sans relative pb-12">

      {/* Navigation */}
      <div className="bg-white/90 border-b border-stone-100 sticky top-0 z-30 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-bold tracking-[0.2em] text-stone-900 uppercase cursor-pointer hover:text-rose-700 transition-colors"
              onClick={() => setViewMode('public')}
            >
              {RESTAURANT.name}
            </span>
            <span className="text-xs text-stone-400">({RESTAURANT.location})</span>
          </div>

          <div className="flex p-1 gap-1 rounded-xl text-xs">
            <button
              onClick={() => setViewMode('public')}
              className={`px-4 py-2 rounded-lg transition-all font-medium ${
                viewMode === 'public'
                  ? 'text-rose-700 bg-rose-50 border border-rose-100'
                  : 'text-stone-500 hover:text-rose-600 hover:bg-rose-50/50'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setViewMode('portal')}
              className={`px-4 py-2 rounded-lg transition-all font-medium ${
                viewMode === 'portal'
                  ? 'text-rose-700 bg-rose-50 border border-rose-100'
                  : 'text-stone-500 hover:text-rose-600 hover:bg-rose-50/50'
              }`}
            >
              Portal Mirat
            </button>
            <button
              onClick={() => setViewMode('admin')}
              className={`px-4 py-2 rounded-lg transition-all font-medium ${
                viewMode === 'admin'
                  ? 'text-rose-700 bg-rose-50 border border-rose-100'
                  : 'text-stone-500 hover:text-rose-600 hover:bg-rose-50/50'
              }`}
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-sm uppercase tracking-widest text-stone-400 animate-pulse">
              Se încarcă datele din sistem...
            </div>
          </div>
        ) : viewMode === 'public' ? (
          <PublicCalendar
            confirmedEvents={confirmedEvents}
            bookingRequests={bookingRequests}
            onAddRequest={handleAddRequest}
          />
        ) : viewMode === 'portal' ? (
          <ClientPortal />
        ) : (
          <div className="space-y-12">
            {!isAdminLoggedIn ? (
              <div className="max-w-md mx-auto py-16">
                <form onSubmit={handleLogin} className="bg-white border border-stone-100 p-8 rounded-3xl space-y-6 shadow-xl">
                  <div className="text-center space-y-1 mb-2">
                    <h3 className="text-xl font-light uppercase tracking-widest text-stone-900">Logare Manager</h3>
                    <p className="text-xs text-stone-400">Acces exclusiv pentru administratori</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-stone-500 block mb-1">Parolă</label>
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5 text-sm text-stone-900 focus:outline-none focus:border-rose-300 transition-colors"
                    />
                    {loginError && <p className="text-red-500 text-xs pt-1 font-medium">Parolă incorectă.</p>}
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-rose-700 text-white py-3.5 rounded-xl font-semibold uppercase tracking-widest text-xs hover:bg-rose-800 transition-colors"
                  >
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

      {/* Approval Modal */}
      {approvingRequest && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-stone-100 rounded-3xl max-w-sm w-full p-6 text-xs shadow-2xl">
            <div className="mb-6 space-y-1">
              <h3 className="text-base uppercase tracking-widest text-stone-900 font-light">Confirmă Contractul</h3>
              <p className="text-stone-500">Stabilește prețul negociat pentru {approvingRequest.clientName}.</p>
            </div>

            <form onSubmit={handleConfirmApproval} className="space-y-5">
              <div>
                <label className="block text-stone-400 uppercase tracking-widest text-[9px] mb-2 font-semibold">
                  Preț Negociat Meniu (€ / persoană)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="1"
                    value={negotiatedPrice}
                    onChange={(e) => setNegotiatedPrice(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-4 pr-16 py-3.5 text-stone-900 focus:outline-none focus:border-rose-300 text-base font-semibold transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-stone-400 font-semibold">
                    € / pers
                  </span>
                </div>
              </div>

              <div className="bg-rose-50/60 border border-rose-100 p-3 rounded-xl space-y-1.5 text-stone-600">
                <p>📅 Data: <span className="text-stone-900 font-mono">{approvingRequest.date}</span></p>
                <p>👥 Invitați: <span className="text-stone-900 font-semibold">{approvingRequest.guests} persoane</span></p>
                <p>📞 Contact: <span className="text-stone-900 font-mono">{approvingRequest.phone}</span></p>
                <p>✉️ Email: <span className="text-stone-900">{approvingRequest.email || 'Nespecificat'}</span></p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setApprovingRequest(null)}
                  className="flex-1 bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 py-3.5 rounded-xl uppercase tracking-widest text-[9px] font-semibold transition-colors"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-rose-700 text-white hover:bg-rose-800 py-3.5 rounded-xl font-bold uppercase tracking-widest text-[9px] transition-colors"
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
