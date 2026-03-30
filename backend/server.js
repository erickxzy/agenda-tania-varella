require('dotenv').config();
const express = require('express');
const compression = require('compression');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadsDir = path.join(__dirname, '../frontend/uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadsDir),
        filename: (req, file, cb) => {
                const ext = path.extname(file.originalname);
                const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
                cb(null, unique);
        }
});
const upload = multer({
        storage,
        limits: { fileSize: 15 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
                const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
                if (allowed.includes(file.mimetype)) cb(null, true);
                else cb(new Error('Apenas imagens e PDFs são permitidos.'), false);
        }
});

// Armazenamento temporário de registros pendentes (expira em 15 min)
const pendentesVerificacao = new Map();

// Armazenamento temporário de logins pendentes de verificação (expira em 10 min)
const loginsPendentes = new Map(); // email → { userData, codigo, expires, tipo }

// ── PROTEÇÃO CONTRA FORÇA BRUTA ───────────────────────────────────────────────
const tentativasLogin = new Map(); // email → { count, bloqueadoAte }
const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 15 * 60 * 1000; // 15 minutos

function verificarBloqueio(email) {
        const reg = tentativasLogin.get(email);
        if (!reg) return null;
        if (reg.bloqueadoAte && Date.now() < reg.bloqueadoAte) {
                const mins = Math.ceil((reg.bloqueadoAte - Date.now()) / 60000);
                return `Muitas tentativas incorretas. Aguarde ${mins} minuto(s) para tentar novamente.`;
        }
        if (reg.bloqueadoAte && Date.now() >= reg.bloqueadoAte) {
                tentativasLogin.delete(email);
        }
        return null;
}

function registrarFalhaLogin(email) {
        const reg = tentativasLogin.get(email) || { count: 0, bloqueadoAte: null };
        reg.count += 1;
        if (reg.count >= MAX_TENTATIVAS) {
                reg.bloqueadoAte = Date.now() + BLOQUEIO_MS;
                reg.count = 0;
        }
        tentativasLogin.set(email, reg);
}

function limparFalhasLogin(email) {
        tentativasLogin.delete(email);
}

// ── SESSÕES DE ADMINISTRADOR ─────────────────────────────────────────────────
const adminSessions = new Map(); // token -> { nome, email, expires }

function gerarTokenAdmin() {
        return crypto.randomBytes(32).toString('hex');
}

function requireAdminAuth(req, res, next) {
        const token = req.headers['x-admin-token'];
        if (!token) return res.status(401).json({ erro: 'Não autorizado. Faça login como administrador.' });
        const sessao = adminSessions.get(token);
        if (!sessao) return res.status(401).json({ erro: 'Sessão inválida. Faça login novamente.' });
        if (Date.now() > sessao.expires) {
                adminSessions.delete(token);
                return res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });
        }
        req.adminInfo = sessao;
        next();
}

const app = express();
const PORT = process.env.PORT || 5000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error('❌ SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios!');
        process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '../frontend'), {
        maxAge: '1h',
        etag: true
}));
app.get('/favicon.ico', (req, res) => res.redirect('/favicon.svg'));

// Tabelas Supabase:
// alunos         → Cadastro_Aluno
// direcao        → Login_Direção
// eventos        → Conteudos
// cardapio       → Cardapio
// professores    → Professores
// avisos         → Avisos
// professores_turma → Presenças
// recuperacao_senha → recuperacao_senha
// logs_login     → Logs

// ─── CONFIG PÚBLICA ──────────────────────────────────────────────────────────
app.get('/api/config', (req, res) => {
        res.json({
                supabaseUrl: SUPABASE_URL,
                supabaseAnonKey: SUPABASE_ANON_KEY
        });
});

// ─── LOGIN GOOGLE ─────────────────────────────────────────────────────────────
app.post('/api/login-google', async (req, res) => {
        const { email, nome } = req.body;

        if (!email || !nome) {
                return res.status(400).json({ sucesso: false, erro: 'Dados incompletos.' });
        }

        if (!email.endsWith('@escola.pr.gov.br')) {
                return res.status(403).json({ sucesso: false, erro: 'Apenas e-mails @escola.pr.gov.br são permitidos.' });
        }

        const { data: alunoExistente } = await supabase
                .from('Cadastro_Aluno')
                .select('*')
                .eq('email', email)
                .single();

        if (alunoExistente) {
                return res.json({ sucesso: true, usuario: { id: alunoExistente.id, nome: alunoExistente.nome, email: alunoExistente.email, serie: alunoExistente.serie }, novo: false });
        }

        return res.json({ sucesso: true, usuario: { nome, email, serie: null }, novo: true });
});

app.post('/api/login-google/turma', async (req, res) => {
        const { email, nome, serie } = req.body;

        if (!email || !nome || !serie) {
                return res.status(400).json({ sucesso: false, erro: 'Dados incompletos.' });
        }

        const turmasValidas = ['1A', '1B', '1C', '1D', '2A', '2B', '2C', '3A', '3B', '3C'];
        if (!turmasValidas.includes(serie)) {
                return res.status(400).json({ sucesso: false, erro: 'Turma inválida.' });
        }

        const { data: criado, error } = await supabase
                .from('Cadastro_Aluno')
                .insert({ nome, email, senha: null, serie, ativo: true })
                .select()
                .single();

        if (error) {
                return res.status(500).json({ sucesso: false, erro: 'Erro ao cadastrar usuário Google.' });
        }

        res.json({ sucesso: true, usuario: { id: criado.id, nome: criado.nome, email: criado.email, serie: criado.serie } });
});

// ─── EMAIL TRANSPORTER ───────────────────────────────────────────────────────
function criarTransporter() {
        return nodemailer.createTransport({
                service: 'gmail',
                auth: {
                        user: process.env.EMAIL_REMETENTE,
                        pass: process.env.EMAIL_SENHA_APP
                }
        });
}

async function enviarCodigoEmail(destinatario, codigo, nome) {
        const transporter = criarTransporter();
        await transporter.sendMail({
                from: `"Agenda Escolar Tânia Varella Ferreira" <${process.env.EMAIL_REMETENTE}>`,
                to: destinatario,
                subject: '🎓 Código de Verificação - Cadastro',
                html: `
                        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #f0f4ff; border-radius: 12px;">
                                <h2 style="color: #4361ee; text-align: center;">📚 Agenda Escolar Tânia Varella Ferreira</h2>
                                <p>Olá, <strong>${nome}</strong>!</p>
                                <p>Seu código de verificação para confirmar o cadastro é:</p>
                                <div style="background: #4361ee; color: white; font-size: 2.5rem; font-weight: bold; letter-spacing: 12px; text-align: center; padding: 20px; border-radius: 10px; margin: 20px 0;">
                                        ${codigo}
                                </div>
                                <p style="color: #666; font-size: 0.9rem;">Este código expira em <strong>15 minutos</strong>. Não compartilhe com ninguém.</p>
                                <p style="color: #999; font-size: 0.8rem;">Se você não solicitou este cadastro, ignore este e-mail.</p>
                        </div>
                `
        });
}

async function enviarCodigoLoginEmail(destinatario, codigo, nome) {
        const transporter = criarTransporter();
        await transporter.sendMail({
                from: `"Agenda Escolar Tânia Varella Ferreira" <${process.env.EMAIL_REMETENTE}>`,
                to: destinatario,
                subject: '🔐 Código de Verificação de Login',
                html: `
                        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #f0f4ff; border-radius: 12px;">
                                <h2 style="color: #4361ee; text-align: center;">📚 Agenda Escolar Tânia Varella Ferreira</h2>
                                <p>Olá, <strong>${nome}</strong>!</p>
                                <p>Alguém acabou de tentar entrar na sua conta. Se foi você, use o código abaixo para confirmar o login:</p>
                                <div style="background: #2b9348; color: white; font-size: 2.5rem; font-weight: bold; letter-spacing: 12px; text-align: center; padding: 20px; border-radius: 10px; margin: 20px 0;">
                                        ${codigo}
                                </div>
                                <p style="color: #666; font-size: 0.9rem;">Este código expira em <strong>10 minutos</strong>. Não compartilhe com ninguém.</p>
                                <p style="color: #999; font-size: 0.8rem;">Se você não tentou fazer login, ignore este e-mail e considere trocar sua senha.</p>
                        </div>
                `
        });
}

// ─── INICIAR CADASTRO ALUNO (envia código) ───────────────────────────────────
app.post('/api/iniciar-cadastro', async (req, res) => {
        const { nome, email, senha, serie } = req.body;

        if (!nome || !email || !senha || !serie) {
                return res.status(400).json({ sucesso: false, erro: 'Preencha todos os campos!' });
        }

        if (!email.endsWith('@escola.pr.gov.br')) {
                return res.status(400).json({ sucesso: false, erro: 'O e-mail deve terminar com @escola.pr.gov.br' });
        }

        if (senha.length < 6) {
                return res.status(400).json({ sucesso: false, erro: 'A senha deve ter pelo menos 6 caracteres.' });
        }

        if (!process.env.EMAIL_REMETENTE || !process.env.EMAIL_SENHA_APP) {
                return res.status(500).json({ sucesso: false, erro: 'Serviço de e-mail não configurado. Contate o administrador.' });
        }

        const { data: existe } = await supabase
                .from('Cadastro_Aluno')
                .select('id')
                .eq('email', email)
                .single();

        if (existe) {
                return res.status(400).json({ sucesso: false, erro: 'Este e-mail já está cadastrado!' });
        }

        const codigo = String(Math.floor(100000 + Math.random() * 900000));
        const senhaHash = bcrypt.hashSync(senha, 10);
        const expiracao = Date.now() + 15 * 60 * 1000;

        pendentesVerificacao.set(email, { nome, senhaHash, serie, codigo, expiracao });

        try {
                await enviarCodigoEmail(email, codigo, nome);
                res.json({ sucesso: true, mensagem: 'Código enviado para seu e-mail!' });
        } catch (err) {
                console.error('Erro ao enviar e-mail:', err.message);
                pendentesVerificacao.delete(email);
                res.status(500).json({ sucesso: false, erro: 'Erro ao enviar e-mail. Verifique se o endereço está correto.' });
        }
});

// ─── VERIFICAR CÓDIGO E CONCLUIR CADASTRO ────────────────────────────────────
app.post('/api/verificar-codigo-cadastro', async (req, res) => {
        const { email, codigo } = req.body;

        if (!email || !codigo) {
                return res.status(400).json({ sucesso: false, erro: 'Dados incompletos.' });
        }

        const pendente = pendentesVerificacao.get(email);

        if (!pendente) {
                return res.status(400).json({ sucesso: false, erro: 'Nenhum cadastro pendente para este e-mail. Tente novamente.' });
        }

        if (Date.now() > pendente.expiracao) {
                pendentesVerificacao.delete(email);
                return res.status(400).json({ sucesso: false, erro: 'Código expirado. Solicite um novo cadastro.' });
        }

        if (pendente.codigo !== String(codigo).trim()) {
                return res.status(400).json({ sucesso: false, erro: 'Código incorreto. Verifique e tente novamente.' });
        }

        const { error } = await supabase
                .from('Cadastro_Aluno')
                .insert({ nome: pendente.nome, email, senha: pendente.senhaHash, serie: pendente.serie, ativo: true });

        pendentesVerificacao.delete(email);

        if (error) {
                return res.status(500).json({ sucesso: false, erro: 'Erro ao cadastrar aluno.' });
        }

        res.json({ sucesso: true, mensagem: 'Cadastro confirmado! Agora faça login.' });
});

// ─── CADASTRO ALUNO (legado, mantido) ────────────────────────────────────────
app.post('/api/cadastrar', async (req, res) => {
        const { nome, email, senha, serie } = req.body;

        if (!nome || !email || !senha || !serie) {
                return res.status(400).json({ sucesso: false, erro: 'Preencha todos os campos!' });
        }

        if (!email.endsWith('@escola.pr.gov.br')) {
                return res.status(400).json({ sucesso: false, erro: 'O e-mail deve terminar com @escola.pr.gov.br' });
        }

        const { data: existe } = await supabase
                .from('Cadastro_Aluno')
                .select('id')
                .eq('email', email)
                .single();

        if (existe) {
                return res.status(400).json({ sucesso: false, erro: 'Este e-mail já está cadastrado!' });
        }

        const senhaHash = bcrypt.hashSync(senha, 10);

        const { error } = await supabase
                .from('Cadastro_Aluno')
                .insert({ nome, email, senha: senhaHash, serie, ativo: true });

        if (error) {
                return res.status(500).json({ sucesso: false, erro: 'Erro ao cadastrar aluno.' });
        }

        res.json({ sucesso: true, mensagem: 'Aluno cadastrado com sucesso! Agora faça login.' });
});

// ─── INICIAR CADASTRO DIREÇÃO (envia código) ──────────────────────────────────
app.post('/api/iniciar-cadastro-direcao', async (req, res) => {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
                return res.status(400).json({ sucesso: false, erro: 'Preencha todos os campos!' });
        }

        if (!email.includes('@')) {
                return res.status(400).json({ sucesso: false, erro: 'E-mail inválido.' });
        }

        if (senha.length < 6) {
                return res.status(400).json({ sucesso: false, erro: 'A senha deve ter pelo menos 6 caracteres.' });
        }

        if (!process.env.EMAIL_REMETENTE || !process.env.EMAIL_SENHA_APP) {
                return res.status(500).json({ sucesso: false, erro: 'Serviço de e-mail não configurado. Contate o administrador.' });
        }

        const { data: existe, error: erroBusca } = await supabase
                .from('Login_Direção')
                .select('id')
                .eq('E-mail', email)
                .single();

        if (erroBusca && erroBusca.code !== 'PGRST116') {
                return res.status(500).json({ sucesso: false, erro: 'Erro ao verificar e-mail. Tente novamente.' });
        }

        if (existe) {
                return res.status(400).json({ sucesso: false, erro: 'Este e-mail já está cadastrado!' });
        }

        const codigo = String(Math.floor(100000 + Math.random() * 900000));
        const senhaHash = bcrypt.hashSync(senha, 10);
        const expiracao = Date.now() + 15 * 60 * 1000;

        pendentesVerificacao.set('direcao_' + email, { nome, senhaHash, codigo, expiracao, tipo: 'direcao' });

        try {
                await enviarCodigoEmail(email, codigo, nome);
                res.json({ sucesso: true, mensagem: 'Código enviado para seu e-mail!' });
        } catch (err) {
                console.error('Erro ao enviar e-mail direção:', err.message);
                pendentesVerificacao.delete('direcao_' + email);
                res.status(500).json({ sucesso: false, erro: 'Erro ao enviar e-mail. Verifique se o endereço está correto.' });
        }
});

// ─── VERIFICAR CÓDIGO E CONCLUIR CADASTRO DIREÇÃO ────────────────────────────
app.post('/api/verificar-codigo-direcao', async (req, res) => {
        const { email, codigo } = req.body;

        if (!email || !codigo) {
                return res.status(400).json({ sucesso: false, erro: 'Dados incompletos.' });
        }

        const pendente = pendentesVerificacao.get('direcao_' + email);

        if (!pendente) {
                return res.status(400).json({ sucesso: false, erro: 'Nenhum cadastro pendente para este e-mail. Tente novamente.' });
        }

        if (Date.now() > pendente.expiracao) {
                pendentesVerificacao.delete('direcao_' + email);
                return res.status(400).json({ sucesso: false, erro: 'Código expirado. Solicite um novo cadastro.' });
        }

        if (pendente.codigo !== String(codigo).trim()) {
                return res.status(400).json({ sucesso: false, erro: 'Código incorreto. Verifique e tente novamente.' });
        }

        const { error } = await supabase
                .from('Login_Direção')
                .insert({ 'E-mail': email, 'Senha': pendente.senhaHash });

        pendentesVerificacao.delete('direcao_' + email);

        if (error) {
                console.error('Erro ao inserir direção:', error.message);
                return res.status(500).json({ sucesso: false, erro: `Erro ao cadastrar: ${error.message}` });
        }

        res.json({ sucesso: true, mensagem: 'Conta da direção criada! Agora faça login.' });
});

// ─── CADASTRO DIREÇÃO (legado) ─────────────────────────────────────────────────
app.post('/api/cadastrar-direcao', async (req, res) => {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
                return res.status(400).json({ sucesso: false, erro: 'Preencha todos os campos!' });
        }

        if (!email.includes('@')) {
                return res.status(400).json({ sucesso: false, erro: 'E-mail inválido.' });
        }

        if (senha.length < 6) {
                return res.status(400).json({ sucesso: false, erro: 'A senha deve ter pelo menos 6 caracteres.' });
        }

        const { data: existe, error: erroBusca } = await supabase
                .from('Login_Direção')
                .select('id')
                .eq('E-mail', email)
                .single();

        if (erroBusca && erroBusca.code !== 'PGRST116') {
                console.error('Erro ao verificar e-mail direção:', erroBusca.message);
                return res.status(500).json({ sucesso: false, erro: 'Erro ao verificar e-mail. Tente novamente.' });
        }

        if (existe) {
                return res.status(400).json({ sucesso: false, erro: 'Este e-mail já está cadastrado!' });
        }

        const senhaHash = bcrypt.hashSync(senha, 10);

        const { error } = await supabase
                .from('Login_Direção')
                .insert({ 'E-mail': email, 'Senha': senhaHash });

        if (error) {
                console.error('Erro ao inserir direção:', error.message);
                if (error.code === '23505') {
                        return res.status(400).json({ sucesso: false, erro: 'Este e-mail já está cadastrado!' });
                }
                return res.status(500).json({ sucesso: false, erro: `Erro ao cadastrar: ${error.message}` });
        }

        res.json({ sucesso: true, mensagem: 'Membro da direção cadastrado com sucesso! Agora faça login.' });
});

// ─── LOGIN ALUNO ──────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
        const { email, senha } = req.body;

        const bloqueio = verificarBloqueio(email);
        if (bloqueio) return res.status(429).json({ sucesso: false, erro: bloqueio });

        const { data: aluno } = await supabase
                .from('Cadastro_Aluno')
                .select('*')
                .eq('email', email)
                .single();

        if (!aluno) {
                registrarFalhaLogin(email);
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
                registrarFalhaLogin(email);
                return res.status(400).json({ sucesso: false, erro: 'E-mail ou senha incorretos!' });
        }
        limparFalhasLogin(email);

        // Admin: gera token de sessão diretamente, sem código de verificação
        if (aluno.email === 'admin@sistema.local') {
                const token = gerarTokenAdmin();
                adminSessions.set(token, {
                        nome: 'Administrador',
                        email: aluno.email,
                        tipo: 'admin',
                        expires: Date.now() + 8 * 60 * 60 * 1000
                });
                return res.json({
                        sucesso: true,
                        token,
                        tipoAdmin: 'admin',
                        usuario: { id: aluno.id, nome: aluno.nome, email: aluno.email, serie: aluno.serie }
                });
        }

        // Aluno comum: envia código de verificação por e-mail
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        loginsPendentes.set(email, {
                alunoData: aluno,
                codigo,
                expires: Date.now() + 10 * 60 * 1000 // 10 minutos
        });

        try {
                await enviarCodigoLoginEmail(email, codigo, aluno.nome);
        } catch (emailErr) {
                console.error('Erro ao enviar código de login:', emailErr.message);
                return res.status(500).json({ sucesso: false, erro: 'Erro ao enviar código de verificação. Tente novamente.' });
        }

        return res.json({ sucesso: true, pendente: true, email });
});

// ─── CONFIRMAR LOGIN ALUNO (valida código) ────────────────────────────────────
app.post('/api/confirmar-login-aluno', async (req, res) => {
        const { email, codigo } = req.body;
        const pendente = loginsPendentes.get(email);

        if (!pendente || Date.now() > pendente.expires) {
                loginsPendentes.delete(email);
                return res.status(400).json({ sucesso: false, erro: 'Código expirado. Faça login novamente.' });
        }

        if (pendente.codigo !== codigo) {
                return res.status(400).json({ sucesso: false, erro: 'Código incorreto. Tente novamente.' });
        }

        loginsPendentes.delete(email);
        const aluno = pendente.alunoData;

        const ipAddress = req.ip || req.connection.remoteAddress || 'desconhecido';
        const userAgent = req.get('User-Agent') || 'desconhecido';

        await supabase.from('Logs').insert({
                aluno_id: aluno.id,
                nome: aluno.nome,
                email: aluno.email,
                turma: aluno.serie,
                ip_address: ipAddress,
                user_agent: userAgent
        });

        return res.json({
                sucesso: true,
                usuario: { id: aluno.id, nome: aluno.nome, email: aluno.email, serie: aluno.serie }
        });
});

// ─── REENVIAR CÓDIGO DE LOGIN ─────────────────────────────────────────────────
app.post('/api/reenviar-codigo-login', async (req, res) => {
        const { email } = req.body;
        const pendente = loginsPendentes.get(email);

        if (!pendente) {
                return res.status(400).json({ sucesso: false, erro: 'Sessão expirada. Faça login novamente.' });
        }

        const novoCodigo = Math.floor(100000 + Math.random() * 900000).toString();
        pendente.codigo = novoCodigo;
        pendente.expires = Date.now() + 10 * 60 * 1000;
        loginsPendentes.set(email, pendente);

        const nome = pendente.alunoData ? pendente.alunoData.nome : (pendente.direcaoData ? (pendente.direcaoData.nome || email.split('@')[0]) : email.split('@')[0]);

        try {
                await enviarCodigoLoginEmail(email, novoCodigo, nome);
                return res.json({ sucesso: true });
        } catch (err) {
                return res.status(500).json({ sucesso: false, erro: 'Erro ao reenviar. Tente novamente.' });
        }
});

// ─── LOGIN DIREÇÃO ────────────────────────────────────────────────────────────
app.post('/api/login-direcao', async (req, res) => {
        const { email, senha } = req.body;

        const bloqueio = verificarBloqueio('dir_' + email);
        if (bloqueio) return res.status(429).json({ sucesso: false, erro: bloqueio });

        const { data: membro } = await supabase
                .from('Login_Direção')
                .select('*')
                .eq('E-mail', email)
                .single();

        if (!membro) {
                registrarFalhaLogin('dir_' + email);
                return res.status(400).json({ sucesso: false, erro: 'E-mail ou senha incorretos!' });
        }

        const senhaValida = bcrypt.compareSync(senha, membro['Senha']);
        if (!senhaValida) {
                registrarFalhaLogin('dir_' + email);
                return res.status(400).json({ sucesso: false, erro: 'E-mail ou senha incorretos!' });
        }
        limparFalhasLogin('dir_' + email);

        const nomeMembro = membro.nome || email.split('@')[0];

        // Envia código de verificação por e-mail antes de liberar o painel
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        loginsPendentes.set(email, {
                direcaoData: { id: membro.id, nome: nomeMembro, email: membro['E-mail'] },
                codigo,
                expires: Date.now() + 10 * 60 * 1000 // 10 minutos
        });

        try {
                await enviarCodigoLoginEmail(email, codigo, nomeMembro);
        } catch (emailErr) {
                console.error('Erro ao enviar código de login direção:', emailErr.message);
                return res.status(500).json({ sucesso: false, erro: 'Erro ao enviar código de verificação. Tente novamente.' });
        }

        return res.json({ sucesso: true, pendente: true, email });
});

// ─── CONFIRMAR LOGIN DIREÇÃO (valida código) ──────────────────────────────────
app.post('/api/confirmar-login-direcao', async (req, res) => {
        const { email, codigo } = req.body;
        const pendente = loginsPendentes.get(email);

        if (!pendente || !pendente.direcaoData || Date.now() > pendente.expires) {
                loginsPendentes.delete(email);
                return res.status(400).json({ sucesso: false, erro: 'Código expirado. Faça login novamente.' });
        }

        if (pendente.codigo !== codigo) {
                return res.status(400).json({ sucesso: false, erro: 'Código incorreto. Tente novamente.' });
        }

        loginsPendentes.delete(email);
        const membro = pendente.direcaoData;

        const token = gerarTokenAdmin();
        adminSessions.set(token, {
                nome: membro.nome,
                email: membro.email,
                tipo: 'direcao',
                expires: Date.now() + 8 * 60 * 60 * 1000
        });

        return res.json({
                sucesso: true,
                token,
                tipoAdmin: 'direcao',
                usuario: { id: membro.id, nome: membro.nome, email: membro.email }
        });
});

// ─── RECUPERAÇÃO DE SENHA ─────────────────────────────────────────────────────
app.post('/api/recuperar-senha', async (req, res) => {
        const { email, tipo } = req.body;

        if (!email) {
                return res.status(400).json({ error: 'E-mail é obrigatório.' });
        }

        let usuario = null;
        if (tipo === 'aluno') {
                const { data } = await supabase.from('Cadastro_Aluno').select('*').eq('email', email).single();
                usuario = data;
        } else if (tipo === 'direcao') {
                const { data } = await supabase.from('Login_Direção').select('*').eq('E-mail', email).single();
                usuario = data;
        }

        if (!usuario) {
                return res.status(404).json({ error: 'E-mail não encontrado no sistema.' });
        }

        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        const expira = new Date(Date.now() + 30 * 60 * 1000).toISOString();

        const { error } = await supabase
                .from('recuperacao_senha')
                .insert({ email, codigo, tipo, expira, usado: 0 });

        if (error) {
                return res.status(500).json({ error: 'Erro ao gerar código de recuperação.' });
        }

        res.json({
                message: `Código de recuperação enviado para ${email}. Use o código: ${codigo} (válido por 30 minutos)`,
                codigo: codigo,
                debug: true
        });
});

app.post('/api/resetar-senha', async (req, res) => {
        const { email, codigo, novaSenha } = req.body;

        if (!email || !codigo || !novaSenha) {
                return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
        }

        const { data: recuperacao } = await supabase
                .from('recuperacao_senha')
                .select('*')
                .eq('email', email)
                .eq('codigo', codigo)
                .eq('usado', 0)
                .order('id', { ascending: false })
                .limit(1)
                .single();

        if (!recuperacao) {
                return res.status(400).json({ error: 'Código inválido ou já utilizado.' });
        }

        const agora = new Date().toISOString();
        if (agora > recuperacao.expira) {
                return res.status(400).json({ error: 'Código expirado. Solicite um novo código.' });
        }

        const senhaHash = bcrypt.hashSync(novaSenha, 10);

        if (recuperacao.tipo === 'aluno') {
                await supabase.from('Cadastro_Aluno').update({ senha: senhaHash }).eq('email', email);
        } else if (recuperacao.tipo === 'direcao') {
                await supabase.from('Login_Direção').update({ 'Senha': senhaHash }).eq('E-mail', email);
        }

        await supabase.from('recuperacao_senha').update({ usado: 1 }).eq('id', recuperacao.id);

        res.json({ message: 'Senha alterada com sucesso! Faça login com sua nova senha.' });
});

// ─── ALUNOS ───────────────────────────────────────────────────────────────────
app.get('/api/alunos', async (req, res) => {
        const { data, error } = await supabase
                .from('Cadastro_Aluno')
                .select('id, nome, email, serie')
                .neq('email', 'admin@sistema.local');

        if (error) return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar alunos.' });
        res.json(data);
});

app.put('/api/alunos/:id', requireAdminAuth, async (req, res) => {
        const { id } = req.params;
        const { nome, email, serie, novaSenha } = req.body;

        const { data: aluno } = await supabase
                .from('Cadastro_Aluno')
                .select('email')
                .eq('id', id)
                .single();

        if (!aluno) return res.status(404).json({ sucesso: false, erro: 'Aluno não encontrado.' });
        if (aluno.email === 'admin@sistema.local') return res.status(403).json({ sucesso: false, erro: 'Não é possível editar o administrador.' });

        const updates = {};
        if (nome && nome.trim()) updates.nome = nome.trim();
        if (email && email.includes('@')) updates.email = email.trim().toLowerCase();
        if (serie) {
                const turmasValidas = ['1A','1B','1C','1D','2A','2B','2C','3A','3B','3C'];
                if (!turmasValidas.includes(serie)) return res.status(400).json({ sucesso: false, erro: 'Turma inválida.' });
                updates.serie = serie;
        }
        if (novaSenha && novaSenha.length >= 6) {
                updates.senha = bcrypt.hashSync(novaSenha, 10);
        }

        if (Object.keys(updates).length === 0) return res.status(400).json({ sucesso: false, erro: 'Nenhum campo para atualizar.' });

        const { error } = await supabase.from('Cadastro_Aluno').update(updates).eq('id', id);
        if (error) return res.status(500).json({ sucesso: false, erro: 'Erro ao atualizar aluno: ' + error.message });
        res.json({ sucesso: true, mensagem: 'Aluno atualizado com sucesso!' });
});

app.delete('/api/alunos/:id', requireAdminAuth, async (req, res) => {
        const { id } = req.params;

        const { data: aluno } = await supabase
                .from('Cadastro_Aluno')
                .select('email')
                .eq('id', id)
                .single();

        if (!aluno) {
                return res.status(404).json({ sucesso: false, erro: 'Aluno não encontrado.' });
        }

        if (aluno.email === 'admin@sistema.local') {
                return res.status(403).json({ sucesso: false, erro: 'Não é possível excluir o administrador.' });
        }

        await supabase.from('Cadastro_Aluno').delete().eq('id', id);
        res.json({ sucesso: true, mensagem: 'Aluno excluído com sucesso!' });
});

// ─── LOGS ─────────────────────────────────────────────────────────────────────
app.get('/api/logs', async (req, res) => {
        const { data, error } = await supabase
                .from('Logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

        if (error) return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar logs.' });
        res.json(data);
});

// ─── EVENTOS (Conteudos) ──────────────────────────────────────────────────────
app.get('/api/eventos/:serie', async (req, res) => {
        const { serie } = req.params;
        const { data, error } = await supabase
                .from('Conteudos')
                .select('*')
                .eq('serie', serie)
                .eq('ativo', true)
                .order('data_evento', { ascending: true });

        if (error) return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar eventos' });
        res.json(data);
});

app.get('/api/eventos', async (req, res) => {
        const { data, error } = await supabase
                .from('Conteudos')
                .select('*')
                .eq('ativo', true)
                .order('serie', { ascending: true });

        if (error) return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar todos os eventos' });
        res.json(data);
});

app.post('/api/eventos', requireAdminAuth, async (req, res) => {
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

        const { error } = await supabase
                .from('Conteudos')
                .insert({ serie, descricao, data_evento: data_evento || null, ativo: true });

        if (error) return res.status(500).json({ sucesso: false, erro: 'Erro ao criar evento' });
        res.json({ sucesso: true, mensagem: 'Evento criado com sucesso!' });
});

app.put('/api/eventos/:id', requireAdminAuth, async (req, res) => {
        const { id } = req.params;
        const { descricao, data_evento, serie } = req.body;

        if (!descricao || descricao.length < 5) {
                return res.status(400).json({ sucesso: false, erro: 'A descrição deve ter pelo menos 5 caracteres!' });
        }

        const updates = { descricao, data_evento: data_evento || null };

        if (serie) {
                const turmasValidas = ['1A', '1B', '1C', '1D', '2A', '2B', '2C', '3A', '3B', '3C'];
                if (!turmasValidas.includes(serie)) {
                        return res.status(400).json({ sucesso: false, erro: 'Turma inválida!' });
                }
                updates.serie = serie;
        }

        const { error } = await supabase.from('Conteudos').update(updates).eq('id', id);
        if (error) return res.status(500).json({ sucesso: false, erro: 'Erro ao atualizar evento' });
        res.json({ sucesso: true, mensagem: 'Evento atualizado com sucesso!' });
});

app.delete('/api/eventos/:id', requireAdminAuth, async (req, res) => {
        const { data: evento } = await supabase
                .from('Conteudos')
                .select('*')
                .eq('id', req.params.id)
                .single();

        if (!evento) {
                return res.status(404).json({ sucesso: false, erro: 'Evento não encontrado!' });
        }

        const { error } = await supabase
                .from('Conteudos')
                .update({ ativo: false })
                .eq('id', req.params.id);

        if (error) return res.status(500).json({ sucesso: false, erro: 'Erro ao excluir evento' });
        res.json({ sucesso: true, mensagem: 'Evento excluído com sucesso!' });
});

// ─── CARDÁPIO ─────────────────────────────────────────────────────────────────
app.get('/api/cardapio/:dia', async (req, res) => {
        const { dia } = req.params;
        const { data } = await supabase
                .from('Cardapio')
                .select('*')
                .eq('dia_semana', dia)
                .single();

        if (data) {
                res.json(data);
        } else {
                res.json({ prato: 'A definir', acompanhamento: 'A definir', sobremesa: 'A definir', bebida: 'A definir' });
        }
});

app.put('/api/cardapio/:dia', requireAdminAuth, async (req, res) => {
        const { dia } = req.params;
        const { prato, acompanhamento, sobremesa, bebida } = req.body;

        const { error } = await supabase
                .from('Cardapio')
                .update({ prato, acompanhamento, sobremesa, bebida })
                .eq('dia_semana', dia);

        if (error) return res.status(500).json({ sucesso: false, erro: 'Erro ao atualizar cardápio' });
        res.json({ sucesso: true });
});

// ─── PROFESSORES ──────────────────────────────────────────────────────────────
app.get('/api/professores', async (req, res) => {
        const { data, error } = await supabase.from('Professores').select('*');
        if (error) return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar professores' });
        res.json(data);
});

app.put('/api/professores/:id', requireAdminAuth, async (req, res) => {
        const { id } = req.params;
        const { nome, materia, status, data } = req.body;

        const { error } = await supabase
                .from('Professores')
                .update({ nome, materia, status, data })
                .eq('id', id);

        if (error) return res.status(500).json({ sucesso: false, erro: 'Erro ao atualizar professor' });
        res.json({ sucesso: true });
});

// ─── AVISOS ───────────────────────────────────────────────────────────────────
app.get('/api/avisos', async (req, res) => {
        const { data, error } = await supabase
                .from('Avisos')
                .select('*')
                .order('id', { ascending: false });

        if (error) return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar avisos' });
        res.json(data);
});

app.post('/api/avisos', requireAdminAuth, async (req, res) => {
        const { tipo, professor, titulo, descricao, data_aviso } = req.body;

        const { error } = await supabase
                .from('Avisos')
                .insert({ tipo, professor, titulo, descricao, data_aviso });

        if (error) return res.status(500).json({ sucesso: false, erro: 'Erro ao criar aviso' });
        res.json({ sucesso: true });
});

app.put('/api/avisos/:id', requireAdminAuth, async (req, res) => {
        const { id } = req.params;
        const { tipo, professor, titulo, descricao, data_aviso } = req.body;

        const { error } = await supabase
                .from('Avisos')
                .update({ tipo, professor, titulo, descricao, data_aviso })
                .eq('id', id);

        if (error) return res.status(500).json({ sucesso: false, erro: 'Erro ao atualizar aviso' });
        res.json({ sucesso: true });
});

app.delete('/api/avisos/:id', requireAdminAuth, async (req, res) => {
        const { error } = await supabase.from('Avisos').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ sucesso: false, erro: 'Erro ao excluir aviso' });
        res.json({ sucesso: true });
});

// ─── TURMAS ───────────────────────────────────────────────────────────────────
app.get('/api/turmas', (req, res) => {
        res.json(['1A', '1B', '1C', '1D', '2A', '2B', '2C', '3A', '3B', '3C']);
});

// ─── PROFESSORES POR TURMA (Presenças) ───────────────────────────────────────
app.get('/api/professores-turma', async (req, res) => {
        const { data, error } = await supabase.from('Presenças').select('*');
        if (error) return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar professores por turma' });
        res.json(data);
});

app.get('/api/professores-turma/:turma', async (req, res) => {
        const { turma } = req.params;
        const { data, error } = await supabase
                .from('Presenças')
                .select('*')
                .eq('turma', turma);

        if (error) return res.status(500).json({ sucesso: false, erro: 'Erro ao buscar professores da turma' });
        res.json(data);
});

app.put('/api/professores-turma/:id', requireAdminAuth, async (req, res) => {
        const { id } = req.params;
        const { status, data, professor, materia } = req.body;

        const campos = {};
        if (status !== undefined) campos.status = status;
        if (data !== undefined) campos.data = data;
        if (professor !== undefined) campos.professor = professor;
        if (materia !== undefined) campos.materia = materia;

        const { error } = await supabase
                .from('Presenças')
                .update(campos)
                .eq('id', id);

        if (error) return res.status(500).json({ sucesso: false, erro: 'Erro ao atualizar presença' });
        res.json({ sucesso: true });
});

// ─── ESTATÍSTICAS ─────────────────────────────────────────────────────────────
app.get('/api/estatisticas', async (req, res) => {
        try {
                const [
                        { count: totalAlunos },
                        { count: totalProfessores },
                        { count: totalEventos },
                        { count: totalAvisos },
                        { data: alunosPorSerie },
                        { data: avisosPorTipo },
                        { data: presencaProfessores }
                ] = await Promise.all([
                        supabase.from('Cadastro_Aluno').select('*', { count: 'exact', head: true }).eq('ativo', true),
                        supabase.from('Professores').select('*', { count: 'exact', head: true }),
                        supabase.from('Conteudos').select('*', { count: 'exact', head: true }).eq('ativo', true),
                        supabase.from('Avisos').select('*', { count: 'exact', head: true }),
                        supabase.from('Cadastro_Aluno').select('serie').eq('ativo', true),
                        supabase.from('Avisos').select('tipo'),
                        supabase.from('Presenças').select('status')
                ]);

                const groupBy = (arr, key) => {
                        return arr.reduce((acc, item) => {
                                const val = item[key];
                                acc[val] = (acc[val] || 0) + 1;
                                return acc;
                        }, {});
                };

                const serieGroup = groupBy(alunosPorSerie || [], 'serie');
                const tipoGroup = groupBy(avisosPorTipo || [], 'tipo');
                const statusGroup = groupBy(presencaProfessores || [], 'status');

                const turmasUnicas = new Set((presencaProfessores || []).map(p => p.turma));

                res.json({
                        total_alunos: totalAlunos || 0,
                        total_professores: totalProfessores || 0,
                        total_eventos: totalEventos || 0,
                        total_avisos: totalAvisos || 0,
                        total_turmas: turmasUnicas.size,
                        alunos_por_serie: Object.entries(serieGroup).map(([serie, total]) => ({ serie, total })),
                        avisos_por_tipo: Object.entries(tipoGroup).map(([tipo, total]) => ({ tipo, total })),
                        presenca_professores: Object.entries(statusGroup).map(([status, total]) => ({ status, total }))
                });
        } catch (error) {
                res.status(500).json({ erro: 'Erro ao buscar estatísticas', detalhes: error.message });
        }
});

// ════════════════════════════════════════════════════════
// ─── CALENDÁRIO DE PROVAS ────────────────────────────────
// ════════════════════════════════════════════════════════
app.get('/api/provas', async (req, res) => {
        const { turma } = req.query;
        let query = supabase.from('provas').select('*').order('data', { ascending: true });
        if (turma) query = query.eq('turma', turma);
        const { data, error } = await query;
        if (error) return res.status(500).json({ erro: error.message });
        res.json(data || []);
});

app.post('/api/provas', requireAdminAuth, async (req, res) => {
        const { titulo, materia, descricao, data, turma, criado_por } = req.body;
        if (!titulo || !materia || !data || !turma) return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
        const { data: novo, error } = await supabase.from('provas').insert({ titulo, materia, descricao, data, turma, criado_por }).select().single();
        if (error) return res.status(500).json({ erro: error.message });
        res.json({ sucesso: true, prova: novo });
});

app.delete('/api/provas/:id', requireAdminAuth, async (req, res) => {
        const { data: existe } = await supabase.from('provas').select('id').eq('id', req.params.id).single();
        if (!existe) return res.status(404).json({ erro: 'Prova não encontrada.' });
        const { error } = await supabase.from('provas').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ erro: error.message });
        res.json({ sucesso: true });
});

// ════════════════════════════════════════════════════════
// ─── CHAT DE DÚVIDAS ─────────────────────────────────────
// ════════════════════════════════════════════════════════
app.get('/api/duvidas', async (req, res) => {
        const { turma } = req.query;
        let query = supabase.from('duvidas').select('*').order('created_at', { ascending: true });
        if (turma) query = query.eq('turma', turma);
        const { data, error } = await query;
        if (error) return res.status(500).json({ erro: error.message });
        res.json(data || []);
});

app.post('/api/duvidas', async (req, res) => {
        const { pergunta, aluno_nome, aluno_email, turma } = req.body;
        if (!pergunta || !aluno_nome || !aluno_email || !turma) return res.status(400).json({ erro: 'Dados incompletos. Faça login novamente.' });
        const { data: nova, error } = await supabase.from('duvidas').insert({ pergunta, aluno_nome, aluno_email, turma }).select().single();
        if (error) return res.status(500).json({ erro: error.message });
        res.json({ sucesso: true, duvida: nova });
});

app.put('/api/duvidas/:id/resposta', requireAdminAuth, async (req, res) => {
        const { resposta, respondido_por } = req.body;
        if (!resposta) return res.status(400).json({ erro: 'Resposta não pode ser vazia.' });
        const { error } = await supabase.from('duvidas').update({ resposta, respondido_por, respondido_at: new Date().toISOString() }).eq('id', req.params.id);
        if (error) return res.status(500).json({ erro: error.message });
        res.json({ sucesso: true });
});

app.delete('/api/duvidas/:id', requireAdminAuth, async (req, res) => {
        const { error } = await supabase.from('duvidas').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ erro: error.message });
        res.json({ sucesso: true });
});

// ════════════════════════════════════════════════════════
// ─── CONTROLE DE TAREFAS ─────────────────────────────────
// ════════════════════════════════════════════════════════
app.get('/api/tarefas', async (req, res) => {
        const { turma } = req.query;
        let query = supabase.from('tarefas').select('*').order('prazo', { ascending: true });
        if (turma) query = query.eq('turma', turma);
        const { data, error } = await query;
        if (error) return res.status(500).json({ erro: error.message });
        res.json(data || []);
});

app.post('/api/tarefas', requireAdminAuth, async (req, res) => {
        const { titulo, descricao, materia, turma, prazo, criado_por } = req.body;
        if (!titulo || !materia || !turma || !prazo) return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
        const { data: nova, error } = await supabase.from('tarefas').insert({ titulo, descricao, materia, turma, prazo, criado_por }).select().single();
        if (error) return res.status(500).json({ erro: error.message });
        res.json({ sucesso: true, tarefa: nova });
});

app.post('/api/tarefas/:id/concluir', async (req, res) => {
        const { aluno_email, aluno_nome } = req.body;
        const tarefa_id = Number(req.params.id);
        const { data: jaFeita } = await supabase.from('tarefas_concluidas').select('id').eq('tarefa_id', tarefa_id).eq('aluno_email', aluno_email).single();
        if (jaFeita) {
                await supabase.from('tarefas_concluidas').delete().eq('tarefa_id', tarefa_id).eq('aluno_email', aluno_email);
                return res.json({ sucesso: true, concluida: false });
        }
        await supabase.from('tarefas_concluidas').insert({ tarefa_id, aluno_email, aluno_nome });
        res.json({ sucesso: true, concluida: true });
});

app.get('/api/tarefas/concluidas/:email', async (req, res) => {
        const { data, error } = await supabase.from('tarefas_concluidas').select('tarefa_id').eq('aluno_email', req.params.email);
        if (error) return res.status(500).json({ erro: error.message });
        res.json((data || []).map(t => t.tarefa_id));
});

app.delete('/api/tarefas/:id', requireAdminAuth, async (req, res) => {
        const { data: existe } = await supabase.from('tarefas').select('id').eq('id', req.params.id).single();
        if (!existe) return res.status(404).json({ erro: 'Tarefa não encontrada.' });
        await supabase.from('tarefas_concluidas').delete().eq('tarefa_id', req.params.id);
        const { error } = await supabase.from('tarefas').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ erro: error.message });
        res.json({ sucesso: true });
});

// ════════════════════════════════════════════════════════
// ─── RANKING DE TAREFAS ──────────────────────────────────
// ════════════════════════════════════════════════════════
app.get('/api/ranking/:turma', async (req, res) => {
        const { turma } = req.params;
        const { data: tarefasTurma } = await supabase
                .from('tarefas')
                .select('id')
                .or(`turma.eq.${turma},turma.eq.Todas`);

        const ids = (tarefasTurma || []).map(t => t.id);
        if (ids.length === 0) return res.json([]);

        const { data: concluidas, error } = await supabase
                .from('tarefas_concluidas')
                .select('aluno_nome, aluno_email')
                .in('tarefa_id', ids);

        if (error) return res.status(500).json({ erro: error.message });

        const contagem = {};
        (concluidas || []).forEach(item => {
                const key = item.aluno_nome || item.aluno_email;
                contagem[key] = (contagem[key] || 0) + 1;
        });

        const ranking = Object.entries(contagem)
                .map(([nome, total]) => ({ nome, total }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 10);

        res.json(ranking);
});

// ════════════════════════════════════════════════════════
// ─── BOLETINS & OBSERVAÇÕES ──────────────────────────────
// ════════════════════════════════════════════════════════
app.post('/api/boletins', requireAdminAuth, upload.single('arquivo'), async (req, res) => {
        const { aluno_email, aluno_nome, turma, tipo, observacao, enviado_por } = req.body;
        if (!aluno_email) return res.status(400).json({ erro: 'E-mail do aluno é obrigatório.' });

        let arquivo_url = null;
        let arquivo_nome = null;
        if (req.file) {
                arquivo_url = `/uploads/${req.file.filename}`;
                arquivo_nome = req.file.originalname;
        }

        const { data, error } = await supabase.from('boletins').insert({
                aluno_email, aluno_nome, turma,
                tipo: tipo || 'boletim',
                arquivo_url, arquivo_nome, observacao,
                enviado_por
        }).select().single();

        if (error) return res.status(500).json({ erro: error.message });
        res.json({ sucesso: true, boletim: data });
});

app.get('/api/boletins/aluno/:email', async (req, res) => {
        const { data, error } = await supabase
                .from('boletins')
                .select('*')
                .eq('aluno_email', req.params.email)
                .order('created_at', { ascending: false });
        if (error) return res.status(500).json({ erro: error.message });
        res.json(data || []);
});

app.delete('/api/boletins/:id', requireAdminAuth, async (req, res) => {
        const { data: b } = await supabase.from('boletins').select('arquivo_url').eq('id', req.params.id).single();
        if (b?.arquivo_url) {
                const filePath = path.join(__dirname, '../frontend', b.arquivo_url);
                try { fs.unlinkSync(filePath); } catch (e) {}
        }
        const { error } = await supabase.from('boletins').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ erro: error.message });
        res.json({ sucesso: true });
});

// ════════════════════════════════════════════════════════
// ─── ENQUETES RÁPIDAS ────────────────────────────────────
// ════════════════════════════════════════════════════════
app.get('/api/enquetes', async (req, res) => {
        const { turma } = req.query;
        let query = supabase.from('enquetes').select('*').order('created_at', { ascending: false });
        if (turma) query = query.eq('turma', turma);
        const { data, error } = await query;
        if (error) return res.status(500).json({ erro: error.message });
        res.json(data || []);
});

app.post('/api/enquetes', requireAdminAuth, async (req, res) => {
        const { pergunta, opcoes, turma, criado_por } = req.body;
        if (!pergunta || !opcoes || opcoes.length < 2 || !turma) return res.status(400).json({ erro: 'Preencha todos os campos. Mínimo 2 opções.' });
        const { data: nova, error } = await supabase.from('enquetes').insert({ pergunta, opcoes, turma, criado_por, ativa: true }).select().single();
        if (error) return res.status(500).json({ erro: error.message });
        res.json({ sucesso: true, enquete: nova });
});

app.post('/api/enquetes/:id/votar', async (req, res) => {
        const { opcao, aluno_email } = req.body;
        const enquete_id = Number(req.params.id);
        const { data: jaVotou } = await supabase.from('votos').select('id').eq('enquete_id', enquete_id).eq('aluno_email', aluno_email).single();
        if (jaVotou) return res.status(400).json({ erro: 'Você já votou nesta enquete.' });
        await supabase.from('votos').insert({ enquete_id, opcao, aluno_email });
        res.json({ sucesso: true });
});

app.get('/api/enquetes/:id/resultados', async (req, res) => {
        const { data: votos, error } = await supabase.from('votos').select('opcao').eq('enquete_id', req.params.id);
        if (error) return res.status(500).json({ erro: error.message });
        const contagem = {};
        (votos || []).forEach(v => { contagem[v.opcao] = (contagem[v.opcao] || 0) + 1; });
        res.json({ total: votos.length, contagem });
});

app.delete('/api/enquetes/:id', requireAdminAuth, async (req, res) => {
        await supabase.from('votos').delete().eq('enquete_id', req.params.id);
        const { error } = await supabase.from('enquetes').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ erro: error.message });
        res.json({ sucesso: true });
});

// ════════════════════════════════════════════════════════
// ─── MENSAGENS DIRETAS ───────────────────────────────────
// ════════════════════════════════════════════════════════
// Tabela: mensagens (id, de_email, de_nome, de_tipo, para_email, para_nome, mensagem, lida, created_at)

app.post('/api/mensagens', requireAdminAuth, async (req, res) => {
        const { para_email, para_nome, mensagem } = req.body;
        if (!para_email || !mensagem || !mensagem.trim()) {
                return res.status(400).json({ sucesso: false, erro: 'Destinatário e mensagem são obrigatórios.' });
        }
        const { error } = await supabase.from('mensagens').insert({
                de_email: req.adminInfo.email,
                de_nome: req.adminInfo.nome,
                de_tipo: req.adminInfo.tipo || 'direcao',
                para_email,
                para_nome: para_nome || para_email,
                mensagem: mensagem.trim(),
                lida: false
        });
        if (error) return res.status(500).json({ sucesso: false, erro: 'Erro ao enviar mensagem: ' + error.message });
        res.json({ sucesso: true, mensagem: 'Mensagem enviada!' });
});

app.post('/api/mensagens/aluno', async (req, res) => {
        const { de_email, de_nome, para_email, para_nome, mensagem } = req.body;
        if (!de_email || !para_email || !mensagem || !mensagem.trim()) {
                return res.status(400).json({ sucesso: false, erro: 'Dados incompletos.' });
        }
        if (!de_email.endsWith('@escola.pr.gov.br')) {
                return res.status(403).json({ sucesso: false, erro: 'Não autorizado.' });
        }
        const { error } = await supabase.from('mensagens').insert({
                de_email,
                de_nome: de_nome || de_email,
                de_tipo: 'aluno',
                para_email,
                para_nome: para_nome || para_email,
                mensagem: mensagem.trim(),
                lida: false
        });
        if (error) return res.status(500).json({ sucesso: false, erro: 'Erro ao enviar mensagem: ' + error.message });
        res.json({ sucesso: true, mensagem: 'Mensagem enviada!' });
});

app.get('/api/mensagens/aluno/:email', async (req, res) => {
        const { email } = req.params;
        const { data, error } = await supabase
                .from('mensagens')
                .select('*')
                .or(`para_email.eq.${email},de_email.eq.${email}`)
                .order('created_at', { ascending: true });
        if (error) return res.status(500).json({ erro: error.message });
        res.json(data || []);
});

app.get('/api/mensagens/admin/:email', requireAdminAuth, async (req, res) => {
        const { email } = req.params;
        const { data, error } = await supabase
                .from('mensagens')
                .select('*')
                .or(`para_email.eq.${email},de_email.eq.${email}`)
                .order('created_at', { ascending: true });
        if (error) return res.status(500).json({ erro: error.message });
        res.json(data || []);
});

app.get('/api/mensagens/nao-lidas/:email', async (req, res) => {
        const { data, error } = await supabase
                .from('mensagens')
                .select('id')
                .eq('para_email', req.params.email)
                .eq('lida', false);
        if (error) return res.status(500).json({ erro: error.message });
        res.json({ total: (data || []).length });
});

app.patch('/api/mensagens/marcar-lidas/:email', async (req, res) => {
        await supabase.from('mensagens')
                .update({ lida: true })
                .eq('para_email', req.params.email)
                .eq('lida', false);
        res.json({ sucesso: true });
});

// ─── SOLICITAÇÕES DE ACESSO DIREÇÃO ──────────────────────────────────────────

app.post('/api/solicitar-direcao', async (req, res) => {
        const { nome, email, senha, mensagem } = req.body;
        if (!nome || !email) return res.status(400).json({ erro: 'Nome e e-mail são obrigatórios.' });
        const row = { nome, email, mensagem: mensagem || '', tem_senha: false };
        if (senha) {
                row.senha_hash = await bcrypt.hash(senha, 10);
                row.tem_senha = true;
        }
        const { error } = await supabase.from('solicitacoes_direcao').insert([row]);
        if (error) return res.status(500).json({ erro: error.message });
        if (process.env.EMAIL_REMETENTE && process.env.EMAIL_SENHA_APP) {
                try {
                        const t = criarTransporter();
                        await t.sendMail({
                                from: `"Agenda Escolar" <${process.env.EMAIL_REMETENTE}>`,
                                to: process.env.EMAIL_REMETENTE,
                                subject: '🔔 Nova Solicitação de Acesso — Direção',
                                html: `<h2>Nova solicitação de acesso à Direção</h2>
                                       <p><strong>Nome:</strong> ${nome}</p>
                                       <p><strong>E-mail:</strong> ${email}</p>
                                       ${mensagem ? `<p><strong>Mensagem:</strong> ${mensagem}</p>` : ''}
                                       <p>Acesse o painel de admin → aba Solicitações para criar a conta.</p>`
                        });
                } catch {}
        }
        res.json({ sucesso: true });
});

app.get('/api/solicitar-direcao', requireAdminAuth, async (req, res) => {
        const { data, error } = await supabase.from('solicitacoes_direcao')
                .select('id, nome, email, mensagem, tem_senha, created_at')
                .order('created_at', { ascending: false });
        if (error) return res.status(500).json({ erro: error.message });
        res.json(data || []);
});

app.put('/api/solicitar-direcao/:id', requireAdminAuth, async (req, res) => {
        const { nome, email } = req.body;
        if (!nome || !email) return res.status(400).json({ erro: 'Nome e e-mail são obrigatórios.' });
        const { error } = await supabase.from('solicitacoes_direcao')
                .update({ nome, email })
                .eq('id', req.params.id);
        if (error) return res.status(500).json({ erro: error.message });
        res.json({ sucesso: true });
});

app.delete('/api/solicitar-direcao/:id', requireAdminAuth, async (req, res) => {
        const { error } = await supabase.from('solicitacoes_direcao').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ erro: error.message });
        res.json({ sucesso: true });
});

app.post('/api/solicitar-direcao/:id/mensagem', requireAdminAuth, async (req, res) => {
        const { mensagem } = req.body;
        const { data: sol } = await supabase.from('solicitacoes_direcao').select('nome, email').eq('id', req.params.id).single();
        if (!sol) return res.status(404).json({ erro: 'Solicitação não encontrada.' });
        if (!process.env.EMAIL_REMETENTE || !process.env.EMAIL_SENHA_APP)
                return res.status(500).json({ erro: 'Configuração de e-mail não encontrada.' });
        try {
                const t = criarTransporter();
                await t.sendMail({
                        from: `"Agenda Escolar Tânia Varella Ferreira" <${process.env.EMAIL_REMETENTE}>`,
                        to: sol.email,
                        subject: '📩 Mensagem da Administração — Agenda Escolar',
                        html: `<h2>Olá, ${sol.nome}!</h2>
                               <p>Você recebeu uma mensagem da administração referente à sua solicitação de acesso:</p>
                               <blockquote style="border-left:4px solid #4361ee; padding-left:12px; color:#555;">${mensagem}</blockquote>
                               <p style="font-size:0.85rem; color:#888;">Este é um e-mail automático da Agenda Escolar Tânia Varella Ferreira.</p>`
                });
                res.json({ sucesso: true });
        } catch (e) {
                res.status(500).json({ erro: 'Erro ao enviar e-mail: ' + e.message });
        }
});

app.post('/api/direcao/criar-conta', requireAdminAuth, async (req, res) => {
        const { id, nome, email, senha } = req.body;
        if (!nome || !email) return res.status(400).json({ erro: 'Nome e e-mail são obrigatórios.' });
        const { data: existing } = await supabase.from('Login_Direção').select('E-mail').eq('E-mail', email).single();
        if (existing) return res.status(400).json({ erro: 'Já existe uma conta com este e-mail.' });

        let senhaHash;
        let senhaTexto = senha;
        if (senha) {
                senhaHash = await bcrypt.hash(senha, 10);
        } else if (id) {
                const { data: sol } = await supabase.from('solicitacoes_direcao')
                        .select('senha_hash').eq('id', id).single();
                if (sol?.senha_hash) {
                        senhaHash = sol.senha_hash;
                        senhaTexto = null;
                } else {
                        return res.status(400).json({ erro: 'Nenhuma senha fornecida e a solicitação não tem senha armazenada.' });
                }
        } else {
                return res.status(400).json({ erro: 'Senha é obrigatória.' });
        }

        const { error } = await supabase.from('Login_Direção').insert([{ 'E-mail': email, 'Senha': senhaHash }]);
        if (error) return res.status(500).json({ erro: error.message });
        if (id) await supabase.from('solicitacoes_direcao').delete().eq('id', id);

        if (process.env.EMAIL_REMETENTE && process.env.EMAIL_SENHA_APP) {
                try {
                        const t = criarTransporter();
                        await t.sendMail({
                                from: `"Agenda Escolar Tânia Varella Ferreira" <${process.env.EMAIL_REMETENTE}>`,
                                to: email,
                                subject: '✅ Sua conta de Direção foi criada!',
                                html: `<h2>Bem-vindo(a), ${nome}!</h2>
                                       <p>Sua conta de acesso à Direção foi criada com sucesso.</p>
                                       <p><strong>E-mail de login:</strong> ${email}</p>
                                       ${senhaTexto ? `<p><strong>Senha:</strong> ${senhaTexto}</p>` : '<p>Use a senha que você definiu na solicitação.</p>'}
                                       <p>Acesse o sistema pela opção <strong>"Já tenho acesso? Entrar"</strong>.</p>`
                        });
                } catch {}
        }
        res.json({ sucesso: true });
});

app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Servidor rodando na porta ${PORT}`);
        console.log(`☁️  Banco de dados: Supabase`);
        console.log(`🔐 Autenticação ativa`);
});
