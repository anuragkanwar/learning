# INSERT — Adding Data to Tables

:::note

DML command that adds new rows to a table. Each INSERT creates one or more tuples (rows) in the relation (table). DML requires an explicit `COMMIT` unless auto-commit is enabled.
:::

## Reference Schema

Uses the same [e-commerce schema](../001-Data-foundation/001-creation.md):

```plsql
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(50) NOT NULL UNIQUE,
    email       VARCHAR(255) NOT NULL UNIQUE,
    full_name   VARCHAR(100) NOT NULL,
    age         INT CHECK (age >= 13),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    price       NUMERIC(10,2) NOT NULL CHECK (price > 0),
    stock_qty   INT NOT NULL DEFAULT 0 CHECK (stock_qty >= 0)
);

CREATE TABLE orders (
    id            SERIAL PRIMARY KEY,
    user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_date    TIMESTAMPTZ DEFAULT NOW(),
    status        VARCHAR(20) DEFAULT 'pending'
                  CHECK (status IN ('pending', 'shipped', 'delivered', 'cancelled'))
);

CREATE TABLE order_items (
    id            SERIAL PRIMARY KEY,
    order_id      INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id    INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity      INT NOT NULL CHECK (quantity > 0),
    unit_price    NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0)
);
```

## Basic INSERT

```plsql
INSERT INTO users (username, email, full_name, age)
VALUES ('alice', 'alice@example.com', 'Alice Wonder', 28);
```

**Execution order for a single INSERT:**
```text
1. Check table existence and user privileges
2. Evaluate DEFAULT values for omitted columns
3. Evaluate CHECK constraints
4. Evaluate NOT NULL constraints
5. Evaluate UNIQUE / PK constraints
6. Evaluate FK constraints
7. Write row to disk (WAL-logged)
8. Update indexes
```

## INSERT Syntax Variations

### 1. Insert with All Columns (positional, fragile)

```plsql
-- Depends on column order in table definition — breaks if schema changes
INSERT INTO users VALUES (1, 'alice', 'alice@example.com', 'Alice Wonder', 28, TRUE, NOW());
```

:::warning

Avoid positional INSERT. Always specify the column list. Positional breaks silently when columns are added or reordered. It also makes the code unreadable — you have to count positions to know which value maps to which column.
:::

### 2. Insert with Column List (preferred)

```plsql
-- Columns in any order, omits auto-generated (SERIAL) and DEFAULT columns
INSERT INTO users (username, email, full_name, age)
VALUES ('bob', 'bob@example.com', 'Bob Builder', 35);

-- id (SERIAL) is auto-generated, is_active/created_at use DEFAULT
```

### 3. Insert Multiple Rows in One Statement

```plsql
INSERT INTO products (name, price, stock_qty)
VALUES
    ('T-Shirt',   19.99, 100),
    ('Jeans',     49.99,  50),
    ('Socks',      5.99, 200),
    ('Hat',       14.99,  75);
```

:::tip

A single multi-row INSERT is **much faster** than individual INSERTs — one round trip, single parse, batched WAL writes. For bulk loads, prefer a single statement over looping in application code.
:::

**Key behaviors of multi-row INSERT:**
- **Atomic** — either all rows succeed or all fail. One bad row (e.g., NULL in NOT NULL column) rolls back the entire batch.
- **One constraint check per row** — each row is checked independently, but a single failure aborts the whole statement.
- **Batch size matters** — 500-1000 rows per statement is optimal. Above that, parse time and memory grow. Split large imports into chunks.

```plsql
-- Bad row kills the entire batch
INSERT INTO products (name, price, stock_qty)
VALUES
    ('Good Product', 10.00, 50),
    ('Bad Product',  -5.00, 10),   -- violates CHECK (price > 0)
    ('Also Good',    15.00, 30);
-- ERROR: new row violates check constraint "chk_positive_price"
-- Nothing is inserted — not even 'Good Product' or 'Also Good'

-- Fix: validate data before insert, or use a staging table with no constraints
```

**Multi-row with DEFAULT and NULL mixed:**

```plsql
INSERT INTO products (name, price, stock_qty)
VALUES
    ('Item A', 10.00, DEFAULT),   -- stock_qty uses DEFAULT (0)
    ('Item B', 15.00, 20),
    ('Item C', 12.00, NULL);      -- if column allows NULL, but this one has NOT NULL → error
```

### 4. Quotes and String Escaping

String values in PostgreSQL are delimited by **single quotes** (`'`). To include a single quote inside a string, double it (`''`).

```plsql
-- Single quote inside a string — use two single quotes
INSERT INTO products (name, price, stock_qty)
VALUES ('Men''s T-Shirt', 19.99, 100);
-- Stored as: Men's T-Shirt

-- Apostrophes, contractions, possessives all need escaping
INSERT INTO users (username, email, full_name, age)
VALUES ('denis', 'denis@example.com', 'Denis O''Brien', 34);
-- Stored as: Denis O'Brien
```

**Three ways to handle quotes in PostgreSQL:**

| Method | Syntax | Example | Use Case |
|--------|--------|---------|----------|
| Double the quote | `'It''s fine'` | `'O''Brien'` | Simple, works everywhere |
| Dollar quoting | `$$It's fine$$` | `$$O'Brien$$` | Clean for strings with many quotes (PostgreSQL-only) |
| Escape string | `E'It\'s fine'` | `E'O\'Brien'` | C-style backslash escapes (avoid — non-standard) |

```plsql
-- Dollar quoting — no need to escape quotes
INSERT INTO users (username, email, full_name, age)
VALUES ('denis', 'denis@example.com', $$Denis O'Brien$$, 34);

-- Dollar quoting with a tag (useful for nested quotes in functions)
INSERT INTO products (name, description, price)
VALUES (
    'Mug',
    $desc$Ceramic mug with "World's Best Dad" print$desc$,
    12.99
);
-- Tag can be any identifier: $desc$, $text$, $json$, etc.

-- Escape string (C-style) — needs standard_conforming_strings = OFF (not recommended)
INSERT INTO products (name, price) VALUES (E'O\'Brian\'s Coffee', 15.00);
```

:::tip

Use doubled single quotes (`''`) for simple cases. Use dollar quoting (`$$...$$`) for strings with many quotes, special characters, or multi-line text. Avoid `E'...\'...'` escape strings — they are non-standard and require `standard_conforming_strings = OFF`.
:::

**Non-printable and special characters:**

```plsql
-- Newline inside a string
INSERT INTO products (name, description, price)
VALUES ('Book', 'A great book
about SQL databases', 29.99);
-- A newline in the source becomes a newline in the stored string

-- Tab character with dollar quoting
INSERT INTO products (name, description, price)
VALUES ('Book', $$First line	Second line (tab separated)$$, 29.99);

-- Unicode escapes (PostgreSQL 9.2+)
INSERT INTO products (name, price)
VALUES (U&'caf\00E9', 3.50);
-- \00E9 = é (Unicode code point) — stored as: café
```

```plsql
-- Uses DEFAULT for is_active (TRUE) and created_at (NOW())
INSERT INTO users (username, email, full_name, age, is_active)
VALUES ('charlie', 'charlie@example.com', 'Charlie King', 22, DEFAULT);

-- Explicit NULL (if column allows it — PK and NOT NULL columns reject NULL)
INSERT INTO users (username, email, full_name, age)
VALUES ('dave', 'dave@example.com', 'Dave Doe', NULL);
-- age becomes NULL (column has no NOT NULL constraint)
```

### 5. INSERT ... SELECT (Insert from Query)

Copies rows from one table (or query) into another. Column types must be compatible.

```plsql
-- Create a log table and populate from users
CREATE TABLE user_export (username VARCHAR(50), email VARCHAR(255));

INSERT INTO user_export (username, email)
SELECT username, email FROM users WHERE is_active = TRUE;

-- Can use any valid SELECT: JOINs, aggregation, subqueries
INSERT INTO order_summary (user_id, total_orders, total_spent)
SELECT
    u.id,
    COUNT(o.id),
    COALESCE(SUM(oi.quantity * oi.unit_price), 0)
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY u.id;
```

### 6. INSERT ... RETURNING (PostgreSQL-specific)

Returns data from the inserted rows. Avoids a separate SELECT to read back auto-generated values, computed columns, or defaults. Runs in the same transaction — no race condition.

**What you can return:**
- Column values (including defaults and auto-generated ids)
- Expressions and computations
- `*` for all columns
- Constants and literals

```plsql
-- Get back the auto-generated id and defaults
INSERT INTO users (username, email, full_name, age)
VALUES ('eve', 'eve@example.com', 'Eve Adams', 30)
RETURNING id, created_at;
--  id |          created_at
-- ----+-------------------------------
--   5 | 2026-05-27 10:30:00+00

-- Return all columns
INSERT INTO products (name, price, stock_qty)
VALUES ('Watch', 199.99, 30)
RETURNING *;

-- RETURNING with multiple rows
INSERT INTO products (name, price, stock_qty)
VALUES
    ('Belt',  29.99, 60),
    ('Scarf', 24.99, 40)
RETURNING id, name, price;
--  id | name  | price
-- ----+-------+-------
--   6 | Belt  | 29.99
--   7 | Scarf | 24.99
```

**Expressions in RETURNING:**

```plsql
-- Computed values
INSERT INTO order_items (order_id, product_id, quantity, unit_price)
VALUES (1, 1, 2, 19.99)
RETURNING id, quantity * unit_price AS line_total;
--  id | line_total
-- ----+------------
--   1 |      39.98

-- Constants and labels
INSERT INTO products (name, price, stock_qty)
VALUES ('Hat', 14.99, 75)
RETURNING id, name, price, 'INSERTED' AS action;
--  id | name | price |  action
-- ----+------+-------+----------
--   8 | Hat  | 14.99 | INSERTED
```

**RETURNING with ON CONFLICT (upsert):**

When using `ON CONFLICT ... DO UPDATE`, RETURNING returns the **final row state** (whether inserted or updated):

```plsql
INSERT INTO users (username, email, full_name, age)
VALUES ('alice', 'alice@example.com', 'Alice Wonderland', 29)
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name, age = EXCLUDED.age
RETURNING id, full_name, age, xmax AS was_updated;
-- xmax = 0 means inserted, non-zero means updated (internal tuple field)

-- Simpler: return a constant to distinguish
INSERT INTO users (username, email, full_name, age)
VALUES ('alice', 'alice@example.com', 'Alice Wonderland', 29)
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name, age = EXCLUDED.age
RETURNING id, full_name, age,
    (CASE WHEN xmax = 0 THEN 'inserted' ELSE 'updated' END) AS action;
```

**RETURNING with DELETE and UPDATE (related):**

RETURNING also works with `DELETE` and `UPDATE` — same syntax, same behavior:

```plsql
-- DELETE and return the deleted row
DELETE FROM products WHERE id = 1 RETURNING *;

-- UPDATE and return the new values
UPDATE users SET is_active = FALSE WHERE id = 5
RETURNING id, username, is_active;
```

**RETURNING with INTO (PL/pgSQL — stored procedures):**

```plsql
DO $$
DECLARE
    new_user_id INT;
BEGIN
    INSERT INTO users (username, email, full_name, age)
    VALUES ('frank', 'frank@example.com', 'Frank Castle', 40)
    RETURNING id INTO new_user_id;

    -- Use new_user_id in subsequent operations
    INSERT INTO orders (user_id) VALUES (new_user_id);
END $$;
```

## Constraint Conflicts and Errors

### PK / UNIQUE Violation

```plsql
INSERT INTO users (id, username, email, full_name, age)
VALUES (1, 'alice2', 'alice2@example.com', 'Alice Clone', 25);
-- ERROR:  duplicate key value violates unique constraint "users_pkey"
-- DETAIL:  Key (id)=(1) already exists.
```

### FK Violation

```plsql
INSERT INTO orders (user_id) VALUES (999);
-- ERROR:  insert or update on table "orders" violates foreign key constraint
-- DETAIL:  Key (user_id)=(999) is not present in table "users".
```

### CHECK Violation

```plsql
INSERT INTO users (username, email, full_name, age)
VALUES ('young', 'young@example.com', 'Young Teen', 12);
-- ERROR:  new row for relation "users" violates check constraint "users_age_check"
```

### NOT NULL Violation

```plsql
INSERT INTO users (username, email, full_name, age)
VALUES ('noname', 'noname@example.com', NULL, 20);
-- ERROR:  null value in column "full_name" violates not-null constraint
```

## ON CONFLICT — Upsert (PostgreSQL-specific)

Insert or update if the row already exists (colloquially called "upsert").

```plsql
-- Basic: on conflict, do nothing
INSERT INTO users (username, email, full_name, age)
VALUES ('alice', 'alice@example.com', 'Alice Wonder', 29)
ON CONFLICT (email) DO NOTHING;
-- If email already exists, skip. No error.

-- On conflict, update specific columns
INSERT INTO users (username, email, full_name, age)
VALUES ('alice', 'alice@example.com', 'Alice Wonderland', 29)
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    age = EXCLUDED.age;
-- EXCLUDED.full_name refers to the value we tried to insert
-- The row now has full_name = 'Alice Wonderland', age = 29

-- On conflict, use calculation
INSERT INTO products (name, price, stock_qty)
VALUES ('T-Shirt', 19.99, 50)
ON CONFLICT (name) DO UPDATE
SET stock_qty = products.stock_qty + EXCLUDED.stock_qty;
-- Adds 50 to existing stock (now 150)
```

### ON CONFLICT Requirements

| Requirement | Detail |
|-------------|--------|
| Conflict target must have a unique constraint | PK, UNIQUE, or exclusion constraint |
| `ON CONFLICT DO NOTHING` | No conflict target needed — catches any violation |
| `ON CONFLICT (col) DO UPDATE` | Must specify the constraint column(s) |
| `EXCLUDED` pseudo-table | Refers to the values that would have been inserted |

```plsql
-- ON CONFLICT DO NOTHING without specifying target — catches any constraint
INSERT INTO users (username, email, full_name, age)
VALUES ('alice', 'alice@example.com', 'Alice Wonder', 28)
ON CONFLICT DO NOTHING;
```

## INSERT Performance

| Technique | Why Faster |
|-----------|------------|
| **Batch rows in one INSERT** | Single statement, one parse, batched WAL |
| **Remove indexes during bulk load** | Drop indexes, insert, recreate (index maintenance is expensive) |
| **Use `UNLOGGED` table for staging** | Skip WAL — 10x faster, but no crash recovery |
| **Disable triggers/FKs during bulk load** | Re-enable and verify after (caution: FK violations possible) |
| **Use `COPY` instead of INSERT for bulk** | Optimized bulk load — much faster than INSERT |

```plsql
-- COPY is the fastest way to load data
COPY products (name, price, stock_qty)
FROM '/path/to/products.csv'
DELIMITER ',' CSV HEADER;
```

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

## Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **Positional INSERT breaks on schema change** | Always specify column names |
| 2 | **SERIAL columns are not auto-magical** | They use a sequence — if you manually insert an id, the sequence won't advance. Use `DEFAULT` or omit the column |
| 3 | **Inserting without column list hits DEFAULT only for columns with defaults** | Columns without DEFAULT and without NOT NULL become NULL; NOT NULL columns without DEFAULT error |
| 4 | **Batch INSERT size matters** | Very large batches (>1000 rows) can hit statement timeout or memory limits. Split into chunks of 500-1000 |
| 5 | **FK checks on every row** | Each row INSERT checks referenced tables — bulk inserts with FKs are slower |
| 6 | **ON CONFLICT DO UPDATE can update the same row multiple times** | Within a single statement, multiple conflicting rows targeting the same constraint can cause errors |
| 7 | **Inserting into inherited tables** | INSERT into parent table inserts into parent; INSERT into child inserts into child only. Use `ONLY parent` to avoid inserting into children |
| 8 | **INSERT ... SELECT locks source rows** | The SELECT acquires locks on source rows depending on isolation level |

## Cheat Sheet

```plsql
-- ==================== STANDARD INSERT ====================
INSERT INTO t (col1, col2) VALUES (v1, v2);                   -- single row
INSERT INTO t (col1, col2) VALUES (v1, v2), (v3, v4);        -- multiple rows
INSERT INTO t (col1, col2) VALUES (v1, DEFAULT);              -- use DEFAULT
INSERT INTO t VALUES (v1, v2);                                 -- positional (avoid)
INSERT INTO t (col1, col2) SELECT a, b FROM src;              -- insert from query

-- ==================== POSTGRESQL-SPECIFIC ====================
INSERT INTO t (col1) VALUES (v1) RETURNING id;                -- return auto-generated id
INSERT INTO t (col1) VALUES (v1) RETURNING *;                 -- return full row

-- ==================== UPSERT (ON CONFLICT) ====================
INSERT INTO t (uk_col, data) VALUES (v1, v2)
ON CONFLICT (uk_col) DO NOTHING;                              -- skip on conflict

INSERT INTO t (uk_col, data) VALUES (v1, v2)
ON CONFLICT (uk_col) DO UPDATE SET data = EXCLUDED.data;      -- update on conflict

INSERT INTO t (uk_col, qty) VALUES (v1, 10)
ON CONFLICT (uk_col) DO UPDATE SET qty = t.qty + EXCLUDED.qty; -- incremental update

-- ==================== BULK LOAD ====================
COPY t FROM '/path/file.csv' DELIMITER ',' CSV HEADER;        -- fastest bulk load
```
