---
sidebar_position: 4
title: "9.4 NamedParameterJdbcTemplate"
---

# 9.4 NamedParameterJdbcTemplate

## The Problem with ?

Positional parameters (`?`) become unreadable with many parameters:

```java
String sql = "INSERT INTO users (first_name, last_name, email, phone, address, city) VALUES (?, ?, ?, ?, ?, ?)";
// Which ? is which? Easy to mess up order!
jdbcTemplate.update(sql, fname, lname, email, phone, addr, city);
```

---

## Named Parameters

`NamedParameterJdbcTemplate` lets you use `:name` syntax:

```java
String sql = "INSERT INTO users (first_name, last_name, email) " +
             "VALUES (:firstName, :lastName, :email)";

Map<String, Object> params = new HashMap<>();
params.put("firstName", user.getFirstName());
params.put("lastName", user.getLastName());
params.put("email", user.getEmail());

namedTemplate.update(sql, params);
```

---

## Setup

```java
@Repository
public class UserRepository {
    private final NamedParameterJdbcTemplate namedTemplate;
    
    public UserRepository(DataSource dataSource) {
        this.namedTemplate = new NamedParameterJdbcTemplate(dataSource);
    }
}
```

---

## SqlParameterSource

Instead of manual Maps, use `BeanPropertySqlParameterSource`:

```java
public void insert(User user) {
    String sql = "INSERT INTO users (name, email) VALUES (:name, :email)";
    
    SqlParameterSource params = new BeanPropertySqlParameterSource(user);
    namedTemplate.update(sql, params);
}
```

**Requirements**: Bean property names must match parameter names exactly.

---

## Query with Named Parameters

```java
public List<User> findByCityAndAge(String city, int minAge) {
    String sql = "SELECT * FROM users WHERE city = :city AND age > :minAge";
    
    Map<String, Object> params = Map.of(
        "city", city,
        "minAge", minAge
    );
    
    return namedTemplate.query(sql, params, new UserMapper());
}
```

---

## When to Use What?

| Template | Use When |
|----------|----------|
| `JdbcTemplate` | Simple queries, few parameters |
| `NamedParameterJdbcTemplate` | Complex queries, many parameters, dynamic SQL |

:::tip
For most production code, prefer `NamedParameterJdbcTemplate`. The readability gain is worth it.
:::
