---
sidebar_position: 2
title: "11.2 Query Methods"
---

# 11.2 Query Methods (Derived Queries)

## The Magic of Method Names

Spring Data parses method names and generates SQL automatically.

```java
public interface UserRepository extends JpaRepository<User, Long> {
    
    // Spring generates: SELECT * FROM users WHERE email = ?
    List<User> findByEmail(String email);
    
    // Spring generates: SELECT * FROM users WHERE active = true
    List<User> findByActiveTrue();
    
    // Spring generates: SELECT * FROM users WHERE age > ?
    List<User> findByAgeGreaterThan(int age);
}
```

---

## Method Naming Conventions

### Prefix (Action)

| Prefix | Result Type | Description |
|--------|-------------|-------------|
| `findBy` | `List<Entity>` | Find all matching |
| `findOneBy` | `Optional<Entity>` | Find single (or first) |
| `countBy` | `long` | Count matches |
| `existsBy` | `boolean` | Check existence |
| `deleteBy` | `void` | Delete matches |

### Keywords (Conditions)

| Keyword | Example | Generated SQL |
|---------|---------|---------------|
| `And` | `findByNameAndEmail` | `WHERE name = ? AND email = ?` |
| `Or` | `findByNameOrEmail` | `WHERE name = ? OR email = ?` |
| `Is, Equals` | `findByNameIs` | `WHERE name = ?` |
| `Like` | `findByNameLike` | `WHERE name LIKE ?` |
| `StartingWith` | `findByNameStartingWith` | `WHERE name LIKE 'value%'` |
| `Containing` | `findByNameContaining` | `WHERE name LIKE '%value%'` |
| `GreaterThan` | `findByAgeGreaterThan` | `WHERE age > ?` |
| `LessThan` | `findByAgeLessThan` | `WHERE age < ?` |
| `Between` | `findByAgeBetween` | `WHERE age BETWEEN ? AND ?` |
| `In` | `findByIdIn` | `WHERE id IN (?)` |
| `IsNull` | `findByEmailIsNull` | `WHERE email IS NULL` |
| `IsNotNull` | `findByEmailIsNotNull` | `WHERE email IS NOT NULL` |
| `True` | `findByActiveTrue` | `WHERE active = true` |
| `False` | `findByActiveFalse` | `WHERE active = false` |
| `OrderBy` | `findByAgeOrderByNameDesc` | `WHERE age = ? ORDER BY name DESC` |

---

## Complex Examples

```java
public interface UserRepository extends JpaRepository<User, Long> {
    
    // Multiple conditions
    List<User> findByAgeGreaterThanAndActiveTrue(int age);
    // WHERE age > ? AND active = true
    
    // Pattern matching
    List<User> findByEmailContaining(String domain);
    // WHERE email LIKE '%domain%'
    
    // Range queries
    List<User> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    // WHERE created_at BETWEEN ? AND ?
    
    // Sorting
    List<User> findByActiveTrueOrderByCreatedAtDesc();
    // WHERE active = true ORDER BY created_at DESC
    
    // Exists check
    boolean existsByEmail(String email);
    
    // Count
    long countByActiveTrue();
    
    // Delete
    void deleteByInactiveTrue();
}
```

---

## Limiting Results

```java
// Get first result only
Optional<User> findFirstByOrderByCreatedAtDesc();

// Get top N results
List<User> findTop5ByActiveTrueOrderByScoreDesc();

// With Pageable (more flexible)
Page<User> findByActiveTrue(Pageable pageable);
```

---

## Return Types

```java
// Single result (might be null)
User findByEmail(String email);  // Returns null if not found

// Optional (preferred)
Optional<User> findByEmail(String email);

// List (0 to many)
List<User> findByActiveTrue();

// Stream (lazy loading)
Stream<User> findByActiveTrue();
```

:::warning Null vs Optional
Prefer `Optional<User>` over `User` to force explicit null handling.
:::

---

## When Method Names Get Too Long

Sometimes query methods become unreadable:

```java
// This is ridiculous
List<User> findByAgeGreaterThanAndStatusEqualsAndDepartmentNameContainingIgnoreCase(
    int age, String status, String dept
);
```

**Solutions:**
1. Use `@Query` annotation (see next section)
2. Split into smaller methods
3. Use Specifications for dynamic queries

---

## How It Works

1. Spring creates proxy implementation at runtime
2. Parses method name using `PartTree` (splits into Subject + Predicate)
3. Builds JPA Criteria query
4. Hibernate generates SQL
5. Executes and maps results

**Debugging:** Set `spring.jpa.show-sql=true` to see generated SQL.
