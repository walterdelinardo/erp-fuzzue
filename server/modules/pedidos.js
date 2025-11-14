// server/modules/pedidos.js

const express = require('express');
const router = express.Router();
const pool = require('../db'); // ajuste o caminho conforme seu projeto

// Helper padrão de resposta
function createResponse(success, message, data = null, error = null) {
    return { success, message, data, error };
}

// ------------------------
// POST /api/pedidos/create
// ------------------------
router.post('/create', async (req, res) => {
    const {
        cliente_id,
        data_pedido,
        data_entrega,
        status_pedido,
        valor_subtotal,
        valor_desconto,
        valor_total,
        observacoes
    } = req.body;

    if (!cliente_id || !data_pedido || !status_pedido || valor_subtotal == null || valor_total == null) {
        return res
            .status(400)
            .json(createResponse(false, 'Campos obrigatórios não informados (cliente, data, status, valores).'));
    }

    try {
        const query = `
            INSERT INTO pedidos (
                cliente_id,
                data_pedido,
                data_entrega,
                status_pedido,
                valor_subtotal,
                valor_desconto,
                valor_total,
                observacoes
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8
            )
            RETURNING *;
        `;

        const values = [
            cliente_id,
            data_pedido,
            data_entrega || null,
            status_pedido,
            valor_subtotal,
            valor_desconto || 0,
            valor_total,
            observacoes || null
        ];

        const result = await pool.query(query, values);
        return res.json(createResponse(true, 'Pedido criado com sucesso.', result.rows[0]));
    } catch (err) {
        console.error('Erro ao criar pedido:', err);
        return res
            .status(500)
            .json(createResponse(false, 'Erro ao criar pedido.', null, err.message));
    }
});

// ----------------------
// GET /api/pedidos/list
// ----------------------
router.get('/list', async (req, res) => {
    try {
        const query = `
            SELECT
                p.*,
                c.nome_cliente
            FROM pedidos p
            LEFT JOIN clientes c ON c.id = p.cliente_id
            WHERE p.ativo = TRUE
            ORDER BY p.id DESC;
        `;
        const result = await pool.query(query);
        return res.json(createResponse(true, 'Lista de pedidos carregada.', result.rows));
    } catch (err) {
        console.error('Erro ao listar pedidos:', err);
        return res
            .status(500)
            .json(createResponse(false, 'Erro ao listar pedidos.', null, err.message));
    }
});

// -------------------------
// GET /api/pedidos/get/:id
// -------------------------
router.get('/get/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const query = `
            SELECT
                p.*,
                c.nome_cliente
            FROM pedidos p
            LEFT JOIN clientes c ON c.id = p.cliente_id
            WHERE p.id = $1 AND p.ativo = TRUE;
        `;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res
                .status(404)
                .json(createResponse(false, 'Pedido não encontrado.'));
        }

        return res.json(createResponse(true, 'Pedido encontrado.', result.rows[0]));
    } catch (err) {
        console.error('Erro ao buscar pedido:', err);
        return res
            .status(500)
            .json(createResponse(false, 'Erro ao buscar pedido.', null, err.message));
    }
});

// ---------------------------
// PUT /api/pedidos/update/:id
// ---------------------------
router.put('/update/:id', async (req, res) => {
    const { id } = req.params;
    const {
        cliente_id,
        data_pedido,
        data_entrega,
        status_pedido,
        valor_subtotal,
        valor_desconto,
        valor_total,
        observacoes
    } = req.body;

    if (!cliente_id || !data_pedido || !status_pedido || valor_subtotal == null || valor_total == null) {
        return res
            .status(400)
            .json(createResponse(false, 'Campos obrigatórios não informados (cliente, data, status, valores).'));
    }

    try {
        const query = `
            UPDATE pedidos
            SET
                cliente_id      = $1,
                data_pedido     = $2,
                data_entrega    = $3,
                status_pedido   = $4,
                valor_subtotal  = $5,
                valor_desconto  = $6,
                valor_total     = $7,
                observacoes     = $8,
                data_atualizacao = NOW()
            WHERE id = $9
            RETURNING *;
        `;

        const values = [
            cliente_id,
            data_pedido,
            data_entrega || null,
            status_pedido,
            valor_subtotal,
            valor_desconto || 0,
            valor_total,
            observacoes || null,
            id
        ];

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res
                .status(404)
                .json(createResponse(false, 'Pedido não encontrado.'));
        }

        return res.json(createResponse(true, 'Pedido atualizado com sucesso.', result.rows[0]));
    } catch (err) {
        console.error('Erro ao atualizar pedido:', err);
        return res
            .status(500)
            .json(createResponse(false, 'Erro ao atualizar pedido.', null, err.message));
    }
});

// -----------------------------
// DELETE /api/pedidos/delete/:id
// (soft delete: ativo = false)
// -----------------------------
router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const query = `
            UPDATE pedidos
            SET
                ativo = FALSE,
                data_atualizacao = NOW()
            WHERE id = $1
            RETURNING *;
        `;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res
                .status(404)
                .json(createResponse(false, 'Pedido não encontrado.'));
        }

        return res.json(createResponse(true, 'Pedido excluído (inativado) com sucesso.', result.rows[0]));
    } catch (err) {
        console.error('Erro ao excluir (inativar) pedido:', err);
        return res
            .status(500)
            .json(createResponse(false, 'Erro ao excluir pedido.', null, err.message));
    }
});

module.exports = router;
