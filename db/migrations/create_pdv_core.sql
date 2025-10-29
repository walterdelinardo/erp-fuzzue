-- =====================================================================
-- db/migrations/create_pdv_core.sql
-- Estruturas principais de Produtos, Vendas e Estoque para o ERP Fuzzue
-- =====================================================================
-- Tabelas criadas:
--   - products
--   - sales
--   - sale_items
--   - sales_payments
--
-- Atenção:
-- - Valores monetários: NUMERIC(12,2)
-- - Quantidades: NUMERIC(12,3)
-- - Campos padrão: data_criacao, data_atualizacao, ativo
-- =====================================================================


-- =========================================================
-- 1. TABELA products
-- =========================================================
-- Catálogo de produtos comercializados no PDV e ERP.
--
-- Notas:
-- - stock: saldo atual em estoque.
--   Em sistemas maduros, esse saldo pode ser controlado por uma tabela
--   de movimentação; por enquanto, mantemos um campo direto para simplicidade.
--
-- - supplier_id: pensado para integração futura com tabela de fornecedores.
--   (ainda não criamos suppliers, então deixamos só como referência numérica
--    sem FK obrigatória por enquanto).
-- =========================================================

CREATE TABLE products (
    id SERIAL PRIMARY KEY,

    sku                VARCHAR(50),            -- código interno / referência
    barcode            VARCHAR(100),           -- código de barras, opcional
    name               VARCHAR(200) NOT NULL,  -- nome comercial
    description        TEXT,
    category           VARCHAR(100),
    ncm                VARCHAR(20),            -- classificação fiscal (BR)
    unit               VARCHAR(10),            -- unidade de medida (un, kg, m, cx, etc.)

    cost_price         NUMERIC(12,2),          -- custo unitário de aquisição
    sale_price         NUMERIC(12,2),          -- preço de venda atual
    stock              NUMERIC(12,3) DEFAULT 0, -- saldo em estoque atual

    supplier_id        INTEGER,                -- fornecedor padrão (futuro suppliers.id)

    data_criacao       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao   TIMESTAMP,
    ativo              BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_products_sku        ON products(sku);
CREATE INDEX idx_products_barcode    ON products(barcode);
CREATE INDEX idx_products_name       ON products(name);


-- =========================================================
-- 2. TABELA sales
-- =========================================================
-- Cabeçalho da venda (cada registro = uma venda feita).
--
-- Notas:
-- - total: soma bruta dos itens antes de desconto geral
-- - discount_total: desconto geral aplicado na venda (R$)
-- - final_total: valor final pago pelo cliente após desconto geral
-- - status: 'completed', 'canceled', etc.
-- - created_by: id do usuário que registrou a venda (users.id)
--
-- Futuro:
-- - customer_name: pode depois evoluir pra customer_id se você criar CRM/clientes.
-- =========================================================

CREATE TABLE sales (
    id SERIAL PRIMARY KEY,

    customer_name      VARCHAR(200),        -- nome livre do cliente (ou null em venda balcão)
    total              NUMERIC(12,2) NOT NULL,      -- subtotal líquido dos itens (já considerando desc Item)
    discount_total     NUMERIC(12,2) DEFAULT 0,     -- desconto geral na venda (R$)
    final_total        NUMERIC(12,2) NOT NULL,      -- valor final cobrado
    status             VARCHAR(30) NOT NULL DEFAULT 'completed',

    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by         INTEGER,             -- referência ao usuário (users.id)

    data_criacao       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao   TIMESTAMP,
    ativo              BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_sales_status         ON sales(status);
CREATE INDEX idx_sales_created_at     ON sales(created_at);
CREATE INDEX idx_sales_created_by     ON sales(created_by);


-- =========================================================
-- 3. TABELA sale_items
-- =========================================================
-- Itens pertencentes a uma venda (sales).
-- Cada linha representa (produto X * quantidade Y).
--
-- Notas:
-- - total: valor bruto do item (precoUnit * quantidade)
-- - discount_item: desconto específico aplicado nesse item
-- - net_total: valor líquido por item (total - desconto_item)
--
-- - quantity NUMERIC(12,3) para suportar unidade fracionada
--   (Ex: vende 0.250 kg de frios).
-- =========================================================

CREATE TABLE sale_items (
    id SERIAL PRIMARY KEY,

    sale_id            INTEGER NOT NULL,          -- FK: sales.id
    product_id         INTEGER NOT NULL,          -- FK: products.id

    quantity           NUMERIC(12,3) NOT NULL,    -- quantidade vendida
    unit_price         NUMERIC(12,2) NOT NULL,    -- preço unitário praticado na hora
    total              NUMERIC(12,2) NOT NULL,    -- total bruto (unit_price * quantity)

    discount_item      NUMERIC(12,2) DEFAULT 0,   -- desconto no item (R$)
    net_total          NUMERIC(12,2) NOT NULL,    -- total líquido do item após desconto

    data_criacao       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao   TIMESTAMP,
    ativo              BOOLEAN DEFAULT TRUE
);

-- Índices para performance
CREATE INDEX idx_sale_items_sale_id    ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);

-- Relações (FK) básicas
ALTER TABLE sale_items
    ADD CONSTRAINT fk_sale_items_sale
    FOREIGN KEY (sale_id)
    REFERENCES sales(id)
    ON DELETE CASCADE;

ALTER TABLE sale_items
    ADD CONSTRAINT fk_sale_items_product
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE RESTRICT;


-- =========================================================
-- 4. TABELA sales_payments
-- =========================================================
-- Métodos de pagamento por venda.
--
-- Notas:
-- - Uma venda pode ter 1..N pagamentos (ex: parte dinheiro, parte PIX).
-- - metodo: "dinheiro", "pix", "cartao_credito", "cartao_debito", etc.
-- - valor: quanto foi pago nesse método.
--
-- No futuro:
-- - Podemos ligar isso em "contas a receber" e "caixa".
-- =========================================================

CREATE TABLE sales_payments (
    id SERIAL PRIMARY KEY,

    sale_id            INTEGER NOT NULL,         -- FK: sales.id
    metodo             VARCHAR(50) NOT NULL,     -- dinheiro | pix | cartao_credito | cartao_debito | etc
    valor              NUMERIC(12,2) NOT NULL,   -- valor pago via este método

    data_criacao       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao   TIMESTAMP,
    ativo              BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_sales_payments_sale_id ON sales_payments(sale_id);

ALTER TABLE sales_payments
    ADD CONSTRAINT fk_sales_payments_sale
    FOREIGN KEY (sale_id)
    REFERENCES sales(id)
    ON DELETE CASCADE;


-- =========================================================
-- 5. RELAÇÃO FUTURA (opcional, mas deixar previsto)
-- =========================================================
-- Queremos eventualmente atrelar movimentação de estoque a um diário
-- de movimentações, não só decrementar "products.stock".
--
-- Exemplo futuro:
--   product_stock_movements
--     - product_id
--     - tipo ('saida_venda', 'entrada_compra', 'ajuste_inventario', ...)
--     - quantidade
--     - origem_id (ex: sale_items.id)
--     - observacao
--
-- Isso permite auditoria: "quem tirou? quanto? por qual venda?"
--
-- Ainda não criamos essa tabela aqui porque o PDV atual só faz UPDATE direto
-- no campo products.stock.
-- =========================================================


-- =========================================================
-- 6. SEED BÁSICO DE PRODUTO (opcional)
-- =========================================================
-- Você pode comentar/remover esses INSERTs em produção se quiser começar limpo.
-- A ideia é só ter algo pra testar PDV imediatamente.
-- =========================================================

INSERT INTO products (
    sku,
    barcode,
    name,
    description,
    category,
    ncm,
    unit,
    cost_price,
    sale_price,
    stock,
    supplier_id,
    data_criacao,
    ativo
) VALUES
('SKU-001', '7890000000010', 'Camiseta Preta Básica', 'Camiseta algodão preta lisa', 'Vestuário', '6109.10.00', 'un', 20.00, 49.90, 100, NULL, NOW(), TRUE),
('SKU-002', '7890000000027', 'Boné Trucker Fuzzue', 'Boné trucker bordado Fuzzue', 'Acessórios', '6505.00.90', 'un', 15.00, 39.90, 50, NULL, NOW(), TRUE),
('SKU-003', '7890000000034', 'Caneca Logo', 'Caneca branca personalizada', 'Brindes', '6912.00.00', 'un', 8.00, 24.90, 80, NULL, NOW(), TRUE);
