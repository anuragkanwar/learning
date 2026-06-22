# LIMIT / OFFSET — Pagination & Restriction

> DQL clause that restricts how many rows the query returns and where to start. Applied **last** in execution — after sorting, after deduplication. LIMIT is PostgreSQL-specific syntax; FETCH FIRST is the SQL standard equivalent.

## Execution Order

LIMIT / OFFSET runs last — after all rows are computed, filtered, grouped, selected, and sorted:

| Step | Clause | What happens |
|------|--------|--------------|
| 1 | **FROM / JOIN** | Tables are assembled and joined |
| 2 | **WHERE** | Rows are filtered |
| 3 | **GROUP BY** | Groups are formed |
| 4 | **HAVING** | Group-level filter |
| 5 | **SELECT** | Columns and expressions evaluated |
| 6 | **DISTINCT** | Duplicate rows removed |
| 7 | **ORDER BY** | Final sorting |
| 8 | **LIMIT / OFFSET** | **← YOU ARE HERE: pagination applied** |

Being the last step means:
- **ORDER BY without LIMIT sorts all rows** — LIMIT cannot reduce the sort cost if applied after sorting
- **LIMIT without ORDER BY is non-deterministic** — no guarantee which rows you get
- **Large OFFSET still scans skipped rows** — the database reads them, just doesn't send them to you

## Basic LIMIT

```plsql
-- First 10 rows
SELECT username, email
FROM users
LIMIT 10;

-- First 5 most expensive products
SELECT name, price
FROM products
ORDER BY price DESC
LIMIT 5;
```

## Basic OFFSET

```plsql
-- Skip the first 10 rows, return the rest
SELECT username
FROM users
OFFSET 10;

-- Combined: skip 20, return 10 (page 3 of 10)
SELECT username
FROM users
ORDER BY id
LIMIT 10 OFFSET 20;
```

## LIMIT with OFFSET — Pagination

```plsql
-- Page 1: rows 1-10
SELECT username
FROM users
ORDER BY id
LIMIT 10 OFFSET 0;

-- Page 2: rows 11-20
SELECT username
FROM users
ORDER BY id
LIMIT 10 OFFSET 10;

-- Page 3: rows 21-30
SELECT username
FROM users
ORDER BY id
LIMIT 10 OFFSET 20;
```

### Offset-based Pagination Formula

```
page = 3
page_size = 10
OFFSET = (page - 1) * page_size   -- (3 - 1) * 10 = 20
LIMIT = page_size                  -- 10
```

## FETCH FIRST — SQL Standard Alternative

PostgreSQL supports the SQL standard `FETCH FIRST ... ROWS ONLY` syntax, which is equivalent to `LIMIT`:

```plsql
-- Same as LIMIT 10
SELECT username
FROM users
ORDER BY id
FETCH FIRST 10 ROWS ONLY;

-- With OFFSET (SQL standard)
SELECT username
FROM users
ORDER BY id
OFFSET 20 ROWS
FETCH FIRST 10 ROWS ONLY;
```

### FETCH with TIES

`FETCH FIRST ... WITH TIES` includes additional rows that have the same sort value as the last row:

```plsql
-- Data:
-- name   | score
---------+-------
-- Alice  | 100
-- Bob    | 100
-- Carol  | 90
-- Dave   | 80

SELECT name, score
FROM results
ORDER BY score DESC
FETCH FIRST 2 ROWS WITH TIES;
-- Returns:
-- Alice  100
-- Bob    100
-- (2 rows, but Bob is included because of tie with Alice)
```

:::info

`LIMIT` does **not** support `WITH TIES`. Use `FETCH FIRST ... WITH TIES` for that behavior.
:::

## LIMIT ALL

Explicitly means no limit — useful in dynamic queries:

```plsql
SELECT username FROM users LIMIT ALL;
-- same as no LIMIT clause at all
```

## OFFSET without LIMIT

PostgreSQL allows OFFSET without LIMIT — skips N rows, returns everything after:

```plsql
-- Skip first 100 rows, return the rest
SELECT username FROM users ORDER BY id OFFSET 100;
```

## LIMIT 0 — Zero Rows

Returns empty result set — useful for testing schema or column names without data:

```plsql
-- Returns 0 rows but shows column headers
SELECT * FROM users LIMIT 0;

-- Practical use: create a table with same structure
CREATE TABLE users_backup AS
SELECT * FROM users LIMIT 0;
-- Creates empty table with same columns
```

## Performance

### Large OFFSET Is Slow

OFFSET-based pagination becomes slow on deep pages because PostgreSQL must scan and discard all skipped rows:

```plsql
-- Page 10,000: SLOW — must scan and skip 99,990 rows
SELECT username
FROM users
ORDER BY id
LIMIT 10 OFFSET 99990;
```

Each skipped row is still fetched from disk and processed — the database does not jump directly to the offset position.

### Cursor-based Pagination (Faster Alternative)

Uses a `WHERE` filter on the last seen value instead of OFFSET. See the [theory note](../../theory/002-cursor-pagination.md) for the full conceptual explanation.

```plsql
-- Traditional (slow for deep pages)
SELECT username, id
FROM users
ORDER BY id
LIMIT 10 OFFSET 99990;

-- Cursor-based (fast — uses index on id)
SELECT username, id
FROM users
WHERE id > 99990
ORDER BY id
LIMIT 10;
```

| Approach | Speed | Works with | Stable sort|
|----------|-------|------------|------------|
| **OFFSET** | Slows down on deep pages | Any ORDER BY column | Yes |
| **Cursor (WHERE)** | Constant speed | Unique, sortable columns only | Yes, if cursor column is stable |
| **Keyset pagination** | Constant speed | Composite unique key | Yes |

### Index Usage

```plsql
-- LIMIT + ORDER BY on indexed column is very fast
-- PostgreSQL does a top-N sort (stops early)
EXPLAIN SELECT * FROM users ORDER BY id LIMIT 10;
-- Limit  (cost=0.28..0.88 rows=10)
--   ->  Index Scan using users_pkey on users  (cost=0.28..X rows=Y)

-- Without index, LIMIT + ORDER BY sorts the whole table
EXPLAIN SELECT * FROM users ORDER BY email LIMIT 10;
-- Limit  (cost=X..Y rows=10)
--   ->  Sort  (cost=X..Y rows=Z)
--       ->  Seq Scan on users  (cost=0.00..W rows=Z)
```

## LIMIT with DISTINCT

When LIMIT is combined with DISTINCT, PostgreSQL must compute all distinct rows first, then apply the limit:

```plsql
-- PostgreSQL computes ALL distinct statuses, then takes the first 5
SELECT DISTINCT status FROM orders LIMIT 5;

-- With ORDER BY:
SELECT DISTINCT status FROM orders ORDER BY status LIMIT 5;
```

## LIMIT with Aggregates

LIMIT applies after aggregation — it limits the number of group rows, not the rows fed into the aggregation:

```plsql
-- Returns top 5 statuses by order count
SELECT status, COUNT(*)
FROM orders
GROUP BY status
ORDER BY COUNT(*) DESC
LIMIT 5;
```

## Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **LIMIT without ORDER BY is random** | No guarantee which rows the limit picks — result can change across executions |
| 2 | **Large OFFSET is slow** | PostgreSQL scans all skipped rows — O(N) per page. Prefer cursor-based pagination |
| 3 | **LIMIT does not affect query cost** | The database may still process all rows before applying the limit (e.g., with DISTINCT) |
| 4 | **OFFSET with unstable ORDER BY** | If sort column has duplicates, rows can shift between pages — use a tiebreaker column (e.g., `ORDER BY name, id`) |
| 5 | **LIMIT in subqueries** | `SELECT * FROM (SELECT ... LIMIT 10) sub` — the limit applies to the subquery, not the outer query |
| 6 | **LIMIT 0 + INSERT ... SELECT** | `INSERT INTO t SELECT * FROM src LIMIT 0` inserts no rows but is valid syntax |
| 7 | **OFFSET without ORDER BY** | Like LIMIT, the skipped rows are non-deterministic |
| 8 | **FETCH FIRST with TIES needs ORDER BY** | `WITH TIES` requires an ORDER BY clause — otherwise it's ambiguous which rows tie |

## Cross-Reference

| Topic | Description | Link |
|-------|-------------|------|
| SELECT Basics | Column selection, aliases | [SELECT Basics](./001-select-basics.md) |
| WHERE | Filter rows before pagination | [WHERE](./002-where.md) |
| ORDER BY | Sorting before LIMIT | [ORDER BY](./003-order-by.md) |
| DISTINCT | Remove duplicates | [DISTINCT](./004-distinct.md) |
| Operators | Expressions for WHERE/ORDER BY | [Operators](./005-operators.md) |
| GROUP BY / HAVING | Aggregation before pagination | [GROUP BY / HAVING](./007-group-by.md) |

## Cheat Sheet

```plsql
-- ==================== LIMIT / OFFSET ====================
SELECT * FROM t LIMIT 10;                         -- first 10 rows
SELECT * FROM t LIMIT 10 OFFSET 20;               -- page 3 of 10
SELECT * FROM t OFFSET 100;                       -- skip 100, no limit
SELECT * FROM t LIMIT ALL;                        -- no limit (explicit)
SELECT * FROM t LIMIT 0;                          -- empty result (schema only)

-- ==================== SQL STANDARD ====================
SELECT * FROM t FETCH FIRST 10 ROWS ONLY;         -- same as LIMIT 10
SELECT * FROM t OFFSET 20 FETCH FIRST 10 ROWS ONLY;  -- with offset
SELECT * FROM t ORDER BY score DESC
    FETCH FIRST 5 ROWS WITH TIES;                 -- include ties

-- ==================== PAGINATION ====================
-- Offset-based (simple, slows down):
SELECT * FROM t ORDER BY id LIMIT 10 OFFSET 0;    -- page 1
SELECT * FROM t ORDER BY id LIMIT 10 OFFSET 10;   -- page 2

-- Cursor-based (fast, constant time):
SELECT * FROM t WHERE id > last_id
    ORDER BY id LIMIT 10;                         -- next page

-- ==================== IN PRACTICE ====================
SELECT name, price
FROM products
WHERE category = 'electronics'
ORDER BY price DESC, id                           -- tiebreaker
LIMIT 20 OFFSET 0;
```
