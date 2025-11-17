# Agenda Escolar Tânia Varella Ferreira

## Visão Geral
Sistema de agenda escolar desenvolvido em Node.js com Express e PostgreSQL (Replit Database). Permite gerenciamento de eventos, cardápios, avisos e atividades para alunos e administração escolar.

## Estrutura do Projeto

O projeto está organizado com separação clara entre backend e frontend:

```
projeto/
├── backend/              # Servidor Node.js
│   ├── server.js        # API Express (porta 5000)
│   ├── db/              # Configuração do banco de dados
│   │   ├── config.js    # Conexão PostgreSQL
│   │   ├── migrations.js # Schema do banco
│   │   ├── seed.js      # Dados iniciais
│   │   └── helpers.js   # Funções auxiliares
│   ├── package.json     # Dependências do backend
│   └── package-lock.json
├── frontend/            # Interface do usuário
│   ├── index.html       # Página principal
│   ├── script.js        # Lógica do cliente
│   └── style.css        # Estilos da aplicação
└── README.md            # Documentação completa
```

## Tecnologias
- Node.js 20
- Express 5.1.0
- PostgreSQL (Replit Database via pg)
- bcryptjs (autenticação)
- Frontend: HTML/CSS/JavaScript vanilla

## Funcionalidades

### Para Alunos
- Login por turma específica (1A, 1B, 1C, 1D, 2A, 2B, 2C, 3A, 3B, 3C)
- Visualização de eventos da turma
- Acesso ao cardápio escolar
- Avisos e atividades (Quizizz, Khan Academy, Redação Paraná)
- Sistema de notificações
- Tema claro/escuro

### Para Administração
- Painel administrativo completo
- Gerenciamento de eventos por série
- Edição do cardápio semanal
- Controle de presença/falta de professores por turma
- Gerenciamento de avisos e atividades
- Visualização e exclusão de alunos cadastrados

## Turmas e Professores
O sistema gerencia 10 turmas com 127 professores distribuídos:
- **1º Ano**: Turmas A, B, C, D (51 professores)
- **2º Ano**: Turmas A, B, C (37 professores)
- **3º Ano**: Turmas A, B, C (39 professores)

### Gestão de Professores
- Registro de presença/falta por turma
- Data de registro automática
- Interface com tabela interativa
- Atualização em tempo real

## Banco de Dados

O sistema utiliza PostgreSQL (Replit Database) para armazenamento persistente e escalável. As migrations e seeds são executados automaticamente na primeira configuração.

### Tabelas Principais
- `alunos` - Dados dos alunos com autenticação
- `direcao` - Membros da direção escolar
- `eventos` - Eventos escolares por série/turma
- `cardapio` - Cardápio semanal
- `professores` - Professores gerais
- `professores_turma` - Professores por turma com controle de presença
- `avisos` - Avisos e atividades (Quizizz, Khan Academy, Redação)
- `recuperacao_senha` - Sistema de recuperação de senha
- `logs_login` - Auditoria de logins
- `auditoria` - Logs de operações do sistema
- `estatisticas` - Métricas gerais do sistema

### Configuração do Banco
O banco de dados PostgreSQL é gerenciado pelo Replit e está disponível através da variável de ambiente `DATABASE_URL`. Para executar migrations e seeds manualmente:

```bash
cd backend
node db/migrations.js  # Criar tabelas
node db/seed.js       # Popular dados iniciais
```

## APIs REST

### Alunos e Autenticação
- `POST /api/cadastrar` - Cadastro de aluno
- `POST /api/login` - Login de aluno
- `POST /api/cadastrar-direcao` - Cadastro direção
- `POST /api/login-direcao` - Login direção
- `POST /api/recuperar-senha` - Solicitar código
- `POST /api/resetar-senha` - Redefinir senha
- `GET /api/alunos` - Listar alunos
- `DELETE /api/alunos/:id` - Excluir aluno

### Eventos e Cardápio
- `GET /api/eventos/:serie` - Eventos por série
- `POST /api/eventos` - Criar evento
- `PUT /api/eventos/:id` - Atualizar evento
- `DELETE /api/eventos/:id` - Deletar evento
- `GET /api/cardapio/:dia` - Cardápio do dia
- `PUT /api/cardapio/:dia` - Atualizar cardápio

### Professores
- `GET /api/professores` - Professores gerais
- `PUT /api/professores/:id` - Atualizar professor
- `GET /api/turmas` - Listar turmas
- `GET /api/professores-turma` - Todos os professores por turma
- `GET /api/professores-turma/:turma` - Professores de uma turma
- `PUT /api/professores-turma/:id` - Atualizar status do professor

### Avisos
- `GET /api/avisos` - Listar avisos
- `POST /api/avisos` - Criar aviso
- `PUT /api/avisos/:id` - Atualizar aviso
- `DELETE /api/avisos/:id` - Deletar aviso

## Executar o Projeto
O workflow "webserver" está configurado para rodar automaticamente:
```bash
node server.js
```

O servidor iniciará na porta 5000 e criará/populará o banco de dados automaticamente.

## Estrutura de Arquivos
```
.
├── server.js               # Servidor Express + APIs
├── escola.db               # Banco SQLite
├── package.json            # Dependências
├── package-lock.json
├── .gitignore
├── replit.md              # Documentação
└── public/                # Frontend
    ├── index.html         # Interface
    ├── script.js          # JavaScript
    ├── style.css          # Estilos
    └── *.png              # Imagens
```

## Segurança
- Senhas criptografadas com bcryptjs (hash bcrypt)
- Validação de e-mails com domínio escolar
- Sistema de recuperação de senha com código de 6 dígitos
- Códigos expiram em 15 minutos
- Prepared statements no PostgreSQL (proteção contra SQL injection)
- Pool de conexões gerenciado para performance
- Auditoria completa de operações críticas

## Criadores
- Erick Gustavo Dos Santos Gomes
- Adryan Kaick da Silva Cassula
- Victor Hugo Nunes da Costa
- Sophia Monteiro de Paula

## Última Atualização
17 de Novembro de 2025 - Migração para PostgreSQL:
- Sistema migrado de SQLite para PostgreSQL (Replit Database)
- Implementação de migrations e seeds automatizados
- Pool de conexões PostgreSQL para melhor performance
- Queries otimizadas para PostgreSQL com sintaxe parametrizada
- Todas as 28 rotas da API mantidas e funcionando
- Sistema de auditoria e logs aprimorado
- Backup e rollback gerenciado pelo Replit Database

01 de Novembro de 2025 - Correções no painel administrativo:
- Eventos agora exibidos por turma específica (1A-1D, 2A-2C, 3A-3C) ao invés de séries genéricas
- Corrigido status de professores: agora usa "Falta" ao invés de "Ausente" para compatibilidade com o banco de dados
- Sistema de presença/falta de professores funcionando corretamente
