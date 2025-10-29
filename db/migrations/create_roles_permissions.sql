-- =====================================================================
-- db/migrations/create_roles_permissions.sql
-- Estrutura base de controle de permissões no ERP Fuzzue
-- =====================================================================
-- Tabelas:
--  - roles_permissions: relaciona role → permissão nominal
-- =====================================================================

CREATE TABLE roles_permissions (
    id SERIAL PRIMARY KEY,

    role            VARCHAR(50) NOT NULL,
    permissao       VARCHAR(120) NOT NULL,

    data_criacao    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ativo           BOOLEAN   DEFAULT TRUE
);

-- Índice para busca rápida
CREATE INDEX idx_roles_permissions_role ON roles_permissions(role);
