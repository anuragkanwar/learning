---
sidebar_position: 5
title: "11.5 Entity Relationships"
---

# 11.5 Entity Relationships

## JPA Relationship Mapping

JPA provides annotations to map database relationships:

| Annotation | Database | Description |
|------------|----------|-------------|
| `@OneToOne` | Foreign key in either table | One record relates to one record |
| `@ManyToOne` | Foreign key in "many" side | Many records relate to one record |
| `@OneToMany` | Foreign key in "many" table | One record relates to many records |
| `@ManyToMany` | Join table | Many records relate to many records |

---

## @ManyToOne (Most Common)

Many Users belong to One Department:

```java
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    
    @ManyToOne(fetch = FetchType.LAZY)  // LAZY is default and recommended
    @JoinColumn(name = "department_id")  // Foreign key column
    private Department department;
}

@Entity
public class Department {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
}
```

---

## @OneToMany (Bidirectional)

One Department has Many Users:

```java
@Entity
public class Department {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    
    @OneToMany(mappedBy = "department", fetch = FetchType.LAZY)
    private List<User> users = new ArrayList<>();
}

@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;
}
```

:::tip mappedBy
`mappedBy` indicates the other side owns the relationship. The foreign key is in the User table.
:::

---

## FetchType: LAZY vs EAGER

| Type | Behavior | When to Use |
|------|----------|-------------|
| `LAZY` | Loads related entity only when accessed | **Always preferred** |
| `EAGER` | Loads related entity immediately with parent | Rarely use |

```java
@ManyToOne(fetch = FetchType.LAZY)   // Loads department only when getDepartment() called
@ManyToOne(fetch = FetchType.EAGER)  // Joins department in same query
```

:::danger EAGER Loading
EAGER can cause N+1 problems and load huge object graphs. **Always use LAZY** unless you have a specific reason.
:::

---

## @OneToOne

One User has One Profile:

```java
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    private Profile profile;
}

@Entity
public class Profile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
    
    private String bio;
}
```

---

## @ManyToMany

Users have many Roles, Roles have many Users:

```java
@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_roles",                    // Join table name
        joinColumns = @JoinColumn(name = "user_id"),       // FK to User
        inverseJoinColumns = @JoinColumn(name = "role_id") // FK to Role
    )
    private Set<Role> roles = new HashSet<>();
}

@Entity
public class Role {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    
    @ManyToMany(mappedBy = "roles")
    private Set<User> users = new HashSet<>();
}
```

Creates table: `user_roles(user_id, role_id)`

---

## Cascade Operations

Propagate operations from parent to child:

```java
@OneToMany(mappedBy = "department", cascade = CascadeType.ALL)
private List<User> users;
```

| Cascade Type | Description |
|--------------|-------------|
| `PERSIST` | Save child when parent is saved |
| `MERGE` | Update child when parent is updated |
| `REMOVE` | Delete child when parent is deleted |
| `REFRESH` | Refresh child when parent is refreshed |
| `DETACH` | Detach child when parent is detached |
| `ALL` | All of the above |

:::warning CascadeType.REMOVE
Be careful — deleting a department will delete all its users!
:::

---

## orphanRemoval

Delete child when removed from parent's collection:

```java
@OneToMany(mappedBy = "user", orphanRemoval = true)
private List<Address> addresses;

// When you do:
user.getAddresses().remove(0);  // Address is deleted from database!
```

---

## Common Pitfalls

:::danger LazyInitializationException
Accessing a lazy-loaded collection outside a transaction throws:
```
org.hibernate.LazyInitializationException: failed to lazily initialize
```
**Solutions:**
1. Access within `@Transactional` method
2. Use `FetchType.EAGER` (not recommended)
3. Use `JOIN FETCH` in query
:::

:::warning N+1 Problem
```java
// 1 query for departments
List<Department> depts = deptRepo.findAll();

// N queries for users (one per department)
for (Department d : depts) {
    System.out.println(d.getUsers().size());  // Each access = new query!
}
```
**Solution:** Use `EntityGraph` or `JOIN FETCH`:
```java
@Query("SELECT d FROM Department d JOIN FETCH d.users")
List<Department> findAllWithUsers();
```
:::
