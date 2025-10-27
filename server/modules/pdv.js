/**
 * server/modules/pdv.js
 * Rotas do módulo PDV:
 * - Autocomplete de produtos
 * - Liberação de desconto via senha master
 * - Finalização de venda (sales, sale_items, sales_payments, baixa de estoque)
 */

const express = require('express');
const router = express.Router();

// Importa nosso db centralizado
const db = require('../../api/db'); // <- caminho relativo ao server/modules

// -----------------------------------------------------------------------------
// GET /modules/pdv/search-products?query=xxx
// Autocomplete de produtos no PDV
//
// Retorna até 10 produtos buscando por name e sku.
// Mapeia os campos para o formato que o front espera.
// -----------------------------------------------------------------------------
router.get('/search-products', async (req, res) => {
    const { query } = req.query;

    if (!query || query.length < 2) {
        return res.json([]);
    }

    try {
        const sql = `
            SELECT 
                id,
                name,
                sku,
                sale_price AS preco,
                stock
            FROM products
            WHERE 
                name ILIKE $1
                OR sku ILIKE $1
            ORDER BY name ASC
            LIMIT 10
        `;
        const values = [`%${query}%`];
        const result = await db.query(sql, values);

        // Normaliza nomes para o front
        const mapped = result.rows.map(r => ({
            id: r.id,
            nome: r.name,
            sku: r.sku,
            preco: r.preco,
            estoque_atual: r.stock
        }));

        res.json(mapped);
    } catch (err) {
        console.error('Erro ao buscar produtos:', err);
        return res.status(500).json({
            error: 'Erro interno ao buscar produtos'
        });
    }
});


// -----------------------------------------------------------------------------
// POST /modules/pdv/validate-admin
// body: { senha: "abc" }
//
// Valida se a senha digitada pode liberar campos de desconto.
// -----------------------------------------------------------------------------
router.post('/validate-admin', (req, res) => {
    const { senha } = req.body;
    if (!senha) {
        return res.json({ valid: false });
    }

    const isValid = senha === process.env.PDV_ADMIN_PASS;
    return res.json({ valid: isValid === true });
});


// -----------------------------------------------------------------------------
// POST /modules/pdv/finalizar-venda
//
// body esperado do front:
// {
//   "itens":[
//     {
//       "id": 12,                 // product_id
//       "nome": "Produto X",
//       "precoUnit": 10.00,       // unit_price
//       "quantidade": 2,          // quantity
//       "descontoItem": 1.00      // discount_item
//     }
//   ],
//   "subtotal": 18.00,            // soma dos itens líquida (sem desconto geral)
//   "descontoGeral": 2.00,        // discount_total na venda
//   "totalFinal": 16.00,          // final_total
//   "pagamentos":[
//     {"metodo":"dinheiro","valor":10.00},
//     {"metodo":"pix","valor":6.00}
//   ]
// }
//
// Fluxo:
// 1. Cria registro em sales
// 2. Cria itens em sale_items
// 3. Dá baixa no estoque de products
// 4. Cria pagamentos em sales_payments
// -----------------------------------------------------------------------------
router.post('/finalizar-venda', async (req, res) => {
    const { itens, subtotal, descontoGeral, totalFinal, pagamentos } = req.body;

    if (!Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ error: 'Nenhum item informado.' });
    }

    if (!Array.isArray(pagamentos) || pagamentos.length === 0) {
        return res.status(400).json({ error: 'Nenhum pagamento informado.' });
    }

    // TODO: quando o login estiver integrado,
    // pegar o ID do usuário logado (req.user.id, etc.)
    const usuarioLogadoId = 1;

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // 1. Inserir venda em "sales"
        //
        // sales:
        //  - customer_name      (por enquanto null)
        //  - total              (vamos registrar o "subtotal" vindo do front)
        //  - discount_total     (desconto geral da venda)
        //  - final_total        (valor final após desconto geral)
        //  - status             ('completed')
        //  - created_at         (NOW())
        //  - created_by         (usuarioLogadoId)
        //
        const insertSaleSql = `
            INSERT INTO sales (
                customer_name,
                total,
                discount_total,
                final_total,
                status,
                created_at,
                created_by
            )
            VALUES ($1, $2, $3, $4, $5, NOW(), $6)
            RETURNING id
        `;
        const saleValues = [
            null,                 // customer_name (placeholder até integrar cliente)
            subtotal,             // total
            descontoGeral,        // discount_total
            totalFinal,           // final_total
            'completed',          // status
            usuarioLogadoId       // created_by
        ];

        const saleResult = await client.query(insertSaleSql, saleValues);
        const saleId = saleResult.rows[0].id;

        // 2. Inserir itens na "sale_items" e dar baixa no estoque "products"
        //
        // sale_items:
        //  - sale_id
        //  - product_id
        //  - quantity
        //  - unit_price
        //  - total            (bruto = unit_price * quantity)
        //  - discount_item
        //  - net_total        (líquido após desconto do item)
        //
        for (const item of itens) {
            const unitPrice        = Number(item.precoUnit);
            const qtd              = Number(item.quantidade);
            const descItem         = Number(item.descontoItem || 0);
            const totalBruto       = unitPrice * qtd;
            const totalLiquidoItem = totalBruto - descItem;

            const insertItemSql = `
                INSERT INTO sale_items (
                    sale_id,
                    product_id,
                    quantity,
                    unit_price,
                    total,
                    discount_item,
                    net_total
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `;
            const itemValues = [
                saleId,
                item.id,             // product_id
                qtd,
                unitPrice,
                totalBruto,
                descItem,
                totalLiquidoItem
            ];

            await client.query(insertItemSql, itemValues);

            // Atualiza estoque do produto
            const baixaEstoqueSql = `
                UPDATE products
                SET stock = stock - $1
                WHERE id = $2
            `;
            await client.query(baixaEstoqueSql, [qtd, item.id]);
        }

        // 3. Inserir pagamentos em "sales_payments"
        //
        // sales_payments:
        //  - sale_id
        //  - metodo
        //  - valor
        //
        for (const pg of pagamentos) {
            const insertPgSql = `
                INSERT INTO sales_payments (
                    sale_id,
                    metodo,
                    valor
                )
                VALUES ($1, $2, $3)
            `;
            await client.query(insertPgSql, [
                saleId,
                pg.metodo,
                pg.valor
            ]);
        }

        await client.query('COMMIT');

        return res.json({ ok: true, sale_id: saleId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao finalizar venda:', err);
        return res.status(500).json({ error: 'Erro ao finalizar venda' });
    } finally {
        client.release();
    }
});

module.exports = router;
