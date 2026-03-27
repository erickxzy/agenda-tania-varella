# Agenda Escolar Tânia Varella Ferreira

## Visão Geral
Sistema de agenda escolar desenvolvido em Node.js com Express e Supabase. Permite gerenciamento de eventos, cardápios, avisos e atividades para alunos e administração escolar.

## Estrutura do Projeto

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
```

## Tecnologias
- Node.js 20
- Express 5.x
- Supabase (banco de dados PostgreSQL na nuvem)
- bcryptjs (autenticação)
- Frontend: HTML/CSS/JavaScript vanilla

## Variáveis de Ambiente
- `SUPABASE_URL` - URL do projeto Supabase
- `SUPABASE_ANON_KEY` - Chave pública do Supabase

## Tabelas no Supabase

| Tabela Supabase   | Função                              |
|-------------------|-------------------------------------|
| `Cadastro_Aluno`  | Alunos cadastrados                  |
| `Login_Direção`   | Membros da direção                  |
| `Conteudos`       | Eventos escolares por série         |
| `Cardapio`        | Cardápio semanal                    |
| `Professores`     | Professores gerais                  |
| `Presenças`       | Professores por turma com presença  |
| `Avisos`          | Avisos e atividades                 |
| `recuperacao_senha` | Recuperação de senha              |
| `Logs`            | Logs de login dos alunos            |
| `provas`          | Calendário de provas/trabalhos      |
| `duvidas`         | Dúvidas dos alunos por turma        |
| `tarefas`         | Tarefas com prazo de entrega        |
| `tarefas_concluidas` | Tarefas marcadas como feitas     |
| `enquetes`        | Enquetes rápidas por turma          |
| `votos`           | Votos dos alunos nas enquetes       |

## Funcionalidades

### Para Alunos
- Login por turma específica (1A, 1B, 1C, 1D, 2A, 2B, 2C, 3A, 3B, 3C)
- Visualização de eventos da turma
- Acesso ao cardápio escolar
- Avisos e atividades (Quizizz, Khan Academy, Redação Paraná)
- Sistema de notificações
- Tema claro/escuro
- **Calendário de Provas** — visualiza provas da turma com contagem regressiva
- **Chat de Dúvidas** — envia dúvidas e vê respostas do professor
- **Controle de Tarefas** — vê tarefas e marca como concluídas
- **Enquetes Rápidas** — vota em enquetes e vê resultados em tempo real

### Para Administração
- Painel administrativo completo
- Gerenciamento de eventos por série
- Edição do cardápio semanal
- Controle de presença/falta de professores por turma
- Gerenciamento de avisos e atividades
- Visualização e exclusão de alunos cadastrados
- **Provas** — cadastra provas/trabalhos por turma e data
- **Dúvidas** — visualiza e responde dúvidas dos alunos
- **Tarefas** — cria tarefas com prazo de entrega por turma
- **Enquetes** — cria enquetes com múltiplas opções e vê resultados

## Turmas
1A, 1B, 1C, 1D, 2A, 2B, 2C, 3A, 3B, 3C

## APIs REST

### Autenticação
- `POST /api/cadastrar` - Cadastro de aluno
- `POST /api/login` - Login de aluno
- `POST /api/cadastrar-direcao` - Cadastro direção
- `POST /api/login-direcao` - Login direção
- `POST /api/recuperar-senha` - Solicitar código de recuperação
- `POST /api/resetar-senha` - Redefinir senha

### Alunos
- `GET /api/alunos` - Listar alunos
- `DELETE /api/alunos/:id` - Excluir aluno

### Eventos
- `GET /api/eventos/:serie` - Eventos por série
- `GET /api/eventos` - Todos os eventos
- `POST /api/eventos` - Criar evento
- `PUT /api/eventos/:id` - Atualizar evento
- `DELETE /api/eventos/:id` - Deletar evento

### Cardápio
- `GET /api/cardapio/:dia` - Cardápio do dia
- `PUT /api/cardapio/:dia` - Atualizar cardápio

### Professores
- `GET /api/professores` - Professores gerais
- `PUT /api/professores/:id` - Atualizar professor
- `GET /api/turmas` - Listar turmas
- `GET /api/professores-turma` - Todos os professores por turma
- `GET /api/professores-turma/:turma` - Professores de uma turma
- `PUT /api/professores-turma/:id` - Atualizar presença do professor

### Avisos
- `GET /api/avisos` - Listar avisos
- `POST /api/avisos` - Criar aviso
- `PUT /api/avisos/:id` - Atualizar aviso
- `DELETE /api/avisos/:id` - Deletar aviso

### Outros
- `GET /api/logs` - Logs de acesso
- `GET /api/estatisticas` - Estatísticas gerais

## Segurança
- Senhas criptografadas com bcryptjs
- Validação de e-mails (@escola.pr.gov.br para alunos)
- Sistema de recuperação de senha com código de 6 dígitos
- Códigos expiram em 30 minutos

## Criadores
- Erick Gustavo Dos Santos Gomes
- Adryan Kaick da Silva Cassula
- Victor Hugo Nunes da Costa
- Yasmin Victoria Gomes de Souza
