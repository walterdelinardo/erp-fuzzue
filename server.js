/**
 * Servidor Node.js (Express) para o ERP Fuzzue.
 * Deve ser rodado no Coolify e conectar-se ao banco de dados PostgreSQL.
 */

// Importa módulos essenciais
const express = require('express');
const { Pool } = require('pg'); // Módulo oficial para PostgreSQL em Node.js
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 40011;

// Configuração de Conexão com o PostgreSQL
// NOTA: As variáveis de ambiente (PGUSER, PGPASSWORD, PGHOST, PGDATABASE) 
// devem ser configuradas no Coolify.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Coolify geralmente injeta esta URL
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors({ origin: '*' })); // Permite acesso de qualquer origem para testes. MUDAR PARA SEU DOMÍNIO!
app.use(express.json());

// Função utilitária para tratamento de erros
function handleError(res, error, message) {
    console.error(message, error);
    res.status(500).json({ success: false, message: `${message}: ${error.message}` });
}

// -----------------------------------------------------------------------------
// ROTA 0: Status e Conexão com DB (Novo - ESSENCIAL PARA TESTE NO COOLIFY)
// -----------------------------------------------------------------------------
app.get('/api/status', async (req, res) => {
    try {
        await pool.query('SELECT 1'); // Tenta uma consulta simples para verificar a conexão
        res.status(200).json({ status: "OK", database: "PostgreSQL Conectado com Sucesso", server: "Servidor Node.js Ativo" });
    } catch (err) {
        handleError(res, err, "Erro de Conexão com o Banco de Dados. Verifique as credenciais DATABASE_URL.");
    }
});


// -----------------------------------------------------------------------------
// ROTA 1: Finalizar Venda e Baixa de Estoque (Transação Atômica)
// -----------------------------------------------------------------------------
app.post('/api/sales/finalize', async (req, res) => {
    const { sale, payments, userId } = req.body;
    const client = await pool.connect(); // Obtém um cliente do pool para a transação

    try {
        await client.query('BEGIN'); // INICIA A TRANSAÇÃO POSTGRES

        console.log(`Iniciando transação atômica para a venda do usuário: ${userId}`);

        // 1. Itera sobre cada item da venda para dar baixa no estoque
        for (const item of sale.items) {
            const productId = item.product_id;
            const quantityToDecrement = item.quantity;

            // 2. Tenta dar baixa no estoque no banco de dados.
            const result = await client.query(
                `
                UPDATE products
                SET stock = stock - $1, last_sale_at = NOW()
                WHERE id = $2 AND stock >= $1
                RETURNING id, stock;
                `,
                [quantityToDecrement, productId]
            );

            // 3. Verifica se a atualização foi bem-sucedida (se alguma linha foi retornada)
            if (result.rowCount === 0) {
                await client.query('ROLLBACK'); 
                return res.status(409).json({ 
                    success: false, 
                    message: `Falha: Estoque insuficiente para o produto SKU ${productId}. Transação Desfeita.`,
                    item: item.name
                });
            }
        }

        // 4. Salva o registro da venda no PostgreSQL (Após a baixa de estoque)
        await client.query(
            `
            INSERT INTO sales (user_id, total, items_data, payment_data, created_at)
            VALUES ($1, $2, $3, $4, NOW());
            `,
            [userId, sale.total, JSON.stringify(sale.items), JSON.stringify(payments)] // Use JSONB para items_data e payment_data no Postgres
        );


        await client.query('COMMIT'); // FINALIZA A TRANSAÇÃO (salva todas as alterações)
        
        res.status(200).json({ 
            success: true, 
            message: "Venda e baixa de estoque concluídas com sucesso!",
            invoicing_link: "https://mock-asaas.com/invoice/final" 
        });

    } catch (error) {
        await client.query('ROLLBACK'); 
        handleError(res, error, "Erro fatal ao processar a venda.");
    } finally {
        client.release(); 
    }
});

// -----------------------------------------------------------------------------
// ROTA 2: CRUD de Produtos
// -----------------------------------------------------------------------------
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products ORDER BY name ASC');
        res.status(200).json(result.rows);
    } catch (err) {
        handleError(res, err, "Erro ao buscar produtos.");
    }
});

app.post('/api/products', async (req, res) => {
    const p = req.body;
    try {
        const query = `
            INSERT INTO products (id, name, sku, price, stock, min_stock, margin, ncm_code, cst, origem, tributacao, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id) DO UPDATE 
            SET name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock, min_stock = EXCLUDED.min_stock, margin = EXCLUDED.margin, ncm_code = EXCLUDED.ncm_code, cst = EXCLUDED.cst, origem = EXCLUDED.origem, tributacao = EXCLUDED.tributacao, description = EXCLUDED.description
            RETURNING *;
        `;
        const result = await pool.query(query, [
            p.sku, p.name, p.sku, p.price, p.stock, p.min_stock, p.margin, p.ncm_code, p.cst, p.origem, p.tributacao, p.description
        ]);
        res.status(201).json({ success: true, product: result.rows[0] });
    } catch (err) {
        handleError(res, err, "Erro ao salvar produto.");
    }
});


// -----------------------------------------------------------------------------
// ROTA 3: CRUD de Fornecedores
// -----------------------------------------------------------------------------
app.get('/api/suppliers', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM suppliers ORDER BY name ASC');
        res.status(200).json(result.rows);
    } catch (err) {
        handleError(res, err, "Erro ao buscar fornecedores.");
    }
});

app.post('/api/suppliers', async (req, res) => {
    const s = req.body;
    try {
        const query = `
            INSERT INTO suppliers (name, cnpj, contact_person, phone, email, cep, address, observations)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;
        const result = await pool.query(query, [
            s.name, s.cnpj, s.contact_person, s.phone, s.email, s.cep, s.address, s.observations
        ]);
        res.status(201).json({ success: true, supplier: result.rows[0] });
    } catch (err) {
        handleError(res, err, "Erro ao adicionar fornecedor.");
    }
});


// -----------------------------------------------------------------------------
// ROTA 4: Servidor Start
// -----------------------------------------------------------------------------
app.listen(PORT, () => {
    console.log(`🚀 Servidor Fuzzue rodando na porta ${PORT}`);
});
