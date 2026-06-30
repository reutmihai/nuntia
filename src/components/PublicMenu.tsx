import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { MenuOption, CourseKey } from '../types';

const COURSES: { key: CourseKey; label: string; hint: string; icon: string }[] = [
  { key: 'felul1', label: 'Felul 1', hint: 'Aperitive / Ciorbă', icon: '🥗' },
  { key: 'felul2', label: 'Felul 2', hint: 'Antreu', icon: '🍽️' },
  { key: 'felul3', label: 'Felul 3', hint: 'Felul principal', icon: '🍖' },
  { key: 'felul4', label: 'Felul 4', hint: 'Desert / Tort', icon: '🎂' },
];

export default function PublicMenu() {
  const [options, setOptions] = useState<MenuOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('menu_options')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setOptions(data.map(row => ({
          id: row.id,
          course: row.course as CourseKey,
          title: row.title,
          description: row.description ?? undefined,
          pricePerPerson: row.price_per_person ?? undefined,
        })));
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <p className="text-xs text-stone-400 uppercase tracking-widest animate-pulse">Se încarcă meniul...</p>
    </div>
  );

  const hasAnyOptions = options.length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-10 py-4 sm:py-8">
      <div className="text-center space-y-3">
        <p className="text-[10px] uppercase tracking-[0.3em] text-rose-500 font-semibold">Ballroom · Suceava</p>
        <h2 className="text-3xl font-extralight uppercase tracking-widest text-stone-900">Meniu Nuntă</h2>
        <p className="text-xs text-stone-400 max-w-sm mx-auto leading-relaxed">
          Descoperă variantele noastre de meniu. Clienții confirmați pot selecta preferințele direct din portalul personal.
        </p>
      </div>

      {!hasAnyOptions ? (
        <div className="bg-white border border-dashed border-stone-200 rounded-3xl p-16 text-center">
          <p className="text-stone-300 text-sm">Meniul va fi disponibil în curând.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {COURSES.map(({ key, label, hint, icon }, idx) => {
            const courseOptions = options.filter(o => o.course === key);
            if (courseOptions.length === 0) return null;
            return (
              <div key={key} className="space-y-3">
                {/* Course header */}
                <div className="flex items-center gap-3 px-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{icon}</span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-stone-700">{label}</p>
                      <p className="text-[10px] text-stone-400">{hint}</p>
                    </div>
                  </div>
                  <div className="flex-1 h-px bg-stone-100 ml-2" />
                  <span className="text-[10px] text-stone-400 shrink-0">
                    {courseOptions.length} {courseOptions.length === 1 ? 'variantă' : 'variante'}
                  </span>
                </div>

                {/* Options grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {courseOptions.map((opt, i) => (
                    <div
                      key={opt.id}
                      className="bg-white border border-stone-100 rounded-2xl p-5 shadow-sm space-y-2 hover:border-rose-100 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-stone-900 text-sm leading-snug">{opt.title}</p>
                        {opt.pricePerPerson !== undefined && (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0">
                            {opt.pricePerPerson} € / pers
                          </span>
                        )}
                      </div>
                      {opt.description && (
                        <p className="text-xs text-stone-400 leading-relaxed">{opt.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-center pt-4">
        <p className="text-[10px] text-stone-300 uppercase tracking-widest">
          Prețurile sunt orientative și pot fi negociate la semnarea contractului.
        </p>
      </div>
    </div>
  );
}
