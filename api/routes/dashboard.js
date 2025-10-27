/**
 * api/routes/dashboard.js
 * KPIs e visão geral do sistema
 */
const express = require('express');
const { pool, handleError } = require('../db');

const router = express.Router();

/**
 * GET /api/dashboard
 * Retorna indicadores resumidos
 */
router.get('/', async (req, res) => {
    const client = await pool.connect();

    try {
        // Vamos montar os períodos aqui no SQL mesmo
        // Considerando timezone local do servidor. Se depois precisar fixar em -03:00,
        // a gente ajusta usando AT TIME ZONE.

        const [
            salesTodayRes,
            salesMonthRes,
            topProductsRes,
            lowStockRes,
            recentMovementsRes,
            openSalesRes
        ] = await Promise.all([
            // total vendido hoje (status closed)
            client.query(
                `SELECT COALESCE(SUM(total), 0) AS total_sales_today
                 FROM sales
                 WHERE status = 'closed'
                 AND DATE(created_at) = CURRENT_DATE`
            ),

            // total vendido no mês atual
            client.query(
                `SELECT COALESCE(SUM(total), 0) AS total_sales_month
                 FROM sales
                 WHERE status = 'closed'
                 AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`
            ),

            // top produtos mais vendidos últimos 30 dias
            client.query(
                `SELECT
                    p.id AS product_id,
                    p.name AS product_name,
                    SUM(si.quantity) AS total_qty_sold,
                    SUM(si.quantity * si.unit_price) AS total_revenue
                 FROM sale_items si
                 JOIN sales s ON s.id = si.sale_id
                 JOIN products p ON p.id = si.product_id
                 WHERE s.status = 'closed'
                 AND s.created_at >= (CURRENT_DATE - INTERVAL '30 days')
                 GROUP BY p.id, p.name
                 ORDER BY total_qty_sold DESC
                 LIMIT 5`
            ),

            // produtos com estoque baixo
            client.query(
                `SELECT
                    id,
                    name,
                    sku,
                    stock,
                    sale_price
                 FROM products
                 WHERE stock <= 5
                 ORDER BY stock ASC, name ASC
                 LIMIT 10`
            ),

            // últimas movimentações de estoque
            client.query(
                `SELECT
                    im.id,
                    im.product_id,
                    p.name AS product_name,
                    im.type,
                    im.quantity,
                    im.reason,
                    im.branch,
                    im.created_at,
                    u.full_name AS created_by_name
                 FROM inventory_movements im
                 LEFT JOIN products p ON p.id = im.product_id
                 LEFT JOIN users u ON u.id = im.created_by
                 ORDER BY im.created_at DESC
                 LIMIT 10`
            ),

            // quantas vendas estão com status 'open'
            client.query(
                `SELECT COUNT(*)::INT AS open_sales_count
                 FROM sales
                 WHERE status = 'open'`
            ),
        ]);

        client.release();

        // Monta resposta final
        res.json({
            success: true,
            data: {
                totals: {
                    total_sales_today: Number(salesTodayRes.rows[0].total_sales_today || 0),
                    total_sales_month: Number(salesMonthRes.rows[0].total_sales_month || 0),
                    open_sales_count: Number(openSalesRes.rows[0].open_sales_count || 0),
                },
                top_products: topProductsRes.rows.map(row => ({
                    product_id: row.product_id,
                    product_name: row.product_name,
                    total_qty_sold: Number(row.total_qty_sold || 0),
                    total_revenue: Number(row.total_revenue || 0)
                })),
                low_stock: lowStockRes.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    sku: row.sku,
                    stock: Number(row.stock || 0),
                    sale_price: Number(row.sale_price || 0)
                })),
                recent_movements: recentMovementsRes.rows.map(row => ({
                    id: row.id,
                    product_id: row.product_id,
                    product_name: row.product_name,
                    type: row.type, // 'entrada' | 'saida'
                    quantity: Number(row.quantity || 0),
                    reason: row.reason,
                    branch: row.branch,
                    created_at: row.created_at,
                    created_by_name: row.created_by_name
                }))
            }
        });

    } catch (err) {
        client.release();
        handleError(res, err, "Erro ao carregar dados do dashboard.");
    }
});

module.exports = router;
