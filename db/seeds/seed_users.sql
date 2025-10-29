-- =====================================================================
-- db/seeds/seed_users.sql
-- Cria usuários iniciais do ERP Fuzzue para ambiente produtivo.
--
-- IMPORTANTE:
-- - Senhas neste seed estão em texto simples pois o backend atual
--   compara texto puro. Em produção real, substituir por hash/bcrypt.
-- - Perfis/roles pensados para cobrir áreas comuns de um ERP completo
--   (admin, vendas/PDV, compras/estoque, financeiro, diretoria, TI).
-- =====================================================================

-- ADMINISTRADOR GERAL
-- Acesso total ao sistema: configurações, cadastros, permissões.
INSERT INTO users (
    username,
    password_hash,
    full_name,
    email,
    role,
    is_active,
    data_criacao,
    ativo
) VALUES (
    'admin',
    'gbl12024',
    'Administrador do Sistema',
    'admin@empresa.local',
    'admin',
    TRUE,
    NOW(),
    TRUE
);

-- DIRETOR / CEO
-- Visualiza indicadores estratégicos, relatórios consolidados,
-- situação financeira, pipeline de vendas, posição de estoque,
-- sem necessariamente editar.
INSERT INTO users (
    username,
    password_hash,
    full_name,
    email,
    role,
    is_active,
    data_criacao,
    ativo
) VALUES (
    'diretoria',
    'diretoria123',
    'Diretoria Executiva',
    'diretoria@empresa.local',
    'executivo',
    TRUE,
    NOW(),
    TRUE
);

-- FINANCEIRO / CONTABILIDADE
-- Responsável por contas a pagar, contas a receber, conciliação,
-- faturamento, boletos, notas fiscais de saída.
INSERT INTO users (
    username,
    password_hash,
    full_name,
    email,
    role,
    is_active,
    data_criacao,
    ativo
) VALUES (
    'financeiro',
    'fin2024',
    'Financeiro / Contas & Faturamento',
    'financeiro@empresa.local',
    'financeiro',
    TRUE,
    NOW(),
    TRUE
);

-- COMPRAS / SUPRIMENTOS
-- Responsável por fornecedores, ordens de compra, negociação de custo,
-- atualização de custo e lead time.
INSERT INTO users (
    username,
    password_hash,
    full_name,
    email,
    role,
    is_active,
    data_criacao,
    ativo
) VALUES (
    'compras',
    'compras2024',
    'Setor de Compras e Suprimentos',
    'compras@empresa.local',
    'compras',
    TRUE,
    NOW(),
    TRUE
);

-- ESTOQUE / ALMOXARIFADO / LOGÍSTICA
-- Dá entrada de nota de compra, faz contagem, baixa estoque,
-- transfere entre depósitos, controla ruptura e inventário.
INSERT INTO users (
    username,
    password_hash,
    full_name,
    email,
    role,
    is_active,
    data_criacao,
    ativo
) VALUES (
    'estoque',
    'estoque2024',
    'Controle de Estoque e Logística',
    'estoque@empresa.local',
    'estoque',
    TRUE,
    NOW(),
    TRUE
);

-- COMERCIAL INTERNO / VENDAS B2B
-- Gera orçamentos, pedidos de venda, negocia condições comerciais,
-- acompanha status de proposta, funil de oportunidades (CRM).
INSERT INTO users (
    username,
    password_hash,
    full_name,
    email,
    role,
    is_active,
    data_criacao,
    ativo
) VALUES (
    'comercial',
    'vendas2024',
    'Comercial Interno / Vendas',
    'comercial@empresa.local',
    'vendas',
    TRUE,
    NOW(),
    TRUE
);

-- PDV / CAIXA
-- Operador de frente de loja. Pode registrar vendas no PDV,
-- finalizar pagamento, ver preços e estoque disponível para venda,
-- mas não pode acessar relatórios financeiros completos.
INSERT INTO users (
    username,
    password_hash,
    full_name,
    email,
    role,
    is_active,
    data_criacao,
    ativo
) VALUES (
    'pdv',
    'caixa2024',
    'Operador de Caixa PDV',
    'pdv@empresa.local',
    'pdv',
    TRUE,
    NOW(),
    TRUE
);

-- SUPORTE TÉCNICO / TI
-- Administra usuários, reset de senha, auditoria básica,
-- mas não atua em financeiro/compras. Papel importante no ERP.
INSERT INTO users (
    username,
    password_hash,
    full_name,
    email,
    role,
    is_active,
    data_criacao,
    ativo
) VALUES (
    'suporte',
    'ti2024',
    'Suporte Técnico / TI',
    'suporte@empresa.local',
    'suporte',
    TRUE,
    NOW(),
    TRUE
);

-- RH / PESSOAL (pensando no futuro)
-- Cadastro de colaboradores, controle de cargos, custo de mão de obra em projetos,
-- anexos de contrato, ponto, etc. (módulo futuro tipo "HRM").
INSERT INTO users (
    username,
    password_hash,
    full_name,
    email,
    role,
    is_active,
    data_criacao,
    ativo
) VALUES (
    'rh',
    'rh2024',
    'Recursos Humanos',
    'rh@empresa.local',
    'rh',
    TRUE,
    NOW(),
    TRUE
);

-- PROJETOS / SERVIÇOS (módulo de serviços/projetos tipo consultoria)
-- Gestão de entregáveis, tarefas, horas apontadas, status de contrato,
-- prazos de SLA. Inspirado no módulo "Projects / Tasks" de ERPs tipo Dolibarr.
INSERT INTO users (
    username,
    password_hash,
    full_name,
    email,
    role,
    is_active,
    data_criacao,
    ativo
) VALUES (
    'projetos',
    'proj2024',
    'Gestão de Projetos e Serviços',
    'projetos@empresa.local',
    'projetos',
    TRUE,
    NOW(),
    TRUE
);

-- CLIENTE / PORTAL EXTERNO (multi-empresa ou B2B futuro)
-- Acesso muito limitado: visualizar status de pedidos, NF emitida,
-- boletos em aberto, chamados de suporte.
-- Pode ou não estar ativo em produção inicial — mas já deixamos previsto.
INSERT INTO users (
    username,
    password_hash,
    full_name,
    email,
    role,
    is_active,
    data_criacao,
    ativo
) VALUES (
    'cliente_portal',
    'cliente2024',
    'Acesso Externo / Cliente Portal',
    'cliente.portal@empresa.local',
    'cliente_portal',
    TRUE,
    NOW(),
    TRUE
);

-- AUDITOR / COMPLIANCE
-- Somente leitura em financeiro, estoque, fiscal.
-- Importante para empresa que passa por auditoria externa / ISO / SOX.
INSERT INTO users (
    username,
    password_hash,
    full_name,
    email,
    role,
    is_active,
    data_criacao,
    ativo
) VALUES (
    'auditoria',
    'audit2024',
    'Auditoria / Compliance',
    'auditoria@empresa.local',
    'auditoria',
    TRUE,
    NOW(),
    TRUE
);
