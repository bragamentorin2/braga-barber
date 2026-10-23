-- Migration: Adiciona coluna description em personal_provisions
-- Aplicar via Supabase Dashboard > SQL Editor
ALTER TABLE personal_provisions
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

COMMENT ON COLUMN personal_provisions.description IS
  'Nota opcional da provisao. Aparece em verde abaixo do nome na Carteira Pessoal.';
