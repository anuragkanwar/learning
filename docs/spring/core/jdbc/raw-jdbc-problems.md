---
sidebar_position: 2
title: "The Problem with Raw JDBC"
---

# The Problem with Raw JDBC

## Plain JDBC Code (The Bad Old Way)

This is what database code looks like without Spring:

```java
public List<User> findAllUsers() {
    List<User> users = new ArrayList<>();
    Connection conn = null;
    PreparedStatement stmt = null;
    ResultSet rs = null;
    
    try {
        // 1. Get connection
        conn = DriverManager.getConnection(DB_URL, USER, PASS);
        
        // 2. Create statement
        stmt = conn.prepareStatement("SELECT id, name, email FROM users");
        
        // 3. Execute query
        rs = stmt.executeQuery();
        
        // 4. Map results
        while (rs.next()) {
            User user = new User();
            user.setId(rs.getLong("id"));
            user.setName(rs.getString("name"));
            user.setEmail(rs.getString("email"));
            users.add(user);
        }
        
    } catch (SQLException e) {
        throw new RuntimeException("Database error", e);
    } finally {
        // 5. Cleanup (BEST EFFORT - can still leak!)
        try { if (rs != null) rs.close(); } catch (SQLException e) { }
        try { if (stmt != null) stmt.close(); } catch (SQLException e) { }
        try { if (conn != null) conn.close(); } catch (SQLException e) { }
    }
    
    return users;
}
```

---

## The Problems

| Problem | Description |
|---------|-------------|
| **Boilerplate Hell** | 20 lines of code for a simple SELECT |
| **Resource Leaks** | Forgetting to close connections/cursors |
| **Exception Handling** | SQLException checked everywhere |
| **Connection Management** | No pooling, creating connections per call |
| **ResultSet Mapping** | Manual column-to-field mapping |
| **No Transaction Support** | Each statement is auto-committed |

:::danger Resource Leaks
Forgetting `rs.close()` or `conn.close()` will eventually exhaust the database connection pool and crash your application.
:::

---

## Spring's Solution: JdbcTemplate

Spring's `JdbcTemplate` solves all these problems:
- Automatic resource cleanup (try-with-resources internally)
- Exception translation (SQLException → DataAccessException)
- Connection pooling integration
- ResultSet mapping via RowMapper

```java
// Same logic, 4 lines instead of 30
public List<User> findAllUsers() {
    return jdbcTemplate.query(
        "SELECT id, name, email FROM users",
        (rs, rowNum) -> new User(
            rs.getLong("id"),
            rs.getString("name"),
            rs.getString("email")
        )
    );
}
```

---

## Why This Matters (Spring Data Motivation)

Even `JdbcTemplate` requires you to write SQL and map results manually. 

Imagine writing this for every table:
- `UserRepository` with 5 methods
- `OrderRepository` with 5 methods  
- `ProductRepository` with 5 methods

That's a lot of repetitive SQL and RowMappers!

**This repetitive boilerplate is exactly why Spring Data JPA exists.**

But to understand Spring Data's magic, you must first understand what it's hiding from you.
