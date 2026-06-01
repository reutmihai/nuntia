// src/App.tsx
import { useState } from 'react';
import PublicCalendar from './components/PublicCalendar';

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
}

function App() {
  const currentYear = new Date().getFullYear();

  // Configurația de bază a restaurantului
  const restaurantConfig = {
    name: "Ballroom",
    location: "Suceava"
  };

  // Starea pentru navigarea principală între interfețe
  const [viewMode, setViewMode] = useState<'public' | 'admin'>('public');

  // --- STĂRI GLOBALE PENTRU DATE ---
  // State pentru evenimentele deja CONFIRMATE (zile blocate cu roșu)
  const [confirmedEvents, setConfirmedEvents] = useState<ConfirmedEvent[]>([
    { id: 'e1', date: `${currentYear}-06-20`, clientName: 'Andrei & Elena', guests: 250 },
    { id: 'e2', date: `${currentYear}-09-12`, clientName: 'Mihai & Maria', guests: 300 },
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

  // Funcție pentru adăugarea unei cereri noi din formularul public
  const handleAddRequest = (newRequest: BookingRequest) => {
    setBookingRequests((prevRequests) => [...prevRequests, newRequest]);
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
          <div className="flex p-1 gap-2 rounded-xl text-xs">
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
          // Pasăm stările și funcția de adăugare către componenta izolată a calendarului
          <PublicCalendar 
            confirmedEvents={confirmedEvents}
            bookingRequests={bookingRequests}
            onAddRequest={handleAddRequest}
          />
        ) : (
          <div className="text-center py-20 space-y-4">
            <h1 className="text-4xl font-extralight uppercase tracking-widest text-white">
              Dashboard Manager
            </h1>
            <p className="text-sm text-zinc-400 font-light max-w-md mx-auto leading-relaxed">
              Panoul de administrare contracte și inbox-ul de cereri vor fi dezvoltate separat.
            </p>
          </div>
        )}
      </main>

    </div>
  );
}

export default App;