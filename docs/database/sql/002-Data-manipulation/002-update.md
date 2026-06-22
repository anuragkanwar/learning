# UPDATE — Modifying Existing Data

:::note

DML command that modifies existing rows in a table. Can update one row, many rows, or all rows. DML requires an explicit `COMMIT` unless auto-commit is enabled.
:::

:::tip Same Reference Schema

Uses the same [e-commerce schema](../001-Data-foundation/001-creation.md). Refer there for `users`, `products`, `orders`, and `order_items` table definitions.
:::

:::info Prerequisite

This note assumes you are familiar with [INSERT](./001-insert.md). UPDATE shares the same constraint behavior, RETURNING syntax, and transaction rules.
:::

## Basic UPDATE

```plsql
UPDATE users
SET is_active = FALSE
WHERE id = 5;
```

**Execution order for UPDATE:**
```text
1. Check table existence and user privileges
2. Evaluate FROM / JOIN (if present)
3. Evaluate WHERE clause — identify rows to update
4. Acquire row locks on matching rows
5. Evaluate SET expressions (new values)
6. Evaluate CHECK constraints on updated columns
7. Evaluate NOT NULL constraints
8. Evaluate UNIQUE / PK constraints
9. Evaluate FK constraints (if FK column changed)
10. Write updated rows to disk (WAL-logged)
11. Update indexes (only if indexed columns changed)
```

## UPDATE Syntax Variations

### 1. Update All Rows (no WHERE)

```plsql
-- Sets is_active = TRUE for every user
UPDATE users SET is_active = TRUE;
```

:::warning

Omitting `WHERE` updates **every row** in the table. Always double-check before running an UPDATE without a WHERE clause. In production, write the SELECT first to preview which rows will be affected:

```plsql
-- Preview first
SELECT id, username FROM users WHERE is_active = FALSE;
-- Then update
UPDATE users SET is_active = FALSE WHERE id IN (3, 7, 12);
```
:::

### 2. Update Multiple Columns

```plsql
-- Comma-separated SET clauses
UPDATE products
SET price = 24.99, stock_qty = stock_qty + 20
WHERE id = 5;
```

### 3. Update with Expression (computed values)

Expressions in SET can reference the current column value:

```plsql
-- Increase price by 10%
UPDATE products
SET price = price * 1.10
WHERE category = 'electronics';
-- Every product in electronics gets a 10% price increase

-- Decrement stock after an order
UPDATE products
SET stock_qty = stock_qty - 2
WHERE id = 10;

-- String concatenation
UPDATE users
SET full_name = full_name || ' (deactivated)'
WHERE is_active = FALSE;
```

### 4. Update with Subquery

Use a subquery to derive the new value from another table:

```plsql
-- Update product prices based on the most recent order_item price
UPDATE products
SET price = (
    SELECT unit_price
    FROM order_items
    WHERE product_id = products.id
    ORDER BY id DESC
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1 FROM order_items WHERE product_id = products.id
);
```

**Subquery in WHERE clause:**

```plsql
-- Deactivate users who have no orders
UPDATE users
SET is_active = FALSE
WHERE id NOT IN (SELECT DISTINCT user_id FROM orders);
```

### 5. UPDATE with FROM (PostgreSQL-specific)

Joins another table directly in the UPDATE to filter or provide values:

```plsql
-- Update stock based on order quantities
UPDATE products
SET stock_qty = products.stock_qty - oi.total_qty
FROM (
    SELECT product_id, SUM(quantity) AS total_qty
    FROM order_items
    GROUP BY product_id
) oi
WHERE products.id = oi.product_id;

-- Update with a direct table reference
UPDATE order_items
SET unit_price = products.price
FROM products
WHERE order_items.product_id = products.id;
```

:::tip

`UPDATE ... FROM` is more efficient than a correlated subquery for large datasets — the join happens once, not per row.
:::

### 6. UPDATE with RETURNING (PostgreSQL-specific)

Returns the updated rows — same syntax as INSERT RETURNING:

```plsql
-- Return updated columns
UPDATE users
SET is_active = FALSE
WHERE id = 5
RETURNING id, username, is_active;

-- Return all columns
UPDATE products
SET price = price * 1.10
WHERE id = 3
RETURNING *;

-- RETURNING with multiple rows
UPDATE products
SET stock_qty = stock_qty + 50
WHERE stock_qty < 10
RETURNING id, name, stock_qty;
```

**RETURNING with expressions:**

```plsql
UPDATE order_items
SET quantity = quantity + 1
WHERE order_id = 1
RETURNING id, quantity, quantity * unit_price AS new_line_total;
```

### 7. UPDATE with CASE (conditional update)

Update different rows with different values in one statement:

```plsql
-- Apply different discounts per product category
UPDATE products
SET price = CASE
    WHEN category = 'clearance' THEN price * 0.50   -- 50% off
    WHEN category = 'seasonal'  THEN price * 0.70   -- 30% off
    WHEN stock_qty > 100        THEN price * 0.90   -- 10% off for overstock
    ELSE price                                        -- no change
END;
```

### 8. UPDATE with JOIN (standard SQL alternative)

If you can't use `FROM`, a `WHERE EXISTS` with a correlated subquery achieves the same:

```plsql
-- Update users who have placed at least one order
UPDATE users
SET is_active = TRUE
WHERE EXISTS (
    SELECT 1 FROM orders WHERE orders.user_id = users.id
);
```

## Constraint Conflicts

### UNIQUE / PK Violation

```plsql
UPDATE users
SET username = 'alice'   -- if 'alice' already exists as a username
WHERE id = 2;
-- ERROR:  duplicate key value violates unique constraint "users_username_key"
```

### FK Violation

```plsql
UPDATE orders
SET user_id = 999   -- user 999 doesn't exist
WHERE id = 1;
-- ERROR:  insert or update on table "orders" violates foreign key constraint
-- DETAIL:  Key (user_id)=(999) is not present in table "users".
```

### CHECK Violation

```plsql
UPDATE products
SET price = -5.00   -- violates CHECK (price > 0)
WHERE id = 1;
-- ERROR:  new row for relation "products" violates check constraint "chk_positive_price"
```

### NOT NULL Violation

```plsql
UPDATE users
SET full_name = NULL
WHERE id = 1;
-- ERROR:  null value in column "full_name" violates not-null constraint
```

## UPDATE Performance

| Technique | Why Faster |
|-----------|------------|
| **Batch with WHERE IN** | Update many rows in one statement instead of looping |
| **Update only changed columns** | Avoids unnecessary index updates and WAL logging |
| **Use `FROM` instead of subqueries** | Single join pass vs correlated subquery per row |
| **Remove indexes during bulk update** | Drop, update, recreate (index maintenance is expensive) |
| **Disable triggers during bulk update** | Re-enable after |

```plsql
-- Batch update with WHERE IN (faster than individual UPDATEs)
UPDATE products
SET price = price * 0.90
WHERE id IN (1, 3, 5, 7, 9);
```

## Locking Behavior

UPDATE acquires **row-level locks** on the rows it modifies:

```plsql
-- Session 1
BEGIN;
UPDATE products SET price = 15.00 WHERE id = 1;
-- Row 1 is now locked

-- Session 2 (runs in another connection)
UPDATE products SET price = 12.00 WHERE id = 1;
-- BLOCKED — waits until Session 1 commits or rolls back
```

:::warning Row Locks

UPDATE locks the rows it modifies for the duration of the transaction. Long-running transactions with UPDATEs can cause contention. Always keep UPDATE transactions short. If two sessions update the same row simultaneously, one waits — this can cause deadlocks.

Common deadlock scenario:
```text
Session 1: UPDATE products SET ... WHERE id = 1;
Session 2: UPDATE products SET ... WHERE id = 2;
Session 1: UPDATE products SET ... WHERE id = 2;  -- waits for Session 2
Session 2: UPDATE products SET ... WHERE id = 1;  -- waits for Session 1
-- DEADLOCK — PostgreSQL kills one transaction
```
:::

## Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **No WHERE = update all rows** | Always preview with SELECT first. Wrap in a transaction so you can ROLLBACK |
| 2 | **UPDATE is not INSERT** | If no row matches WHERE, no error — zero rows affected. Check `RETURNING` or `GET DIAGNOSTICS` |
| 3 | **Row lock contention** | Long transactions with UPDATE block other sessions. Keep them short |
| 4 | **Deadlocks from inconsistent update order** | Always update rows in the same order across transactions to prevent deadlocks |
| 5 | **Index overhead on indexed column updates** | Updating an indexed column also updates the index — slower. Consider if you can avoid indexing volatile columns |
| 6 | **Triggers fire on UPDATE** | `BEFORE UPDATE` and `AFTER UPDATE` triggers execute. Bulk updates can be slow if triggers do heavy work |
| 7 | **FK checks on FK column changes** | If you update a FK column, PostgreSQL checks the new value exists in the parent — same cost as INSERT |
| 8 | **`ON UPDATE CASCADE` propagates changes** | If a parent PK is updated with `ON UPDATE CASCADE`, child rows are updated silently — can affect many rows |

## Cross-Reference

| Operation | Description | Link |
|-----------|-------------|------|
| INSERT | Add new rows | [INSERT](./001-insert.md) |
| UPSERT | Insert or update on conflict | [UPSERT](./001-insert.md#on-conflict-upsert) |
| UPDATE | Modify existing rows | [UPDATE](./002-update.md) |
| DELETE | Remove existing rows | [DELETE](./003-delete.md) |
| TRUNCATE | Fast remove all rows | [TRUNCATE](./003-delete.md#truncate-vs-delete-vs-drop) |
| WHERE | Filter rows with conditions | [WHERE](../003-Data-querying/002-where.md) |
| Operators | Arithmetic, comparison, logical operators | [Operators](../003-Data-querying/005-operators.md) |

## Cheat Sheet

```plsql
-- ==================== BASIC UPDATE ====================
UPDATE t SET col = val WHERE condition;                    -- single column, filtered
UPDATE t SET col = val;                                    -- ALL rows (careful!)

-- ==================== MULTI-COLUMN ====================
UPDATE t SET col1 = v1, col2 = v2 WHERE id = 1;           -- multiple columns

-- ==================== EXPRESSIONS ====================
UPDATE t SET col = col + 1 WHERE id = 1;                   -- increment
UPDATE t SET col = col * 1.10;                              -- percentage increase
UPDATE t SET col = UPPER(col);                             -- function transform

-- ==================== SUBQUERY ====================
UPDATE t SET col = (SELECT x FROM src WHERE ...);           -- subquery for value

-- ==================== FROM (PostgreSQL) ====================
UPDATE t SET col = s.col FROM src s WHERE t.id = s.id;    -- join-based update

-- ==================== CASE (conditional) ====================
UPDATE t SET col = CASE WHEN cond1 THEN v1 WHEN cond2 THEN v2 ELSE col END;

-- ==================== RETURNING (PostgreSQL) ====================
UPDATE t SET col = val WHERE id = 1 RETURNING *;
UPDATE t SET col = val WHERE id = 1 RETURNING id, col;
UPDATE t SET col = val WHERE id IN (1,2,3) RETURNING id, col;

-- ==================== SAFE UPDATE PATTERN ====================
BEGIN;
SELECT * FROM t WHERE condition;                           -- preview
UPDATE t SET col = val WHERE condition;                    -- apply
COMMIT;                                                    -- or ROLLBACK if wrong
```
