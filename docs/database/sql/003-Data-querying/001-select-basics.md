# SELECT — Retrieving Data

> DQL command that fetches rows from a table. Read-only — no data is modified. The most fundamental and most used SQL command.

:::tip Same Reference Schema

Uses the same [e-commerce schema](../001-Data-foundation/001-creation.md). Refer there for `users`, `products`, `orders`, and `order_items` table definitions.
:::

## SELECT as Expression Calculator

SELECT does not need a table. It can evaluate expressions directly:

```plsql
SELECT 1 + 1;                     -- 2
SELECT NOW();                     -- current timestamp
SELECT UPPER('hello');            -- HELLO
SELECT CURRENT_DATE;             -- 2026-05-27
SELECT 10 * 3, 'abc' || 'def';  -- 30 | abcdef
SELECT RANDOM();                 -- random float between 0 and 1
SELECT 2 + 2 AS result;          -- 4 (with alias)
```

**Multiple expressions in one SELECT:**

```plsql
SELECT
    10 + 20 AS sum,
    'PostgreSQL' AS db_name,
    NOW() AS current_time,
    9.99 * 3 AS total_cost;
--  sum |  db_name    |       current_time       | total_cost
-- -----+-------------+--------------------------+------------
--   30 | PostgreSQL   | 2026-05-27 10:30:00+00  |      29.97
```

:::info

PostgreSQL allows SELECT without FROM — useful for quick calculations, function testing, and debugging. Most other databases require `FROM dual` (Oracle) or similar.
:::

## SELECT All Columns

```plsql
SELECT * FROM users;
-- Returns every column (id, username, email, full_name, age, is_active, created_at)
-- and every row from the users table
```

| Pros | Cons |
|------|------|
| Quick to write | Returns unnecessary columns (wasted bandwidth) |
| Good for ad-hoc exploration | Breaks if column order changes (in code) |
| | Cannot see which columns are available |

:::warning

Avoid `SELECT *` in production code (views, functions, application queries). Always list specific columns so your code is explicit about what data it needs. Column additions or renames won't silently break your application.
:::

## SELECT Specific Columns

```plsql
-- List the columns you want, in any order
SELECT username, email, full_name FROM users;

-- Columns appear in the result in the order listed
SELECT full_name, email, username FROM users;

-- Can mix with expressions
SELECT username, email, age, age >= 18 AS is_adult FROM users;
```

**Selecting from specific schema:**

```plsql
SELECT username FROM public.users;
SELECT username FROM users;       -- public is the default schema
```

## Column Aliases

Rename a column in the output. Use `AS` (optional but recommended for readability).

```plsql
-- Basic alias
SELECT username AS login_name FROM users;

-- Alias with spaces (needs quotes)
SELECT full_name AS "Full Name" FROM users;

-- Alias from expression
SELECT
    username,
    email,
    age >= 18 AS is_adult,
    age + 1 AS next_year_age
FROM users;

-- AS is optional (but explicit is clearer)
SELECT username login_name FROM users;          -- works, but harder to read
SELECT full_name "Full Name" FROM users;        -- implicit alias with quotes
```

| Pattern | Result Column Name |
|---------|-------------------|
| `SELECT col FROM t` | `col` |
| `SELECT col AS alias FROM t` | `alias` |
| `SELECT col alias FROM t` | `alias` (implicit, works but ambiguous) |
| `SELECT col AS "My Col" FROM t` | `My Col` (preserves case, allows spaces) |
| `SELECT expression FROM t` | `?column?` (ugly — always alias expressions) |
| `SELECT expression AS calc FROM t` | `calc` |

:::tip

Always alias expressions — otherwise the column name shows as `?column?` which is confusing.
:::

## Table Aliases

Rename a table in the query. Essential for self-joins, subqueries, and readability.

```plsql
-- Table alias
SELECT u.username, u.email
FROM users AS u;                   -- 'u' is the alias

-- AS is optional for table aliases too
SELECT u.username FROM users u;    -- same thing

-- Multiple tables with aliases
SELECT u.username, o.id AS order_id
FROM users AS u
JOIN orders AS o ON o.user_id = u.id;
```

## SELECT with Expressions in Columns

Any valid SQL expression can appear in the SELECT list:

```plsql
-- Arithmetic
SELECT
    name,
    price,
    stock_qty,
    price * stock_qty AS inventory_value,
    price * 1.10 AS price_with_tax,
    ROUND(price * 1.10, 2) AS rounded_with_tax
FROM products;

-- String functions
SELECT
    username,
    UPPER(email) AS email_upper,
    LENGTH(full_name) AS name_length,
    LEFT(username, 3) AS short_name,
    CONCAT(username, ' <', email, '>') AS contact
FROM users;

-- Date functions
SELECT
    full_name,
    AGE(created_at) AS account_age,
    EXTRACT(YEAR FROM created_at) AS signup_year,
    created_at::DATE AS signup_date
FROM users;

-- Conditional (CASE)
SELECT
    username,
    age,
    CASE
        WHEN age < 18 THEN 'minor'
        WHEN age BETWEEN 18 AND 65 THEN 'adult'
        ELSE 'senior'
    END AS age_group
FROM users;
```

## DISTINCT — Remove Duplicates

See the dedicated note: [DISTINCT](./004-distinct.md)

Covers DISTINCT vs ALL, DISTINCT on multiple columns, COUNT(DISTINCT), DISTINCT vs GROUP BY, and DISTINCT with ORDER BY restriction.

## ORDER BY — Sorting Results

See the dedicated note: [ORDER BY](./003-order-by.md)

Covers ASC/DESC, multiple columns, expressions, aliases, column position, NULLs behavior, and custom sort with CASE.

## LIMIT and OFFSET — Pagination

```plsql
-- First 10 rows
SELECT username, email FROM users LIMIT 10;

-- Skip 20 rows, then take 10 (page 3 of 10 per page)
SELECT username, email FROM users
ORDER BY id
LIMIT 10 OFFSET 20;

-- Shorthand: LIMIT 10 OFFSET 20
-- Page 1: LIMIT 10 OFFSET 0
-- Page 2: LIMIT 10 OFFSET 10
-- Page 3: LIMIT 10 OFFSET 20
```

:::warning

Always use `ORDER BY` with `LIMIT`/`OFFSET`. Without it, which rows are returned is non-deterministic (depends on physical storage order).

```plsql
-- Non-deterministic — which 5 rows?
SELECT username FROM users LIMIT 5;

-- Deterministic
SELECT username FROM users ORDER BY id LIMIT 5;
```
:::

### LIMIT vs FETCH (SQL Standard)

```plsql
-- PostgreSQL-specific
SELECT * FROM users LIMIT 10 OFFSET 20;

-- SQL standard (PostgreSQL 8.4+)
SELECT * FROM users OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;

-- WITH TIES (include tied rows)
SELECT * FROM products ORDER BY price DESC FETCH FIRST 5 ROWS WITH TIES;
-- Returns 5 cheapest products, plus any others with the same price as the 5th
```

## Execution Order

SQL has **two different orders**: the order you write clauses and the order PostgreSQL processes them.

### Syntax Order (How You Write It)

Clauses must appear in this exact order:

| Step | Clause | Required? |
|------|--------|-----------|
| 1 | `SELECT` | Yes |
| 2 | `FROM` | Yes (can omit for no-table queries) |
| 3 | `WHERE` | No |
| 4 | `GROUP BY` | No |
| 5 | `HAVING` | No |
| 6 | `ORDER BY` | No |
| 7 | `LIMIT` / `OFFSET` | No |

You cannot rearrange these. For example, WHERE before FROM or ORDER BY before WHERE always causes a syntax error. See [WHERE](./002-where.md#clause-ordering-rules) for examples.

### Execution Order (How PostgreSQL Processes It)

PostgreSQL executes clauses in this order — completely different from how you write them:

| Step | Clause | What happens |
|------|--------|--------------|
| 1 | **FROM / JOIN** | Tables are assembled and joined |
| 2 | **WHERE** | Rows are filtered |
| 3 | **GROUP BY** | Groups are formed |
| 4 | **HAVING** | Group-level filter |
| 5 | **SELECT** | **← YOU ARE HERE: columns and expressions evaluated** |
| 6 | **DISTINCT** | Duplicate rows removed |
| 7 | **ORDER BY** | Final sorting |
| 8 | **LIMIT / OFFSET** | Pagination applied |

This difference explains several common restrictions:

| Restriction | Reason |
|-------------|--------|
| Column aliases not available in WHERE | WHERE runs before SELECT creates the alias |
| Aggregate functions not allowed in WHERE | WHERE runs before GROUP BY forms groups |
| ORDER BY and GROUP BY can use aliases | PostgreSQL allows referencing output columns (standard extension) |
| DISTINCT + ORDER BY restriction | ORDER BY columns must be in SELECT list because DISTINCT may merge rows |

## Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **`SELECT *` is fragile** | Column order and count depend on table schema — breaks code relying on position |
| 2 | **Column alias not available in WHERE** | WHERE runs before SELECT — alias doesn't exist yet. Use the original expression |
| 3 | **`LIMIT` without `ORDER BY` is non-deterministic** | Without ORDER BY, no guarantee which rows the limit picks |
| 4 | **`DISTINCT` sorts rows** | See [DISTINCT](./004-distinct.md) — PostgreSQL DISTINCT implies sorting |
| 5 | **String comparison is case-sensitive** | `WHERE email = 'ALICE@EXAMPLE.COM'` does NOT match `'alice@example.com'` (unless using `ILIKE` or `citext`) |
| 6 | **Integer division truncates** | `SELECT 5/2` returns `2`, not `2.5`. Use `5/2.0` or `5::numeric/2` |
| 7 | **`OFFSET` skips rows even if not needed** | Large OFFSET values still scan all skipped rows — slow for deep pagination |
| 8 | **`*` does not expand with `SELECT t.*` in views** | In views, `SELECT *` captures the column list at view creation time, not at query time |

## Cross-Reference

| Operation | Description | Link |
|-----------|-------------|------|
| INSERT | Add new rows | [INSERT](../002-Data-manipulation/001-insert.md) |
| UPDATE | Modify existing rows | [UPDATE](../002-Data-manipulation/002-update.md) |
| DELETE | Remove existing rows | [DELETE](../002-Data-manipulation/003-delete.md) |
| ORDER BY | Sorting (ASC/DESC, NULLs, expressions) | [ORDER BY](./003-order-by.md) |
| DISTINCT | Remove duplicate rows | [DISTINCT](./004-distinct.md) |
| Operators | Arithmetic, comparison, logical operators | [Operators](./005-operators.md) |
| WHERE | Filter rows with conditions | [WHERE](./002-where.md) |
| LIMIT / OFFSET | Pagination and row restriction | [LIMIT / OFFSET](./006-limit-offset.md) |
| GROUP BY / HAVING | Aggregation, grouping, filtering groups | [GROUP BY / HAVING](./007-group-by.md) |
| Joins | Combine tables | coming soon |

## Cheat Sheet

```plsql
-- ==================== SELECT BASICS ====================
SELECT * FROM t;                                         -- all columns
SELECT col1, col2 FROM t;                                -- specific columns
SELECT col AS alias FROM t;                              -- column alias
SELECT t.col FROM t AS t_alias;                          -- table alias

-- ==================== EXPRESSIONS ====================
SELECT 1 + 1;                                            -- arithmetic
SELECT NOW();                                            -- function call
SELECT UPPER(col) FROM t;                                -- function on column
SELECT col * 1.1 AS new_val FROM t;                      -- expression + alias
SELECT CASE WHEN cond THEN x ELSE y END FROM t;          -- conditional

-- ==================== ORDER BY ====================
SELECT col FROM t ORDER BY col;                          -- ascending (default)
SELECT col FROM t ORDER BY col DESC;                     -- descending
SELECT col FROM t ORDER BY col DESC NULLS LAST;          -- control NULL position
SELECT col FROM t ORDER BY 1;                            -- by position (fragile)

-- ==================== LIMIT / OFFSET ====================
SELECT col FROM t LIMIT 10;                              -- first 10
SELECT col FROM t LIMIT 10 OFFSET 20;                    -- page 3 of 10
SELECT col FROM t ORDER BY id FETCH FIRST 10 ROWS ONLY; -- SQL standard
```
