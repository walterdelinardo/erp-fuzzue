/**
 * server/modules/pdv.js
 *
 * Rotas do módulo PDV:
 * - Autocomplete de produtos
 * - Liberação de desconto via senha master
 * - Finalização de venda (sales, sale_items, sales_payments, baixa de estoque)
 *
 * Agora protegido por:
 * - requireAuth (JWT obrigatório)
 * - checkPermission (role precisa ter permissão correta)
 */

const express = require('express');
const router = express.Router();

const db = require('../config/db');
const requireAuth = require('../middleware/requireAuth');
const checkPermission = require('../middleware/checkPermission');

// -----------------------------------------------------------------------------
// GET /api/pdv/search-products?query=xxx
// Autocomplete de produtos no PDV
//
// Retorna até 10 produtos buscando por name e sku.
// Mapeia os campos para o formato que o front espera.
// Público para usuário autenticado (não precisa permissão especial, só login).
// -----------------------------------------------------------------------------
router.get(
    '/search-products',
    requireAuth,
    async (req, res) => {
        const { query } = req.query;

        if (!query || query.length < 2) {
            return res.json({
                success: true,
                message: 'Termo muito curto ou vazio',
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
                message: 'Produtos encontrados',
                data: mapped,
                error: null
            });
        } catch (err) {
            console.error('Erro ao buscar produtos:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno ao buscar produtos',
                data: null,
                error: err.message
            });
        }
    }
);


// -----------------------------------------------------------------------------
// POST /api/pdv/validate-admin
// body: { senha: "abc" }
//
// Valida se a senha digitada pode liberar campos de desconto.
// Protegido por permissão: só perfis que podem conceder desconto.
// -----------------------------------------------------------------------------
router.post(
    '/validate-admin',
    requireAuth,
    checkPermission('pdv.aplicar_desconto'),
    (req, res) => {
        const { senha } = req.body;
        if (!senha) {
            return res.json({
                success: true,
                message: 'Senha ausente',
                data: { valid: false },
                error: null
            });
        }

        const isValid = senha === process.env.PDV_ADMIN_PASS;

        return res.json({
            success: true,
            message: 'Validação de permissão de desconto realizada',
            data: { valid: isValid === true },
            error: null
        });
    }
);


// -----------------------------------------------------------------------------
// POST /api/pdv/finalizar-venda
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
// Fluxo interno:
// 1. Cria registro em sales
// 2. Cria itens em sale_items
// 3. Dá baixa no estoque de products
// 4. Cria pagamentos em sales_payments
//
// Protegido por:
// - requireAuth  -> precisa estar logado
// - checkPermission('pdv.finalizar_venda') -> precisa ter permissão
// -----------------------------------------------------------------------------
router.post(
    '/finalizar-venda',
    requireAuth,
    checkPermission('pdv.finalizar_venda'),
    async (req, res) => {
        const { itens, subtotal, descontoGeral, totalFinal, pagamentos } = req.body;

        if (!Array.isArray(itens) || itens.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum item informado.',
                data: null,
                error: 'PDV_NO_ITEMS'
            });
        }

        if (!Array.isArray(pagamentos) || pagamentos.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum pagamento informado.',
                data: null,
                error: 'PDV_NO_PAYMENTS'
            });
        }

        // Agora usamos o usuário autenticado (vem do JWT validado em requireAuth)
        // Se por algum motivo req.user não existir, fallback para 1 (dev)
        const usuarioLogadoId = (req.user && req.user.id) ? req.user.id : 1;

        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // 1. Inserir venda em "sales"
            //
            // Campos:
            //  - customer_name      (por enquanto null)
            //  - total              (subtotal vindo do front)
            //  - discount_total     (descontoGeral)
            //  - final_total        (totalFinal)
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

            return res.json({
                success: true,
                message: 'Venda finalizada com sucesso',
                data: { sale_id: saleId },
                error: null
            });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Erro ao finalizar venda:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro ao finalizar venda',
                data: null,
                error: err.message
            });
        } finally {
            client.release();
        }
    }
);

module.exports = router;
