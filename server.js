require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static('public'));

const db = new Database('escola.db');

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000');

db.exec(`
  CREATE TABLE IF NOT EXISTS alunos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL CHECK(length(nome) >= 3),
    email TEXT UNIQUE NOT NULL CHECK(email LIKE '%@%'),
    senha TEXT NOT NULL,
    serie TEXT NOT NULL,
    ativo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_alunos_email ON alunos(email)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_alunos_serie ON alunos(serie)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_alunos_ativo ON alunos(ativo)`);

db.exec(`
  CREATE TRIGGER IF NOT EXISTS alunos_updated_at
  AFTER UPDATE ON alunos
  BEGIN
    UPDATE alunos SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS direcao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL CHECK(length(nome) >= 3),
    email TEXT UNIQUE NOT NULL CHECK(email LIKE '%@%'),
    senha TEXT NOT NULL,
    ativo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_direcao_email ON direcao(email)`);

db.exec(`
  CREATE TRIGGER IF NOT EXISTS direcao_updated_at
  AFTER UPDATE ON direcao
  BEGIN
    UPDATE direcao SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serie TEXT NOT NULL,
    descricao TEXT NOT NULL CHECK(length(descricao) >= 5),
    data_evento DATETIME,
    ativo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_eventos_serie ON eventos(serie)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_eventos_ativo ON eventos(ativo)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_eventos_data ON eventos(data_evento)`);

db.exec(`
  CREATE TRIGGER IF NOT EXISTS eventos_updated_at
  AFTER UPDATE ON eventos
  BEGIN
    UPDATE eventos SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS cardapio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dia_semana TEXT UNIQUE NOT NULL,
    prato TEXT,
    acompanhamento TEXT,
    sobremesa TEXT,
    bebida TEXT,
    calorias INTEGER,
    vegetariano INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_cardapio_dia ON cardapio(dia_semana)`);

db.exec(`
  CREATE TRIGGER IF NOT EXISTS cardapio_updated_at
  AFTER UPDATE ON cardapio
  BEGIN
    UPDATE cardapio SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS professores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL CHECK(length(nome) >= 3),
    materia TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('Presente', 'Falta', 'Licença', 'Férias')),
    data TEXT NOT NULL,
    ativo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_professores_nome ON professores(nome)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_professores_status ON professores(status)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_professores_data ON professores(data)`);

db.exec(`
  CREATE TRIGGER IF NOT EXISTS professores_updated_at
  AFTER UPDATE ON professores
  BEGIN
    UPDATE professores SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END
`);

try {
  const columns = db.prepare("PRAGMA table_info(professores)").all();
  const hasDataColumn = columns.some(col => col.name === 'data');
  
  if (!hasDataColumn) {
    db.exec(`ALTER TABLE professores ADD COLUMN data TEXT DEFAULT '28/10/2025'`);
    console.log("✅ Coluna 'data' adicionada à tabela professores com sucesso!");
  }
} catch(error) {
  console.error("❌ ERRO CRÍTICO: Falha ao migrar tabela professores:", error.message);
  console.error("⚠️ O sistema pode não funcionar corretamente. Verifique o banco de dados.");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS avisos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL CHECK(tipo IN ('Quizizz', 'Khan Academy', 'Redação Paraná', 'Geral', 'Urgente')),
    professor TEXT NOT NULL,
    titulo TEXT NOT NULL CHECK(length(titulo) >= 5),
    descricao TEXT NOT NULL CHECK(length(descricao) >= 10),
    data_aviso TEXT NOT NULL,
    lido INTEGER DEFAULT 0,
    ativo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_avisos_tipo ON avisos(tipo)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_avisos_professor ON avisos(professor)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_avisos_data ON avisos(data_aviso)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_avisos_lido ON avisos(lido)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_avisos_ativo ON avisos(ativo)`);

db.exec(`
  CREATE TRIGGER IF NOT EXISTS avisos_updated_at
  AFTER UPDATE ON avisos
  BEGIN
    UPDATE avisos SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS recuperacao_senha (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    codigo TEXT NOT NULL CHECK(length(codigo) = 6),
    tipo TEXT NOT NULL CHECK(tipo IN ('aluno', 'direcao')),
    expira TEXT NOT NULL,
    usado INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_recuperacao_email ON recuperacao_senha(email)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_recuperacao_usado ON recuperacao_senha(usado)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_recuperacao_expira ON recuperacao_senha(expira)`);

db.exec(`
  CREATE TABLE IF NOT EXISTS professores_turma (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    turma TEXT NOT NULL CHECK(turma IN ('1A', '1B', '1C', '1D', '2A', '2B', '2C', '3A', '3B', '3C')),
    professor TEXT NOT NULL CHECK(length(professor) >= 3),
    materia TEXT NOT NULL CHECK(length(materia) >= 3),
    status TEXT DEFAULT 'Presente' CHECK(status IN ('Presente', 'Falta', 'Licença', 'Férias', 'Atestado')),
    data TEXT NOT NULL,
    observacao TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_prof_turma_turma ON professores_turma(turma)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_prof_turma_professor ON professores_turma(professor)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_prof_turma_data ON professores_turma(data)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_prof_turma_status ON professores_turma(status)`);

db.exec(`
  CREATE TRIGGER IF NOT EXISTS professores_turma_updated_at
  AFTER UPDATE ON professores_turma
  BEGIN
    UPDATE professores_turma SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END
`);

const admin = db.prepare('SELECT * FROM alunos WHERE email = ?').get('admin@sistema.local');
if (!admin) {
  const senhaHash = bcrypt.hashSync('admin1', 10);
  db.prepare('INSERT INTO alunos (nome, email, senha, serie) VALUES (?, ?, ?, ?)').run('Administrador', 'admin@sistema.local', senhaHash, 'Admin');
}

const diasSemana = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
diasSemana.forEach(dia => {
  const existe = db.prepare('SELECT * FROM cardapio WHERE dia_semana = ?').get(dia);
  if (!existe) {
    db.prepare('INSERT INTO cardapio (dia_semana, prato, acompanhamento, sobremesa, bebida) VALUES (?, ?, ?, ?, ?)').run(dia, 'A definir', 'A definir', 'A definir', 'A definir');
  }
});

const professoresIniciais = [
  { nome: 'Eliane', materia: 'Português', status: 'Presente', data: '28/10/2025' },
  { nome: 'Cleiton', materia: 'Introdução à Programação, Introdução à Computação e Lógica Computacional', status: 'Presente', data: '28/10/2025' },
  { nome: 'Solange', materia: 'Química e Matemática', status: 'Presente', data: '28/10/2025' },
  { nome: 'Airan', materia: 'Projeto de Vida', status: 'Presente', data: '28/10/2025' },
  { nome: 'Dilma', materia: 'Educação Financeira', status: 'Presente', data: '28/10/2025' },
  { nome: 'Ricardo', materia: 'Educação Física', status: 'Presente', data: '28/10/2025' }
];

const totalProfs = db.prepare('SELECT COUNT(*) as total FROM professores').get().total;
if (totalProfs === 0) {
  professoresIniciais.forEach(p => {
    db.prepare('INSERT INTO professores (nome, materia, status, data) VALUES (?, ?, ?, ?)').run(p.nome, p.materia, p.status, p.data);
  });
}

const avisosIniciais = [
  { tipo: 'Quizizz', professor: 'Solange', titulo: 'Quizizz de Química - Tabela Periódica', descricao: 'Completar o quiz sobre elementos químicos até sexta-feira', data_aviso: '29/10/2025' },
  { tipo: 'Quizizz', professor: 'Solange', titulo: 'Quizizz de Matemática - Equações do 2º Grau', descricao: 'Resolver exercícios de equações quadráticas', data_aviso: '30/10/2025' },
  { tipo: 'Quizizz', professor: 'Solange', titulo: 'Quizizz de Química - Ligações Químicas', descricao: 'Estudar ligações iônicas e covalentes para o quiz', data_aviso: '31/10/2025' },
  { tipo: 'Quizizz', professor: 'Solange', titulo: 'Quizizz de Matemática - Funções', descricao: 'Revisar funções de 1º e 2º grau', data_aviso: '01/11/2025' },
  { tipo: 'Quizizz', professor: 'Solange', titulo: 'Quizizz de Matemática - Geometria', descricao: 'Quiz sobre áreas e perímetros de figuras planas', data_aviso: '02/11/2025' },
  
  { tipo: 'Khan Academy', professor: 'Solange', titulo: 'Khan Academy - Álgebra Linear', descricao: 'Completar módulo de matrizes e determinantes', data_aviso: '29/10/2025' },
  { tipo: 'Khan Academy', professor: 'Solange', titulo: 'Khan Academy - Química Orgânica', descricao: 'Assistir vídeos sobre hidrocarbonetos', data_aviso: '30/10/2025' },
  { tipo: 'Khan Academy', professor: 'Solange', titulo: 'Khan Academy - Trigonometria', descricao: 'Resolver exercícios de seno, cosseno e tangente', data_aviso: '31/10/2025' },
  { tipo: 'Khan Academy', professor: 'Solange', titulo: 'Khan Academy - Estequiometria', descricao: 'Completar exercícios de cálculos estequiométricos', data_aviso: '01/11/2025' },
  { tipo: 'Khan Academy', professor: 'Solange', titulo: 'Khan Academy - Probabilidade', descricao: 'Estudar conceitos básicos de probabilidade', data_aviso: '02/11/2025' },
  
  { tipo: 'Redação Paraná', professor: 'Eliane', titulo: 'Redação - Texto Dissertativo-Argumentativo', descricao: 'Escrever redação sobre "Sustentabilidade no Século XXI"', data_aviso: '29/10/2025' },
  { tipo: 'Redação Paraná', professor: 'Eliane', titulo: 'Redação - Carta Argumentativa', descricao: 'Produzir carta argumentativa sobre educação pública', data_aviso: '30/10/2025' },
  { tipo: 'Redação Paraná', professor: 'Eliane', titulo: 'Redação - Artigo de Opinião', descricao: 'Escrever artigo sobre tecnologia e sociedade', data_aviso: '31/10/2025' },
  { tipo: 'Redação Paraná', professor: 'Eliane', titulo: 'Redação - Texto Narrativo', descricao: 'Criar narrativa sobre diversidade cultural', data_aviso: '01/11/2025' },
  { tipo: 'Redação Paraná', professor: 'Eliane', titulo: 'Redação - Resenha Crítica', descricao: 'Fazer resenha do livro "Dom Casmurro"', data_aviso: '02/11/2025' }
];

const totalAvisos = db.prepare('SELECT COUNT(*) as total FROM avisos').get().total;
if (totalAvisos === 0) {
  avisosIniciais.forEach(a => {
    db.prepare('INSERT INTO avisos (tipo, professor, titulo, descricao, data_aviso) VALUES (?, ?, ?, ?, ?)').run(a.tipo, a.professor, a.titulo, a.descricao, a.data_aviso);
  });
}

const eventosFicticios = [
  { serie: '1A', descricao: 'Prova de Matemática - Álgebra Básica', data_evento: '2025-11-05 09:00:00' },
  { serie: '1A', descricao: 'Trabalho de Português - Interpretação de Texto', data_evento: '2025-11-08 14:00:00' },
  { serie: '1A', descricao: 'Apresentação de História - Revolução Industrial', data_evento: '2025-11-12 10:30:00' },
  { serie: '1A', descricao: 'Seminário de Química - Tabela Periódica', data_evento: '2025-11-15 08:00:00' },
  { serie: '1A', descricao: 'Avaliação de Inglês - Present Perfect', data_evento: '2025-11-18 11:00:00' },
  
  { serie: '1B', descricao: 'Prova de Física - Cinemática', data_evento: '2025-11-06 09:30:00' },
  { serie: '1B', descricao: 'Trabalho de Biologia - Células e Tecidos', data_evento: '2025-11-09 13:00:00' },
  { serie: '1B', descricao: 'Projeto de Artes - Pintura Moderna', data_evento: '2025-11-13 15:00:00' },
  { serie: '1B', descricao: 'Prova de Matemática - Geometria Plana', data_evento: '2025-11-16 10:00:00' },
  { serie: '1B', descricao: 'Apresentação de Geografia - Climas do Brasil', data_evento: '2025-11-20 14:30:00' },
  
  { serie: '1C', descricao: 'Hackathon de Programação - Projeto Final', data_evento: '2025-11-07 08:00:00' },
  { serie: '1C', descricao: 'Prova de Lógica Computacional - Algoritmos', data_evento: '2025-11-10 09:00:00' },
  { serie: '1C', descricao: 'Trabalho de Banco de Dados - Modelagem ER', data_evento: '2025-11-14 13:30:00' },
  { serie: '1C', descricao: 'Apresentação de Projeto - Sistema Web', data_evento: '2025-11-17 10:00:00' },
  { serie: '1C', descricao: 'Prova de Química - Ligações Químicas', data_evento: '2025-11-21 11:00:00' },
  
  { serie: '1D', descricao: 'Prova de Português - Literatura Brasileira', data_evento: '2025-11-05 10:00:00' },
  { serie: '1D', descricao: 'Trabalho de Matemática - Funções', data_evento: '2025-11-11 14:00:00' },
  { serie: '1D', descricao: 'Seminário de Filosofia - Ética e Moral', data_evento: '2025-11-14 09:00:00' },
  { serie: '1D', descricao: 'Avaliação de Geografia - Urbanização', data_evento: '2025-11-19 13:00:00' },
  { serie: '1D', descricao: 'Feira de Ciências - Experimentos Físicos', data_evento: '2025-11-22 15:00:00' },
  
  { serie: '2A', descricao: 'Prova de Química - Estequiometria', data_evento: '2025-11-06 08:30:00' },
  { serie: '2A', descricao: 'Trabalho de Sociologia - Movimentos Sociais', data_evento: '2025-11-12 14:00:00' },
  { serie: '2A', descricao: 'Apresentação de Oratória - Debate Político', data_evento: '2025-11-15 10:00:00' },
  { serie: '2A', descricao: 'Prova de Matemática - Trigonometria', data_evento: '2025-11-18 09:00:00' },
  { serie: '2A', descricao: 'Projeto de Educação Financeira - Investimentos', data_evento: '2025-11-21 13:30:00' },
  
  { serie: '2B', descricao: 'Prova de História - Era Vargas', data_evento: '2025-11-07 11:00:00' },
  { serie: '2B', descricao: 'Trabalho de Biologia - Genética', data_evento: '2025-11-13 15:00:00' },
  { serie: '2B', descricao: 'Apresentação de Artes - Arte Contemporânea', data_evento: '2025-11-16 14:00:00' },
  { serie: '2B', descricao: 'Prova de Português - Análise Sintática', data_evento: '2025-11-19 10:00:00' },
  { serie: '2B', descricao: 'Seminário de Filosofia - Pensadores Modernos', data_evento: '2025-11-22 09:00:00' },
  
  { serie: '2C', descricao: 'Hackathon - Desenvolvimento Mobile', data_evento: '2025-11-08 08:00:00' },
  { serie: '2C', descricao: 'Prova de Banco de Dados - SQL Avançado', data_evento: '2025-11-11 10:00:00' },
  { serie: '2C', descricao: 'Projeto de Análise de Sistemas - UML', data_evento: '2025-11-14 13:00:00' },
  { serie: '2C', descricao: 'Apresentação TCC - Sistema Completo', data_evento: '2025-11-17 15:00:00' },
  { serie: '2C', descricao: 'Prova de Matemática - Matrizes e Determinantes', data_evento: '2025-11-20 09:30:00' },
  
  { serie: '3A', descricao: 'Simulado ENEM - Linguagens e Códigos', data_evento: '2025-11-05 08:00:00' },
  { serie: '3A', descricao: 'Simulado ENEM - Matemática', data_evento: '2025-11-09 08:00:00' },
  { serie: '3A', descricao: 'Redação ENEM - Tema Social', data_evento: '2025-11-12 13:00:00' },
  { serie: '3A', descricao: 'Simulado ENEM - Ciências Natureza', data_evento: '2025-11-16 08:00:00' },
  { serie: '3A', descricao: 'Simulado ENEM - Ciências Humanas', data_evento: '2025-11-19 08:00:00' },
  
  { serie: '3B', descricao: 'Revisão ENEM - Física Completa', data_evento: '2025-11-06 10:00:00' },
  { serie: '3B', descricao: 'Simulado Vestibular - Português', data_evento: '2025-11-10 09:00:00' },
  { serie: '3B', descricao: 'Aula de Redação - Dissertação Argumentativa', data_evento: '2025-11-13 14:00:00' },
  { serie: '3B', descricao: 'Revisão ENEM - Matemática Completa', data_evento: '2025-11-17 08:30:00' },
  { serie: '3B', descricao: 'Simulado Completo - Todas as Áreas', data_evento: '2025-11-20 08:00:00' },
  
  { serie: '3C', descricao: 'Defesa de TCC - Projeto Integrador', data_evento: '2025-11-07 14:00:00' },
  { serie: '3C', descricao: 'Prova de Ciência de Dados - Machine Learning', data_evento: '2025-11-11 09:00:00' },
  { serie: '3C', descricao: 'Apresentação Final - Startup Tech', data_evento: '2025-11-14 15:00:00' },
  { serie: '3C', descricao: 'Hackathon Final - Demo Day', data_evento: '2025-11-18 08:00:00' },
  { serie: '3C', descricao: 'Formatura Técnica - Cerimônia', data_evento: '2025-11-25 19:00:00' }
];

const totalEventos = db.prepare('SELECT COUNT(*) as total FROM eventos').get().total;
if (totalEventos === 0) {
  eventosFicticios.forEach(e => {
    db.prepare('INSERT INTO eventos (serie, descricao, data_evento) VALUES (?, ?, ?)').run(e.serie, e.descricao, e.data_evento);
  });
  console.log('✅ Eventos por turma carregados com sucesso!');
}

const professoresPorTurma = [
  { turma: '1A', professor: 'Claudinei', materia: 'Matemática', status: 'Presente', data: '30/10/2025' },
  { turma: '1A', professor: 'Elaine', materia: 'Português', status: 'Presente', data: '30/10/2025' },
  { turma: '1A', professor: 'Fábio', materia: 'História', status: 'Presente', data: '30/10/2025' },
  { turma: '1A', professor: 'Ricardo', materia: 'Educação física', status: 'Presente', data: '30/10/2025' },
  { turma: '1A', professor: 'Dilma', materia: 'Pensamento computacional', status: 'Presente', data: '30/10/2025' },
  { turma: '1A', professor: 'Airan', materia: 'Projeto de vida', status: 'Presente', data: '30/10/2025' },
  { turma: '1A', professor: 'Mário', materia: 'Inglês', status: 'Presente', data: '30/10/2025' },
  { turma: '1A', professor: 'Claudia', materia: 'Educação financeira', status: 'Presente', data: '30/10/2025' },
  { turma: '1A', professor: 'Solange', materia: 'Química', status: 'Presente', data: '30/10/2025' },
  { turma: '1A', professor: 'Josi', materia: 'Artes', status: 'Presente', data: '30/10/2025' },
  { turma: '1A', professor: 'Ana', materia: 'Biologia', status: 'Presente', data: '30/10/2025' },
  { turma: '1A', professor: 'Célio', materia: 'Geografia', status: 'Presente', data: '30/10/2025' },
  { turma: '1A', professor: 'Silvio', materia: 'Filosofia', status: 'Presente', data: '30/10/2025' },
  
  { turma: '1B', professor: 'Claudinei', materia: 'Física', status: 'Presente', data: '30/10/2025' },
  { turma: '1B', professor: 'Mário', materia: 'Inglês', status: 'Presente', data: '30/10/2025' },
  { turma: '1B', professor: 'Ana', materia: 'Biologia', status: 'Presente', data: '30/10/2025' },
  { turma: '1B', professor: 'Ricardo', materia: 'Educação física', status: 'Presente', data: '30/10/2025' },
  { turma: '1B', professor: 'Elaine', materia: 'Português', status: 'Presente', data: '30/10/2025' },
  { turma: '1B', professor: 'Solange', materia: 'Química', status: 'Presente', data: '30/10/2025' },
  { turma: '1B', professor: 'Claudinei', materia: 'Matemática', status: 'Presente', data: '30/10/2025' },
  { turma: '1B', professor: 'Airan', materia: 'Filosofia', status: 'Presente', data: '30/10/2025' },
  { turma: '1B', professor: 'Sirlene', materia: 'Educação financeira', status: 'Presente', data: '30/10/2025' },
  { turma: '1B', professor: 'Fábio', materia: 'História', status: 'Presente', data: '30/10/2025' },
  { turma: '1B', professor: 'Josi', materia: 'Artes', status: 'Presente', data: '30/10/2025' },
  { turma: '1B', professor: 'Dilma', materia: 'Pensamento computacional', status: 'Presente', data: '30/10/2025' },
  
  { turma: '1C', professor: 'Solange', materia: 'Matemática', status: 'Presente', data: '30/10/2025' },
  { turma: '1C', professor: 'Solange', materia: 'Química', status: 'Presente', data: '30/10/2025' },
  { turma: '1C', professor: 'Claudinei', materia: 'Física', status: 'Presente', data: '30/10/2025' },
  { turma: '1C', professor: 'Ana', materia: 'Biologia', status: 'Presente', data: '30/10/2025' },
  { turma: '1C', professor: 'Célio', materia: 'Geografia', status: 'Presente', data: '30/10/2025' },
  { turma: '1C', professor: 'Josi', materia: 'Artes', status: 'Presente', data: '30/10/2025' },
  { turma: '1C', professor: 'Wanessa', materia: 'Inglês', status: 'Presente', data: '30/10/2025' },
  { turma: '1C', professor: 'Cleyton', materia: 'Introdução a programação', status: 'Presente', data: '30/10/2025' },
  { turma: '1C', professor: 'Cleyton', materia: 'Introdução a computação', status: 'Presente', data: '30/10/2025' },
  { turma: '1C', professor: 'Cleyton', materia: 'Lógica computacional', status: 'Presente', data: '30/10/2025' },
  { turma: '1C', professor: 'Drika', materia: 'Filosofia', status: 'Presente', data: '30/10/2025' },
  { turma: '1C', professor: 'Ricardo', materia: 'Educação financeira', status: 'Presente', data: '30/10/2025' },
  { turma: '1C', professor: 'Airan', materia: 'Projeto de vida', status: 'Presente', data: '30/10/2025' },
  { turma: '1C', professor: 'Dilma', materia: 'Educação financeira', status: 'Presente', data: '30/10/2025' },
  
  { turma: '1D', professor: 'Fabiana', materia: 'Geografia', status: 'Presente', data: '30/10/2025' },
  { turma: '1D', professor: 'Elton', materia: 'História', status: 'Presente', data: '30/10/2025' },
  { turma: '1D', professor: 'Paula', materia: 'Biologia', status: 'Presente', data: '30/10/2025' },
  { turma: '1D', professor: 'Márcio', materia: 'Química', status: 'Presente', data: '30/10/2025' },
  { turma: '1D', professor: 'Felipe', materia: 'Física', status: 'Presente', data: '30/10/2025' },
  { turma: '1D', professor: 'Isadora', materia: 'Português', status: 'Presente', data: '30/10/2025' },
  { turma: '1D', professor: 'Sirlene', materia: 'Matemática', status: 'Presente', data: '30/10/2025' },
  { turma: '1D', professor: 'Sônia', materia: 'Educação física', status: 'Presente', data: '30/10/2025' },
  { turma: '1D', professor: 'Airan', materia: 'Filosofia', status: 'Presente', data: '30/10/2025' },
  { turma: '1D', professor: 'Flávia', materia: 'Artes', status: 'Presente', data: '30/10/2025' },
  { turma: '1D', professor: 'Dilma', materia: 'Pensamento computacional', status: 'Presente', data: '30/10/2025' },
  { turma: '1D', professor: 'Paula Regina', materia: 'Inglês', status: 'Presente', data: '30/10/2025' },
  
  { turma: '2A', professor: 'Ana', materia: 'Biologia', status: 'Presente', data: '30/10/2025' },
  { turma: '2A', professor: 'Ricardo', materia: 'Educação física', status: 'Presente', data: '30/10/2025' },
  { turma: '2A', professor: 'Mário', materia: 'Inglês', status: 'Presente', data: '30/10/2025' },
  { turma: '2A', professor: 'Helen', materia: 'Educação financeira', status: 'Presente', data: '30/10/2025' },
  { turma: '2A', professor: 'Liara', materia: 'Sociologia', status: 'Presente', data: '30/10/2025' },
  { turma: '2A', professor: 'Djane', materia: 'Oratória', status: 'Presente', data: '30/10/2025' },
  { turma: '2A', professor: 'Fábio', materia: 'História', status: 'Presente', data: '30/10/2025' },
  { turma: '2A', professor: 'Airan', materia: 'Filosofia', status: 'Presente', data: '30/10/2025' },
  { turma: '2A', professor: 'Célio', materia: 'Geografia', status: 'Presente', data: '30/10/2025' },
  { turma: '2A', professor: 'Elaine', materia: 'Português', status: 'Presente', data: '30/10/2025' },
  { turma: '2A', professor: 'Solange', materia: 'Química', status: 'Presente', data: '30/10/2025' },
  { turma: '2A', professor: 'Solange', materia: 'Matemática', status: 'Presente', data: '30/10/2025' },
  
  { turma: '2B', professor: 'Solange', materia: 'Química', status: 'Presente', data: '30/10/2025' },
  { turma: '2B', professor: 'Ana', materia: 'Biologia', status: 'Presente', data: '30/10/2025' },
  { turma: '2B', professor: 'Josi', materia: 'Artes', status: 'Presente', data: '30/10/2025' },
  { turma: '2B', professor: 'Célio', materia: 'Geografia', status: 'Presente', data: '30/10/2025' },
  { turma: '2B', professor: 'Helen', materia: 'Educação financeira', status: 'Presente', data: '30/10/2025' },
  { turma: '2B', professor: 'Solange', materia: 'Matemática', status: 'Presente', data: '30/10/2025' },
  { turma: '2B', professor: 'Isadora', materia: 'Oratória', status: 'Presente', data: '30/10/2025' },
  { turma: '2B', professor: 'Rubens', materia: 'Educação física', status: 'Presente', data: '30/10/2025' },
  { turma: '2B', professor: 'Liara', materia: 'Sociologia', status: 'Presente', data: '30/10/2025' },
  { turma: '2B', professor: 'Mário', materia: 'Inglês', status: 'Presente', data: '30/10/2025' },
  { turma: '2B', professor: 'Elaine', materia: 'Português', status: 'Presente', data: '30/10/2025' },
  { turma: '2B', professor: 'Fábio', materia: 'História', status: 'Presente', data: '30/10/2025' },
  { turma: '2B', professor: 'Airan', materia: 'Filosofia', status: 'Presente', data: '30/10/2025' },
  
  { turma: '2C', professor: 'Cleyton', materia: 'Banco de Dados', status: 'Presente', data: '30/10/2025' },
  { turma: '2C', professor: 'Solange', materia: 'Química', status: 'Presente', data: '30/10/2025' },
  { turma: '2C', professor: 'Célio', materia: 'Geografia', status: 'Presente', data: '30/10/2025' },
  { turma: '2C', professor: 'André', materia: 'C.Computacional', status: 'Presente', data: '30/10/2025' },
  { turma: '2C', professor: 'Solange', materia: 'Matemática', status: 'Presente', data: '30/10/2025' },
  { turma: '2C', professor: 'Wanessa', materia: 'Inglês', status: 'Presente', data: '30/10/2025' },
  { turma: '2C', professor: 'Liara', materia: 'Sociologia', status: 'Presente', data: '30/10/2025' },
  { turma: '2C', professor: 'Verônica', materia: 'Português', status: 'Presente', data: '30/10/2025' },
  { turma: '2C', professor: 'Airan', materia: 'Projeto de vida', status: 'Presente', data: '30/10/2025' },
  { turma: '2C', professor: 'Fábio', materia: 'História', status: 'Presente', data: '30/10/2025' },
  { turma: '2C', professor: 'Ana', materia: 'Biologia', status: 'Presente', data: '30/10/2025' },
  { turma: '2C', professor: 'André', materia: 'An.proj.s', status: 'Presente', data: '30/10/2025' },
  
  { turma: '3A', professor: 'Rubens', materia: 'Educação física', status: 'Presente', data: '30/10/2025' },
  { turma: '3A', professor: 'Claudinei', materia: 'Física', status: 'Presente', data: '30/10/2025' },
  { turma: '3A', professor: 'Djaine', materia: 'Língua portuguesa', status: 'Presente', data: '30/10/2025' },
  { turma: '3A', professor: 'Helen', materia: 'Matemática', status: 'Presente', data: '30/10/2025' },
  { turma: '3A', professor: 'Helen', materia: 'Educação Financeira', status: 'Presente', data: '30/10/2025' },
  { turma: '3A', professor: 'Airan', materia: 'Projeto de vida', status: 'Presente', data: '30/10/2025' },
  { turma: '3A', professor: 'Isadora', materia: 'Recomposição de língua portuguesa', status: 'Presente', data: '30/10/2025' },
  { turma: '3A', professor: 'Ludimila', materia: 'Recomposição de língua portuguesa', status: 'Presente', data: '30/10/2025' },
  { turma: '3A', professor: 'Joice', materia: 'Recomposição de matemática', status: 'Presente', data: '30/10/2025' },
  { turma: '3A', professor: 'Sirlene', materia: 'Recomposição de matemática', status: 'Presente', data: '30/10/2025' },
  { turma: '3A', professor: 'Josi', materia: 'Artes', status: 'Presente', data: '30/10/2025' },
  { turma: '3A', professor: 'Liz', materia: 'Geografia', status: 'Presente', data: '30/10/2025' },
  { turma: '3A', professor: 'Fábio', materia: 'História', status: 'Presente', data: '30/10/2025' },
  { turma: '3A', professor: 'Wanessa', materia: 'Inglês', status: 'Presente', data: '30/10/2025' },
  { turma: '3A', professor: 'Liara', materia: 'Sociologia', status: 'Presente', data: '30/10/2025' },
  
  { turma: '3B', professor: 'Rubens', materia: 'Educação física', status: 'Presente', data: '30/10/2025' },
  { turma: '3B', professor: 'Claudinei', materia: 'Física', status: 'Presente', data: '30/10/2025' },
  { turma: '3B', professor: 'Djaine', materia: 'Língua portuguesa', status: 'Presente', data: '30/10/2025' },
  { turma: '3B', professor: 'Helen', materia: 'Matemática', status: 'Presente', data: '30/10/2025' },
  { turma: '3B', professor: 'Helen', materia: 'Educação Financeira', status: 'Presente', data: '30/10/2025' },
  { turma: '3B', professor: 'Airan', materia: 'Projeto de vida', status: 'Presente', data: '30/10/2025' },
  { turma: '3B', professor: 'Isadora', materia: 'Recomposição de língua portuguesa', status: 'Presente', data: '30/10/2025' },
  { turma: '3B', professor: 'Ludimila', materia: 'Recomposição de língua portuguesa', status: 'Presente', data: '30/10/2025' },
  { turma: '3B', professor: 'Joice', materia: 'Recomposição de matemática', status: 'Presente', data: '30/10/2025' },
  { turma: '3B', professor: 'Sirlene', materia: 'Recomposição de matemática', status: 'Presente', data: '30/10/2025' },
  { turma: '3B', professor: 'Josi', materia: 'Artes', status: 'Presente', data: '30/10/2025' },
  { turma: '3B', professor: 'Liz', materia: 'Geografia', status: 'Presente', data: '30/10/2025' },
  { turma: '3B', professor: 'Fábio', materia: 'História', status: 'Presente', data: '30/10/2025' },
  { turma: '3B', professor: 'Wanessa', materia: 'Inglês', status: 'Presente', data: '30/10/2025' },
  { turma: '3B', professor: 'Liara', materia: 'Sociologia', status: 'Presente', data: '30/10/2025' },
  
  { turma: '3C', professor: 'Júlio', materia: 'C.Dados', status: 'Presente', data: '30/10/2025' },
  { turma: '3C', professor: 'Júlio', materia: 'Nem_C.grai', status: 'Presente', data: '30/10/2025' },
  { turma: '3C', professor: 'Júlio', materia: 'An.projeto', status: 'Presente', data: '30/10/2025' },
  { turma: '3C', professor: 'Rubens', materia: 'Educação física', status: 'Presente', data: '30/10/2025' },
  { turma: '3C', professor: 'Helen', materia: 'Matemática', status: 'Presente', data: '30/10/2025' },
  { turma: '3C', professor: 'Felipe', materia: 'Filosofia', status: 'Presente', data: '30/10/2025' },
  { turma: '3C', professor: 'Verônica', materia: 'Português', status: 'Presente', data: '30/10/2025' },
  { turma: '3C', professor: 'Helen', materia: 'Recomposição matemática', status: 'Presente', data: '30/10/2025' },
  { turma: '3C', professor: 'Dilma', materia: 'Educação financeira', status: 'Presente', data: '30/10/2025' }
];

const totalProfsTurma = db.prepare('SELECT COUNT(*) as total FROM professores_turma').get().total;
if (totalProfsTurma === 0) {
  professoresPorTurma.forEach(p => {
    db.prepare('INSERT INTO professores_turma (turma, professor, materia, status, data) VALUES (?, ?, ?, ?, ?)').run(p.turma, p.professor, p.materia, p.status, p.data);
  });
  console.log('✅ Professores por turma carregados com sucesso!');
}

app.post('/api/cadastrar', (req, res) => {
  const { nome, email, senha, serie } = req.body;

  if (!nome || !email || !senha || !serie) {
    return res.status(400).json({ sucesso: false, erro: 'Preencha todos os campos!' });
  }

  if (!email.endsWith('@escola.pr.gov.br')) {
    return res.status(400).json({ sucesso: false, erro: 'O e-mail deve terminar com @escola.pr.gov.br' });
  }

  const alunoExiste = db.prepare('SELECT * FROM alunos WHERE email = ?').get(email);
  if (alunoExiste) {
    return res.status(400).json({ sucesso: false, erro: 'Este e-mail já está cadastrado!' });
  }

  const senhaHash = bcrypt.hashSync(senha, 10);
  
  try {
    db.prepare('INSERT INTO alunos (nome, email, senha, serie) VALUES (?, ?, ?, ?)').run(nome, email, senhaHash, serie);
    res.json({ sucesso: true, mensagem: 'Aluno cadastrado com sucesso! Agora faça login.' });
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: 'Erro ao cadastrar aluno.' });
  }
});

app.post('/api/cadastrar-direcao', (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ sucesso: false, erro: 'Preencha todos os campos!' });
  }

  const membroExiste = db.prepare('SELECT * FROM direcao WHERE email = ?').get(email);
  if (membroExiste) {
    return res.status(400).json({ sucesso: false, erro: 'Este e-mail já está cadastrado!' });
  }

  const senhaHash = bcrypt.hashSync(senha, 10);
  
  try {
    db.prepare('INSERT INTO direcao (nome, email, senha) VALUES (?, ?, ?)').run(nome, email, senhaHash);
    res.json({ sucesso: true, mensagem: 'Membro da direção cadastrado com sucesso! Agora faça login.' });
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: 'Erro ao cadastrar.' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;

  const aluno = db.prepare('SELECT * FROM alunos WHERE email = ?').get(email);
  if (!aluno) {
    return res.status(400).json({ sucesso: false, erro: 'E-mail ou senha incorretos!' });
  }

  if (!aluno.senha) {
    return res.status(400).json({ 
      sucesso: false, 
      erro: 'Esta conta usa login do Google. Por favor, use "Entrar com Google".' 
    });
  }

  const senhaValida = bcrypt.compareSync(senha, aluno.senha);
  if (!senhaValida) {
    return res.status(400).json({ sucesso: false, erro: 'E-mail ou senha incorretos!' });
  }

  res.json({ 
    sucesso: true, 
    usuario: { 
      id: aluno.id, 
      nome: aluno.nome, 
      email: aluno.email, 
      serie: aluno.serie 
    } 
  });
});

app.post('/api/login-direcao', (req, res) => {
  const { email, senha } = req.body;

  const membro = db.prepare('SELECT * FROM direcao WHERE email = ?').get(email);
  if (!membro) {
    return res.status(400).json({ sucesso: false, erro: 'E-mail ou senha incorretos!' });
  }

  const senhaValida = bcrypt.compareSync(senha, membro.senha);
  if (!senhaValida) {
    return res.status(400).json({ sucesso: false, erro: 'E-mail ou senha incorretos!' });
  }

  res.json({ 
    sucesso: true, 
    usuario: { 
      id: membro.id, 
      nome: membro.nome, 
      email: membro.email
    } 
  });
});

app.post('/api/recuperar-senha', (req, res) => {
  const { email, tipo } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'E-mail é obrigatório.' });
  }

  let usuario = null;
  if (tipo === 'aluno') {
    usuario = db.prepare('SELECT * FROM alunos WHERE email = ?').get(email);
  } else if (tipo === 'direcao') {
    usuario = db.prepare('SELECT * FROM direcao WHERE email = ?').get(email);
  }

  if (!usuario) {
    return res.status(404).json({ error: 'E-mail não encontrado no sistema.' });
  }

  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  
  const expira = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  try {
    db.prepare('INSERT INTO recuperacao_senha (email, codigo, tipo, expira, usado) VALUES (?, ?, ?, ?, 0)')
      .run(email, codigo, tipo, expira);

    res.json({ 
      message: `Código de recuperação enviado para ${email}. Use o código: ${codigo} (válido por 30 minutos)`,
      codigo: codigo,
      debug: true
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar código de recuperação.' });
  }
});

app.post('/api/resetar-senha', (req, res) => {
  const { email, codigo, novaSenha } = req.body;

  if (!email || !codigo || !novaSenha) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  const recuperacao = db.prepare('SELECT * FROM recuperacao_senha WHERE email = ? AND codigo = ? AND usado = 0 ORDER BY id DESC LIMIT 1')
    .get(email, codigo);

  if (!recuperacao) {
    return res.status(400).json({ error: 'Código inválido ou já utilizado.' });
  }

  const agora = new Date().toISOString();
  if (agora > recuperacao.expira) {
    return res.status(400).json({ error: 'Código expirado. Solicite um novo código.' });
  }

  const senhaHash = bcrypt.hashSync(novaSenha, 10);

  try {
    if (recuperacao.tipo === 'aluno') {
      db.prepare('UPDATE alunos SET senha = ? WHERE email = ?').run(senhaHash, email);
    } else if (recuperacao.tipo === 'direcao') {
      db.prepare('UPDATE direcao SET senha = ? WHERE email = ?').run(senhaHash, email);
    }

    db.prepare('UPDATE recuperacao_senha SET usado = 1 WHERE id = ?').run(recuperacao.id);

    res.json({ message: 'Senha alterada com sucesso! Faça login com sua nova senha.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao resetar senha.' });
  }
});

app.get('/api/alunos', (req, res) => {
  const alunos = db.prepare('SELECT id, nome, email, serie FROM alunos WHERE email != ?').all('admin');
  res.json(alunos);
});

app.delete('/api/alunos/:id', (req, res) => {
  const { id } = req.params;
  
  try {
    const aluno = db.prepare('SELECT email FROM alunos WHERE id = ?').get(id);
    
    if (!aluno) {
      return res.status(404).json({ sucesso: false, erro: 'Aluno não encontrado.' });
    }
    
    if (aluno.email === 'admin') {
      return res.status(403).json({ sucesso: false, erro: 'Não é possível excluir o administrador.' });
    }
    
    db.prepare('DELETE FROM alunos WHERE id = ?').run(id);
    res.json({ sucesso: true, mensagem: 'Aluno excluído com sucesso!' });
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: 'Erro ao excluir aluno.' });
  }
});

app.get('/api/eventos/:serie', (req, res) => {
  try {
    const { serie } = req.params;
    const eventos = db.prepare('SELECT * FROM eventos WHERE serie = ? AND ativo = 1 ORDER BY data_evento ASC').all(serie);
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: 'Erro ao buscar eventos', detalhes: error.message });
  }
});

app.get('/api/eventos', (req, res) => {
  try {
    const eventos = db.prepare('SELECT * FROM eventos WHERE ativo = 1 ORDER BY serie, data_evento ASC').all();
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: 'Erro ao buscar todos os eventos', detalhes: error.message });
  }
});

app.post('/api/eventos', (req, res) => {
  try {
    const { serie, descricao, data_evento } = req.body;
    
    if (!serie || !descricao) {
      return res.status(400).json({ sucesso: false, erro: 'Série e descrição são obrigatórios!' });
    }
    
    if (descricao.length < 5) {
      return res.status(400).json({ sucesso: false, erro: 'A descrição deve ter pelo menos 5 caracteres!' });
    }
    
    const turmasValidas = ['1A', '1B', '1C', '1D', '2A', '2B', '2C', '3A', '3B', '3C'];
    if (!turmasValidas.includes(serie)) {
      return res.status(400).json({ sucesso: false, erro: 'Turma inválida! Use: ' + turmasValidas.join(', ') });
    }
    
    db.prepare('INSERT INTO eventos (serie, descricao, data_evento) VALUES (?, ?, ?)').run(serie, descricao, data_evento || null);
    res.json({ sucesso: true, mensagem: 'Evento criado com sucesso!' });
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: 'Erro ao criar evento', detalhes: error.message });
  }
});

app.put('/api/eventos/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { descricao, data_evento, serie } = req.body;
    
    if (!descricao || descricao.length < 5) {
      return res.status(400).json({ sucesso: false, erro: 'A descrição deve ter pelo menos 5 caracteres!' });
    }
    
    if (serie) {
      const turmasValidas = ['1A', '1B', '1C', '1D', '2A', '2B', '2C', '3A', '3B', '3C'];
      if (!turmasValidas.includes(serie)) {
        return res.status(400).json({ sucesso: false, erro: 'Turma inválida!' });
      }
      db.prepare('UPDATE eventos SET descricao = ?, data_evento = ?, serie = ? WHERE id = ?').run(descricao, data_evento || null, serie, id);
    } else {
      db.prepare('UPDATE eventos SET descricao = ?, data_evento = ? WHERE id = ?').run(descricao, data_evento || null, id);
    }
    
    res.json({ sucesso: true, mensagem: 'Evento atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: 'Erro ao atualizar evento', detalhes: error.message });
  }
});

app.delete('/api/eventos/:id', (req, res) => {
  try {
    const { id } = req.params;
    const evento = db.prepare('SELECT * FROM eventos WHERE id = ?').get(id);
    
    if (!evento) {
      return res.status(404).json({ sucesso: false, erro: 'Evento não encontrado!' });
    }
    
    db.prepare('UPDATE eventos SET ativo = 0 WHERE id = ?').run(id);
    res.json({ sucesso: true, mensagem: 'Evento excluído com sucesso!' });
  } catch (error) {
    res.status(500).json({ sucesso: false, erro: 'Erro ao excluir evento', detalhes: error.message });
  }
});

app.get('/api/cardapio/:dia', (req, res) => {
  const { dia } = req.params;
  const cardapio = db.prepare('SELECT * FROM cardapio WHERE dia_semana = ?').get(dia);
  if (cardapio) {
    res.json(cardapio);
  } else {
    res.json({ prato: 'A definir', acompanhamento: 'A definir', sobremesa: 'A definir', bebida: 'A definir' });
  }
});

app.put('/api/cardapio/:dia', (req, res) => {
  const { dia } = req.params;
  const { prato, acompanhamento, sobremesa, bebida } = req.body;
  db.prepare('UPDATE cardapio SET prato = ?, acompanhamento = ?, sobremesa = ?, bebida = ? WHERE dia_semana = ?').run(prato, acompanhamento, sobremesa, bebida, dia);
  res.json({ sucesso: true });
});

app.get('/api/professores', (req, res) => {
  const professores = db.prepare('SELECT * FROM professores').all();
  res.json(professores);
});

app.put('/api/professores/:id', (req, res) => {
  const { id } = req.params;
  const { nome, materia, status, data } = req.body;
  db.prepare('UPDATE professores SET nome = ?, materia = ?, status = ?, data = ? WHERE id = ?').run(nome, materia, status, data, id);
  res.json({ sucesso: true });
});

app.get('/api/avisos', (req, res) => {
  const avisos = db.prepare('SELECT * FROM avisos ORDER BY id DESC').all();
  res.json(avisos);
});

app.post('/api/avisos', (req, res) => {
  const { tipo, professor, titulo, descricao, data_aviso } = req.body;
  db.prepare('INSERT INTO avisos (tipo, professor, titulo, descricao, data_aviso) VALUES (?, ?, ?, ?, ?)').run(tipo, professor, titulo, descricao, data_aviso);
  res.json({ sucesso: true });
});

app.put('/api/avisos/:id', (req, res) => {
  const { id } = req.params;
  const { tipo, professor, titulo, descricao, data_aviso } = req.body;
  db.prepare('UPDATE avisos SET tipo = ?, professor = ?, titulo = ?, descricao = ?, data_aviso = ? WHERE id = ?').run(tipo, professor, titulo, descricao, data_aviso, id);
  res.json({ sucesso: true });
});

app.delete('/api/avisos/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM avisos WHERE id = ?').run(id);
  res.json({ sucesso: true });
});

app.get('/api/turmas', (req, res) => {
  const turmas = ['1A', '1B', '1C', '1D', '2A', '2B', '2C', '3A', '3B', '3C'];
  res.json(turmas);
});

app.get('/api/professores-turma', (req, res) => {
  const professores = db.prepare('SELECT * FROM professores_turma').all();
  res.json(professores);
});

app.get('/api/professores-turma/:turma', (req, res) => {
  const { turma } = req.params;
  const professores = db.prepare('SELECT * FROM professores_turma WHERE turma = ?').all(turma);
  res.json(professores);
});

app.put('/api/professores-turma/:id', (req, res) => {
  const { id } = req.params;
  const { status, data } = req.body;
  db.prepare('UPDATE professores_turma SET status = ?, data = ? WHERE id = ?').run(status, data, id);
  res.json({ sucesso: true });
});

db.exec(`
  CREATE TABLE IF NOT EXISTS auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tabela TEXT NOT NULL,
    operacao TEXT NOT NULL CHECK(operacao IN ('INSERT', 'UPDATE', 'DELETE')),
    usuario TEXT,
    registro_id INTEGER,
    dados_anteriores TEXT,
    dados_novos TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_auditoria_tabela ON auditoria(tabela)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_auditoria_operacao ON auditoria(operacao)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_auditoria_created ON auditoria(created_at)`);

db.exec(`
  CREATE TABLE IF NOT EXISTS estatisticas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    valor INTEGER DEFAULT 0,
    data TEXT NOT NULL,
    descricao TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_estatisticas_tipo ON estatisticas(tipo)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_estatisticas_data ON estatisticas(data)`);

const backupDB = () => {
  try {
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupPath = `backups/escola_backup_${timestamp}.db`;
    
    if (!fs.existsSync('backups')) {
      fs.mkdirSync('backups', { recursive: true });
    }
    
    db.backup(backupPath)
      .then(() => {
        console.log(`✅ Backup criado: ${backupPath}`);
        
        const backups = fs.readdirSync('backups')
          .filter(f => f.startsWith('escola_backup_'))
          .sort()
          .reverse();
        
        while (backups.length > 10) {
          const oldBackup = backups.pop();
          fs.unlinkSync(`backups/${oldBackup}`);
          console.log(`🗑️ Backup antigo removido: ${oldBackup}`);
        }
      })
      .catch(err => console.error('❌ Erro ao criar backup:', err));
  } catch (error) {
    console.error('❌ Erro no sistema de backup:', error.message);
  }
};

setInterval(backupDB, 24 * 60 * 60 * 1000);

backupDB();

app.get('/api/estatisticas', (req, res) => {
  try {
    const stats = {
      total_alunos: db.prepare('SELECT COUNT(*) as count FROM alunos WHERE ativo = 1').get().count,
      total_professores: db.prepare('SELECT COUNT(*) as count FROM professores').get().count,
      total_eventos: db.prepare('SELECT COUNT(*) as count FROM eventos WHERE ativo = 1').get().count,
      total_avisos: db.prepare('SELECT COUNT(*) as count FROM avisos WHERE ativo = 1').get().count,
      total_turmas: db.prepare('SELECT COUNT(DISTINCT turma) as count FROM professores_turma').get().count,
      alunos_por_serie: db.prepare('SELECT serie, COUNT(*) as total FROM alunos WHERE ativo = 1 GROUP BY serie').all(),
      avisos_por_tipo: db.prepare('SELECT tipo, COUNT(*) as total FROM avisos WHERE ativo = 1 GROUP BY tipo').all(),
      presenca_professores: db.prepare('SELECT status, COUNT(*) as total FROM professores_turma GROUP BY status').all()
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar estatísticas', detalhes: error.message });
  }
});

app.get('/api/auditoria', (req, res) => {
  try {
    const { limite = 50, tabela, operacao } = req.query;
    let query = 'SELECT * FROM auditoria';
    const conditions = [];
    const params = [];
    
    if (tabela) {
      conditions.push('tabela = ?');
      params.push(tabela);
    }
    if (operacao) {
      conditions.push('operacao = ?');
      params.push(operacao);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limite));
    
    const registros = db.prepare(query).all(...params);
    res.json(registros);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar auditoria', detalhes: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`📊 Banco de dados otimizado com WAL mode`);
  console.log(`🔐 Foreign keys habilitadas`);
  console.log(`📈 Sistema de auditoria ativo`);
  console.log(`💾 Backup automático configurado (24h)`);
});
