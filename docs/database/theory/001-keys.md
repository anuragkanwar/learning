# Keys in the Relational Model

:::note

Keys uniquely identify rows (entities) and link rows across tables (relationships). Without keys, there is no relational database.
:::

## Key Type Hierarchy

```
All unique column combinations → Superkeys
  └── Minimal superkeys → Candidate Keys
       └── The one you pick → Primary Key
       └── The ones you don't → Alternate Keys (UNIQUE constraints)
```

| Key Type | Uniqueness | Nullable | Scope |
|----------|-----------|----------|-------|
| **Superkey** | ✅ Unique | ❌ (contraindicated) | Any set of columns unique across rows |
| **Candidate Key** | ✅ Unique | ❌ (by design) | Minimal superkey — no column can be removed |
| **Primary Key (PK)** | ✅ Unique | ❌ NEVER (mandated) | One per table |
| **Alternate Key** | ✅ Unique | ✅ (depends) | As many as needed, enforced via `UNIQUE` |
| **Foreign Key (FK)** | ❌ Duplicates ok | ✅ Allowed | As many as needed, references PK/UNIQUE |
| **Composite Key** | Depends on type | Depends on type | Any key type with 2+ columns |

**Example: `users(id, email, username, full_name)`**
- Superkeys: `{id}`, `{email}`, `{username}`, `{id, email}` (redundant), etc.
- Candidate keys: `{id}`, `{email}`, `{username}` (each is minimal)
- PK (designer's choice): `{id}`
- Alternate keys: `{email}`, `{username}`

**Entity Integrity Rule:** No PK column can be NULL. Every row must be identifiable.

**Referential Integrity Rule:** Every non-NULL FK value must match an existing PK value in the referenced table.

## Primary Key Rules

| Rule | Detail |
|------|--------|
| NOT NULL | Implicit — every row must have a PK value |
| UNIQUE | Implicit — no two rows share the same PK |
| Immutable | PK values should **never** change (breaks all references) |
| Exactly one per table | Though it can span multiple columns (composite PK) |

### Surrogate vs Natural PK

| Aspect | Surrogate | Natural |
|--------|-----------|---------|
| Source | Auto-generated (`SERIAL`, `UUID`) | Real-world data (SSN, email, ISBN) |
| Stability | ✅ Never changes | ❌ Can change |
| Storage | 4–16 bytes | Varies, possibly large |
| Guideline | **Prefer surrogate** as PK | Enforce natural keys with `UNIQUE` |

## Composite Primary Key

PK made of 2+ columns. No single column is unique, but their **combination** is.

**When to use:**
- **Junction tables** (M:N): `enrollments(student_id, course_id)` — a student takes a course once
- **Weak entities**: `order_items(order_id, line_number)` — line items numbered per order
- **Versioned data**: `product_pricing(product_id, effective_date)` — one price per product per date

:::tip

Single-column PK = street address (short). Composite PK = GPS `(lat, lng)` — neither alone identifies a point, but together they do. Remove either coordinate and you lose the location.
:::

**Design considerations:**
- Column order affects index performance (high-selectivity first)
- Composite PKs inflate FK references — every child table must include all columns
- All columns must be stable (immutable)

## Foreign Key

Column(s) referencing a PK (or UNIQUE) in another table. Enforces referential integrity.

| Rule | Detail |
|------|--------|
| Can be NULL | NULL FK = no relationship (optional) |
| Duplicates allowed | Many children can reference the same parent |
| No dangling references | Every non-NULL FK must exist in the parent |
| References PK or UNIQUE | Target column must have a uniqueness constraint |

### Referential Actions

| Action | ON DELETE (parent deleted) | ON UPDATE (parent PK changed) |
|--------|---------------------------|------------------------------|
| **NO ACTION** (default) | ❌ Raises error (checked at transaction end) | ❌ Raises error |
| **RESTRICT** | ❌ Raises error (checked immediately) | ❌ Raises error |
| **CASCADE** | 🔄 Deletes child rows | 🔄 Propagates new PK to child FKs |
| **SET NULL** | 🔄 Sets child FK to NULL | 🔄 Sets child FK to NULL |
| **SET DEFAULT** | 🔄 Sets child FK to DEFAULT | 🔄 Sets child FK to DEFAULT |

:::info

`NO ACTION` vs `RESTRICT`: Practically identical unless using deferred constraints. RESTRICT checks immediately within the same statement; NO ACTION waits until the end of the transaction.
:::

## Composite Foreign Key

FK made of 2+ columns referencing a composite PK (or composite UNIQUE).

**Requirements:** Same column count, compatible data types, same column order, referenced target must be unique.

**Pattern:** `variant_inventory(product_id, variant_code)` → `product_variants(product_id, variant_code)`

Joining requires matching ALL columns:
```sql
ON pv.product_id = vi.product_id AND pv.variant_code = vi.variant_code
```

:::warning

If ANY column in a composite FK is NULL, the entire FK is treated as NULL — no referential check is performed. Partial NULLs bypass the foreign key constraint entirely.
:::

## Key Design Anti-Patterns

| Anti-Pattern | Why |
|-------------|-----|
| Nullable column as PK | PKs cannot be NULL by definition |
| Mutable natural key as PK | Changing it breaks all referencing FKs |
| Wide composite PK | Every FK reference includes all columns — bloated indexes |
| Inconsistent FK naming | Use `<table>_id` everywhere (e.g., `user_id`, not `uid` in one table and `usr_id` in another) |
| FK without index | Every FK JOIN does a sequential scan — **always index FKs** |

## Naming Conventions

| Object | Convention | Example |
|--------|-----------|---------|
| Single-column PK | `id` | `users.id` |
| Composite PK constraint | `pk_<table>` | `pk_order_items` |
| FK column | `<referenced_table>_id` | `user_id`, `product_id` |
| FK constraint | `fk_<child>_<parent>` | `fk_orders_users` |
| Alternate key | `uq_<table>_<column>` | `uq_users_email` |
| Check constraint | `chk_<table>_<desc>` | `chk_products_positive_price` |

## Quick Rules

```text
1. PK = NOT NULL + UNIQUE (both implicit)
2. PK: exactly one per table
3. FK: can be NULL, can be duplicated
4. FK: every non-NULL value must exist in referenced PK/UNIQUE
5. Composite FK: column count, types, and order must match the referenced PK
6. PK values should never change (immutability principle)
```
