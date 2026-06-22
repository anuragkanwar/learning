# Cursor-based Pagination

> A pagination strategy that uses a **filter on a known value** (the cursor) from the last row of the previous page, instead of skipping rows with OFFSET. Also called **seek method** or **keyset pagination**.

## The Problem with OFFSET

OFFSET-based pagination is simple but scales poorly:

```sql
SELECT * FROM users ORDER BY id LIMIT 10 OFFSET 99990;
```

What the database must do:
1. Scan the index from the beginning
2. Walk past 99,990 rows (count them one by one)
3. Fetch the next 10 rows
4. Return those 10 rows — discard the 99,990

The cost grows linearly with the OFFSET value. Every skipped row is real work — reading index entries, fetching heap tuples, evaluating expressions. Page 1 might take 0.1ms. Page 10,000 on a table with 1M rows might take 100ms or more.

## How Cursor-based Pagination Works

Instead of counting how many rows to skip, you tell the database **where you left off**:

```sql
-- First page: no cursor yet
SELECT * FROM users ORDER BY id LIMIT 10;
-- Returns: id=1..10

-- Second page: cursor = last id from previous page
SELECT * FROM users WHERE id > 10 ORDER BY id LIMIT 10;
-- Returns: id=11..20

-- Third page: cursor = 20
SELECT * FROM users WHERE id > 20 ORDER BY id LIMIT 10;
-- Returns: id=21..30
```

The database uses an **index seek** (O(log n)) to find the cursor position, then scans forward for `LIMIT` rows. No rows are skipped or discarded. Each page takes the same time regardless of depth.

### Key Insight

OFFSET is a **row-counting** strategy. Cursor is a **position-based** strategy.

| OFFSET | Cursor |
|--------|--------|
| "Skip the first 100 rows" | "Give me rows after this known ID" |
| Database must count rows | Database seeks to position |
| Cost: O(offset) per page | Cost: O(log n) per page (index seek) |
| Slows down on deep pages | Constant time per page |

## Requirements

### 1. A Unique, Sortable Cursor Column

The cursor needs a column (or combination of columns) that:
- Is **unique** — no duplicates, so there is no ambiguity about which row to start from
- Is **sortable** — can use `>` or `<` to define position
- Is **immutable** — value does not change between pagination requests

Common choices: `id` (auto-increment PK), `created_at` + `id` (timestamp with tiebreaker)

### 2. Stable Sort Order

The ORDER BY must be deterministic. If the sort column has duplicate values, rows can shift between pages:

```sql
-- Problem: duplicate names
SELECT * FROM users ORDER BY name LIMIT 10;
-- Page 1: Alice(1), Alice(2), Bob(3), ...
-- If we use cursor = name='Bob', page 2 misses Alice(2)

-- Fix: add a tiebreaker column
SELECT * FROM users ORDER BY name, id LIMIT 10;
-- Now cursor = (name='Bob', id=3) is unambiguous
```

### 3. Cursor Encoding for APIs

The cursor value must be passed from the client back to the server. In REST APIs, it is typically:
- Returned in the response body alongside the data
- Encoded (base64) to hide the underlying column type
- Opaque to the client — the client just sends it back

```json
// API response
{
  "data": [ ... ],
  "cursor": "eyJsYXN0X2lkIjogMTAwfQ=="  // base64 of {"last_id": 100}
}

// Next request
GET /api/users?cursor=eyJsYXN0X2lkIjogMTAwfQ==&limit=10
```

## Types of Cursor Pagination

### 1. Simple Cursor (Single Column)

Uses one column — typically a sequential ID:

```sql
SELECT * FROM users
WHERE id > :last_id
ORDER BY id
LIMIT :limit;
```

**Pros:** Simplest, fastest, uses PK index directly
**Cons:** Only works for forward pagination, cannot skip to arbitrary pages

### 2. Composite Cursor (Multiple Columns)

Uses multiple columns for the cursor, typically for sorting by non-unique fields:

```sql
-- Sort by created_at, tiebreak by id
SELECT * FROM users
WHERE (created_at, id) > (:last_created_at, :last_id)
ORDER BY created_at, id
LIMIT :limit;

-- Alternative syntax (equivalent)
WHERE created_at > :last_created_at
   OR (created_at = :last_created_at AND id > :last_id)
```

**Pros:** Works with any sort column, handles ties
**Cons:** More complex query, needs composite index on `(created_at, id)`

### 3. Backward Pagination

Navigating to the previous page by reversing the sort:

```sql
-- Get the previous page (relative to cursor)
SELECT * FROM users
WHERE id < :first_id_of_current_page
ORDER BY id DESC
LIMIT :limit;
-- Then reverse the result order in application code
```

### 4. Seek Pagination (Keyset)

A broader term that covers cursor-based pagination with any type of key:

```sql
-- Multi-column seek
SELECT * FROM orders
WHERE (status, order_date, id) > ('shipped', '2025-06-01', 5000)
ORDER BY status, order_date, id
LIMIT 20;
```

Requires a matching composite index on `(status, order_date, id)`.

## Trade-offs vs OFFSET-based

| Aspect | OFFSET | Cursor |
|--------|--------|--------|
| **Speed at depth** | Degrades linearly | Constant |
| **Jump to page N** | Yes (`OFFSET (N-1)*size`) | No (must traverse) |
| **Total count** | Easy (`COUNT(*)`) | Extra query needed |
| **Real-time data** | Rows can shift between pages | Stable — new rows do not shift cursor position |
| **Deletion safety** | Rows shift, pages may show gaps | No gap issues |
| **Client complexity** | Simple (page number) | Needs cursor state |
| **Bidirectional** | Trivial | More complex (reverse sort) |
| **Concurrent inserts** | New rows shift pages | New rows do not affect existing cursors |
| **Random access** | Yes | No |

### When to Use Each

**Use OFFSET when:**
- Table is small (under a few thousand rows)
- You need random page access ("jump to page 42")
- The user needs a total count with every request
- The dataset does not grow frequently

**Use Cursor when:**
- Table is large (millions of rows)
- Deep pagination is common ("load more" or infinite scroll)
- Real-time data stability matters (social feeds, activity logs)
- You have a unique indexed column for the cursor

## Performance Comparison

For a table with 10 million rows, fetching 20 rows per page:

| Page | OFFSET time | Cursor time | Ratio |
|------|-------------|-------------|-------|
| 1 | 0.2ms | 0.2ms | 1x |
| 10 | 2ms | 0.2ms | 10x |
| 1,000 | 200ms | 0.2ms | 1000x |
| 100,000 | 20s | 0.2ms | 100000x |

The OFFSET cost grows linearly because the database must scan and skip rows. The cursor cost is constant because each query is an index seek followed by a short scan.

## Implementation Details

### Index Usage

```sql
-- Cursor query uses index:
EXPLAIN SELECT * FROM users WHERE id > 100000 ORDER BY id LIMIT 20;
-- Index Scan using users_pkey on users
--   Index Cond: (id > 100000)
--   Limit: 20

-- OFFSET query table scan on deep page:
EXPLAIN SELECT * FROM users ORDER BY id LIMIT 20 OFFSET 100000;
-- Limit  (rows=20)
--   ->  Index Scan using users_pkey on users  (rows=100000)
-- The Index Scan scans 100,000 entries before the Limit kicks in
```

### Total Count

Cursor pagination does not inherently know the total number of pages. If needed, run a separate count query:

```sql
SELECT COUNT(*) FROM users;  -- separate query, potentially expensive
```

Many cursor-based APIs omit the total count or provide an estimate.

### Handling Empty Pages

Unlike OFFSET, where asking for page 100 when only 50 pages exist returns an empty page, cursor pagination just returns an empty result when the cursor is beyond the last row. The client knows pagination is done when the result has fewer rows than the requested limit.

## Common Pitfalls

| # | Pitfall | Detail |
|---|---------|--------|
| 1 | **Non-unique cursor column** | Duplicate values cause missed or duplicate rows. Always add a tiebreaker |
| 2 | **Mutable cursor column** | If the cursor value changes (e.g., user updates their name), the cursor is invalid |
| 3 | **No index on cursor** | Without an index, cursor queries do a full scan anyway — no performance gain |
| 4 | **Backward pagination without reverse index** | The index must support descending scans efficiently |
| 5 | **Cursor decoded on client** | Always encode/obfuscate the cursor — exposing raw IDs is fine, but exposing internal sort values can be a leak |
| 6 | **Assuming ORDER BY + WHERE id > N uses the index** | If ORDER BY does not match the index order, PostgreSQL may still do a full scan |

## Summary

Cursor-based pagination replaces row-counting (OFFSET) with position-seeking (WHERE cursor > value). It provides constant-time pagination at any depth at the cost of losing random page access and increasing client complexity. For large datasets, infinite scroll, or real-time feeds, it is the correct choice. For small datasets, admin panels with page numbers, or any case requiring "jump to page N", OFFSET is simpler and good enough.
