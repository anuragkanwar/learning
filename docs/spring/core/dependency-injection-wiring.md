---
sidebar_position: 3
title: "Wiring & DI"
---

# Dependency Injection & Wiring

## What is Wiring?

**Wiring** is the process of connecting beans together.
Instead of you passing objects (`new Service(new Repository())`), Spring's container "wires" the repository into the service automatically.

---

## Types of Injection

### 1. Constructor Injection (The Standard)
The container invokes a constructor with arguments representing the dependencies.

```java
@Service
public class UserService {
    private final UserRepository repository; // Can be final!

    // Spring finds this constructor and injects the arguments
    public UserService(UserRepository repository) {
        this.repository = repository;
    }
}
```
**Pros:**
- **Immutability:** Fields can be `final`.
- **Fail-Fast:** Missing dependencies break at startup, not runtime.
- **Testing:** Easy to test with plain Java (no mocks needed for container).

**Cons:**
- Constructors can get large if too many dependencies exist (a sign of bad design).

### 2. Setter Injection
The container calls setter methods after invoking the no-argument constructor.

```java
@Service
public class UserService {
    private UserRepository repository;

    @Autowired
    public void setUserRepository(UserRepository repository) {
        this.repository = repository;
    }
}
```
**Pros:**
- **Optional Dependencies:** Good if the dependency isn't strictly required.
- **Reconfiguration:** Can swap dependencies at runtime (rarely used).

**Cons:**
- **Null Safety:** Objects can be in an "incomplete state" before setters are called.
- **Not Immutable:** Cannot use `final` fields.

### 3. Field Injection (The Anti-Pattern)
Injecting values directly into private fields using Reflection.

```java
@Service
public class UserService {
    @Autowired
    private UserRepository repository; // Private and hidden
}
```
**Pros:**
- Concise, less code.

**Cons:**
- **Hidden Dependencies:** Hard to see what a class needs just by looking at its API.
- **Testing Hardship:** Cannot easily instantiate the class in a unit test without reflection or a Spring test context.
- **Immutability:** Cannot use `final`.

:::danger Avoid Field Injection
Spring Team recommends **Constructor Injection** for mandatory dependencies and **Setter Injection** for optional ones.
:::

---

## Wiring Collections

Spring can inject **all** beans of a specific type into a List or Map.

```java
public interface Validator {
    boolean validate(Order order);
}

@Service
public class OrderService {
    private final List<Validator> validators;

    // Injects EVERY bean that implements Validator
    public OrderService(List<Validator> validators) {
        this.validators = validators;
    }

    public void placeOrder(Order order) {
        // Run all validations
        validators.forEach(v -> v.validate(order));
    }
}
```

---

## Resolving Multiple Beans

When multiple beans match a dependency type, Spring needs help.

### 1. Match by `@Primary`
If one bean is marked `@Primary`, it wins.

```java
@Component
@Primary
public class SqlDatabase implements Database {}

@Component
public class FileDatabase implements Database {}
```

### 2. Match by `@Qualifier`
Be specific about which ID you want.

```java
@Service
public class ReportService {
    public ReportService(@Qualifier("fileDatabase") Database db) { ... }
}
```

### 3. Match by Name (Fallback)
If the parameter name matches the bean ID, Spring might wire it (but don't rely on this; it's fragile).

---

## Circular Dependencies

Occurs when Bean A needs Bean B, and Bean B needs Bean A.

```java
@Service
public class A {
    public A(B b) { ... }
}

@Service
public class B {
    public B(A a) { ... }
}
```
**The Result:** `BeanCurrentlyInCreationException` (Application crashes at startup).

### How to Fix It:
1.  **Refactor (Best):** Extract the common logic into a third Bean C that both A and B depend on.
2.  **`@Lazy` (Band-aid):** Tell Spring to inject a proxy instead of the real bean. The real bean is created only when a method is called on it.

```java
@Service
public class A {
    // Break the cycle by delaying B's creation
    public A(@Lazy B b) { ... }
}
```

---

## The `@Autowired` Annotation

- **By default**: Checks for a unique bean of the required type.
- **`required = false`**: Allows the dependency to be null if no bean is found.

```java
@Autowired(required = false)
private AuditLogger auditLogger; // Null if no logger bean exists
```

:::note
Starting from Spring 4.3, `@Autowired` is **optional** on constructors if the class has only one constructor.
:::

---

## Real World Production Use Case

### Strategy Pattern (Collection Injection)
You have a notification system that sends emails, SMS, and Push notifications.

```java
public interface NotificationChannel {
    void send(String message);
}

@Component
public class EmailChannel implements NotificationChannel { ... }

@Component
public class SmsChannel implements NotificationChannel { ... }

@Service
public class Broadcaster {
    private final List<NotificationChannel> channels;

    // Automatically wires [EmailChannel, SmsChannel]
    public Broadcaster(List<NotificationChannel> channels) {
        this.channels = channels;
    }

    public void broadcast(String msg) {
        channels.forEach(ch -> ch.send(msg));
    }
}
```

---

## Common Pitfalls

:::warning "Bean of type X not found"
You forgot to annotate the class with `@Component` (or `@Service`, etc.), or it's outside the `@ComponentScan` package path.
:::

:::warning "Expected single matching bean but found 2"
You have two implementations of an interface and didn't use `@Primary` or `@Qualifier`.
:::

:::tip Debugging Wiring
If wiring fails, read the stack trace carefully. The "Caused by" section usually names the exact bean and field that failed.
:::
