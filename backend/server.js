require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');
const { getOne, getAll, insert, query, pool } = require('./db/helpers');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    
    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    const aluno = await getOne('SELECT * FROM alunos WHERE email = $1 AND ativo = 1', [email]);
    
    if (!aluno) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const senhaValida = bcrypt.compareSync(senha, aluno.senha);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const ipAddress = req.ip || req.connection.remoteAddress || 'desconhecido';
    const userAgent = req.get('User-Agent') || 'desconhecido';
    
    await query(
      'INSERT INTO logs_login (aluno_id, nome, email, turma, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
      [aluno.id, aluno.nome, aluno.email, aluno.serie, ipAddress, userAgent]
    );

    delete aluno.senha;
    res.json({ sucesso: true, aluno });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ erro: 'Erro ao fazer login', detalhes: error.message });
  }
});

app.post('/api/cadastro', async (req, res) => {
  try {
    const { nome, email, senha, serie } = req.body;
    
    if (!nome || !email || !senha || !serie) {
      return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
    }

    if (nome.length < 3) {
      return res.status(400).json({ erro: 'Nome deve ter pelo menos 3 caracteres' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ erro: 'Email inválido' });
    }

    const alunoExistente = await getOne('SELECT * FROM alunos WHERE email = $1', [email]);
    if (alunoExistente) {
      return res.status(409).json({ erro: 'Email já cadastrado' });
    }

    const senhaHash = bcrypt.hashSync(senha, 10);
    const novoAluno = await insert(
      'INSERT INTO alunos (nome, email, senha, serie) VALUES ($1, $2, $3, $4)',
      [nome, email, senhaHash, serie]
    );

    await query(
      'INSERT INTO auditoria (tabela, operacao, registro_id, dados_novos, usuario) VALUES ($1, $2, $3, $4, $5)',
      ['alunos', 'INSERT', novoAluno.id, JSON.stringify(novoAluno), email]
    );

    delete novoAluno.senha;
    res.status(201).json({ sucesso: true, aluno: novoAluno });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ erro: 'Erro ao cadastrar aluno', detalhes: error.message });
  }
});

app.get('/api/eventos/:serie', async (req, res) => {
  try {
    const { serie } = req.params;
    const eventos = await getAll(
      'SELECT * FROM eventos WHERE serie = $1 AND ativo = 1 ORDER BY data_evento',
      [serie]
    );
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar eventos', detalhes: error.message });
  }
});

app.get('/api/cardapio', async (req, res) => {
  try {
    const cardapio = await getAll('SELECT * FROM cardapio ORDER BY id');
    res.json(cardapio);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar cardápio', detalhes: error.message });
  }
});

app.get('/api/professores', async (req, res) => {
  try {
    const professores = await getAll(
      'SELECT * FROM professores WHERE ativo = 1 ORDER BY nome'
    );
    res.json(professores);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar professores', detalhes: error.message });
  }
});

app.post('/api/professores', async (req, res) => {
  try {
    const { nome, materia, status, data } = req.body;
    
    const novoProfessor = await insert(
      'INSERT INTO professores (nome, materia, status, data) VALUES ($1, $2, $3, $4)',
      [nome, materia, status, data]
    );
    
    res.status(201).json(novoProfessor);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao adicionar professor', detalhes: error.message });
  }
});

app.put('/api/professores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, data } = req.body;
    
    await query(
      'UPDATE professores SET status = $1, data = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [status, data, id]
    );
    
    const professorAtualizado = await getOne('SELECT * FROM professores WHERE id = $1', [id]);
    res.json(professorAtualizado);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao atualizar professor', detalhes: error.message });
  }
});

app.get('/api/avisos', async (req, res) => {
  try {
    const { tipo } = req.query;
    let avisos;
    
    if (tipo) {
      avisos = await getAll(
        'SELECT * FROM avisos WHERE tipo = $1 AND ativo = 1 ORDER BY created_at DESC',
        [tipo]
      );
    } else {
      avisos = await getAll(
        'SELECT * FROM avisos WHERE ativo = 1 ORDER BY created_at DESC'
      );
    }
    
    res.json(avisos);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar avisos', detalhes: error.message });
  }
});

app.post('/api/avisos', async (req, res) => {
  try {
    const { tipo, professor, titulo, descricao, data_aviso } = req.body;
    
    const novoAviso = await insert(
      'INSERT INTO avisos (tipo, professor, titulo, descricao, data_aviso) VALUES ($1, $2, $3, $4, $5)',
      [tipo, professor, titulo, descricao, data_aviso]
    );
    
    res.status(201).json(novoAviso);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao criar aviso', detalhes: error.message });
  }
});

app.put('/api/avisos/:id/marcar-lido', async (req, res) => {
  try {
    const { id } = req.params;
    
    await query(
      'UPDATE avisos SET lido = 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    
    const avisoAtualizado = await getOne('SELECT * FROM avisos WHERE id = $1', [id]);
    res.json(avisoAtualizado);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao marcar aviso como lido', detalhes: error.message });
  }
});

app.delete('/api/avisos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await query('UPDATE avisos SET ativo = 0 WHERE id = $1', [id]);
    
    res.json({ sucesso: true, mensagem: 'Aviso desativado com sucesso' });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao desativar aviso', detalhes: error.message });
  }
});

app.get('/api/professores-turma/:turma', async (req, res) => {
  try {
    const { turma } = req.params;
    const professores = await getAll(
      'SELECT * FROM professores_turma WHERE turma = $1 ORDER BY professor',
      [turma]
    );
    res.json(professores);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar professores da turma', detalhes: error.message });
  }
});

app.post('/api/professores-turma', async (req, res) => {
  try {
    const { turma, professor, materia, status, data, observacao } = req.body;
    
    const novoProfessorTurma = await insert(
      'INSERT INTO professores_turma (turma, professor, materia, status, data, observacao) VALUES ($1, $2, $3, $4, $5, $6)',
      [turma, professor, materia, status, data, observacao || null]
    );
    
    res.status(201).json(novoProfessorTurma);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao adicionar professor à turma', detalhes: error.message });
  }
});

app.put('/api/professores-turma/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, observacao } = req.body;
    
    await query(
      'UPDATE professores_turma SET status = $1, observacao = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [status, observacao || null, id]
    );
    
    const professorAtualizado = await getOne('SELECT * FROM professores_turma WHERE id = $1', [id]);
    res.json(professorAtualizado);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao atualizar status do professor', detalhes: error.message });
  }
});

app.get('/api/logs-login', async (req, res) => {
  try {
    const { limite = 50 } = req.query;
    const logs = await getAll(
      'SELECT * FROM logs_login ORDER BY data_hora DESC LIMIT $1',
      [parseInt(limite)]
    );
    res.json(logs);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar logs de login', detalhes: error.message });
  }
});

app.get('/api/estatisticas', async (req, res) => {
  try {
    const stats = {
      total_alunos: (await getOne('SELECT COUNT(*) as count FROM alunos WHERE ativo = 1')).count,
      total_eventos: (await getOne('SELECT COUNT(*) as count FROM eventos WHERE ativo = 1')).count,
      total_avisos: (await getOne('SELECT COUNT(*) as count FROM avisos WHERE ativo = 1')).count,
      total_professores: (await getOne('SELECT COUNT(*) as count FROM professores WHERE ativo = 1')).count,
      total_turmas: (await getOne('SELECT COUNT(DISTINCT turma) as count FROM professores_turma')).count,
      alunos_por_serie: await getAll('SELECT serie, COUNT(*) as total FROM alunos WHERE ativo = 1 GROUP BY serie'),
      avisos_por_tipo: await getAll('SELECT tipo, COUNT(*) as total FROM avisos WHERE ativo = 1 GROUP BY tipo'),
      presenca_professores: await getAll('SELECT status, COUNT(*) as total FROM professores_turma GROUP BY status')
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar estatísticas', detalhes: error.message });
  }
});

app.get('/api/auditoria', async (req, res) => {
  try {
    const { limite = 50, tabela, operacao } = req.query;
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    
    if (tabela) {
      conditions.push(`tabela = $${paramIndex++}`);
      params.push(tabela);
    }
    if (operacao) {
      conditions.push(`operacao = $${paramIndex++}`);
      params.push(operacao);
    }
    
    let queryText = 'SELECT * FROM auditoria';
    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
    queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limite));
    
    const registros = await getAll(queryText, params);
    res.json(registros);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar auditoria', detalhes: error.message });
  }
});

app.get('/api/alunos', async (req, res) => {
  try {
    const alunos = await getAll('SELECT id, nome, email, serie, ativo, created_at FROM alunos ORDER BY nome');
    res.json(alunos);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar alunos', detalhes: error.message });
  }
});

app.delete('/api/alunos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('UPDATE alunos SET ativo = 0 WHERE id = $1', [id]);
    res.json({ sucesso: true, mensagem: 'Aluno desativado com sucesso' });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao desativar aluno', detalhes: error.message });
  }
});

app.get('/api/eventos', async (req, res) => {
  try {
    const eventos = await getAll('SELECT * FROM eventos WHERE ativo = 1 ORDER BY data_evento');
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar eventos', detalhes: error.message });
  }
});

app.post('/api/eventos', async (req, res) => {
  try {
    const { serie, descricao, data_evento } = req.body;
    const novoEvento = await insert(
      'INSERT INTO eventos (serie, descricao, data_evento) VALUES ($1, $2, $3)',
      [serie, descricao, data_evento]
    );
    res.status(201).json(novoEvento);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao criar evento', detalhes: error.message });
  }
});

app.put('/api/eventos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { serie, descricao, data_evento } = req.body;
    await query(
      'UPDATE eventos SET serie = $1, descricao = $2, data_evento = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
      [serie, descricao, data_evento, id]
    );
    const eventoAtualizado = await getOne('SELECT * FROM eventos WHERE id = $1', [id]);
    res.json(eventoAtualizado);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao atualizar evento', detalhes: error.message });
  }
});

app.delete('/api/eventos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('UPDATE eventos SET ativo = 0 WHERE id = $1', [id]);
    res.json({ sucesso: true, mensagem: 'Evento desativado com sucesso' });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao desativar evento', detalhes: error.message });
  }
});

app.post('/api/login-direcao', async (req, res) => {
  try {
    const { email, senha } = req.body;
    
    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    const diretor = await getOne('SELECT * FROM direcao WHERE email = $1 AND ativo = 1', [email]);
    
    if (!diretor) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const senhaValida = bcrypt.compareSync(senha, diretor.senha);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    delete diretor.senha;
    res.json({ sucesso: true, diretor });
  } catch (error) {
    console.error('Erro no login da direção:', error);
    res.status(500).json({ erro: 'Erro ao fazer login', detalhes: error.message });
  }
});

app.post('/api/cadastrar-direcao', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    
    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
    }

    const diretorExistente = await getOne('SELECT * FROM direcao WHERE email = $1', [email]);
    if (diretorExistente) {
      return res.status(409).json({ erro: 'Email já cadastrado' });
    }

    const senhaHash = bcrypt.hashSync(senha, 10);
    const novoDiretor = await insert(
      'INSERT INTO direcao (nome, email, senha) VALUES ($1, $2, $3)',
      [nome, email, senhaHash]
    );

    delete novoDiretor.senha;
    res.status(201).json({ sucesso: true, diretor: novoDiretor });
  } catch (error) {
    console.error('Erro no cadastro da direção:', error);
    res.status(500).json({ erro: 'Erro ao cadastrar diretor', detalhes: error.message });
  }
});

app.post('/api/recuperar-senha', async (req, res) => {
  try {
    const { email, tipo } = req.body;
    
    if (!email || !tipo) {
      return res.status(400).json({ erro: 'Email e tipo são obrigatórios' });
    }

    let usuario;
    if (tipo === 'aluno') {
      usuario = await getOne('SELECT * FROM alunos WHERE email = $1', [email]);
    } else if (tipo === 'direcao') {
      usuario = await getOne('SELECT * FROM direcao WHERE email = $1', [email]);
    }

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expira = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await insert(
      'INSERT INTO recuperacao_senha (email, codigo, tipo, expira) VALUES ($1, $2, $3, $4)',
      [email, codigo, tipo, expira]
    );

    res.json({ sucesso: true, codigo, mensagem: 'Código de recuperação gerado' });
  } catch (error) {
    console.error('Erro ao recuperar senha:', error);
    res.status(500).json({ erro: 'Erro ao recuperar senha', detalhes: error.message });
  }
});

app.post('/api/resetar-senha', async (req, res) => {
  try {
    const { email, codigo, novaSenha, tipo } = req.body;
    
    if (!email || !codigo || !novaSenha || !tipo) {
      return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
    }

    const recuperacao = await getOne(
      'SELECT * FROM recuperacao_senha WHERE email = $1 AND codigo = $2 AND tipo = $3 AND usado = 0 ORDER BY created_at DESC LIMIT 1',
      [email, codigo, tipo]
    );

    if (!recuperacao) {
      return res.status(400).json({ erro: 'Código inválido ou já utilizado' });
    }

    if (new Date(recuperacao.expira) < new Date()) {
      return res.status(400).json({ erro: 'Código expirado' });
    }

    const senhaHash = bcrypt.hashSync(novaSenha, 10);
    
    if (tipo === 'aluno') {
      await query('UPDATE alunos SET senha = $1 WHERE email = $2', [senhaHash, email]);
    } else if (tipo === 'direcao') {
      await query('UPDATE direcao SET senha = $1 WHERE email = $2', [senhaHash, email]);
    }

    await query('UPDATE recuperacao_senha SET usado = 1 WHERE id = $1', [recuperacao.id]);

    res.json({ sucesso: true, mensagem: 'Senha resetada com sucesso' });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({ erro: 'Erro ao resetar senha', detalhes: error.message });
  }
});

app.get('/api/turmas', async (req, res) => {
  try {
    const turmas = await getAll('SELECT DISTINCT turma FROM professores_turma ORDER BY turma');
    res.json(turmas);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar turmas', detalhes: error.message });
  }
});

app.get('/api/professores-turma', async (req, res) => {
  try {
    const professores = await getAll('SELECT * FROM professores_turma ORDER BY turma, professor');
    res.json(professores);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar professores das turmas', detalhes: error.message });
  }
});

app.put('/api/avisos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, professor, titulo, descricao, data_aviso } = req.body;
    
    await query(
      'UPDATE avisos SET tipo = $1, professor = $2, titulo = $3, descricao = $4, data_aviso = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6',
      [tipo, professor, titulo, descricao, data_aviso, id]
    );
    
    const avisoAtualizado = await getOne('SELECT * FROM avisos WHERE id = $1', [id]);
    res.json(avisoAtualizado);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao atualizar aviso', detalhes: error.message });
  }
});

app.get('/api/cardapio/:dia', async (req, res) => {
  try {
    const { dia } = req.params;
    const item = await getOne('SELECT * FROM cardapio WHERE dia_semana = $1', [dia]);
    if (!item) {
      return res.status(404).json({ erro: 'Cardápio não encontrado' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar cardápio', detalhes: error.message });
  }
});

app.put('/api/cardapio/:dia', async (req, res) => {
  try {
    const { dia } = req.params;
    const { prato, acompanhamento, sobremesa, bebida, calorias, vegetariano } = req.body;
    
    await query(
      'UPDATE cardapio SET prato = $1, acompanhamento = $2, sobremesa = $3, bebida = $4, calorias = $5, vegetariano = $6, updated_at = CURRENT_TIMESTAMP WHERE dia_semana = $7',
      [prato, acompanhamento, sobremesa, bebida, calorias || null, vegetariano || 0, dia]
    );
    
    const cardapioAtualizado = await getOne('SELECT * FROM cardapio WHERE dia_semana = $1', [dia]);
    res.json(cardapioAtualizado);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao atualizar cardápio', detalhes: error.message });
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    const { limite = 100 } = req.query;
    const logs = await getAll(
      'SELECT * FROM logs_login ORDER BY data_hora DESC LIMIT $1',
      [parseInt(limite)]
    );
    res.json(logs);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar logs', detalhes: error.message });
  }
});

app.post('/api/cadastrar', async (req, res) => {
  try {
    const { nome, email, senha, serie } = req.body;
    
    if (!nome || !email || !senha || !serie) {
      return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
    }

    const alunoExistente = await getOne('SELECT * FROM alunos WHERE email = $1', [email]);
    if (alunoExistente) {
      return res.status(409).json({ erro: 'Email já cadastrado' });
    }

    const senhaHash = bcrypt.hashSync(senha, 10);
    const novoAluno = await insert(
      'INSERT INTO alunos (nome, email, senha, serie) VALUES ($1, $2, $3, $4)',
      [nome, email, senhaHash, serie]
    );

    delete novoAluno.senha;
    res.status(201).json({ sucesso: true, aluno: novoAluno });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ erro: 'Erro ao cadastrar aluno', detalhes: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`🐘 Conectado ao PostgreSQL`);
  console.log(`📊 Banco de dados Replit ativo`);
  console.log(`🔐 Sistema de auditoria ativo`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing database connections...');
  pool.end(() => {
    console.log('Database pool has ended');
    process.exit(0);
  });
});
