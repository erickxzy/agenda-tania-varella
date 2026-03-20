require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const path = require('path');

// Armazenamento temporário de registros pendentes (expira em 15 min)
const pendentesVerificacao = new Map();

const app = express();
const PORT = process.env.PORT || 5000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error('❌ SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios!');
        process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

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

// ─── CADASTRO DIREÇÃO ─────────────────────────────────────────────────────────
app.post('/api/cadastrar-direcao', async (req, res) => {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
                return res.status(400).json({ sucesso: false, erro: 'Preencha todos os campos!' });
        }

        const { data: existe } = await supabase
                .from('Login_Direção')
                .select('id')
                .eq('email', email)
                .single();

        if (existe) {
                return res.status(400).json({ sucesso: false, erro: 'Este e-mail já está cadastrado!' });
        }

        const senhaHash = bcrypt.hashSync(senha, 10);

        const { error } = await supabase
                .from('Login_Direção')
                .insert({ nome, email, senha: senhaHash });

        if (error) {
                return res.status(500).json({ sucesso: false, erro: 'Erro ao cadastrar.' });
        }

        res.json({ sucesso: true, mensagem: 'Membro da direção cadastrado com sucesso! Agora faça login.' });
});

// ─── LOGIN ALUNO ──────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
        const { email, senha } = req.body;

        const { data: aluno } = await supabase
                .from('Cadastro_Aluno')
                .select('*')
                .eq('email', email)
                .single();

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

// ─── LOGIN DIREÇÃO ────────────────────────────────────────────────────────────
app.post('/api/login-direcao', async (req, res) => {
        const { email, senha } = req.body;

        const { data: membro } = await supabase
                .from('Login_Direção')
                .select('*')
                .eq('email', email)
                .single();

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
                const { data } = await supabase.from('Login_Direção').select('*').eq('email', email).single();
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
                await supabase.from('Login_Direção').update({ senha: senhaHash }).eq('email', email);
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

app.delete('/api/alunos/:id', async (req, res) => {
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

app.post('/api/eventos', async (req, res) => {
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

app.put('/api/eventos/:id', async (req, res) => {
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

app.delete('/api/eventos/:id', async (req, res) => {
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

app.put('/api/cardapio/:dia', async (req, res) => {
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

app.put('/api/professores/:id', async (req, res) => {
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

app.post('/api/avisos', async (req, res) => {
        const { tipo, professor, titulo, descricao, data_aviso } = req.body;

        const { error } = await supabase
                .from('Avisos')
                .insert({ tipo, professor, titulo, descricao, data_aviso });

        if (error) return res.status(500).json({ sucesso: false, erro: 'Erro ao criar aviso' });
        res.json({ sucesso: true });
});

app.put('/api/avisos/:id', async (req, res) => {
        const { id } = req.params;
        const { tipo, professor, titulo, descricao, data_aviso } = req.body;

        const { error } = await supabase
                .from('Avisos')
                .update({ tipo, professor, titulo, descricao, data_aviso })
                .eq('id', id);

        if (error) return res.status(500).json({ sucesso: false, erro: 'Erro ao atualizar aviso' });
        res.json({ sucesso: true });
});

app.delete('/api/avisos/:id', async (req, res) => {
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

app.put('/api/professores-turma/:id', async (req, res) => {
        const { id } = req.params;
        const { status, data } = req.body;

        const { error } = await supabase
                .from('Presenças')
                .update({ status, data })
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

app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Servidor rodando na porta ${PORT}`);
        console.log(`☁️  Banco de dados: Supabase`);
        console.log(`🔐 Autenticação ativa`);
});
