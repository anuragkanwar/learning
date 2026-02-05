---
sidebar_position: 5
title: "10.5 Rollback Rules & Configuration"
---

# 10.5 Rollback Rules & Configuration

## Default Rollback Behavior

By default, `@Transactional` rolls back on:
- **RuntimeException** and subclasses (`NullPointerException`, `IllegalArgumentException`, etc.)
- **Error** and subclasses (`OutOfMemoryError`, etc.)

It does **NOT** roll back on:
- **Checked Exceptions** (`IOException`, `SQLException`, etc.)

```java
@Transactional
public void process() throws IOException {
    saveToDatabase();
    writeToFile();        // Throws IOException (checked)
    // Transaction COMMITS! Even though file write failed!
}
```

---

## Customizing Rollback

### rollbackFor

Force rollback on checked exceptions:

```java
@Transactional(rollbackFor = IOException.class)
public void process() throws IOException {
    saveToDatabase();
    writeToFile();        // IOException → triggers rollback
}
```

Multiple exceptions:
```java
@Transactional(rollbackFor = {IOException.class, SQLException.class})
```

### noRollbackFor

Prevent rollback on specific runtime exceptions:

```java
@Transactional(noRollbackFor = IllegalStateException.class)
public void process() {
    saveToDatabase();
    validate();           // Throws IllegalStateException
    // Transaction COMMITS despite exception!
}
```

### Combined

```java
@Transactional(
    rollbackFor = SQLException.class,
    noRollbackFor = IllegalStateException.class
)
```

---

## Read-Only Transactions

Mark transactions as read-only for optimization:

```java
@Transactional(readOnly = true)
public List<User> findAllUsers() {
    return userRepository.findAll();
}
```

**Benefits:**
1. **Hibernate**: No dirty checking (no snapshot comparison)
2. **Hibernate**: No cascade updates on flush
3. **Database**: Some DBs optimize read-only connections
4. **Intent**: Documents that this method shouldn't modify data

:::warning Read-Only is a Hint
Spring/DB may not enforce it. You can still execute UPDATE statements — it's an optimization hint, not a security feature.
:::

---

## Transaction Timeout

Set maximum time for transaction:

```java
@Transactional(timeout = 30)  // 30 seconds
public void longRunningProcess() {
    // If execution takes > 30s, transaction rolls back
}
```

Useful for:
- Preventing runaway queries
- Releasing connections back to pool
- Failing fast on performance issues

---

## Transaction Isolation Levels

Control visibility of uncommitted data:

```java
@Transactional(isolation = Isolation.READ_COMMITTED)
```

| Level | Description | Issues |
|-------|-------------|--------|
| `DEFAULT` | Use database default | Varies by DB |
| `READ_UNCOMMITTED` | See uncommitted changes | Dirty reads |
| `READ_COMMITTED` | Only see committed data | Non-repeatable reads |
| `REPEATABLE_READ` | Same query = same results | Phantom reads |
| `SERIALIZABLE` | Complete isolation | Performance |

:::tip Default is Usually Fine
Most applications use `READ_COMMITTED`. Only change if you have specific concurrency requirements.
:::

---

## Best Practices Summary

| Practice | Why |
|----------|-----|
| `@Transactional` on Service layer | Business transaction boundaries |
| Keep transactions short | Reduce lock contention |
| Use `readOnly = true` for queries | Performance optimization |
| Don't catch and swallow exceptions | Let transactions roll back |
| Avoid transactions in loops | Each iteration = potential new TX |
| Be careful with `REQUIRES_NEW` | Can lead to partial commits |
