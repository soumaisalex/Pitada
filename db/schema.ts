import {
  pgTable,
  uuid,
  text,
  boolean,
  numeric,
  timestamp,
  integer,
  varchar,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

// ---------- Enums ----------
export const statusUsuarioEnum = pgEnum("status_usuario", ["ativo", "suspenso"]);
export const statusLojaEnum = pgEnum("status_loja", ["pendente", "aprovada", "reprovada", "suspensa"]);
export const statusEventoEnum = pgEnum("status_evento", ["agendado", "em_andamento", "encerrado"]);
export const statusParticipacaoEnum = pgEnum("status_participacao", ["confirmado", "cancelado"]);
export const tipoTransacaoEnum = pgEnum("tipo_transacao", ["credito_pix", "compra", "saque", "cancelamento"]);
export const statusTransacaoEnum = pgEnum("status_transacao", ["pendente", "concluida", "cancelada", "expirada"]);
export const tipoAvaliacaoEnum = pgEnum("tipo_avaliacao", ["produto", "loja"]);

// ---------- Tabelas ----------

export const usuarios = pgTable("usuarios", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  primeiroNome: text("primeiro_nome").notNull(),
  email: text("email").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  telefone: text("telefone"),
  chavePix: text("chave_pix"),
  isLojista: boolean("is_lojista").default(false).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  saldoPitadas: numeric("saldo_pitadas", { precision: 12, scale: 2 }).default("0").notNull(),
  status: statusUsuarioEnum("status").default("ativo").notNull(),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

export const lojas = pgTable("lojas", {
  id: uuid("id").defaultRandom().primaryKey(),
  usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id),
  nomeLoja: text("nome_loja").notNull(),
  logoUrl: text("logo_url"),
  status: statusLojaEnum("status").default("pendente").notNull(),
  aprovadoPor: uuid("aprovado_por").references(() => usuarios.id),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

export const categorias = pgTable("categorias", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  nome: text("nome").notNull().unique(),
});

export const produtos = pgTable("produtos", {
  id: uuid("id").defaultRandom().primaryKey(),
  lojaId: uuid("loja_id").notNull().references(() => lojas.id),
  categoriaId: integer("categoria_id").notNull().references(() => categorias.id),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  valorPitadas: numeric("valor_pitadas", { precision: 12, scale: 2 }).notNull(),
  fotoUrl: text("foto_url"),
  ativo: boolean("ativo").default(true).notNull(),
  codigoEstatico: varchar("codigo_estatico", { length: 6 }).unique(),
});

export const eventos = pgTable("eventos", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  dataInicio: timestamp("data_inicio").notNull(),
  dataFim: timestamp("data_fim").notNull(),
  status: statusEventoEnum("status").default("agendado").notNull(),
  criadoPor: uuid("criado_por").notNull().references(() => usuarios.id),
});

export const participacoesEvento = pgTable("participacoes_evento", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventoId: uuid("evento_id").notNull().references(() => eventos.id),
  lojaId: uuid("loja_id").notNull().references(() => lojas.id),
  status: statusParticipacaoEnum("status").default("confirmado").notNull(),
  confirmadoEm: timestamp("confirmado_em").defaultNow().notNull(),
});

export const transacoes = pgTable("transacoes", {
  id: uuid("id").defaultRandom().primaryKey(),
  codigo: varchar("codigo", { length: 6 }).notNull().unique(),
  tipo: tipoTransacaoEnum("tipo").notNull(),
  usuarioOrigemId: uuid("usuario_origem_id").references(() => usuarios.id),
  usuarioDestinoId: uuid("usuario_destino_id").references(() => usuarios.id),
  eventoId: uuid("evento_id").references(() => eventos.id),
  valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
  taxaPix: numeric("taxa_pix", { precision: 12, scale: 2 }).default("0").notNull(),
  status: statusTransacaoEnum("status").default("pendente").notNull(),
  expiraEm: timestamp("expira_em"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

export const itensTransacao = pgTable("itens_transacao", {
  id: uuid("id").defaultRandom().primaryKey(),
  transacaoId: uuid("transacao_id").notNull().references(() => transacoes.id),
  produtoId: uuid("produto_id").notNull().references(() => produtos.id),
  quantidade: integer("quantidade").default(1).notNull(),
  valorUnitario: numeric("valor_unitario", { precision: 12, scale: 2 }).notNull(),
});

export const cancelamentos = pgTable("cancelamentos", {
  id: uuid("id").defaultRandom().primaryKey(),
  transacaoId: uuid("transacao_id").notNull().references(() => transacoes.id),
  iniciadoPor: uuid("iniciado_por").notNull().references(() => usuarios.id),
  motivo: text("motivo").notNull(),
  confirmadoComSenha: boolean("confirmado_com_senha").default(false).notNull(),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

export const avaliacoes = pgTable("avaliacoes", {
  id: uuid("id").defaultRandom().primaryKey(),
  transacaoId: uuid("transacao_id").notNull().references(() => transacoes.id),
  tipo: tipoAvaliacaoEnum("tipo").notNull(),
  produtoId: uuid("produto_id").references(() => produtos.id),
  lojaId: uuid("loja_id").notNull().references(() => lojas.id),
  nota: integer("nota").notNull(),
  comentario: varchar("comentario", { length: 50 }),
  apelidoExibido: text("apelido_exibido").notNull(),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

export const configuracoes = pgTable("configuracoes", {
  chave: text("chave").primaryKey(),
  valor: text("valor").notNull(),
  descricao: text("descricao"),
});

export const logsAuditoria = pgTable("logs_auditoria", {
  id: uuid("id").defaultRandom().primaryKey(),
  adminId: uuid("admin_id").references(() => usuarios.id),
  acao: text("acao").notNull(),
  entidade: text("entidade").notNull(),
  entidadeId: text("entidade_id"),
  detalhes: jsonb("detalhes"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});
