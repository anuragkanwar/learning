# ORDER BY — Sorting Results

> DQL clause that sorts the result set by one or more columns or expressions. Sorting adds overhead — only order when the consumer needs it.

## Execution Order

ORDER BY runs near the end of query execution. The full pipeline:

| Step | Clause | What happens |
|------|--------|--------------|
| 1 | **FROM / JOIN** | Tables are assembled and joined |
| 2 | **WHERE** | Rows are filtered |
| 3 | **GROUP BY** | Groups are formed |
| 4 | **HAVING** | Group-level filter |
| 5 | **SELECT** | Columns and expressions evaluated |
| 6 | **DISTINCT** | Duplicate rows removed |
| 7 | **ORDER BY** | **← YOU ARE HERE: rows are sorted** |
| 8 | **LIMIT / OFFSET** | Pagination applied |

This late execution explains several ORDER BY behaviors:

- **Column aliases work in ORDER BY** — SELECT (step 5) already evaluated them
- **ORDER BY runs after DISTINCT** — if both are used, ORDER BY columns must appear in SELECT list
- **ORDER BY is wasted on aggregated queries without aggregates** — if SELECT has no aggregation, ORDER BY sorts raw rows
- **ORDER BY with LIMIT is efficient** — PostgreSQL can stop sorting early (top-N sort)

## Basic ORDER BY

```plsql
-- Ascending (default) — smallest to largest, A to Z
SELECT username, age FROM users ORDER BY age;

-- Explicit ASC (same behavior)
SELECT username, age FROM users ORDER BY age ASC;

-- Descending — largest to smallest, Z to A
SELECT username, age FROM users ORDER BY age DESC;
```

| Keyword | Direction | Effect on Numbers | Effect on Strings |
|---------|-----------|-------------------|-------------------|
| `ASC` (default) | Ascending | 1, 2, 3, 10 | 'Alice', 'Bob', 'Carol' |
| `DESC` | Descending | 10, 3, 2, 1 | 'Carol', 'Bob', 'Alice' |

## Multiple Sort Columns

When two rows have the same value in the first sort column, the second column breaks the tie.

```plsql
-- Sort by status, then within each status sort by newest first
SELECT status, order_date, id
FROM orders
ORDER BY status ASC, order_date DESC;

-- Example result:
--  status    | order_date          | id
-- -----------+---------------------+-----
--  cancelled | 2026-05-20 14:00:00 | 15
--  cancelled | 2026-05-18 09:00:00 | 12
--  delivered | 2026-05-25 16:00:00 | 20
--  delivered | 2026-05-22 11:00:00 | 18
--  pending   | 2026-05-27 10:00:00 | 25
--  pending   | 2026-05-26 08:00:00 | 22
```

**Direction applies per column — each needs its own ASC/DESC:**

```plsql
ORDER BY col1 ASC, col2 DESC;    -- col1 ascending, col2 descending
ORDER BY col1, col2 DESC;        -- col1 ascending (implicit), col2 descending
ORDER BY col1 DESC, col2 DESC;   -- both descending
```

## ORDER BY with Column Alias

Aliases defined in the SELECT clause can be used in ORDER BY (unlike WHERE — ORDER BY runs after SELECT).

```plsql
SELECT
    username,
    age >= 18 AS is_adult,
    age + 1 AS next_year_age
FROM users
ORDER BY is_adult DESC, next_year_age ASC;

-- Alias for an expression
SELECT
    name,
    price * stock_qty AS inventory_value
FROM products
ORDER BY inventory_value DESC;
```

:::tip

ORDER BY is evaluated after SELECT (step 7 of the execution order), so column aliases are available. This is different from WHERE (step 2), where aliases do NOT exist yet.
:::

## ORDER BY with Expressions

Sort by computed values, not just raw columns.

```plsql
-- Sort by computed price after tax
SELECT name, price, price * 1.10 AS price_with_tax
FROM products
ORDER BY price * 1.10 DESC;

-- Sort by string length
SELECT username, email
FROM users
ORDER BY LENGTH(full_name) DESC;

-- Sort by derived date part
SELECT full_name, created_at
FROM users
ORDER BY EXTRACT(YEAR FROM created_at) DESC, EXTRACT(MONTH FROM created_at) ASC;

-- Sort by conditional expression
SELECT name, price, stock_qty
FROM products
ORDER BY CASE
    WHEN stock_qty = 0 THEN 1   -- out of stock last
    WHEN stock_qty < 10 THEN 0  -- low stock first
    ELSE 2                       -- fully stocked in the middle
END, price ASC;
```

## ORDER BY Column Position

Use the column's position number in the SELECT list (1-based). Fragile — avoid in production.

```plsql
SELECT username, email, age FROM users ORDER BY 3;
-- 3 = third SELECT column = age
-- Same as: ORDER BY age

SELECT name, price, stock_qty FROM products ORDER BY 2 DESC;
-- 2 = second SELECT column = price
-- Same as: ORDER BY price DESC
```

:::warning

Column position ORDER BY is fragile. If the SELECT list changes (columns reordered, added, or removed), the sort silently changes behavior. Only use it in ad-hoc queries, never in stored procedures, views, or application code.

```plsql
-- Fragile — breaks if columns are reordered
SELECT username, email, age FROM users ORDER BY 3;   -- sorts by age

-- Someone adds a column mid-list:
SELECT username, email, role, age FROM users ORDER BY 3;  -- now sorts by ROLE!
```
:::

## ORDER BY with Unselected Columns

You can sort by a column not in the SELECT list — unlike GROUP BY which restricts this.

```plsql
-- Sort by created_at but don't include it in output
SELECT username, email
FROM users
ORDER BY created_at DESC;
-- Most recently created users first, but timestamp not shown
```

## NULLs in ORDER BY

NULL represents unknown — how it sorts is configurable.

```plsql
-- Default behavior in PostgreSQL: NULLS LAST for ASC, NULLS FIRST for DESC
SELECT username, age FROM users ORDER BY age;
--  username | age
-- ----------+-----
--  Alice    | 25
--  Bob      | 35
--  Carol    | 42
--  Dave     | NULL    ← NULLs last

SELECT username, age FROM users ORDER BY age DESC;
--  username | age
-- ----------+-----
--  Dave     | NULL    ← NULLs first (in DESC)
--  Carol    | 42
--  Bob      | 35
--  Alice    | 25
```

**Explicit NULL control:**

```plsql
-- Force NULLs to a specific position
ORDER BY age NULLS FIRST;     -- NULLs always on top
ORDER BY age NULLS LAST;      -- NULLs always at bottom
ORDER BY age DESC NULLS LAST; -- non-NULLs descending, NULLs at bottom
ORDER BY age ASC NULLS FIRST; -- non-NULLs ascending, NULLs on top
```

| Expression | non-NULL order | NULL position |
|------------|---------------|---------------|
| `ORDER BY col` | ASC | LAST (PostgreSQL default) |
| `ORDER BY col ASC` | ASC | LAST |
| `ORDER BY col DESC` | DESC | FIRST |
| `ORDER BY col NULLS FIRST` | ASC | FIRST |
| `ORDER BY col NULLS LAST` | ASC | LAST |
| `ORDER BY col DESC NULLS LAST` | DESC | LAST |

:::info

NULLS FIRST/LAST behavior varies by database:
- **PostgreSQL:** ASC → NULLS LAST, DESC → NULLS FIRST (configurable)
- **MySQL:** NULLs sort first (lowest) for both ASC and DESC
- **SQL Server:** NULLs sort first for ASC, last for DESC
- **Oracle:** NULLs sort last for ASC, first for DESC (configurable via `NULLS FIRST/LAST`)
:::

## ORDER BY on Different Data Types

```plsql
-- Strings: alphabetical (determined by COLLATION)
ORDER BY full_name;                -- 'Alice', 'Bob', 'Carol'

-- Numbers: numeric order
ORDER BY price;                    -- 5.99, 14.99, 19.99

-- Dates/Timestamps: chronological
ORDER BY created_at;               -- oldest first

-- Booleans: false sorts before true (false = 0, true = 1)
ORDER BY is_active;                -- false, true

-- UUIDs: sorted as text (string representation)
-- Arrays: element-by-element comparison
-- JSON/JSONB: not directly sortable — extract a value with ->>
```

## ORDER BY with CASE (Custom Sort Order)

Override natural sort order with a custom sequence:

```plsql
-- Custom status ordering (not alphabetical, not by id)
SELECT id, status, order_date
FROM orders
ORDER BY
    CASE status
        WHEN 'pending'   THEN 1
        WHEN 'shipped'   THEN 2
        WHEN 'delivered' THEN 3
        WHEN 'cancelled' THEN 4
    END;

-- Custom priority with remaining sorted by date
SELECT id, status, order_date
FROM orders
ORDER BY
    CASE status
        WHEN 'pending'   THEN 1
        WHEN 'shipped'   THEN 2
        ELSE 3
    END,
    order_date DESC;
```

## ORDER BY with DISTINCT

All columns in ORDER BY must appear in the SELECT list when using DISTINCT:

```plsql
-- Works: order column is in SELECT
SELECT DISTINCT status FROM orders ORDER BY status;

-- Works: order columns are subset of SELECT columns
SELECT DISTINCT user_id, status FROM orders ORDER BY user_id;

-- Error: order column not in SELECT
SELECT DISTINCT status FROM orders ORDER BY created_at;
-- ERROR:  for SELECT DISTINCT, ORDER BY expressions must appear in select list
```

## ORDER BY with UNION / INTERSECT / EXCEPT

Only one ORDER BY at the end of the whole compound query — individual queries cannot be sorted:

```plsql
-- Correct: single ORDER BY at the end
SELECT username, 'user' AS type FROM users
UNION ALL
SELECT name, 'product' AS type FROM products
ORDER BY username;

-- Error: ORDER BY inside UNION
SELECT username FROM users ORDER BY username
UNION ALL
SELECT name FROM products;
-- ERROR:  ORDER BY is not allowed in subqueries of UNION/INTERSECT/EXCEPT
```

## ORDER BY Performance

| Factor | Impact |
|--------|--------|
| **Index on sort column** | Can avoid explicit sort — rows read in order from index |
| **Sort column not indexed** | PostgreSQL does an explicit sort (memory or disk-based) |
| **Large result set** | May spill to disk if `work_mem` is insufficient — much slower |
| **Multi-column sort** | Composite index on `(col1, col2)` can help |
| **Sort direction** | ASC vs DESC matters — index must match direction |
| **LIMIT** | Can optimize: index scan stops after fetching N rows |

```plsql
-- INDEX on (age) makes this nearly free
SELECT username, age FROM users ORDER BY age LIMIT 10;
```

:::tip

For large sorts, increase `work_mem` (per-operation memory for sorting):

```sql
SET work_mem = '64MB';     -- session-level (not permanent)
```
:::

## Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **Sorting is expensive** | On large tables without index, ORDER BY sorts in memory then disk — can be very slow |
| 2 | **ASC/DESC per column required** | `ORDER BY col1, col2 DESC` applies DESC only to col2; col1 is ASC |
| 3 | **Column positions are fragile** | `ORDER BY 3` breaks silently when SELECT list changes |
| 4 | **ORDER BY + DISTINCT restriction** | With DISTINCT, ORDER BY columns must appear in SELECT list |
| 5 | **ORDER BY + UNION restriction** | Only one ORDER BY allowed, at the end of the compound query |
| 6 | **Text sorting depends on locale** | `ORDER BY name` sorts differently depending on LC_COLLATE — 'é' may sort after 'z' in some locales |
| 7 | **LIMIT without ORDER BY = random rows** | No guarantee which rows the limit returns |
| 8 | **NULL behavior varies across databases** | ASC: PostgreSQL puts NULLs LAST, MySQL puts NULLs FIRST |

## Cross-Reference

| Topic | Description | Link |
|-------|-------------|------|
| SELECT Basics | All columns, aliases, expressions | [SELECT Basics](./001-select-basics.md) |
| DISTINCT | Remove duplicate rows | [DISTINCT](./004-distinct.md) |
| Operators | Arithmetic, comparison, logical operators | [Operators](./005-operators.md) |
| WHERE | Filter rows with conditions | [WHERE](./002-where.md) |
| LIMIT / OFFSET | Pagination after sorting | [LIMIT / OFFSET](./006-limit-offset.md) |
| GROUP BY / HAVING | Aggregation and grouping | [GROUP BY / HAVING](./007-group-by.md) |

## Cheat Sheet

```plsql
-- ==================== BASIC SORT ====================
ORDER BY col;                                         -- ascending (default)
ORDER BY col ASC;                                     -- ascending (explicit)
ORDER BY col DESC;                                    -- descending

-- ==================== MULTI-COLUMN ====================
ORDER BY col1, col2;                                  -- col1 ASC, then col2 ASC
ORDER BY col1 DESC, col2 ASC;                         -- mix directions
ORDER BY col1 DESC, col2 DESC;                        -- both descending

-- ==================== EXPRESSIONS & ALIASES ====================
ORDER BY col * 1.1;                                   -- sort by expression
ORDER BY LENGTH(col);                                 -- sort by function result
ORDER BY alias_name;                                  -- use column alias (works!)
ORDER BY 3;                                           -- by position (fragile — avoid)

-- ==================== NULLS ====================
ORDER BY col NULLS FIRST;                             -- NULLs on top
ORDER BY col NULLS LAST;                              -- NULLs at bottom
ORDER BY col DESC NULLS LAST;                         -- DESC + NULLs at bottom

-- ==================== CUSTOM SORT ====================
ORDER BY CASE col WHEN 'x' THEN 1 WHEN 'y' THEN 2 ELSE 3 END;

-- ==================== WITH LIMIT ====================
ORDER BY col LIMIT 10;                                -- top 10
ORDER BY col DESC LIMIT 10;                           -- bottom 10
```
