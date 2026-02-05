---
sidebar_position: 4
title: "10.4 The Achilles Heel: Self-Invocation"
---

# 10.4 The Achilles Heel: Self-Invocation Problem

## The #1 Transaction Bug in Production

This is the most common and dangerous pitfall in Spring transactions.

### The Scenario

```java
@Service
public class OrderService {
    
    @Transactional
    public void createOrder(OrderRequest request) {
        validateOrder(request);           // Runs in transaction ✓
        saveOrder(request);               // Runs in transaction ✓
        processPayment(request);          // ❌ NO TRANSACTION!
    }
    
    @Transactional
    public void processPayment(OrderRequest request) {
        // This method expects a transaction
        // But it runs WITHOUT one!
        paymentRepository.charge(request.getAmount());
    }
}
```

**What happens:**
1. External client calls `createOrder()` → hits the **Proxy**
2. Proxy starts transaction
3. Proxy calls real `createOrder()`
4. `createOrder()` calls `this.processPayment()` — **NOT through proxy**
5. `processPayment()` executes without any transaction
6. `createOrder()` returns to proxy
7. Proxy commits

:::danger The Problem
When a method calls another method in the **same class**, it bypasses the Spring Proxy. The `@Transactional` on `processPayment()` is completely ignored.
:::

---

## Why Does This Happen?

```
┌─────────────────────────────────────────┐
│  Client calls orderService.createOrder()│
│  → Goes through PROXY ✓                 │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Proxy starts TRANSACTION               │
│  Proxy calls real.createOrder()         │
└─────────────────┬───────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Inside OrderService (real object):     │
│                                         │
│  this.processPayment()                  │
│  → Direct method call                   │
│  → NO proxy involved!                   │
│  → @Transactional IGNORED               │
└─────────────────────────────────────────┘
```

`this` refers to the **real object**, not the proxy. Spring AOP only works on **external method calls** through the proxy.

---

## Solutions

### Solution 1: Self-Injection (Most Common)

Inject the service into itself:

```java
@Service
public class OrderService {
    
    @Autowired
    @Lazy  // Required to break circular dependency
    private OrderService self;
    
    @Transactional
    public void createOrder(OrderRequest request) {
        validateOrder(request);
        saveOrder(request);
        self.processPayment(request);  // ✓ Goes through Proxy!
    }
    
    @Transactional
    public void processPayment(OrderRequest request) {
        // Now has its own transaction
        paymentRepository.charge(request.getAmount());
    }
}
```

:::warning Use @Lazy
Without `@Lazy`, Spring might fail to create the bean due to circular dependency detection.
:::

### Solution 2: Refactor to Another Service (Best Design)

Extract the method to a separate service:

```java
@Service
public class OrderService {
    
    private final PaymentService paymentService;
    
    public OrderService(PaymentService paymentService) {
        this.paymentService = paymentService;
    }
    
    @Transactional
    public void createOrder(OrderRequest request) {
        validateOrder(request);
        saveOrder(request);
        paymentService.process(request);  // ✓ Different service = proxy involved
    }
}

@Service
public class PaymentService {
    @Transactional
    public void process(OrderRequest request) {
        // Transaction works correctly
    }
}
```

### Solution 3: AspectJ Weaving (Nuclear Option)

Use compile-time weaving instead of proxy-based AOP. This actually modifies the bytecode so `this` calls are also intercepted.

```xml
<!-- Requires AspectJ compiler plugin -->
<plugin>
    <groupId>org.codehaus.mojo</groupId>
    <artifactId>aspectj-maven-plugin</artifactId>
</plugin>
```

:::danger Complex
AspectJ weaving adds complexity to build process. Only use if self-injection/refactoring isn't viable.
:::

---

## Detection

How to catch this in code review:

```java
// SUSPICIOUS: Same class calling its own @Transactional method
public class MyService {
    public void outer() {
        this.inner();  // ❌ Check if inner() has @Transactional
    }
    
    @Transactional
    public void inner() { }
}

// SAFE: Different services
public class ServiceA {
    private ServiceB serviceB;
    
    public void outer() {
        serviceB.inner();  // ✓ Proxy will be involved
    }
}
```

:::tip IDE Warning
Some IDEs (IntelliJ) can detect self-invocation of transactional methods and show warnings.
:::
