/**
 * api/routes/sales.js
 * * Define as rotas para Vendas e Transações (/api/sales)
 */
const express = require('express');
const { pool, handleError } = require('../db'); // Importa o pool e o handler de erro

const router = express.Router();

// ROTA: POST /api/sales/finalize
// (Lógica de transação movida do server.js original)
router.post('/finalize', async (req, res) => {
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

            // 3. Verifica se a atualização foi bem-sucedida
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
            [userId, sale.total, JSON.stringify(sale.items), JSON.stringify(payments)]
        );

        await client.query('COMMIT'); // FINALIZA A TRANSAÇÃO
        
        res.status(200).json({ 
            success: true, 
            message: "Venda e baixa de estoque concluídas com sucesso!",
            invoicing_link: "https://mock-asaas.com/invoice/final" 
        });

    } catch (error) {
        await client.query('ROLLBACK'); 
        handleError(res, error, "Erro fatal ao processar a venda.");
    } finally {
        client.release(); // Libera o cliente de volta para o pool
    }
});

module.exports = router;
