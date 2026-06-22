# DELETE — Removing Data

:::note

DML command that removes existing rows from a table. Can delete one row, many rows, or all rows. DML requires an explicit `COMMIT` unless auto-commit is enabled.
:::

:::tip Same Reference Schema

Uses the same [e-commerce schema](../001-Data-foundation/001-creation.md). Refer there for `users`, `products`, `orders`, and `order_items` table definitions.
:::

## Basic DELETE

```plsql
DELETE FROM users WHERE id = 5;
```

**Execution order for DELETE:**
```text
1. Check table existence and user privileges
2. Evaluate WHERE clause — identify rows to delete
3. Acquire row locks on matching rows
4. Evaluate FK constraints — check if child rows reference these rows
5. Fire BEFORE DELETE triggers
6. Delete rows (mark as dead tuples in PostgreSQL)
7. Fire AFTER DELETE triggers
8. Update indexes (remove index entries for deleted rows)
```

## DELETE Syntax Variations

### 1. Delete All Rows (no WHERE)

```plsql
DELETE FROM products;
```

:::danger

Omitting `WHERE` deletes **every row** in the table. The table structure remains but data is gone. Use `TRUNCATE` instead if you want to empty a table — it's faster (see comparison below). Preview with SELECT first:

```plsql
-- Preview before deleting
SELECT COUNT(*) FROM products WHERE discontinued = TRUE;
-- Then delete
DELETE FROM products WHERE discontinued = TRUE;
```
:::

### 2. Delete with WHERE

```plsql
-- Delete a single product
DELETE FROM products WHERE id = 10;

-- Delete multiple rows
DELETE FROM products WHERE stock_qty = 0 AND discontinued = TRUE;

-- Delete using date comparison
DELETE FROM users WHERE created_at < '2020-01-01' AND is_active = FALSE;
```

### 3. Delete with Subquery

```plsql
-- Delete products that have never been ordered
DELETE FROM products
WHERE id NOT IN (SELECT DISTINCT product_id FROM order_items);

-- Delete users with low total spending
DELETE FROM users
WHERE id IN (
    SELECT u.id
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    GROUP BY u.id
    HAVING COALESCE(SUM(oi.quantity * oi.unit_price), 0) < 5.00
);
```

### 4. DELETE with USING (PostgreSQL-specific)

Joins another table to determine which rows to delete:

```plsql
-- Delete order items for cancelled orders
DELETE FROM order_items
USING orders
WHERE order_items.order_id = orders.id
  AND orders.status = 'cancelled';

-- Delete from one table based on a condition in another
DELETE FROM products
USING order_items oi
WHERE products.id = oi.product_id
  AND oi.unit_price < 5.00;
```

:::tip

`DELETE ... USING` is more efficient than `WHERE IN (subquery)` for large datasets — the join runs once, not per row.
:::

### 5. DELETE with RETURNING (PostgreSQL-specific)

Returns the deleted rows — useful for logging, archiving, or undo:

```plsql
-- Delete and return deleted rows
DELETE FROM products WHERE id = 10
RETURNING *;

-- Return specific columns
DELETE FROM users WHERE is_active = FALSE AND created_at < '2020-01-01'
RETURNING id, username, email;

-- RETURNING with expression
DELETE FROM order_items WHERE order_id = 1
RETURNING id, product_id, quantity, quantity * unit_price AS line_total;

-- Archive deleted rows into a log table
WITH deleted AS (
    DELETE FROM users WHERE is_active = FALSE AND created_at < '2020-01-01'
    RETURNING *
)
INSERT INTO users_archive SELECT * FROM deleted;
```

### 6. DELETE with JOIN (standard SQL alternative)

If you cannot use `USING`, use `WHERE EXISTS`:

```plsql
DELETE FROM products p
WHERE EXISTS (
    SELECT 1 FROM order_items oi
    WHERE oi.product_id = p.id AND oi.unit_price > 100.00
);
```

## TRUNCATE vs DELETE vs DROP

| Operation | Removes Data | Removes Structure | Can Rollback (PG) | Speed | Resets Sequences | Fires Triggers | Can use WHERE |
|-----------|-------------|-------------------|-------------------|-------|-----------------|---------------|--------------|
| `DELETE FROM t` | Yes | No | Yes | Slow (row-by-row) | No | Yes | Yes |
| `TRUNCATE t` | Yes | No | Yes | Fast (deallocates pages) | Yes | No | No |
| `DROP TABLE t` | Yes | Yes | Yes | Instant | N/A | N/A | N/A |

```plsql
-- DELETE: slow, fires triggers, can filter
DELETE FROM products WHERE discontinued = TRUE;

-- TRUNCATE: fast, no triggers, resets sequences, can't filter
TRUNCATE products;
TRUNCATE products RESTART IDENTITY CASCADE;  -- + reset sequences + cascade to child tables

-- DROP: removes table entirely
DROP TABLE products;
```

:::tip

For removing all rows, `TRUNCATE` is faster than `DELETE` because it deallocates entire disk pages instead of marking individual rows. But TRUNCATE cannot use WHERE, does not fire triggers, and requires stronger locks.

```plsql
-- TRUNCATE with CASCADE — truncates child tables too
TRUNCATE users CASCADE;
-- Equivalent to: DELETE FROM users (but much faster, no triggers fired)
```
:::

## Foreign Key Behavior on DELETE

What happens when you delete a parent row depends on the `ON DELETE` action defined on the FK:

| FK Action | Behavior on DELETE FROM parent |
|-----------|-------------------------------|
| `ON DELETE NO ACTION` (default) | Blocks delete if child rows exist — error |
| `ON DELETE RESTRICT` | Blocks delete — same as NO ACTION, checked immediately |
| `ON DELETE CASCADE` | Silently deletes child rows too |
| `ON DELETE SET NULL` | Sets child FK column to NULL |
| `ON DELETE SET DEFAULT` | Sets child FK column to its DEFAULT value |

```plsql
-- This will fail if orders exist for user 5
DELETE FROM users WHERE id = 5;
-- ERROR:  update or delete on table "users" violates foreign key
-- constraint "orders_user_id_fkey" on table "orders"
-- DETAIL:  Key (id)=(5) is still referenced from table "orders".

-- To delete user 5 and all their orders:
DELETE FROM orders WHERE user_id = 5;    -- delete children first
DELETE FROM users WHERE id = 5;           -- now parent delete succeeds
```

:::warning Cascade Deletes

`ON DELETE CASCADE` deletes child rows **silently**. `DELETE FROM users WHERE id = 1` could delete thousands of rows in `orders`, `order_items`, and other child tables without any additional error. Always know your FK relationships before deleting.

```plsql
-- Check FK relationships before deleting
SELECT
    conname AS constraint_name,
    confdeltype AS delete_action
FROM pg_constraint
WHERE confrelid = 'users'::regclass;
-- confdeltype codes: 'a' = NO ACTION, 'r' = RESTRICT, 'c' = CASCADE, 'n' = SET NULL, 'd' = SET DEFAULT
```
:::

## DELETE Performance

| Technique | Why Faster |
|-----------|------------|
| **Batch with WHERE IN** | Delete many rows in one statement instead of looping |
| **Use TRUNCATE for full table** | Deallocates pages instead of row-by-row marking |
| **Delete in chunks for large tables** | Avoids long-running locks and transaction bloat |
| **Remove indexes during bulk delete** | Drop, delete, recreate (reduces index maintenance) |
| **Disable triggers during bulk delete** | Re-enable after |

```plsql
-- Delete in chunks to avoid long locks (use in a loop)
DELETE FROM audit_log
WHERE created_at < '2020-01-01'
LIMIT 10000;
-- Repeat until 0 rows affected
```

## Locking Behavior

DELETE acquires **row-level locks** on the rows it deletes. It also acquires **ACCESS EXCLUSIVE lock** on the table if the table has foreign keys referencing it (to prevent concurrent inserts that could create orphan references).

```plsql
-- Session 1
BEGIN;
DELETE FROM products WHERE id = 1;
-- Row 1 is locked (will be deleted on commit)

-- Session 2 (runs in another connection)
DELETE FROM order_items WHERE product_id = 1;
-- BLOCKED — waits for Session 1 to commit (because of FK check)

-- Session 3
SELECT * FROM products WHERE id = 1;
-- NOT blocked — SELECT doesn't wait for row locks (in default READ COMMITTED)
-- But the row may still be visible if Session 1 hasn't committed yet
```

:::warning Lock Contention

Long-running DELETE transactions block other operations that need to check FK references. For large deletes, delete in batches inside a loop with short transactions.

```plsql
-- Batch delete pattern — keeps transactions short
DO $$
DECLARE
    deleted_rows INT;
BEGIN
    LOOP
        DELETE FROM audit_log
        WHERE ctid IN (
            SELECT ctid FROM audit_log
            WHERE created_at < '2020-01-01'
            LIMIT 10000
        );
        GET DIAGNOSTICS deleted_rows = ROW_COUNT;
        EXIT WHEN deleted_rows = 0;
        COMMIT;  -- release locks, apply changes
    END LOOP;
END $$;
```
:::

## Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **No WHERE = delete all rows** | Always preview with SELECT first. Wrap in a transaction |
| 2 | **DELETE is not TRUNCATE** | DELETE keeps the storage for new rows; TRUNCATE releases it to the OS |
| 3 | **Dead tuples (PostgreSQL)** | DELETE marks rows as dead — VACUUM is needed to reclaim space. Autovacuum handles this but large deletes may need manual `VACUUM` |
| 4 | **CASCADE can cause unexpected data loss** | `DELETE FROM parent CASCADE` may delete data you didn't intend to remove |
| 5 | **DELETE locks child table checks** | When deleting from a parent, FK constraints check child tables — can cause contention |
| 6 | **DELETE FROM inherited tables** | `DELETE FROM parent` deletes from parent and all children. Use `DELETE FROM ONLY parent` to restrict to parent only |
| 7 | **DELETE with LIMIT in PostgreSQL** | `DELETE FROM t WHERE condition LIMIT n` is not valid PostgreSQL syntax. Use subquery with `ctid` or `IN (SELECT ... LIMIT n)` |
| 8 | **DELETE does not reset sequences** | Unlike TRUNCATE, DELETE does not reset SERIAL sequences. If you DELETE all rows and insert new ones, id values continue from where they left off |

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
-- ==================== BASIC DELETE ====================
DELETE FROM t WHERE condition;                             -- filtered delete
DELETE FROM t;                                             -- ALL rows (use TRUNCATE instead)

-- ==================== SUBQUERY ====================
DELETE FROM t WHERE id IN (SELECT id FROM src WHERE ...);  -- delete based on related data

-- ==================== USING (PostgreSQL) ====================
DELETE FROM t USING src WHERE t.id = src.id;               -- join-based delete

-- ==================== RETURNING (PostgreSQL) ====================
DELETE FROM t WHERE condition RETURNING *;                 -- return deleted rows
DELETE FROM t WHERE condition RETURNING id, col;           -- specific columns

-- ==================== TRUNCATE (faster than DELETE all) ====================
TRUNCATE t;                                                -- remove all rows, keep table
TRUNCATE t RESTART IDENTITY;                               -- + reset sequences
TRUNCATE t CASCADE;                                        -- + truncate child tables
TRUNCATE t RESTART IDENTITY CASCADE;                       -- all together

-- ==================== SAFE DELETE PATTERN ====================
BEGIN;
SELECT COUNT(*) FROM t WHERE condition;                    -- preview count
DELETE FROM t WHERE condition RETURNING *;                 -- delete and verify
COMMIT;                                                    -- or ROLLBACK if wrong

-- ==================== BATCH DELETE (large tables) ====================
DELETE FROM t WHERE ctid IN (
    SELECT ctid FROM t WHERE condition LIMIT 10000
);
-- Repeat in loop until 0 rows affected, COMMIT each batch
```
