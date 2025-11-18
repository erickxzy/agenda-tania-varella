import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  text,
  boolean,
} from "drizzle-orm/pg-core";

// Session storage table for Replit Auth
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 20 }), // aluno, direcao, admin
  serie: varchar("serie", { length: 10 }), // 1A, 1B, etc (apenas para alunos)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Existing schema tables for school management system
export const alunos = pgTable("alunos", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  senha: varchar("senha", { length: 255 }).notNull(),
  serie: varchar("serie", { length: 50 }).notNull(),
  ativo: integer("ativo").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eventos = pgTable("eventos", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  serie: varchar("serie", { length: 50 }).notNull(),
  descricao: text("descricao").notNull(),
  dataEvento: varchar("data_evento", { length: 10 }).notNull(),
  ativo: integer("ativo").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cardapio = pgTable("cardapio", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  diaSemana: varchar("dia_semana", { length: 20 }).notNull(),
  prato: varchar("prato", { length: 255 }).notNull(),
  acompanhamento: varchar("acompanhamento", { length: 255 }),
  sobremesa: varchar("sobremesa", { length: 255 }),
  bebida: varchar("bebida", { length: 255 }),
  calorias: integer("calorias"),
  vegetariano: integer("vegetariano").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const professores = pgTable("professores", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  nome: varchar("nome", { length: 255 }).notNull(),
  materia: varchar("materia", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }),
  data: varchar("data", { length: 10 }),
  ativo: integer("ativo").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const avisos = pgTable("avisos", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tipo: varchar("tipo", { length: 50 }).notNull(),
  professor: varchar("professor", { length: 255 }),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao").notNull(),
  dataAviso: varchar("data_aviso", { length: 10 }),
  lido: integer("lido").default(0),
  ativo: integer("ativo").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const professoresTurma = pgTable("professores_turma", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  turma: varchar("turma", { length: 50 }).notNull(),
  professor: varchar("professor", { length: 255 }).notNull(),
  materia: varchar("materia", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }),
  data: varchar("data", { length: 10 }),
  observacao: text("observacao"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const logsLogin = pgTable("logs_login", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  alunoId: integer("aluno_id"),
  nome: varchar("nome", { length: 255 }),
  email: varchar("email", { length: 255 }),
  turma: varchar("turma", { length: 50 }),
  ipAddress: varchar("ip_address", { length: 100 }),
  userAgent: text("user_agent"),
  dataHora: timestamp("data_hora").defaultNow(),
});

export const auditoria = pgTable("auditoria", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tabela: varchar("tabela", { length: 100 }).notNull(),
  operacao: varchar("operacao", { length: 50 }).notNull(),
  registroId: integer("registro_id"),
  dadosAntigos: jsonb("dados_antigos"),
  dadosNovos: jsonb("dados_novos"),
  usuario: varchar("usuario", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const direcao = pgTable("direcao", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  senha: varchar("senha", { length: 255 }).notNull(),
  ativo: integer("ativo").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const recuperacaoSenha = pgTable("recuperacao_senha", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: varchar("email", { length: 255 }).notNull(),
  codigo: varchar("codigo", { length: 10 }).notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(),
  expira: timestamp("expira").notNull(),
  usado: integer("usado").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
