/**
 * server/modules/pdv.js
 * Rotas do módulo PDV:
 * - Autocomplete de produtos
 * - Validação de permissão para desconto
 * - Finalização de venda (sales, sale_items, sales_payments, baixa de estoque)
 */

const express = require('express');
const router = express.Router();

// Importa conexão/queries utilitárias do banco
const db = require('../config/db'); // caminho relativo a /server/modules

// -----------------------------------------------------------------------------
// GET /api/pdv/search-products?query=xxx
// Busca produtos para autocomplete no PDV (nome ou sku).
// Retorna até 10 itens.
// -----------------------------------------------------------------------------
router.get('/search-products', async (req, res) => {
    const { query } = req.query;

    if (!query || query.length < 2) {
        return res.json({
            success: true,
            message: "Nenhum termo válido informado ou termo curto demais",
            data: [],
            error: null
        });
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

        return res.json({
            success: true,
            message: "Produtos encontrados",
            data: mapped,
            error: null
        });
    } catch (err) {
        return db.handleError(res, err, "Erro ao buscar produtos");
    }
});


// -----------------------------------------------------------------------------
// POST /api/pdv/validate-admin
// body: { senha: "abc" }
// Verifica se a senha master permite liberar desconto manual no PDV.
// -----------------------------------------------------------------------------
router.post('/validate-admin', (req, res) => {
    const { senha } = req.body;

    if (!senha) {
        return res.json({
            success: true,
            message: "Senha ausente",
            data: { valid: false },
            error: null
        });
    }

    const isValid = senha === process.env.PDV_ADMIN_PASS;

    return res.json({
        success: true,
        message: "Validação de permissão de desconto realizada",
        data: { valid: isValid === true },
        error: null
    });
});


// -----------------------------------------------------------------------------
// POST /api/pdv/finalizar-venda
//
// body esperado:
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
//   "subtotal": 18.00,            // total (antes do desconto geral)
//   "descontoGeral": 2.00,        // discount_total
//   "totalFinal": 16.00,          // final_total
//   "pagamentos":[
//     {"metodo":"dinheiro","valor":10.00},
//     {"metodo":"pix","valor":6.00}
//   ]
// }
//
// Fluxo transacional:
// 1. Inserir em sales
// 2. Inserir em sale_items
// 3. Baixar estoque em products
// 4. Inserir pagamentos em sales_payments
// -----------------------------------------------------------------------------
router.post('/finalizar-venda', async (req, res) => {
    const { itens, subtotal, descontoGeral, totalFinal, pagamentos } = req.body;

    if (!Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Nenhum item informado",
            data: null,
            error: "PDV_FINALIZAR_VENDA_SEM_ITENS"
        });
    }

    if (!Array.isArray(pagamentos) || pagamentos.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Nenhum pagamento informado",
            data: null,
            error: "PDV_FINALIZAR_VENDA_SEM_PAGAMENTO"
        });
    }

    // TODO: substituir depois por req.user.id quando autenticação estiver integrada
    const usuarioLogadoId = 1;

    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        // 1. Inserir venda em "sales"
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

        // 2. Inserir itens e baixar estoque
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

            const baixaEstoqueSql = `
                UPDATE products
                SET stock = stock - $1
                WHERE id = $2
            `;
            await client.query(baixaEstoqueSql, [qtd, item.id]);
        }

        // 3. Inserir pagamentos
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

        return res.json({
            success: true,
            message: "Venda finalizada com sucesso",
            data: { sale_id: saleId },
            error: null
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao finalizar venda:', err);

        return res.status(500).json({
            success: false,
            message: "Erro ao finalizar venda",
            data: null,
            error: err?.message || String(err)
        });
    } finally {
        client.release();
    }
});

module.exports = router;
