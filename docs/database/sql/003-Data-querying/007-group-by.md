# GROUP BY, HAVING, and Aggregate Functions

Aggregate functions collapse multiple rows into a single summary value. `GROUP BY` controls how rows are grouped before aggregation. `HAVING` filters the grouped results.

Uses the same [e-commerce schema](../001-Data-foundation/001-creation.md). Refer there for `users`, `products`, `orders`, `order_items` table definitions.

## The 5 Basic Aggregate Functions

| Function | Returns | NULL handling |
|----------|---------|---------------|
| `COUNT(*)` | Number of rows in group | Counts all rows including NULLs |
| `COUNT(col)` | Number of non-NULL values of `col` | Ignores NULLs |
| `SUM(col)` | Sum of non-NULL values | Ignores NULLs, returns NULL if no rows |
| `AVG(col)` | Arithmetic mean of non-NULL values | Ignores NULLs, returns NULL if no rows |
| `MIN(col)` | Minimum non-NULL value | Ignores NULLs, returns NULL if no rows |
| `MAX(col)` | Maximum non-NULL value | Ignores NULLs, returns NULL if no rows |

```plsql
-- All aggregates on the entire table (single group)
SELECT COUNT(*)               AS total_orders,
       COUNT(DISTINCT user_id) AS unique_customers,
       SUM(total_price)        AS revenue,
       ROUND(AVG(total_price), 2) AS avg_order_value,
       MIN(total_price)        AS smallest_order,
       MAX(total_price)        AS largest_order
FROM orders;

-- total_orders | unique_customers | revenue  | avg_order_value | smallest_order | largest_order
-- -------------+------------------+----------+-----------------+----------------+--------------
-- 1000         | 350              | 125000.00| 125.00          | 9.99           | 499.99
```

```plsql
SELECT AVG(quantity)        AS avg_qty,   -- 2.5 (ignores NULLs)
       SUM(quantity) / NULLIF(COUNT(*), 0) AS manual_avg,  -- same result
       AVG(COALESCE(quantity, 0)) AS avg_incl_nulls  -- treats NULLs as 0
FROM order_items;
```

## NULL Handling

:::warning NULLs in Aggregates
Aggregate functions ignore NULL values **by design** (except `COUNT(*)`). This is usually correct but can surprise you:

- `SUM(col)` where every row has NULL → returns `NULL`, not `0`
- `AVG(col)` divides by count of non-NULL rows, not total rows
- `COUNT(col)` returns 0 for a column where every value is NULL

```plsql
-- order_items: qty = {2, NULL, 3, NULL}
SELECT COUNT(*)      AS all_rows,     -- 4
       COUNT(qty)    AS non_null_qty, -- 2
       SUM(qty)      AS sum_qty,      -- 5
       AVG(qty)      AS avg_qty,      -- 2.5 (5 / 2, not 5 / 4)
       AVG(COALESCE(qty, 0)) AS avg_with_nulls  -- 1.25 (5 / 4)
FROM order_items;
```
:::

## GROUP BY

Groups rows that share the same values in the specified column(s). Every column in `SELECT` that is not an aggregate **must** appear in `GROUP BY`.

### Single Column

```plsql
-- Total revenue per product
SELECT product_id,
       SUM(quantity * unit_price) AS revenue
FROM order_items
GROUP BY product_id;
```

```plsql
-- Status counts
SELECT status,
       COUNT(*) AS order_count
FROM orders
GROUP BY status;

-- status    | order_count
-- ----------+-------------
-- pending   | 412
-- shipped   | 298
-- delivered | 250
-- cancelled | 40
```

### Multi-Column

Groups by the unique combination of all listed columns.

```plsql
-- Orders per customer per status
SELECT user_id,
       status,
       COUNT(*) AS order_count
FROM orders
GROUP BY user_id, status;
```

### Expression GROUP BY

```plsql
-- Orders by year
SELECT EXTRACT(YEAR FROM order_date) AS year,
       COUNT(*) AS order_count
FROM orders
GROUP BY EXTRACT(YEAR FROM order_date);

-- or use ordinal position (avoid for clarity):
SELECT EXTRACT(YEAR FROM order_date), COUNT(*)
FROM orders
GROUP BY 1;
```

:::danger GROUP BY with Aliases
PostgreSQL allows `GROUP BY` with output column names or positions (`GROUP BY 1`), but this is fragile. If the SELECT list changes, the GROUP BY silently changes meaning. Prefer repeating the expression.
:::

### GROUP BY + WHERE

`WHERE` filters rows **before** grouping — aggregate functions only see the filtered rows.

```plsql
-- Revenue from non-cancelled orders (filter first, then aggregate)
SELECT product_id,
       SUM(quantity * unit_price) AS active_revenue
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.status != 'cancelled'
GROUP BY product_id;
```

## Execution Order

Using the example:
```plsql
SELECT status, COUNT(*) AS cnt
FROM orders
WHERE total_price > 0
GROUP BY status
HAVING COUNT(*) > 50
ORDER BY cnt DESC
LIMIT 5;
```

| Step | Clause | What happens |
|------|--------|-------------|
| 1 | `FROM` | Reads `orders` table |
| 2 | `WHERE` | Filters out rows with `total_price <= 0` |
| 3 | `GROUP BY` | Groups remaining rows by `status` |
| 4 | `HAVING` | Keeps only groups with `COUNT(*) > 50` |
| 5 | `SELECT` | Computes `status`, `COUNT(*)`, assigns alias `cnt` |
| 6 | `ORDER BY` | Sorts result by `cnt DESC` |
| 7 | `LIMIT` | Returns top 5 rows |

## HAVING

Filters groups after aggregation, like `WHERE` filters rows before aggregation.

```plsql
-- Products with high total sales
SELECT product_id,
       SUM(quantity * unit_price) AS revenue,
       COUNT(*) AS orders
FROM order_items
GROUP BY product_id
HAVING SUM(quantity * unit_price) > 10000
   AND COUNT(*) >= 10;
```

:::tip HAVING vs WHERE
- `WHERE` filters rows **before** `GROUP BY` — use for row-level conditions (`status = 'shipped'`)
- `HAVING` filters groups **after** `GROUP BY` — use for aggregate conditions (`COUNT(*) > 10`)
- You can use both in the same query: `WHERE` first, `HAVING` second
- `WHERE` can only reference columns, `HAVING` can reference aggregate expressions
:::

### WHERE vs HAVING Comparison

```plsql
-- These are NOT the same:

-- Query A: WHERE filters rows first, then groups remaining
SELECT status, COUNT(*) AS cnt
FROM orders
WHERE total_price > 100
GROUP BY status;

-- Query B: Groups all rows, then filters groups with min total > 100
SELECT status, COUNT(*) AS cnt
FROM orders
GROUP BY status
HAVING MIN(total_price) > 100;

-- Query A average is on orders > $100; Query B average is on all orders within groups where the min order > $100
```

### HAVING without GROUP BY

`HAVING` works without `GROUP BY` — the entire result is one group.

```plsql
-- Only show if we have data
SELECT SUM(total_price) AS revenue
FROM orders
HAVING COUNT(*) > 0;
```

## FILTER Clause

PostgreSQL-specific syntax for conditional aggregation within a single aggregate call. Avoids `CASE` inside aggregates.

```plsql
-- Revenue breakdown by status (single query, no self-join)
SELECT SUM(total_price) FILTER (WHERE status = 'delivered') AS delivered_revenue,
       SUM(total_price) FILTER (WHERE status = 'pending')   AS pending_revenue,
       SUM(total_price) FILTER (WHERE status = 'cancelled') AS cancelled_revenue,
       SUM(total_price) AS total_revenue
FROM orders;
```

This is equivalent to:

```plsql
SELECT SUM(CASE WHEN status = 'delivered' THEN total_price ELSE 0 END) AS delivered_revenue,
       SUM(CASE WHEN status = 'pending'   THEN total_price ELSE 0 END) AS pending_revenue,
       SUM(CASE WHEN status = 'cancelled' THEN total_price ELSE 0 END) AS cancelled_revenue,
       SUM(total_price) AS total_revenue
FROM orders;
```

`FILTER` is cleaner and often faster because PostgreSQL can optimize it better.

```plsql
-- Multiple aggregates on different subsets
SELECT product_id,
       COUNT(*) AS total_orders,
       COUNT(*) FILTER (WHERE quantity = 1) AS single_item_orders,
       COUNT(*) FILTER (WHERE quantity > 3) AS bulk_orders,
       SUM(unit_price * quantity) AS total_revenue,
       SUM(unit_price * quantity) FILTER (WHERE o.status = 'delivered') AS recognized_revenue
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
GROUP BY product_id;
```

## DISTINCT Aggregates

`COUNT(DISTINCT col)` counts unique non-NULL values. Available for all aggregates (`SUM(DISTINCT col)`, `AVG(DISTINCT col)`).

```plsql
SELECT COUNT(DISTINCT user_id)           AS unique_customers,
       COUNT(DISTINCT product_id)        AS unique_products_ordered,
       COUNT(*)                          AS total_orders,
       SUM(DISTINCT total_price)         -- Usually meaningless — sums each distinct value once
FROM orders;
```

:::warning DISTINCT Aggregates
- `SUM(DISTINCT col)` is **rarely** correct — it sums each distinct value only once, ignoring frequency
- `AVG(DISTINCT col)` averages distinct values, ignoring how often each occurs
- These are useful only for specific analytical questions about unique value distributions
:::

## GROUPING SETS, ROLLUP, CUBE

Extensions for computing multiple grouping levels in one query.

### GROUPING SETS

Specify exactly which grouping combinations to compute.

```plsql
-- Grouped by (status) AND (status, user_id) in one pass
SELECT status,
       user_id,
       COUNT(*) AS order_count
FROM orders
GROUP BY GROUPING SETS (
    (status),
    (status, user_id)
);
```

### ROLLUP

Hierarchical grouping — computes subtotals and a grand total. Useful for reporting.

```plsql
-- Year → month → subtotal (hierarchical drill-down)
SELECT EXTRACT(YEAR FROM order_date) AS year,
       EXTRACT(MONTH FROM order_date) AS month,
       SUM(total_price) AS revenue
FROM orders
GROUP BY ROLLUP (EXTRACT(YEAR FROM order_date), EXTRACT(MONTH FROM order_date));

-- Result includes:
-- (2025, 1)   → Jan 2025 total
-- (2025, 2)   → Feb 2025 total
-- (2025, NULL) → 2025 subtotal
-- (NULL, NULL) → grand total
```

### CUBE

All possible grouping combinations.

```plsql
-- All combinations: (status), (user_id), (status, user_id), ()
SELECT status, user_id, COUNT(*)
FROM orders
GROUP BY CUBE (status, user_id);
```

### GROUPING Function

Distinguishes NULLs from real NULLs vs subtotal rows.

```plsql
SELECT CASE WHEN GROUPING(status) = 1 THEN 'ALL' ELSE status END AS status,
       CASE WHEN GROUPING(user_id) = 1 THEN 'ALL' ELSE user_id::text END AS user_id,
       COUNT(*) AS order_count
FROM orders
GROUP BY ROLLUP (status, user_id);
```

## ORDER BY with Aggregates

You can order by an aggregate or by a column number.

```plsql
SELECT product_id,
       SUM(quantity * unit_price) AS revenue
FROM order_items
GROUP BY product_id
ORDER BY SUM(quantity * unit_price) DESC;  -- or: ORDER BY revenue DESC
```

```plsql
-- Top 10 products
SELECT product_id,
       SUM(quantity * unit_price) AS revenue
FROM order_items
GROUP BY product_id
ORDER BY revenue DESC
LIMIT 10;
```

## Common Mistakes

| # | Mistake | Wrong | Right |
|---|---------|-------|-------|
| 1 | **Missing column in GROUP BY** | `SELECT user_id, status, COUNT(*) FROM orders GROUP BY user_id;` — ERROR | Add `status` to `GROUP BY` or use an aggregate |
| 2 | **WHERE on aggregate** | `WHERE COUNT(*) > 10` — ERROR | Use `HAVING COUNT(*) > 10` |
| 3 | **Alias in WHERE/HAVING** | `HAVING cnt > 10` where `cnt` is alias — ERROR in some SQL dialects | Use `HAVING COUNT(*) > 10` (PostgreSQL allows alias in HAVING) |
| 4 | **Confusing WHERE and HAVING** | `HAVING status = 'shipped'` — works but inefficient | Use `WHERE status = 'shipped'` |
| 5 | **GROUP BY output column number** | `GROUP BY 1` — fragile | Repeat the expression |
| 6 | **Forgetting NULLs** | `AVG(col)` expects 4/4 but gets 4/2 because 2 NULLs | Use `COALESCE` or understand NULL handling |
| 7 | **SUM(DISTINCT) misunderstanding** | `SUM(DISTINCT col)` for total | Use `SUM(col)` — duplicates should count |

## Performance Considerations

| Tip | Reason |
|-----|--------|
| **Reduce rows before GROUP BY** | `WHERE` filtering before aggregation reduces work |
| **Index columns used in GROUP BY** | Can enable index-only scans for some group-by queries |
| **Prefer FILTER over CASE** | PostgreSQL optimizes FILTER better |
| **GROUP BY with expressions** | May not use indexes — consider computed columns |
| **HAVING on non-aggregates** | Move to `WHERE` — filters earlier, less data to group |
| **GROUPING SETS vs multiple queries** | Usually faster than UNION ALL of separate GROUP BYs |
| **Large GROUP BY with many columns** | Sort-based aggregation can be memory-intensive |

## Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **COUNT(*) includes NULLs** | `COUNT(*)` counts rows; `COUNT(col)` counts non-NULL values of `col` |
| 2 | **AVG of empty group returns NULL** | Not 0 — handle with `COALESCE(AVG(col), 0)` |
| 3 | **SUM of no rows returns NULL** | Same as AVG — use `COALESCE(SUM(col), 0)` |
| 4 | **GROUP BY column must be in SELECT** | In standard SQL, yes; PostgreSQL allows extra columns not in SELECT |
| 5 | **GROUP BY ordinal** | `GROUP BY 1, 2` works but breaks silently if SELECT changes |
| 6 | **ORDER BY alias in GROUP BY query** | PostgreSQL allows `ORDER BY alias` even with GROUP BY |
| 7 | **GROUP BY with text columns** | Works normally but can be slow on large `TEXT` columns |
| 8 | **Numeric precision** | `AVG` of `NUMERIC` returns `NUMERIC`; `AVG` of `INTEGER` returns `NUMERIC` in PostgreSQL |
| 9 | **FILTER with ORDER BY** | FILTER is standard SQL but PostgreSQL-specific in some behaviors |
| 10 | **ROLLUP/CUBE NULL ambiguity** | The GROUPING function is needed to distinguish subtotal NULLs from real data NULLs |

## Cross-Reference

| Topic | Description | Link |
|-------|-------------|------|
| WHERE clause | Row filtering before GROUP BY | [WHERE](./002-where.md) |
| ORDER BY | Sorting after aggregation | [ORDER BY](./003-order-by.md) |
| DISTINCT | Alternative deduplication | [DISTINCT](./004-distinct.md) |
| Operators | Arithmetic, comparison, string concat | [Operators](./005-operators.md) |
| LIMIT / OFFSET | Paging after aggregation | [LIMIT / OFFSET](./006-limit-offset.md) |
| SELECT Basics | SELECT expressions, aliases, execution order overview | [SELECT Basics](./001-select-basics.md) |
| JOINs | Combining tables before aggregation | JOIN (not yet written) |
| Window Functions | Aggregation without collapsing rows | Window Functions (not yet written) |
| Numeric Types | NUMERIC precision, division behavior | [Numeric](../../theory/types/003-numeric.md) |

## Cheat Sheet

```plsql
-- ==================== BASIC AGGREGATES ====================
SELECT COUNT(*), COUNT(col), SUM(col), AVG(col), MIN(col), MAX(col)
FROM table;

-- ==================== GROUP BY ====================
SELECT col1, col2, AGG(col3)
FROM table
WHERE condition
GROUP BY col1, col2;

-- ==================== HAVING ====================
SELECT col1, COUNT(*)
FROM table
GROUP BY col1
HAVING COUNT(*) > N;

-- ==================== FILTER ====================
AGG(col) FILTER (WHERE condition)

-- ==================== DISTINCT AGGREGATE ====================
COUNT(DISTINCT col)
SUM(DISTINCT col)  -- rarely useful

-- ==================== GROUPING SETS ====================
GROUP BY GROUPING SETS ((col1), (col1, col2))
GROUP BY ROLLUP (col1, col2)     -- hierarchical subtotals
GROUP BY CUBE (col1, col2)       -- all combinations
GROUPING(col) = 1                -- detects subtotal rows

-- ==================== EXECUTION ORDER ====================
-- FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT

-- ==================== COMMON PATTERNS ====================
-- Revenue per product (top 10)
SELECT product_id, SUM(quantity * unit_price) AS revenue
FROM order_items
GROUP BY product_id
ORDER BY revenue DESC
LIMIT 10;

-- Daily order count
SELECT order_date::DATE AS day, COUNT(*) AS orders
FROM orders
GROUP BY order_date::DATE
ORDER BY day;

-- Percentage by category
SELECT status,
       COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () AS pct
FROM orders
GROUP BY status;
```
