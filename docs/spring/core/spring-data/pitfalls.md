---
sidebar_position: 6
title: "Common Pitfalls"
---

# Common Pitfalls & Best Practices

## The N+1 Problem

**The Issue:** Loading parent entities triggers separate queries for each child.

```java
// 1 query for users
List<User> users = userRepository.findAll();

// N queries for departments (one per user)
for (User user : users) {
    System.out.println(user.getDepartment().getName());  // Query per user!
}
// Total: N+1 queries
```

**Solutions:**

### 1. Entity Graph

```java
@Entity
@NamedEntityGraph(
    name = "User.withDepartment",
    attributeNodes = @NamedAttributeNode("department")
)
public class User { ... }

// Repository
@EntityGraph("User.withDepartment")
@Query("SELECT u FROM User u")
List<User> findAllWithDepartment();
```

### 2. JOIN FETCH

```java
@Query("SELECT u FROM User u JOIN FETCH u.department")
List<User> findAllWithDepartment();
```

### 3. @BatchSize

```java
@Entity
public class User {
    @ManyToOne(fetch = FetchType.LAZY)
    @BatchSize(size = 50)  // Load 50 departments at once
    private Department department;
}
```

---

## LazyInitializationException

Accessing lazy-loaded data outside transaction:

```java
@Service
public class UserService {
    
    public User getUser(Long id) {
        return userRepository.findById(id).orElseThrow();  // Transaction ends here
    }
}

// Controller
User user = userService.getUser(1L);
user.getDepartment().getName();  // ❌ LazyInitializationException!
```

**Fix:** Keep session open:
```java
@Transactional(readOnly = true)  // Extends session
public User getUser(Long id) {
    User user = userRepository.findById(id).orElseThrow();
    user.getDepartment().getName();  // ✓ Works - session still open
    return user;
}
```

Or use DTO projections to fetch everything in one query.

---

##save() vs saveAndFlush()

```java
userRepository.save(user);        // Queued in persistence context
userRepository.saveAndFlush(user); // Immediately writes to DB
```

Use `saveAndFlush()` when you need immediate visibility (e.g., before native query).

---

## Detached Entity

Modifying an entity after the session closed:

```java
@Transactional
public void updateUser(Long id) {
    User user = userRepository.findById(id).orElseThrow();
    user.setName("New Name");  // ✓ Works - entity is managed
}

// Outside transaction:
User user = new User();
user.setId(1L);
user.setName("New Name");
userRepository.save(user);  // May create duplicate or fail!
```

**Fix:** Fetch entity first, then modify:
```java
@Transactional
public void updateUser(Long id, String newName) {
    User user = userRepository.findById(id).orElseThrow();
    user.setName(newName);  // Dirty checking updates DB on commit
}
```

---

## Calling save() Unnecessarily

```java
@Transactional
public void updateUser(Long id) {
    User user = userRepository.findById(id).orElseThrow();  // Managed entity
    user.setName("New Name");
    // DON'T NEED: userRepository.save(user)
    // Changes are auto-detected and flushed on commit!
}
```

`save()` is only needed for new entities or detached entities.

---

## Wrong ID Type

```java
// Entity
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;  // Long, not long
}

// Repository
public interface UserRepository extends JpaRepository<User, Long> {  }  // Match ID type!
```

Using `long` (primitive) instead of `Long` (object) can cause issues with `findById()` returning `Optional`.

---

## Best Practices Summary

| Practice | Why |
|----------|-----|
| Use `LAZY` fetching | Avoid loading unnecessary data |
| Use `Optional<Entity>` | Force null handling |
| Use DTO projections | For read-only queries (performance) |
| Enable SQL logging (dev) | `spring.jpa.show-sql=true` |
| Use `@Transactional(readOnly = true)` | For queries (optimization hint) |
| Avoid `@OneToMany` in `@Entity` equals/hashCode | Can cause stack overflow |
| Use `FetchType.EAGER` sparingly | Causes N+1 issues |
| Version entities (`@Version`) | For optimistic locking |

---

## Performance Checklist

- [ ] Enable Hibernate statistics: `spring.jpa.properties.hibernate.generate_statistics=true`
- [ ] Check for N+1 in logs (multiple similar queries)
- [ ] Use `EXPLAIN` on slow queries
- [ ] Add indexes on foreign keys
- [ ] Consider second-level cache for read-heavy data
- [ ] Use batch inserts: `saveAll()` with `hibernate.jdbc.batch_size`
