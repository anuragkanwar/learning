---
sidebar_position: 1
title: "11.1 What is Spring Data JPA"
---

# 11.1 What is Spring Data JPA

## The Problem: Too Much Boilerplate

Even with `JdbcTemplate`, you write repetitive code:

```java
// With JdbcTemplate - still 30+ lines per entity
@Repository
public class UserJdbcRepository {
    
    public User findById(Long id) {
        String sql = "SELECT * FROM users WHERE id = ?";
        return jdbcTemplate.queryForObject(sql, new UserMapper(), id);
    }
    
    public List<User> findAll() {
        String sql = "SELECT * FROM users";
        return jdbcTemplate.query(sql, new UserMapper());
    }
    
    public void save(User user) {
        String sql = "INSERT INTO users (name, email) VALUES (?, ?)";
        jdbcTemplate.update(sql, user.getName(), user.getEmail());
    }
    
    public void update(User user) { /* ... */ }
    public void delete(Long id) { /* ... */ }
    public List<User> findByEmail(String email) { /* ... */ }
    public List<User> findActiveUsers() { /* ... */ }
    // REPEAT FOR EVERY TABLE
}
```

Multiply this by 20 tables = **hundreds of lines of boilerplate**.

---

## The Solution: Spring Data JPA

Spring Data JPA eliminates boilerplate through **interface-based programming**.

```java
// Same functionality in 5 lines
public interface UserRepository extends JpaRepository<User, Long> {
    // CRUD methods: save, findById, findAll, delete - ALL INCLUDED
    // Plus custom queries via method names:
    List<User> findByEmail(String email);
    List<User> findByActiveTrue();
}
```

**That's it. Spring generates the implementation at runtime.**

---

## What Spring Data JPA Provides

| Feature | Description |
|---------|-------------|
| **CRUD Operations** | `save()`, `findById()`, `findAll()`, `delete()`, `count()` — out of the box |
| **Query Methods** | Define queries via method naming conventions |
| **Custom Queries** | `@Query` annotation for JPQL/SQL |
| **Pagination** | Built-in `Pageable` support |
| **Sorting** | Dynamic sorting without writing queries |
| **Specifications** | Dynamic query criteria (Criteria API alternative) |
| **Auditing** | Automatic created/updated timestamps |
| **Entity Relationships** | Simplified OneToMany, ManyToOne, ManyToMany |

---

## Spring Data JPA Architecture

```
┌──────────────────────────────────────────┐
│         Your Code                        │
│  userRepository.findByEmail("john@test") │
└──────────────────┬───────────────────────┘
                   ↓
┌──────────────────────────────────────────┐
│    Spring Data Proxy (Generated)         │
│  - Parses method name                    │
│  - Builds query                          │
│  - Executes via JPA                      │
└──────────────────┬───────────────────────┘
                   ↓
┌──────────────────────────────────────────┐
│    JPA Provider (Hibernate)              │
│  - Generates SQL                         │
│  - Manages Entity lifecycle              │
│  - Handles caching                       │
└──────────────────┬───────────────────────┘
                   ↓
┌──────────────────────────────────────────┐
│    Database (MySQL/PostgreSQL/etc)       │
└──────────────────────────────────────────┘
```

---

## JPA vs Hibernate vs Spring Data

| Technology | Role | Analogy |
|------------|------|---------|
| **JPA** | Specification (interfaces) | JDBC specification |
| **Hibernate** | Implementation of JPA | MySQL Connector/J |
| **Spring Data JPA** | Convenience layer on top | JdbcTemplate equivalent |

:::note
Spring Data JPA uses Hibernate by default (most popular JPA implementation).
:::

---

## Quick Start

### 1. Add Dependencies

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
</dependency>
```

### 2. Configure Database

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost/mydb
    username: root
    password: secret
  jpa:
    hibernate:
      ddl-auto: update  # Auto-create tables (dev only!)
    show-sql: true      # Log SQL queries
```

### 3. Create Entity

```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(unique = true)
    private String email;
}
```

### 4. Create Repository

```java
public interface UserRepository extends JpaRepository<User, Long> {
    // Method name = query
    List<User> findByNameContaining(String name);
}
```

### 5. Use It

```java
@Service
public class UserService {
    private final UserRepository repo;
    
    public UserService(UserRepository repo) {
        this.repo = repo;
    }
    
    public List<User> search(String name) {
        return repo.findByNameContaining(name);  // Auto-implemented!
    }
}
```

---

## Repository Interfaces Hierarchy

```
Repository (marker interface)
    ↑
CrudRepository<T, ID>  - Basic CRUD
    ↑
PagingAndSortingRepository<T, ID>  - + Pagination
    ↑
JpaRepository<T, ID>  - + JPA-specific methods (flush, batch)
```

| Interface | Methods Included |
|-----------|------------------|
| `CrudRepository` | `save`, `findById`, `existsById`, `findAll`, `delete`, `count` |
| `PagingAndSortingRepository` | Above + `findAll(Pageable)`, `findAll(Sort)` |
| `JpaRepository` | Above + `flush`, `saveAll`, `deleteInBatch` |

:::tip
Always extend `JpaRepository` for full functionality.
:::
