require('dotenv').config();
const pool = require('./config');

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando migrations do banco de dados PostgreSQL...\n');
    
    await client.query('BEGIN');

    console.log('📋 Criando tabela alunos...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS alunos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL CHECK(length(nome) >= 3),
        email VARCHAR(255) UNIQUE NOT NULL CHECK(email LIKE '%@%'),
        senha TEXT NOT NULL,
        serie VARCHAR(50) NOT NULL,
        ativo INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_alunos_email ON alunos(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_alunos_serie ON alunos(serie)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_alunos_ativo ON alunos(ativo)`);

    console.log('📋 Criando tabela direcao...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS direcao (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL CHECK(length(nome) >= 3),
        email VARCHAR(255) UNIQUE NOT NULL CHECK(email LIKE '%@%'),
        senha TEXT NOT NULL,
        ativo INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_direcao_email ON direcao(email)`);

    console.log('📋 Criando tabela eventos...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS eventos (
        id SERIAL PRIMARY KEY,
        serie VARCHAR(50) NOT NULL,
        descricao TEXT NOT NULL CHECK(length(descricao) >= 5),
        data_evento TIMESTAMP,
        ativo INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_eventos_serie ON eventos(serie)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_eventos_ativo ON eventos(ativo)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_eventos_data ON eventos(data_evento)`);

    console.log('📋 Criando tabela cardapio...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS cardapio (
        id SERIAL PRIMARY KEY,
        dia_semana VARCHAR(50) UNIQUE NOT NULL,
        prato VARCHAR(255),
        acompanhamento VARCHAR(255),
        sobremesa VARCHAR(255),
        bebida VARCHAR(255),
        calorias INTEGER,
        vegetariano INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cardapio_dia ON cardapio(dia_semana)`);

    console.log('📋 Criando tabela professores...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS professores (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL CHECK(length(nome) >= 3),
        materia TEXT NOT NULL,
        status VARCHAR(50) NOT NULL CHECK(status IN ('Presente', 'Falta', 'Licença', 'Férias')),
        data VARCHAR(50) NOT NULL,
        ativo INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_professores_nome ON professores(nome)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_professores_status ON professores(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_professores_data ON professores(data)`);

    console.log('📋 Criando tabela avisos...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS avisos (
        id SERIAL PRIMARY KEY,
        tipo VARCHAR(50) NOT NULL CHECK(tipo IN ('Quizizz', 'Khan Academy', 'Redação Paraná', 'Geral', 'Urgente')),
        professor VARCHAR(255) NOT NULL,
        titulo TEXT NOT NULL CHECK(length(titulo) >= 5),
        descricao TEXT NOT NULL CHECK(length(descricao) >= 10),
        data_aviso VARCHAR(50) NOT NULL,
        lido INTEGER DEFAULT 0,
        ativo INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_avisos_tipo ON avisos(tipo)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_avisos_professor ON avisos(professor)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_avisos_data ON avisos(data_aviso)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_avisos_lido ON avisos(lido)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_avisos_ativo ON avisos(ativo)`);

    console.log('📋 Criando tabela recuperacao_senha...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS recuperacao_senha (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        codigo VARCHAR(6) NOT NULL CHECK(length(codigo) = 6),
        tipo VARCHAR(50) NOT NULL CHECK(tipo IN ('aluno', 'direcao')),
        expira VARCHAR(50) NOT NULL,
        usado INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_recuperacao_email ON recuperacao_senha(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_recuperacao_usado ON recuperacao_senha(usado)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_recuperacao_expira ON recuperacao_senha(expira)`);

    console.log('📋 Criando tabela professores_turma...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS professores_turma (
        id SERIAL PRIMARY KEY,
        turma VARCHAR(10) NOT NULL CHECK(turma IN ('1A', '1B', '1C', '1D', '2A', '2B', '2C', '3A', '3B', '3C')),
        professor VARCHAR(255) NOT NULL CHECK(length(professor) >= 3),
        materia TEXT NOT NULL CHECK(length(materia) >= 3),
        status VARCHAR(50) DEFAULT 'Presente' CHECK(status IN ('Presente', 'Falta', 'Licença', 'Férias', 'Atestado')),
        data VARCHAR(50) NOT NULL,
        observacao TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_prof_turma_turma ON professores_turma(turma)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_prof_turma_professor ON professores_turma(professor)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_prof_turma_data ON professores_turma(data)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_prof_turma_status ON professores_turma(status)`);

    console.log('📋 Criando tabela logs_login...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS logs_login (
        id SERIAL PRIMARY KEY,
        aluno_id INTEGER REFERENCES alunos(id) ON DELETE SET NULL,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        turma VARCHAR(50) NOT NULL,
        ip_address VARCHAR(100),
        user_agent TEXT,
        data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_logs_aluno ON logs_login(aluno_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_logs_email ON logs_login(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_logs_turma ON logs_login(turma)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_logs_data ON logs_login(data_hora)`);

    console.log('📋 Criando tabela auditoria...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS auditoria (
        id SERIAL PRIMARY KEY,
        tabela VARCHAR(100) NOT NULL,
        operacao VARCHAR(20) NOT NULL CHECK(operacao IN ('INSERT', 'UPDATE', 'DELETE')),
        registro_id INTEGER,
        dados_antigos JSONB,
        dados_novos JSONB,
        usuario VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_auditoria_tabela ON auditoria(tabela)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_auditoria_operacao ON auditoria(operacao)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_auditoria_data ON auditoria(created_at)`);

    console.log('📋 Criando tabela estatisticas...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS estatisticas (
        id SERIAL PRIMARY KEY,
        total_alunos INTEGER DEFAULT 0,
        total_eventos INTEGER DEFAULT 0,
        total_avisos INTEGER DEFAULT 0,
        total_professores INTEGER DEFAULT 0,
        logins_hoje INTEGER DEFAULT 0,
        data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    
    console.log('\n✅ Todas as migrations foram executadas com sucesso!');
    console.log('📊 Banco de dados PostgreSQL configurado e pronto para uso.\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Erro ao executar migrations:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('🎉 Processo de migration concluído!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha ao executar migrations:', error);
      process.exit(1);
    });
}

module.exports = runMigrations;
