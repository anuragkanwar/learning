# Operators — Arithmetic, Comparison, Logical

> Operators are symbols that perform computations, comparisons, or logical tests on values. Used in SELECT expressions, WHERE conditions, JOIN predicates, and CASE statements. PostgreSQL supports the full SQL standard plus extensions.

## Arithmetic Operators

Used for numeric calculations in SELECT, WHERE, SET, and ON clauses.

```plsql
SELECT
    5 + 2  AS addition,       -- 7
    5 - 2  AS subtraction,    -- 3
    5 * 2  AS multiplication, -- 10
    5 / 2  AS division,       -- 2  (integer truncation!)
    5 / 2.0 AS division_float,-- 2.5
    5 % 2  AS modulo,         -- 1
    5 ^ 2  AS exponent;       -- 25 (power)
```

### Integer Division Truncation

When both operands are integers, division truncates toward zero:

```plsql
SELECT
    5 / 2,    -- 2
    -5 / 2,   -- -2
    5.0 / 2,  -- 2.5
    5 / 2.0;  -- 2.5
```

To force decimal division, cast one operand:

```plsql
SELECT
    5::numeric / 2,  -- 2.5000000000
    5 / 2::numeric,  -- 2.5000000000
    5 / 2.0;         -- 2.5 (implicit cast via literal)
```

### Modulo with Negative Numbers

PostgreSQL's `%` returns the remainder of the **truncated** division — the sign follows the dividend:

```plsql
SELECT
    7 % 3,    --  1
    -7 % 3,   -- -1  (sign follows dividend)
    7 % -3,   --  1
    -7 % -3;  -- -1
```

### Operator Precedence (Arithmetic)

Standard math rules apply. Use parentheses to be explicit:

| Level | Operators | Associativity |
|-------|-----------|---------------|
| 1 (highest) | `^` (power) | right-to-left |
| 2 | `*`, `/`, `%` | left-to-right |
| 3 | `+`, `-` | left-to-right |

```plsql
SELECT
    2 + 3 * 4,    -- 14  (multiply first)
    (2 + 3) * 4,  -- 20  (parentheses override)
    2 * 3 ^ 2,    -- 18  (power first: 3^2=9, 2*9=18)
    (2 * 3) ^ 2;  -- 36  (2*3=6, 6^2=36)
```

### Arithmetic with NULLs

Any arithmetic with NULL returns NULL:

```plsql
SELECT
    10 + NULL,  -- NULL
    NULL * 5,   -- NULL
    1 / NULL;   -- NULL (no division-by-zero error)
```

### Division by Zero

```plsql
SELECT 1 / 0;   -- ERROR: division by zero
SELECT 1 / NULL;-- NULL (no error, but NULL result)
```

Use `NULLIF` to guard against division by zero:

```plsql
SELECT
    100 / NULLIF(0, 0),  -- NULL instead of error
    100 / NULLIF(col, 0) AS safe_result
FROM t;
```

## Comparison Operators

Used in WHERE, HAVING, ON, and CHECK clauses. They return `TRUE`, `FALSE`, or `UNKNOWN` (NULL).

### Standard Comparisons

```plsql
SELECT *
FROM products
WHERE price = 100;       -- equal to
--  <>  -- not equal to
--  !=  -- not equal to (non-standard, but supported)

SELECT * FROM users WHERE age >= 18;   -- greater than or equal
--  >   -- greater than
--  <=  -- less than or equal
--  <   -- less than
```

:::tip

`<>` is the SQL standard for not-equal. `!=` works in PostgreSQL but avoid it if portability matters.
:::

### BETWEEN — Range Check

Inclusive on both ends:

```plsql
SELECT * FROM products
WHERE price BETWEEN 10 AND 50;
-- same as: price >= 10 AND price <= 50

SELECT * FROM orders
WHERE order_date BETWEEN '2025-01-01' AND '2025-01-31';

SELECT * FROM products
WHERE price NOT BETWEEN 10 AND 50;
-- same as: price < 10 OR price > 50
```

### IN — Set Membership

```plsql
SELECT * FROM users
WHERE status IN ('active', 'premium');

SELECT * FROM orders
WHERE id IN (SELECT order_id FROM order_items WHERE quantity > 5);

SELECT * FROM users
WHERE status NOT IN ('banned', 'deleted');
```

:::warning

`NOT IN` with a subquery that returns NULL makes the whole condition UNKNOWN (falsy). Always ensure the subquery excludes NULLs:

```plsql
-- BAD: if any value is NULL, returns no rows
SELECT * FROM users
WHERE id NOT IN (SELECT user_id FROM orders WHERE user_id IS NOT NULL);

-- GOOD: exclude NULLs explicitly
SELECT * FROM users
WHERE id NOT IN (SELECT user_id FROM orders WHERE user_id IS NOT NULL);
```

Better yet, use `NOT EXISTS` instead.
:::

### NULL Comparisons

NULL represents unknown — no value. Comparisons with NULL always return UNKNOWN, not TRUE or FALSE:

```plsql
SELECT * FROM users WHERE age = NULL;     -- WRONG: always FALSE
SELECT * FROM users WHERE age <> NULL;    -- WRONG: always FALSE
SELECT * FROM users WHERE age > NULL;     -- WRONG: always FALSE
```

Use the dedicated NULL operators:

```plsql
SELECT * FROM users WHERE age IS NULL;          -- TRUE if age is NULL
SELECT * FROM users WHERE age IS NOT NULL;      -- TRUE if age has a value
SELECT * FROM users WHERE age IS DISTINCT FROM 25;  -- treats NULL as comparable value
SELECT * FROM users WHERE age IS NOT DISTINCT FROM NULL;  -- same as IS NULL
```

:::info

`IS DISTINCT FROM` and `IS NOT DISTINCT FROM` treat NULL as a **comparable value** rather than unknown:

- `NULL IS DISTINCT FROM 25` → TRUE (NULL is not the same as 25)
- `NULL IS DISTINCT FROM NULL` → FALSE (equal when both are NULL)
- `25 IS NOT DISTINCT FROM 25` → TRUE
- `NULL IS NOT DISTINCT FROM NULL` → TRUE
:::

### LIKE / ILIKE — Pattern Matching

| Operator | Case-sensitive | Matches |
|----------|---------------|---------|
| `LIKE` | Yes | `%` any sequence, `_` single char |
| `ILIKE` | No (PG extension) | Same patterns, case-insensitive |
| `NOT LIKE` | Yes | Negation |
| `NOT ILIKE` | No | Negation |

```plsql
SELECT * FROM users
WHERE email LIKE '%@example.com';           -- ends with @example.com

SELECT * FROM users
WHERE username LIKE 'alice_';              -- alice + exactly one char

SELECT * FROM users
WHERE name ILIKE 'john%';                  -- case-insensitive: John, john, JOHN

SELECT * FROM users
WHERE email NOT LIKE '%@example.com';
```

Escape special characters:

```plsql
-- Find literal 100% discount
SELECT * FROM products
WHERE description LIKE '%100\%%' ESCAPE '\';

-- Using default escape (backslash)
SELECT * FROM products
WHERE description LIKE '%100^%' ESCAPE '^';  -- custom escape char
```

### SIMILAR TO — SQL Standard Regex (Rare)

Uses regex-like patterns (SQL standard). Less powerful than `~` operators:

```plsql
SELECT * FROM users
WHERE name SIMILAR TO 'A(lic|nth)ony';  -- matches "Alice" or "Anthony"
```

### POSIX Regex Operators

| Operator | Description |
|----------|-------------|
| `~` | Case-sensitive match |
| `~*` | Case-insensitive match |
| `!~` | Case-sensitive non-match |
| `!~*` | Case-insensitive non-match |

```plsql
SELECT * FROM users
WHERE email ~ '^[a-z]+@example\.com$';    -- regex match
WHERE email ~* '^[A-Z]+@EXAMPLE\.COM$';   -- same, case-insensitive
WHERE email !~ '^admin';                   -- does not start with admin
```

### String Comparison (Lexicographic)

Strings compare character by character using the database collation:

```plsql
SELECT * FROM users
WHERE username > 'm';                     -- lexicographic: names after 'm'

-- PostgreSQL default collation is case-sensitive:
-- 'Apple' < 'apple'  (uppercase sorts before lowercase in C locale)
```

To compare case-insensitively:

```plsql
SELECT * FROM users
WHERE LOWER(email) = LOWER('Alice@Example.Com');

-- Or use citext extension (case-insensitive text type):
CREATE EXTENSION IF NOT EXISTS citext;
SELECT * FROM users
WHERE email::citext = 'alice@example.com';
```

## Logical Operators

Used to combine conditions in WHERE, HAVING, ON, and CHECK. They use **three-valued logic** (TRUE, FALSE, UNKNOWN/NULL).

### AND — Both must be TRUE

| A | B | A AND B |
|---|---|---------|
| TRUE | TRUE | TRUE |
| TRUE | FALSE | FALSE |
| TRUE | NULL | NULL |
| FALSE | FALSE | FALSE |
| FALSE | NULL | FALSE |
| NULL | NULL | NULL |

```plsql
SELECT * FROM products
WHERE price > 10 AND stock > 0;           -- both conditions must hold

SELECT * FROM users
WHERE age >= 18 AND status = 'active';    -- common filter combination
```

### OR — At least one must be TRUE

| A | B | A OR B |
|---|---|--------|
| TRUE | TRUE | TRUE |
| TRUE | FALSE | TRUE |
| TRUE | NULL | TRUE |
| FALSE | FALSE | FALSE |
| FALSE | NULL | NULL |
| NULL | NULL | NULL |

```plsql
SELECT * FROM users
WHERE status = 'premium' OR status = 'vip';

SELECT * FROM products
WHERE price < 20 OR stock > 100;          -- cheap OR well-stocked
```

### NOT — Negation

| A | NOT A |
|---|-------|
| TRUE | FALSE |
| FALSE | TRUE |
| NULL | NULL |

```plsql
SELECT * FROM users
WHERE NOT status = 'banned';

SELECT * FROM products
WHERE NOT (price < 10 OR stock = 0);      -- not cheap and not out of stock
-- same as: price >= 10 AND stock > 0
```

### Short-Circuit Evaluation

PostgreSQL evaluates logical expressions left-to-right and stops as soon as the result is determined:

```plsql
-- If status = 'active' is FALSE, PostgreSQL does NOT check the second condition
SELECT * FROM users
WHERE status = 'active' AND some_expensive_function(id);

-- Safe: the division only runs when the first condition is TRUE
SELECT * FROM products
WHERE price > 0 AND expensive_col / price > 10;
```

### IS TRUE / IS FALSE / IS UNKNOWN — Explicit Null-safe Checks

These treat NULL as a distinct logical value instead of propagating it:

```plsql
SELECT * FROM users
WHERE age >= 18 IS NOT TRUE;   -- age < 18 OR age IS NULL

SELECT * FROM offers
WHERE discount > 0 IS TRUE;    -- discount > 0 AND discount IS NOT NULL

SELECT * FROM offers
WHERE discount > 0 IS FALSE;   -- discount <= 0 (discount IS NULL included)
```

| Expression | Result for NULL age |
|-----------|-------------------|
| `age > 18` | NULL |
| `age > 18 IS TRUE` | FALSE |
| `age > 18 IS FALSE` | FALSE |
| `age > 18 IS UNKNOWN` | TRUE |
| `age > 18 IS NOT TRUE` | TRUE |

## String Concatenation

Used to join text values. PostgreSQL offers an operator and two functions — they differ in NULL handling.

### || Operator (PostgreSQL)

```plsql
SELECT 'Hello' || ' ' || 'World';   -- 'Hello World'
SELECT first_name || ' ' || last_name AS full_name FROM users;

-- With non-string types (auto-cast)
SELECT 'Order #' || id FROM orders;  -- 'Order #42'

-- Numbers
SELECT 100 || ' items';             -- '100 items'
```

:::warning

`||` with NULL returns NULL (unlike CONCAT):

```plsql
SELECT 'Hello' || NULL || 'World';  -- NULL (not 'HelloWorld')
-- Use COALESCE to guard:
SELECT 'Hello' || COALESCE(middle_name, '') || ' ' || last_name FROM users;
```
:::

### CONCAT — Variadic, NULL-safe

`CONCAT` ignores NULL arguments instead of propagating them:

```plsql
SELECT CONCAT('Hello', NULL, 'World');     -- 'HelloWorld'
SELECT CONCAT(first_name, ' ', last_name)  -- works even if one is NULL
FROM users;
-- If first_name = 'Alice' and last_name = NULL → 'Alice ' (no NULL crash)

-- Multiple arguments
SELECT CONCAT(a, b, c, d) FROM t;          -- joins all non-null values
```

### CONCAT_WS — Concat with Separator

`CONCAT_WS` (Concat With Separator) joins values with a separator. Skips NULLs automatically:

```plsql
SELECT CONCAT_WS(', ', 'Alice', 'Bob', NULL, 'Dave');
-- 'Alice, Bob, Dave'  (NULL skipped, no trailing comma)

-- Building a full address
SELECT CONCAT_WS(', ',
    address_line1,
    city,
    state,
    zip
) AS full_address
FROM users;
-- If city is NULL, address_line1 and state are joined directly
```

:::info

`CONCAT_WS` does **not** skip empty strings (`''`), only NULLs:

```plsql
SELECT CONCAT_WS(', ', 'a', '', NULL, 'b');  -- 'a, , b'
-- Empty string stays, NULL is skipped
```
:::

### Comparison

| Feature | `||` | `CONCAT` | `CONCAT_WS` |
|---------|------|----------|-------------|
| NULL handling | NULL propagates | NULL ignored | NULL ignored |
| Separator | Manual | Manual | First argument = separator |
| Arguments | 2 at a time | Multiple | Multiple |
| Type | Operator | Function | Function |
| Non-string types | Auto-cast | Auto-cast | Auto-cast |

```plsql
-- Building a full name — three approaches:
SELECT first_name || ' ' || last_name;           -- NULL if either is NULL
SELECT CONCAT(first_name, ' ', last_name);        -- NULLs skipped, extra space if one is NULL
SELECT CONCAT_WS(' ', first_name, last_name);     -- NULLs skipped, no extra space
```

## Operator Precedence (Full)

From highest to lowest:

| Level | Operators | Notes |
|-------|-----------|-------|
| 1 | `.` (table.column) | |
| 2 | `::` (type cast) | |
| 3 | `^` (power) | right-to-left |
| 4 | `*`, `/`, `%` | |
| 5 | `+`, `-`, `\|\|` (arithmetic, string concat) | |
| 6 | `IS`, `ISNULL`, `NOTNULL`, `IS DISTINCT FROM` | |
| 7 | `IN`, `BETWEEN`, `LIKE`, `ILIKE`, `~`, `~*`, `!~`, `!~*`, `SIMILAR` | |
| 8 | `=` (comparison), `<>`, `!=`, `<`, `>`, `<=`, `>=` | |
| 9 | `NOT` | |
| 10 | `AND` | |
| 11 (lowest) | `OR` | |

```plsql
-- Precedence example:
SELECT * FROM users
WHERE status = 'active' OR status = 'premium' AND age >= 18;
-- AND binds tighter: status = 'premium' AND age >= 18 is evaluated first
-- Then: status = 'active' OR (premium AND age >= 18)

-- Use parentheses for clarity:
WHERE (status = 'active' OR status = 'premium') AND age >= 18;
```

## Cross-Reference

| Topic | Description | Link |
|-------|-------------|------|
| SELECT Basics | Expressions, aliases, LIMIT/OFFSET | [SELECT Basics](./001-select-basics.md) |
| ORDER BY | Sorting with expressions | [ORDER BY](./003-order-by.md) |
| WHERE | Filtering with operators | [WHERE](./002-where.md) |
| LIMIT / OFFSET | Pagination after sorting | [LIMIT / OFFSET](./006-limit-offset.md) |
| GROUP BY / HAVING | Aggregation with filtering | [GROUP BY / HAVING](./007-group-by.md) |
| Boolean Type | Theory: boolean storage, literals, three-valued logic | [Boolean](../../theory/types/001-boolean.md) |
| String Types | Theory: CHAR, VARCHAR, TEXT storage and behavior | [Strings](../../theory/types/002-strings.md) |
| Numeric Types | Theory: INTEGER, NUMERIC, SERIAL, floating-point | [Numeric](../../theory/types/003-numeric.md) |

## Cheat Sheet

```plsql
-- ==================== ARITHMETIC ====================
5 + 2    -- addition
5 - 2    -- subtraction
5 * 2    -- multiplication
5 / 2    -- integer division (truncates)
5.0 / 2  -- decimal division
5 % 2    -- modulo
5 ^ 2    -- exponent (power)
NULLIF(col, 0) -- guard against division by zero

-- ==================== COMPARISON ====================
=  <>  !=  <  >  <=  >=           -- standard comparisons
BETWEEN x AND y                    -- inclusive range
NOT BETWEEN x AND y                -- outside range
IN (1, 2, 3)                       -- set membership
NOT IN (1, 2, 3)                   -- excluded from set
IS NULL                            -- null check
IS NOT NULL                        -- not null
IS DISTINCT FROM                   -- null-safe comparison
IS NOT DISTINCT FROM               -- null-safe equality
LIKE '%pattern%'                   -- case-sensitive pattern
ILIKE '%pattern%'                  -- case-insensitive pattern
~ '[a-z]+'                         -- POSIX regex (case-sensitive)
~* '[a-z]+'                        -- POSIX regex (case-insensitive)

-- ==================== STRING CONCATENATION ====================
'Hello' || ' ' || 'World'            -- || operator (NULL propagates)
CONCAT('Hello', NULL, 'World')       -- CONCAT (NULL ignored)
CONCAT_WS(', ', 'a', NULL, 'b')      -- CONCAT_WS (with separator, NULL ignored)

-- ==================== LOGICAL ====================
AND    -- both must be true
OR     -- at least one true
NOT    -- negation
IS TRUE       -- null-safe truth check
IS FALSE      -- null-safe false check
IS UNKNOWN    -- null-safe null check
IS NOT TRUE   -- null-safe non-truth
```
