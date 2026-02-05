---
sidebar_position: 3
title: "10.3 Propagation Levels"
---

# 10.3 Transaction Propagation

## What is Propagation?

Propagation defines **how transactions relate to each other** when one transactional method calls another.

```java
@Service
public class OrderService {
    
    @Transactional
    public void createOrder() {           // Transaction A starts
        orderRepository.save(order);      // Uses Transaction A
        paymentService.processPayment();  // What happens here?
    }                                     // Transaction A commits
}

@Service
public class PaymentService {
    
    @Transactional
    public void processPayment() {        // Transaction B? Or join A?
        paymentRepository.save(payment);
    }
}
```

---

## The 7 Propagation Levels

| Propagation | Behavior | Use Case |
|-------------|----------|----------|
| **REQUIRED** (default) | Join existing, or create new | Most business operations |
| **REQUIRES_NEW** | Suspend current, create new, resume after | Audit logging (must save even if main fails) |
| **NESTED** | Create savepoint within existing transaction | Partial rollback capability |
| **MANDATORY** | Must join existing, throw if none | Internal methods that require context |
| **SUPPORTS** | Join if exists, run without if not | Read-only queries that can work either way |
| **NOT_SUPPORTED** | Suspend current, run without transaction | Sending notifications (don't hold DB connection) |
| **NEVER** | Throw exception if transaction exists | Methods that must never run in transaction |

---

## Deep Dive: REQUIRED vs REQUIRES_NEW

### REQUIRED (Default)

```java
@Service
public class OrderService {
    @Transactional
    public void createOrder() {              // TX-1 starts
        orderRepo.save(order);               // Uses TX-1
        paymentService.processPayment();     // Joins TX-1 (same transaction)
    }                                        // TX-1 commits/rollback
}

@Service
public class PaymentService {
    @Transactional(propagation = REQUIRED)   // Default
    public void processPayment() {           // Joins TX-1
        paymentRepo.save(payment);           // Uses TX-1
        throw new RuntimeException("Oops!"); // TX-1 rolls back
    }
}
// Result: Both order AND payment are rolled back
```

### REQUIRES_NEW

```java
@Service
public class PaymentService {
    @Transactional(propagation = REQUIRES_NEW)
    public void processPayment() {           // Suspends TX-1, creates TX-2
        paymentRepo.save(payment);           // Uses TX-2
        throw new RuntimeException("Oops!"); // TX-2 rolls back
    }                                        // TX-1 resumes
}
// Result: Order is saved (TX-1 committed), Payment rolled back (TX-2 failed)
```

:::tip Audit Logging Use Case
Use `REQUIRES_NEW` for audit logs that must be persisted even if the main transaction fails.
:::

---

## NESTED Transactions

Creates a **savepoint** within the existing transaction:

```java
@Service
public class OrderService {
    @Transactional
    public void createOrder() {
        orderRepo.save(order);                        // Saved
        
        try {
            nestedService.processWithRollback();      // Creates savepoint
        } catch (Exception e) {
            // Only rolls back to savepoint, order is still saved
            log.error("Nested failed, continuing...");
        }
        
        notificationService.sendEmail();              // Still executes
    }
}

@Service
public class NestedService {
    @Transactional(propagation = NESTED)
    public void processWithRollback() {
        riskyOperation();                             // If this fails...
        // Only rolls back to savepoint, outer continues
    }
}
```

:::warning Database Support
NESTED requires database savepoint support (most modern DBs support it). Not supported with JTA transactions.
:::

---

## Choosing Propagation

```java
// Default - join or create
@Transactional
public void standardOperation() { }

// Must have context - defensive programming
@Transactional(propagation = MANDATORY)
public void internalHelper() { }

// Independent operation
@Transactional(propagation = REQUIRES_NEW)
public void auditLog() { }

// Optional transaction
@Transactional(propagation = SUPPORTS, readOnly = true)
public List<User> findUsers() { }
```
