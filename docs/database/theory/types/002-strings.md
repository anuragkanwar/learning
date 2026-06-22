# Character Types — CHAR, VARCHAR, TEXT

> PostgreSQL's character types store string values. Unlike many other databases, all three types have **identical performance** — there is no hidden advantage to choosing one over the other in terms of speed or storage.

## Type Overview

| Type | Declaration | Max Length | Storage | Trailing Spaces |
|------|------------|------------|---------|-----------------|
| `CHAR(n)` | `CHAR(10)` | n (1 to 10,485,760) | Variable | Padded with spaces |
| `VARCHAR(n)` | `VARCHAR(100)` | n (1 to 10,485,760) | Variable | Stored as-is |
| `TEXT` | `TEXT` | Unlimited (1 GB per value) | Variable | Stored as-is |
| `CHAR` (no n) | `CHAR` | 1 | Variable | Same as `CHAR(1)` |

:::info

`CHAR(n)` and `VARCHAR(n)` with a length limit raise an error if the input exceeds n characters. `TEXT` accepts any length up to 1 GB.
:::

## CHAR(n) — Fixed-length Character

Pads values shorter than n with spaces on the right. The spaces are **stored** in the database but **removed** on output (except in some SQL contexts).

```plsql
CREATE TABLE products (
    code CHAR(5) NOT NULL
);

INSERT INTO products (code) VALUES ('AB');
-- Stored as: 'AB   '  (5 chars, 3 trailing spaces)

SELECT code, length(code) FROM products;
-- code  | length
---------+--------
-- AB   | 2
-- length() returns the string length WITHOUT trailing spaces

SELECT code, octet_length(code) FROM products;
-- code  | octet_length
---------+-------------
-- AB   | 5
-- octet_length returns the storage size WITH trailing spaces
```

### Trailing Space Handling

PostgreSQL treats trailing spaces as **insignificant** for comparison purposes — but only for CHAR:

```plsql
-- CHAR comparison ignores trailing spaces
SELECT 'AB' = 'AB  '::char(5);   -- TRUE
SELECT 'AB' = 'AB'::char(5);     -- TRUE

-- VARCHAR comparison preserves trailing spaces
SELECT 'AB' = 'AB  '::varchar(5); -- FALSE
-- 'AB  '::varchar(5) has trailing spaces, 'AB' does not
```

## VARCHAR(n) — Variable-length with Limit

Stores the string exactly as provided, up to n characters. No padding. Rejects strings longer than n.

```plsql
CREATE TABLE users (
    username VARCHAR(50) NOT NULL
);

INSERT INTO users (username) VALUES ('alice');
-- Stored as: 'alice'  (5 chars, no padding)

INSERT INTO users (username) VALUES (repeat('a', 51));
-- ERROR: value too long for type character varying(50)

-- Without length: VARCHAR = TEXT (no limit)
CREATE TABLE t (col VARCHAR);  -- same as TEXT
```

## TEXT — Unlimited Variable-length

Accepts any length up to 1 GB per value. Identical performance to VARCHAR.

```plsql
CREATE TABLE articles (
    title TEXT NOT NULL,
    body TEXT
);

INSERT INTO articles (title, body) VALUES
    ('My Post', repeat('Lorem ipsum ', 10000));
-- No length restriction — stores the full text
```

## Storage

All three types use the same internal storage mechanism:

| Aspect | Detail |
|--------|--------|
| **Internal type** | All stored as `varlena` (variable-length array) |
| **Overhead** | 1 byte if string ≤ 126 bytes, else 4 bytes + possibly TOAST |
| **Inline storage** | Up to 2,000 bytes by default (TOAST_TUPLE_THRESHOLD) |
| **External storage** | Strings > 2,000 bytes may be compressed and/or moved to TOAST table |
| **Max size** | 1 GB per value (limited by `TOAST_MAX_CHUNK_SIZE`) |

```plsql
-- Check storage parameters for a column
SELECT attname, typname, attstorage
FROM pg_attribute a
JOIN pg_type t ON t.oid = atttypid
WHERE attrelid = 'users'::regclass AND attname = 'username';

-- attstorage values:
-- p = plain (always inline)
-- e = external (can be stored in TOAST)
-- m = main (prefer inline, but allow TOAST — default for strings)
-- x = extended (compress then TOAST if needed)
```

## Performance

**All three types have identical performance** in PostgreSQL. This is different from other databases (Oracle, MySQL) where VARCHAR is faster than CHAR.

```plsql
-- These three tables perform identically:
CREATE TABLE t1 (col CHAR(100));
CREATE TABLE t2 (col VARCHAR(100));
CREATE TABLE t3 (col TEXT);

-- Same index performance:
CREATE INDEX ON t1(col);
CREATE INDEX ON t2(col);
CREATE INDEX ON t3(col);
```

### Why They Are the Same

PostgreSQL stores all string types as variable-length values internally. `CHAR(n)` does not reserve storage for n characters — it stores the actual string plus padding metadata. This means:

- No storage benefit to choosing VARCHAR over TEXT
- No performance benefit to choosing CHAR over VARCHAR
- No index performance difference

## Size Limits

| Constraint | Limit |
|-----------|-------|
| `CHAR(n)` max n | 10,485,760 (10 MB) |
| `VARCHAR(n)` max n | 10,485,760 (10 MB) |
| `TEXT` max per value | 1 GB |
| Row max (all columns) | ~1.6 TB (limited by page size) |

:::warning

Declaring `VARCHAR(10_485_760)` is pointless — it provides no practical constraint while incurring the length-checking overhead. Use `TEXT` instead and add a `CHECK` constraint if you need an explicit limit:

```plsql
-- Instead of VARCHAR(n) for very large n:
CREATE TABLE articles (
    body TEXT CHECK (length(body) <= 100000)
);
```
:::

## When to Use Which

### Use CHAR(n) when:
- The value has a **fixed, well-known length** (ISO country codes: `CHAR(2)`, ISO currency codes: `CHAR(3)`, US ZIP codes: `CHAR(5)`)
- You want the trailing-space padding semantics explicitly
- Interfacing with legacy systems that expect fixed-width columns

### Use VARCHAR(n) when:
- You want a **length constraint** but the values vary in length (usernames, email addresses, phone numbers)
- The max length is meaningful and enforced by the database
- Porting from another database that requires explicit length limits

### Use TEXT when:
- There is **no natural max length** (blog content, comments, descriptions)
- You want to enforce the constraint in the application layer, not the schema
- You want maximum flexibility without schema changes
- **This is the recommended default** for most string columns

## Character Set & Encoding

PostgreSQL does not store character set information per column. The encoding is set at the **database level**:

```plsql
-- Check database encoding
SELECT datname, encoding, datcollate, datctype
FROM pg_database WHERE datname = current_database();

-- Common encodings: UTF8, LATIN1, SQL_ASCII
```

All character types store strings in the database encoding. `CHAR(n)`, `VARCHAR(n)`, and `TEXT` all count **characters**, not bytes:

```plsql
-- UTF-8 multibyte character:
SELECT length('é'::text);          -- 1 character
SELECT octet_length('é'::text);    -- 2 bytes (in UTF-8)

-- With CHAR/VARCHAR limits:
CREATE TABLE t (col VARCHAR(5));
INSERT INTO t VALUES ('ééééé');     -- 5 characters, OK
INSERT INTO t VALUES ('éééééé');    -- ERROR: too long (6 characters)
```

## Comparison Behavior

PostgreSQL uses the database **collation** for string comparison:

```plsql
-- Default collation (typically en_US.UTF-8 or C):
SELECT 'a' < 'b';     -- TRUE (lexicographic)

-- Case sensitivity depends on collation:
-- In C locale: 'A' < 'a' (uppercase first)
-- In en_US.UTF-8: 'a' = 'A' in some contexts

-- Explicit collation override:
SELECT 'a' < 'A' COLLATE "C";              -- FALSE (C: 'A' < 'a')
SELECT 'a' < 'A' COLLATE "en_US.UTF-8";    -- depends on OS
```

:::tip

For case-insensitive queries, prefer `ILIKE` or `LOWER(col)` over relying on collation:

```plsql
SELECT * FROM users WHERE email ILIKE 'alice@example.com';
```
:::

## Converting Between Types

```plsql
-- Casting between character types:
'hello'::char(10)          -- 'hello     ' (padded to 10)
'hello'::varchar(10)       -- 'hello'
'hello'::text              -- 'hello'

-- VARCHAR to CHAR adds padding
'ab'::varchar(5)::char(10)  -- 'ab       ' (8 trailing spaces)

-- CHAR to VARCHAR removes padding
'abc  '::char(5)::varchar(5)  -- 'abc' (trailing spaces removed?)
```

Trailing space handling during conversion can be surprising:

```plsql
SELECT 'abc   '::char(10) = 'abc';        -- TRUE (CHAR comparison)
SELECT 'abc   '::varchar(10) = 'abc';     -- FALSE (VARCHAR comparison)
```

## Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **CHAR(n) padding is visible** | When displayed, CHAR pads output — application code may need to trim |
| 2 | **CHAR(n) vs VARCHAR(n) comparison** | CHAR ignores trailing spaces, VARCHAR does not — can cause unexpected mismatches |
| 3 | **No performance difference** | Unlike MySQL/Oracle, CHAR is not faster than VARCHAR in PostgreSQL |
| 4 | **VARCHAR without n = TEXT** | `VARCHAR` with no length is an alias for `TEXT` — no constraint enforced |
| 5 | **Length is in characters, not bytes** | Multibyte UTF-8 characters count as 1 toward the limit |
| 6 | **Changing VARCHAR(n) rewrites table** | `ALTER TABLE ... ALTER COLUMN ... TYPE VARCHAR(new_n)` may rewrite the entire table |
| 7 | **Index on long text** | Indexing TEXT columns requires a hash index or a prefix (expression index on `LEFT(col, N)`) |
| 8 | **TOAST may hide large values** | Very large TEXT values are stored out-of-line — `SELECT *` may be slow but individual access is fast |

## Cross-Reference

| Topic | Description | Link |
|-------|-------------|------|
| Boolean Type | TRUE/FALSE/NULL, three-valued logic | [Boolean](./001-boolean.md) |
| Numeric Types | INTEGER, NUMERIC, SERIAL, floating-point | [Numeric](./003-numeric.md) |
| ENUM | Fixed set of string values, ordering, storage | [ENUM](./004-enum.md) |
| Operators | String operators (`||`, `LIKE`, `ILIKE`, regex) | [Operators](../../sql/003-Data-querying/005-operators.md) |
| WHERE | Filtering with string conditions | [WHERE](../../sql/003-Data-querying/002-where.md) |

## Cheat Sheet

```plsql
-- ==================== DECLARATION ====================
col CHAR(10)           -- fixed-length, blank-padded
col VARCHAR(100)       -- variable-length with limit
col TEXT               -- unlimited variable-length (recommended default)

-- ==================== LENGTH ====================
length(col)            -- character count (excluding CHAR padding)
octet_length(col)      -- byte count (for storage sizing)
char_length(col)       -- same as length()

-- ==================== CONSTRAINT ====================
col TEXT CHECK (length(col) <= 500)   -- enforced limit on TEXT

-- ==================== CASTING ====================
'hello'::char(10)      -- 'hello     '  (padded)
'hello'::varchar(10)   -- 'hello'       (no padding)
'ab  '::char(5)        -- 'ab   '      (padded to 5)

-- ==================== COMPARISON ====================
col LIKE 'prefix%'     -- case-sensitive pattern
col ILIKE '%suffix'    -- case-insensitive pattern
col ~ 'regex'          -- POSIX regex (case-sensitive)
col ~* 'regex'         -- POSIX regex (case-insensitive)

-- ==================== INDEX ====================
CREATE INDEX ON t (left(col, 100));    -- prefix index for long strings
CREATE INDEX ON t (col) WHERE length(col) < 256;  -- partial index
```
