CREATE TABLE IF NOT EXISTS solicitacoes_direcao (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  mensagem TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_email ON solicitacoes_direcao(email);
