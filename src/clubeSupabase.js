import { createClient } from '@supabase/supabase-js'

// A URL do projeto e a chave publicável são dados públicos por design.
// NUNCA usar a service_role / secret key no bundle enviado ao navegador.
const url = import.meta.env.VITE_CLUBE_SUPABASE_URL?.trim()
const publishableKey = import.meta.env.VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY?.trim()
export const clubeReady = Boolean(url && publishableKey && /^https:\/\/.+\.supabase\.co\/?$/i.test(url))
export const clubeSupabase = clubeReady ? createClient(url, publishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
}) : null

// Acessos reais existem somente quando o projeto Supabase está configurado.
// Sem conexão o site mantém exclusivamente a demonstração fictícia.
