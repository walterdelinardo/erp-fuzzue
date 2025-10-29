-- =====================================================================
-- db/seeds/seed_roles_permissions.sql
-- Permissões iniciais para cada papel do sistema.
-- Estas permissões serão usadas para controle fino de acesso
-- (futuro middleware e controle de interface).
-- =====================================================================

-- -------------------------
-- PERFIL: ADMIN
-- -------------------------
INSERT INTO roles_permissions (role, permissao) VALUES
('admin', 'sistema.configurar'),
('admin', 'usuarios.gerenciar'),
('admin', 'relatorios.ver_todos'),
('admin', 'financeiro.ver_tudo'),
('admin', 'compras.ver_tudo'),
('admin', 'estoque.ver_tudo'),
('admin', 'vendas.ver_tudo'),
('admin', 'pdv.usar'),
('admin', 'crm.ver'),
('admin', 'projetos.ver'),
('admin', 'rh.ver'),
('admin', 'auditoria.ver_logs'),
('admin', 'portal_clientes.ver_tudo');

-- -------------------------
-- PERFIL: EXECUTIVO / DIRETORIA
-- -------------------------
INSERT INTO roles_permissions (role, permissao) VALUES
('executivo', 'dashboard.ver_financeiro'),
('executivo', 'relatorios.ver_gerencial'),
('executivo', 'crm.ver_pipeline'),
('executivo', 'estoque.ver_resumo'),
('executivo', 'financeiro.ver_fluxo_caixa'),
('executivo', 'vendas.ver_resultado');

-- -------------------------
-- PERFIL: FINANCEIRO
-- -------------------------
INSERT INTO roles_permissions (role, permissao) VALUES
('financeiro', 'financeiro.ver_fluxo_caixa'),
('financeiro', 'financeiro.contas_receber'),
('financeiro', 'financeiro.contas_pagar'),
('financeiro', 'financeiro.concilia_bancaria'),
('financeiro', 'financeiro.emite_nfe'),
('financeiro', 'relatorios.financeiros');

-- -------------------------
-- PERFIL: COMPRAS
-- -------------------------
INSERT INTO roles_permissions (role, permissao) VALUES
('compras', 'fornecedores.ver'),
('compras', 'fornecedores.editar'),
('compras', 'ordens_compra.criar'),
('compras', 'ordens_compra.receber'),
('compras', 'estoque.dar_entrada'),
('compras', 'relatorios.compras');

-- -------------------------
-- PERFIL: ESTOQUE
-- -------------------------
INSERT INTO roles_permissions (role, permissao) VALUES
('estoque', 'estoque.ver'),
('estoque', 'estoque.lancar_entrada'),
('estoque', 'estoque.lancar_saida'),
('estoque', 'estoque.inventario'),
('estoque', 'produtos.editar_estoque'),
('estoque', 'relatorios.estoque');

-- -------------------------
-- PERFIL: COMERCIAL / VENDAS
-- -------------------------
INSERT INTO roles_permissions (role, permissao) VALUES
('vendas', 'clientes.ver'),
('vendas', 'pedidos.criar'),
('vendas', 'pedidos.editar'),
('vendas', 'pedidos.cancelar'),
('vendas', 'orcamentos.ver'),
('vendas', 'crm.ver_pipeline');

-- -------------------------
-- PERFIL: PDV
-- -------------------------
INSERT INTO roles_permissions (role, permissao) VALUES
('pdv', 'pdv.usar'),
('pdv', 'pdv.finalizar_venda'),
('pdv', 'pdv.aplicar_desconto'),
('pdv', 'pdv.cancelar_venda'),
('pdv', 'estoque.ver_saldo');

-- -------------------------
-- PERFIL: SUPORTE / TI
-- -------------------------
INSERT INTO roles_permissions (role, permissao) VALUES
('suporte', 'usuarios.ver'),
('suporte', 'usuarios.reset_senha'),
('suporte', 'sistema.auditar'),
('suporte', 'sistema.logs'),
('suporte', 'sistema.backup');

-- -------------------------
-- PERFIL: RH
-- -------------------------
INSERT INTO roles_permissions (role, permissao) VALUES
('rh', 'colaboradores.ver'),
('rh', 'colaboradores.editar'),
('rh', 'departamentos.ver'),
('rh', 'departamentos.editar'),
('rh', 'projetos.ver_equipes');

-- -------------------------
-- PERFIL: PROJETOS
-- -------------------------
INSERT INTO roles_permissions (role, permissao) VALUES
('projetos', 'projetos.ver'),
('projetos', 'projetos.criar'),
('projetos', 'projetos.editar'),
('projetos', 'projetos.apontar_horas'),
('projetos', 'projetos.concluir');

-- -------------------------
-- PERFIL: CLIENTE PORTAL
-- -------------------------
INSERT INTO roles_permissions (role, permissao) VALUES
('cliente_portal', 'portal.pedidos.ver'),
('cliente_portal', 'portal.faturas.ver'),
('cliente_portal', 'portal.suporte.ver'),
('cliente_portal', 'portal.boletos.ver');

-- -------------------------
-- PERFIL: AUDITORIA / COMPLIANCE
-- -------------------------
INSERT INTO roles_permissions (role, permissao) VALUES
('auditoria', 'financeiro.ver_fluxo_caixa'),
('auditoria', 'financeiro.ver_movimentos'),
('auditoria', 'estoque.ver_movimentacoes'),
('auditoria', 'compras.ver_historico'),
('auditoria', 'sistema.logs');
