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

function confirmarAcao(titulo, mensagem) {
  return new Promise((resolve) => {
    const modal = document.getElementById('modalConfirmar');
    const tituloElement = document.getElementById('modalConfirmarTitulo');
    const mensagemElement = document.getElementById('modalConfirmarMensagem');
    const btnOk = document.getElementById('btnOkConfirmar');
    const btnCancelar = document.getElementById('btnCancelarConfirmar');
    
    tituloElement.textContent = titulo;
    mensagemElement.textContent = mensagem;
    
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    
    const handleOk = () => {
      cleanup();
      resolve(true);
    };
    
    const handleCancelar = () => {
      cleanup();
      resolve(false);
    };
    
    const cleanup = () => {
      modal.classList.add('hidden');
      modal.style.display = 'none';
      btnOk.removeEventListener('click', handleOk);
      btnCancelar.removeEventListener('click', handleCancelar);
    };
    
    btnOk.addEventListener('click', handleOk);
    btnCancelar.addEventListener('click', handleCancelar);
  });
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
const adminSecreto = document.getElementById("adminSecreto");
const btnVoltar = document.getElementById("btnVoltar");

let modoCadastro = false;
let usuarioAtual = null;
let tipoUsuario = null;

btnDirecao.addEventListener("click", () => {
  tipoUsuario = "direcao";
  mostrarTelaLogin();
});

btnAluno.addEventListener("click", () => {
  tipoUsuario = "aluno";
  mostrarTelaLogin();
});

adminSecreto.addEventListener("click", () => {
  tipoUsuario = "admin";
  mostrarTelaLogin();
});

btnVoltar.addEventListener("click", () => {
  loginBox.classList.add("hidden");
  selecaoBox.classList.remove("hidden");
  loginForm.reset();
  modoCadastro = false;
  tipoUsuario = null;
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

function abrirModalVerificacao(email) {
  emailVerificandoTexto.textContent = email;
  codigoVerificacaoInput.value = '';
  mensagemVerificacao.textContent = '';
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
});

btnReenviarCodigo.addEventListener('click', async () => {
  if (!dadosCadastroPendente) return;
  btnReenviarCodigo.disabled = true;
  btnReenviarCodigo.textContent = '⏳ Enviando...';
  const reenviarEndpoint = dadosCadastroPendente.tipo === 'direcao'
    ? '/api/iniciar-cadastro-direcao'
    : '/api/iniciar-cadastro';
  try {
    const res = await fetch(reenviarEndpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(dadosCadastroPendente)
    });
    const data = await res.json();
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
  if (!codigo || !dadosCadastroPendente) return;

  mensagemVerificacao.style.color = 'var(--text-secondary)';
  mensagemVerificacao.textContent = '⏳ Verificando...';

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

    if(res.ok){
      const data = await res.json();
      if(data.sucesso){
        usuarioAtual = data.usuario;
        mostrarPainelAluno(data.usuario);
        showToast('Bem-vindo, ' + data.usuario.nome + '!', 'success', 'Login Realizado');
      }
    } else {
      const data = await res.json();
      showToast(data.erro, 'error');
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

    if(res.ok){
      const data = await res.json();
      if(data.sucesso){
        usuarioAtual = data.usuario;
        mostrarPainelAdmin();
        showToast('Bem-vindo, ' + data.usuario.nome + '!', 'success', 'Login Realizado');
      }
    } else {
      const data = await res.json();
      showToast(data.erro, 'error');
    }
  } catch(error) {
    showToast('Erro ao fazer login!', 'error');
  }
}

async function mostrarPainelAluno(aluno){
  loginBox.classList.add("hidden");
  alunoPanel.classList.remove("hidden");
  sessionStorage.setItem('alunoLogado', JSON.stringify(aluno));

  document.getElementById("boasVindas").textContent=`Bem-vindo(a), ${aluno.nome}!`;
  const turmaElement = document.getElementById("turma");
  turmaElement.innerHTML = `<img src="logo-escola.png" alt="" class="logo-serie"> Série: ${aluno.serie}`;

  const lista=document.getElementById("listaEventos");
  lista.innerHTML="<p>Carregando eventos...</p>";

  try {
    const res = await fetch(`/api/eventos/${encodeURIComponent(aluno.serie)}`);
    const eventos = await res.json();

    lista.innerHTML="";
    eventos.forEach(evento=>{
      const li=document.createElement("li");
      li.textContent=evento.descricao;
      lista.appendChild(li);
    });
  } catch(error) {
    lista.innerHTML="<p>Erro ao carregar eventos</p>";
  }

  mostrarCardapioDoDia();
  carregarNotificacoes();
  carregarProvasAluno(aluno.serie);
  carregarTarefasAluno(aluno);
  carregarDuvidasAluno(aluno.serie);
  carregarEnquetesAluno(aluno);

  document.getElementById('btnEnviarDuvida').onclick = () => enviarDuvidaAluno(aluno);
}


async function mostrarCardapioDoDia(){
  const cardapioDiv=document.getElementById("cardapioDoDia");
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
  loginBox.classList.add("hidden");
  adminPanel.classList.remove("hidden");
  
  if(usuarioAtual && usuarioAtual.nome){
    const titulo = adminPanel.querySelector("h2");
    titulo.textContent = `Bem-vindo(a), ${usuarioAtual.nome}!`;
  }
  
  configurarNavegacaoAdmin();
  atualizarListaAlunos();
}

function configurarNavegacaoAdmin(){
  const botoesCategoria = document.querySelectorAll('.btn-categoria');
  
  botoesCategoria.forEach(btn => {
    btn.addEventListener('click', () => {
      const secaoNome = btn.getAttribute('data-secao');
      
      botoesCategoria.forEach(b => b.classList.remove('active'));
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
          case 'turmas':
            atualizarListaAlunos();
            break;
          case 'avisos':
            mostrarAvisosAdmin();
            break;
          case 'cardapio':
            mostrarCardapioAdmin();
            break;
          case 'logs':
            carregarLogs();
            break;
          case 'eventos':
            atualizarEventosAdmin();
            break;
          case 'professores':
            break;
          case 'provas':
            carregarProvasAdmin();
            break;
          case 'duvidas':
            carregarDuvidasAdmin();
            break;
          case 'tarefas':
            carregarTarefasAdmin();
            break;
          case 'enquetes':
            carregarEnquetesAdmin();
            break;
        }
      }
    });
  });
}

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
            const dataHora = new Date(log.data_hora).toLocaleString('pt-BR');
            return `
              <tr>
                <td><strong>${log.nome}</strong></td>
                <td>${log.email}</td>
                <td>${log.turma}</td>
                <td>${dataHora}</td>
                <td><code>${log.ip_address || 'N/A'}</code></td>
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

    container.innerHTML = `
      <table class="tabela-alunos">
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Turma</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody id="tabelaAlunosBody"></tbody>
      </table>
    `;

    const tbody = document.getElementById("tabelaAlunosBody");
    alunos.forEach(a => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${a.nome}</td>
        <td>${a.email}</td>
        <td>${a.serie}</td>
        <td>
          <button class="excluir" data-id="${a.id}" data-nome="${a.nome}">🗑️ Excluir</button>
        </td>
      `;
      tbody.appendChild(tr);
      
      const btnExcluir = tr.querySelector('.excluir');
      btnExcluir.addEventListener('click', () => excluirAluno(a.id, a.nome));
    });
  } catch(error) {
    container.innerHTML="<p>Erro ao carregar alunos</p>";
  }
}

async function excluirAluno(id, nome) {
  const confirmado = await confirmarAcao(
    '🗑️ Excluir Aluno',
    `Tem certeza que deseja excluir o aluno "${nome}"?\n\nEsta ação não pode ser desfeita e o aluno perderá acesso ao sistema.`
  );
  
  if (!confirmado) {
    return;
  }

  try {
    const res = await fetch(`/api/alunos/${id}`, {
      method: 'DELETE'
    });

    const data = await res.json();

    if (data.sucesso) {
      showToast(data.mensagem, 'success');
      atualizarListaAlunos();
    } else {
      showToast(data.erro || 'Erro ao excluir aluno.', 'error');
    }
  } catch (error) {
    showToast('Erro ao excluir aluno. Tente novamente.', 'error');
  }
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
          const res = await fetch('/api/eventos', {
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
        const res = await fetch(`/api/eventos/${id}`, {
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
        const res = await fetch(`/api/eventos/${id}`, {method: 'DELETE'});
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

      const response = await fetch(`/api/professores/${id}`, {
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
        const res = await fetch(`/api/cardapio/${encodeURIComponent(diaSemana)}`, {
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

document.getElementById("btnNovoAviso").addEventListener("click", ()=>{
  const modal = document.getElementById("modalNovoAviso");
  document.getElementById("formNovoAviso").reset();
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
    const res = await fetch('/api/avisos', {
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
  document.getElementById("editProfessor").value = btn.dataset.professor;
  document.getElementById("editTitulo").value = btn.dataset.titulo;
  document.getElementById("editDescricao").value = btn.dataset.descricao;
  document.getElementById("editData").value = btn.dataset.data;
  
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
    const res = await fetch(`/api/avisos/${avisoEditandoId}`, {
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
    const res = await fetch(`/api/avisos/${id}`, {method: 'DELETE'});
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
});

document.getElementById("sairAdmin").addEventListener("click",()=>{
  adminPanel.classList.add("hidden");
  selecaoBox.classList.remove("hidden");
  loginForm.reset();
  usuarioAtual = null;
  tipoUsuario = null;
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

async function carregarNotificacoes() {
  try {
    const res = await fetch('/api/avisos');
    const avisos = await res.json();
    
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
    
    professoresTurmaDiv.innerHTML = `
      <table class="tabela-professores-turma">
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
            <tr>
              <td><strong>${prof.professor}</strong></td>
              <td>${prof.materia}</td>
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
      </table>
    `;
    
    document.querySelectorAll('.btn-toggle-status').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        const statusAtual = e.target.getAttribute('data-status');
        const novoStatus = statusAtual === 'Presente' ? 'Falta' : 'Presente';
        await atualizarStatusProfessor(id, novoStatus, turma);
      });
    });
    
  } catch (error) {
    console.error('Erro ao carregar professores da turma:', error);
    showToast('Erro ao carregar professores', 'error');
  }
}

async function atualizarStatusProfessor(id, novoStatus, turma) {
  try {
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const res = await fetch(`/api/professores-turma/${id}`, {
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
async function carregarProvasAluno(serie) {
  const container = document.getElementById('provasAluno');
  container.innerHTML = '<p style="color:var(--text-secondary)">Carregando provas...</p>';
  try {
    const res = await fetch(`/api/provas?turma=${encodeURIComponent(serie)}`);
    const provas = await res.json();
    const todas = await fetch('/api/provas?turma=Todas').then(r => r.json()).catch(() => []);
    const lista = [...provas, ...todas].sort((a,b) => new Date(a.data) - new Date(b.data));
    if (!lista.length) { container.innerHTML = '<p class="feature-vazia">Nenhuma prova cadastrada.</p>'; return; }
    container.innerHTML = lista.map(p => {
      const dt = new Date(p.data + 'T12:00:00');
      const diasRestantes = Math.ceil((dt - new Date()) / 86400000);
      const urgente = diasRestantes <= 3 && diasRestantes >= 0;
      const passado = diasRestantes < 0;
      return `<div class="feature-card ${urgente ? 'urgente' : ''} ${passado ? 'passado' : ''}">
        <div class="feature-card-header">
          <span class="feature-materia">${p.materia}</span>
          <span class="feature-data">${dt.toLocaleDateString('pt-BR')}</span>
        </div>
        <div class="feature-titulo">${p.titulo}</div>
        ${p.descricao ? `<div class="feature-desc">${p.descricao}</div>` : ''}
        <div class="feature-badge ${passado ? 'badge-passado' : urgente ? 'badge-urgente' : 'badge-ok'}">
          ${passado ? 'Passou' : diasRestantes === 0 ? 'Hoje!' : `${diasRestantes} dia(s)`}
        </div>
      </div>`;
    }).join('');
  } catch { container.innerHTML = '<p class="feature-vazia">Erro ao carregar provas.</p>'; }
}

async function carregarProvasAdmin() {
  const container = document.getElementById('listaProvasAdmin');
  container.innerHTML = '<p>Carregando...</p>';
  const res = await fetch('/api/provas');
  const provas = await res.json();
  if (!provas.length) { container.innerHTML = '<p class="feature-vazia">Nenhuma prova cadastrada.</p>'; return; }
  container.innerHTML = provas.map(p => {
    const dt = new Date(p.data + 'T12:00:00');
    return `<div class="feature-card admin-item">
      <div class="feature-card-header">
        <span><strong>${p.titulo}</strong> — ${p.materia}</span>
        <span>${dt.toLocaleDateString('pt-BR')} | Turma: ${p.turma}</span>
      </div>
      ${p.descricao ? `<div class="feature-desc">${p.descricao}</div>` : ''}
      <button onclick="deletarProva(${p.id})" class="btn-excluir-feature">🗑 Excluir</button>
    </div>`;
  }).join('');
}

document.getElementById('btnAdicionarProva')?.addEventListener('click', async () => {
  const titulo = document.getElementById('provaTitulo').value.trim();
  const materia = document.getElementById('provaMateria').value.trim();
  const descricao = document.getElementById('provaDescricao').value.trim();
  const data = document.getElementById('provaData').value;
  const turma = document.getElementById('provaTurma').value;
  if (!titulo || !materia || !data || !turma) { showToast('Preencha todos os campos obrigatórios!', 'error'); return; }
  const res = await fetch('/api/provas', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ titulo, materia, descricao, data, turma, criado_por: 'Admin' }) });
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

async function deletarProva(id) {
  if (!confirm('Excluir esta prova?')) return;
  await fetch(`/api/provas/${id}`, { method: 'DELETE' });
  showToast('Prova excluída.', 'success');
  carregarProvasAdmin();
}

// ═══════════════════════════════════════════════════════
// ─── CHAT DE DÚVIDAS ────────────────────────────────────
// ═══════════════════════════════════════════════════════
async function carregarDuvidasAluno(serie) {
  const container = document.getElementById('duvidasAluno');
  container.innerHTML = '<p style="color:var(--text-secondary)">Carregando dúvidas...</p>';
  try {
    const res = await fetch(`/api/duvidas?turma=${encodeURIComponent(serie)}`);
    const duvidas = await res.json();
    if (!duvidas.length) { container.innerHTML = '<p class="feature-vazia">Nenhuma dúvida ainda. Seja o primeiro!</p>'; return; }
    container.innerHTML = duvidas.map(d => `
      <div class="duvida-card ${d.resposta ? 'respondida' : ''}">
        <div class="duvida-header">
          <span class="duvida-autor">👤 ${d.aluno_nome}</span>
          <span class="duvida-data">${new Date(d.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
        <div class="duvida-pergunta">❓ ${d.pergunta}</div>
        ${d.resposta ? `<div class="duvida-resposta"><strong>📌 Professor:</strong> ${d.resposta}</div>` : '<div class="duvida-aguardando">⏳ Aguardando resposta...</div>'}
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
  const url = turma ? `/api/duvidas?turma=${encodeURIComponent(turma)}` : '/api/duvidas';
  const res = await fetch(url);
  const duvidas = await res.json();
  if (!duvidas.length) { container.innerHTML = '<p class="feature-vazia">Nenhuma dúvida encontrada.</p>'; return; }
  container.innerHTML = duvidas.map(d => `
    <div class="duvida-card admin-item ${d.resposta ? 'respondida' : ''}">
      <div class="duvida-header">
        <span><strong>${d.aluno_nome}</strong> — Turma ${d.turma}</span>
        <span>${new Date(d.created_at).toLocaleDateString('pt-BR')}</span>
      </div>
      <div class="duvida-pergunta">❓ ${d.pergunta}</div>
      ${d.resposta
        ? `<div class="duvida-resposta"><strong>Resposta:</strong> ${d.resposta}</div>`
        : `<div style="display:flex;gap:8px;margin-top:8px;">
            <input type="text" id="resp-${d.id}" placeholder="Digite a resposta..." style="flex:1;padding:8px;border-radius:8px;border:1px solid var(--border-color);background:var(--input-bg);color:var(--text-primary);">
            <button onclick="responderDuvida(${d.id})" class="btn-adicionar" style="white-space:nowrap;">Responder</button>
           </div>`}
      <button onclick="deletarDuvida(${d.id})" class="btn-excluir-feature" style="margin-top:4px;">🗑 Excluir</button>
    </div>`).join('');
}

async function responderDuvida(id) {
  const resposta = document.getElementById(`resp-${id}`).value.trim();
  if (!resposta) { showToast('Digite uma resposta.', 'error'); return; }
  const res = await fetch(`/api/duvidas/${id}/resposta`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ resposta, respondido_por: 'Professor' }) });
  const result = await res.json();
  if (result.sucesso) { showToast('Resposta enviada!', 'success'); carregarDuvidasAdmin(); }
  else { showToast(result.erro || 'Erro.', 'error'); }
}

async function deletarDuvida(id) {
  if (!confirm('Excluir esta dúvida?')) return;
  await fetch(`/api/duvidas/${id}`, { method: 'DELETE' });
  showToast('Dúvida excluída.', 'success');
  carregarDuvidasAdmin();
}

// ═══════════════════════════════════════════════════════
// ─── CONTROLE DE TAREFAS ────────────────────────────────
// ═══════════════════════════════════════════════════════
let tarefasConcluidas = [];

async function carregarTarefasAluno(aluno) {
  const container = document.getElementById('tarefasAluno');
  container.innerHTML = '<p style="color:var(--text-secondary)">Carregando tarefas...</p>';
  try {
    const [resTarefas, resConcluidas, resTodas] = await Promise.all([
      fetch(`/api/tarefas?turma=${encodeURIComponent(aluno.serie)}`).then(r => r.json()),
      fetch(`/api/tarefas/concluidas/${encodeURIComponent(aluno.email)}`).then(r => r.json()).catch(() => []),
      fetch('/api/tarefas?turma=Todas').then(r => r.json()).catch(() => [])
    ]);
    tarefasConcluidas = resConcluidas;
    const lista = [...resTarefas, ...resTodas].sort((a,b) => new Date(a.prazo) - new Date(b.prazo));
    if (!lista.length) { container.innerHTML = '<p class="feature-vazia">Nenhuma tarefa cadastrada.</p>'; return; }
    container.innerHTML = lista.map(t => {
      const dt = new Date(t.prazo + 'T12:00:00');
      const diasRestantes = Math.ceil((dt - new Date()) / 86400000);
      const concluida = tarefasConcluidas.includes(t.id);
      return `<div class="feature-card tarefa-card ${concluida ? 'concluida' : ''}" id="tarefa-${t.id}">
        <div class="feature-card-header">
          <span class="feature-materia">${t.materia}</span>
          <span class="feature-data">Prazo: ${dt.toLocaleDateString('pt-BR')}</span>
        </div>
        <div class="feature-titulo">${t.titulo}</div>
        ${t.descricao ? `<div class="feature-desc">${t.descricao}</div>` : ''}
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
          <span class="feature-badge ${diasRestantes < 0 ? 'badge-passado' : diasRestantes <= 2 ? 'badge-urgente' : 'badge-ok'}">
            ${diasRestantes < 0 ? 'Atrasada' : diasRestantes === 0 ? 'Hoje!' : `${diasRestantes} dia(s)`}
          </span>
          <button onclick="alternarTarefa(${t.id}, '${aluno.email}', '${aluno.nome}', '${aluno.serie}')" class="btn-concluir ${concluida ? 'concluida' : ''}">
            ${concluida ? '✅ Feita' : '⬜ Marcar como feita'}
          </button>
        </div>
      </div>`;
    }).join('');
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
  const res = await fetch('/api/tarefas');
  const tarefas = await res.json();
  if (!tarefas.length) { container.innerHTML = '<p class="feature-vazia">Nenhuma tarefa cadastrada.</p>'; return; }
  container.innerHTML = tarefas.map(t => {
    const dt = new Date(t.prazo + 'T12:00:00');
    return `<div class="feature-card admin-item">
      <div class="feature-card-header">
        <span><strong>${t.titulo}</strong> — ${t.materia}</span>
        <span>Prazo: ${dt.toLocaleDateString('pt-BR')} | Turma: ${t.turma}</span>
      </div>
      ${t.descricao ? `<div class="feature-desc">${t.descricao}</div>` : ''}
      <button onclick="deletarTarefa(${t.id})" class="btn-excluir-feature">🗑 Excluir</button>
    </div>`;
  }).join('');
}

document.getElementById('btnAdicionarTarefa')?.addEventListener('click', async () => {
  const titulo = document.getElementById('tarefaTitulo').value.trim();
  const materia = document.getElementById('tarefaMateria').value.trim();
  const descricao = document.getElementById('tarefaDescricao').value.trim();
  const turma = document.getElementById('tarefaTurma').value;
  const prazo = document.getElementById('tarefaPrazo').value;
  if (!titulo || !materia || !turma || !prazo) { showToast('Preencha todos os campos obrigatórios!', 'error'); return; }
  const res = await fetch('/api/tarefas', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ titulo, materia, descricao, turma, prazo, criado_por: 'Admin' }) });
  const result = await res.json();
  if (result.sucesso) {
    showToast('Tarefa adicionada!', 'success');
    ['tarefaTitulo','tarefaMateria','tarefaDescricao','tarefaPrazo'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('tarefaTurma').value = '';
    carregarTarefasAdmin();
  } else { showToast(result.erro || 'Erro.', 'error'); }
});

async function deletarTarefa(id) {
  if (!confirm('Excluir esta tarefa?')) return;
  await fetch(`/api/tarefas/${id}`, { method: 'DELETE' });
  showToast('Tarefa excluída.', 'success');
  carregarTarefasAdmin();
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

async function carregarEnquetesAluno(aluno) {
  const container = document.getElementById('enquetesAluno');
  container.innerHTML = '<p style="color:var(--text-secondary)">Carregando enquetes...</p>';
  try {
    const [res1, res2] = await Promise.all([
      fetch(`/api/enquetes?turma=${encodeURIComponent(aluno.serie)}`).then(r => r.json()),
      fetch('/api/enquetes?turma=Todas').then(r => r.json()).catch(() => [])
    ]);
    const enquetes = [...res1, ...res2];
    if (!enquetes.length) { container.innerHTML = '<p class="feature-vazia">Nenhuma enquete ativa.</p>'; return; }

    let html = '';
    for (const e of enquetes) {
      const resultados = await fetch(`/api/enquetes/${e.id}/resultados`).then(r => r.json());
      const total = resultados.total || 0;
      const jaVotouCheck = await fetch(`/api/votos/verificar?enquete_id=${e.id}&email=${encodeURIComponent(aluno.email)}`).catch(() => ({ json: () => ({ votou: false }) }));
      html += `<div class="enquete-card">
        <div class="enquete-pergunta">📊 ${e.pergunta}</div>
        <div class="enquete-opcoes" id="opcoes-${e.id}">
          ${e.opcoes.map(op => {
            const votos = resultados.contagem[op] || 0;
            const pct = total > 0 ? Math.round((votos / total) * 100) : 0;
            return `<div class="enquete-opcao">
              <button onclick="votarEnquete(${e.id}, '${op.replace(/'/g,"\\'")}', '${aluno.email}', '${aluno.serie}')" class="btn-opcao-enquete">${op}</button>
              <div class="barra-resultado"><div class="barra-fill" style="width:${pct}%"></div></div>
              <span class="pct-resultado">${pct}% (${votos})</span>
            </div>`;
          }).join('')}
        </div>
        <div class="enquete-total">${total} voto(s)</div>
      </div>`;
    }
    container.innerHTML = html;
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
  const res = await fetch('/api/enquetes');
  const enquetes = await res.json();
  if (!enquetes.length) { container.innerHTML = '<p class="feature-vazia">Nenhuma enquete cadastrada.</p>'; return; }
  let html = '';
  for (const e of enquetes) {
    const resultados = await fetch(`/api/enquetes/${e.id}/resultados`).then(r => r.json());
    const total = resultados.total || 0;
    html += `<div class="feature-card admin-item">
      <div class="feature-card-header">
        <span><strong>${e.pergunta}</strong></span>
        <span>Turma: ${e.turma} | ${total} voto(s)</span>
      </div>
      <div style="margin-top:8px;">
        ${e.opcoes.map(op => {
          const votos = resultados.contagem[op] || 0;
          const pct = total > 0 ? Math.round((votos / total) * 100) : 0;
          return `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
            <span style="min-width:120px;font-size:0.9rem;">${op}</span>
            <div class="barra-resultado" style="flex:1;"><div class="barra-fill" style="width:${pct}%"></div></div>
            <span style="font-size:0.85rem;color:var(--text-secondary)">${pct}% (${votos})</span>
          </div>`;
        }).join('')}
      </div>
      <button onclick="deletarEnquete(${e.id})" class="btn-excluir-feature" style="margin-top:8px;">🗑 Excluir</button>
    </div>`;
  }
  container.innerHTML = html;
}

document.getElementById('btnCriarEnquete')?.addEventListener('click', async () => {
  const pergunta = document.getElementById('enquetePergunta').value.trim();
  const turma = document.getElementById('enqueteTurma').value;
  const opcoes = Array.from(document.querySelectorAll('.opcao-enquete-input')).map(i => i.value.trim()).filter(v => v);
  if (!pergunta || !turma || opcoes.length < 2) { showToast('Preencha pergunta, turma e pelo menos 2 opções.', 'error'); return; }
  const res = await fetch('/api/enquetes', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ pergunta, opcoes, turma, criado_por: 'Admin' }) });
  const result = await res.json();
  if (result.sucesso) {
    showToast('Enquete criada!', 'success');
    document.getElementById('enquetePergunta').value = '';
    document.getElementById('enqueteTurma').value = '';
    document.querySelectorAll('.opcao-enquete-input').forEach((el, i) => { el.value = ''; if (i >= 2) el.remove(); });
    carregarEnquetesAdmin();
  } else { showToast(result.erro || 'Erro.', 'error'); }
});

async function deletarEnquete(id) {
  if (!confirm('Excluir esta enquete e todos os votos?')) return;
  await fetch(`/api/enquetes/${id}`, { method: 'DELETE' });
  showToast('Enquete excluída.', 'success');
  carregarEnquetesAdmin();
}
