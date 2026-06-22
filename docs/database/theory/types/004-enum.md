# ENUM Type

> A user-defined data type that stores one value from a fixed, ordered set of string labels. PostgreSQL stores ENUM values as 4-byte integers internally, making them more compact than plain strings.

## What ENUM Is

An ENUM is a **type**, not a constraint. Declaring a column as an ENUM means every value in that column must be one of the predefined labels — enforced at the database level, not via a CHECK constraint.

```plsql
CREATE TYPE order_status AS ENUM ('pending', 'shipped', 'delivered', 'cancelled');
```

Once created, it acts like any other type — usable in table columns, function arguments, array elements, etc.

## Storage

| Aspect | Detail |
|--------|--------|
| **Internal representation** | 4-byte integer (the position in the ENUM definition) |
| **Storage per value** | Always 4 bytes, regardless of label length |
| **Index** | Standard B-tree (ordered by definition position) |
| **TOAST** | Never — 4 bytes fits inline |

```plsql
-- Compare storage:
SELECT pg_column_size('pending'::order_status);     -- 4 bytes
SELECT pg_column_size('pending'::text);              -- 9 bytes (text overhead)
SELECT pg_column_size('pending'::varchar(20));       -- 13 bytes (varlena overhead)
```

For short strings, ENUM saves storage. For long strings, the savings are more significant.

## Ordering Semantics

ENUM values are ordered by their **position in the CREATE TYPE statement**, not alphabetically.

```plsql
CREATE TYPE priority AS ENUM ('low', 'medium', 'high', 'urgent');

SELECT 'low'::priority < 'high'::priority;   -- TRUE (low = 1, high = 3)
SELECT 'medium'::priority > 'urgent'::priority; -- FALSE (medium = 2, urgent = 4)

-- ORDER BY uses definition order:
SELECT * FROM tasks ORDER BY priority;
-- 1. low
-- 2. medium
-- 3. high
-- 4. urgent
```

This is useful when the natural sort order differs from alphabetical:

```plsql
-- Alphabetical order: cancelled, confirmed, delivered, pending, shipped
-- Business order: pending, confirmed, shipped, delivered, cancelled

CREATE TYPE order_status AS ENUM (
    'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'
);
```

## When to Use ENUM

### Good Use Cases

| Scenario | Example | Why ENUM wins |
|----------|---------|---------------|
| **Stable, small value sets** | Order status, priority level, day of week | Compact storage, built-in ordering, self-documenting |
| **Order matters** | Status workflow (`pending → approved → shipped`) | Definition-order sorting matches business logic |
| **No need to add values frequently** | User roles (`admin`, `editor`, `viewer`) | Adding values is a DDL operation, not app-breaking |
| **Values are known at design time** | Gender, contact type, subscription tier | Single definition, enforced everywhere |

### Poor Use Cases

| Scenario | Why ENUM is wrong |
|----------|------------------|
| **Frequently changing values** | Adding/removing an ENUM value requires ALTER TYPE, which can be disruptive |
| **Many values (50+)** | ENUM with hundreds of values is unwieldy — consider a lookup table |
| **Values come from external data** | Tags, categories, user-generated labels — use a table with FK |
| **Multi-language labels** | ENUM stores one label — use a lookup table with translations |
| **Values need metadata** | If a status needs a description, color, or timeout — use a table |

## ENUM vs Alternatives

### ENUM vs TEXT with CHECK

```plsql
-- ENUM
CREATE TYPE order_status AS ENUM ('pending', 'shipped', 'done');
CREATE TABLE orders (status order_status);

-- TEXT + CHECK
CREATE TABLE orders (
    status TEXT CHECK (status IN ('pending', 'shipped', 'done'))
);
```

| Aspect | ENUM | TEXT + CHECK |
|--------|------|-------------|
| Storage | 4 bytes | Full string + varlena overhead |
| Performance | Slightly faster (integer comparison) | String comparison |
| Adding values | `ALTER TYPE ... ADD VALUE` (DDL) | `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT` (DDL) |
| Removing values | Not possible — requires full migration | Just change the CHECK |
| Ordering | Definition order (controllable) | Alphabetical (or custom ORDER BY) |
| Type safety | Strong — column type is the ENUM | Weak — any TEXT can be inserted if CHECK is removed |
| Index | Standard B-tree | Standard B-tree |
| Casting | `status::text` to get string | Already text |

### ENUM vs Lookup Table

```plsql
-- ENUM
CREATE TYPE order_status AS ENUM ('pending', 'shipped', 'done');

-- Lookup table
CREATE TABLE order_statuses (
    code TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    description TEXT
);

CREATE TABLE orders (
    status TEXT REFERENCES order_statuses(code)
);
```

| Aspect | ENUM | Lookup Table |
|--------|------|-------------|
| Storage | 4 bytes per value | Full string (unless using integer FK) |
| Adding values | `ALTER TYPE` (may lock) | `INSERT INTO order_statuses` (no lock) |
| Removing values | Impossible | `DELETE` + handle orphans |
| Ordering | Definition order | `ORDER BY sort_order` |
| Metadata | None — just a label | Unlimited (description, color, timeout) |
| Joins | No join needed | Join required for label/description |
| Portability | PostgreSQL-specific | SQL standard |
| Migration | Breaking DDL change | Non-breaking data change |

## Value Lookup

```plsql
-- List all values of an ENUM type
SELECT enumlabel, enumsortorder
FROM pg_enum
JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
WHERE typname = 'order_status';

-- Check if a value is valid
SELECT 'shipped'::order_status;  -- OK
SELECT 'unknown'::order_status;  -- ERROR

-- Safe check via pg_enum
SELECT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'order_status' AND e.enumlabel = 'shipped'
);
```

## Migration Challenges

### Removing an ENUM Value

ENUM values cannot be removed. The only path is creating a new type and migrating:

```plsql
-- Step 1: Create new ENUM without the value
CREATE TYPE order_status_v2 AS ENUM ('pending', 'shipped', 'done');

-- Step 2: Migrate columns
ALTER TABLE orders ALTER COLUMN status TYPE order_status_v2
    USING status::text::order_status_v2;
-- CAUTION: This fails if any row has 'cancelled' (not in v2)

-- To map old values:
ALTER TABLE orders ALTER COLUMN status TYPE order_status_v2
    USING CASE status::text
        WHEN 'cancelled' THEN 'done'::order_status_v2
        ELSE status::text::order_status_v2
    END;

-- Step 3: Drop old type
DROP TYPE order_status;

-- Step 4: Rename
ALTER TYPE order_status_v2 RENAME TO order_status;
```

### Reordering ENUM Values

Not possible directly. Create a new ENUM in the desired order and migrate.

### Adding Values Mid-Definition

Adding a value with `BEFORE` or `AFTER` requires an `ACCESS EXCLUSIVE` lock:

```plsql
ALTER TYPE order_status ADD VALUE 'processing' BEFORE 'shipped';
-- Blocks reads and writes on any table using this ENUM
```

Adding at the end does not require a table rewrite:

```plsql
ALTER TYPE order_status ADD VALUE 'refunded';
-- No heavy lock — safe for production
```

## Performance

| Operation | ENUM | TEXT | TEXT + CHECK |
|-----------|------|------|-------------|
| Storage (per value) | 4 bytes | ~9+ bytes | ~9+ bytes |
| Comparison | Integer equality | String equality | String equality |
| Index scan | Fast (int4) | Slightly slower | Slightly slower |
| Sort by value | Definition order | Alphabetical | Alphabetical |
| Hash join | Integer hash | String hash | String hash |

ENUMs are slightly faster than TEXT for comparison and indexing because integers compare faster than strings, but the difference is usually negligible.

## Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **Cannot remove values** | ENUM values are permanent — requires full type migration to remove |
| 2 | **Case-sensitive** | `'PENDING' != 'pending'` — always use consistent casing |
| 3 | **DDL lock for BEFORE/AFTER** | Adding a value with BEFORE/AFTER takes ACCESS EXCLUSIVE — blocks reads and writes |
| 4 | **Order is definition order** | Not alphabetical — can surprise developers expecting text ordering |
| 5 | **Hard to change in production** | ALTER TYPE is DDL — cannot be rolled back easily |
| 6 | **No per-value metadata** | Cannot attach descriptions, colors, or extra info to ENUM values |
| 7 | **Portability** | ENUM is not SQL standard — migrating to another database requires schema changes |
| 8 | **Pg_dump preserves ordering** | pg_dump outputs ENUMs in creation order — renaming does not reorder |
| 9 | **Empty ENUM** | `CREATE TYPE empty AS ENUM ()` — valid but useless, cannot insert any value |
| 10 | **ALTER TYPE with locks** | Even appending a value requires a lock on the type — concurrent transactions must wait |

## Cross-Reference

| Topic | Description | Link |
|-------|-------------|------|
| Boolean Type | TRUE/FALSE/NULL storage | [Boolean](./001-boolean.md) |
| String Types | CHAR, VARCHAR, TEXT behavior | [Strings](./002-strings.md) |
| Numeric Types | INTEGER, NUMERIC, SERIAL | [Numeric](./003-numeric.md) |
| SQL: CREATE TYPE | ENUM syntax, ALTER TYPE, migration | [User-Defined Types](../../sql/001-Data-foundation/005-user-defined-types.md) |
| Constraints | CHECK constraints as alternative | [Constraints](../../sql/001-Data-foundation/004-constraints.md) |

## Cheat Sheet

```plsql
-- ==================== CREATE ====================
CREATE TYPE name AS ENUM ('a', 'b', 'c');

-- ==================== LIST VALUES ====================
SELECT enumlabel FROM pg_enum
JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
WHERE typname = 'name'
ORDER BY enumsortorder;

-- ==================== STORAGE CHECK ====================
SELECT pg_column_size('a'::name);  -- always 4 bytes

-- ==================== ORDERING ====================
-- By definition position (not alphabetical):
CREATE TYPE priority AS ENUM ('low', 'medium', 'high');
SELECT 'low'::priority < 'high'::priority;  -- TRUE

-- ==================== ENUM vs TEXT ====================
-- ENUM: strong typing, 4 bytes, DDL to change
-- TEXT + CHECK: flexible, larger storage, DDL to change
-- Lookup table: fully dynamic, join required
```
