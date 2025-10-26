-- Arquivo de Esquema (DDL) para o PostgreSQL do ERP Fuzzue
-- Este script cria as tabelas necessárias para o server.js funcionar.

-- Tabela de Produtos
-- O 'id' é definido como TEXT e PRIMARY KEY para armazenar o SKU,
-- conforme a lógica "ON CONFLICT (id)" do seu server.js.
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT,
    price NUMERIC(10, 2) DEFAULT 0.00,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    margin NUMERIC(5, 2) DEFAULT 0.00,
    ncm_code TEXT,
    cst TEXT,
    origem TEXT,
    tributacao TEXT,
    description TEXT,
    last_sale_at TIMESTAMPTZ -- Atualizado pela rota de venda
);

-- Tabela de Fornecedores
-- Usa um 'id' serial (auto-incremento) como chave primária.
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    cnpj TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    cep TEXT,
    address TEXT,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Vendas
-- Armazena os dados da venda e os detalhes dos itens e pagamentos como JSONB.
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    user_id TEXT, -- Para o UID do Firebase ou ID do usuário
    total NUMERIC(10, 2) NOT NULL,
    items_data JSONB, -- Armazena o array de itens da venda
    payment_data JSONB, -- Armazena o array de pagamentos
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- (Opcional) Adicionar alguns índices para melhorar a performance de busca
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_cnpj ON suppliers(cnpj);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);

-- Mensagem de sucesso
\echo "Tabelas 'products', 'suppliers', e 'sales' criadas com sucesso!"
