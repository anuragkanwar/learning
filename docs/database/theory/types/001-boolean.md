# Boolean Type

> A data type that stores one of two logical values: `TRUE` or `FALSE`. Also includes `NULL` (unknown). PostgreSQL implements the SQL standard `BOOLEAN` type with extensive input flexibility.

## Storage & Size

| Property | Value |
|----------|-------|
| Storage size | **1 byte** |
| SQL standard | Yes (`BOOLEAN`) |
| Internal name | `bool` |
| Allowed values | `TRUE`, `FALSE`, `NULL` |

## Literals

PostgreSQL accepts many string representations for boolean input:

| TRUE | FALSE |
|------|-------|
| `TRUE` | `FALSE` |
| `'true'` | `'false'` |
| `'t'` | `'f'` |
| `'yes'` | `'no'` |
| `'y'` | `'n'` |
| `'on'` | `'off'` |
| `'1'` | `'0'` |
| `1` (integer) | `0` (integer) |

```plsql
-- All of these set is_active = TRUE
UPDATE users SET is_active = TRUE;
UPDATE users SET is_active = 'true';
UPDATE users SET is_active = 't';
UPDATE users SET is_active = 'yes';
UPDATE users SET is_active = 'y';
UPDATE users SET is_active = 'on';
UPDATE users SET is_active = '1';
UPDATE users SET is_active = 1;
```

```plsql
-- All of these set is_active = FALSE
UPDATE users SET is_active = FALSE;
UPDATE users SET is_active = 'false';
UPDATE users SET is_active = 'f';
UPDATE users SET is_active = 'no';
UPDATE users SET is_active = 'n';
UPDATE users SET is_active = 'off';
UPDATE users SET is_active = '0';
UPDATE users SET is_active = 0;
```

:::warning

Any value outside the accepted inputs causes an error:

```plsql
SELECT 'true'::boolean;   -- TRUE
SELECT 'false'::boolean;  -- FALSE
SELECT '1'::boolean;      -- TRUE
SELECT '0'::boolean;      -- FALSE
SELECT '2'::boolean;      -- ERROR: invalid input syntax for type boolean: "2"
SELECT 'maybe'::boolean;  -- ERROR: invalid input syntax for type boolean: "maybe"
```
:::

## Output Format

PostgreSQL always outputs booleans as `t` or `f`:

```plsql
SELECT TRUE;   -- t
SELECT FALSE;  -- f
SELECT 'yes'::boolean;  -- t
SELECT '0'::boolean;    -- f
```

To display as full words, cast to text or use `CASE`:

```plsql
SELECT TRUE::text;              -- 'true'
SELECT FALSE::text;             -- 'false'

SELECT CASE WHEN is_active THEN 'Active' ELSE 'Inactive' END FROM users;

-- PostgreSQL-specific shortcut:
SELECT is_active::text FROM users;  -- 'true' / 'false'
```

## Boolean in WHERE

The boolean column can be used directly as a condition — no comparison needed:

```plsql
-- All of these are equivalent:
SELECT * FROM users WHERE is_active = TRUE;
SELECT * FROM users WHERE is_active;
SELECT * FROM users WHERE is_active IS TRUE;

-- Negation:
SELECT * FROM users WHERE is_active = FALSE;
SELECT * FROM users WHERE NOT is_active;
SELECT * FROM users WHERE is_active IS FALSE;
SELECT * FROM users WHERE is_active IS NOT TRUE;
```

### The NULL case

When `is_active` can be NULL, the behavior changes:

```plsql
-- Returns active users (NULL is excluded)
SELECT * FROM users WHERE is_active;

-- Returns inactive users (NULL is excluded too!)
SELECT * FROM users WHERE NOT is_active;

-- Returns both inactive AND NULL users
SELECT * FROM users WHERE is_active IS NOT TRUE;
-- IS NOT TRUE = FALSE or NULL
```

| Condition | is_active = TRUE | is_active = FALSE | is_active = NULL |
|-----------|-----------------|------------------|-----------------|
| `WHERE is_active` | Included | Excluded | Excluded |
| `WHERE NOT is_active` | Excluded | Included | Excluded |
| `WHERE is_active IS TRUE` | Included | Excluded | Excluded |
| `WHERE is_active IS NOT TRUE` | Excluded | Included | Included |
| `WHERE is_active IS FALSE` | Excluded | Included | Excluded |
| `WHERE is_active IS NOT FALSE` | Included | Excluded | Included |
| `WHERE is_active IS NULL` | Excluded | Excluded | Included |
| `WHERE is_active IS NOT NULL` | Included | Included | Excluded |

## Boolean in CHECK Constraints

Common pattern for ensuring consistent data:

```plsql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_admin_active CHECK (
        NOT (is_admin AND NOT is_active)  -- admins cannot be inactive
    )
);
```

## Boolean in DEFAULT

```plsql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    -- Common defaults:
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    is_shipped BOOLEAN NOT NULL DEFAULT FALSE,
    is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE
);
```

## Boolean with NOT NULL

A `BOOLEAN NOT NULL` column has exactly two possible values (`TRUE` or `FALSE`). Without `NOT NULL`, it has three (`TRUE`, `FALSE`, `NULL`).

```plsql
-- Three possible states: active, inactive, unknown
ALTER TABLE users ADD COLUMN consent_given BOOLEAN;  -- nullable

-- Two possible states: active or inactive
ALTER TABLE users ADD COLUMN consent_given BOOLEAN NOT NULL DEFAULT FALSE;
```

## Boolean Expressions

Booleans can be used directly in expressions:

```plsql
-- Counting booleans
SELECT COUNT(*) FILTER (WHERE is_active) AS active_users FROM users;
SELECT COUNT(*) FILTER (WHERE NOT is_active) AS inactive_users FROM users;

-- Boolean in SELECT (returns t/f)
SELECT username, is_active FROM users;

-- Boolean to integer
SELECT is_active::int FROM users;     -- 1 or 0
SELECT (is_active = TRUE)::int;       -- 1 or 0

-- Sum of booleans (counting TRUEs)
SELECT SUM(is_active::int) FROM users;  -- number of active users
```

## Casting

```plsql
-- String to boolean
SELECT 'true'::boolean;    -- t
SELECT 'f'::boolean;       -- f

-- Boolean to string
SELECT TRUE::text;         -- 'true'

-- Boolean to integer
SELECT TRUE::int;          -- 1
SELECT FALSE::int;         -- 0

-- Integer to boolean
SELECT 1::boolean;         -- t
SELECT 0::boolean;         -- f
```

## Indexing

Boolean columns alone are rarely indexed (only 2-3 distinct values — low selectivity). But they work well in **partial indexes** or **composite indexes**:

```plsql
-- Partial index: only active users
CREATE INDEX idx_active_users_email ON users(email) WHERE is_active;

-- Composite index: useful for filtering by active + sorting by date
CREATE INDEX idx_active_created ON users(is_active, created_at)
    WHERE is_active;

-- Query that uses the above index:
SELECT email FROM users
WHERE is_active
ORDER BY created_at DESC
LIMIT 10;
```

## Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **Three-valued logic** | `BOOLEAN` can be NULL — `WHERE NOT is_active` excludes NULLs. Use `IS NOT TRUE` to include them |
| 2 | **No implicit 0/1 in WHERE** | `WHERE is_active` works. `WHERE is_active = 1` requires a cast or integer literal |
| 3 | **No built-in type coercion** | `INSERT INTO t (col) VALUES (1)` — 1 is integer, not boolean. PostgreSQL may coerce depending on context, but explicit cast is safer |
| 4 | **Output is `t`/`f`** | Application code must handle `t`/`f` strings — not `true`/`false` |
| 5 | **Index on boolean alone is wasteful** | Only 2 distinct values — index rarely used. Partial or composite indexes are more useful |
| 6 | **Boolean in ORDER BY** | `FALSE` (0) sorts before `TRUE` (1), `NULL` sorts last by default |

## Cross-Reference

| Topic | Description | Link |
|-------|-------------|------|
| Operators | `IS TRUE`, `IS FALSE`, `IS UNKNOWN`, three-valued logic | [Operators](../../sql/003-Data-querying/005-operators.md) |
| WHERE | Filtering with boolean conditions | [WHERE](../../sql/003-Data-querying/002-where.md) |
| String Types | CHAR, VARCHAR, TEXT | [Strings](./002-strings.md) |
| Numeric Types | INTEGER, NUMERIC, SERIAL, floating-point | [Numeric](./003-numeric.md) |
| ENUM | Fixed set of string values, ordering, storage | [ENUM](./004-enum.md) |

## Cheat Sheet

```plsql
-- ==================== CREATION ====================
col BOOLEAN                        -- nullable, default: NULL
col BOOLEAN NOT NULL               -- must be TRUE or FALSE
col BOOLEAN NOT NULL DEFAULT TRUE  -- default: TRUE

-- ==================== INPUT ====================
TRUE  'true'  't'  'yes'  'y'  'on'  '1'  1   -- all TRUE
FALSE 'false' 'f'  'no'   'n'  'off' '0'  0   -- all FALSE

-- ==================== FILTERING ====================
WHERE is_active                    -- TRUE only
WHERE NOT is_active                -- FALSE only (excludes NULL)
WHERE is_active IS TRUE            -- TRUE only
WHERE is_active IS NOT TRUE        -- FALSE + NULL
WHERE is_active IS FALSE           -- FALSE only
WHERE is_active IS NOT FALSE       -- TRUE + NULL

-- ==================== CASTING ====================
'true'::boolean                    -- string → boolean
TRUE::text                         -- boolean → string
TRUE::int                          -- boolean → integer (1/0)
1::boolean                         -- integer → boolean
SUM(is_active::int)                -- count TRUEs
COUNT(*) FILTER (WHERE is_active)  -- count TRUEs (alternative)
```
