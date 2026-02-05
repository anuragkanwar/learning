---
sidebar_position: 3
title: "9.3 JdbcTemplate"
---

# 9.3 JdbcTemplate

## What is JdbcTemplate?

`JdbcTemplate` is Spring's central class for JDBC access. It handles:
- Connection creation and cleanup
- Statement preparation and execution
- Exception translation (checked → unchecked)
- ResultSet iteration and mapping

---

## Setup

```java
@Repository
public class UserRepository {
    
    private final JdbcTemplate jdbcTemplate;
    
    public UserRepository(DataSource dataSource) {
        this.jdbcTemplate = new JdbcTemplate(dataSource);
    }
}
```

---

## CRUD Operations

### Query for List

```java
public List<User> findAll() {
    String sql = "SELECT id, name, email FROM users";
    
    return jdbcTemplate.query(sql, (rs, rowNum) -> 
        new User(
            rs.getLong("id"),
            rs.getString("name"),
            rs.getString("email")
        )
    );
}
```

### Query for Single Object

```java
public User findById(Long id) {
    String sql = "SELECT id, name, email FROM users WHERE id = ?";
    
    return jdbcTemplate.queryForObject(
        sql,
        (rs, rowNum) -> new User(
            rs.getLong("id"),
            rs.getString("name"),
            rs.getString("email")
        ),
        id  // Parameter binding
    );
}
```

:::warning EmptyResultDataAccessException
`queryForObject` throws `EmptyResultDataAccessException` if no rows found. Handle it or use `query` and check list size.
:::

### Insert

```java
public int insert(User user) {
    String sql = "INSERT INTO users (name, email) VALUES (?, ?)";
    
    return jdbcTemplate.update(sql, user.getName(), user.getEmail());
}
```

### Update

```java
public int updateEmail(Long id, String newEmail) {
    String sql = "UPDATE users SET email = ? WHERE id = ?";
    
    return jdbcTemplate.update(sql, newEmail, id);
}
```

### Delete

```java
public int delete(Long id) {
    String sql = "DELETE FROM users WHERE id = ?";
    
    return jdbcTemplate.update(sql, id);
}
```

---

## Reusable RowMapper

For complex mappings, extract the RowMapper:

```java
public class UserMapper implements RowMapper<User> {
    @Override
    public User mapRow(ResultSet rs, int rowNum) throws SQLException {
        User user = new User();
        user.setId(rs.getLong("id"));
        user.setName(rs.getString("name"));
        user.setEmail(rs.getString("email"));
        user.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        return user;
    }
}

// Usage
public List<User> findAll() {
    return jdbcTemplate.query("SELECT * FROM users", new UserMapper());
}
```

---

## Query for Simple Types

When you only need one column:

```java
// Count
public int countUsers() {
    return jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM users", 
        Integer.class
    );
}

// Single string
public String findEmailById(Long id) {
    return jdbcTemplate.queryForObject(
        "SELECT email FROM users WHERE id = ?",
        String.class,
        id
    );
}
```
