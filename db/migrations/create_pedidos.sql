-- db/migrations/create_pedidos.sql

CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,

    cliente_id INTEGER NOT NULL,
    -- opcional: usuario_id INTEGER, -- se quiser registrar o vendedor/logado

    data_pedido TIMESTAMP NOT NULL DEFAULT NOW(),
    data_entrega DATE,
    status_pedido VARCHAR(20) NOT NULL DEFAULT 'aberto',

    valor_subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    valor_desconto NUMERIC(10,2) NOT NULL DEFAULT 0,
    valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,

    observacoes TEXT,

    data_criacao TIMESTAMP NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_pedidos_cliente
        FOREIGN KEY (cliente_id)
        REFERENCES clientes (id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON pedidos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status_pedido ON pedidos (status_pedido);
CREATE INDEX IF NOT EXISTS idx_pedidos_data_pedido ON pedidos (data_pedido);
