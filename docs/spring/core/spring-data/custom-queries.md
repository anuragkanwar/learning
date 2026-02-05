---
sidebar_position: 3
title: "11.3 Custom Queries"
---

# 11.3 Custom Queries with @Query

## When Method Names Aren't Enough

For complex queries, use the `@Query` annotation with **JPQL** (Java Persistence Query Language) or native SQL.

---

## JPQL Queries

JPQL queries entities and their relationships, not database tables.

```java
public interface UserRepository extends JpaRepository<User, Long> {
    
    @Query("SELECT u FROM User u WHERE u.email = ?1")
    User findByEmailCustom(String email);
    
    @Query("SELECT u FROM User u WHERE u.age > ?1 AND u.active = true")
    List<User> findActiveAdults(int minAge);
    
    // Named parameters (more readable)
    @Query("SELECT u FROM User u WHERE u.name = :name AND u.department = :dept")
    List<User> findByNameAndDepartment(
        @Param("name") String name, 
        @Param("dept") String department
    );
}
```

:::note JPQL Syntax
- `SELECT u FROM User u` - `User` is the entity class, not table name
- `u.name` - `name` is the entity field, not column name
- Uses Java class/field names, not SQL table/column names
:::

---

## Native SQL Queries

For database-specific features or complex SQL:

```java
@Query(value = "SELECT * FROM users WHERE email LIKE %:domain", nativeQuery = true)
List<User> findByEmailDomain(@Param("domain") String domain);

// With pagination
@Query(value = "SELECT * FROM users WHERE active = true", 
       countQuery = "SELECT count(*) FROM users WHERE active = true",
       nativeQuery = true)
Page<User> findActiveUsersNative(Pageable pageable);
```

:::warning Native SQL Drawbacks
- Not portable across databases
- Bypasses entity mapping (may return duplicates)
- No lazy loading for relationships
:::

---

## Modifying Queries

For UPDATE and DELETE operations:

```java
@Modifying
@Query("UPDATE User u SET u.active = false WHERE u.lastLogin < :date")
int deactivateInactiveUsers(@Param("date") LocalDateTime cutoffDate);

@Modifying
@Query("DELETE FROM User u WHERE u.active = false")
int deleteInactiveUsers();
```

:::important
`@Modifying` queries:
1. Don't return entities (return int = rows affected)
2. Don't trigger JPA lifecycle callbacks (@PreUpdate, @PostUpdate)
3. Clear persistence context automatically (or use `clearAutomatically = false`)
:::

---

## DTO Projections

Fetch only specific fields (better performance):

```java
// DTO Interface
public interface UserSummary {
    String getName();
    String getEmail();
}

@Query("SELECT u.name as name, u.email as email FROM User u WHERE u.active = true")
List<UserSummary> findActiveUserSummaries();
```

Or with Class-based DTO:

```java
public class UserDTO {
    private String name;
    private String email;
    // Constructor
    public UserDTO(String name, String email) {
        this.name = name;
        this.email = email;
    }
}

@Query("SELECT new com.example.UserDTO(u.name, u.email) FROM User u")
List<UserDTO> findAllAsDTO();
```

---

## Dynamic Sorting

```java
@Query("SELECT u FROM User u WHERE u.active = true")
List<User> findActiveUsers(Sort sort);

// Usage:
repo.findActiveUsers(Sort.by("name").ascending());
repo.findActiveUsers(Sort.by("createdAt").descending());
```

---

## Advanced: SpEL Expressions

```java
@Entity
public class User {
    @CreatedBy
    private String createdBy;
}

@Query("SELECT u FROM User u WHERE u.createdBy = ?#{ principal.username }")
List<User> findMyRecords();
```

Access Spring Security principal or other SpEL expressions directly in queries.
