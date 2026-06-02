import { createClient } from '@supabase/supabase-js';

// Luăm variabilele de mediu din Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validare rapidă pentru a ne asigura că variabilele sunt citite corect
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL sau Anon Key lipsesc din fișierul de mediu (.env)!");
}

// Inițializăm și exportăm clientul Supabase pentru a-l folosi în restul aplicației
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');