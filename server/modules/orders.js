// server/modules/orders.js
// Orders module (sales orders) using tables: orders + customers

const express = require('express');
const router = express.Router();
const pool = require('../db'); // ajuste se o seu pool estiver em outro arquivo

function createResponse(success, message, data = null, error = null) {
    return { success, message, data, error };
}

// ------------------------
// POST /api/orders/create
// ------------------------
router.post('/create', async (req, res) => {
    const {
        customer_id,
        order_date,
        delivery_date,
        status,
        subtotal_amount,
        discount_amount,
        total_amount,
        notes
    } = req.body;

    if (!customer_id || !order_date || !status || subtotal_amount == null || total_amount == null) {
        return res
            .status(400)
            .json(createResponse(false, 'Missing required fields (customer, date, status, amounts).'));
    }

    try {
        const query = `
            INSERT INTO orders (
                customer_id,
                order_date,
                delivery_date,
                status,
                subtotal_amount,
                discount_amount,
                total_amount,
                notes
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8
            )
            RETURNING *;
        `;

        const values = [
            customer_id,
            order_date,
            delivery_date || null,
            status,
            subtotal_amount,
            discount_amount || 0,
            total_amount,
            notes || null
        ];

        const result = await pool.query(query, values);
        return res.json(createResponse(true, 'Order created successfully.', result.rows[0]));
    } catch (err) {
        console.error('Error creating order:', err);
        return res
            .status(500)
            .json(createResponse(false, 'Error creating order.', null, err.message));
    }
});

// ----------------------
// GET /api/orders/list
// ----------------------
router.get('/list', async (req, res) => {
    try {
        const query = `
            SELECT
                o.*,
                c.name AS customer_name
            FROM orders o
            LEFT JOIN customers c ON c.id = o.customer_id
            WHERE o.active = TRUE
            ORDER BY o.id DESC;
        `;
        const result = await pool.query(query);
        return res.json(createResponse(true, 'Orders loaded.', result.rows));
    } catch (err) {
        console.error('Error listing orders:', err);
        return res
            .status(500)
            .json(createResponse(false, 'Error listing orders.', null, err.message));
    }
});

// -------------------------
// GET /api/orders/get/:id
// -------------------------
router.get('/get/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const query = `
            SELECT
                o.*,
                c.name AS customer_name
            FROM orders o
            LEFT JOIN customers c ON c.id = o.customer_id
            WHERE o.id = $1 AND o.active = TRUE;
        `;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res
                .status(404)
                .json(createResponse(false, 'Order not found.'));
        }

        return res.json(createResponse(true, 'Order found.', result.rows[0]));
    } catch (err) {
        console.error('Error getting order:', err);
        return res
            .status(500)
            .json(createResponse(false, 'Error getting order.', null, err.message));
    }
});

// ---------------------------
// PUT /api/orders/update/:id
// ---------------------------
router.put('/update/:id', async (req, res) => {
    const { id } = req.params;
    const {
        customer_id,
        order_date,
        delivery_date,
        status,
        subtotal_amount,
        discount_amount,
        total_amount,
        notes
    } = req.body;

    if (!customer_id || !order_date || !status || subtotal_amount == null || total_amount == null) {
        return res
            .status(400)
            .json(createResponse(false, 'Missing required fields (customer, date, status, amounts).'));
    }

    try {
        const query = `
            UPDATE orders
            SET
                customer_id     = $1,
                order_date      = $2,
                delivery_date   = $3,
                status          = $4,
                subtotal_amount = $5,
                discount_amount = $6,
                total_amount    = $7,
                notes           = $8,
                updated_at      = NOW()
            WHERE id = $9
            RETURNING *;
        `;

        const values = [
            customer_id,
            order_date,
            delivery_date || null,
            status,
            subtotal_amount,
            discount_amount || 0,
            total_amount,
            notes || null,
            id
        ];

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res
                .status(404)
                .json(createResponse(false, 'Order not found.'));
        }

        return res.json(createResponse(true, 'Order updated successfully.', result.rows[0]));
    } catch (err) {
        console.error('Error updating order:', err);
        return res
            .status(500)
            .json(createResponse(false, 'Error updating order.', null, err.message));
    }
});

// -----------------------------
// DELETE /api/orders/delete/:id
// (soft delete: active = false)
// -----------------------------
router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const query = `
            UPDATE orders
            SET
                active     = FALSE,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *;
        `;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res
                .status(404)
                .json(createResponse(false, 'Order not found.'));
        }

        return res.json(createResponse(true, 'Order deleted (inactivated) successfully.', result.rows[0]));
    } catch (err) {
        console.error('Error deleting order:', err);
        return res
            .status(500)
            .json(createResponse(false, 'Error deleting order.', null, err.message));
    }
});

module.exports = router;
