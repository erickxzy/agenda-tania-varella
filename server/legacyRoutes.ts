import { Router } from 'express';
import { createRequire } from 'module';
import type { Request, Response } from 'express';

const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');
const { getOne, getAll, insert, query } = require('../backend/db/helpers');

const router = Router();

router.post('/cadastrar', async (req: Request, res: Response) => {
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
    res.status(201).json({ sucesso: true, mensagem: 'Aluno cadastrado com sucesso!', aluno: novoAluno });
  } catch (error: any) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ erro: 'Erro ao cadastrar aluno', detalhes: error.message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
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

    const ipAddress = req.ip || (req.connection as any).remoteAddress || 'desconhecido';
    const userAgent = req.get('User-Agent') || 'desconhecido';
    
    await query(
      'INSERT INTO logs_login (aluno_id, nome, email, turma, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
      [aluno.id, aluno.nome, aluno.email, aluno.serie, ipAddress, userAgent]
    );

    delete aluno.senha;
    res.json({ sucesso: true, usuario: aluno });
  } catch (error: any) {
    console.error('Erro no login:', error);
    res.status(500).json({ erro: 'Erro ao fazer login', detalhes: error.message });
  }
});

router.post('/cadastrar-direcao', async (req: Request, res: Response) => {
  try {
    const { nome, email, senha } = req.body;
    
    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
    }

    const membroExistente = await getOne('SELECT * FROM direcao WHERE email = $1', [email]);
    if (membroExistente) {
      return res.status(409).json({ erro: 'Email já cadastrado' });
    }

    const senhaHash = bcrypt.hashSync(senha, 10);
    const novoMembro = await insert(
      'INSERT INTO direcao (nome, email, senha) VALUES ($1, $2, $3)',
      [nome, email, senhaHash]
    );

    delete novoMembro.senha;
    res.status(201).json({ sucesso: true, mensagem: 'Membro da direção cadastrado com sucesso!', usuario: novoMembro });
  } catch (error: any) {
    console.error('Erro no cadastro da direção:', error);
    res.status(500).json({ erro: 'Erro ao cadastrar membro da direção', detalhes: error.message });
  }
});

router.post('/login-direcao', async (req: Request, res: Response) => {
  try {
    const { email, senha } = req.body;
    
    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    const membro = await getOne('SELECT * FROM direcao WHERE email = $1 AND ativo = 1', [email]);
    
    if (!membro) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const senhaValida = bcrypt.compareSync(senha, membro.senha);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    delete membro.senha;
    res.json({ sucesso: true, usuario: membro });
  } catch (error: any) {
    console.error('Erro no login da direção:', error);
    res.status(500).json({ erro: 'Erro ao fazer login', detalhes: error.message });
  }
});

router.get('/alunos', async (req: Request, res: Response) => {
  try {
    const alunos = await getAll('SELECT id, nome, email, serie, ativo, criado_em FROM alunos ORDER BY nome ASC', []);
    res.json(alunos);
  } catch (error: any) {
    console.error('Erro ao buscar alunos:', error);
    res.status(500).json({ erro: 'Erro ao buscar alunos', detalhes: error.message });
  }
});

router.delete('/alunos/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Soft delete: desativar aluno em vez de excluir permanentemente
    await query('UPDATE alunos SET ativo = 0 WHERE id = $1', [id]);
    
    res.json({ sucesso: true, mensagem: 'Aluno desativado com sucesso' });
  } catch (error: any) {
    console.error('Erro ao desativar aluno:', error);
    res.status(500).json({ erro: 'Erro ao desativar aluno', detalhes: error.message });
  }
});

export default router;
