require('dotenv').config();
const pool = require('./config');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Iniciando seed do banco de dados...\n');
    
    const adminResult = await client.query('SELECT * FROM alunos WHERE email = $1', ['admin@sistema.local']);
    if (adminResult.rows.length === 0) {
      console.log('👤 Criando usuário administrador...');
      const senhaHash = bcrypt.hashSync('admin1', 10);
      await client.query(
        'INSERT INTO alunos (nome, email, senha, serie) VALUES ($1, $2, $3, $4)',
        ['Administrador', 'admin@sistema.local', senhaHash, 'Admin']
      );
      console.log('✅ Administrador criado com sucesso!');
    }

    const diasSemana = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
    console.log('📅 Populando cardápio semanal...');
    for (const dia of diasSemana) {
      const existe = await client.query('SELECT * FROM cardapio WHERE dia_semana = $1', [dia]);
      if (existe.rows.length === 0) {
        await client.query(
          'INSERT INTO cardapio (dia_semana, prato, acompanhamento, sobremesa, bebida) VALUES ($1, $2, $3, $4, $5)',
          [dia, 'A definir', 'A definir', 'A definir', 'A definir']
        );
      }
    }
    console.log('✅ Cardápio semanal criado!');

    const professoresIniciais = [
      { nome: 'Eliane', materia: 'Português', status: 'Presente', data: '28/10/2025' },
      { nome: 'Cleiton', materia: 'Introdução à Programação, Introdução à Computação e Lógica Computacional', status: 'Presente', data: '28/10/2025' },
      { nome: 'Solange', materia: 'Química e Matemática', status: 'Presente', data: '28/10/2025' },
      { nome: 'Airan', materia: 'Projeto de Vida', status: 'Presente', data: '28/10/2025' },
      { nome: 'Dilma', materia: 'Educação Financeira', status: 'Presente', data: '28/10/2025' },
      { nome: 'Ricardo', materia: 'Educação Física', status: 'Presente', data: '28/10/2025' }
    ];

    const totalProfs = await client.query('SELECT COUNT(*) as total FROM professores');
    if (parseInt(totalProfs.rows[0].total) === 0) {
      console.log('👨‍🏫 Adicionando professores iniciais...');
      for (const p of professoresIniciais) {
        await client.query(
          'INSERT INTO professores (nome, materia, status, data) VALUES ($1, $2, $3, $4)',
          [p.nome, p.materia, p.status, p.data]
        );
      }
      console.log('✅ Professores adicionados!');
    }

    const avisosIniciais = [
      { tipo: 'Quizizz', professor: 'Solange', titulo: 'Quizizz de Química - Tabela Periódica', descricao: 'Completar o quiz sobre elementos químicos até sexta-feira', data_aviso: '29/10/2025' },
      { tipo: 'Quizizz', professor: 'Solange', titulo: 'Quizizz de Matemática - Equações do 2º Grau', descricao: 'Resolver exercícios de equações quadráticas', data_aviso: '30/10/2025' },
      { tipo: 'Quizizz', professor: 'Solange', titulo: 'Quizizz de Química - Ligações Químicas', descricao: 'Estudar ligações iônicas e covalentes para o quiz', data_aviso: '31/10/2025' },
      { tipo: 'Khan Academy', professor: 'Solange', titulo: 'Khan Academy - Álgebra Linear', descricao: 'Completar módulo de matrizes e determinantes', data_aviso: '29/10/2025' },
      { tipo: 'Redação Paraná', professor: 'Eliane', titulo: 'Redação - Texto Dissertativo-Argumentativo', descricao: 'Escrever redação sobre "Sustentabilidade no Século XXI"', data_aviso: '29/10/2025' }
    ];

    const totalAvisos = await client.query('SELECT COUNT(*) as total FROM avisos');
    if (parseInt(totalAvisos.rows[0].total) === 0) {
      console.log('📢 Adicionando avisos iniciais...');
      for (const a of avisosIniciais) {
        await client.query(
          'INSERT INTO avisos (tipo, professor, titulo, descricao, data_aviso) VALUES ($1, $2, $3, $4, $5)',
          [a.tipo, a.professor, a.titulo, a.descricao, a.data_aviso]
        );
      }
      console.log('✅ Avisos adicionados!');
    }

    const eventosFicticios = [
      { serie: '1A', descricao: 'Prova de Matemática - Álgebra Básica', data_evento: '2025-11-05 09:00:00' },
      { serie: '1A', descricao: 'Trabalho de Português - Interpretação de Texto', data_evento: '2025-11-08 14:00:00' },
      { serie: '1B', descricao: 'Prova de Física - Cinemática', data_evento: '2025-11-06 09:30:00' },
      { serie: '1C', descricao: 'Hackathon de Programação - Projeto Final', data_evento: '2025-11-07 08:00:00' },
      { serie: '2A', descricao: 'Prova de Química - Estequiometria', data_evento: '2025-11-06 08:30:00' },
      { serie: '3A', descricao: 'Simulado ENEM - Linguagens e Códigos', data_evento: '2025-11-05 08:00:00' }
    ];

    const totalEventos = await client.query('SELECT COUNT(*) as total FROM eventos');
    if (parseInt(totalEventos.rows[0].total) === 0) {
      console.log('📆 Adicionando eventos iniciais...');
      for (const e of eventosFicticios) {
        await client.query(
          'INSERT INTO eventos (serie, descricao, data_evento) VALUES ($1, $2, $3)',
          [e.serie, e.descricao, e.data_evento]
        );
      }
      console.log('✅ Eventos adicionados!');
    }

    const professoresPorTurma = [
      { turma: '1A', professor: 'Claudinei', materia: 'Matemática', status: 'Presente', data: '30/10/2025' },
      { turma: '1A', professor: 'Elaine', materia: 'Português', status: 'Presente', data: '30/10/2025' },
      { turma: '1B', professor: 'Claudinei', materia: 'Física', status: 'Presente', data: '30/10/2025' },
      { turma: '1C', professor: 'Solange', materia: 'Matemática', status: 'Presente', data: '30/10/2025' }
    ];

    const totalProfTurma = await client.query('SELECT COUNT(*) as total FROM professores_turma');
    if (parseInt(totalProfTurma.rows[0].total) === 0) {
      console.log('👥 Adicionando professores por turma...');
      for (const pt of professoresPorTurma) {
        await client.query(
          'INSERT INTO professores_turma (turma, professor, materia, status, data) VALUES ($1, $2, $3, $4, $5)',
          [pt.turma, pt.professor, pt.materia, pt.status, pt.data]
        );
      }
      console.log('✅ Professores por turma adicionados!');
    }

    console.log('\n🎉 Seed do banco de dados concluído com sucesso!\n');
    
  } catch (error) {
    console.error('\n❌ Erro ao popular banco de dados:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✨ Processo de seed finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha ao executar seed:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;
