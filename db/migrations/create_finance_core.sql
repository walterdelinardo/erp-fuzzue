-- =====================================================================
-- db/migrations/create_finance_core.sql
-- Módulo Financeiro Profissional - ERP Fuzzue
-- =====================================================================
-- IMPORTANTE:
-- - Multi-filial
-- - Multi-conta (caixa físico, banco, PIX)
-- - Contas a pagar / receber com rateio
-- - Auditoria
-- =====================================================================

-- =========================================================
-- 1. company_units
-- Filiais / CNPJs / Lojas / Centros de resultado
-- =========================================================
CREATE TABLE company_units (
    id SERIAL PRIMARY KEY,

    trade_name          VARCHAR(200) NOT NULL,   -- "Fuzzue Loja Centro"
    legal_name          VARCHAR(255),            -- Razão social
    cnpj                VARCHAR(20),             -- CNPJ
    state_registration  VARCHAR(30),             -- inscrição estadual
    city_registration   VARCHAR(30),             -- inscrição municipal
    address             TEXT,
    city                VARCHAR(100),
    state               VARCHAR(2),

    is_active           BOOLEAN DEFAULT TRUE,

    data_criacao        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao    TIMESTAMP,
    ativo               BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_company_units_trade_name ON company_units(trade_name);
CREATE INDEX idx_company_units_cnpj       ON company_units(cnpj);


-- =========================================================
-- 2. cash_accounts
-- Contas/carteiras financeiras por unidade
-- Pode ser: caixa físico, conta bancária, carteira Pix, cofre etc.
-- =========================================================
CREATE TABLE cash_accounts (
    id SERIAL PRIMARY KEY,

    unit_id             INTEGER NOT NULL,        -- FK company_units.id
    name                VARCHAR(100) NOT NULL,   -- "Caixa Loja Centro", "Itaú PJ", "PIX Matriz"
    account_type        VARCHAR(30) NOT NULL,    -- 'cash' | 'bank' | 'pix' | 'card_gateway' | ...

    bank_info           VARCHAR(200),            -- opcional: agência/conta/banco
    initial_balance     NUMERIC(14,2) DEFAULT 0, -- saldo inicial configurado
    is_active           BOOLEAN DEFAULT TRUE,

    data_criacao        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao    TIMESTAMP,
    ativo               BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_cash_accounts_unit_id ON cash_accounts(unit_id);

ALTER TABLE cash_accounts
    ADD CONSTRAINT fk_cash_accounts_unit
    FOREIGN KEY (unit_id)
    REFERENCES company_units(id)
    ON DELETE RESTRICT;


-- =========================================================
-- 3. finance_cost_centers
-- Centros de custo / áreas para rateio (Marketing, Logística, Operação Loja X...)
-- =========================================================
CREATE TABLE finance_cost_centers (
    id SERIAL PRIMARY KEY,

    name                VARCHAR(120) NOT NULL,  -- "Marketing", "Operação Loja Centro"
    description         TEXT,
    is_active           BOOLEAN DEFAULT TRUE,

    data_criacao        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao    TIMESTAMP,
    ativo               BOOLEAN DEFAULT TRUE
);

CREATE UNIQUE INDEX idx_finance_cost_centers_name ON finance_cost_centers(name);


-- =========================================================
-- 4. accounts_payable
-- Contas a pagar (fornecedores, despesas fixas, impostos etc.)
--
-- status:
--   'open'         (lançado, não pago)
--   'partial'      (parcialmente pago)
--   'paid'         (pago 100%)
--   'canceled'     (cancelado)
--
-- payment_method:
--   'pix', 'boleto', 'transferencia', 'dinheiro', 'cartao', 'outro'
--
-- Cada título pertence a UMA unidade (filial) e preferencialmente
-- será pago de UMA conta financeira específica.
-- =========================================================
CREATE TABLE accounts_payable (
    id SERIAL PRIMARY KEY,

    unit_id             INTEGER NOT NULL,          -- FK company_units.id (qual filial contraiu essa despesa)
    supplier_id         INTEGER,                   -- FK suppliers.id (pode ser NULL p/ coisas tipo aluguel)
    description         TEXT NOT NULL,             -- "Compra de camisetas", "Aluguel Setembro", "Energia Loja A"
    due_date            DATE NOT NULL,             -- vencimento
    amount_total        NUMERIC(14,2) NOT NULL,    -- valor total devido
    amount_paid         NUMERIC(14,2) DEFAULT 0,   -- quanto já foi pago
    status              VARCHAR(20) NOT NULL DEFAULT 'open',

    payment_method      VARCHAR(30),               -- planejado ou realizado (pix, boleto, etc)
    cash_account_id     INTEGER,                   -- de qual conta vamos/foi pagar
    notes_internal      TEXT,

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by          INTEGER,                   -- FK users.id

    paid_at             TIMESTAMP,                 -- quando quitou total
    updated_at          TIMESTAMP,

    data_criacao        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao    TIMESTAMP,
    ativo               BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_ap_unit_id     ON accounts_payable(unit_id);
CREATE INDEX idx_ap_supplier_id ON accounts_payable(supplier_id);
CREATE INDEX idx_ap_status      ON accounts_payable(status);
CREATE INDEX idx_ap_due_date    ON accounts_payable(due_date);

ALTER TABLE accounts_payable
    ADD CONSTRAINT fk_ap_unit
    FOREIGN KEY (unit_id)
    REFERENCES company_units(id)
    ON DELETE RESTRICT;

ALTER TABLE accounts_payable
    ADD CONSTRAINT fk_ap_supplier
    FOREIGN KEY (supplier_id)
    REFERENCES suppliers(id)
    ON DELETE SET NULL;

ALTER TABLE accounts_payable
    ADD CONSTRAINT fk_ap_cash_account
    FOREIGN KEY (cash_account_id)
    REFERENCES cash_accounts(id)
    ON DELETE SET NULL;


-- =========================================================
-- 5. accounts_receivable
-- Contas a receber (clientes, vendas a prazo, faturas emitidas)
--
-- status:
--   'open'
--   'partial'
--   'received'
--   'canceled'
--
-- customer_name: ainda não temos tabela customers, então guardamos texto
-- unit_id: de qual filial foi essa venda/recebível
-- =========================================================
CREATE TABLE accounts_receivable (
    id SERIAL PRIMARY KEY,

    unit_id             INTEGER NOT NULL,         -- FK company_units.id
    sale_id             INTEGER,                  -- FK sales.id (pode ser NULL, ex: serviço)
    customer_name       VARCHAR(200),
    description         TEXT NOT NULL,            -- "Venda PDV 123", "Serviço manutenção equipamento"
    due_date            DATE NOT NULL,
    amount_total        NUMERIC(14,2) NOT NULL,
    amount_received     NUMERIC(14,2) DEFAULT 0,
    status              VARCHAR(20) NOT NULL DEFAULT 'open',

    receive_method      VARCHAR(30),              -- dinheiro, pix, cartão, boleto, etc
    cash_account_id     INTEGER,                  -- conta onde o dinheiro cai
    notes_internal      TEXT,

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by          INTEGER,                  -- FK users.id

    received_at         TIMESTAMP,                -- quando quitou total
    updated_at          TIMESTAMP,

    data_criacao        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao    TIMESTAMP,
    ativo               BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_ar_unit_id   ON accounts_receivable(unit_id);
CREATE INDEX idx_ar_status    ON accounts_receivable(status);
CREATE INDEX idx_ar_due_date  ON accounts_receivable(due_date);

ALTER TABLE accounts_receivable
    ADD CONSTRAINT fk_ar_unit
    FOREIGN KEY (unit_id)
    REFERENCES company_units(id)
    ON DELETE RESTRICT;

ALTER TABLE accounts_receivable
    ADD CONSTRAINT fk_ar_sale
    FOREIGN KEY (sale_id)
    REFERENCES sales(id)
    ON DELETE SET NULL;

ALTER TABLE accounts_receivable
    ADD CONSTRAINT fk_ar_cash_account
    FOREIGN KEY (cash_account_id)
    REFERENCES cash_accounts(id)
    ON DELETE SET NULL;


-- =========================================================
-- 6. cash_movements
-- Movimento de dinheiro em cada conta/caixa
--
-- Esse é o extrato interno do sistema.
-- Vai alimentar conciliação bancária e fechamento de caixa.
--
-- type:
--   'in'  (entrada)
--   'out' (saída)
--
-- origin_type / origin_id:
--   Ex: ('accounts_receivable', 91)
--       ('accounts_payable',   45)
--       ('manual_adjustment',  null)
--       ('cash_transfer',      <id da transferência>)
--
-- Depois podemos usar isso para conciliar com o extrato bancário real.
-- =========================================================
CREATE TABLE cash_movements (
    id SERIAL PRIMARY KEY,

    cash_account_id     INTEGER NOT NULL,        -- conta/caixa afetada
    unit_id             INTEGER NOT NULL,        -- redundância pra consultas rápidas

    type                VARCHAR(10) NOT NULL,    -- 'in' | 'out'
    amount              NUMERIC(14,2) NOT NULL,  -- valor movimentado +/-
    description         TEXT NOT NULL,           -- "Recebimento venda PDV", "Pagamento fornecedor X"
    occurred_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    origin_type         VARCHAR(50),             -- referência lógica
    origin_id           INTEGER,                 -- referência numérica

    created_by          INTEGER,                 -- FK users.id (quem registrou)
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    data_criacao        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao    TIMESTAMP,
    ativo               BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_cm_cash_account_id ON cash_movements(cash_account_id);
CREATE INDEX idx_cm_unit_id        ON cash_movements(unit_id);
CREATE INDEX idx_cm_type           ON cash_movements(type);
CREATE INDEX idx_cm_occurred_at    ON cash_movements(occurred_at);

ALTER TABLE cash_movements
    ADD CONSTRAINT fk_cm_cash_account
    FOREIGN KEY (cash_account_id)
    REFERENCES cash_accounts(id)
    ON DELETE RESTRICT;

ALTER TABLE cash_movements
    ADD CONSTRAINT fk_cm_unit
    FOREIGN KEY (unit_id)
    REFERENCES company_units(id)
    ON DELETE RESTRICT;


-- =========================================================
-- 7. Rateio por Centro de Custo
-- (Muitas empresas rateiam uma mesma despesa entre Marketing / Operação etc.)
--
-- Exemplo:
--   um aluguel da matriz pode ser 40% Administrativo, 60% Logística.
--
-- Para pagar várias áreas, criamos tabelas que ligam cada título financeiro
-- a N centros de custo com percentuais/valores.
-- =========================================================

CREATE TABLE accounts_payable_allocations (
    id SERIAL PRIMARY KEY,

    accounts_payable_id     INTEGER NOT NULL,
    cost_center_id          INTEGER NOT NULL,

    amount_allocated        NUMERIC(14,2) NOT NULL,   -- quanto deste título vai pra esse centro de custo
    percentage_allocated    NUMERIC(6,2),             -- opcional: % do total

    data_criacao            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao        TIMESTAMP,
    ativo                   BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_apa_ap_id ON accounts_payable_allocations(accounts_payable_id);

ALTER TABLE accounts_payable_allocations
    ADD CONSTRAINT fk_apa_ap
    FOREIGN KEY (accounts_payable_id)
    REFERENCES accounts_payable(id)
    ON DELETE CASCADE;

ALTER TABLE accounts_payable_allocations
    ADD CONSTRAINT fk_apa_cc
    FOREIGN KEY (cost_center_id)
    REFERENCES finance_cost_centers(id)
    ON DELETE RESTRICT;


CREATE TABLE accounts_receivable_allocations (
    id SERIAL PRIMARY KEY,

    accounts_receivable_id  INTEGER NOT NULL,
    cost_center_id          INTEGER NOT NULL,

    amount_allocated        NUMERIC(14,2) NOT NULL,
    percentage_allocated    NUMERIC(6,2),

    data_criacao            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao        TIMESTAMP,
    ativo                   BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_ara_ar_id ON accounts_receivable_allocations(accounts_receivable_id);

ALTER TABLE accounts_receivable_allocations
    ADD CONSTRAINT fk_ara_ar
    FOREIGN KEY (accounts_receivable_id)
    REFERENCES accounts_receivable(id)
    ON DELETE CASCADE;

ALTER TABLE accounts_receivable_allocations
    ADD CONSTRAINT fk_ara_cc
    FOREIGN KEY (cost_center_id)
    REFERENCES finance_cost_centers(id)
    ON DELETE RESTRICT;


-- =========================================================
-- 8. finance_audit_log
-- Trilha de auditoria de edições financeiras
--
-- Ex.: "usuário X mudou status de payable 45 de open -> paid às 2025-10-29"
-- =========================================================
CREATE TABLE finance_audit_log (
    id SERIAL PRIMARY KEY,

    entity_type         VARCHAR(50) NOT NULL,   -- 'accounts_payable', 'accounts_receivable', 'cash_movements'
    entity_id           INTEGER NOT NULL,

    action              VARCHAR(50) NOT NULL,   -- 'CREATE', 'UPDATE', 'STATUS_CHANGE', 'CANCEL', etc.
    from_status         VARCHAR(50),
    to_status           VARCHAR(50),

    changed_fields      JSONB,                  -- { "amount_total": { "old": "100.00", "new": "120.00" } }
    notes               TEXT,

    user_id             INTEGER,                -- users.id que fez a alteração
    timestamp           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    data_criacao        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ativo               BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_fin_audit_entity ON finance_audit_log(entity_type, entity_id);
CREATE INDEX idx_fin_audit_user   ON finance_audit_log(user_id);
