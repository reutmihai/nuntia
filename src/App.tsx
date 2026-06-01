// src/App.tsx
import { useState } from 'react';

// Structurile de date de bază (folosite ulterior în componente separate)
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
  // Configurația de bază a restaurantului
  const restaurantConfig = {
    name: "Ballroom",
    location: "Suceava"
  };

  // Starea pentru navigarea principală între interfețe
  const [viewMode, setViewMode] = useState<'public' | 'admin'>('public');

  return (
    <div className="w-full min-h-screen bg-zinc-950 text-zinc-100 antialiased font-sans relative pb-12">
      
      {/* Top Navigation Bar - Structura de bază pentru simulare */}
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
              className={`px-4 py-2 rounded-lg transition-all ${viewMode === 'public' ? 'bg-white text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Home
            </button>
            <button 
              onClick={() => setViewMode('admin')}
              className={`px-4 py-2 rounded-lg transition-all ${viewMode === 'admin' ? 'bg-white text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              Dashboard Manager
            </button>
          </div>
        </div>
      </div>

      {/* Spațiul de lucru pentru viitoarele componente */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {viewMode === 'public' ? (
          <div className="text-center py-20 space-y-4">
            <h1 className="text-4xl font-extralight uppercase tracking-widest text-white">
              Planifică Nunta Ta
            </h1>
            <p className="text-sm text-zinc-400 font-light max-w-md mx-auto leading-relaxed">
              Modulul pentru clienți și calendarul public vor fi dezvoltate pe un branch dedicat.
            </p>
          </div>
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