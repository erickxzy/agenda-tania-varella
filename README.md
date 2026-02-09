# 📚 Agenda Escolar Tânia Varella Ferreira

Sistema completo de gestão escolar para alunos, direção e administradores.

## 📁 Estrutura do Projeto

```
projeto/
├── backend/              # Servidor Node.js + Express
│   ├── server.js        # API e lógica do servidor
│   ├── package.json     # Dependências do backend
│   └── package-lock.json
│
├── frontend/            # Interface do usuário
│   ├── index.html      # Página principal
│   ├── script.js       # Lógica do cliente
│   └── style.css       # Estilos e tema claro/escuro
│
├── backups/            # Backups automáticos do banco
│   └── escola_backup_*.db
│
├── escola.db           # Banco de dados SQLite
├── escola.db-shm       # Arquivos temporários SQLite
├── escola.db-wal
│
└── README.md           # Esta documentação
```

## 🚀 Como Rodar

### Instalar Dependências

```bash
cd backend
npm install
```

### Iniciar o Servidor

```bash
# Na raiz do projeto
node backend/server.js
```

O servidor rodará em `http://localhost:5000`

## 🔐 Acesso ao Sistema

### Administrador
- **Usuário:** `admin@sistema.local`
- **Senha:** `admin1`

### Alunos
- Cadastro com e-mail terminando em `@escola.pr.gov.br`
- Escolha da turma: 1A, 1B, 1C, 1D, 2A, 2B, 2C, 3A, 3B, 3C

### Direção
- Cadastro com qualquer e-mail válido

## ✨ Funcionalidades

### Para Alunos
- 📅 Visualizar eventos da turma
- 🍽️ Consultar cardápio do dia
- 📢 Receber avisos (Quizizz, Khan Academy, Redação Paraná)
- 🔔 Sistema de notificações
- 🌙 Tema claro/escuro

### Para Administradores
- 👥 Gerenciar alunos
- 📋 Controlar presença de professores
- 🍱 Editar cardápio semanal
- ✏️ Criar, editar e excluir avisos
- 📊 Visualizar estatísticas
- 📅 Gerenciar eventos por turma

## 🛠️ Tecnologias

**Backend:**
- Node.js 20
- Express.js
- SQLite3 (better-sqlite3)
- bcryptjs (criptografia de senhas)

**Frontend:**
- HTML5
- CSS3 (com variáveis CSS para temas)
- JavaScript vanilla

## 💾 Backup Automático

- Backups criados automaticamente a cada 24 horas
- Mantém os 10 backups mais recentes
- Localização: `backups/escola_backup_*.db`

## 📝 Banco de Dados

O sistema utiliza SQLite com:
- WAL mode para melhor desempenho
- Foreign keys habilitadas
- Índices otimizados
- Triggers para atualização automática de timestamps
- Sistema de auditoria

### Tabelas Principais
- `alunos` - Dados dos estudantes
- `direcao` - Membros da direção
- `professores` - Cadastro de professores
- `professores_turma` - Presença por turma
- `eventos` - Eventos por série
- `cardapio` - Cardápio semanal
- `avisos` - Avisos e atividades
- `auditoria` - Log de alterações
- `estatisticas` - Dados estatísticos

## 🎨 Personalização

O sistema possui tema claro e escuro que pode ser alternado pelo botão no canto inferior direito.

## 👥 Criadores

- Erick Gustavo Dos Santos Gomes
- Adryan Kaick da Silva Cassula
- Victor Hugo Nunes da Costa
- Yasmin Victoria Gomes de Souza
