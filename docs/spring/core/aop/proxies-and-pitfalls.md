---
sidebar_position: 3
title: "Proxies & Pitfalls"
---

# Proxies, Internals & Pitfalls

## How Spring AOP Works (The Proxy Pattern)

Spring AOP does **not** modify your byte-code at compile time (unlike AspectJ).
Instead, it creates a **Proxy Object** that wraps your real bean.

1.  Container creates `UserService` (Target).
2.  Container detects `@Aspect`.
3.  Container wraps `UserService` in a `Proxy`.
4.  Container injects the `Proxy` everywhere (Controllers, other Services).

### JDK Dynamic Proxy vs CGLIB

| Feature | JDK Dynamic Proxy | CGLIB Proxy |
|---------|-------------------|-------------|
| **Target** | Interfaces only | Classes (extends the class) |
| **Requirement** | Bean must implement an Interface | Bean can be a class (no final methods) |
| **Default** | Used if Interface exists | Used if no Interface exists (or forced in Boot 2.0+) |

:::note Modern Spring Boot
Spring Boot 2.0+ prefers **CGLIB** (Class-based proxies) by default (`spring.aop.proxy-target-class=true`), so you don't strictly need interfaces for AOP anymore.
:::

---

## The "Self-Invocation" Problem

This is the #1 Interview Question and Production Bug in AOP.

**Scenario**: You have method `a()` and `b()` in the same class. `b()` is `@Transactional`.
If you call `a()`, and `a()` calls `b()`, **the transaction will NOT start**.

```java
@Service
public class OrderService {

    public void createOrder() {
        // ... logic ...
        saveToDb(); // ❌ DIRECT CALL on 'this'. Skips the Proxy!
    }

    @Transactional // Aspect is here
    public void saveToDb() {
        // DB logic
    }
}
```

**Why?**
- `controller.createOrder()` calls the **Proxy**.
- The Proxy delegates to the **Real Object**.
- The Real Object calls `this.saveToDb()`.
- `this` refers to the **Real Object**, not the Proxy.
- Therefore, no advice logic (Transaction, Logging) is triggered.

### The Fixes

**1. Self-Injection (Recommended)**
Inject the bean into itself (Spring allows this for proxies).

```java
@Service
public class OrderService {
    
    @Autowired
    @Lazy // Required to prevent Circular Dependency cycle
    private OrderService self;

    public void createOrder() {
        self.saveToDb(); // ✅ Calls via Proxy
    }
}
```

**2. Refactor (Best Design)**
Move the method to another Service.

---

## Private Methods

**Spring AOP does NOT work on private methods.**
Since it uses Proxies (which either implement an Interface or extend the class), it cannot see or override private methods.

- **JDK Proxy**: Can only override Interface methods (which are public).
- **CGLIB**: Can only override non-final, non-private methods.

:::danger
If you put `@Transactional` or `@Async` on a `private` method, Spring will silently ignore it. No error, just no behavior.
:::

---

## Performance Overhead

AOP adds a tiny overhead (nanoseconds) per method call due to the reflection/proxy chain.
- For IO-bound apps (Web/DB): **Negligible**.
- For tight loops (Scientific calc): **Avoid AOP**.
