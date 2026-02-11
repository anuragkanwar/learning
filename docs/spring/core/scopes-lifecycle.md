---
sidebar_position: 5
title: "Scopes & Lifecycle"
---

# Bean Scopes & Lifecycle

## What is a Bean Scope?

Scope determines **how many instances** of a bean are created and **how long they live**.

| Scope | Creation Strategy | Lifecycle | Default? |
|-------|-------------------|-----------|----------|
| **Singleton** | One instance per container | Lives until container shutdown | ✅ **Yes** |
| **Prototype** | New instance every time requested | Garbage collected when not used | No |
| **Request** | One per HTTP request | Destroys after response sent | Web only |
| **Session** | One per HTTP session | Destroys on session timeout/logout | Web only |
| **Application** | One per `ServletContext` | Lives as long as the web app | Web only |

---

## 1. Singleton Scope (The Default)

Spring creates **one shared instance** of the bean. It is cached in the container.

```java
@Service // Implicitly @Scope("singleton")
public class ProductService { ... }
```

- **Pros:** High performance (created once), low memory usage.
- **Cons:** Must be **stateless**. If you save data in a field, all threads see it.
- **Use Case:** Services, Repositories, Utils, Stateless logic.

:::warning Singleton != GoF Singleton
Spring Singleton means "One per Container", not "One per ClassLoader". If you have multiple ApplicationContexts, you have multiple Singletons.
:::

---

## 2. Prototype Scope

Spring creates a **new instance** every time the bean is injected or retrieved.

```java
@Component
@Scope("prototype")
public class ShoppingCart { ... }
```

- **Pros:** Thread-safe for stateful operations (each user gets their own).
- **Cons:** High memory churn, expensive creation cost.
- **Use Case:** Stateful objects, non-thread-safe actions.

:::danger No Destruction Callback
Spring **does not manage the complete lifecycle of a prototype**. It creates it, hands it to you, and forgets it. `@PreDestroy` methods are **NEVER called** on prototypes. You must release resources manually.
:::

---

## The Bean Lifecycle

Spring manages the entire life of a bean (except Prototypes).

### The Lifecycle Flow
1.  **Instantiation** (Run Constructor)
2.  **Populate Properties** (Dependency Injection)
3.  **Post-Initialization** (`@PostConstruct`)
4.  **Bean Ready** (In use by application)
5.  **Pre-Destruction** (`@PreDestroy`)
6.  **Destruction** (Remove from memory)

### Lifecycle Hooks (Annotations)

Use these to execute logic during startup or shutdown.

```java
@Component
public class CacheManager {

    @PostConstruct
    public void init() {
        // Runs AFTER constructor and dependency injection
        System.out.println("Loading cache data from DB...");
        loadData();
    }

    @PreDestroy
    public void cleanup() {
        // Runs BEFORE container shuts down
        System.out.println("Clearing cache...");
        clearData();
    }
}
```

---

## Common Pitfall: Prototype inside Singleton

If you inject a `Prototype` bean into a `Singleton` bean, the prototype is **only created once** (when the singleton is created).

```java
@Component
@Scope("prototype")
class RandomGenerator { ... }

@Service // Singleton
class GameService {
    @Autowired
    private RandomGenerator rng; // ❌ Created ONCE, same instance forever!
}
```

### The Fix: Lookup Method or ObjectProvider

Don't inject the object; inject a **provider** to get a fresh instance on demand.

```java
@Service
class GameService {
    
    @Autowired
    private ObjectProvider<RandomGenerator> rngProvider;

    public void play() {
        // ✅ Asks container for a NEW instance
        RandomGenerator rng = rngProvider.getObject(); 
        rng.generate();
    }
}
```

---

## Web Scopes & Proxies

When injecting a short-lived bean (Request/Session) into a long-lived bean (Singleton), you must use a **Proxy**.

```java
@Component
@Scope(value = "session", proxyMode = ScopedProxyMode.TARGET_CLASS)
public class UserPreferences { ... }

@Service
public class UserService {
    private final UserPreferences prefs; // Injects a Proxy, not the real object
    
    public void update() {
        // Proxy delegates to the ACTUAL session object for the current user
        prefs.setTheme("dark"); 
    }
}
```

- **Why?** The Singleton is created at startup, but the Session doesn't exist yet. Spring injects a "smart proxy" that connects to the correct session at runtime.

---

## Real World Production Use Case

### 1. Database Connection Pool (Lifecycle)
You need to establish connections when the app starts and close them gracefully when it stops to prevent memory leaks or DB locks.

```java
@Component
public class DatabaseConnector {
    private HikariDataSource ds;

    @PostConstruct
    public void connect() {
        ds = new HikariDataSource(); // Expensive operation
        ds.setJdbcUrl("...");
    }

    @PreDestroy
    public void close() {
        ds.close(); // Prevent resource leaks
    }
}
```

### 2. User Context (Request Scope)
Storing user details (ID, Role, Tenant) extracted from a JWT token for the duration of a single API request.

```java
@Component
@Scope(value = "request", proxyMode = ScopedProxyMode.TARGET_CLASS)
public class UserContext {
    private String userId;
    private String tenantId;
    // Getters/Setters
}
```

---

## Pros & Cons Summary

| Feature | Pros | Cons |
|---------|------|------|
| **Singleton** | Efficient, fast, default. | Shared state is dangerous (Thread Safety issues). |
| **Prototype** | Safe for state, independent instances. | No destruction management, high GC pressure. |
| **@PostConstruct** | Guaranteed to have dependencies ready. | Delays application startup time. |
| **Lazy Init** | Speeds up startup. | Errors caught at runtime, not startup. |
