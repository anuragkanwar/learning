# Constraints — Data Integrity Rules

> Rules enforced at the database level to ensure data integrity. PostgreSQL supports six constraint types. Constraints can be defined inline (with the column) or out-of-line (table-level or via ALTER TABLE).

## Constraint Types

| Type | Purpose | Keyword |
|------|---------|---------|
| **NOT NULL** | Column cannot store NULL | `NOT NULL` |
| **UNIQUE** | All values in column(s) must be distinct | `UNIQUE` |
| **PRIMARY KEY** | Unique row identifier (implies NOT NULL + UNIQUE) | `PRIMARY KEY` |
| **FOREIGN KEY** | Value must exist in another table's column | `REFERENCES` / `FOREIGN KEY` |
| **CHECK** | Column value must satisfy a boolean expression | `CHECK` |
| **EXCLUDE** | No two rows satisfy a given condition | `EXCLUDE` |

## Where to Define Constraints

### 1. Inline — with the Column Definition

Only for single-column constraints (NOT NULL, UNIQUE, PK, CHECK, REFERENCES):

```plsql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,                          -- inline PK
    email TEXT NOT NULL UNIQUE,                       -- inline NOT NULL + UNIQUE
    age INTEGER CHECK (age >= 0),                    -- inline CHECK
    role TEXT REFERENCES roles(name),                 -- inline FK (REFERENCES)
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);
```

### 2. Table-Level — Separate Clause

Required for composite constraints (multi-column PK, FK, UNIQUE). Allows naming:

```plsql
CREATE TABLE orders (
    id INTEGER,
    user_id INTEGER NOT NULL,
    order_date DATE NOT NULL,
    status TEXT,
    CONSTRAINT pk_orders PRIMARY KEY (id),
    CONSTRAINT uq_orders_unique UNIQUE (order_date, status),
    CONSTRAINT fk_orders_users FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT chk_orders_status CHECK (status IN ('pending', 'shipped', 'delivered'))
);
```

### 3. Via ALTER TABLE — After Table Creation

```plsql
ALTER TABLE orders ADD PRIMARY KEY (id);
ALTER TABLE orders ADD CONSTRAINT fk_orders_users
    FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE orders ADD CONSTRAINT chk_status
    CHECK (status IN ('pending', 'shipped'));
```

## NOT NULL — Mandatory Column

```plsql
-- Inline only (NOT NULL cannot be a table-level constraint)
CREATE TABLE users (
    email TEXT NOT NULL,
    username TEXT NOT NULL
);

-- Add NOT NULL to existing column
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- Remove NOT NULL
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
```

:::warning

`SET NOT NULL` scans the table to validate no NULLs exist. Fails immediately if any NULL is found:

```plsql
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
-- ERROR:  column "email" contains null values
```
:::

## UNIQUE — No Duplicates

```plsql
-- Single column (inline)
CREATE TABLE users (email TEXT UNIQUE);

-- Single column (table-level, named)
CREATE TABLE users (email TEXT,
    CONSTRAINT uq_users_email UNIQUE (email));

-- Multiple columns (composite unique)
CREATE TABLE memberships (
    user_id INTEGER,
    group_id INTEGER,
    CONSTRAINT uq_membership UNIQUE (user_id, group_id)
);

-- Add to existing table
ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email);
```

### UNIQUE and NULLs

PostgreSQL allows multiple NULLs in a UNIQUE column (SQL standard allows this):

```plsql
CREATE TABLE users (email TEXT UNIQUE);
INSERT INTO users (email) VALUES (NULL);  -- OK
INSERT INTO users (email) VALUES (NULL);  -- OK (multiple NULLs allowed)
```

### Partial UNIQUE Index

Standard UNIQUE treats all NULLs as distinct. Use a partial unique index to treat NULLs as duplicates:

```plsql
-- Allow only one row with is_primary = TRUE per user
CREATE UNIQUE INDEX uq_user_primary_phone
ON phones (user_id) WHERE is_primary = TRUE;
```

## PRIMARY KEY — Row Identifier

```plsql
-- Single column (inline or table-level)
CREATE TABLE users (id INTEGER PRIMARY KEY, ...);

-- Composite PK (table-level only)
CREATE TABLE order_items (
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    PRIMARY KEY (order_id, product_id)
);

-- Add to existing table
ALTER TABLE users ADD PRIMARY KEY (id);

-- Drop PK
ALTER TABLE users DROP CONSTRAINT users_pkey;
```

:::info

PRIMARY KEY is syntactic sugar: it creates a NOT NULL constraint + a UNIQUE constraint + an index. Each table can have at most one PK.

```plsql
-- These two are equivalent:
CREATE TABLE t (id INTEGER PRIMARY KEY);
CREATE TABLE t (id INTEGER NOT NULL UNIQUE);
```
:::

## FOREIGN KEY — Referential Integrity

Covered in detail in [002-primary-foreign-keys.md](./002-primary-foreign-keys.md).

```plsql
-- Inline (single column only)
CREATE TABLE orders (
    user_id INTEGER REFERENCES users(id)
);

-- Table-level (supports composite)
CREATE TABLE orders (
    user_id INTEGER,
    CONSTRAINT fk_orders_users
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);

-- Add to existing table
ALTER TABLE orders ADD CONSTRAINT fk_orders_users
    FOREIGN KEY (user_id) REFERENCES users(id);

-- Composite FK
ALTER TABLE order_items ADD CONSTRAINT fk_items_products
    FOREIGN KEY (product_id, variant_id)
    REFERENCES products(id, variant_id);
```

### Referential Actions

| Action | Behavior on DELETE/UPDATE |
|--------|--------------------------|
| `NO ACTION` (default) | Reject if referenced rows exist (deferred) |
| `RESTRICT` | Reject immediately (not deferrable) |
| `CASCADE` | Delete/update referencing rows |
| `SET NULL` | Set FK to NULL |
| `SET DEFAULT` | Set FK to its default value |

### Self-Referencing FK

```plsql
CREATE TABLE employees (
    id INTEGER PRIMARY KEY,
    name TEXT,
    manager_id INTEGER REFERENCES employees(id)
);
```

## CHECK — Custom Validation

```plsql
-- Inline
CREATE TABLE users (
    age INTEGER CHECK (age >= 0 AND age <= 150)
);

-- Named table-level
CREATE TABLE products (
    price NUMERIC(10, 2),
    CONSTRAINT chk_positive_price CHECK (price > 0)
);

-- Multi-column CHECK
CREATE TABLE orders (
    shipped_date DATE,
    delivered_date DATE,
    CONSTRAINT chk_dates CHECK (delivered_date >= shipped_date)
);

-- Add to existing table
ALTER TABLE products ADD CONSTRAINT chk_price CHECK (price > 0);
```

### CHECK with Multiple Conditions

```plsql
CREATE TABLE users (
    role TEXT,
    is_admin BOOLEAN,
    CONSTRAINT chk_admin_role CHECK (
        NOT (is_admin AND role NOT IN ('admin', 'superadmin'))
    )
);

-- Using IN with CHECK
CREATE TABLE orders (
    status TEXT CHECK (status IN ('pending', 'shipped', 'delivered', 'cancelled'))
);
```

### NOT VALID + VALIDATE (Zero-Downtime)

For large tables, skip the validation scan on add, then validate later:

```plsql
-- Step 1: add constraint without checking existing rows (fast, no scan)
ALTER TABLE orders ADD CONSTRAINT chk_status
    CHECK (status IN ('pending', 'shipped'))
    NOT VALID;

-- Step 2: validate existing rows later (SHARE UPDATE EXCLUSIVE lock)
ALTER TABLE orders VALIDATE CONSTRAINT chk_status;
```

## EXCLUDE — Exclusion Constraints

Ensures no two rows satisfy a given condition. Uses GiST or SP-GiST indexes:

```plsql
-- No overlapping date ranges for the same room
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE bookings (
    room_id INTEGER,
    during TSRANGE,
    EXCLUDE USING GIST (room_id WITH =, during WITH &&)
);

-- This inserts:
INSERT INTO bookings VALUES (1, '[2025-01-01, 2025-01-10)');

-- This conflicts:
INSERT INTO bookings VALUES (1, '[2025-01-05, 2025-01-15)');
-- ERROR: conflicting key value violates exclusion constraint
```

Common EXCLUDE operators:

| Operator | Meaning | Example |
|----------|---------|---------|
| `=` | Equal | Same room |
| `&&` | Overlaps | Overlapping time ranges |
| `@>` | Contains | Range contains point |

## Naming Conventions

### Auto-Generated Names

PostgreSQL generates names if not specified:

```plsql
CREATE TABLE users (id INTEGER PRIMARY KEY);
-- Constraint name: users_pkey

CREATE TABLE users (email TEXT UNIQUE);
-- Constraint name: users_email_key

ALTER TABLE users ADD CHECK (age > 0);
-- Constraint name: users_age_check
```

| Constraint | Auto-name pattern |
|------------|-------------------|
| PRIMARY KEY | `{table}_pkey` |
| UNIQUE | `{table}_{column}_key` |
| FOREIGN KEY | `{table}_{column}_fkey` |
| CHECK | `{table}_{column}_check` |
| NOT NULL | No name (not a named constraint) |

### Custom Naming

Best practice — always name your constraints:

```plsql
CONSTRAINT pk_users PRIMARY KEY (id)
CONSTRAINT uq_users_email UNIQUE (email)
CONSTRAINT fk_orders_users FOREIGN KEY (user_id) REFERENCES users(id)
CONSTRAINT chk_users_age CHECK (age >= 0)
```

## Deferrable Constraints

Constraints can be checked at the end of the transaction instead of after each statement:

```plsql
-- Create a deferrable FK
ALTER TABLE orders ADD CONSTRAINT fk_orders_users
    FOREIGN KEY (user_id) REFERENCES users(id)
    DEFERRABLE INITIALLY DEFERRED;

-- Or: INITIALLY IMMEDIATE (default, check after each statement)
-- Or: DEFERRABLE INITIALLY DEFERRED (check at commit)
```

```plsql
-- Usage:
BEGIN;
INSERT INTO orders (user_id, amount) VALUES (999, 100);
-- No error yet — constraint is deferred
INSERT INTO users (id) VALUES (999);
COMMIT;
-- Both succeed because the FK is satisfied at commit time
```

| Setting | Behavior |
|---------|----------|
| `NOT DEFERRABLE` (default) | Always immediate, cannot be changed |
| `DEFERRABLE INITIALLY IMMEDIATE` | Immediate by default, can be deferred |
| `DEFERRABLE INITIALLY DEFERRED` | Deferred by default, checked at commit |

```plsql
-- Toggle deferrability in a transaction
SET CONSTRAINTS fk_orders_users DEFERRED;
```

:::info

Only UNIQUE, PRIMARY KEY, FOREIGN KEY, and EXCLUDE constraints can be deferrable. NOT NULL and CHECK cannot.
:::

## Dropping Constraints

```plsql
-- Drop by name
ALTER TABLE users DROP CONSTRAINT uq_users_email;

-- Drop with CASCADE (also drops dependent objects)
ALTER TABLE users DROP CONSTRAINT fk_orders_users CASCADE;

-- Drop PRIMARY KEY
ALTER TABLE users DROP CONSTRAINT users_pkey;

-- Drop NOT NULL (not named)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
```

To find constraint names:

```plsql
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'users'::regclass;
-- contype: p = PK, f = FK, u = UNIQUE, c = CHECK, x = EXCLUDE
```

## Constraint and Index Relationship

| Constraint | Creates Index? | Index Type |
|------------|---------------|------------|
| PRIMARY KEY | Yes | Unique B-tree |
| UNIQUE | Yes | Unique B-tree |
| FOREIGN KEY | **No** (but should have one) | — |
| CHECK | No | — |
| NOT NULL | No | — |
| EXCLUDE | Yes | GiST or SP-GiST |

:::tip

FOREIGN KEY does **not** create an index. Always add one manually to avoid table scans on joins:

```plsql
CREATE INDEX idx_orders_user_id ON orders(user_id);
```
:::

## Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **NOT NULL is not a named constraint** | Cannot be dropped by name, use `ALTER COLUMN ... DROP NOT NULL` |
| 2 | **CHECK is row-level only** | Cannot reference other tables or use subqueries |
| 3 | **FK does not create an index** | Can cause slow deletes/updates on the parent table |
| 4 | **Multiple NULLs in UNIQUE** | PostgreSQL allows multiple NULLs — use partial index if you need single NULL |
| 5 | **ALTER TABLE ... ADD CONSTRAINT locks** | Most constraint additions take ACCESS EXCLUSIVE lock |
| 6 | **NOT VALID still blocks** | Adding a NOT VALID constraint still takes a lock — only the validation scan is deferred |
| 7 | **CHECK with volatile functions** | `CHECK (NOW() > col)` is evaluated per row, but volatile functions can lead to inconsistent results |
| 8 | **Deferrable constraints are slower** | Additional bookkeeping at commit time |
| 9 | **Renaming a table does not rename constraints** | The auto-generated name contains the old table name |
| 10 | **Composite PK creates composite index** | Queries on only the second column of a composite PK cannot use the index efficiently |

## Cross-Reference

| Topic | Description | Link |
|-------|-------------|------|
| CREATE TABLE | Table creation, column constraints | [Creation](./001-creation.md) |
| PK / FK | Primary and foreign key deep dive | [PK/FK](./002-primary-foreign-keys.md) |
| ALTER TABLE | Add/drop constraints on existing tables | [ALTER TABLE](./003-alter-table.md) |
| Keys Theory | Superkey, candidate key, referential actions | [Keys](../../theory/001-keys.md) |
| User-Defined Types | CREATE DOMAIN, ENUM, composite types | [User-Defined Types](./005-user-defined-types.md) |

## Cheat Sheet

```plsql
-- ==================== CREATE TABLE CONSTRAINTS ====================
col INTEGER PRIMARY KEY                  -- inline PK
col TEXT NOT NULL                         -- inline NOT NULL
col TEXT UNIQUE                           -- inline UNIQUE
col INT REFERENCES parent(id)            -- inline FK
col INT CHECK (col > 0)                  -- inline CHECK
CONSTRAINT name PRIMARY KEY (a, b)       -- table-level composite PK
CONSTRAINT name UNIQUE (a, b)            -- table-level composite UNIQUE
CONSTRAINT name FOREIGN KEY (a) REFERENCES t(b)  -- table-level FK
CONSTRAINT name CHECK (condition)        -- table-level CHECK

-- ==================== ALTER TABLE CONSTRAINTS ====================
ALTER TABLE t ADD PRIMARY KEY (col);
ALTER TABLE t ADD CONSTRAINT name UNIQUE (col);
ALTER TABLE t ADD CONSTRAINT name FOREIGN KEY (col) REFERENCES t2(col);
ALTER TABLE t ADD CONSTRAINT name CHECK (condition);
ALTER TABLE t ADD CONSTRAINT name CHECK (cond) NOT VALID;
ALTER TABLE t VALIDATE CONSTRAINT name;

-- ==================== DROP CONSTRAINTS ====================
ALTER TABLE t DROP CONSTRAINT name;
ALTER TABLE t ALTER COLUMN col DROP NOT NULL;

-- ==================== DEFERRABLE ====================
ALTER TABLE t ADD CONSTRAINT name FOREIGN KEY (col)
    REFERENCES t2(col) DEFERRABLE INITIALLY DEFERRED;

-- ==================== EXCLUDE ====================
CREATE TABLE t (
    id INTEGER,
    period TSRANGE,
    EXCLUDE USING GIST (id WITH =, period WITH &&)
);
```
