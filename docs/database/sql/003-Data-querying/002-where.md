# WHERE — Filtering Rows

> DQL clause that filters rows **before** grouping or aggregation. Applied second in execution order (after FROM/JOIN, before GROUP BY). Only rows where the condition evaluates to TRUE are kept — FALSE and NULL (UNKNOWN) are filtered out.

## Basic Syntax

```plsql
SELECT column_list
FROM table_name
WHERE condition;
```

```plsql
SELECT username, email
FROM users
WHERE status = 'active';
-- Returns only active users

SELECT *
FROM orders
WHERE total > 100;
-- Returns orders with total > 100
```

### Clause Ordering Rules

SQL has **two different orders**: the order you write clauses (syntax order) and the order PostgreSQL processes them (execution order). They are not the same.

#### Syntax Order (How You Write It)

Clauses must appear in this exact order. Rearranging them causes syntax errors:

| Step | Clause | Required? | Example |
|------|--------|-----------|---------|
| 1 | `SELECT` | Yes | `SELECT username, email` |
| 2 | `FROM` | Yes (PostgreSQL allows omitting for no-table queries) | `FROM users` |
| 3 | `WHERE` | No | `WHERE status = 'active'` |
| 4 | `GROUP BY` | No | `GROUP BY department` |
| 5 | `HAVING` | No | `HAVING COUNT(*) > 5` |
| 6 | `ORDER BY` | No | `ORDER BY username` |
| 7 | `LIMIT` / `OFFSET` | No | `LIMIT 10` |

:::warning

**Common mistakes — these always fail:**

```plsql
-- CANNOT: WHERE before FROM
SELECT username
WHERE status = 'active'             -- ERROR at or near "WHERE"
FROM users;

-- CANNOT: ORDER BY before WHERE
SELECT username, email
FROM users
ORDER BY username                   -- ERROR at or near "ORDER BY"
WHERE status = 'active';

-- CANNOT: WHERE after GROUP BY
SELECT status, COUNT(*)
FROM orders
GROUP BY status
WHERE total > 0;                    -- ERROR at or near "WHERE"
-- Use HAVING for filtering after GROUP BY

-- CANNOT: WHERE after HAVING
SELECT status, COUNT(*)
FROM orders
GROUP BY status
HAVING COUNT(*) > 10
WHERE total > 0;                    -- ERROR at or near "WHERE"
-- WHERE must come before GROUP BY/HAVING

-- CANNOT: WHERE after LIMIT
SELECT username
FROM users
LIMIT 5
WHERE status = 'active';            -- ERROR at or near "WHERE"
```

**Valid variations:**

```plsql
-- Minimal: no WHERE at all
SELECT * FROM users;

-- SELECT + FROM + WHERE (most common)
SELECT * FROM users WHERE status = 'active';

-- SELECT + FROM + WHERE + ORDER BY + LIMIT
SELECT * FROM users WHERE status = 'active' ORDER BY created_at DESC LIMIT 10;

-- Full pipeline
SELECT status, COUNT(*)
FROM orders
WHERE total > 0
GROUP BY status
HAVING COUNT(*) > 5
ORDER BY COUNT(*) DESC
LIMIT 3;
```
:::

#### Execution Order (How PostgreSQL Processes It)

PostgreSQL rearranges clauses internally. The order of execution is completely different from the written order:

| Step | Clause | What happens |
|------|--------|--------------|
| 1 | **FROM / JOIN** | Tables are assembled and joined |
| 2 | **WHERE** | **← YOU ARE HERE: rows are filtered — only matching rows proceed** |
| 3 | **GROUP BY** | Groups are formed (if any) |
| 4 | **HAVING** | Group-level filter |
| 5 | **SELECT** | Columns and expressions evaluated, aliases created |
| 6 | **DISTINCT** | Duplicate rows removed (if specified) |
| 7 | **ORDER BY** | Final sorting |
| 8 | **LIMIT / OFFSET** | Pagination applied |

This is why:

- **Column aliases do not work in WHERE** — WHERE runs before SELECT creates the alias
- **WHERE cannot use aggregate functions** — WHERE runs before GROUP BY, so no groups exist yet
- **ORDER BY can use aliases** — ORDER BY runs after SELECT, so aliases are available

:::info

WHERE runs **before** SELECT. This is why you cannot use column aliases in WHERE:

```plsql
SELECT username, age >= 18 AS is_adult
FROM users
WHERE is_adult = TRUE;
-- ERROR: column "is_adult" does not exist
```

Use the original expression instead:

```plsql
SELECT username, age >= 18 AS is_adult
FROM users
WHERE age >= 18;
```
:::

## Filtering with Operators

WHERE supports all comparison, logical, and pattern operators. See [Operators](./005-operators.md) for the full reference.

### Comparison

```plsql
WHERE price = 100         -- equal
WHERE price <> 100        -- not equal
WHERE price > 100         -- greater than
WHERE price >= 100        -- greater than or equal
WHERE price < 100         -- less than
WHERE price <= 100        -- less than or equal
```

### Logical Combinations

```plsql
-- Both conditions must be TRUE
WHERE status = 'active' AND age >= 18;

-- At least one condition must be TRUE
WHERE status = 'premium' OR status = 'vip';

-- Negation
WHERE NOT status = 'banned';

-- Combined with parentheses for clarity
WHERE (status = 'active' OR status = 'premium')
  AND age >= 18;
```

:::tip

Always use parentheses when mixing AND and OR. AND binds tighter than OR, which can cause surprising results:

```plsql
-- Without parentheses:
WHERE status = 'active' OR status = 'premium' AND age >= 18
-- Evaluated as: status = 'active' OR (status = 'premium' AND age >= 18)

-- With parentheses (likely what you want):
WHERE (status = 'active' OR status = 'premium') AND age >= 18
```
:::

### Range and Membership

```plsql
-- Inclusive range
WHERE price BETWEEN 10 AND 50;
-- same as: price >= 10 AND price <= 50

-- Set membership
WHERE status IN ('active', 'premium', 'vip');

-- Exclusion
WHERE status NOT IN ('banned', 'deleted');
```

### NULL Handling

```plsql
-- Correct NULL checks
WHERE age IS NULL;
WHERE age IS NOT NULL;
WHERE age IS DISTINCT FROM 25;  -- NULL-safe comparison
```

:::warning

Comparing NULL with `=` or `<>` always returns NULL (falsy):

```plsql
WHERE age = NULL;    -- WRONG: always returns no rows
WHERE age <> NULL;   -- WRONG: always returns no rows
```
:::

### Pattern Matching

```plsql
-- Case-sensitive
WHERE email LIKE '%@example.com';

-- Case-insensitive (PostgreSQL extension)
WHERE name ILIKE 'john%';

-- POSIX regex
WHERE email ~ '^[a-z]+@example\.com$';

-- Case-insensitive regex
WHERE name ~* '^smith';
```

## Filtering with Dates

Date/time comparisons use ISO 8601 string format:

```plsql
-- Exact date
WHERE order_date = '2025-01-15'::date;

-- Date range (inclusive)
WHERE order_date >= '2025-01-01'
  AND order_date < '2025-02-01';
-- Catches all of January, even if order_date has time components

-- Using BETWEEN with dates (careful with time!)
WHERE order_date BETWEEN '2025-01-01' AND '2025-01-31';
-- If order_date is TIMESTAMP, this misses rows on Jan 31 23:59:59
-- Safer: use >= AND < with the next day
```

### Common Date Filter Patterns

```plsql
-- Today's orders
WHERE order_date::date = CURRENT_DATE;

-- Last 7 days
WHERE order_date >= CURRENT_DATE - INTERVAL '7 days';

-- Current month
WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND order_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';

-- Current year
WHERE EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE);

-- Filter by date part
WHERE EXTRACT(MONTH FROM order_date) = 12;  -- December orders
```

### Timestamp Pitfall

```plsql
-- Data:
-- 2025-01-31 14:30:00  ← this row exists
-- 2025-01-31 09:15:00  ← this row exists

-- BAD: BETWEEN with timestamps
SELECT * FROM orders
WHERE order_date BETWEEN '2025-01-01' AND '2025-01-31';
-- '2025-01-31' is treated as '2025-01-31 00:00:00'
-- Rows on Jan 31 after midnight are EXCLUDED!

-- GOOD: use >= AND < with next day
SELECT * FROM orders
WHERE order_date >= '2025-01-01'
  AND order_date < '2025-02-01';
-- All of January, including Jan 31 23:59:59
```

## Filtering with Subqueries

### IN with Subquery

```plsql
-- Users who have placed orders
SELECT username, email
FROM users
WHERE id IN (SELECT user_id FROM orders);
```

### EXISTS — Correlated Subquery

More efficient than `IN` when the subquery can use early exit:

```plsql
-- Users who have placed orders (EXISTS version)
SELECT username, email
FROM users u
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.user_id = u.id
);
-- EXISTS returns TRUE as soon as one match is found
-- IN builds the full result set first

-- Users with high-value orders
SELECT username, email
FROM users u
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.user_id = u.id
      AND o.total > 500
);
```

:::info

`EXISTS` vs `IN`:

| `EXISTS (subquery)` | `col IN (subquery)` |
|---------------------|---------------------|
| Early exit on first match | Builds full result set |
| Better for large subquery results | Better for small, static lists |
| Can reference outer query (correlated) | Can reference outer query |
| Not affected by NULLs in subquery | NULL in subquery breaks NOT IN |
| `SELECT 1` or `SELECT *` — no difference | Must select matching column |
:::

### NOT EXISTS vs NOT IN

```plsql
-- SAFE: NOT EXISTS handles NULLs correctly
SELECT username FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.user_id = u.id
);

-- DANGEROUS: NOT IN returns no rows if subquery contains NULL
SELECT username FROM users
WHERE id NOT IN (SELECT user_id FROM orders);
-- If ANY user_id in orders is NULL, result is empty!

-- SAFE alternative to NOT IN
SELECT username FROM users
WHERE id NOT IN (
    SELECT user_id FROM orders
    WHERE user_id IS NOT NULL  -- explicitly exclude NULLs
);
```

### Scalar Subquery in WHERE

Subquery that returns exactly one row and one column:

```plsql
-- Products priced above average
SELECT name, price
FROM products
WHERE price > (SELECT AVG(price) FROM products);
```

## Filtering with Functions

```plsql
-- String functions
WHERE LOWER(email) = 'alice@example.com';
WHERE LENGTH(username) > 20;

-- Date functions
WHERE EXTRACT(YEAR FROM order_date) = 2025;
WHERE DATE_TRUNC('month', order_date) = '2025-01-01'::date;

-- Conditional functions
WHERE COALESCE(discount, 0) > 0;     -- treat NULL as 0
WHERE NULLIF(quantity, 0) IS NULL;   -- find rows where quantity = 0
```

## Sargability — Making WHERE Fast

A predicate is **sargable** (Search ARGument ABLE) if it can use an index. Wrapping a column in a function usually breaks index usage.

```plsql
-- BAD: function on column — cannot use index on order_date
WHERE EXTRACT(YEAR FROM order_date) = 2025;

-- GOOD: range comparison — can use index
WHERE order_date >= '2025-01-01'
  AND order_date < '2026-01-01';

-- BAD: function on column — no index on LOWER(email)
WHERE LOWER(email) = 'alice@example.com';

-- GOOD: use case-insensitive type or expression index
WHERE email = 'alice@example.com';  -- if column is CITEXT
-- Or create an expression index:
-- CREATE INDEX ON users (LOWER(email));
```

### Common Sargability Rules

| Anti-pattern (not sargable) | Sargable alternative |
|-----------------------------|---------------------|
| `WHERE YEAR(col) = 2025` | `WHERE col >= '2025-01-01' AND col < '2026-01-01'` |
| `WHERE LOWER(col) = 'x'` | Expression index or CITEXT column |
| `WHERE col + 1 > 10` | `WHERE col > 9` |
| `WHERE SUBSTR(col, 1, 3) = 'ABC'` | `WHERE col LIKE 'ABC%'` |
| `WHERE col || '_suffix' = 'val_suffix'` | `WHERE col = 'val'` |
| `WHERE CAST(col AS text) = '123'` | `WHERE col = 123` (if numeric) |
| `WHERE COALESCE(col, 0) > 0` | `WHERE col > 0 OR col IS NULL` |

```plsql
-- Check if query uses an index
EXPLAIN SELECT * FROM orders WHERE EXTRACT(YEAR FROM order_date) = 2025;
-- Seq Scan on orders  (slow — full table scan)

EXPLAIN SELECT * FROM orders WHERE order_date >= '2025-01-01' AND order_date < '2026-01-01';
-- Index Scan using idx_orders_date  (fast)
```

## WHERE vs HAVING

| WHERE | HAVING |
|-------|--------|
| Filters rows **before** grouping | Filters groups **after** aggregation |
| Cannot use aggregate functions | Can use aggregate functions (COUNT, SUM, AVG) |
| Can use any column from FROM/JOIN | Can use GROUP BY columns and aggregates |
| Execution: step 2 | Execution: step 4 |

```plsql
-- WHERE: filter individual rows before grouping
SELECT status, COUNT(*)
FROM orders
WHERE total > 0             -- exclude zero-total orders first
GROUP BY status;

-- HAVING: filter groups after aggregation
SELECT status, COUNT(*)
FROM orders
GROUP BY status
HAVING COUNT(*) > 100;      -- only show statuses with >100 orders

-- Both together: filter rows then filter groups
SELECT status, COUNT(*), AVG(total)
FROM orders
WHERE total > 0             -- exclude zero-total orders
GROUP BY status
HAVING COUNT(*) > 50;       -- only statuses with >50 qualifying orders
```

## Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **NULL in condition = row excluded** | WHERE keeps only rows where condition is TRUE. NULL (UNKNOWN) is filtered out |
| 2 | **Column alias not available** | WHERE runs before SELECT — use the expression, not its alias |
| 3 | **String comparison is case-sensitive** | `WHERE email = 'Alice'` does not match `'alice'`. Use `ILIKE` or `LOWER()` |
| 4 | **NOT IN with NULL subquery** | If the subquery returns NULL, NOT IN returns no rows. Prefer NOT EXISTS |
| 5 | **BETWEEN with timestamps** | `BETWEEN '2025-01-01' AND '2025-01-31'` excludes Jan 31 23:59:59. Use `>= AND <` |
| 6 | **Function on column breaks index** | `WHERE YEAR(col) = 2025` cannot use index — rewrite as range |
| 7 | **Trailing spaces in VARCHAR** | In PostgreSQL, `'abc' = 'abc  '` is TRUE (ignores trailing spaces in comparison) |
| 8 | **Floating-point comparison** | `WHERE price = 0.1 + 0.2` may fail — use `WHERE ABS(price - 0.3) < 0.0001` |
| 9 | **Short-circuit depends on planner** | PostgreSQL may not short-circuit — it can choose to evaluate the cheaper condition first |
| 10 | **Empty IN list** | `WHERE id IN ()` is a syntax error — handle empty lists in application code |

## Cross-Reference

| Topic | Description | Link |
|-------|-------------|------|
| SELECT Basics | Column selection, aliases, LIMIT/OFFSET | [SELECT Basics](./001-select-basics.md) |
| ORDER BY | Sorting filtered results | [ORDER BY](./003-order-by.md) |
| DISTINCT | Remove duplicates from filtered rows | [DISTINCT](./004-distinct.md) |
| LIMIT / OFFSET | Pagination after sorting | [LIMIT / OFFSET](./006-limit-offset.md) |
| Operators | Arithmetic, comparison, logical (full reference) | [Operators](./005-operators.md) |
| GROUP BY | Group filtered rows for aggregation | [GROUP BY / HAVING](./007-group-by.md) |

## Cheat Sheet

```plsql
-- ==================== BASIC ====================
WHERE col = value
WHERE col <> value
WHERE col > value
WHERE col >= value AND col < other_value   -- safe range

-- ==================== LOGICAL ====================
WHERE a AND b
WHERE a OR b
WHERE NOT a
WHERE (a OR b) AND c                       -- parens for clarity

-- ==================== SPECIAL ====================
WHERE col BETWEEN x AND y                  -- inclusive range
WHERE col IN (1, 2, 3)                     -- set membership
WHERE col IS NULL                          -- null check
WHERE col IS NOT NULL
WHERE col LIKE '%pattern%'                 -- case-sensitive
WHERE col ILIKE '%pattern%'                -- case-insensitive
WHERE col ~ '^regex$'                      -- POSIX regex

-- ==================== SUBQUERIES ====================
WHERE col IN (SELECT ...)                  -- set from subquery
WHERE EXISTS (SELECT 1 FROM ...)           -- correlated existence
WHERE col > (SELECT AVG(...) FROM ...)     -- scalar subquery

-- ==================== DATE FILTERS ====================
WHERE col >= '2025-01-01' AND col < '2025-02-01'  -- safe month
WHERE col::date = CURRENT_DATE             -- today
WHERE col >= CURRENT_DATE - INTERVAL '7 days'      -- last week
WHERE EXTRACT(YEAR FROM col) = 2025        -- year (not sargable)

-- ==================== PERFORMANCE ====================
WHERE col > 9                             -- sargable (col + 1 > 10 is not)
WHERE col LIKE 'ABC%'                     -- sargable (SUBSTR(col,1,3) is not)
```
