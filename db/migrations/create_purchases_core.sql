-- =====================================================================
-- db/migrations/create_purchases_core.sql
-- Estruturas de Fornecedores e Ordens de Compra
-- =====================================================================
-- Tabelas:
--   - suppliers
--   - purchase_orders
--   - purchase_order_items
--
-- Objetivo:
-- - Registrar fornecedores
-- - Criar ordens de compra (OC)
-- - Registrar itens comprados e custo
-- - Integrar com estoque futuramente
-- =====================================================================


-- =========================================================
-- 1. suppliers
-- =========================================================
-- Cadastro de fornecedores.
--
-- Dados principais, contatos e status (ativo/inativo).
-- =========================================================

CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,

    name                VARCHAR(200) NOT NULL,
    document            VARCHAR(30),       -- CNPJ / CPF
    phone               VARCHAR(50),
    email               VARCHAR(120),
    address             TEXT,

    notes               TEXT,              -- observações internas

    is_active           BOOLEAN DEFAULT TRUE,

    data_criacao        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao    TIMESTAMP,
    ativo               BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_document ON suppliers(document);


-- =========================================================
-- 2. purchase_orders
-- =========================================================
-- Cabeçalho da ordem de compra (OC).
--
-- status:
--  - 'draft'        (rascunho)
--  - 'ordered'      (enviado ao fornecedor)
--  - 'received'     (itens recebidos e estoque atualizado)
--  - 'canceled'
--
-- total_bruto: soma dos itens custo_unitario * quantidade
-- desconto_total: desconto geral negociado na OC
-- total_final: total_bruto - desconto_total
--
-- created_by: usuário que abriu a OC
-- received_by: usuário que deu entrada no estoque (quando recebido)
-- =========================================================

CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,

    supplier_id         INTEGER NOT NULL,     -- FK suppliers.id
    status              VARCHAR(30) NOT NULL DEFAULT 'draft',

    total_bruto         NUMERIC(12,2) DEFAULT 0,
    desconto_total      NUMERIC(12,2) DEFAULT 0,
    total_final         NUMERIC(12,2) DEFAULT 0,

    notes_internal      TEXT,                 -- observações internas da compra / negociação
    notes_supplier      TEXT,                 -- observações que podem ser enviadas ao fornecedor

    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by          INTEGER,              -- FK users.id

    received_at         TIMESTAMP,
    received_by         INTEGER,              -- FK users.id (quem deu entrada no estoque)

    data_criacao        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao    TIMESTAMP,
    ativo               BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_purchase_orders_supplier   ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status     ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_created_at ON purchase_orders(created_at);

ALTER TABLE purchase_orders
    ADD CONSTRAINT fk_po_supplier
    FOREIGN KEY (supplier_id)
    REFERENCES suppliers(id)
    ON DELETE RESTRICT;


-- =========================================================
-- 3. purchase_order_items
-- =========================================================
-- Itens de uma ordem de compra.
--
-- custo_unitario: custo negociado da unidade
-- quantidade: quantidade pedida
-- total_item: custo_unitario * quantidade
--
-- Ao receber uma OC, essa informação será usada para:
--  - dar entrada de estoque
--  - atualizar custo do produto
-- =========================================================

CREATE TABLE purchase_order_items (
    id SERIAL PRIMARY KEY,

    purchase_order_id   INTEGER NOT NULL,         -- FK purchase_orders.id
    product_id          INTEGER NOT NULL,         -- FK products.id

    descricao_item      TEXT,                     -- snapshot do nome / descrição do produto no momento da compra
    quantidade          NUMERIC(12,3) NOT NULL,
    unidade             VARCHAR(10),              -- 'un', 'kg', 'm', etc.
    custo_unitario      NUMERIC(12,2) NOT NULL,
    total_item          NUMERIC(12,2) NOT NULL,

    data_criacao        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao    TIMESTAMP,
    ativo               BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_poi_po_id      ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_poi_product_id ON purchase_order_items(product_id);

ALTER TABLE purchase_order_items
    ADD CONSTRAINT fk_poi_po
    FOREIGN KEY (purchase_order_id)
    REFERENCES purchase_orders(id)
    ON DELETE CASCADE;

ALTER TABLE purchase_order_items
    ADD CONSTRAINT fk_poi_product
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE RESTRICT;
