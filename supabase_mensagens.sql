-- Execute este SQL no painel do Supabase (SQL Editor)
-- Tabela: mensagens diretas (Direção ↔ Aluno)

CREATE TABLE IF NOT EXISTS mensagens (
  id SERIAL PRIMARY KEY,
  de_email TEXT NOT NULL,
  de_nome TEXT NOT NULL,
  de_tipo TEXT NOT NULL DEFAULT 'direcao',
  para_email TEXT NOT NULL,
  para_nome TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_mensagens_para_email ON mensagens(para_email);
CREATE INDEX IF NOT EXISTS idx_mensagens_de_email ON mensagens(de_email);
CREATE INDEX IF NOT EXISTS idx_mensagens_created_at ON mensagens(created_at DESC);
