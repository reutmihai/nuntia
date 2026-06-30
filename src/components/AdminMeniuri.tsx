import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { MenuOption, CourseKey } from '../types';

const COURSES: { key: CourseKey; label: string; hint: string }[] = [
  { key: 'felul1', label: 'Felul 1', hint: 'Aperitive / Ciorbă' },
  { key: 'felul2', label: 'Felul 2', hint: 'Antreu' },
  { key: 'felul3', label: 'Felul 3', hint: 'Felul principal' },
  { key: 'felul4', label: 'Felul 4', hint: 'Desert / Tort' },
];

interface NewOptionForm {
  title: string;
  description: string;
  pricePerPerson: string;
}

const EMPTY_FORM: NewOptionForm = { title: '', description: '', pricePerPerson: '' };

export default function AdminMeniuri() {
  const [options, setOptions] = useState<MenuOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<Record<CourseKey, NewOptionForm>>({
    felul1: { ...EMPTY_FORM },
    felul2: { ...EMPTY_FORM },
    felul3: { ...EMPTY_FORM },
    felul4: { ...EMPTY_FORM },
  });
  const [addingFor, setAddingFor] = useState<CourseKey | null>(null);

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

  const handleAdd = async (course: CourseKey) => {
    const form = forms[course];
    if (!form.title.trim()) return;

    const newRow = {
      course,
      title: form.title.trim(),
      description: form.description.trim() || null,
      price_per_person: form.pricePerPerson ? parseFloat(form.pricePerPerson) : null,
    };

    const { data, error } = await supabase
      .from('menu_options')
      .insert([newRow])
      .select()
      .single();

    if (!error && data) {
      setOptions(prev => [...prev, {
        id: data.id,
        course: data.course as CourseKey,
        title: data.title,
        description: data.description ?? undefined,
        pricePerPerson: data.price_per_person ?? undefined,
      }]);
      setForms(prev => ({ ...prev, [course]: { ...EMPTY_FORM } }));
      setAddingFor(null);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('menu_options').delete().eq('id', id);
    if (!error) setOptions(prev => prev.filter(o => o.id !== id));
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <p className="text-xs text-stone-400 uppercase tracking-widest animate-pulse">Se încarcă meniurile...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg uppercase tracking-wider font-light text-stone-900">Opțiuni Meniu</h3>
        <p className="text-xs text-stone-400 mt-1">
          Adaugă variantele disponibile per fel. Clienții le vor vedea în portalul lor și pot alege câte una per fel.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {COURSES.map(({ key, label, hint }, idx) => {
          const courseOptions = options.filter(o => o.course === key);
          const isAdding = addingFor === key;
          const form = forms[key];

          return (
            <div key={key} className="bg-white border border-stone-100 rounded-3xl p-6 space-y-4 shadow-sm">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-600 text-sm font-light shrink-0">
                  {idx + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-800 uppercase tracking-wider">{label}</p>
                  <p className="text-[10px] text-stone-400">{hint}</p>
                </div>
                <span className="ml-auto text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full border border-stone-200">
                  {courseOptions.length} {courseOptions.length === 1 ? 'opțiune' : 'opțiuni'}
                </span>
              </div>

              {/* Options list */}
              <div className="space-y-2">
                {courseOptions.length === 0 && (
                  <p className="text-[11px] text-stone-300 italic px-1">Nicio opțiune adăugată.</p>
                )}
                {courseOptions.map(opt => (
                  <div key={opt.id} className="flex items-start justify-between gap-3 bg-stone-50 border border-stone-100 rounded-xl px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-800 font-medium truncate">{opt.title}</p>
                      {opt.description && (
                        <p className="text-[11px] text-stone-400 mt-0.5 line-clamp-2">{opt.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {opt.pricePerPerson !== undefined && (
                        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg whitespace-nowrap">
                          {opt.pricePerPerson} €
                        </span>
                      )}
                      <button
                        onClick={() => handleDelete(opt.id)}
                        className="text-stone-300 hover:text-red-400 transition-colors text-xl leading-none"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add form */}
              {isAdding ? (
                <div className="border border-rose-100 bg-rose-50/40 rounded-2xl p-4 space-y-3">
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForms(prev => ({ ...prev, [key]: { ...prev[key], title: e.target.value } }))}
                    placeholder="Denumire (ex: Ciorbă de burtă) *"
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-rose-300 placeholder:text-stone-300 transition-colors"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={form.description}
                    onChange={e => setForms(prev => ({ ...prev, [key]: { ...prev[key], description: e.target.value } }))}
                    placeholder="Descriere (opțional)"
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-rose-300 placeholder:text-stone-300 transition-colors"
                  />
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={form.pricePerPerson}
                        onChange={e => setForms(prev => ({ ...prev, [key]: { ...prev[key], pricePerPerson: e.target.value } }))}
                        placeholder="Preț / pers. (opțional)"
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-rose-300 placeholder:text-stone-300 transition-colors"
                      />
                      {form.pricePerPerson && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">€</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAdd(key)}
                      disabled={!form.title.trim()}
                      className="flex-1 bg-rose-700 text-white py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-rose-800 transition-colors disabled:opacity-40"
                    >
                      Adaugă
                    </button>
                    <button
                      onClick={() => { setAddingFor(null); setForms(prev => ({ ...prev, [key]: { ...EMPTY_FORM } })); }}
                      className="px-4 py-2.5 rounded-xl text-xs text-stone-500 border border-stone-200 hover:bg-stone-50 transition-colors"
                    >
                      Anulează
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingFor(key)}
                  className="w-full border border-dashed border-stone-200 rounded-xl py-2.5 text-xs text-stone-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/30 transition-colors uppercase tracking-wider"
                >
                  + Adaugă opțiune
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
