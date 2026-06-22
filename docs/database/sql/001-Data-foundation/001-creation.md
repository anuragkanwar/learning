# Data Foundation — Creation Commands

:::note

DDL (Data Definition Language) commands define the schema — databases, tables, constraints. They auto-commit immediately in PostgreSQL.
:::

## SQL Families

| Family | Purpose | Commands | Auto-Commit |
|--------|---------|----------|-------------|
| **DDL** | Define structure | `CREATE`, `ALTER`, `DROP`, `TRUNCATE` | Yes |
| **DML** | Manage row data | `INSERT`, `UPDATE`, `DELETE` | No (needs `COMMIT`) |
| **DQL** | Fetch data | `SELECT` | N/A |
| **DCL** | Control access | `GRANT`, `REVOKE` | Yes |
| **TCL/DTL** | Manage transactions | `COMMIT`, `ROLLBACK`, `SAVEPOINT` | N/A |

**Memory hook:** DDL = Defines structure (auto-saves). DML = Manipulates data (needs explicit save).

## Notation Rules

- `[ ]` — Optional: `[IF NOT EXISTS]`
- `|` — OR: `VARCHAR(50) | TEXT`
- `{ }` — Required, pick one: `{INTEGER | BIGINT}`
- `< >` — Placeholder, replace me: `<table_name>`
- `...` — Repeatable: `col1 TYPE, col2 TYPE, ...`

## CREATE DATABASE

Top-level container. Owns schemas, tables, functions, everything.

```plsql
CREATE DATABASE <database_name>
  [WITH]
  [OWNER [=] <user_name>]
  [TEMPLATE [=] <template_name>]
  [ENCODING [=] <encoding>]
  [STRATEGY [=] {WAL_COPY | FILE_COPY}]
  [LOCALE [=] <locale>]
  [LC_COLLATE [=] <locale>]
  [LC_CTYPE [=] <locale>]
  [TABLESPACE [=] <tablespace_name>]
  [ALLOW_CONNECTIONS [=] {true | false}]
  [CONNECTION LIMIT [=] <num>]
  [IS_TEMPLATE [=] {true | false}];
```

### Key Parameters

| Parameter | Default | What it controls |
|-----------|---------|-----------------|
| `OWNER` | Current user | Who owns the database |
| `TEMPLATE` | `template1` | Clones an existing database (use `template0` for clean encoding) |
| `ENCODING` | From template | Character set (`UTF8`, `LATIN1`) |
| `STRATEGY` | `WAL_COPY` (PG15+) | `WAL_COPY` faster, `FILE_COPY` less WAL |
| `LOCALE` / `LC_COLLATE` / `LC_CTYPE` | From template | Sorting rules, character classification |
| `TABLESPACE` | Default | Where on disk data lives |
| `ALLOW_CONNECTIONS` | `true` | Can users connect? |
| `CONNECTION LIMIT` | `-1` (unlimited) | Max concurrent connections |
| `IS_TEMPLATE` | `false` | Can this DB be used as a template? |

:::warning

`ENCODING`, `LC_COLLATE`, `LC_CTYPE` cannot be changed after creation. Choose carefully before creating a database.
:::

### Gotchas

1. Encoding is permanent — changing it requires dump & recreate
2. `LC_COLLATE`/`LC_CTYPE` affect `ORDER BY` and `ILIKE` permanently
3. `template1` is the default; `template0` is pristine (allows encoding changes)
4. `STRATEGY=WAL_COPY` (PG15+) avoids I/O spikes on the source
5. Requires superuser or `CREATEDB` privilege

### Examples

```plsql
-- Minimal
CREATE DATABASE shop;

-- Production: UTF8, custom owner, connection limit
CREATE DATABASE ecommerce
  WITH OWNER = app_admin
  ENCODING = 'UTF8'
  LC_COLLATE = 'en_US.UTF-8'
  LC_CTYPE = 'en_US.UTF-8'
  CONNECTION LIMIT = 100
  TABLESPACE = fast_ssd;

-- Clone from template
CREATE DATABASE ecommerce_test
  WITH TEMPLATE = prod_template OWNER = test_admin;

-- Idempotent (suppresses error if exists)
CREATE DATABASE IF NOT EXISTS analytics;
```

## DROP DATABASE

```plsql
DROP DATABASE [IF EXISTS] <database_name>;
DROP DATABASE <database_name> WITH (FORCE);  -- PG13+, terminates connections
```

:::danger

Superuser/owner only. Drops everything — schemas, tables, data, functions. Cannot be rolled back.
:::

## CREATE TABLE

Structured collection of rows and columns. Each column has a name, data type, and optional constraints.

### Full Syntax

```plsql
CREATE [ { TEMPORARY | TEMP } | UNLOGGED ] TABLE [IF NOT EXISTS] <table_name> (
  <column_name>  <data_type>  [COLLATE <collation>]  [<column_constraint> [...]]
  [, <column_name> <data_type> [COLLATE <collation>] [<column_constraint> [...]]]
  [, <table_constraint>]
  [, ...]
)
[INHERITS (<parent_table> [, ...])]
[PARTITION BY { RANGE | LIST | HASH } (<column> [, ...])]
[TABLESPACE <tablespace_name>]
[ON COMMIT { PRESERVE ROWS | DELETE ROWS | DROP }]       -- for TEMP tables
[WITH ( <storage_parameter> [= <value>] [, ...] )];
```

### Column Constraints

| Constraint | Purpose | Example |
|-----------|---------|---------|
| `NOT NULL` | Column must have a value | `email TEXT NOT NULL` |
| `UNIQUE` | All values must be distinct | `username VARCHAR(50) UNIQUE` |
| `PRIMARY KEY` | `NOT NULL` + `UNIQUE` — row identifier | `id SERIAL PRIMARY KEY` |
| `REFERENCES` / `FOREIGN KEY` | Value must exist in another table | `user_id INT REFERENCES users(id)` |
| `CHECK` | Value must satisfy a condition | `price NUMERIC CHECK (price > 0)` |
| `DEFAULT` | Default value if none provided | `created_at TIMESTAMPTZ DEFAULT NOW()` |

### Table-Level Constraints

```plsql
UNIQUE (col_a, col_b)
PRIMARY KEY (col_a, col_b)
CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
CONSTRAINT chk_positive_quantity CHECK (quantity > 0)
```

### Complete E-Commerce Schema

```plsql
CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  username    VARCHAR(50) NOT NULL UNIQUE,
  email       VARCHAR(255) NOT NULL,
  full_name   VARCHAR(100) NOT NULL,
  age         INT CHECK (age >= 13),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  stock_qty   INT NOT NULL DEFAULT 0,
  CONSTRAINT chk_positive_price CHECK (price > 0),
  CONSTRAINT chk_non_negative_stock CHECK (stock_qty >= 0)
);

CREATE TABLE orders (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id    INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity      INT NOT NULL CHECK (quantity > 0),
  total_price   NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
  order_date    TIMESTAMPTZ DEFAULT NOW(),
  status        VARCHAR(20) DEFAULT 'pending'
                CHECK (status IN ('pending', 'shipped', 'delivered', 'cancelled'))
);
```

### Advanced Table Features

#### A. CTAS — Create Table As Select

Creates a table from a query result. Copies column names & types, **does NOT copy constraints**.

```plsql
-- Create and fill
CREATE TABLE active_users AS
SELECT id, username, email, created_at FROM users WHERE is_active = TRUE;

-- Structure only (no rows)
CREATE TABLE active_users_structure AS
SELECT id, username, email, created_at FROM users WHERE is_active = TRUE
WITH NO DATA;
```

#### B. Temporary Tables

Session-local, dies when session ends. Two connections can have same-named temp tables without conflict.

```plsql
CREATE TEMP TABLE temp_cart (product_id INT, quantity INT);

-- With ON COMMIT behavior
CREATE TEMP TABLE temp_report (id INT, total NUMERIC) ON COMMIT DELETE ROWS;
```

| `ON COMMIT` | Behavior |
|-------------|----------|
| `PRESERVE ROWS` | Rows stay (default) |
| `DELETE ROWS` | Rows cleared at commit |
| `DROP` | Table dropped at commit |

#### C. UNLOGGED Tables

WAL is skipped — ~10x faster writes, but **data lost on crash**. Good for ephemeral/cache data.

```plsql
CREATE UNLOGGED TABLE session_log (event TEXT, ts TIMESTAMPTZ DEFAULT NOW());
```

#### D. Table Inheritance (PostgreSQL-specific)

Child inherits all columns + constraints from parent. Querying parent includes child rows.

```plsql
CREATE TABLE payment (id SERIAL PRIMARY KEY, amount NUMERIC(10,2) NOT NULL, paid_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE credit_card_payment (card_last4 CHAR(4) NOT NULL) INHERITS (payment);
SELECT * FROM payment;  -- includes credit_card_payment rows
```

:::warning

Inheritance does NOT enforce uniqueness globally — two child tables can have the same `id`. For true partitioning, use `PARTITION BY` (PG10+).
:::

#### E. Storage Parameters

```plsql
CREATE TABLE large_audit_log (
  id BIGSERIAL, event_data JSONB, created_at TIMESTAMPTZ DEFAULT NOW()
) WITH (
  fillfactor = 70,            -- leave 30% free space per page for HOT updates
  autovacuum_enabled = false   -- use with caution
);
```

| Parameter | Default | What it does |
|-----------|---------|-------------|
| `fillfactor` | 100 | % of page to fill. Lower = more room for in-place updates |
| `autovacuum_enabled` | true | Enable/disable auto-vacuum |
| `toast_tuple_target` | ~2KB | Min size before large values are compressed to TOAST |
| `parallel_workers` | 0 | Override parallel scan workers |

### CREATE TABLE Gotchas

1. **`NOT NULL` vs `CHECK (col IS NOT NULL)`** — identical in PostgreSQL
2. **`SERIAL` is shorthand** for `INTEGER` + auto-created sequence. Prefer `GENERATED AS IDENTITY` (PG10+):
   ```plsql
   id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
   ```
3. **`IF NOT EXISTS` checks name only** — if same name exists with different columns, skip is silent
4. **`ON DELETE` options:**
   - `CASCADE` — deletes children
   - `RESTRICT` / `NO ACTION` — prevents delete if children exist
   - `SET NULL` — sets child FK to NULL
   - `SET DEFAULT` — sets child FK to default
5. **Constraint names must be unique per schema**, not per table
6. **Circular FK refs** need a workaround: create one table without FK, then `ALTER TABLE` to add

## DROP TABLE

Removes a table and its data permanently. DDL — auto-commits (though PostgreSQL DDL is transactional).

```plsql
DROP TABLE [IF EXISTS] <table_name> [, <table_name> ...] [CASCADE | RESTRICT];
```

| Clause | Purpose |
|--------|---------|
| `IF EXISTS` | Suppresses error if table doesn't exist |
| `, ...` | Drop multiple tables in one statement |
| `CASCADE` | Drops table + all dependent objects (views, FKs, etc.) |
| `RESTRICT` (default) | Refuses if any object depends on the table |

### CASCADE vs RESTRICT

RESTRICT checks for dependent objects: FKs in other tables referencing this table, views, materialized views, functions, triggers, inheritance children.

**CASCADE drops the entire dependent tables**, not just the FK constraints. If `orders` references `users`, then `DROP TABLE users CASCADE` drops both `users` AND `orders`.

**Safer alternative** — drop the FK first, then drop the table:
```plsql
ALTER TABLE orders DROP CONSTRAINT fk_orders_users;
DROP TABLE users;   -- succeeds without CASCADE, orders table survives
```

### DROP vs TRUNCATE vs DELETE

| Operation | Removes Data | Removes Structure | Can Rollback (PG) | Speed |
|-----------|-------------|-------------------|-------------------|-------|
| `DELETE FROM t` | Yes | No | Yes | Slow (row-by-row) |
| `TRUNCATE t` | Yes | No | Yes | Fast (deallocates pages) |
| `DROP TABLE t` | Yes | Yes | Yes | Instant (catalog update) |

### Behind the Scenes

```text
1. Acquire ACCESS EXCLUSIVE lock on the table
2. Check dependencies (unless CASCADE)
3. Remove entries from pg_class, pg_attribute, pg_constraint
4. Drop associated indexes (including PK index)
5. Drop associated sequences (e.g., SERIAL columns)
6. Mark disk pages as free space
```

### Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **CASCADE deletes whole tables, not just constraints** | `DROP TABLE parent CASCADE` drops child tables entirely |
| 2 | **ACCESS EXCLUSIVE lock** | Blocks all reads and writes on the table |
| 3 | **Cannot drop table with pending transactions** | Waits or fails if another session uses the table |
| 4 | **Views referencing the table break** | Querying them returns "relation does not exist" |
| 5 | **Dropping a partitioned table drops all partitions** | Automatic — all child partitions go with it |
| 6 | **Inheritance parent needs CASCADE** | Drop children first or use `CASCADE` |

## CREATE TABLE Execution Order

```text
1. Check privileges        → Does user have CREATE on schema?
2. Check name collision    → Does table already exist?
3. Allocate OID            → Assign unique object ID
4. Create pg_class entry   → Record table metadata
5. Create pg_attribute     → Record each column's metadata
6. Create constraints      → pg_constraint entries + backing indexes (PK/UNIQUE)
7. Allocate disk pages     → Write initial data (for CTAS etc.)
```

:::info

PostgreSQL DDL is transactional — you can `ROLLBACK` a `CREATE TABLE`. This is unlike MySQL and most other databases where DDL auto-commits immediately.
:::

## Cross-Reference

| SQL Command | Related Theory | File |
|------------|---------------|------|
| `CREATE DATABASE` | Database architecture, ACID isolation | `theory/001-keys.md` |
| `CREATE TABLE` | Relational model, Tuple/Attribute/Relation | `theory/001-keys.md` |
| Constraints | Entity/Referential/Domain integrity | `theory/001-keys.md` |
| `SERIAL` / `IDENTITY` | Surrogate vs Natural keys | `theory/001-keys.md` |
| `INHERITS` | Specialization / Generalization | `theory/001-keys.md` |
| `DROP TABLE` | Dependencies, CASCADE behavior | `theory/001-keys.md` |
| `ALTER TABLE` | Modifying table structure | [ALTER TABLE](./003-alter-table.md) |
| Constraints | All constraint types, naming, deferrable | [Constraints](./004-constraints.md) |
| User-Defined Types | CREATE DOMAIN, ENUM, composite, range types | [User-Defined Types](./005-user-defined-types.md) |

## Cheat Sheet

```plsql
-- ==================== CREATE DATABASE ====================
CREATE DATABASE db_name [WITH OWNER = user] [ENCODING = 'UTF8'] [CONNECTION LIMIT = N];
DROP DATABASE db_name [IF EXISTS] [WITH (FORCE)];

-- ==================== CREATE TABLE ====================
-- Basic
CREATE TABLE tbl (col TYPE [CONSTRAINT]);

-- All constraint types
CREATE TABLE tbl (
  id     SERIAL PRIMARY KEY,
  email  VARCHAR(255) NOT NULL UNIQUE,
  ref_id INT REFERENCES other_tbl(id) ON DELETE CASCADE,
  price  NUMERIC CHECK (price > 0),
  status VARCHAR(10) DEFAULT 'active',
  CONSTRAINT uq_combo UNIQUE (col_a, col_b),
  CONSTRAINT fk_combo FOREIGN KEY (a,b) REFERENCES other(x,y)
);

-- Advanced variants
CREATE TEMP TABLE ...;                           -- session-scoped
CREATE UNLOGGED TABLE ...;                       -- faster, no WAL
CREATE TABLE ... AS SELECT ...;                  -- CTAS: create from query
CREATE TABLE ... INHERITS (parent);              -- table inheritance
CREATE TABLE ... PARTITION BY RANGE (col);       -- partitioned table
CREATE TABLE ... WITH (fillfactor = 70);         -- storage tuning

-- ==================== DROP TABLE ====================
DROP TABLE t;                                    -- single table
DROP TABLE t1, t2;                               -- multiple tables
DROP TABLE IF EXISTS t;                          -- idempotent
DROP TABLE t CASCADE;                            -- drops dependents
DROP TABLE t RESTRICT;                           -- refuses if dependents exist (default)

-- Safer: drop FK first, then table
ALTER TABLE child DROP CONSTRAINT fk_child_parent;
DROP TABLE parent;
```
