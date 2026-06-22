# DISTINCT — Removing Duplicate Rows

> DQL clause that filters out duplicate rows from the result set. DISTINCT considers the **entire row** — two rows are duplicates only if all selected columns match.

## Execution Order

DISTINCT runs after SELECT computes the rows but before ORDER BY sorts them. The full pipeline:

| Step | Clause | What happens |
|------|--------|--------------|
| 1 | **FROM / JOIN** | Tables are assembled and joined |
| 2 | **WHERE** | Rows are filtered |
| 3 | **GROUP BY** | Groups are formed |
| 4 | **HAVING** | Group-level filter |
| 5 | **SELECT** | Columns and expressions evaluated |
| 6 | **DISTINCT** | **← YOU ARE HERE: duplicate rows removed** |
| 7 | **ORDER BY** | Final sorting |
| 8 | **LIMIT / OFFSET** | Pagination applied |

The execution position explains several DISTINCT restrictions:

- **ORDER BY with DISTINCT requires columns in SELECT** — ORDER BY runs after DISTINCT, which may have merged rows
- **DISTINCT removes duplicates after SELECT evaluates expressions** — aliases are available to DISTINCT
- **DISTINCT is not an aggregator** — it removes duplicate rows but cannot compute sums or counts (use GROUP BY for that)

## DISTINCT on a Single Column

```plsql
-- Unique status values
SELECT DISTINCT status FROM orders;
--  status
-- ----------
--  pending
--  shipped
--  delivered
--  cancelled

-- Unique user IDs from orders
SELECT DISTINCT user_id FROM orders;
-- Only returns users who have placed at least one order, each once
```

## DISTINCT on Multiple Columns

Uniqueness is checked across the **combination** of selected columns, not per column.

```plsql
-- Every unique (user_id, status) pair
SELECT DISTINCT user_id, status FROM orders;

-- Example result:
--  user_id | status
-- ---------+-----------
--    1     | pending
--    1     | delivered
--    2     | pending
--    2     | shipped
--    2     | delivered
--    3     | cancelled
```

:::info

`DISTINCT user_id, status` returns rows where the **pair** is unique. User 1 appears twice (pending + delivered) — that's correct. If you want unique user_id alone, use `SELECT DISTINCT user_id` instead.
:::

## DISTINCT vs ALL

`ALL` is the default (returns all rows, including duplicates). `DISTINCT` is the exception.

| `SELECT ALL col` | `SELECT DISTINCT col` |
|-----------------|----------------------|
| Returns every row | Returns only unique rows |
| Includes duplicates | Filters out duplicates |
| Default behavior (ALL is implicit) | Explicit deduplication |
| `SELECT col` = `SELECT ALL col` | Must write DISTINCT explicitly |

```plsql
SELECT ALL status FROM orders;      -- all rows, duplicates included
SELECT status FROM orders;          -- same as above (ALL is default)
SELECT DISTINCT status FROM orders; -- only unique values
```

## DISTINCT with Multiple Columns (Edge Cases)

DISTINCT considers the **whole row tuple** — partial duplicates are kept:

```plsql
-- Data:
--  user_id | status
-- ---------+----------
--    1     | pending
--    1     | shipped
--    2     | pending
--    2     | pending     ← full duplicate

SELECT DISTINCT user_id, status FROM orders;
--  user_id | status
-- ---------+----------
--    1     | pending
--    1     | shipped
--    2     | pending    (the duplicate row is removed)
```

## DISTINCT with NULLs

Multiple NULLs are treated as identical — DISTINCT returns one NULL row:

```plsql
-- If some users have NULL age:
SELECT DISTINCT age FROM users;
--  age
-- ------
--  25
--  35
--  42
--  NULL   (only one NULL row, even if multiple users have NULL age)
```

## COUNT(DISTINCT ...)

Count unique values — very common for reporting:

```plsql
-- Count of unique statuses
SELECT COUNT(DISTINCT status) FROM orders;   -- 4

-- Count of distinct users who ordered
SELECT COUNT(DISTINCT user_id) FROM orders;  -- how many unique customers

-- Count distinct product-category pairs
SELECT COUNT(DISTINCT (product_id, order_id)) FROM order_items;
```

:::warning

`COUNT(DISTINCT col)` is slower than `COUNT(col)` or `COUNT(*)` because PostgreSQL must sort or hash the values to find unique ones. On large tables, it can be expensive.
:::

## DISTINCT vs GROUP BY

Both can remove duplicates, but they serve different purposes:

| `SELECT DISTINCT col FROM t` | `SELECT col FROM t GROUP BY col` |
|------------------------------|----------------------------------|
| Returns unique values only | Returns unique values only |
| No aggregation possible | Can include aggregates (`COUNT`, `SUM`, etc.) |
| Sorts rows (PostgreSQL) | Sorts rows |
| Limited to column list | Can include expressions, HAVING filters |

```plsql
-- Same result:
SELECT DISTINCT status FROM orders;
SELECT status FROM orders GROUP BY status;

-- GROUP BY can do more — add aggregates:
SELECT status, COUNT(*), SUM(quantity)
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
GROUP BY status;
-- DISTINCT cannot do this
```

:::tip

Use `DISTINCT` when you just need unique rows. Use `GROUP BY` when you need unique rows **plus** aggregates (counts, sums, averages) or HAVING filters.
:::

## DISTINCT with ORDER BY Restriction

When using DISTINCT, the ORDER BY clause can only use columns in the SELECT list:

```plsql
-- Works: ORDER BY column is in SELECT
SELECT DISTINCT status FROM orders ORDER BY status;

-- Works: first name then last name
SELECT DISTINCT status, user_id FROM orders ORDER BY status;

-- Error: created_at not in SELECT
SELECT DISTINCT user_id FROM orders ORDER BY created_at;
-- ERROR:  for SELECT DISTINCT, ORDER BY expressions must appear in select list
```

**Why?** DISTINCT removes duplicates *before* ORDER BY runs. If a column is not in SELECT, it might be different across duplicate rows — PostgreSQL doesn't know which value to use for sorting.

```plsql
-- Workaround: use GROUP BY instead (can ORDER BY any column)
SELECT user_id FROM orders GROUP BY user_id ORDER BY MAX(created_at);
```

## DISTINCT ON (PostgreSQL-specific)

PostgreSQL extends SQL with `DISTINCT ON (expr)` — keeps the **first row** per unique value:

```plsql
-- Keep the most recent order per user
SELECT DISTINCT ON (user_id)
    id, user_id, status, order_date
FROM orders
ORDER BY user_id, order_date DESC;

-- DISTINCT ON (user_id): one row per user
-- ORDER BY user_id, order_date DESC: which row to keep (the newest)
-- Returns: the latest order for each user
```

**Rules for DISTINCT ON:**

| Rule | Detail |
|------|--------|
| `DISTINCT ON (col1, col2)` | Uniqueness checked on these columns |
| ORDER BY must start with the DISTINCT ON columns | Same columns, same order — then additional columns for tie-breaking |
| First row per group is kept | Determined by ORDER BY after the DISTINCT ON columns |

```plsql
-- Latest product price change per product
SELECT DISTINCT ON (product_id)
    product_id, price, changed_at
FROM product_price_history
ORDER BY product_id, changed_at DESC;

-- Cheapest product per category
SELECT DISTINCT ON (category)
    name, category, price
FROM products
ORDER BY category, price ASC;
```

:::warning

DISTINCT ON without ORDER BY is non-deterministic — PostgreSQL picks an arbitrary row. Always specify ORDER BY to control which row is kept.
:::

## DISTINCT in Subqueries

Useful for deduplication before joining:

```plsql
-- Get users who placed orders, then join to user details
SELECT u.username, u.email
FROM users u
JOIN (SELECT DISTINCT user_id FROM orders) o ON o.user_id = u.id;
```

## DISTINCT Performance

| Factor | Impact |
|--------|--------|
| **Sort-based** | PostgreSQL sorts rows to find duplicates — O(n log n) |
| **Hash-based** | With `work_mem` large enough, PostgreSQL uses hashing — O(n) |
| **Large result sets** | May spill to disk — significantly slower |
| **Many columns** | More columns = more data to compare = slower |

```sql
-- Check if a DISTINCT query uses sort or hash in the plan
EXPLAIN SELECT DISTINCT status FROM orders;
--  HashAggregate  (preferred — uses hashing, faster)
--  Sort + Unique  (less efficient — sorts all rows first)
```

```plsql
-- If sorting, increase work_mem for this session
SET work_mem = '128MB';
SELECT DISTINCT expensive_column FROM large_table;
```

## Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **DISTINCT sorts rows** | In PostgreSQL, DISTINCT implies sorting — can be slow on large datasets. Use `GROUP BY` if you need to avoid the sort |
| 2 | **ORDER BY restriction** | With DISTINCT, ORDER BY columns must appear in SELECT list |
| 3 | **DISTINCT ON without ORDER BY is random** | Which row is kept is arbitrary — always specify ORDER BY |
| 4 | **DISTINCT is not DISTINCT ON** | Plain DISTINCT deduplicates the whole row. `DISTINCT ON (col)` deduplicates by specific columns, keeping the first row |
| 5 | **DISTINCT with JOIN can be a smell** | If you need `SELECT DISTINCT` after a JOIN, the join likely creates duplicates — consider if the join logic is correct |
| 6 | **COUNT(DISTINCT) is slow** | Must find unique values before counting. For approximate counts, consider `pg_stats` or extensions |

## Cross-Reference

| Topic | Description | Link |
|-------|-------------|------|
| SELECT Basics | All columns, aliases, expressions | [SELECT Basics](./001-select-basics.md) |
| ORDER BY | Sorting results | [ORDER BY](./003-order-by.md) |
| DISTINCT | Remove duplicates | [DISTINCT](./004-distinct.md) |
| Operators | Arithmetic, comparison, logical operators | [Operators](./005-operators.md) |
| WHERE | Filter rows with conditions | [WHERE](./002-where.md) |
| LIMIT / OFFSET | Pagination after sorting | [LIMIT / OFFSET](./006-limit-offset.md) |
| GROUP BY | Group rows for aggregation | [GROUP BY / HAVING](./007-group-by.md) |

## Cheat Sheet

```plsql
-- ==================== DISTINCT ====================
SELECT DISTINCT col FROM t;                              -- unique values
SELECT DISTINCT col1, col2 FROM t;                       -- unique combos
SELECT COUNT(DISTINCT col) FROM t;                       -- count unique

-- ==================== DISTINCT ON (PostgreSQL) ====================
SELECT DISTINCT ON (col) col, other_col
FROM t
ORDER BY col, other_col DESC;                            -- first row per unique col

-- ==================== ALTERNATIVES ====================
SELECT col FROM t GROUP BY col;                          -- same as DISTINCT, can add aggregates
SELECT col1, col2 FROM t GROUP BY col1, col2;            -- same as DISTINCT on two columns
```
