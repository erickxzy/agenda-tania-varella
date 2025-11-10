# Agenda Escolar Tânia Varella Ferreira

## Visão Geral
Sistema de agenda escolar desenvolvido em Node.js com Express e SQLite. Permite gerenciamento de eventos, cardápios, avisos e atividades para alunos e administração escolar.

## Estrutura do Projeto

O projeto está organizado com separação clara entre backend e frontend:

```
projeto/
├── backend/              # Servidor Node.js
│   ├── server.js        # API Express (porta 5000)
│   ├── package.json     # Dependências do backend
│   └── package-lock.json
├── frontend/            # Interface do usuário
│   ├── index.html       # Página principal
│   ├── script.js        # Lógica do cliente
│   └── style.css        # Estilos da aplicação
├── backups/             # Backups automáticos do banco
├── escola.db            # Banco de dados SQLite
└── README.md            # Documentação completa
```

## Tecnologias
- Node.js 20
- Express 5.1.0
- SQLite (better-sqlite3)
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

### Tabelas Principais
- `alunos` - Dados dos alunos
- `direcao` - Membros da direção
- `eventos` - Eventos escolares por série
- `cardapio` - Cardápio semanal
- `professores` - Professores gerais (legado)
- `professores_turma` - Professores por turma com status de presença
- `avisos` - Avisos e atividades
- `recuperacao_senha` - Sistema de recuperação de senha

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
- Senhas criptografadas com bcryptjs
- Validação de e-mails (@escola.pr.gov.br)
- Sistema de recuperação de senha com código de 6 dígitos
- Códigos expiram em 30 minutos
- Prepared statements no SQLite (proteção SQL injection)

## Criadores
- Erick Gustavo Dos Santos Gomes
- Adryan Kaick da Silva Cassula
- Victor Hugo Nunes da Costa
- Sophia Monteiro de Paula

## Última Atualização
01 de Novembro de 2025 - Correções no painel administrativo:
- Eventos agora exibidos por turma específica (1A-1D, 2A-2C, 3A-3C) ao invés de séries genéricas
- Corrigido status de professores: agora usa "Falta" ao invés de "Ausente" para compatibilidade com o banco de dados
- Sistema de presença/falta de professores funcionando corretamente
