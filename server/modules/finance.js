/**
 * server/modules/finance.js
 *
 * Visão profissional do Financeiro (multi-filial)
 * Base: /api/finance
 */

const express = require('express');
const router = express.Router();

const db = require('../config/db');
const requireAuth = require('../middleware/requireAuth');
const checkPermission = require('../middleware/checkPermission');

// calcula próximo status de contas a pagar com base nos valores
function computePayableStatus(amount_total, amount_paid) {
    const total = Number(amount_total);
    const paid  = Number(amount_paid);

    if (paid <= 0) return 'open';
    if (paid > 0 && paid < total) return 'partial';
    return 'paid';
}

// calcula próximo status de contas a receber com base nos valores
function computeReceivableStatus(amount_total, amount_received) {
    const total = Number(amount_total);
    const rec   = Number(amount_received);

    if (rec <= 0) return 'open';
    if (rec > 0 && rec < total) return 'partial';
    return 'received';
}

// registra linha na tabela finance_audit_log
async function logAudit(client, {
    entity_type,
    entity_id,
    action,
    from_status,
    to_status,
    changed_fields,
    user_id,
    notes
}) {
    const sql = `
        INSERT INTO finance_audit_log (
            entity_type,
            entity_id,
            action,
            from_status,
            to_status,
            changed_fields,
            notes,
            user_id,
            timestamp,
            data_criacao,
            ativo
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW(),TRUE)
    `;
    const values = [
        entity_type,
        entity_id,
        action,
        from_status || null,
        to_status || null,
        changed_fields ? JSON.stringify(changed_fields) : null,
        notes || null,
        user_id || null
    ];
    await client.query(sql, values);
}

//
// GET /api/finance/dashboard?unit_id=1
// -> snapshot financeiro da filial
//
router.get(
    '/dashboard',
    requireAuth,
    checkPermission('financeiro.ver'),
    async (req, res) => {
        const unitId = Number(req.query.unit_id);

        if (!unitId) {
            return res.status(400).json({
                success: false,
                message: 'unit_id é obrigatório.',
                data: null,
                error: 'FIN_MISSING_UNIT'
            });
        }

        try {
            // saldo por conta da filial
            const saldoSql = `
                SELECT
                    ca.id,
                    ca.name,
                    ca.account_type,
                    COALESCE(ca.initial_balance, 0)
                    +
                    COALESCE(SUM(
                        CASE
                            WHEN cm.type = 'in'  THEN cm.amount
                            WHEN cm.type = 'out' THEN -cm.amount
                            ELSE 0
                        END
                    ),0) AS balance
                FROM cash_accounts ca
                LEFT JOIN cash_movements cm
                    ON cm.cash_account_id = ca.id
                    AND cm.ativo = TRUE
                WHERE ca.unit_id = $1
                  AND ca.is_active = TRUE
                  AND ca.ativo = TRUE
                GROUP BY ca.id
                ORDER BY ca.name ASC
            `;
            const saldoRes = await db.query(saldoSql, [unitId]);

            // payables abertos / vencidos
            const apSql = `
                SELECT
                    COUNT(*) FILTER (WHERE status IN ('open','partial')) AS open_count,
                    COALESCE(SUM(
                        CASE
                            WHEN status IN ('open','partial') THEN amount_total - amount_paid
                            ELSE 0
                        END
                    ),0) AS open_value,
                    COUNT(*) FILTER (WHERE status IN ('open','partial') AND due_date < CURRENT_DATE) AS overdue_count,
                    COALESCE(SUM(
                        CASE
                            WHEN status IN ('open','partial') AND due_date < CURRENT_DATE
                            THEN amount_total - amount_paid
                            ELSE 0
                        END
                    ),0) AS overdue_value
                FROM accounts_payable
                WHERE unit_id = $1
                  AND ativo = TRUE
            `;
            const apRes = await db.query(apSql, [unitId]);
            const apRow = apRes.rows[0];

            // receivables abertos
            const arSql = `
                SELECT
                    COUNT(*) FILTER (WHERE status IN ('open','partial')) AS open_count,
                    COALESCE(SUM(
                        CASE
                            WHEN status IN ('open','partial') THEN amount_total - amount_received
                            ELSE 0
                        END
                    ),0) AS open_value,
                    COUNT(*) FILTER (WHERE status IN ('open','partial') AND due_date < CURRENT_DATE) AS overdue_count,
                    COALESCE(SUM(
                        CASE
                            WHEN status IN ('open','partial') AND due_date < CURRENT_DATE
                            THEN amount_total - amount_received
                            ELSE 0
                        END
                    ),0) AS overdue_value
                FROM accounts_receivable
                WHERE unit_id = $1
                  AND ativo = TRUE
            `;
            const arRes = await db.query(arSql, [unitId]);
            const arRow = arRes.rows[0];

            return res.json({
                success: true,
                message: 'Dashboard financeiro carregado.',
                data: {
                    unit_id: unitId,
                    saldos_contas: saldoRes.rows.map(r => ({
                        cash_account_id: r.id,
                        name: r.name,
                        account_type: r.account_type,
                        balance: r.balance
                    })),

                    pagar_resumo: {
                        em_aberto_qtd: Number(apRow.open_count || 0),
                        em_aberto_valor: apRow.open_value,
                        vencido_qtd: Number(apRow.overdue_count || 0),
                        vencido_valor: apRow.overdue_value
                    },

                    receber_resumo: {
                        em_aberto_qtd: Number(arRow.open_count || 0),
                        em_aberto_valor: arRow.open_value,
                        vencido_qtd: Number(arRow.overdue_count || 0),
                        vencido_valor: arRow.overdue_value
                    }
                },
                error: null
            });

        } catch (err) {
            console.error('[Finance] dashboard error:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno ao montar dashboard financeiro.',
                data: null,
                error: err.message
            });
        }
    }
);

//
// GET /api/finance/payables?unit_id=1
// Lista contas a pagar "open" ou "partial" da filial
//
router.get(
    '/payables',
    requireAuth,
    checkPermission('financeiro.ap_ver'),
    async (req, res) => {
        const unitId = Number(req.query.unit_id);
        if (!unitId) {
            return res.status(400).json({
                success: false,
                message: 'unit_id é obrigatório.',
                data: null,
                error: 'FIN_AP_LIST_MISSING_UNIT'
            });
        }

        try {
            const sql = `
                SELECT
                    ap.id,
                    ap.description,
                    ap.due_date,
                    ap.amount_total,
                    ap.amount_paid,
                    ap.status,
                    s.name AS supplier_name
                FROM accounts_payable ap
                LEFT JOIN suppliers s ON s.id = ap.supplier_id
                WHERE ap.unit_id = $1
                  AND ap.status IN ('open','partial')
                  AND ap.ativo = TRUE
                ORDER BY ap.due_date ASC NULLS LAST, ap.id ASC
                LIMIT 200
            `;
            const result = await db.query(sql, [unitId]);

            const rows = result.rows.map(r => ({
                id: r.id,
                description: r.description,
                due_date: r.due_date,
                amount_total: r.amount_total,
                amount_paid: r.amount_paid,
                status: r.status,
                supplier_name: r.supplier_name
            }));

            return res.json({
                success: true,
                message: 'Títulos a pagar carregados.',
                data: rows,
                error: null
            });

        } catch (err) {
            console.error('[Finance] list payables error:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno ao listar contas a pagar.',
                data: null,
                error: err.message
            });
        }
    }
);

//
// POST /api/finance/payables
// Cria título a pagar
//
// body:
// {
//   "unit_id": 2,
//   "supplier_id": 5,
//   "description": "Compra tecido Algodão",
//   "due_date": "2025-11-10",
//   "amount_total": 1234.56,
//   "payment_method": "pix",
//   "cash_account_id": 3,
//   "notes_internal": "Parcela única"
// }
router.post(
    '/payables',
    requireAuth,
    checkPermission('financeiro.ap_editar'),
    async (req, res) => {
        const {
            unit_id,
            supplier_id,
            description,
            due_date,
            amount_total,
            payment_method,
            cash_account_id,
            notes_internal
        } = req.body;

        if (!unit_id || !description || !due_date || !amount_total) {
            return res.status(400).json({
                success: false,
                message: 'Campos obrigatórios faltando (unit_id, description, due_date, amount_total).',
                data: null,
                error: 'FIN_AP_MISSING_FIELDS'
            });
        }

        const userId = req.user?.id || null;

        try {
            const insertSql = `
                INSERT INTO accounts_payable (
                    unit_id,
                    supplier_id,
                    description,
                    due_date,
                    amount_total,
                    amount_paid,
                    status,
                    payment_method,
                    cash_account_id,
                    notes_internal,
                    created_at,
                    created_by,
                    ativo
                ) VALUES (
                    $1,$2,$3,$4,$5,0,'open',$6,$7,$8,NOW(),$9,TRUE
                )
                RETURNING *
            `;

            const values = [
                unit_id,
                supplier_id || null,
                description,
                due_date,
                amount_total,
                payment_method || null,
                cash_account_id || null,
                notes_internal || null,
                userId
            ];

            const result = await db.query(insertSql, values);
            const row = result.rows[0];

            return res.status(201).json({
                success: true,
                message: 'Conta a pagar criada.',
                data: {
                    id: row.id,
                    status: row.status,
                    unit_id: row.unit_id,
                    due_date: row.due_date,
                    amount_total: row.amount_total
                },
                error: null
            });

        } catch (err) {
            console.error('[Finance] create payable error:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno ao criar conta a pagar.',
                data: null,
                error: err.message
            });
        }
    }
);

//
// POST /api/finance/receivables
// Cria título a receber
//
// body:
// {
//   "unit_id": 1,
//   "sale_id": 44,
//   "customer_name": "Cliente XPTO",
//   "description": "Venda PDV 44 em duas vezes",
//   "due_date": "2025-11-05",
//   "amount_total": 200.00,
//   "receive_method": "pix",
//   "cash_account_id": 2,
//   "notes_internal": "Entrada já recebida, falta segunda parcela"
// }
router.post(
    '/receivables',
    requireAuth,
    checkPermission('financeiro.ar_editar'),
    async (req, res) => {
        const {
            unit_id,
            sale_id,
            customer_name,
            description,
            due_date,
            amount_total,
            receive_method,
            cash_account_id,
            notes_internal
        } = req.body;

        if (!unit_id || !description || !due_date || !amount_total) {
            return res.status(400).json({
                success: false,
                message: 'Campos obrigatórios faltando (unit_id, description, due_date, amount_total).',
                data: null,
                error: 'FIN_AR_MISSING_FIELDS'
            });
        }

        const userId = req.user?.id || null;

        try {
            const insertSql = `
                INSERT INTO accounts_receivable (
                    unit_id,
                    sale_id,
                    customer_name,
                    description,
                    due_date,
                    amount_total,
                    amount_received,
                    status,
                    receive_method,
                    cash_account_id,
                    notes_internal,
                    created_at,
                    created_by,
                    ativo
                ) VALUES (
                    $1,$2,$3,$4,$5,$6,0,'open',$7,$8,$9,NOW(),$10,TRUE
                )
                RETURNING *
            `;

            const values = [
                unit_id,
                sale_id || null,
                customer_name || null,
                description,
                due_date,
                amount_total,
                receive_method || null,
                cash_account_id || null,
                notes_internal || null,
                userId
            ];

            const result = await db.query(insertSql, values);
            const row = result.rows[0];

            return res.status(201).json({
                success: true,
                message: 'Conta a receber criada.',
                data: {
                    id: row.id,
                    status: row.status,
                    unit_id: row.unit_id,
                    due_date: row.due_date,
                    amount_total: row.amount_total
                },
                error: null
            });

        } catch (err) {
            console.error('[Finance] create receivable error:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno ao criar conta a receber.',
                data: null,
                error: err.message
            });
        }
    }
);

//
// POST /api/finance/payables/:id/baixa
// Baixa (parcial ou total) de um título a pagar.
// Requer permissão: financeiro.ap_editar
//
router.post(
    '/payables/:id/baixa',
    requireAuth,
    checkPermission('financeiro.ap_editar'),
    async (req, res) => {
        const payableId = Number(req.params.id);
        const {
            valor_pago,
            cash_account_id,
            descricao_movimento,
            payment_method
        } = req.body;

        if (!payableId || !valor_pago || !cash_account_id) {
            return res.status(400).json({
                success: false,
                message: 'Campos obrigatórios faltando (payableId, valor_pago, cash_account_id).',
                data: null,
                error: 'FIN_AP_BAIXA_MISSING_FIELDS'
            });
        }

        const userId = req.user?.id || null;

        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // 1. Buscar o título atual
            const selSql = `
                SELECT
                    id,
                    unit_id,
                    amount_total,
                    amount_paid,
                    status
                FROM accounts_payable
                WHERE id = $1
                  AND ativo = TRUE
                FOR UPDATE
            `;
            const selRes = await client.query(selSql, [payableId]);
            if (selRes.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    message: 'Conta a pagar não encontrada.',
                    data: null,
                    error: 'FIN_AP_NOT_FOUND'
                });
            }

            const current = selRes.rows[0];

            const novoAmountPaid = Number(current.amount_paid) + Number(valor_pago);
            const novoStatus = computePayableStatus(current.amount_total, novoAmountPaid);

            // 2. Atualizar accounts_payable
            const updSql = `
                UPDATE accounts_payable
                SET
                    amount_paid   = $1,
                    status        = $2,
                    payment_method = COALESCE($3, payment_method),
                    cash_account_id = COALESCE($4, cash_account_id),
                    updated_at    = NOW(),
                    paid_at       = CASE WHEN $2 = 'paid' THEN NOW() ELSE paid_at END
                WHERE id = $5
                RETURNING
                    id,
                    unit_id,
                    amount_total,
                    amount_paid,
                    status,
                    cash_account_id
            `;
            const updRes = await client.query(updSql, [
                novoAmountPaid,
                novoStatus,
                payment_method || null,
                cash_account_id || null,
                payableId
            ]);

            const updated = updRes.rows[0];

            // 3. Criar movimento de saída em cash_movements
            const movSql = `
                INSERT INTO cash_movements (
                    cash_account_id,
                    unit_id,
                    type,
                    amount,
                    description,
                    occurred_at,
                    origin_type,
                    origin_id,
                    created_by,
                    created_at,
                    ativo
                )
                VALUES ($1,$2,'out',$3,$4,NOW(),'accounts_payable',$5,$6,NOW(),TRUE)
                RETURNING id
            `;
            const movRes = await client.query(movSql, [
                cash_account_id,
                updated.unit_id,
                valor_pago,
                descricao_movimento || `Baixa AP #${payableId}`,
                payableId,
                userId
            ]);

            // 4. Registrar auditoria
            await logAudit(client, {
                entity_type: 'accounts_payable',
                entity_id: payableId,
                action: 'PAYMENT',
                from_status: current.status,
                to_status: novoStatus,
                changed_fields: {
                    amount_paid: {
                        old: String(current.amount_paid),
                        new: String(novoAmountPaid)
                    }
                },
                user_id: userId,
                notes: `Baixa de R$ ${valor_pago} (movimento caixa/banco ID ${movRes.rows[0].id})`
            });

            await client.query('COMMIT');

            return res.json({
                success: true,
                message: 'Baixa registrada com sucesso.',
                data: {
                    payable_id: payableId,
                    status: novoStatus,
                    amount_paid: novoAmountPaid
                },
                error: null
            });

        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[Finance] baixa payable error:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno ao baixar conta a pagar.',
                data: null,
                error: err.message
            });
        } finally {
            client.release();
        }
    }
);

//
// POST /api/finance/receivables/:id/baixa
// Baixa (parcial ou total) de um título a receber.
// Requer permissão: financeiro.ar_editar
//
router.post(
    '/receivables/:id/baixa',
    requireAuth,
    checkPermission('financeiro.ar_editar'),
    async (req, res) => {
        const receivableId = Number(req.params.id);
        const {
            valor_recebido,
            cash_account_id,
            descricao_movimento,
            receive_method
        } = req.body;

        if (!receivableId || !valor_recebido || !cash_account_id) {
            return res.status(400).json({
                success: false,
                message: 'Campos obrigatórios faltando (receivableId, valor_recebido, cash_account_id).',
                data: null,
                error: 'FIN_AR_BAIXA_MISSING_FIELDS'
            });
        }

        const userId = req.user?.id || null;

        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // 1. Buscar título atual
            const selSql = `
                SELECT
                    id,
                    unit_id,
                    amount_total,
                    amount_received,
                    status
                FROM accounts_receivable
                WHERE id = $1
                  AND ativo = TRUE
                FOR UPDATE
            `;
            const selRes = await client.query(selSql, [receivableId]);
            if (selRes.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    message: 'Conta a receber não encontrada.',
                    data: null,
                    error: 'FIN_AR_NOT_FOUND'
                });
            }

            const current = selRes.rows[0];

            const novoAmountReceived = Number(current.amount_received) + Number(valor_recebido);
            const novoStatus = computeReceivableStatus(current.amount_total, novoAmountReceived);

            // 2. Atualizar accounts_receivable
            const updSql = `
                UPDATE accounts_receivable
                SET
                    amount_received = $1,
                    status          = $2,
                    receive_method  = COALESCE($3, receive_method),
                    cash_account_id = COALESCE($4, cash_account_id),
                    updated_at      = NOW(),
                    received_at     = CASE WHEN $2 = 'received' THEN NOW() ELSE received_at END
                WHERE id = $5
                RETURNING
                    id,
                    unit_id,
                    amount_total,
                    amount_received,
                    status,
                    cash_account_id
            `;
            const updRes = await client.query(updSql, [
                novoAmountReceived,
                novoStatus,
                receive_method || null,
                cash_account_id || null,
                receivableId
            ]);

            const updated = updRes.rows[0];

            // 3. Criar movimento de ENTRADA em cash_movements
            const movSql = `
                INSERT INTO cash_movements (
                    cash_account_id,
                    unit_id,
                    type,
                    amount,
                    description,
                    occurred_at,
                    origin_type,
                    origin_id,
                    created_by,
                    created_at,
                    ativo
                )
                VALUES ($1,$2,'in',$3,$4,NOW(),'accounts_receivable',$5,$6,NOW(),TRUE)
                RETURNING id
            `;
            const movRes = await client.query(movSql, [
                cash_account_id,
                updated.unit_id,
                valor_recebido,
                descricao_movimento || `Recebimento AR #${receivableId}`,
                receivableId,
                userId
            ]);

            // 4. Registrar auditoria
            await logAudit(client, {
                entity_type: 'accounts_receivable',
                entity_id: receivableId,
                action: 'RECEIPT',
                from_status: current.status,
                to_status: novoStatus,
                changed_fields: {
                    amount_received: {
                        old: String(current.amount_received),
                        new: String(novoAmountReceived)
                    }
                },
                user_id: userId,
                notes: `Baixa de R$ ${valor_recebido} (movimento caixa/banco ID ${movRes.rows[0].id})`
            });

            await client.query('COMMIT');

            return res.json({
                success: true,
                message: 'Recebimento registrado com sucesso.',
                data: {
                    receivable_id: receivableId,
                    status: novoStatus,
                    amount_received: novoAmountReceived
                },
                error: null
            });

        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[Finance] baixa receivable error:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro interno ao baixar conta a receber.',
                data: null,
                error: err.message
            });
        } finally {
            client.release();
        }
    }
);

module.exports = router;
