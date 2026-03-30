CREATE TABLE IF NOT EXISTS solicitacoes_direcao (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  mensagem TEXT DEFAULT '',
  senha_hash TEXT,
  tem_senha BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_email ON solicitacoes_direcao(email);

-- Se a tabela já existe, adicione as novas colunas:
ALTER TABLE solicitacoes_direcao ADD COLUMN IF NOT EXISTS senha_hash TEXT;
ALTER TABLE solicitacoes_direcao ADD COLUMN IF NOT EXISTS tem_senha BOOLEAN DEFAULT FALSE;
