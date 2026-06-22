# User-Defined Types — DOMAIN, ENUM, Composite

> PostgreSQL allows creating custom data types. DOMAIN constrains an existing type. ENUM defines a fixed set of string values. Composite types bundle multiple columns into one. These types become first-class citizens — usable as column types, function arguments, and in table definitions.

## CREATE DOMAIN — Constrained Type

A domain is an existing type plus optional constraints (CHECK, NOT NULL, DEFAULT). Unlike a table constraint, the domain constraint is **enforced everywhere** the domain is used.

### Syntax

```plsql
CREATE DOMAIN domain_name AS base_type
    [DEFAULT default_value]
    [NOT NULL]
    [CHECK (condition)];
```

### Examples

```plsql
-- Positive integer
CREATE DOMAIN positive_int AS INTEGER
    CHECK (VALUE > 0);

-- U.S. ZIP code (5 digits)
CREATE DOMAIN us_zip AS TEXT
    CHECK (VALUE ~ '^\d{5}$');

-- Email (basic format)
CREATE DOMAIN email_type AS TEXT
    CHECK (VALUE ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Non-empty string
CREATE DOMAIN non_empty_text AS TEXT NOT NULL
    CHECK (length(TRIM(VALUE)) > 0);

-- Percentage (0 to 100)
CREATE DOMAIN percentage AS NUMERIC(5, 2)
    DEFAULT 0
    CHECK (VALUE >= 0 AND VALUE <= 100);
```

### Usage

```plsql
CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price positive_int,           -- domain as column type
    tax_rate percentage DEFAULT 0, -- domain with default
    email email_type
);

INSERT INTO products (name, price) VALUES ('Widget', -5);
-- ERROR: value for domain positive_int violates check constraint "positive_int_check"

INSERT INTO products (name, price, email) VALUES ('Widget', 10, 'not-an-email');
-- ERROR: value for domain email_type violates check constraint "email_type_check"
```

### Domain Constraints Travel with the Value

```plsql
-- Domain constraint is enforced even in expressions:
SELECT -5::positive_int;  -- ERROR
```

### ALTER DOMAIN

```plsql
-- Rename
ALTER DOMAIN positive_int RENAME TO positive_integer;

-- Set default
ALTER DOMAIN positive_int SET DEFAULT 1;

-- Drop default
ALTER DOMAIN positive_int DROP DEFAULT;

-- Add NOT NULL
ALTER DOMAIN positive_int SET NOT NULL;

-- Drop NOT NULL
ALTER DOMAIN positive_int DROP NOT NULL;

-- Add CHECK constraint
ALTER DOMAIN positive_int ADD CONSTRAINT chk_positive
    CHECK (VALUE > 0);

-- Add CHECK with NOT VALID (skip existing data check)
ALTER DOMAIN positive_int ADD CONSTRAINT chk_positive
    CHECK (VALUE > 0) NOT VALID;

-- Drop CHECK constraint
ALTER DOMAIN positive_int DROP CONSTRAINT chk_positive;

-- Rename constraint
ALTER DOMAIN positive_int RENAME CONSTRAINT chk_positive TO chk_positive_val;
```

### Drop Domain

```plsql
DROP DOMAIN positive_int;                    -- fails if columns use it
DROP DOMAIN positive_int CASCADE;            -- drops dependent columns
DROP DOMAIN IF EXISTS positive_int CASCADE;  -- safe drop
```

### When to Use DOMAIN vs CHECK Constraint

| DOMAIN | CHECK on Column |
|--------|-----------------|
| Enforced everywhere the type is used | Enforced only on that column |
| Single definition, reusable | Must repeat for each column |
| Can be indexed as a type | No type-level index |
| Cannot be altered per column | Each column can have additional constraints |
| Good for: email, phone, ZIP, currency | Good for: one-off business rules |

## CREATE TYPE — ENUM

Defines a fixed set of string values stored compactly (4 bytes regardless of string length).

### Syntax

```plsql
CREATE TYPE order_status AS ENUM (
    'pending',
    'confirmed',
    'shipped',
    'delivered',
    'cancelled'
);
```

### Usage

```plsql
CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    status order_status DEFAULT 'pending',
    total NUMERIC(10, 2)
);

INSERT INTO orders (status) VALUES ('pending');     -- OK
INSERT INTO orders (status) VALUES ('unknown');     -- ERROR
INSERT INTO orders (status) VALUES ('PENDING');     -- ERROR (case-sensitive!)
```

### Ordering

ENUM values are ordered by their position in the definition, not alphabetically:

```plsql
SELECT 'pending'::order_status < 'shipped'::order_status;  -- TRUE
SELECT 'delivered'::order_status > 'cancelled'::order_status;  -- TRUE

-- ORDER BY uses definition order
SELECT status, COUNT(*)
FROM orders
GROUP BY status
ORDER BY status;
-- Order: pending, confirmed, shipped, delivered, cancelled
```

### ALTER TYPE — Add ENUM Value

```plsql
-- Add value at the end (no lock issues)
ALTER TYPE order_status ADD VALUE 'refunded';

-- Add before/after a specific value (requires an ACCESS EXCLUSIVE lock, PG 9.1+)
ALTER TYPE order_status ADD VALUE 'processing' BEFORE 'confirmed';
ALTER TYPE order_status ADD VALUE 'on_hold' AFTER 'shipped';
```

:::warning

Adding an ENUM value at the end (`ADD VALUE` without BEFORE/AFTER) does not require a table rewrite or heavy lock. Adding with BEFORE/AFTER takes ACCESS EXCLUSIVE — block reads and writes.

ENUM values cannot be removed or reordered — you must create a new type and migrate:

```plsql
-- Step 1: Create new enum
CREATE TYPE order_status_v2 AS ENUM ('pending', 'active', 'done');

-- Step 2: Migrate columns
ALTER TABLE orders ALTER COLUMN status TYPE order_status_v2
    USING status::text::order_status_v2;

-- Step 3: Drop old type
DROP TYPE order_status;
ALTER TYPE order_status_v2 RENAME TO order_status;
```
:::

### Rename ENUM Value or Type

```plsql
-- Rename type
ALTER TYPE order_status RENAME TO order_state;

-- Rename value (PostgreSQL 10+)
ALTER TYPE order_status RENAME VALUE 'pending' TO 'new_pending';
```

### ENUM Storage

ENUM values are stored as 4-byte integers internally, not as strings:

```plsql
SELECT status, pg_column_size(status) FROM orders LIMIT 1;
-- 'pending' → 4 bytes (regardless of string length)
```

### ENUM vs TEXT with CHECK

| ENUM | TEXT + CHECK |
|------|-------------|
| 4 bytes storage | Full string storage |
| Built-in ordering (definition order) | Alphabetical or no ordering |
| Hard to add/remove values | Easy to change constraints |
| Case-sensitive | Case-sensitive (use ILIKE for CI) |
| Cannot drop values | Just remove from CHECK |
| Good for: stable, small value sets | Good for: evolving value sets |

## CREATE TYPE — Composite

Bundles multiple fields into a single type. Useful for function return types and structured columns.

### Syntax

```plsql
CREATE TYPE address AS (
    street TEXT,
    city TEXT,
    state CHAR(2),
    zip us_zip               -- can use domains
);
```

### Usage as Column

```plsql
CREATE TABLE companies (
    id INTEGER PRIMARY KEY,
    name TEXT,
    location address          -- composite column
);

-- Insert full composite
INSERT INTO companies (name, location)
VALUES ('ACME', ROW('123 Main St', 'Springfield', 'IL', '62701'));

-- Access fields
SELECT (location).street, (location).city FROM companies;

-- Update field
UPDATE companies
SET location.street = '456 Oak Ave'
WHERE id = 1;

-- Unsupported in older PG versions — may need full replace:
UPDATE companies
SET location = ROW('456 Oak Ave', (location).city, (location).state, (location).zip)
WHERE id = 1;
```

### Usage with Functions

```plsql
-- Function returning composite
CREATE FUNCTION get_address(p_id INTEGER) RETURNS address AS $$
    SELECT location FROM companies WHERE id = p_id;
$$ LANGUAGE SQL;

SELECT get_address(1);         -- '(123 Main St,Springfield,IL,62701)'
SELECT (get_address(1)).city;  -- 'Springfield'
```

### ALTER TYPE for Composite

```plsql
-- Add field (PostgreSQL 9.1+)
ALTER TYPE address ADD ATTRIBUTE country TEXT;

-- Drop field
ALTER TYPE address DROP ATTRIBUTE zip CASCADE;

-- Rename field
ALTER TYPE address RENAME ATTRIBUTE street TO line1;

-- Change field type
ALTER TYPE address ALTER ATTRIBUTE state TYPE TEXT;
```

## CREATE TYPE — Range

Custom range types can be created from any existing type with a b-tree operator class:

```plsql
-- Built-in ranges: int4range, numrange, tsrange, tstzrange, daterange

-- Custom range from a domain
CREATE DOMAIN score AS INTEGER CHECK (VALUE >= 0 AND VALUE <= 100);
CREATE TYPE score_range AS RANGE (
    subtype = score
);
```

## Type Information

### Finding Existing Types

```plsql
-- All user-defined types
SELECT typname, typtype
FROM pg_type
WHERE typnamespace = 'public'::regnamespace;

-- typtype: d = domain, e = enum, c = composite, r = range, b = base

-- Enum values
SELECT enumlabel, enumsortorder
FROM pg_enum
JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
WHERE typname = 'order_status';

-- Domain details
SELECT domain_name, data_type, is_nullable, domain_default
FROM information_schema.domains
WHERE domain_schema = 'public';

-- Composite attributes
SELECT attribute_name, data_type
FROM information_schema.attributes
WHERE udt_name = 'address';
```

### DROP TYPE

```plsql
DROP TYPE address;                -- fails if in use
DROP TYPE address CASCADE;        -- drops dependent columns
DROP TYPE IF EXISTS address;     -- safe drop
DROP DOMAIN us_zip;               -- separate command for domains
```

## Type Conversion

```plsql
-- String to enum
'pending'::order_status;

-- Enum to string
status::text;

-- Row literal to composite
ROW('123 St', 'City', 'IL', '62701')::address;
('123 St', 'City', 'IL', '62701')::address;  -- shorthand

-- Cast table row to composite
SELECT companies::address FROM companies WHERE id = 1;
-- Converts the whole row to the composite type
```

## Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **ENUM values cannot be removed** | Must create new type, migrate columns, drop old — multi-step process |
| 2 | **ENUM is case-sensitive** | `'Pending' != 'pending'` — always use consistent casing |
| 3 | **DOMAIN CHECK cannot reference other columns** | Only the column value (VALUE) is available in the check expression |
| 4 | **ALTER DOMAIN with NOT VALID** | Adding CHECK with NOT VALID still requires a brief lock — only the scan is deferred |
| 5 | **Composite field access requires parentheses** | `(location).city` not `location.city` — the dot notation conflicts with table.column |
| 6 | **ENUM ordering is definition order** | Not alphabetical — can surprise application code |
| 7 | **ADD VALUE with BEFORE/AFTER locks** | Use plain `ADD VALUE` (appends at end) to avoid blocking |
| 8 | **DOMAIN constraints travel with data** | Even cast operations check the domain — `-1::positive_int` errors |
| 9 | **Cannot alter domain type** | To change the base type, drop and recreate the domain |
| 10 | **ENUM migration is DDL-heavy** | For frequently changing value sets, prefer a lookup table with FK |

## Cross-Reference

| Topic | Description | Link |
|-------|-------------|------|
| CREATE TABLE | Using custom types in table definitions | [Creation](./001-creation.md) |
| ALTER TABLE | Changing columns that use custom types | [ALTER TABLE](./003-alter-table.md) |
| Constraints | CHECK constraints (similar to DOMAIN checks) | [Constraints](./004-constraints.md) |
| Numeric Types | Built-in numeric types as domain bases | [Numeric](../../theory/types/003-numeric.md) |
| String Types | TEXT, VARCHAR as domain bases | [Strings](../../theory/types/002-strings.md) |
| ENUM Theory | When to use ENUM, vs lookup tables, migration | [ENUM](../../theory/types/004-enum.md) |

## Cheat Sheet

```plsql
-- ==================== DOMAIN ====================
CREATE DOMAIN name AS base_type
    [DEFAULT x] [NOT NULL] [CHECK (VALUE condition)];

ALTER DOMAIN name RENAME TO new_name;
ALTER DOMAIN name SET DEFAULT x;
ALTER DOMAIN name DROP DEFAULT;
ALTER DOMAIN name SET NOT NULL;
ALTER DOMAIN name DROP NOT NULL;
ALTER DOMAIN name ADD CONSTRAINT chk_name CHECK (VALUE condition);
ALTER DOMAIN name DROP CONSTRAINT chk_name;

DROP DOMAIN name [CASCADE];

-- ==================== ENUM ====================
CREATE TYPE name AS ENUM ('val1', 'val2', 'val3');
ALTER TYPE name ADD VALUE 'new_val';                -- append (no lock)
ALTER TYPE name ADD VALUE 'new_val' BEFORE 'val2';  -- insert (locks!)
ALTER TYPE name RENAME VALUE 'old' TO 'new';
ALTER TYPE name RENAME TO new_name;

-- ==================== COMPOSITE ====================
CREATE TYPE name AS (col1 TYPE1, col2 TYPE2);
ALTER TYPE name ADD ATTRIBUTE col TYPE;
ALTER TYPE name DROP ATTRIBUTE col [CASCADE];
ALTER TYPE name RENAME ATTRIBUTE col TO new_name;
ALTER TYPE name ALTER ATTRIBUTE col TYPE new_type;
DROP TYPE name [CASCADE];
```
