# ALTER TABLE — Modifying Table Structure

> DDL command that changes the structure of an existing table. PostgreSQL supports most ALTER TABLE operations without full table rewrites, but some operations (like changing column types) require rewriting all rows.

## Overview

```plsql
ALTER TABLE table_name action;
```

Multiple actions can be combined in a single statement (PostgreSQL-specific):

```plsql
ALTER TABLE users
    ADD COLUMN age INTEGER,
    ALTER COLUMN email SET NOT NULL,
    DROP COLUMN old_column;
```

Running multiple operations in one statement is faster and uses fewer locks than separate statements.

## Column Operations

### ADD COLUMN

```plsql
-- Simple add
ALTER TABLE users ADD COLUMN age INTEGER;

-- With default and constraint
ALTER TABLE users ADD COLUMN bio TEXT DEFAULT '' NOT NULL;

-- With CHECK constraint
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'banned'));
```

:::warning

Adding a column with a `DEFAULT` that is not a simple constant or expression-level default used to require a full table rewrite in older PostgreSQL versions. Since PostgreSQL 11, adding a column with a non-volatile DEFAULT is metadata-only:

```plsql
-- Fast (metadata only, PG 11+):
ALTER TABLE users ADD COLUMN flags INTEGER DEFAULT 0;

-- Still requires rewrite (volatile default):
ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
-- NOW() is evaluated for each row at read time — no rewrite needed
-- But a volatile default like gen_random_uuid() for each existing row... actually
-- In PG 13+, ADD COLUMN with DEFAULT no longer rewrites for simple expressions
```
:::

### DROP COLUMN

```plsql
-- Drop single column
ALTER TABLE users DROP COLUMN obsolete_column;

-- Drop with CASCADE (also drops dependent objects like FK references)
ALTER TABLE users DROP COLUMN old_id CASCADE;

-- IF EXISTS (no error if column missing)
ALTER TABLE users DROP COLUMN IF EXISTS maybe_column;
```

:::info

PostgreSQL does not physically remove the column data immediately — it just marks it as dropped. The space is reclaimed when the table is vacuumed. Column removal from the physical storage only happens during a full table rewrite (VACUUM FULL or CLUSTER).
:::

### RENAME COLUMN

```plsql
ALTER TABLE users RENAME COLUMN username TO login;
```

### ALTER COLUMN — Type Changes

```plsql
-- Change type (requires compatible data or USING clause)
ALTER TABLE users ALTER COLUMN age TYPE SMALLINT;

:::warning

Casting between incompatible types fails with a hint:

```plsql
ALTER TABLE users ALTER COLUMN age TYPE INTEGER;
-- ERROR:  column "age" cannot be cast automatically to type integer
-- HINT:  Specify a USING expression to perform the conversion.
```

PostgreSQL will not guess the conversion — you must provide a USING expression:

```plsql
-- Fix: use USING with explicit cast
ALTER TABLE users ALTER COLUMN age TYPE INTEGER
    USING age::integer;

-- Or with COALESCE to handle NULLs
ALTER TABLE users ALTER COLUMN age TYPE INTEGER
    USING NULLIF(TRIM(age), '')::integer;
```
:::

-- With USING clause for custom conversion
ALTER TABLE users ALTER COLUMN status TYPE INTEGER
    USING CASE status
        WHEN 'active' THEN 1
        WHEN 'inactive' THEN 2
        WHEN 'banned' THEN 3
        ELSE 0
    END;

-- With USING for text to boolean
ALTER TABLE users ALTER COLUMN is_active TYPE BOOLEAN
    USING is_active = 'yes';
```

**Table rewrite behavior for type changes:**

| Operation | Rewrites table? | Notes |
|-----------|----------------|-------|
| `INTEGER → BIGINT` | Yes | Different storage size |
| `VARCHAR(50) → VARCHAR(100)` | No | Widening constraint only |
| `VARCHAR(100) → VARCHAR(50)` | Yes | May fail if existing data exceeds 50 |
| `INTEGER → TEXT` | Yes | Different internal format |
| `TEXT → VARCHAR(N)` | Yes | Requires validation |
| `NUMERIC(10,2) → NUMERIC(12,3)` | No | Both precision and scale increase |
| `NUMERIC(12,3) → NUMERIC(10,2)` | Yes | Shrinking — may fail |

```plsql
-- Check if a type change rewrites the table
-- Set log_statement to 'ddl' and watch for "rewriting" in logs

-- Estimate rewrite cost:
EXPLAIN ALTER TABLE users ALTER COLUMN age TYPE BIGINT;
-- "Rewriting" appears in the plan
```

### ALTER COLUMN — Default Values

```plsql
-- Set default (only affects future inserts)
ALTER TABLE users ALTER COLUMN age SET DEFAULT 18;

-- Drop default
ALTER TABLE users ALTER COLUMN age DROP DEFAULT;
```

### ALTER COLUMN — NULL / NOT NULL

```plsql
-- Require NOT NULL (validates existing data!)
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- Allow NULL
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
```

:::warning

`SET NOT NULL` scans the table to validate that no NULLs exist. On a large table, this can take time and briefly block writes:

```plsql
-- This fails if any row has NULL email:
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
-- ERROR: column "email" contains null values

-- Fix NULLs first:
UPDATE users SET email = '' WHERE email IS NULL;
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
```
:::

### ALTER COLUMN — SET STATISTICS

Controls how much data PostgreSQL samples for query planning:

```plsql
-- Increase statistics target for better query plans
ALTER TABLE users ALTER COLUMN email SET STATISTICS 1000;

-- Reset to default
ALTER TABLE users ALTER COLUMN email SET STATISTICS -1;
```

### ALTER COLUMN — Storage

Controls TOAST strategy:

```plsql
ALTER TABLE articles ALTER COLUMN body SET STORAGE EXTERNAL;
-- Options: PLAIN, EXTERNAL, EXTENDED, MAIN
```

## Constraint Operations

### ADD CONSTRAINT

```plsql
-- Primary Key
ALTER TABLE users ADD PRIMARY KEY (id);

-- Foreign Key
ALTER TABLE orders ADD CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES users (id);

-- Foreign Key with CASCADE
ALTER TABLE orders ADD CONSTRAINT fk_orders_user_cascade
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE;

-- UNIQUE
ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email);

-- CHECK
ALTER TABLE users ADD CONSTRAINT chk_users_age
    CHECK (age >= 0 AND age <= 150);

-- NOT NULL (syntax variation)
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
```

### DROP CONSTRAINT

```plsql
-- Drop by constraint name
ALTER TABLE users DROP CONSTRAINT uq_users_email;

-- Drop with CASCADE
ALTER TABLE users DROP CONSTRAINT fk_orders_user CASCADE;

-- Drop PRIMARY KEY
ALTER TABLE users DROP CONSTRAINT users_pkey;

-- Drop NOT NULL (not a named constraint)
ALTER TABLE users ALTER COLUMN username DROP NOT NULL;
```

:::tip

To find constraint names, query `pg_constraint`:

```plsql
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'users'::regclass;
-- contype: p = primary key, f = foreign key, u = unique, c = check
```
:::

### VALIDATE CONSTRAINT

Skip validation for existing data when adding a CHECK or FK constraint (useful for zero-downtime migrations):

```plsql
-- Step 1: Add constraint as NOT VALID (no existing data check)
ALTER TABLE users ADD CONSTRAINT chk_users_age
    CHECK (age >= 0 AND age <= 150)
    NOT VALID;

-- Step 2: Validate existing data later (holds only SHARE UPDATE EXCLUSIVE lock)
ALTER TABLE users VALIDATE CONSTRAINT chk_users_age;
```

This avoids blocking writes during the validation scan.

### RENAME TABLE

```plsql
ALTER TABLE users RENAME TO members;
```

Effect of renaming a table:

| Aspect | Impact |
|--------|--------|
| **Indexes** | Renamed automatically |
| **Constraints** | Renamed automatically |
| **Sequences** | Owned sequences are NOT renamed |
| **Foreign Keys** | Other tables referencing this table auto-update their internal catalog reference |
| **Views** | Views referencing the old name **break** — must be recreated |
| **Functions** | Function bodies referencing the old name **break** |
| **Application code** | All queries using the old table name must be updated |

### RENAME COLUMN

```plsql
ALTER TABLE users RENAME COLUMN username TO login;
```

Effect of renaming a column:

| Aspect | Impact |
|--------|--------|
| **Indexes** | Renamed automatically |
| **Constraints** | Constraint definitions auto-update |
| **Views / Functions** | **Break** if they reference the old column name |
| **Application code** | Must be updated |
| **Default values** | Stay with the column |

:::warning

RENAME is metadata-only — no table rewrite, very fast. But it breaks any views, functions, or application code referencing the old name. Always check dependencies first:

```plsql
-- Find objects that depend on the table/column
SELECT * FROM pg_depend
WHERE refobjid = 'users'::regclass;

-- Find views using the table
SELECT viewname, definition
FROM pg_views
WHERE definition ILIKE '%users%';
```
:::

## Storage and Tablespace

### SET TABLESPACE

Move table to a different tablespace:

```plsql
ALTER TABLE users SET TABLESPACE fast_ssd;
```

### SET WITH OPTIONS

```plsql
-- Disable TOAST compression for a table
ALTER TABLE articles SET (toast_tuple_target = 8162);

-- Reset storage parameter to default
ALTER TABLE users RESET (fillfactor);
```

## Partition Operations

```plsql
-- Attach existing table as partition
ALTER TABLE measurements ATTACH PARTITION measurements_2025_01
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Detach partition
ALTER TABLE measurements DETACH PARTITION measurements_2025_01;

-- Detach without dropping (keeps as standalone table)
ALTER TABLE measurements DETACH PARTITION measurements_2025_01 CONCURRENTLY;
```

## Ownership and Schema

```plsql
-- Change owner
ALTER TABLE users OWNER TO app_admin;

-- Move to different schema
ALTER TABLE users SET SCHEMA app_schema;
```

## ENABLE / DISABLE Triggers and Rules

```plsql
-- Disable all triggers
ALTER TABLE users DISABLE TRIGGER ALL;

-- Enable specific trigger
ALTER TABLE users ENABLE TRIGGER audit_trigger;

-- Disable row-level security
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

## Performance & Locking

### Lock Strength by Operation

| Operation | Lock | Blocks reads? | Blocks writes? |
|-----------|------|---------------|----------------|
| `ADD COLUMN` (no default) | `ACCESS EXCLUSIVE` | Yes | Yes |
| `ADD COLUMN` (with default) | `ACCESS EXCLUSIVE` | Yes | Yes |
| `DROP COLUMN` | `ACCESS EXCLUSIVE` | Yes | Yes |
| `SET DEFAULT` / `DROP DEFAULT` | `ACCESS EXCLUSIVE` | Yes | Yes |
| `SET NOT NULL` | `ACCESS EXCLUSIVE` | Yes | Yes |
| `DROP NOT NULL` | `ACCESS EXCLUSIVE` | Yes | Yes |
| `ALTER TYPE` (rewrite) | `ACCESS EXCLUSIVE` | Yes | Yes |
| `ALTER TYPE` (no rewrite) | `ACCESS EXCLUSIVE` | Yes | Yes |
| `ADD CONSTRAINT` (CHECK) | `SHARE ROW EXCLUSIVE` | No | Yes (blocks writes) |
| `ADD CONSTRAINT` (FK) | `SHARE ROW EXCLUSIVE` | No | Yes |
| `VALIDATE CONSTRAINT` | `SHARE UPDATE EXCLUSIVE` | No | No |
| `RENAME COLUMN` | `ACCESS EXCLUSIVE` | Yes | Yes |
| `SET STATISTICS` | `ACCESS EXCLUSIVE` | Yes | Yes |
| `SET TABLESPACE` | `ACCESS EXCLUSIVE` | Yes | Yes |

:::warning

Most ALTER TABLE operations take an `ACCESS EXCLUSIVE` lock, which blocks both reads and writes. For large tables, this can cause downtime:

```plsql
-- Run in a transaction to minimize lock duration
BEGIN;
-- Fast operation here
ALTER TABLE users ADD COLUMN temp_flag BOOLEAN DEFAULT FALSE;
COMMIT;

-- Instead of:
-- Long-running operation here
ALTER TABLE users ALTER COLUMN email TYPE TEXT;
-- This rewrites the table while holding ACCESS EXCLUSIVE
```
:::

### Zero-Downtime Patterns

```plsql
-- 1. NOT VALID + VALIDATE (for CHECK/FK)
ALTER TABLE users ADD CONSTRAINT chk_age CHECK (age > 0) NOT VALID;
-- No validation scan — quick
ALTER TABLE users VALIDATE CONSTRAINT chk_age;
-- Validation scan — but only SHARE UPDATE EXCLUSIVE lock

-- 2. Add column as nullable, then set NOT NULL
ALTER TABLE users ADD COLUMN email_verified BOOLEAN;
UPDATE users SET email_verified = FALSE;
-- Long update in batches, not blocking reads
ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;
-- Fast (metadata) + validation scan with ACCESS EXCLUSIVE

-- 3. Type change via new column + swap (for large tables)
ALTER TABLE users ADD COLUMN email_new TEXT;
UPDATE users SET email_new = email;  -- batch this
ALTER TABLE users DROP COLUMN email;
ALTER TABLE users RENAME COLUMN email_new TO email;
```

## Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **ACCESS EXCLUSIVE lock** | Most ALTER TABLE operations block reads and writes — plan for downtime on large tables |
| 2 | **Table rewrite on type change** | Changing column types may rewrite the entire table, taking significant time and disk space |
| 3 | **DROP COLUMN does not free space** | Column is only marked as dropped — use VACUUM FULL or CLUSTER to reclaim space |
| 4 | **SET NOT NULL scans the table** | Fails immediately if any NULL exists — check before running |
| 5 | **Adding CHECK validates all rows** | For large tables, use NOT VALID + VALIDATE CONSTRAINT to reduce lock duration |
| 6 | **RENAME COLUMN breaks views** | Views, functions, and application code referencing the old column name will fail |
| 7 | **Multiple ALTER in one transaction** | Each statement takes ACCESS EXCLUSIVE — combine into one ALTER TABLE for fewer lock acquisitions |
| 8 | **DEFAULT with volatile functions** | `DEFAULT random()` evaluates once at table creation, not on each insert |
| 9 | **SERIAL column cannot be added directly** | Must use `ALTER TABLE ... ADD COLUMN ... SERIAL` which creates a sequence — but SERIAL is syntactic sugar, better to use `INTEGER GENERATED AS IDENTITY` |
| 10 | **ALTER TABLE on parent cascades** | Changes to a parent table in an inheritance hierarchy cascade to child tables |

## Cross-Reference

| Topic | Description | Link |
|-------|-------------|------|
| CREATE TABLE | Table creation syntax | [Creation](./001-creation.md) |
| PK / FK | Primary and foreign key syntax | [PK/FK](./002-primary-foreign-keys.md) |
| Constraints | All constraint types, naming, deferrable | [Constraints](./004-constraints.md) |
| User-Defined Types | CREATE DOMAIN, ENUM, composite types | [User-Defined Types](./005-user-defined-types.md) |
| Boolean Type | BOOLEAN column considerations | [Boolean](../../theory/types/001-boolean.md) |
| Numeric Types | INTEGER, NUMERIC, SERIAL choices | [Numeric](../../theory/types/003-numeric.md) |
| String Types | CHAR, VARCHAR, TEXT storage | [Strings](../../theory/types/002-strings.md) |

## Cheat Sheet

```plsql
-- ==================== COLUMNS ====================
ALTER TABLE t ADD COLUMN col TYPE;              -- add column
ALTER TABLE t ADD COLUMN col TYPE DEFAULT x;    -- add with default
ALTER TABLE t DROP COLUMN col;                  -- drop column
ALTER TABLE t DROP COLUMN IF EXISTS col;        -- safe drop
ALTER TABLE t RENAME COLUMN old TO new;         -- rename column

-- ==================== TYPE CHANGES ====================
ALTER TABLE t ALTER COLUMN col TYPE new_type;   -- change type
ALTER TABLE t ALTER COLUMN col TYPE new_type
    USING expr;                                 -- custom conversion

-- ==================== DEFAULTS & NULL ====================
ALTER TABLE t ALTER COLUMN col SET DEFAULT x;   -- set default
ALTER TABLE t ALTER COLUMN col DROP DEFAULT;    -- remove default
ALTER TABLE t ALTER COLUMN col SET NOT NULL;    -- add NOT NULL
ALTER TABLE t ALTER COLUMN col DROP NOT NULL;   -- allow NULL

-- ==================== CONSTRAINTS ====================
ALTER TABLE t ADD CONSTRAINT name PRIMARY KEY (col);
ALTER TABLE t ADD CONSTRAINT name UNIQUE (col);
ALTER TABLE t ADD CONSTRAINT name FOREIGN KEY (col) REFERENCES ref(c);
ALTER TABLE t ADD CONSTRAINT name CHECK (condition);
ALTER TABLE t ADD CONSTRAINT name CHECK (cond) NOT VALID;  -- skip scan
ALTER TABLE t VALIDATE CONSTRAINT name;                    -- validate later
ALTER TABLE t DROP CONSTRAINT name;                        -- drop constraint

-- ==================== TABLE LEVEL ====================
ALTER TABLE t RENAME TO new_name;               -- rename table
ALTER TABLE t SET SCHEMA schema_name;           -- move to schema
ALTER TABLE t SET TABLESPACE ts_name;           -- move tablespace
ALTER TABLE t OWNER TO new_owner;               -- change owner
```
