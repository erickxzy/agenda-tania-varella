// ─── ADMIN FETCH COM TOKEN DE SEGURANÇA ───────────────────────────────────────
function adminFetch(url, options = {}) {
  const token = sessionStorage.getItem('adminToken');
  const headers = { ...(options.headers || {}) };
  if (token) headers['X-Admin-Token'] = token;
  return fetch(url, { ...options, headers });
}

// ─── SUPABASE + GOOGLE OAUTH ──────────────────────────────────────────────────
let supabaseClient = null;

async function initSupabase() {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    supabaseClient = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    await handleOAuthCallback();
  } catch (e) {
    console.error('Erro ao inicializar Supabase:', e);
  }
}

async function handleOAuthCallback() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const googleEmail = session.user.email;
  const googleNome = session.user.user_metadata?.full_name || session.user.user_metadata?.name || googleEmail.split('@')[0];

  await supabaseClient.auth.signOut();

  if (!googleEmail.endsWith('@escola.pr.gov.br')) {
    showToast('Apenas e-mails @escola.pr.gov.br são permitidos!', 'error', 'Acesso Negado');
    return;
  }

  try {
    const res = await fetch('/api/login-google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: googleEmail, nome: googleNome })
    });
    const data = await res.json();

    if (!data.sucesso) {
      showToast(data.erro, 'error');
      return;
    }

    if (data.novo) {
      mostrarModalSelecionarTurma(data.usuario);
    } else {
      usuarioAtual = data.usuario;
      mostrarPainelAluno(data.usuario);
      showToast('Bem-vindo(a), ' + data.usuario.nome + '!', 'success', 'Login Realizado');
    }
  } catch (e) {
    showToast('Erro ao processar login com Google.', 'error');
  }
}

function mostrarModalSelecionarTurma(usuario) {
  const modal = document.getElementById('modalSelecionarTurma');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';

  document.getElementById('btnConfirmarTurmaGoogle').onclick = async () => {
    const serie = document.getElementById('turmaGoogleSelect').value;
    if (!serie) {
      showToast('Selecione uma turma!', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/login-google/turma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: usuario.email, nome: usuario.nome, serie })
      });
      const data = await res.json();

      if (data.sucesso) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        usuarioAtual = data.usuario;
        mostrarPainelAluno(data.usuario);
        showToast('Bem-vindo(a), ' + data.usuario.nome + '!', 'success', 'Cadastro Realizado');
      } else {
        showToast(data.erro, 'error');
      }
    } catch (e) {
      showToast('Erro ao salvar turma.', 'error');
    }
  };
}

async function loginComGoogle() {
  if (!supabaseClient) {
    showToast('Serviço não disponível, tente novamente.', 'error');
    return;
  }
  const redirectTo = window.location.origin + window.location.pathname;
  await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo }
  });
}

initSupabase();

// ─── TEMA ─────────────────────────────────────────────────────────────────────
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.querySelector('.theme-icon');

function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeIcon.textContent = '☀️';
  } else {
    document.body.classList.remove('dark-mode');
    themeIcon.textContent = '🌙';
  }
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  
  if (document.body.classList.contains('dark-mode')) {
    themeIcon.textContent = '☀️';
    localStorage.setItem('theme', 'dark');
  } else {
    themeIcon.textContent = '🌙';
    localStorage.setItem('theme', 'light');
  }
}

themeToggle.addEventListener('click', toggleTheme);

loadTheme();

function showToast(message, type = 'info', title = '') {
  const container = document.getElementById('toast-container');
  
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  const titles = {
    success: title || 'Sucesso!',
    error: title || 'Erro!',
    warning: title || 'Atenção!',
    info: title || 'Informação'
  };
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <div class="toast-content">
      <div class="toast-title">${titles[type]}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}



const btnCriadores = document.getElementById('btnCriadores');
const modalCriadores = document.getElementById('modalCriadores');
const btnFecharModal = document.getElementById('btnFecharModal');
const modalRecuperarSenha = document.getElementById('modalRecuperarSenha');
const btnFecharRecuperar = document.getElementById('btnFecharRecuperar');
const esqueceuSenhaLink = document.getElementById('esqueceuSenha');
const esqueceuSenhaContainer = document.getElementById('esqueceuSenhaContainer');
const formRecuperarSenha = document.getElementById('formRecuperarSenha');
const formResetarSenha = document.getElementById('formResetarSenha');
const emailRecuperar = document.getElementById('emailRecuperar');
const codigoRecuperar = document.getElementById('codigoRecuperar');
const novaSenhaRecuperar = document.getElementById('novaSenhaRecuperar');
const confirmarSenhaRecuperar = document.getElementById('confirmarSenhaRecuperar');
const mensagemRecuperar = document.getElementById('mensagemRecuperar');
const etapa1Recuperar = document.getElementById('etapa1Recuperar');
const etapa2Recuperar = document.getElementById('etapa2Recuperar');
const tituloRecuperar = document.getElementById('tituloRecuperar');

let emailRecuperacao = '';

btnCriadores.addEventListener('click', (e) => {
  e.preventDefault();
  modalCriadores.classList.remove('hidden');
  modalCriadores.style.display = 'flex';
});

btnFecharModal.addEventListener('click', (e) => {
  e.preventDefault();
  modalCriadores.classList.add('hidden');
  modalCriadores.style.display = 'none';
});

modalCriadores.addEventListener('click', (e) => {
  if (e.target === modalCriadores) {
    modalCriadores.classList.add('hidden');
    modalCriadores.style.display = 'none';
  }
});

esqueceuSenhaLink.addEventListener('click', (e) => {
  e.preventDefault();
  modalRecuperarSenha.classList.remove('hidden');
  modalRecuperarSenha.style.display = 'flex';
  mensagemRecuperar.textContent = '';
  emailRecuperar.value = '';
  etapa1Recuperar.style.display = 'block';
  etapa2Recuperar.style.display = 'none';
  tituloRecuperar.textContent = '🔑 Recuperar Senha';
});

btnFecharRecuperar.addEventListener('click', (e) => {
  e.preventDefault();
  modalRecuperarSenha.classList.add('hidden');
  modalRecuperarSenha.style.display = 'none';
  etapa1Recuperar.style.display = 'block';
  etapa2Recuperar.style.display = 'none';
  mensagemRecuperar.textContent = '';
});

modalRecuperarSenha.addEventListener('click', (e) => {
  if (e.target === modalRecuperarSenha) {
    modalRecuperarSenha.classList.add('hidden');
    modalRecuperarSenha.style.display = 'none';
    etapa1Recuperar.style.display = 'block';
    etapa2Recuperar.style.display = 'none';
    mensagemRecuperar.textContent = '';
  }
});

formRecuperarSenha.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailRecuperar.value.trim();
  
  if (!email) {
    mensagemRecuperar.textContent = '❌ Por favor, digite seu e-mail.';
    mensagemRecuperar.style.color = '#f56565';
    return;
  }

  mensagemRecuperar.textContent = '⏳ Enviando código...';
  mensagemRecuperar.style.color = 'var(--text-secondary)';

  try {
    const response = await fetch('/api/recuperar-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, tipo: tipoUsuario })
    });

    const data = await response.json();

    if (response.ok) {
      emailRecuperacao = email;
      etapa1Recuperar.style.display = 'none';
      etapa2Recuperar.style.display = 'block';
      tituloRecuperar.textContent = '🔐 Digite o Código';
      mensagemRecuperar.textContent = '✅ ' + data.message;
      mensagemRecuperar.style.color = '#48bb78';
    } else {
      mensagemRecuperar.textContent = '❌ ' + data.error;
      mensagemRecuperar.style.color = '#f56565';
    }
  } catch (error) {
    mensagemRecuperar.textContent = '❌ Erro ao enviar código. Tente novamente.';
    mensagemRecuperar.style.color = '#f56565';
  }
});

formResetarSenha.addEventListener('submit', async (e) => {
  e.preventDefault();
  const codigo = codigoRecuperar.value.trim();
  const novaSenha = novaSenhaRecuperar.value.trim();
  const confirmarSenha = confirmarSenhaRecuperar.value.trim();

  if (!codigo || !novaSenha || !confirmarSenha) {
    mensagemRecuperar.textContent = '❌ Preencha todos os campos.';
    mensagemRecuperar.style.color = '#f56565';
    return;
  }

  if (novaSenha !== confirmarSenha) {
    mensagemRecuperar.textContent = '❌ As senhas não coincidem.';
    mensagemRecuperar.style.color = '#f56565';
    return;
  }

  if (novaSenha.length < 6) {
    mensagemRecuperar.textContent = '❌ A senha deve ter pelo menos 6 caracteres.';
    mensagemRecuperar.style.color = '#f56565';
    return;
  }

  mensagemRecuperar.textContent = '⏳ Alterando senha...';
  mensagemRecuperar.style.color = 'var(--text-secondary)';

  try {
    const response = await fetch('/api/resetar-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: emailRecuperacao, 
        codigo: codigo, 
        novaSenha: novaSenha 
      })
    });

    const data = await response.json();

    if (response.ok) {
      mensagemRecuperar.textContent = '✅ ' + data.message;
      mensagemRecuperar.style.color = '#48bb78';
      codigoRecuperar.value = '';
      novaSenhaRecuperar.value = '';
      confirmarSenhaRecuperar.value = '';
      
      setTimeout(() => {
        modalRecuperarSenha.classList.add('hidden');
        modalRecuperarSenha.style.display = 'none';
        etapa1Recuperar.style.display = 'block';
        etapa2Recuperar.style.display = 'none';
        mensagemRecuperar.textContent = '';
      }, 3000);
    } else {
      mensagemRecuperar.textContent = '❌ ' + data.error;
      mensagemRecuperar.style.color = '#f56565';
    }
  } catch (error) {
    mensagemRecuperar.textContent = '❌ Erro ao resetar senha. Tente novamente.';
    mensagemRecuperar.style.color = '#f56565';
  }
});

const loginForm = document.getElementById("loginForm");
const nomeInput = document.getElementById("nome");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const serieSelect = document.getElementById("serie");
const botaoLogin = document.getElementById("botaoLogin");
const mostrarCadastro = document.getElementById("mostrarCadastro");
const formTitulo = document.getElementById("formTitulo");

const selecaoBox = document.getElementById("selecaoBox");
const loginBox = document.getElementById("loginBox");
const alunoPanel = document.getElementById("alunoPanel");
const adminPanel = document.getElementById("adminPanel");

const btnDirecao = document.getElementById("btnDirecao");
const btnAluno = document.getElementById("btnAluno");
const adminZonaInvisivel = document.getElementById("adminZonaInvisivel");
const btnVoltar = document.getElementById("btnVoltar");

let modoCadastro = false;
let usuarioAtual = null;
let tipoUsuario = null;
let tipoAdmin = 'direcao'; // 'admin' | 'direcao'

// ══════════════════════════════════════════════════════════════
// ─── MODAL DE CONFIRMAÇÃO CUSTOMIZADO ────────────────────────
// ══════════════════════════════════════════════════════════════
function confirmarAcao(mensagem, callback, { sub = 'Essa ação não pode ser desfeita.', icone = '🗑️', btnLabel = 'Excluir' } = {}) {
  const modal = document.getElementById('modalConfirmar');
  const elMsg = document.getElementById('confirmarMensagem');
  const elSub = document.getElementById('confirmarSub');
  const elIcone = document.getElementById('confirmarIcone');
  const btnSim = document.getElementById('btnConfirmarSim');
  const btnNao = document.getElementById('btnConfirmarNao');

  elMsg.textContent = mensagem;
  elSub.textContent = sub;
  elIcone.textContent = icone;
  btnSim.textContent = btnLabel;

  modal.classList.remove('hidden');
  modal.style.display = 'flex';

  const fechar = () => {
    modal.classList.add('hidden');
    modal.style.display = 'none';
    btnSim.onclick = null;
    btnNao.onclick = null;
  };

  btnSim.onclick = () => { fechar(); callback(); };
  btnNao.onclick = fechar;
}

function sanitizeHTML(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str || '')));
  return div.innerHTML;
}

const direcaoAcessoBox = document.getElementById("direcaoAcessoBox");

btnDirecao.addEventListener("click", () => {
  selecaoBox.classList.add("hidden");
  direcaoAcessoBox.classList.remove("hidden");
});

document.getElementById("btnVoltarDirecao").addEventListener("click", () => {
  direcaoAcessoBox.classList.add("hidden");
  selecaoBox.classList.remove("hidden");
});

document.getElementById("linkEntrarDirecao").addEventListener("click", (e) => {
  e.preventDefault();
  direcaoAcessoBox.classList.add("hidden");
  tipoUsuario = "direcao";
  mostrarTelaLogin();
});

document.getElementById("btnAbrirSolicitacao").addEventListener("click", () => {
  const m = document.getElementById("modalSolicitarDirecao");
  m.classList.remove("hidden");
  m.style.display = "";
});

document.getElementById("btnFecharSolicitacao").addEventListener("click", () => {
  const m = document.getElementById("modalSolicitarDirecao");
  m.classList.add("hidden");
  m.style.display = "none";
});

document.getElementById("formSolicitarDirecao").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = document.getElementById("solNome").value.trim();
  const email = document.getElementById("solEmail").value.trim();
  const senha = document.getElementById("solSenha").value;
  const senhaConfirm = document.getElementById("solSenhaConfirm").value;
  const mensagem = document.getElementById("solMensagem").value.trim();
  if (senha !== senhaConfirm) {
    showToast("As senhas não coincidem.", "error");
    return;
  }
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.textContent = "Enviando...";
  try {
    const res = await fetch("/api/solicitar-direcao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, senha, mensagem })
    });
    const data = await res.json();
    if (data.sucesso) {
      const m = document.getElementById("modalSolicitarDirecao");
      m.classList.add("hidden");
      m.style.display = "none";
      e.target.reset();
      direcaoAcessoBox.classList.add("hidden");
      selecaoBox.classList.remove("hidden");
      showToast("Solicitação enviada! O administrador foi notificado.", "success", "Solicitação Enviada");
    } else {
      showToast(data.erro || "Erro ao enviar solicitação.", "error");
    }
  } catch {
    showToast("Erro ao enviar. Tente novamente.", "error");
  }
  btn.disabled = false;
  btn.textContent = "📨 Enviar Solicitação";
});

btnAluno.addEventListener("click", () => {
  tipoUsuario = "aluno";
  mostrarTelaLogin();
});

let _adminCliques = 0;
let _adminTimer = null;
adminZonaInvisivel.addEventListener("click", () => {
  _adminCliques++;
  clearTimeout(_adminTimer);
  _adminTimer = setTimeout(() => { _adminCliques = 0; }, 4000);
  if (_adminCliques >= 5) {
    _adminCliques = 0;
    tipoUsuario = "admin";
    mostrarTelaLogin();
  }
});

btnVoltar.addEventListener("click", () => {
  loginBox.classList.add("hidden");
  loginForm.reset();
  modoCadastro = false;
  if (tipoUsuario === "direcao") {
    tipoUsuario = null;
    direcaoAcessoBox.classList.remove("hidden");
  } else {
    tipoUsuario = null;
    selecaoBox.classList.remove("hidden");
  }
});

const btnLoginGoogle = document.getElementById('btnLoginGoogle');
const separadorGoogle = document.getElementById('separadorGoogle');

btnLoginGoogle.addEventListener('click', loginComGoogle);

function mostrarTelaLogin() {
  selecaoBox.classList.add("hidden");
  loginBox.classList.remove("hidden");

  if (tipoUsuario === "aluno") {
    modoCadastro = true;
    formTitulo.textContent = "Cadastro do Aluno";
    emailInput.type = "email";
    emailInput.placeholder = "E-mail @escola.pr.gov.br";
    serieSelect.style.display = "block";
    mostrarCadastro.parentElement.style.display = "block";
    mostrarCadastro.textContent = "Já tem conta? Entrar";
    nomeInput.style.display = "block";
    botaoLogin.textContent = "Cadastrar";
    esqueceuSenhaContainer.style.display = "none";
    separadorGoogle.style.display = "block";
    btnLoginGoogle.style.display = "flex";
  } else if (tipoUsuario === "direcao") {
    modoCadastro = true;
    formTitulo.textContent = "Cadastro da Direção";
    emailInput.type = "email";
    emailInput.placeholder = "E-mail (Gmail ou outro)";
    serieSelect.style.display = "none";
    mostrarCadastro.parentElement.style.display = "block";
    mostrarCadastro.textContent = "Já tem conta? Entrar";
    nomeInput.style.display = "block";
    botaoLogin.textContent = "Cadastrar";
    esqueceuSenhaContainer.style.display = "none";
    separadorGoogle.style.display = "none";
    btnLoginGoogle.style.display = "none";
  } else if (tipoUsuario === "admin") {
    modoCadastro = false;
    formTitulo.textContent = "Login do Administrador";
    emailInput.type = "text";
    emailInput.placeholder = "Usuário";
    serieSelect.style.display = "none";
    mostrarCadastro.parentElement.style.display = "none";
    nomeInput.style.display = "none";
    botaoLogin.textContent = "Entrar";
    esqueceuSenhaContainer.style.display = "none";
    separadorGoogle.style.display = "none";
    btnLoginGoogle.style.display = "none";
  }
}

mostrarCadastro.addEventListener("click", e => {
  e.preventDefault();
  modoCadastro = !modoCadastro;

  if(modoCadastro){
    if (tipoUsuario === "aluno") {
      formTitulo.textContent = "Cadastro do Aluno";
    } else if (tipoUsuario === "direcao") {
      formTitulo.textContent = "Cadastro da Direção";
    }
    botaoLogin.textContent = "Cadastrar";
    mostrarCadastro.textContent = "Já tem conta? Entrar";
    nomeInput.style.display = "block";
    serieSelect.style.display = tipoUsuario === "aluno" ? "block" : "none";
    esqueceuSenhaContainer.style.display = "none";
    if (tipoUsuario === "aluno") { separadorGoogle.style.display = "block"; btnLoginGoogle.style.display = "flex"; }
  } else {
    if (tipoUsuario === "aluno") {
      formTitulo.textContent = "Login do Aluno";
    } else if (tipoUsuario === "direcao") {
      formTitulo.textContent = "Login da Direção";
    }
    botaoLogin.textContent = "Entrar";
    mostrarCadastro.textContent = "Não tem conta? Cadastrar";
    nomeInput.style.display = "none";
    serieSelect.style.display = "none";
    esqueceuSenhaContainer.style.display = tipoUsuario === "aluno" ? "block" : "none";
    if (tipoUsuario === "aluno") { separadorGoogle.style.display = "block"; btnLoginGoogle.style.display = "flex"; }
  }
});

loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  const nome = nomeInput.value.trim();
  const email = emailInput.value.trim();
  const senha = senhaInput.value.trim();
  const serie = serieSelect.value;

  if (tipoUsuario === "admin") {
    if((email === "admin" || email === "admin@sistema.local") && senha === "admin1"){
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({email: 'admin@sistema.local', senha: 'admin1'})
        });
        const data = await res.json();
        if(data.sucesso){
          usuarioAtual = data.usuario;
          if(data.token) sessionStorage.setItem('adminToken', data.token);
          tipoAdmin = 'admin';
          window._adminEmail = 'admin@sistema.local';
          sessionStorage.setItem('tipoAdmin', 'admin');
          sessionStorage.setItem('usuarioAtualStr', JSON.stringify(data.usuario));
          sessionStorage.setItem('adminEmail', 'admin@sistema.local');
          mostrarPainelAdmin();
        } else {
          showToast(data.erro || 'Erro ao fazer login', 'error');
        }
      } catch(error) {
        showToast('Erro ao fazer login. Tente novamente.', 'error');
      }
    } else {
      showToast('Usuário ou senha de administrador incorretos!', 'error');
    }
    return;
  }

  if (tipoUsuario === "aluno") {
    if(modoCadastro){
      cadastrarAluno(nome,email,senha,serie);
    } else {
      logarAluno(email,senha);
    }
  } else if (tipoUsuario === "direcao") {
    if(modoCadastro){
      cadastrarDirecao(nome,email,senha);
    } else {
      logarDirecao(email,senha);
    }
  }
});

// ─── VERIFICAÇÃO DE CADASTRO POR E-MAIL ───────────────────────────────────
const modalVerificacaoCadastro = document.getElementById('modalVerificacaoCadastro');
const formVerificacaoCadastro = document.getElementById('formVerificacaoCadastro');
const codigoVerificacaoInput = document.getElementById('codigoVerificacao');
const emailVerificandoTexto = document.getElementById('emailVerificandoTexto');
const mensagemVerificacao = document.getElementById('mensagemVerificacao');
const btnReenviarCodigo = document.getElementById('btnReenviarCodigo');
const btnCancelarVerificacao = document.getElementById('btnCancelarVerificacao');

let dadosCadastroPendente = null;
let dadosLoginPendente = null; // { email, tipo: 'aluno'|'direcao' }
let modoVerificacao = 'cadastro'; // 'cadastro' | 'login'

const tituloModalVerificacao = document.getElementById('tituloModalVerificacao');
const textoModalVerificacao = document.getElementById('textoModalVerificacao');
const btnSubmitVerificacao = document.getElementById('btnSubmitVerificacao');

function abrirModalVerificacao(email, modo = 'cadastro') {
  modoVerificacao = modo;
  emailVerificandoTexto.textContent = email;
  codigoVerificacaoInput.value = '';
  mensagemVerificacao.textContent = '';

  if (modo === 'login') {
    tituloModalVerificacao.textContent = '🔐 Verificação de Login';
    textoModalVerificacao.textContent = 'Enviamos um código de segurança para confirmar que é você.';
    btnSubmitVerificacao.textContent = '✅ Confirmar Login';
  } else {
    tituloModalVerificacao.textContent = '📧 Verificar E-mail';
    textoModalVerificacao.textContent = 'Enviamos um código de 6 dígitos para confirmar seu cadastro.';
    btnSubmitVerificacao.textContent = '✅ Confirmar Cadastro';
  }

  modalVerificacaoCadastro.classList.remove('hidden');
  modalVerificacaoCadastro.style.display = 'flex';
  setTimeout(() => codigoVerificacaoInput.focus(), 100);
}

function fecharModalVerificacao() {
  modalVerificacaoCadastro.classList.add('hidden');
  modalVerificacaoCadastro.style.display = 'none';
}

btnCancelarVerificacao.addEventListener('click', () => {
  fecharModalVerificacao();
  dadosCadastroPendente = null;
  dadosLoginPendente = null;
});

btnReenviarCodigo.addEventListener('click', async () => {
  btnReenviarCodigo.disabled = true;
  btnReenviarCodigo.textContent = '⏳ Enviando...';

  try {
    let res, data;

    if (modoVerificacao === 'login' && dadosLoginPendente) {
      res = await fetch('/api/reenviar-codigo-login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email: dadosLoginPendente.email })
      });
      data = await res.json();
    } else if (dadosCadastroPendente) {
      const reenviarEndpoint = dadosCadastroPendente.tipo === 'direcao'
        ? '/api/iniciar-cadastro-direcao'
        : '/api/iniciar-cadastro';
      res = await fetch(reenviarEndpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(dadosCadastroPendente)
      });
      data = await res.json();
    } else return;

    if (data.sucesso) {
      mensagemVerificacao.style.color = 'green';
      mensagemVerificacao.textContent = '✅ Novo código enviado!';
    } else {
      mensagemVerificacao.style.color = 'red';
      mensagemVerificacao.textContent = data.erro;
    }
  } catch {
    mensagemVerificacao.style.color = 'red';
    mensagemVerificacao.textContent = 'Erro ao reenviar. Tente novamente.';
  }
  setTimeout(() => { btnReenviarCodigo.disabled = false; btnReenviarCodigo.textContent = '🔄 Reenviar código'; }, 30000);
});

formVerificacaoCadastro.addEventListener('submit', async e => {
  e.preventDefault();
  const codigo = codigoVerificacaoInput.value.trim();
  if (!codigo) return;

  mensagemVerificacao.style.color = 'var(--text-secondary)';
  mensagemVerificacao.textContent = '⏳ Verificando...';

  // ── Modo LOGIN ──
  if (modoVerificacao === 'login' && dadosLoginPendente) {
    const endpoint = dadosLoginPendente.tipo === 'direcao'
      ? '/api/confirmar-login-direcao'
      : '/api/confirmar-login-aluno';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email: dadosLoginPendente.email, codigo })
      });
      const data = await res.json();

      if (data.sucesso) {
        fecharModalVerificacao();
        const tipo = dadosLoginPendente.tipo;
        dadosLoginPendente = null;

        usuarioAtual = data.usuario;

        if (tipo === 'direcao') {
          if (data.token) sessionStorage.setItem('adminToken', data.token);
          tipoAdmin = 'direcao';
          window._adminEmail = data.usuario?.email || '';
          sessionStorage.setItem('tipoAdmin', 'direcao');
          sessionStorage.setItem('usuarioAtualStr', JSON.stringify(data.usuario));
          sessionStorage.setItem('adminEmail', data.usuario?.email || '');
          mostrarPainelAdmin();
          showToast('Bem-vindo(a), ' + data.usuario.nome + '!', 'success', 'Login Realizado');
        } else {
          mostrarPainelAluno(data.usuario);
          showToast('Bem-vindo(a), ' + data.usuario.nome + '!', 'success', 'Login Realizado');
        }
      } else {
        mensagemVerificacao.style.color = 'red';
        mensagemVerificacao.textContent = data.erro;
      }
    } catch {
      mensagemVerificacao.style.color = 'red';
      mensagemVerificacao.textContent = 'Erro ao verificar. Tente novamente.';
    }
    return;
  }

  // ── Modo CADASTRO ──
  if (!dadosCadastroPendente) return;

  const endpoint = dadosCadastroPendente.tipo === 'direcao'
    ? '/api/verificar-codigo-direcao'
    : '/api/verificar-codigo-cadastro';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email: dadosCadastroPendente.email, codigo })
    });
    const data = await res.json();

    if (data.sucesso) {
      fecharModalVerificacao();
      const tipo = dadosCadastroPendente.tipo;
      dadosCadastroPendente = null;
      showToast(data.mensagem, 'success', 'Cadastro Confirmado! ✅');
      loginForm.reset();
      modoCadastro = false;
      formTitulo.textContent = tipo === 'direcao' ? "Login da Direção" : "Login do Aluno";
      botaoLogin.textContent = "Entrar";
      mostrarCadastro.textContent = "Não tem conta? Cadastrar";
      nomeInput.style.display = "none";
      serieSelect.style.display = "none";
      esqueceuSenhaContainer.style.display = "block";
    } else {
      mensagemVerificacao.style.color = 'red';
      mensagemVerificacao.textContent = data.erro;
    }
  } catch {
    mensagemVerificacao.style.color = 'red';
    mensagemVerificacao.textContent = 'Erro ao verificar. Tente novamente.';
  }
});

// Só permite dígitos no campo de código
codigoVerificacaoInput.addEventListener('input', () => {
  codigoVerificacaoInput.value = codigoVerificacaoInput.value.replace(/\D/g, '');
});

async function cadastrarAluno(nome,email,senha,serie){
  if(!nome||!email||!senha||!serie){ showToast('Por favor, preencha todos os campos!', 'warning'); return; }

  if(!email.endsWith("@escola.pr.gov.br")){
    showToast('O e-mail deve terminar com @escola.pr.gov.br', 'warning');
    return;
  }

  if(senha.length < 6){
    showToast('A senha deve ter pelo menos 6 caracteres.', 'warning');
    return;
  }

  try {
    const res = await fetch('/api/iniciar-cadastro', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({nome, email, senha, serie})
    });
    const data = await res.json();

    if(data.sucesso){
      dadosCadastroPendente = { nome, email, senha, serie };
      showToast('Código enviado! Verifique seu e-mail.', 'info', '📧 E-mail Enviado');
      abrirModalVerificacao(email);
    } else {
      showToast(data.erro, 'error');
    }
  } catch(error) {
    showToast('Erro ao iniciar cadastro. Tente novamente.', 'error');
  }
}

async function logarAluno(email,senha){
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, senha})
    });
    const data = await res.json();

    if(data.sucesso && data.pendente) {
      // Cadastro ainda pendente (não deve ocorrer no login normal)
      dadosLoginPendente = { email, tipo: 'aluno' };
      showToast('Código enviado! Verifique seu e-mail.', 'info', '🔐 Verificação de Login');
      abrirModalVerificacao(email, 'login');
    } else if(data.sucesso && data.token) {
      // Admin: entra direto com token
      usuarioAtual = data.usuario;
      sessionStorage.setItem('adminToken', data.token);
      tipoAdmin = data.tipoAdmin || 'admin';
      window._adminEmail = data.usuario?.email || 'admin@sistema.local';
      sessionStorage.setItem('tipoAdmin', tipoAdmin);
      sessionStorage.setItem('usuarioAtualStr', JSON.stringify(data.usuario));
      sessionStorage.setItem('adminEmail', window._adminEmail);
      mostrarPainelAdmin();
      showToast('Bem-vindo, ' + data.usuario.nome + '!', 'success', 'Login Realizado');
    } else if(data.sucesso && data.usuario) {
      // Aluno: login direto instantâneo
      mostrarPainelAluno(data.usuario);
      showToast('Bem-vindo(a), ' + data.usuario.nome + '!', 'success', 'Login Realizado');
    } else {
      showToast(data.erro || 'Erro ao fazer login.', 'error');
    }
  } catch(error) {
    showToast('Erro ao fazer login!', 'error');
  }
}

async function cadastrarDirecao(nome,email,senha){
  if(!nome||!email||!senha){ showToast('Por favor, preencha todos os campos!', 'warning'); return; }

  if(senha.length < 6){
    showToast('A senha deve ter pelo menos 6 caracteres.', 'warning');
    return;
  }

  try {
    const res = await fetch('/api/iniciar-cadastro-direcao', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({nome, email, senha})
    });
    const data = await res.json();

    if(data.sucesso){
      dadosCadastroPendente = { nome, email, senha, tipo: 'direcao' };
      showToast('Código enviado! Verifique seu e-mail.', 'info', '📧 E-mail Enviado');
      abrirModalVerificacao(email);
    } else {
      showToast(data.erro, 'error');
    }
  } catch(error) {
    showToast('Erro ao iniciar cadastro. Tente novamente.', 'error');
  }
}

async function logarDirecao(email,senha){
  try {
    const res = await fetch('/api/login-direcao', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, senha})
    });
    const data = await res.json();

    if(data.sucesso && data.pendente) {
      // Aguarda código de verificação por e-mail
      dadosLoginPendente = { email, tipo: 'direcao' };
      showToast('Código enviado! Verifique seu e-mail.', 'info', '🔐 Verificação de Login');
      abrirModalVerificacao(email, 'login');
    } else if(data.sucesso && data.token) {
      usuarioAtual = data.usuario;
      sessionStorage.setItem('adminToken', data.token);
      tipoAdmin = data.tipoAdmin || 'direcao';
      mostrarPainelAdmin();
      if(data.emailFalhou) {
        showToast('E-mail de verificação indisponível. Acesso liberado pela senha.', 'info', '⚠️ Aviso');
      } else {
        showToast('Bem-vindo(a), ' + data.usuario.nome + '!', 'success', 'Login Realizado');
      }
    } else {
      showToast(data.erro || 'Erro ao fazer login.', 'error');
    }
  } catch(error) {
    showToast('Erro ao fazer login!', 'error');
  }
}

async function mostrarPainelAluno(aluno){
  selecaoBox.classList.add("hidden");
  direcaoAcessoBox.classList.add("hidden");
  loginBox.classList.add("hidden");
  alunoPanel.classList.remove("hidden");
  sessionStorage.setItem('alunoLogado', JSON.stringify(aluno));

  document.getElementById("boasVindas").textContent=`Bem-vindo(a), ${aluno.nome}!`;
  const turmaElement = document.getElementById("turma");
  turmaElement.innerHTML = `📚 Série: ${aluno.serie}`;

  const lista=document.getElementById("listaEventos");
  lista.innerHTML="<p>Carregando...</p>";

  try {
    const res = await fetch(`/api/painel-aluno/${encodeURIComponent(aluno.serie)}/${encodeURIComponent(aluno.email)}`);
    const d = await res.json();

    lista.innerHTML = d.eventos.length
      ? d.eventos.map(e => `<li>${e.descricao}</li>`).join('')
      : '<li>Nenhum conteúdo cadastrado.</li>';

    mostrarCardapioDoDia(d.cardapio);
    carregarNotificacoes(d.avisos);
    carregarProvasAluno(aluno.serie, d.provas);
    carregarTarefasAluno(aluno, d.tarefas, d.tarefasConcluidas);
    carregarDuvidasAluno(aluno.serie, d.duvidas);
    carregarEnquetesAluno(aluno, d.enquetes);
    carregarRankingTarefas(aluno.serie, d.ranking);
    carregarBoletinsAluno(aluno, d.boletins);
    verificarMensagensNaoLidas(aluno.email, d.naoLidasCount);
    carregarMensagensAluno(aluno, d.mensagens);
  } catch(error) {
    lista.innerHTML="<p>Erro ao carregar painel</p>";
    mostrarCardapioDoDia();
    carregarNotificacoes();
    carregarProvasAluno(aluno.serie);
    carregarTarefasAluno(aluno);
    carregarDuvidasAluno(aluno.serie);
    carregarEnquetesAluno(aluno);
    carregarRankingTarefas(aluno.serie);
    carregarBoletinsAluno(aluno);
    verificarMensagensNaoLidas(aluno.email);
    carregarMensagensAluno(aluno);
  }

  document.getElementById('btnEnviarDuvida').onclick = () => enviarDuvidaAluno(aluno);
}


async function mostrarCardapioDoDia(cardapioPreCarregado){
  const cardapioDiv=document.getElementById("cardapioDoDia");
  const hoje=new Date();
  const diasSemana=["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
  const diaSemana=diasSemana[hoje.getDay()];
  const dataFormatada=hoje.toLocaleDateString("pt-BR");

  cardapioDiv.innerHTML="<p>Carregando cardápio...</p>";

  try {
    const menuHoje = cardapioPreCarregado !== undefined
      ? cardapioPreCarregado
      : await fetch(`/api/cardapio/${encodeURIComponent(diaSemana)}`).then(r => r.json());

    cardapioDiv.innerHTML=`
      <div class="card cardapio-card">
        <p><strong>Data:</strong> ${dataFormatada} (${diaSemana})</p>
        <table class="tabela-cardapio">
          <tr><td>🥗 Prato Principal:</td><td>${menuHoje.prato}</td></tr>
          <tr><td>🍛 Acompanhamento:</td><td>${menuHoje.acompanhamento}</td></tr>
          <tr><td>🍎 Sobremesa:</td><td>${menuHoje.sobremesa}</td></tr>
          <tr><td>🥤 Bebida:</td><td>${menuHoje.bebida}</td></tr>
        </table>
      </div>
    `;
  } catch(error) {
    cardapioDiv.innerHTML="<p>Sem cardápio definido para hoje.</p>";
  }
}

function mostrarPainelAdmin(){
  selecaoBox.classList.add("hidden");
  direcaoAcessoBox.classList.add("hidden");
  loginBox.classList.add("hidden");
  adminPanel.classList.remove("hidden");
  
  if(usuarioAtual && usuarioAtual.nome){
    const titulo = adminPanel.querySelector("h2");
    titulo.textContent = `Bem-vindo(a), ${usuarioAtual.nome}!`;
  }

  // Aba de Logs: visível apenas para admin, oculta para direção
  const btnLogs = document.getElementById('btnCategoriaLogs');
  if (btnLogs) {
    if (tipoAdmin === 'admin') {
      btnLogs.style.display = '';
    } else {
      btnLogs.style.display = 'none';
    }
  }
  
  configurarNavegacaoAdmin();
  atualizarListaAlunos();
  if (tipoAdmin === 'admin') verificarSolicitacoesPendentes();
}

let _navAdminConfigurada = false;
function configurarNavegacaoAdmin(){
  if (_navAdminConfigurada) return;
  _navAdminConfigurada = true;

  const menuContainer = document.querySelector('.admin-menu-categorias');
  if (!menuContainer) return;

  menuContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-categoria');
    if (!btn) return;

    const secaoNome = btn.getAttribute('data-secao');

    document.querySelectorAll('.btn-categoria').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.admin-secao').forEach(secao => {
      secao.classList.remove('active');
      secao.classList.add('hidden');
    });

    const secaoAtiva = document.getElementById(`secao-${secaoNome}`);
    if(secaoAtiva){
      secaoAtiva.classList.remove('hidden');
      secaoAtiva.classList.add('active');

      switch(secaoNome){
        case 'turmas':    atualizarListaAlunos(); break;
        case 'avisos':    mostrarAvisosAdmin(); break;
        case 'cardapio':  mostrarCardapioAdmin(); break;
        case 'logs':      carregarLogs(); break;
        case 'eventos':   atualizarEventosAdmin(); break;
        case 'provas':    carregarProvasAdmin(); break;
        case 'duvidas':   carregarDuvidasAdmin(); break;
        case 'tarefas':   carregarTarefasAdmin(); break;
        case 'enquetes':  carregarEnquetesAdmin(); break;
        case 'solicitacoes': carregarSolicitacoesDirecao(); break;
        case 'contas-direcao': carregarContasDirecao(); break;
      }
    }
  });
}

// ════════════════════════════════════════════════════════
// ─── GERENCIAR CONTAS DIREÇÃO ────────────────────────────
// ════════════════════════════════════════════════════════

async function carregarContasDirecao() {
  const container = document.getElementById('contasDirecaoContainer');
  container.innerHTML = '<p style="color:var(--text-tertiary); text-align:center; padding:20px;">Carregando...</p>';
  try {
    const res = await adminFetch('/api/admin/direcao-contas');
    const contas = await res.json();
    if (!contas.length) {
      container.innerHTML = '<p style="color:var(--text-tertiary); text-align:center; padding:20px;">Nenhuma conta cadastrada.</p>';
      return;
    }
    container.innerHTML = contas.map(c => `
      <div class="feature-card admin-item" style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <div>
          <div style="font-weight:600; color:var(--text-primary);">👤 ${sanitizeHTML(c.nome || '(sem nome)')}</div>
          <div style="font-size:0.85rem; color:var(--text-tertiary);">${sanitizeHTML(c['E-mail'])}</div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn-editar-conta" data-id="${c.id}" data-nome="${sanitizeHTML(c.nome || '')}" data-email="${sanitizeHTML(c['E-mail'])}"
            style="padding:6px 12px; border-radius:8px; border:1px solid var(--primary-color); background:transparent; color:var(--primary-color); font-size:0.85rem; cursor:pointer; font-weight:600;">
            ✏️ Editar
          </button>
          <button class="btn-excluir-conta" data-id="${c.id}" data-nome="${sanitizeHTML(c.nome || c['E-mail'])}"
            style="padding:6px 12px; border-radius:8px; border:none; background:#ef4444; color:#fff; font-size:0.85rem; cursor:pointer; font-weight:600;">
            🗑
          </button>
        </div>
      </div>`).join('');

    container.querySelectorAll('.btn-editar-conta').forEach(btn => {
      btn.addEventListener('click', () => abrirEditarConta(btn.dataset.id, btn.dataset.nome, btn.dataset.email));
    });
    container.querySelectorAll('.btn-excluir-conta').forEach(btn => {
      btn.addEventListener('click', () => {
        confirmarAcao(`Excluir a conta de ${btn.dataset.nome}?`, async () => {
          const r = await adminFetch(`/api/admin/direcao-contas/${btn.dataset.id}`, { method: 'DELETE' });
          const d = await r.json();
          if (d.sucesso) { showToast('Conta excluída.', 'success'); carregarContasDirecao(); }
          else showToast(d.erro || 'Erro ao excluir.', 'error');
        }, { icone: '🗑', btnLabel: 'Excluir' });
      });
    });
  } catch {
    container.innerHTML = '<p style="color:red; text-align:center; padding:20px;">Erro ao carregar contas.</p>';
  }
}

function abrirEditarConta(id, nome, email) {
  document.getElementById('editContaId').value = id;
  document.getElementById('editContaNome').value = nome;
  document.getElementById('editContaEmail').value = email;
  document.getElementById('editContaSenha').value = '';
  document.getElementById('msgEditConta').textContent = '';
  const modal = document.getElementById('modalEditarContaDirecao');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

document.getElementById('btnCancelarEditConta').addEventListener('click', () => {
  const modal = document.getElementById('modalEditarContaDirecao');
  modal.classList.add('hidden');
  modal.style.display = 'none';
});

document.getElementById('btnSalvarEditConta').addEventListener('click', async () => {
  const id = document.getElementById('editContaId').value;
  const nome = document.getElementById('editContaNome').value.trim();
  const email = document.getElementById('editContaEmail').value.trim();
  const senha = document.getElementById('editContaSenha').value;
  const msg = document.getElementById('msgEditConta');
  const btn = document.getElementById('btnSalvarEditConta');

  if (!email) { msg.textContent = 'E-mail é obrigatório.'; msg.style.color = 'red'; return; }

  btn.disabled = true;
  btn.textContent = 'Salvando...';
  msg.textContent = '';

  try {
    const r = await adminFetch(`/api/admin/direcao-contas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha: senha || undefined })
    });
    const d = await r.json();
    if (d.sucesso) {
      showToast('Conta atualizada com sucesso!', 'success');
      document.getElementById('modalEditarContaDirecao').classList.add('hidden');
      document.getElementById('modalEditarContaDirecao').style.display = 'none';
      carregarContasDirecao();
    } else {
      msg.textContent = d.erro || 'Erro ao salvar.';
      msg.style.color = 'red';
    }
  } catch {
    msg.textContent = 'Erro de conexão.';
    msg.style.color = 'red';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar';
  }
});

// ─── SOLICITAÇÕES DE ACESSO DIREÇÃO ───────────────────────────────────────────

let _solicitacaoAtual = null;

async function verificarSolicitacoesPendentes() {
  try {
    const res = await adminFetch('/api/solicitar-direcao');
    const data = await res.json();
    const total = (data || []).length;
    const badge = document.getElementById('badgeSolicitacoes');
    if (badge) {
      if (total > 0) {
        badge.textContent = total;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  } catch {}
}

async function carregarSolicitacoesDirecao() {
  const container = document.getElementById('solicitacoesContainer');
  container.innerHTML = '<p>Carregando...</p>';
  try {
    const res = await adminFetch('/api/solicitar-direcao');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const lista = await res.json();
    if (!Array.isArray(lista) || lista.length === 0) {
      container.innerHTML = '<p style="color:var(--text-tertiary); text-align:center; padding:20px;">Nenhuma solicitação pendente.</p>';
      return;
    }
    container.innerHTML = '';
    lista.forEach(s => {
      const card = document.createElement('div');
      card.className = 'solicitacao-card';
      card.id = 'sol-card-' + s.id;

      const info = document.createElement('div');
      info.className = 'solicitacao-info';
      info.innerHTML = `<strong>${sanitizeHTML(s.nome)}</strong>
        <p>✉️ ${sanitizeHTML(s.email)}</p>
        ${s.mensagem ? `<p class="sol-msg">"${sanitizeHTML(s.mensagem)}"</p>` : ''}
        <p style="font-size:0.75rem;color:var(--text-tertiary);">📅 ${new Date(s.created_at).toLocaleString('pt-BR')}</p>`;

      const acoes = document.createElement('div');
      acoes.className = 'solicitacao-acoes';

      const btnCriar = document.createElement('button');
      btnCriar.className = 'btn-criar-conta';
      btnCriar.textContent = '✅ Criar Conta';
      btnCriar.addEventListener('click', () => abrirModalCriarContaDirecao(s.id, s.nome, s.email, s.tem_senha));

      const btnMsg = document.createElement('button');
      btnMsg.className = 'btn-sol-msg';
      btnMsg.textContent = '💬 Mensagem';
      btnMsg.addEventListener('click', () => abrirModalMsgSolicitacao(s.id, s.nome, s.email));

      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn-sol-edit';
      btnEdit.textContent = '✏️ Editar';
      btnEdit.addEventListener('click', () => abrirModalEditarSolicitacao(s.id, s.nome, s.email));

      const btnDel = document.createElement('button');
      btnDel.className = 'btn-sol-del';
      btnDel.textContent = '🗑️ Rejeitar';
      btnDel.addEventListener('click', () => rejeitarSolicitacao(s.id, s.nome, s.email));

      acoes.appendChild(btnCriar);
      acoes.appendChild(btnMsg);
      acoes.appendChild(btnEdit);
      acoes.appendChild(btnDel);

      card.appendChild(info);
      card.appendChild(acoes);
      container.appendChild(card);
    });
  } catch(err) {
    container.innerHTML = `<p style="color:var(--text-tertiary); text-align:center;">Erro ao carregar solicitações: ${err.message}</p>`;
  }
}

function abrirModalCriarContaDirecao(id, nome, email, temSenha) {
  _solicitacaoAtual = { id, nome, email };
  const senhaInput = document.getElementById('novaSenhaDirecao');
  senhaInput.value = '';
  senhaInput.placeholder = temSenha
    ? 'Deixe em branco para usar a senha definida pelo solicitante'
    : 'Criar senha para esta conta (obrigatório)';
  senhaInput.required = !temSenha;
  document.getElementById('textoCriarContaDirecao').innerHTML =
    `Criar conta para <strong>${sanitizeHTML(nome)}</strong> (${sanitizeHTML(email)}).` +
    (temSenha ? '<br><small style="color:var(--text-tertiary)">✅ Senha já definida pelo solicitante.</small>' : '');
  const m = document.getElementById('modalCriarContaDirecao');
  m.classList.remove('hidden');
  m.style.display = '';
}

// ── Editar solicitação ──────────────────────────────────────────────────────
function abrirModalEditarSolicitacao(id, nome, email) {
  _solicitacaoAtual = { id, nome, email };
  document.getElementById('editSolNome').value = nome;
  document.getElementById('editSolEmail').value = email;
  const m = document.getElementById('modalEditarSolicitacao');
  m.classList.remove('hidden');
  m.style.display = '';
}

document.getElementById('btnFecharEditarSol').addEventListener('click', () => {
  const m = document.getElementById('modalEditarSolicitacao');
  m.classList.add('hidden');
  m.style.display = 'none';
  _solicitacaoAtual = null;
});

document.getElementById('formEditarSolicitacao').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!_solicitacaoAtual) return;
  const nome = document.getElementById('editSolNome').value.trim();
  const email = document.getElementById('editSolEmail').value.trim();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  try {
    const res = await adminFetch(`/api/solicitar-direcao/${_solicitacaoAtual.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email })
    });
    const data = await res.json();
    if (data.sucesso) {
      const m = document.getElementById('modalEditarSolicitacao');
      m.classList.add('hidden');
      m.style.display = 'none';
      _solicitacaoAtual = null;
      showToast('Solicitação atualizada!', 'success');
      carregarSolicitacoesDirecao();
    } else {
      showToast(data.erro || 'Erro ao editar.', 'error');
    }
  } catch { showToast('Erro ao editar.', 'error'); }
  btn.disabled = false;
  btn.textContent = '💾 Salvar Alterações';
});

// ── Rejeitar (excluir) solicitação ─────────────────────────────────────────
async function rejeitarSolicitacao(id, nome, email) {
  confirmarAcao(`Rejeitar e excluir a solicitação de "${nome}" (${email})?`, async () => {
    try {
      const res = await adminFetch(`/api/solicitar-direcao/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.sucesso) {
        document.getElementById(`sol-card-${id}`)?.remove();
        showToast('Solicitação rejeitada e excluída.', 'success');
        verificarSolicitacoesPendentes();
        const container = document.getElementById('solicitacoesContainer');
        if (container && !container.querySelector('.solicitacao-card')) {
          container.innerHTML = '<p style="color:var(--text-tertiary); text-align:center; padding:20px;">Nenhuma solicitação pendente.</p>';
        }
      } else {
        showToast(data.erro || 'Erro ao excluir.', 'error');
      }
    } catch { showToast('Erro ao excluir.', 'error'); }
  }, { icone: '🗑️', sub: 'Esta ação não pode ser desfeita.', btnLabel: 'Rejeitar' });
}

// ── Enviar mensagem para solicitante ───────────────────────────────────────
function abrirModalMsgSolicitacao(id, nome, email) {
  _solicitacaoAtual = { id, nome, email };
  document.getElementById('textoMsgSolicitacao').textContent = `Enviando mensagem para ${nome} (${email})`;
  document.getElementById('inputMsgSolicitacao').value = '';
  const m = document.getElementById('modalMsgSolicitacao');
  m.classList.remove('hidden');
  m.style.display = '';
}

document.getElementById('btnFecharMsgSol').addEventListener('click', () => {
  const m = document.getElementById('modalMsgSolicitacao');
  m.classList.add('hidden');
  m.style.display = 'none';
  _solicitacaoAtual = null;
});

document.getElementById('formMsgSolicitacao').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!_solicitacaoAtual) return;
  const mensagem = document.getElementById('inputMsgSolicitacao').value.trim();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Enviando...';
  try {
    const res = await adminFetch(`/api/solicitar-direcao/${_solicitacaoAtual.id}/mensagem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensagem })
    });
    const data = await res.json();
    if (data.sucesso) {
      const m = document.getElementById('modalMsgSolicitacao');
      m.classList.add('hidden');
      m.style.display = 'none';
      _solicitacaoAtual = null;
      showToast('Mensagem enviada por e-mail!', 'success');
    } else {
      showToast(data.erro || 'Erro ao enviar mensagem.', 'error');
    }
  } catch { showToast('Erro ao enviar mensagem.', 'error'); }
  btn.disabled = false;
  btn.textContent = '📨 Enviar por E-mail';
});

document.getElementById('btnFecharCriarConta').addEventListener('click', () => {
  const m = document.getElementById('modalCriarContaDirecao');
  m.classList.add('hidden');
  m.style.display = 'none';
  _solicitacaoAtual = null;
});

document.getElementById('formCriarContaDirecao').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!_solicitacaoAtual) return;
  const senhaInput = document.getElementById('novaSenhaDirecao');
  const senha = senhaInput.value.trim();
  if (senhaInput.required && !senha) {
    showToast('Informe uma senha para criar a conta.', 'error');
    return;
  }
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Criando...';
  try {
    const body = { ..._solicitacaoAtual };
    if (senha) body.senha = senha;
    const res = await adminFetch('/api/direcao/criar-conta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.sucesso) {
      const m = document.getElementById('modalCriarContaDirecao');
      m.classList.add('hidden');
      m.style.display = 'none';
      document.getElementById(`sol-card-${_solicitacaoAtual.id}`)?.remove();
      _solicitacaoAtual = null;
      showToast('Conta criada e login enviado por e-mail!', 'success', 'Conta Criada');
      verificarSolicitacoesPendentes();
      const container = document.getElementById('solicitacoesContainer');
      if (container && !container.querySelector('.solicitacao-card')) {
        container.innerHTML = '<p style="color:var(--text-tertiary); text-align:center; padding:20px;">Nenhuma solicitação pendente.</p>';
      }
    } else {
      showToast(data.erro || 'Erro ao criar conta.', 'error');
    }
  } catch {
    showToast('Erro ao criar conta. Tente novamente.', 'error');
  }
  btn.disabled = false;
  btn.textContent = '✅ Criar Conta e Enviar Login';
});

async function carregarLogs(){
  const container = document.getElementById('containerLogs');
  container.innerHTML = '<p>Carregando histórico de logins...</p>';
  
  try {
    const res = await fetch('/api/logs');
    const logs = await res.json();
    
    if(logs.length === 0){
      container.innerHTML = '<p style="text-align: center; color: var(--text-tertiary);">Nenhum log de login registrado.</p>';
      return;
    }
    
    container.innerHTML = `
      <table class="tabela-alunos">
        <thead>
          <tr>
            <th>Aluno</th>
            <th>E-mail</th>
            <th>Turma</th>
            <th>Data/Hora</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(log => {
            const dataHora = log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '—';
            return `
              <tr>
                <td><strong>${sanitizeHTML(log.nome || '')}</strong></td>
                <td>${sanitizeHTML(log.email || '')}</td>
                <td>${sanitizeHTML(log.turma || '')}</td>
                <td>${dataHora}</td>
                <td><code>${sanitizeHTML(log.ip_address || 'N/A')}</code></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  } catch(error){
    console.error('Erro ao carregar logs:', error);
    container.innerHTML = '<p>Erro ao carregar histórico de logins.</p>';
  }
}

async function atualizarListaAlunos(){
  const container = document.getElementById("containerTabelaAlunos");
  container.innerHTML="<p>Carregando alunos...</p>";

  try {
    const res = await fetch('/api/alunos');
    const alunos = await res.json();

    if(alunos.length === 0) {
      container.innerHTML="<p>Nenhum aluno cadastrado ainda.</p>";
      return;
    }

    container.innerHTML = '<div class="alunos-cards" id="alunosCards"></div>';
    const cards = document.getElementById("alunosCards");

    alunos.forEach(a => {
      const card = document.createElement("div");
      card.className = "aluno-card";
      card.innerHTML = `
        <div class="aluno-card-info">
          <span class="aluno-card-nome">${sanitizeHTML(a.nome)}</span>
          <span class="aluno-card-email">${sanitizeHTML(a.email)}</span>
          <span class="aluno-card-turma">Turma: <strong>${sanitizeHTML(a.serie)}</strong></span>
        </div>
        <div class="aluno-card-acoes">
          <button class="btn-msg-card">💬</button>
          <button class="btn-editar-card">✏️</button>
          <button class="btn-boletim-card">📋</button>
          <button class="btn-excluir-card">🗑️</button>
        </div>
      `;
      cards.appendChild(card);

      card.querySelector('.btn-msg-card').addEventListener('click', () => abrirModalMensagem({ email: a.email, nome: a.nome }));
      card.querySelector('.btn-editar-card').addEventListener('click', () => abrirModalEditarAluno(a));
      card.querySelector('.btn-boletim-card').addEventListener('click', () => abrirModalBoletim({ email: a.email, nome: a.nome, serie: a.serie }));
      card.querySelector('.btn-excluir-card').addEventListener('click', () => excluirAluno(a.id, a.nome));
    });
  } catch(error) {
    container.innerHTML="<p>Erro ao carregar alunos</p>";
  }
}

function excluirAluno(id, nome) {
  confirmarAcao(`Excluir o aluno "${nome}"?`, async () => {
    try {
      const res = await adminFetch(`/api/alunos/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.sucesso) {
        showToast(data.mensagem || 'Aluno excluído.', 'success');
        atualizarListaAlunos();
      } else {
        showToast(data.erro || 'Erro ao excluir aluno.', 'error');
      }
    } catch {
      showToast('Erro ao excluir aluno. Tente novamente.', 'error');
    }
  });
}

// ══════════════════════════════════════════════════════════════
// ─── EDITAR ALUNO (MODAL) ─────────────────────────────────────
// ══════════════════════════════════════════════════════════════
let alunoEditandoId = null;

function abrirModalEditarAluno(aluno) {
  alunoEditandoId = aluno.id;
  document.getElementById('editAlunoNome').value = aluno.nome || '';
  document.getElementById('editAlunoEmail').value = aluno.email || '';
  document.getElementById('editAlunoSerie').value = '';
  document.getElementById('editAlunoSenha').value = '';
  document.getElementById('editAlunoMsg').textContent = '';
  document.getElementById('subtituloEditarAluno').textContent = `Editando: ${aluno.nome} — Turma ${aluno.serie || ''}`;
  const modal = document.getElementById('modalEditarAluno');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

document.getElementById('btnFecharEditarAluno').addEventListener('click', () => {
  const modal = document.getElementById('modalEditarAluno');
  modal.classList.add('hidden');
  modal.style.display = 'none';
  alunoEditandoId = null;
});

document.getElementById('formEditarAluno').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!alunoEditandoId) return;
  const nome = document.getElementById('editAlunoNome').value.trim();
  const email = document.getElementById('editAlunoEmail').value.trim();
  const serie = document.getElementById('editAlunoSerie').value;
  const novaSenha = document.getElementById('editAlunoSenha').value;
  const msg = document.getElementById('editAlunoMsg');

  if (novaSenha && novaSenha.length < 6) {
    msg.textContent = 'A nova senha deve ter pelo menos 6 caracteres.';
    msg.style.color = 'red';
    return;
  }

  const body = {};
  if (nome) body.nome = nome;
  if (email) body.email = email;
  if (serie) body.serie = serie;
  if (novaSenha) body.novaSenha = novaSenha;

  try {
    const res = await adminFetch(`/api/alunos/${alunoEditandoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.sucesso) {
      showToast(data.mensagem || 'Aluno atualizado!', 'success');
      document.getElementById('modalEditarAluno').classList.add('hidden');
      document.getElementById('modalEditarAluno').style.display = 'none';
      alunoEditandoId = null;
      atualizarListaAlunos();
    } else {
      msg.textContent = data.erro || 'Erro ao atualizar.';
      msg.style.color = 'red';
    }
  } catch {
    msg.textContent = 'Erro de conexão. Tente novamente.';
    msg.style.color = 'red';
  }
});

// ══════════════════════════════════════════════════════════════
// ─── MENSAGENS DIRETAS (ADMIN) ────────────────────────────────
// ══════════════════════════════════════════════════════════════
let mensagemAlunoAtual = null;

function formatarDataMsg(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const diaSem = dias[d.getDay()];
  const data = d.toLocaleDateString('pt-BR');
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${diaSem}, ${data} às ${hora}`;
}

function renderBolhaMensagem(msg, emailLogado) {
  const minha = msg.de_email === emailLogado;
  const lado = minha ? 'msg-direita' : 'msg-esquerda';
  const quem = minha ? 'Você' : sanitizeHTML(msg.de_nome || msg.de_email);
  return `
    <div class="msg-bolha ${lado}">
      <span class="msg-remetente">${quem}</span>
      <p class="msg-texto">${sanitizeHTML(msg.mensagem)}</p>
      <span class="msg-data">${formatarDataMsg(msg.created_at)}</span>
    </div>`;
}

async function abrirModalMensagem(aluno) {
  mensagemAlunoAtual = aluno;
  document.getElementById('subtituloMensagem').textContent = `Conversa com: ${aluno.nome}`;
  document.getElementById('textoMensagemAdmin').value = '';
  document.getElementById('mensagemModalMsg').textContent = '';
  const modal = document.getElementById('modalMensagem');
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
  await carregarHistoricoMensagens(aluno.email);
}

async function carregarHistoricoMensagens(alunoEmail) {
  const hist = document.getElementById('histMensagens');
  hist.innerHTML = '<p style="text-align:center; color:var(--text-tertiary); font-size:0.85rem;">Carregando...</p>';
  try {
    const res = await adminFetch(`/api/mensagens/admin/${encodeURIComponent(alunoEmail)}`);
    const msgs = await res.json();
    const emailAdmin = document.getElementById('adminPanel') ? (window._adminEmail || '') : '';
    if (!msgs.length) {
      hist.innerHTML = '<p style="text-align:center; color:var(--text-tertiary); font-size:0.85rem;">Nenhuma mensagem ainda. Inicie a conversa!</p>';
      return;
    }
    hist.innerHTML = msgs.map(m => renderBolhaMensagem(m, window._adminEmail || '')).join('');
    hist.scrollTop = hist.scrollHeight;
  } catch {
    hist.innerHTML = '<p style="color:red; text-align:center;">Erro ao carregar mensagens.</p>';
  }
}

document.getElementById('btnEnviarMensagemAdmin').addEventListener('click', async () => {
  if (!mensagemAlunoAtual) return;
  const texto = document.getElementById('textoMensagemAdmin').value.trim();
  const msgEl = document.getElementById('mensagemModalMsg');
  if (!texto) { msgEl.textContent = 'Digite uma mensagem.'; msgEl.style.color = 'red'; return; }
  try {
    const res = await adminFetch('/api/mensagens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ para_email: mensagemAlunoAtual.email, para_nome: mensagemAlunoAtual.nome, mensagem: texto })
    });
    const data = await res.json();
    if (data.sucesso) {
      document.getElementById('textoMensagemAdmin').value = '';
      msgEl.textContent = '';
      await carregarHistoricoMensagens(mensagemAlunoAtual.email);
    } else {
      msgEl.textContent = data.erro || 'Erro ao enviar.';
      msgEl.style.color = 'red';
    }
  } catch {
    msgEl.textContent = 'Erro de conexão.';
    msgEl.style.color = 'red';
  }
});

document.getElementById('btnFecharMensagem').addEventListener('click', () => {
  document.getElementById('modalMensagem').classList.add('hidden');
  document.getElementById('modalMensagem').style.display = 'none';
  mensagemAlunoAtual = null;
});

// ══════════════════════════════════════════════════════════════
// ─── RANKING ADMIN (DESTAQUES) ────────────────────────────────
// ══════════════════════════════════════════════════════════════
document.getElementById('btnCarregarRankingAdmin').addEventListener('click', async () => {
  const turma = document.getElementById('rankingTurmaAdmin').value;
  const container = document.getElementById('rankingAdminContainer');
  if (!turma) { showToast('Selecione uma turma.', 'error'); return; }
  container.innerHTML = '<p style="color:var(--text-tertiary);">Carregando ranking...</p>';
  try {
    const res = await fetch(`/api/ranking/${encodeURIComponent(turma)}`);
    const ranking = await res.json();
    if (!ranking.length) {
      container.innerHTML = '<p style="color:var(--text-tertiary); text-align:center;">Nenhuma tarefa concluída nesta turma ainda.</p>';
      return;
    }
    const medalhas = ['🥇', '🥈', '🥉'];
    container.innerHTML = `
      <p style="font-size:0.85rem; color:var(--text-tertiary); margin-bottom:8px;">Turma ${turma} — ${ranking.length} aluno(s) com tarefas concluídas</p>
      <ul class="ranking-lista">${ranking.map((item, i) => `
        <li class="ranking-item ${i < 3 ? 'pos-' + (i + 1) : ''}">
          <span class="ranking-posicao">${medalhas[i] || (i + 1) + 'º'}</span>
          <span class="ranking-nome">${sanitizeHTML(item.nome)}</span>
          <span class="ranking-total">${item.total} ✅</span>
        </li>`).join('')}
      </ul>`;
  } catch {
    container.innerHTML = '<p style="color:red;">Erro ao carregar ranking.</p>';
  }
});

// ══════════════════════════════════════════════════════════════
// ─── MENSAGENS DO ALUNO (PAINEL ALUNO) ───────────────────────
// ══════════════════════════════════════════════════════════════
async function carregarMensagensAluno(aluno, msgsPreCarregadas) {
  const container = document.getElementById('mensagensAlunoContainer');
  const formResposta = document.getElementById('formRespostaAluno');
  if (!container) return;
  container.innerHTML = '<p style="color:var(--text-tertiary); font-size:0.85rem; text-align:center;">Carregando...</p>';

  try {
    let msgs;
    if (msgsPreCarregadas !== undefined) {
      msgs = msgsPreCarregadas;
      const badge = document.getElementById('badgeMsgAluno');
      if (badge) { badge.textContent = ''; badge.classList.add('hidden'); }
    } else {
      await fetch(`/api/mensagens/marcar-lidas/${encodeURIComponent(aluno.email)}`, { method: 'PATCH' });
      const badge = document.getElementById('badgeMsgAluno');
      if (badge) { badge.textContent = ''; badge.classList.add('hidden'); }
      msgs = await fetch(`/api/mensagens/aluno/${encodeURIComponent(aluno.email)}`).then(r => r.json());
    }

    if (!msgs.length) {
      container.innerHTML = '<p style="color:var(--text-tertiary); font-size:0.85rem; text-align:center;">Nenhuma mensagem ainda.</p>';
      if (formResposta) formResposta.style.display = 'none';
      return;
    }

    container.innerHTML = msgs.map(m => renderBolhaMensagem(m, aluno.email)).join('');
    container.scrollTop = container.scrollHeight;
    if (formResposta) formResposta.style.display = 'block';

    const btnEnviar = document.getElementById('btnEnviarRespostaAluno');
    if (btnEnviar) {
      btnEnviar.onclick = async () => {
        const texto = document.getElementById('textoRespostaAluno').value.trim();
        if (!texto) return;
        const ultimaMsg = msgs[msgs.length - 1];
        const paraEmail = ultimaMsg.de_tipo === 'aluno' ? ultimaMsg.para_email : ultimaMsg.de_email;
        const paraNome = ultimaMsg.de_tipo === 'aluno' ? ultimaMsg.para_nome : ultimaMsg.de_nome;
        try {
          const r = await fetch('/api/mensagens/aluno', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ de_email: aluno.email, de_nome: aluno.nome, para_email: paraEmail, para_nome: paraNome, mensagem: texto })
          });
          const d = await r.json();
          if (d.sucesso) {
            document.getElementById('textoRespostaAluno').value = '';
            showToast('Resposta enviada!', 'success');
            await carregarMensagensAluno(aluno);
          } else {
            showToast(d.erro || 'Erro ao enviar.', 'error');
          }
        } catch { showToast('Erro de conexão.', 'error'); }
      };
    }
  } catch {
    container.innerHTML = '<p style="color:red; font-size:0.85rem; text-align:center;">Erro ao carregar mensagens.</p>';
  }
}

async function verificarMensagensNaoLidas(email, contPreCarregada) {
  try {
    let total;
    if (contPreCarregada !== undefined) {
      total = contPreCarregada;
    } else {
      const data = await fetch(`/api/mensagens/nao-lidas/${encodeURIComponent(email)}`).then(r => r.json());
      total = data.total;
    }
    const badge = document.getElementById('badgeMsgAluno');
    if (badge && total > 0) {
      badge.textContent = total;
      badge.classList.remove('hidden');
    }
  } catch {}
}

async function atualizarEventosAdmin(){
  const turmasContainer=document.querySelector(".turmas-container");
  turmasContainer.innerHTML="<p>Carregando eventos...</p>";

  const turmas = [
    { codigo: "1A", nome: "1º Ano - Turma A" },
    { codigo: "1B", nome: "1º Ano - Turma B" },
    { codigo: "1C", nome: "1º Ano - Turma C" },
    { codigo: "1D", nome: "1º Ano - Turma D" },
    { codigo: "2A", nome: "2º Ano - Turma A" },
    { codigo: "2B", nome: "2º Ano - Turma B" },
    { codigo: "2C", nome: "2º Ano - Turma C" },
    { codigo: "3A", nome: "3º Ano - Turma A" },
    { codigo: "3B", nome: "3º Ano - Turma B" },
    { codigo: "3C", nome: "3º Ano - Turma C" }
  ];
  turmasContainer.innerHTML="";

  for(const turma of turmas){
    try {
      const res = await fetch(`/api/eventos/${encodeURIComponent(turma.codigo)}`);
      const eventos = await res.json();

      const box=document.createElement("div");
      box.classList.add("turma-box");
      box.innerHTML=`
        <h4>${turma.nome}</h4>
        <ul id="eventos-${turma.codigo}" class="eventos-admin-lista"></ul>
        <input type="text" id="novo-${turma.codigo}" placeholder="Novo evento para ${turma.nome}">
        <button id="btn-add-${turma.codigo}" class="btn-adicionar">Adicionar</button>
      `;
      turmasContainer.appendChild(box);

      const lista=box.querySelector("ul");
      eventos.forEach(evento=>{
        const li=document.createElement("li");
        li.innerHTML=`
          <span>${evento.descricao}</span>
          <div>
            <button class="editar" data-id="${evento.id}" data-descricao="${evento.descricao}" data-turma="${turma.codigo}">✏️</button>
            <button class="excluir" data-id="${evento.id}">🗑️</button>
          </div>
        `;
        lista.appendChild(li);
      });

      document.getElementById(`btn-add-${turma.codigo}`).addEventListener("click", async ()=>{
        const input=document.getElementById(`novo-${turma.codigo}`);
        const texto=input.value.trim();
        if(!texto) return;

        try {
          const res = await adminFetch('/api/eventos', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({serie: turma.codigo, descricao: texto})
          });

          if(res.ok){
            input.value="";
            atualizarEventosAdmin();
          }
        } catch(error) {
          showToast("Erro ao adicionar evento!", "error");
        }
      });
    } catch(error) {
      console.error("Erro ao carregar eventos:", error);
    }
  }

  document.querySelectorAll(".editar").forEach(btn=>{
    btn.addEventListener("click", async e=>{
      const id = e.currentTarget.dataset.id;
      const descricaoAtual = e.currentTarget.dataset.descricao;
      const novo = await showModalInput("✏️ Editar Evento", "Nova descrição:", descricaoAtual);
      if(!novo) return;

      try {
        const res = await adminFetch(`/api/eventos/${id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({descricao: novo.trim()})
        });

        if(res.ok){
          atualizarEventosAdmin();
        }
      } catch(error) {
        showToast("Erro ao editar evento!", "error");
      }
    });
  });

  document.querySelectorAll(".excluir").forEach(btn=>{
    btn.addEventListener("click", async e=>{
      const id = e.currentTarget.dataset.id;
      
      const confirmado = await confirmarAcao(
        '🗑️ Excluir Evento',
        'Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.'
      );
      
      if(!confirmado) return;

      try {
        const res = await adminFetch(`/api/eventos/${id}`, {method: 'DELETE'});
        if(res.ok){
          showToast("Evento excluído com sucesso!", "success");
          atualizarEventosAdmin();
        }
      } catch(error) {
        showToast("Erro ao excluir evento!", "error");
      }
    });
  });
}

let modoEdicaoProfessores = false;

async function mostrarAgendaProfessores(){
  const div=document.getElementById("agendaProfessores");
  div.innerHTML="<p>Carregando professores...</p>";

  try {
    const res = await fetch('/api/professores');
    const professores = await res.json();

    div.innerHTML="";
    
    const btnControleEdicao = document.createElement("button");
    btnControleEdicao.id = "btnControleEdicaoProfessores";
    btnControleEdicao.className = "btn-editar-prof";
    btnControleEdicao.textContent = "✏️ Editar";
    btnControleEdicao.style.width = "auto";
    btnControleEdicao.style.marginBottom = "15px";
    div.appendChild(btnControleEdicao);

    const tabela=document.createElement("table");
    tabela.classList.add("tabela-professores");
    tabela.id = "tabelaProfessores";

    const thead = document.createElement("thead");
    thead.innerHTML=`
      <tr>
        <th>Professor</th>
        <th>Matéria</th>
        <th>Status</th>
        <th>Data</th>
      </tr>
    `;
    tabela.appendChild(thead);

    const tbody = document.createElement("tbody");

    professores.forEach(p=>{
      const tr=document.createElement("tr");
      tr.dataset.id = p.id;
      
      const statusNormalizado = p.status.toLowerCase().trim();
      if(statusNormalizado === 'ausente' || statusNormalizado === 'falta'){
        tr.classList.add('ausente');
      } else {
        tr.classList.add('presente');
      }
      
      tr.innerHTML=`
        <td class="editable-nome" data-field="nome">${p.nome}</td>
        <td class="editable-materia" data-field="materia">${p.materia}</td>
        <td class="editable-status" data-field="status">${p.status}</td>
        <td class="editable-data" data-field="data">${p.data}</td>
      `;
      tbody.appendChild(tr);
    });

    tabela.appendChild(tbody);
    div.appendChild(tabela);

    btnControleEdicao.addEventListener("click", toggleModoEdicaoProfessores);
  } catch(error) {
    div.innerHTML="<p>Erro ao carregar professores</p>";
  }
}

function toggleModoEdicaoProfessores(){
  const btn = document.getElementById("btnControleEdicaoProfessores");
  const tabela = document.getElementById("tabelaProfessores");
  const celulasEditaveis = tabela.querySelectorAll("td");

  if(!modoEdicaoProfessores){
    modoEdicaoProfessores = true;
    btn.textContent = "💾 Salvar";
    btn.style.background = "linear-gradient(135deg, #48bb78 0%, #38a169 100%)";
    
    celulasEditaveis.forEach(td => {
      td.contentEditable = "true";
      td.style.cursor = "text";
      td.style.border = "2px dashed var(--primary-color)";
      td.style.padding = "12px";
      
      if(td.classList.contains("editable-status")){
        td.addEventListener("blur", atualizarCorLinhaStatus);
      }
    });
  } else {
    salvarAlteracoesProfessores();
  }
}

function atualizarCorLinhaStatus(e){
  const td = e.target;
  const tr = td.closest("tr");
  const status = td.textContent.trim().toLowerCase();
  
  tr.classList.remove("presente", "ausente");
  
  if(status === "ausente" || status === "falta"){
    tr.classList.add("ausente");
  } else {
    tr.classList.add("presente");
  }
}

async function salvarAlteracoesProfessores(){
  const btn = document.getElementById("btnControleEdicaoProfessores");
  const tabela = document.getElementById("tabelaProfessores");
  const linhas = tabela.querySelectorAll("tr[data-id]");

  btn.disabled = true;
  btn.textContent = "⏳ Salvando...";

  try {
    for(const tr of linhas){
      const id = tr.dataset.id;
      const nome = tr.querySelector(".editable-nome").textContent.trim();
      const materia = tr.querySelector(".editable-materia").textContent.trim();
      const status = tr.querySelector(".editable-status").textContent.trim();
      const data = tr.querySelector(".editable-data").textContent.trim();

      const response = await adminFetch(`/api/professores/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({nome, materia, status, data})
      });

      if(!response.ok){
        throw new Error(`Erro ao salvar professor ${nome}`);
      }
    }

    modoEdicaoProfessores = false;
    btn.textContent = "✅ Salvo!";
    btn.style.background = "linear-gradient(135deg, #48bb78 0%, #38a169 100%)";
    
    setTimeout(() => {
      mostrarAgendaProfessores();
    }, 1000);
  } catch(error) {
    console.error("Erro ao salvar:", error);
    showToast("Erro ao salvar alterações dos professores: " + error.message, "error");
    btn.disabled = false;
    btn.textContent = "💾 Salvar";
  }
}


async function mostrarCardapioAdmin(){
  const cardapioDiv=document.getElementById("cardapioAdmin");
  const hoje=new Date();
  const diasSemana=["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
  const diaSemana=diasSemana[hoje.getDay()];
  const dataFormatada=hoje.toLocaleDateString("pt-BR");

  cardapioDiv.innerHTML="<p>Carregando cardápio...</p>";

  try {
    const res = await fetch(`/api/cardapio/${encodeURIComponent(diaSemana)}`);
    const menuHoje = await res.json();

    cardapioDiv.innerHTML=`
      <div class="card cardapio-card">
        <p><strong>Data:</strong> ${dataFormatada} (${diaSemana})</p>
        <table class="tabela-cardapio">
          <tr><td>🥗 Prato Principal:</td><td contenteditable="true">${menuHoje.prato}</td></tr>
          <tr><td>🍛 Acompanhamento:</td><td contenteditable="true">${menuHoje.acompanhamento}</td></tr>
          <tr><td>🍎 Sobremesa:</td><td contenteditable="true">${menuHoje.sobremesa}</td></tr>
          <tr><td>🥤 Bebida:</td><td contenteditable="true">${menuHoje.bebida}</td></tr>
        </table>
        <button id="btnSalvarCardapio" class="btn-adicionar">Salvar Cardápio</button>
      </div>
    `;

    document.getElementById("btnSalvarCardapio").addEventListener("click", async ()=>{
      const tds = cardapioDiv.querySelectorAll("td");
      const dadosCardapio = {
        prato: tds[1].textContent.trim(),
        acompanhamento: tds[3].textContent.trim(),
        sobremesa: tds[5].textContent.trim(),
        bebida: tds[7].textContent.trim()
      };

      try {
        const res = await adminFetch(`/api/cardapio/${encodeURIComponent(diaSemana)}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(dadosCardapio)
        });

        if(res.ok){
          showToast("Cardápio salvo com sucesso!", "success");
        }
      } catch(error) {
        showToast("Erro ao salvar cardápio!", "error");
      }
    });
  } catch(error) {
    cardapioDiv.innerHTML="<p>Erro ao carregar cardápio</p>";
  }
}

async function mostrarAvisosAdmin(){
  const avisosDiv = document.getElementById("avisosAdmin");
  avisosDiv.innerHTML = "<p>Carregando avisos...</p>";

  try {
    const res = await fetch('/api/avisos');
    const avisos = await res.json();

    avisosDiv.innerHTML = "";

    avisos.forEach(aviso => {
      const avisoCard = document.createElement("div");
      avisoCard.className = "aviso-card";
      avisoCard.innerHTML = `
        <div class="aviso-header">
          <span class="badge-tipo badge-${aviso.tipo.toLowerCase().replace(' ', '-')}">${aviso.tipo}</span>
          <span class="aviso-professor">Professor: ${aviso.professor}</span>
        </div>
        <h4>${aviso.titulo}</h4>
        <p>${aviso.descricao}</p>
        <div class="aviso-footer">
          <span class="aviso-data">📅 ${aviso.data_aviso}</span>
          <div class="aviso-acoes">
            <button class="btn-editar-aviso" data-id="${aviso.id}" data-tipo="${aviso.tipo}" data-professor="${aviso.professor}" data-titulo="${aviso.titulo}" data-descricao="${aviso.descricao}" data-data="${aviso.data_aviso}">✏️ Editar</button>
            <button class="btn-excluir-aviso" data-id="${aviso.id}">🗑️ Excluir</button>
          </div>
        </div>
      `;
      avisosDiv.appendChild(avisoCard);
    });

    document.querySelectorAll(".btn-editar-aviso").forEach(btn=>{
      btn.addEventListener("click", editarAviso);
    });

    document.querySelectorAll(".btn-excluir-aviso").forEach(btn=>{
      btn.addEventListener("click", excluirAviso);
    });
  } catch(error) {
    avisosDiv.innerHTML = "<p>Erro ao carregar avisos</p>";
  }
}

async function popularSelectProfessores(selectId, valorAtual = '') {
  const sel = document.getElementById(selectId);
  sel.innerHTML = '<option value="">Carregando...</option>';
  try {
    const res = await fetch('/api/professores');
    const profs = await res.json();
    sel.innerHTML = '<option value="">Selecione o professor</option>';
    profs.forEach(p => {
      const nome = p.nome.trim();
      const opt = document.createElement('option');
      opt.value = nome;
      opt.textContent = nome + (p.materia ? ` — ${p.materia}` : '');
      if (nome === valorAtual) opt.selected = true;
      sel.appendChild(opt);
    });
    if (valorAtual && !profs.find(p => p.nome.trim() === valorAtual)) {
      const opt = document.createElement('option');
      opt.value = valorAtual;
      opt.textContent = valorAtual;
      opt.selected = true;
      sel.insertBefore(opt, sel.children[1]);
    }
  } catch {
    sel.innerHTML = '<option value="">Erro ao carregar</option>';
  }
}

document.getElementById("btnNovoAviso").addEventListener("click", ()=>{
  const modal = document.getElementById("modalNovoAviso");
  document.getElementById("formNovoAviso").reset();
  popularSelectProfessores('novoProfessor');
  modal.classList.remove("hidden");
  modal.style.display = "flex";
});

document.getElementById("btnFecharNovoAviso").addEventListener("click", ()=>{
  const modal = document.getElementById("modalNovoAviso");
  modal.classList.add("hidden");
  modal.style.display = "none";
});

document.getElementById("formNovoAviso").addEventListener("submit", async (e)=>{
  e.preventDefault();
  
  const tipo = document.getElementById("novoTipoAviso").value.trim();
  const professor = document.getElementById("novoProfessor").value.trim();
  const titulo = document.getElementById("novoTitulo").value.trim();
  const descricao = document.getElementById("novoDescricao").value.trim();
  const data_aviso = document.getElementById("novoData").value.trim();

  if(titulo.length < 5){
    showToast("O título deve ter no mínimo 5 caracteres!", "error");
    return;
  }
  
  if(descricao.length < 10){
    showToast("A descrição deve ter no mínimo 10 caracteres!", "error");
    return;
  }

  try {
    const res = await adminFetch('/api/avisos', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({tipo, professor, titulo, descricao, data_aviso})
    });

    if(res.ok){
      showToast("Aviso criado com sucesso!", "success");
      const modal = document.getElementById("modalNovoAviso");
      modal.classList.add("hidden");
      modal.style.display = "none";
      mostrarAvisosAdmin();
    } else {
      const erro = await res.text();
      showToast(`Erro ao criar aviso: ${erro}`, "error");
    }
  } catch(error) {
    console.error('Erro ao criar aviso:', error);
    showToast("Erro ao criar aviso!", "error");
  }
});

let avisoEditandoId = null;

function editarAviso(e){
  const btn = e.currentTarget;
  avisoEditandoId = btn.dataset.id;
  
  document.getElementById("editTipoAviso").value = btn.dataset.tipo;
  document.getElementById("editTitulo").value = btn.dataset.titulo;
  document.getElementById("editDescricao").value = btn.dataset.descricao;
  document.getElementById("editData").value = btn.dataset.data;
  
  popularSelectProfessores('editProfessor', btn.dataset.professor);

  document.getElementById("modalEditarAviso").style.display = "flex";
  document.getElementById("modalEditarAviso").classList.remove("hidden");
}

document.getElementById("btnFecharEditarAviso").addEventListener("click", ()=>{
  document.getElementById("modalEditarAviso").style.display = "none";
  document.getElementById("modalEditarAviso").classList.add("hidden");
  avisoEditandoId = null;
});

document.getElementById("formEditarAviso").addEventListener("submit", async (e)=>{
  e.preventDefault();
  
  if(!avisoEditandoId) return;

  const tipo = document.getElementById("editTipoAviso").value.trim();
  const professor = document.getElementById("editProfessor").value.trim();
  const titulo = document.getElementById("editTitulo").value.trim();
  const descricao = document.getElementById("editDescricao").value.trim();
  const data_aviso = document.getElementById("editData").value.trim();

  try {
    const res = await adminFetch(`/api/avisos/${avisoEditandoId}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({tipo, professor, titulo, descricao, data_aviso})
    });

    if(res.ok){
      showToast("Aviso atualizado com sucesso!", "success");
      document.getElementById("modalEditarAviso").style.display = "none";
      document.getElementById("modalEditarAviso").classList.add("hidden");
      avisoEditandoId = null;
      mostrarAvisosAdmin();
    }
  } catch(error) {
    showToast("Erro ao editar aviso!", "error");
  }
});

async function excluirAviso(e){
  const btn = e.currentTarget;
  const id = btn.dataset.id;

  const confirmado = await confirmarAcao(
    '🗑️ Excluir Aviso',
    'Tem certeza que deseja excluir este aviso? Esta ação não pode ser desfeita.'
  );
  
  if(!confirmado) return;

  try {
    const res = await adminFetch(`/api/avisos/${id}`, {method: 'DELETE'});
    if(res.ok){
      showToast("Aviso excluído com sucesso!", "success");
      mostrarAvisosAdmin();
    }
  } catch(error) {
    showToast("Erro ao excluir aviso!", "error");
  }
}

document.getElementById("sairAluno").addEventListener("click",()=>{
  alunoPanel.classList.add("hidden");
  selecaoBox.classList.remove("hidden");
  loginForm.reset();
  usuarioAtual = null;
  tipoUsuario = null;
  sessionStorage.removeItem('alunoLogado');
});

document.getElementById("sairAdmin").addEventListener("click",()=>{
  adminPanel.classList.add("hidden");
  selecaoBox.classList.remove("hidden");
  loginForm.reset();
  usuarioAtual = null;
  tipoUsuario = null;
  ['adminToken','tipoAdmin','usuarioAtualStr','adminEmail'].forEach(k => sessionStorage.removeItem(k));
});

const sininho = document.getElementById("sininho");
const notificacaoDropdown = document.getElementById("notificacaoDropdown");
const limparNotificacoesBtn = document.getElementById("limparNotificacoes");
const listaNotificacoes = document.getElementById("listaNotificacoes");

sininho.addEventListener("click", (e) => {
  e.stopPropagation();
  notificacaoDropdown.classList.toggle("show");
  
  const badge = document.getElementById("badgeNotificacao");
  if (notificacaoDropdown.classList.contains("show")) {
    badge.classList.add("hidden-badge");
  }
});

document.addEventListener("click", (e) => {
  if (!notificacaoDropdown.contains(e.target) && !sininho.contains(e.target)) {
    notificacaoDropdown.classList.remove("show");
  }
});

async function carregarNotificacoes(avisosPreCarregados) {
  try {
    const avisos = avisosPreCarregados !== undefined
      ? avisosPreCarregados
      : await fetch('/api/avisos').then(r => r.json());
    
    const avisosLimpados = JSON.parse(localStorage.getItem('avisosLimpados') || '[]');
    const avisosFiltrados = avisos.filter(aviso => !avisosLimpados.includes(aviso.id));
    
    const badge = document.getElementById("badgeNotificacao");
    badge.textContent = avisosFiltrados.length;
    
    if (avisosFiltrados.length === 0) {
      listaNotificacoes.innerHTML = `
        <div class="notificacao-vazia">
          <div class="notificacao-vazia-icone">📭</div>
          <p>Nenhuma notificação no momento</p>
        </div>
      `;
      badge.classList.add("hidden-badge");
      return;
    }
    
    badge.classList.remove("hidden-badge");
    listaNotificacoes.innerHTML = "";
    
    const avisosRecentes = avisosFiltrados.slice(0, 10);
    
    avisosRecentes.forEach((aviso, index) => {
      const item = document.createElement("div");
      item.className = `notificacao-item ${index < 3 ? 'nova' : ''}`;
      item.dataset.avisoId = aviso.id;
      item.innerHTML = `
        <div class="notificacao-item-header">
          <div class="notificacao-titulo">${aviso.titulo}</div>
          <span class="badge-tipo badge-${aviso.tipo.toLowerCase().replace(' ', '-')} notificacao-tipo-badge">${aviso.tipo}</span>
        </div>
        <div class="notificacao-desc">${aviso.descricao}</div>
        <div class="notificacao-rodape">
          <span class="notificacao-professor-tag">👨‍🏫 ${aviso.professor}</span>
          <span class="notificacao-data">📅 ${aviso.data_aviso}</span>
        </div>
      `;
      
      item.addEventListener("click", () => {
        item.classList.remove("nova");
        notificacaoDropdown.classList.remove("show");
      });
      
      listaNotificacoes.appendChild(item);
    });
    
  } catch (error) {
    console.error("Erro ao carregar notificações:", error);
    listaNotificacoes.innerHTML = `
      <div class="notificacao-vazia">
        <div class="notificacao-vazia-icone">⚠️</div>
        <p>Erro ao carregar notificações</p>
      </div>
    `;
  }
}

limparNotificacoesBtn.addEventListener("click", () => {
  const items = listaNotificacoes.querySelectorAll(".notificacao-item");
  const avisosIds = Array.from(items).map(item => parseInt(item.dataset.avisoId));
  
  const avisosLimpados = JSON.parse(localStorage.getItem('avisosLimpados') || '[]');
  const novosAvisosLimpados = [...new Set([...avisosLimpados, ...avisosIds])];
  localStorage.setItem('avisosLimpados', JSON.stringify(novosAvisosLimpados));
  
  listaNotificacoes.innerHTML = `
    <div class="notificacao-vazia">
      <div class="notificacao-vazia-icone">✅</div>
      <p>Todas as notificações foram limpas!</p>
    </div>
  `;
  
  const badge = document.getElementById("badgeNotificacao");
  badge.textContent = "0";
  badge.classList.add("hidden-badge");
});

const selecionarTurma = document.getElementById('selecionarTurma');
const professoresTurmaDiv = document.getElementById('professoresTurma');

if (selecionarTurma) {
  selecionarTurma.addEventListener('change', async () => {
    const turma = selecionarTurma.value;
    if (!turma) {
      professoresTurmaDiv.innerHTML = '';
      return;
    }
    await carregarProfessoresTurma(turma);
  });
}

async function carregarProfessoresTurma(turma) {
  try {
    const res = await fetch(`/api/professores-turma/${turma}`);
    const professores = await res.json();
    
    if (professores.length === 0) {
      professoresTurmaDiv.innerHTML = '<p style="text-align: center; color: var(--text-tertiary);">Nenhum professor encontrado para esta turma.</p>';
      return;
    }
    
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    let modoEdicaoTurma = false;
    
    const wrapper = document.createElement('div');

    const btnEditar = document.createElement('button');
    btnEditar.className = 'btn-editar-prof';
    btnEditar.style.cssText = 'width:auto;margin-bottom:12px;';
    btnEditar.textContent = '✏️ Editar Nomes/Matérias';
    wrapper.appendChild(btnEditar);

    const tabela = document.createElement('table');
    tabela.className = 'tabela-professores-turma';
    tabela.id = 'tabelaProfTurma';
    tabela.innerHTML = `
      <thead>
        <tr>
          <th>Professor</th>
          <th>Matéria</th>
          <th>Status</th>
          <th>Data</th>
          <th>Ação</th>
        </tr>
      </thead>
      <tbody>
        ${professores.map(prof => `
          <tr data-id="${prof.id}">
            <td class="pt-nome"><strong>${sanitizeHTML(prof.professor)}</strong></td>
            <td class="pt-materia">${sanitizeHTML(prof.materia)}</td>
            <td>
              <span class="badge-status ${prof.status === 'Presente' ? 'badge-presente' : 'badge-ausente'}">
                ${prof.status === 'Presente' ? '✅ Presente' : '❌ Falta'}
              </span>
            </td>
            <td>${dataHoje}</td>
            <td>
              <button class="btn-toggle-status" data-id="${prof.id}" data-status="${prof.status}">
                ${prof.status === 'Presente' ? 'Marcar Falta' : 'Marcar Presença'}
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    `;
    wrapper.appendChild(tabela);
    professoresTurmaDiv.innerHTML = '';
    professoresTurmaDiv.appendChild(wrapper);

    tabela.querySelectorAll('.btn-toggle-status').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        const statusAtual = e.target.getAttribute('data-status');
        const novoStatus = statusAtual === 'Presente' ? 'Falta' : 'Presente';
        await atualizarStatusProfessor(id, novoStatus, turma);
      });
    });

    btnEditar.addEventListener('click', async () => {
      if (!modoEdicaoTurma) {
        modoEdicaoTurma = true;
        btnEditar.textContent = '💾 Salvar Alterações';
        btnEditar.style.background = 'linear-gradient(135deg,#48bb78,#38a169)';
        tabela.querySelectorAll('.pt-nome,.pt-materia').forEach(td => {
          td.contentEditable = 'true';
          td.style.border = '2px dashed var(--primary-color)';
          td.style.padding = '8px';
          td.style.cursor = 'text';
          if (td.classList.contains('pt-nome')) {
            const strong = td.querySelector('strong');
            if (strong) { td.textContent = strong.textContent; }
          }
        });
      } else {
        btnEditar.disabled = true;
        btnEditar.textContent = '⏳ Salvando...';
        try {
          const linhas = tabela.querySelectorAll('tr[data-id]');
          for (const tr of linhas) {
            const id = tr.dataset.id;
            const professor = tr.querySelector('.pt-nome').textContent.trim();
            const materia = tr.querySelector('.pt-materia').textContent.trim();
            await adminFetch(`/api/professores-turma/${id}`, {
              method: 'PUT',
              headers: {'Content-Type':'application/json'},
              body: JSON.stringify({ professor, materia })
            });
          }
          showToast('Nomes e matérias atualizados!', 'success');
          await carregarProfessoresTurma(turma);
        } catch (err) {
          showToast('Erro ao salvar alterações.', 'error');
          btnEditar.disabled = false;
          btnEditar.textContent = '💾 Salvar Alterações';
        }
      }
    });
    
  } catch (error) {
    console.error('Erro ao carregar professores da turma:', error);
    showToast('Erro ao carregar professores', 'error');
  }
}

async function atualizarStatusProfessor(id, novoStatus, turma) {
  try {
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const res = await adminFetch(`/api/professores-turma/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus, data: dataAtual })
    });
    
    if (res.ok) {
      showToast(`Status atualizado para ${novoStatus}!`, 'success');
      await carregarProfessoresTurma(turma);
    } else {
      showToast('Erro ao atualizar status', 'error');
    }
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    showToast('Erro ao atualizar status', 'error');
  }
}

function showModalInput(titulo, label, placeholder = '') {
  return new Promise((resolve) => {
    const modal = document.getElementById('modalInput');
    const form = document.getElementById('formModalInput');
    const input = document.getElementById('modalInputTexto');
    const tituloElement = document.getElementById('modalInputTitulo');
    const labelElement = document.getElementById('modalInputLabel');
    const btnCancelar = document.getElementById('btnCancelarInput');
    
    tituloElement.textContent = titulo;
    labelElement.textContent = label;
    input.value = '';
    input.placeholder = placeholder;
    
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    
    setTimeout(() => input.focus(), 100);
    
    function fecharModal(valor) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
      form.removeEventListener('submit', handleSubmit);
      btnCancelar.removeEventListener('click', handleCancel);
      resolve(valor);
    }
    
    function handleSubmit(e) {
      e.preventDefault();
      const valor = input.value.trim();
      if (valor) {
        fecharModal(valor);
      }
    }
    
    function handleCancel() {
      fecharModal(null);
    }
    
    form.addEventListener('submit', handleSubmit);
    btnCancelar.addEventListener('click', handleCancel);
  });
}

// ═══════════════════════════════════════════════════════
// ─── CALENDÁRIO DE PROVAS ───────────────────────────────
// ═══════════════════════════════════════════════════════
async function carregarProvasAluno(serie, provasPreCarregadas) {
  const container = document.getElementById('provasAluno');
  container.innerHTML = '<p style="color:var(--text-secondary)">Carregando provas...</p>';
  try {
    let lista;
    if (provasPreCarregadas !== undefined) {
      lista = provasPreCarregadas;
    } else {
      const [provas, todas] = await Promise.all([
        fetch(`/api/provas?turma=${encodeURIComponent(serie)}`).then(r => r.json()),
        fetch('/api/provas?turma=Todas').then(r => r.json()).catch(() => [])
      ]);
      lista = [...provas, ...todas].sort((a,b) => new Date(a.data) - new Date(b.data));
    }
    if (!lista.length) { container.innerHTML = '<p class="feature-vazia">Nenhuma prova cadastrada.</p>'; return; }
    container.innerHTML = lista.map(p => {
      const dt = new Date(p.data + 'T12:00:00');
      const diasRestantes = Math.ceil((dt - new Date()) / 86400000);
      const urgente = diasRestantes <= 3 && diasRestantes >= 0;
      const passado = diasRestantes < 0;
      return `<div class="feature-card ${urgente ? 'urgente' : ''} ${passado ? 'passado' : ''}">
        <div class="feature-card-header">
          <span class="feature-materia">${sanitizeHTML(p.materia)}</span>
          <span class="feature-data">${dt.toLocaleDateString('pt-BR')}</span>
        </div>
        <div class="feature-titulo">${sanitizeHTML(p.titulo)}</div>
        ${p.descricao ? `<div class="feature-desc">${sanitizeHTML(p.descricao)}</div>` : ''}
        <div class="feature-badge ${passado ? 'badge-passado' : urgente ? 'badge-urgente' : 'badge-ok'}">
          ${passado ? 'Passou' : diasRestantes === 0 ? 'Hoje!' : `${diasRestantes} dia(s)`}
        </div>
      </div>`;
    }).join('');
  } catch { container.innerHTML = '<p class="feature-vazia">Erro ao carregar provas.</p>'; }
}

async function popularMateriaSelect(selectId, valorAtual = '') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  try {
    const res = await fetch('/api/professores');
    const profs = await res.json();
    const materias = new Set();
    profs.forEach(p => {
      if (p.materia) {
        p.materia.split(/[,\/]/).forEach(m => {
          const mt = m.trim();
          if (mt) materias.add(mt);
        });
      }
    });
    sel.innerHTML = '<option value="">Selecione a matéria</option>';
    [...materias].sort().forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      if (m === valorAtual) opt.selected = true;
      sel.appendChild(opt);
    });
  } catch {
    sel.innerHTML = '<option value="">Erro ao carregar matérias</option>';
  }
}

async function carregarProvasAdmin() {
  const container = document.getElementById('listaProvasAdmin');
  popularMateriaSelect('provaMateria');
  container.innerHTML = '<p>Carregando...</p>';
  try {
    const res = await fetch('/api/provas');
    if (!res.ok) throw new Error('Falha na requisição');
    const provas = await res.json();
    if (!provas.length) { container.innerHTML = '<p class="feature-vazia">Nenhuma prova cadastrada.</p>'; return; }
    container.innerHTML = provas.map(p => {
      const dt = new Date(p.data + 'T12:00:00');
      return `<div class="feature-card admin-item">
        <div class="feature-card-header">
          <span><strong>${sanitizeHTML(p.titulo)}</strong> — ${sanitizeHTML(p.materia)}</span>
          <span>${dt.toLocaleDateString('pt-BR')} | Turma: ${sanitizeHTML(p.turma)}</span>
        </div>
        ${p.descricao ? `<div class="feature-desc">${sanitizeHTML(p.descricao)}</div>` : ''}
        <button onclick="deletarProva(${p.id})" class="btn-excluir-feature">🗑 Excluir</button>
      </div>`;
    }).join('');
  } catch { container.innerHTML = '<p class="feature-vazia">Erro ao carregar provas. Tente novamente.</p>'; }
}

document.getElementById('btnAdicionarProva')?.addEventListener('click', async () => {
  const titulo = document.getElementById('provaTitulo').value.trim();
  const materia = document.getElementById('provaMateria').value.trim();
  const descricao = document.getElementById('provaDescricao').value.trim();
  const data = document.getElementById('provaData').value;
  const turma = document.getElementById('provaTurma').value;
  if (!titulo || !materia || !data || !turma) { showToast('Preencha todos os campos obrigatórios!', 'error'); return; }
  const res = await adminFetch('/api/provas', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ titulo, materia, descricao, data, turma, criado_por: 'Admin' }) });
  const result = await res.json();
  if (result.sucesso) {
    showToast('Prova adicionada com sucesso!', 'success');
    document.getElementById('provaTitulo').value = '';
    document.getElementById('provaMateria').value = '';
    document.getElementById('provaDescricao').value = '';
    document.getElementById('provaData').value = '';
    document.getElementById('provaTurma').value = '';
    carregarProvasAdmin();
  } else { showToast(result.erro || 'Erro ao adicionar.', 'error'); }
});

function deletarProva(id) {
  confirmarAcao('Excluir esta prova?', async () => {
    await adminFetch(`/api/provas/${id}`, { method: 'DELETE' });
    showToast('Prova excluída.', 'success');
    carregarProvasAdmin();
  });
}

// ═══════════════════════════════════════════════════════
// ─── CHAT DE DÚVIDAS ────────────────────────────────────
// ═══════════════════════════════════════════════════════
async function carregarDuvidasAluno(serie, duvidasPreCarregadas) {
  const container = document.getElementById('duvidasAluno');
  container.innerHTML = '<p style="color:var(--text-secondary)">Carregando dúvidas...</p>';
  try {
    const duvidas = duvidasPreCarregadas !== undefined
      ? duvidasPreCarregadas
      : await fetch(`/api/duvidas?turma=${encodeURIComponent(serie)}`).then(r => r.json());
    if (!duvidas.length) { container.innerHTML = '<p class="feature-vazia">Nenhuma dúvida ainda. Seja o primeiro!</p>'; return; }
    container.innerHTML = duvidas.map(d => `
      <div class="duvida-card ${d.resposta ? 'respondida' : ''}">
        <div class="duvida-header">
          <span class="duvida-autor">👤 ${sanitizeHTML(d.aluno_nome)}</span>
          <span class="duvida-data">${new Date(d.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
        <div class="duvida-pergunta">❓ ${sanitizeHTML(d.pergunta)}</div>
        ${d.resposta ? `<div class="duvida-resposta"><strong>📌 Professor:</strong> ${sanitizeHTML(d.resposta)}</div>` : '<div class="duvida-aguardando">⏳ Aguardando resposta...</div>'}
      </div>`).join('');
  } catch { container.innerHTML = '<p class="feature-vazia">Erro ao carregar dúvidas.</p>'; }
}

async function enviarDuvidaAluno(aluno) {
  const texto = document.getElementById('novaDuvidaTexto').value.trim();
  if (!texto) { showToast('Escreva sua dúvida antes de enviar.', 'error'); return; }
  const res = await fetch('/api/duvidas', { method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ pergunta: texto, aluno_nome: aluno.nome, aluno_email: aluno.email, turma: aluno.serie }) });
  const result = await res.json();
  if (result.sucesso) {
    showToast('Dúvida enviada!', 'success');
    document.getElementById('novaDuvidaTexto').value = '';
    carregarDuvidasAluno(aluno.serie);
  } else { showToast(result.erro || 'Erro ao enviar.', 'error'); }
}

async function carregarDuvidasAdmin() {
  const container = document.getElementById('listaDuvidasAdmin');
  const turma = document.getElementById('filtroTurmaDuvidas').value;
  container.innerHTML = '<p>Carregando...</p>';
  try {
    const url = turma ? `/api/duvidas?turma=${encodeURIComponent(turma)}` : '/api/duvidas';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha na requisição');
    const duvidas = await res.json();
    if (!duvidas.length) { container.innerHTML = '<p class="feature-vazia">Nenhuma dúvida encontrada.</p>'; return; }
    container.innerHTML = duvidas.map(d => `
      <div class="duvida-card admin-item ${d.resposta ? 'respondida' : ''}">
        <div class="duvida-header">
          <span><strong>${sanitizeHTML(d.aluno_nome)}</strong> — Turma ${sanitizeHTML(d.turma)}</span>
          <span>${new Date(d.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
        <div class="duvida-pergunta">❓ ${sanitizeHTML(d.pergunta)}</div>
        ${d.resposta
          ? `<div class="duvida-resposta"><strong>Resposta:</strong> ${sanitizeHTML(d.resposta)}</div>`
          : `<div style="display:flex;gap:8px;margin-top:8px;">
              <input type="text" id="resp-${d.id}" placeholder="Digite a resposta..." style="flex:1;padding:8px;border-radius:8px;border:1px solid var(--border-color);background:var(--input-bg);color:var(--text-primary);">
              <button onclick="responderDuvida(${d.id})" class="btn-adicionar" style="white-space:nowrap;">Responder</button>
             </div>`}
        <button onclick="deletarDuvida(${d.id})" class="btn-excluir-feature" style="margin-top:4px;">🗑 Excluir</button>
      </div>`).join('');
  } catch { container.innerHTML = '<p class="feature-vazia">Erro ao carregar dúvidas. Tente novamente.</p>'; }
}

async function responderDuvida(id) {
  const resposta = document.getElementById(`resp-${id}`).value.trim();
  if (!resposta) { showToast('Digite uma resposta.', 'error'); return; }
  const res = await adminFetch(`/api/duvidas/${id}/resposta`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ resposta, respondido_por: 'Professor' }) });
  const result = await res.json();
  if (result.sucesso) { showToast('Resposta enviada!', 'success'); carregarDuvidasAdmin(); }
  else { showToast(result.erro || 'Erro.', 'error'); }
}

function deletarDuvida(id) {
  confirmarAcao('Excluir esta dúvida?', async () => {
    await adminFetch(`/api/duvidas/${id}`, { method: 'DELETE' });
    showToast('Dúvida excluída.', 'success');
    carregarDuvidasAdmin();
  });
}

// ═══════════════════════════════════════════════════════
// ─── CONTROLE DE TAREFAS ────────────────────────────────
// ═══════════════════════════════════════════════════════
let tarefasConcluidas = [];

async function carregarTarefasAluno(aluno, tarefasPreCarregadas, concluidasPreCarregadas) {
  const container = document.getElementById('tarefasAluno');
  container.innerHTML = '<p style="color:var(--text-secondary)">Carregando tarefas...</p>';
  try {
    let lista, concluidas;
    if (tarefasPreCarregadas !== undefined) {
      lista = tarefasPreCarregadas;
      concluidas = concluidasPreCarregadas || [];
    } else {
      const [resTarefas, resConcluidas, resTodas] = await Promise.all([
        fetch(`/api/tarefas?turma=${encodeURIComponent(aluno.serie)}`).then(r => r.json()),
        fetch(`/api/tarefas/concluidas/${encodeURIComponent(aluno.email)}`).then(r => r.json()).catch(() => []),
        fetch('/api/tarefas?turma=Todas').then(r => r.json()).catch(() => [])
      ]);
      concluidas = resConcluidas;
      lista = [...resTarefas, ...resTodas].sort((a,b) => new Date(a.prazo) - new Date(b.prazo));
    }
    tarefasConcluidas = concluidas;
    if (!lista.length) { container.innerHTML = '<p class="feature-vazia">Nenhuma tarefa cadastrada.</p>'; return; }
    container.innerHTML = lista.map(t => {
      const dt = new Date(t.prazo + 'T12:00:00');
      const diasRestantes = Math.ceil((dt - new Date()) / 86400000);
      const concluida = tarefasConcluidas.includes(t.id);
      return `<div class="feature-card tarefa-card ${concluida ? 'concluida' : ''}" id="tarefa-${t.id}">
        <div class="feature-card-header">
          <span class="feature-materia">${sanitizeHTML(t.materia)}</span>
          <span class="feature-data">Prazo: ${dt.toLocaleDateString('pt-BR')}</span>
        </div>
        <div class="feature-titulo">${sanitizeHTML(t.titulo)}</div>
        ${t.descricao ? `<div class="feature-desc">${sanitizeHTML(t.descricao)}</div>` : ''}
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
          <span class="feature-badge ${diasRestantes < 0 ? 'badge-passado' : diasRestantes <= 2 ? 'badge-urgente' : 'badge-ok'}">
            ${diasRestantes < 0 ? 'Atrasada' : diasRestantes === 0 ? 'Hoje!' : `${diasRestantes} dia(s)`}
          </span>
          <button class="btn-concluir ${concluida ? 'concluida' : ''}" data-tid="${t.id}">
            ${concluida ? '✅ Feita' : '⬜ Marcar como feita'}
          </button>
        </div>
      </div>`;
    }).join('');
    container.querySelectorAll('.btn-concluir').forEach(btn => {
      btn.addEventListener('click', () => alternarTarefa(Number(btn.dataset.tid), aluno.email, aluno.nome, aluno.serie));
    });
  } catch(e) { container.innerHTML = '<p class="feature-vazia">Erro ao carregar tarefas.</p>'; }
}

async function alternarTarefa(tarefaId, email, nome, serie) {
  const res = await fetch(`/api/tarefas/${tarefaId}/concluir`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ aluno_email: email, aluno_nome: nome }) });
  const result = await res.json();
  if (result.sucesso) {
    showToast(result.concluida ? '✅ Tarefa marcada como feita!' : 'Tarefa desmarcada.', 'success');
    carregarTarefasAluno({ email, nome, serie });
  }
}

async function carregarTarefasAdmin() {
  const container = document.getElementById('listaTarefasAdmin');
  container.innerHTML = '<p>Carregando...</p>';
  try {
    const res = await fetch('/api/tarefas');
    if (!res.ok) throw new Error('Falha na requisição');
    const tarefas = await res.json();
    if (!tarefas.length) { container.innerHTML = '<p class="feature-vazia">Nenhuma tarefa cadastrada.</p>'; return; }
    container.innerHTML = tarefas.map(t => {
      const dt = new Date(t.prazo + 'T12:00:00');
      return `<div class="feature-card admin-item">
        <div class="feature-card-header">
          <span><strong>${sanitizeHTML(t.titulo)}</strong> — ${sanitizeHTML(t.materia)}</span>
          <span>Prazo: ${dt.toLocaleDateString('pt-BR')} | Turma: ${sanitizeHTML(t.turma)}</span>
        </div>
        ${t.descricao ? `<div class="feature-desc">${sanitizeHTML(t.descricao)}</div>` : ''}
        <button onclick="deletarTarefa(${t.id})" class="btn-excluir-feature">🗑 Excluir</button>
      </div>`;
    }).join('');
  } catch { container.innerHTML = '<p class="feature-vazia">Erro ao carregar tarefas. Tente novamente.</p>'; }
}

document.getElementById('btnAdicionarTarefa')?.addEventListener('click', async () => {
  const titulo = document.getElementById('tarefaTitulo').value.trim();
  const materia = document.getElementById('tarefaMateria').value.trim();
  const descricao = document.getElementById('tarefaDescricao').value.trim();
  const turma = document.getElementById('tarefaTurma').value;
  const prazo = document.getElementById('tarefaPrazo').value;
  if (!titulo || !materia || !turma || !prazo) { showToast('Preencha todos os campos obrigatórios!', 'error'); return; }
  const res = await adminFetch('/api/tarefas', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ titulo, materia, descricao, turma, prazo, criado_por: 'Admin' }) });
  const result = await res.json();
  if (result.sucesso) {
    showToast('Tarefa adicionada!', 'success');
    ['tarefaTitulo','tarefaMateria','tarefaDescricao','tarefaPrazo'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('tarefaTurma').value = '';
    carregarTarefasAdmin();
  } else { showToast(result.erro || 'Erro.', 'error'); }
});

function deletarTarefa(id) {
  confirmarAcao('Excluir esta tarefa?', async () => {
    await adminFetch(`/api/tarefas/${id}`, { method: 'DELETE' });
    showToast('Tarefa excluída.', 'success');
    carregarTarefasAdmin();
  });
}

// ═══════════════════════════════════════════════════════
// ─── ENQUETES RÁPIDAS ───────────────────────────────────
// ═══════════════════════════════════════════════════════
function adicionarOpcaoEnquete() {
  const container = document.getElementById('opcoesEnquete');
  const idx = container.querySelectorAll('.opcao-enquete-input').length + 1;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'opcao-enquete-input';
  input.placeholder = `Opção ${idx}`;
  container.appendChild(input);
}

async function carregarEnquetesAluno(aluno, enquetesPreCarregadas) {
  const container = document.getElementById('enquetesAluno');
  container.innerHTML = '<p style="color:var(--text-secondary)">Carregando enquetes...</p>';
  try {
    let enquetes;
    if (enquetesPreCarregadas !== undefined) {
      enquetes = enquetesPreCarregadas;
    } else {
      const [res1, res2] = await Promise.all([
        fetch(`/api/enquetes?turma=${encodeURIComponent(aluno.serie)}`).then(r => r.json()),
        fetch('/api/enquetes?turma=Todas').then(r => r.json()).catch(() => [])
      ]);
      const lista = [...res1, ...res2];
      enquetes = await Promise.all(lista.map(async e => {
        const resultados = await fetch(`/api/enquetes/${e.id}/resultados`).then(r => r.json()).catch(() => ({ total: 0, contagem: {} }));
        return { ...e, resultados };
      }));
    }
    if (!enquetes.length) { container.innerHTML = '<p class="feature-vazia">Nenhuma enquete ativa.</p>'; return; }

    let html = '';
    for (const e of enquetes) {
      const resultados = e.resultados || { total: 0, contagem: {} };
      const total = resultados.total || 0;
      html += `<div class="enquete-card" data-eid="${e.id}">
        <div class="enquete-pergunta">📊 ${sanitizeHTML(e.pergunta)}</div>
        <div class="enquete-opcoes">
          ${e.opcoes.map(op => {
            const votos = resultados.contagem[op] || 0;
            const pct = total > 0 ? Math.round((votos / total) * 100) : 0;
            return `<div class="enquete-opcao">
              <button class="btn-opcao-enquete" data-eid="${e.id}" data-opcao="${encodeURIComponent(op)}">${sanitizeHTML(op)}</button>
              <div class="barra-resultado"><div class="barra-fill" style="width:${pct}%"></div></div>
              <span class="pct-resultado">${pct}% (${votos})</span>
            </div>`;
          }).join('')}
        </div>
        <div class="enquete-total">${total} voto(s)</div>
      </div>`;
    }
    container.innerHTML = html;
    container.querySelectorAll('.btn-opcao-enquete').forEach(btn => {
      btn.addEventListener('click', () => votarEnquete(
        Number(btn.dataset.eid),
        decodeURIComponent(btn.dataset.opcao),
        aluno.email,
        aluno.serie
      ));
    });
  } catch(e) { container.innerHTML = '<p class="feature-vazia">Erro ao carregar enquetes.</p>'; }
}

async function votarEnquete(enqueteId, opcao, email, serie) {
  const res = await fetch(`/api/enquetes/${enqueteId}/votar`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ opcao, aluno_email: email }) });
  const result = await res.json();
  if (result.sucesso) {
    showToast('Voto registrado!', 'success');
    const alunoLogado = JSON.parse(sessionStorage.getItem('alunoLogado') || '{}');
    carregarEnquetesAluno({ email, serie, nome: alunoLogado.nome || '' });
  } else { showToast(result.erro || 'Erro ao votar.', 'error'); }
}

async function carregarEnquetesAdmin() {
  const container = document.getElementById('listaEnquetesAdmin');
  container.innerHTML = '<p>Carregando...</p>';
  try {
    const res = await fetch('/api/enquetes');
    if (!res.ok) throw new Error('Falha na requisição');
    const enquetes = await res.json();
    if (!enquetes.length) { container.innerHTML = '<p class="feature-vazia">Nenhuma enquete cadastrada.</p>'; return; }
    let html = '';
    for (const e of enquetes) {
      const resultados = await fetch(`/api/enquetes/${e.id}/resultados`).then(r => r.json()).catch(() => ({ total: 0, contagem: {} }));
      const total = resultados.total || 0;
      html += `<div class="feature-card admin-item">
        <div class="feature-card-header">
          <span><strong>${sanitizeHTML(e.pergunta)}</strong></span>
          <span>Turma: ${sanitizeHTML(e.turma)} | ${total} voto(s)</span>
        </div>
        <div style="margin-top:8px;">
          ${e.opcoes.map(op => {
            const votos = resultados.contagem[op] || 0;
            const pct = total > 0 ? Math.round((votos / total) * 100) : 0;
            return `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
              <span style="min-width:120px;font-size:0.9rem;">${sanitizeHTML(op)}</span>
              <div class="barra-resultado" style="flex:1;"><div class="barra-fill" style="width:${pct}%"></div></div>
              <span style="font-size:0.85rem;color:var(--text-secondary)">${pct}% (${votos})</span>
            </div>`;
          }).join('')}
        </div>
        <button onclick="deletarEnquete(${e.id})" class="btn-excluir-feature" style="margin-top:8px;">🗑 Excluir</button>
      </div>`;
    }
    container.innerHTML = html;
  } catch { container.innerHTML = '<p class="feature-vazia">Erro ao carregar enquetes. Tente novamente.</p>'; }
}

document.getElementById('btnCriarEnquete')?.addEventListener('click', async () => {
  const pergunta = document.getElementById('enquetePergunta').value.trim();
  const turma = document.getElementById('enqueteTurma').value;
  const opcoes = Array.from(document.querySelectorAll('.opcao-enquete-input')).map(i => i.value.trim()).filter(v => v);
  if (!pergunta || !turma || opcoes.length < 2) { showToast('Preencha pergunta, turma e pelo menos 2 opções.', 'error'); return; }
  const res = await adminFetch('/api/enquetes', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ pergunta, opcoes, turma, criado_por: 'Admin' }) });
  const result = await res.json();
  if (result.sucesso) {
    showToast('Enquete criada!', 'success');
    document.getElementById('enquetePergunta').value = '';
    document.getElementById('enqueteTurma').value = '';
    document.querySelectorAll('.opcao-enquete-input').forEach((el, i) => { el.value = ''; if (i >= 2) el.remove(); });
    carregarEnquetesAdmin();
  } else { showToast(result.erro || 'Erro.', 'error'); }
});

function deletarEnquete(id) {
  confirmarAcao('Excluir esta enquete e todos os votos?', async () => {
    await adminFetch(`/api/enquetes/${id}`, { method: 'DELETE' });
    showToast('Enquete excluída.', 'success');
    carregarEnquetesAdmin();
  });
}

// ══════════════════════════════════════════════════════════════
// ─── RANKING DE TAREFAS ───────────────────────────────────────
// ══════════════════════════════════════════════════════════════
async function carregarRankingTarefas(turma, rankingPreCarregado) {
  const container = document.getElementById('rankingTurma');
  if (!container) return;
  container.innerHTML = '<p style="color:var(--text-tertiary);font-size:0.85rem;">Carregando...</p>';

  try {
    const ranking = rankingPreCarregado !== undefined
      ? rankingPreCarregado
      : await fetch(`/api/ranking/${encodeURIComponent(turma)}`).then(r => r.json());

    if (!ranking.length) {
      container.innerHTML = '<p class="ranking-vazio">🏁 Nenhuma tarefa concluída ainda. Seja o primeiro!</p>';
      return;
    }

    const medalhas = ['🥇', '🥈', '🥉'];
    const html = `<ul class="ranking-lista">${ranking.map((item, i) => `
      <li class="ranking-item ${i < 3 ? 'pos-' + (i + 1) : ''}">
        <span class="ranking-posicao">${medalhas[i] || (i + 1) + 'º'}</span>
        <span class="ranking-nome">${sanitizeHTML(item.nome)}</span>
        <span class="ranking-total">${item.total} ✅</span>
      </li>`).join('')}
    </ul>`;
    container.innerHTML = html;
  } catch {
    container.innerHTML = '<p class="ranking-vazio">Erro ao carregar ranking.</p>';
  }
}

// ══════════════════════════════════════════════════════════════
// ─── BOLETIM DO ALUNO (VISUALIZAÇÃO) ─────────────────────────
// ══════════════════════════════════════════════════════════════
async function carregarBoletinsAluno(aluno, boletinsPreCarregados) {
  const container = document.getElementById('boletinsAluno');
  if (!container) return;
  container.innerHTML = '<p style="color:var(--text-tertiary);font-size:0.85rem;">Carregando...</p>';

  try {
    const boletins = boletinsPreCarregados !== undefined
      ? boletinsPreCarregados
      : await fetch(`/api/boletins/aluno/${encodeURIComponent(aluno.email)}`).then(r => r.json());

    if (!boletins.length) {
      container.innerHTML = '<p class="feature-vazia">Nenhum boletim ou observação enviado ainda.</p>';
      return;
    }

    container.innerHTML = boletins.map(b => {
      const data = b.created_at ? new Date(b.created_at).toLocaleDateString('pt-BR') : '';
      const tipoLabel = b.tipo === 'observacao' ? '💬 Observação' : '📋 Boletim';
      const isPdf = b.arquivo_nome?.toLowerCase().endsWith('.pdf');
      const arquivoHtml = b.arquivo_url ? `
        <a class="boletim-card-arquivo" href="${b.arquivo_url}" target="_blank" rel="noopener">
          ${isPdf ? '📄' : '🖼️'} ${sanitizeHTML(b.arquivo_nome || 'Ver arquivo')}
        </a>` : '';
      const obsHtml = b.observacao ? `<p class="boletim-card-obs">${sanitizeHTML(b.observacao)}</p>` : '';

      return `
        <div class="boletim-card ${b.tipo === 'observacao' ? 'tipo-observacao' : ''}">
          <div class="boletim-card-header">
            <span class="boletim-card-tipo">${tipoLabel}</span>
            <span class="boletim-card-data">${data}</span>
          </div>
          ${obsHtml}
          ${arquivoHtml}
        </div>`;
    }).join('');
  } catch {
    container.innerHTML = '<p class="feature-vazia">Erro ao carregar boletins.</p>';
  }
}

// ══════════════════════════════════════════════════════════════
// ─── MODAL DE BOLETIM (DIREÇÃO/ADMIN ENVIA) ──────────────────
// ══════════════════════════════════════════════════════════════
let boletimAlunoAtual = null;
let boletimTipoAtual = 'boletim';
let boletimArquivoAtual = null;

const modalBoletim = document.getElementById('modalBoletim');
const btnEnviarBoletim = document.getElementById('btnEnviarBoletim');
const btnFecharBoletim = document.getElementById('btnFecharBoletim');
const boletimObservacao = document.getElementById('boletimObservacao');
const boletimArquivoArea = document.getElementById('boletimArquivoArea');
const boletimArquivoPreview = document.getElementById('boletimArquivoPreview');
const boletimMsg = document.getElementById('boletimMsg');
const boletimSubtitulo = document.getElementById('subtituloBoletim');

function abrirModalBoletim(aluno) {
  boletimAlunoAtual = aluno;
  boletimTipoAtual = 'boletim';
  boletimArquivoAtual = null;
  boletimObservacao.value = '';
  boletimArquivoPreview.innerHTML = '';
  boletimMsg.textContent = '';
  if (boletimSubtitulo) boletimSubtitulo.textContent = `Para: ${aluno.nome} — Turma ${aluno.serie || ''}`;

  document.querySelectorAll('.boletim-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tipo === 'boletim');
  });
  boletimArquivoArea.style.display = 'block';

  document.getElementById('boletimArquivoCamera').value = '';
  document.getElementById('boletimArquivoGaleria').value = '';

  modalBoletim.classList.remove('hidden');
  modalBoletim.style.display = 'flex';
}

function fecharModalBoletim() {
  modalBoletim.classList.add('hidden');
  modalBoletim.style.display = 'none';
  boletimAlunoAtual = null;
  boletimArquivoAtual = null;
}

if (btnFecharBoletim) btnFecharBoletim.addEventListener('click', fecharModalBoletim);

document.querySelectorAll('.boletim-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    boletimTipoAtual = tab.dataset.tipo;
    document.querySelectorAll('.boletim-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    boletimArquivoArea.style.display = boletimTipoAtual === 'boletim' ? 'block' : 'none';
  });
});

function mostrarPreviewArquivo(file) {
  boletimArquivoAtual = file;
  if (!file) { boletimArquivoPreview.innerHTML = ''; return; }
  if (file.type.startsWith('image/')) {
    const url = URL.createObjectURL(file);
    boletimArquivoPreview.innerHTML = `<img src="${url}" class="boletim-preview-img" alt="Preview">`;
  } else {
    boletimArquivoPreview.innerHTML = `<div class="boletim-preview-pdf">📄 <span>${sanitizeHTML(file.name)}</span></div>`;
  }
}

document.getElementById('boletimArquivoCamera')?.addEventListener('change', e => {
  mostrarPreviewArquivo(e.target.files[0] || null);
});

document.getElementById('boletimArquivoGaleria')?.addEventListener('change', e => {
  mostrarPreviewArquivo(e.target.files[0] || null);
});

if (btnEnviarBoletim) {
  btnEnviarBoletim.addEventListener('click', async () => {
    if (!boletimAlunoAtual) return;
    const obs = boletimObservacao.value.trim();

    if (boletimTipoAtual === 'boletim' && !boletimArquivoAtual && !obs) {
      boletimMsg.style.color = 'red';
      boletimMsg.textContent = 'Adicione um arquivo ou uma observação.';
      return;
    }
    if (boletimTipoAtual === 'observacao' && !obs) {
      boletimMsg.style.color = 'red';
      boletimMsg.textContent = 'Digite uma observação.';
      return;
    }

    btnEnviarBoletim.disabled = true;
    btnEnviarBoletim.textContent = '⏳ Enviando...';
    boletimMsg.textContent = '';

    const formData = new FormData();
    formData.append('aluno_email', boletimAlunoAtual.email);
    formData.append('aluno_nome', boletimAlunoAtual.nome);
    formData.append('turma', boletimAlunoAtual.serie || '');
    formData.append('tipo', boletimTipoAtual);
    formData.append('observacao', obs);
    formData.append('enviado_por', usuarioAtual?.nome || 'Direção');
    if (boletimArquivoAtual) formData.append('arquivo', boletimArquivoAtual);

    try {
      const res = await adminFetch('/api/boletins', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.sucesso) {
        fecharModalBoletim();
        showToast('Enviado com sucesso!', 'success', '📋 Boletim Enviado');
      } else {
        boletimMsg.style.color = 'red';
        boletimMsg.textContent = data.erro || 'Erro ao enviar.';
      }
    } catch {
      boletimMsg.style.color = 'red';
      boletimMsg.textContent = 'Erro de conexão. Tente novamente.';
    }

    btnEnviarBoletim.disabled = false;
    btnEnviarBoletim.textContent = '✅ Enviar';
  });
}

// ══════════════════════════════════════════════════════════════
// ─── CRIAR CONTA DIREÇÃO DIRETAMENTE (admin) ─────────────────
// ══════════════════════════════════════════════════════════════
(function configurarCriarContaDireta() {
  const btnToggle = document.getElementById('btnToggleNovaContaDirecao');
  const formWrap  = document.getElementById('formNovaContaDirecaoWrap');
  const btnConfirm = document.getElementById('btnConfirmarNovaContaDirecao');
  if (!btnToggle || !formWrap || !btnConfirm) return;

  btnToggle.addEventListener('click', () => {
    formWrap.classList.toggle('hidden');
    btnToggle.textContent = formWrap.classList.contains('hidden')
      ? '+ Criar Conta Diretamente'
      : '— Fechar Formulário';
  });

  btnConfirm.addEventListener('click', async () => {
    const nome  = document.getElementById('nomeNovaContaDirecao').value.trim();
    const email = document.getElementById('emailNovaContaDirecao').value.trim();
    const senha = document.getElementById('senhaNovaContaDirecao').value;
    if (!nome || !email || !senha) { showToast('Preencha todos os campos.', 'warning'); return; }
    if (senha.length < 6) { showToast('Senha deve ter pelo menos 6 caracteres.', 'warning'); return; }

    btnConfirm.disabled = true;
    btnConfirm.textContent = 'Criando...';
    try {
      const res = await adminFetch('/api/direcao/criar-conta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha })
      });
      const data = await res.json();
      if (data.sucesso) {
        showToast('Conta criada! Login enviado por e-mail.', 'success');
        document.getElementById('nomeNovaContaDirecao').value = '';
        document.getElementById('emailNovaContaDirecao').value = '';
        document.getElementById('senhaNovaContaDirecao').value = '';
        formWrap.classList.add('hidden');
        btnToggle.textContent = '+ Criar Conta Diretamente';
      } else {
        showToast(data.erro || 'Erro ao criar conta.', 'error');
      }
    } catch {
      showToast('Erro de conexão.', 'error');
    }
    btnConfirm.disabled = false;
    btnConfirm.textContent = '✅ Criar Conta e Enviar Login por E-mail';
  });
})();

// ══════════════════════════════════════════════════════════════
// ─── RESTAURAR SESSÃO AO RECARREGAR PÁGINA ───────────────────
// ══════════════════════════════════════════════════════════════
async function restaurarSessao() {
  const alunoStr   = sessionStorage.getItem('alunoLogado');
  const adminToken = sessionStorage.getItem('adminToken');

  if (alunoStr) {
    try {
      const aluno = JSON.parse(alunoStr);
      if (aluno && aluno.email) {
        await mostrarPainelAluno(aluno);
        return;
      }
    } catch {}
    sessionStorage.removeItem('alunoLogado');
  }

  if (adminToken) {
    try {
      const tipoSalvo    = sessionStorage.getItem('tipoAdmin') || 'admin';
      const usuarioStr   = sessionStorage.getItem('usuarioAtualStr');
      usuarioAtual       = usuarioStr ? JSON.parse(usuarioStr) : { nome: tipoSalvo === 'admin' ? 'Administrador' : 'Direção' };
      tipoAdmin          = tipoSalvo;
      window._adminEmail = sessionStorage.getItem('adminEmail') || '';
      mostrarPainelAdmin();
      return;
    } catch {
      ['adminToken','tipoAdmin','usuarioAtualStr','adminEmail'].forEach(k => sessionStorage.removeItem(k));
    }
  }

  selecaoBox.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  restaurarSessao();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

let pwaPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  pwaPrompt = e;

  const isDesktop = window.innerWidth >= 640;
  const banner = document.createElement('div');
  banner.id = 'pwaBanner';

  if (isDesktop) {
    banner.style.cssText = `
      position:fixed; bottom:24px; right:24px;
      z-index:9999; width:300px;
      background:var(--card-bg); border:1px solid var(--border-color);
      border-radius:18px; padding:18px 16px 15px;
      box-shadow:0 20px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.06);
      opacity:0; transform:translateY(20px);
      transition:transform 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease;
      font-family:inherit;
    `;
  } else {
    banner.style.cssText = `
      position:fixed; bottom:16px; left:50%; transform:translateX(-50%) translateY(100px);
      z-index:9999; width:calc(100% - 28px); max-width:380px;
      background:var(--card-bg); border:1px solid var(--border-color);
      border-radius:20px; padding:18px 16px 15px;
      box-shadow:0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.06);
      opacity:0; transition:transform 0.45s cubic-bezier(0.16,1,0.3,1), opacity 0.35s ease;
      font-family:inherit;
    `;
  }

  banner.innerHTML = `
    <button id="btnFecharPwa" style="
      position:absolute; top:10px; right:12px;
      background:none; border:none; color:var(--text-tertiary);
      font-size:1rem; cursor:pointer; padding:4px; line-height:1;
      width:auto; height:auto; min-height:unset; opacity:0.7;
    ">✕</button>

    <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px; padding-right:20px;">
      <div style="
        width:46px; height:46px; border-radius:12px; flex-shrink:0;
        background:linear-gradient(135deg,#4361ee,#3a0ca3);
        display:flex; align-items:center; justify-content:center;
        font-size:1.5rem; box-shadow:0 4px 14px rgba(67,97,238,0.35);
      ">📚</div>
      <div style="min-width:0;">
        <div style="font-weight:700; font-size:0.92rem; color:var(--text-primary); margin-bottom:3px; line-height:1.2;">Agenda Escolar</div>
        <div style="font-size:0.76rem; color:var(--text-tertiary); line-height:1.4;">Instalar como app na ${isDesktop ? 'área de trabalho' : 'tela inicial'}</div>
      </div>
    </div>

    <div style="display:flex; gap:8px;">
      <button id="btnNaoPwa" style="
        flex:1; padding:9px 12px; border-radius:10px;
        background:var(--input-bg); border:1px solid var(--border-color);
        color:var(--text-secondary); font-size:0.82rem; font-weight:600;
        cursor:pointer; width:auto; height:auto; min-height:unset;
      ">Agora não</button>
      <button id="btnInstalarApp" style="
        flex:2; padding:9px 12px; border-radius:10px;
        background:linear-gradient(135deg,#4361ee,#3a0ca3);
        border:none; color:#fff; font-size:0.84rem; font-weight:700;
        cursor:pointer; width:auto; height:auto; min-height:unset;
        box-shadow:0 4px 14px rgba(67,97,238,0.3);
      ">📲 Instalar</button>
    </div>
  `;

  document.body.appendChild(banner);
  requestAnimationFrame(() => {
    if (isDesktop) {
      banner.style.transform = 'translateY(0)';
    } else {
      banner.style.transform = 'translateX(-50%) translateY(0)';
    }
    banner.style.opacity = '1';
  });

  const fecharBanner = () => {
    banner.style.transform = 'translateX(-50%) translateY(100px)';
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 400);
  };

  document.getElementById('btnInstalarApp').addEventListener('click', () => {
    pwaPrompt.prompt();
    pwaPrompt.userChoice.then(() => { fecharBanner(); pwaPrompt = null; });
  });

  document.getElementById('btnNaoPwa').addEventListener('click', fecharBanner);
  document.getElementById('btnFecharPwa').addEventListener('click', fecharBanner);
});
