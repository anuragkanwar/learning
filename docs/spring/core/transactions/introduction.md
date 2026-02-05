---
sidebar_position: 1
title: "10.1 Why Transactions Matter"
---

# 10.1 Why Transactions Matter

## The Problem Without Transactions

Database operations are **atomic** — they should either all succeed or all fail together.

### Real-World Scenario: Bank Transfer

```java
// WITHOUT @Transactional
public void transfer(Long fromId, Long toId, BigDecimal amount) {
    accountRepository.debit(fromId, amount);  // Step 1: Success
    // CRASH! Power failure, network issue, bug...
    accountRepository.credit(toId, amount);   // Step 2: Never executes!
}
```

**Result:** Money disappeared from one account but never reached the other. **Data inconsistency.**

---

## ACID Properties

Transactions guarantee **ACID** compliance:

| Property | Description | Example |
|----------|-------------|---------|
| **Atomicity** | All operations succeed or all rollback | Transfer: both debit AND credit happen, or neither |
| **Consistency** | Database remains in valid state | Account balance never goes negative (if constrained) |
| **Isolation** | Concurrent transactions don't interfere | Two transfers on same account execute serially |
| **Durability** | Committed data survives crashes | After commit, data is persisted to disk |

---

## Spring's Solution: @Transactional

Spring makes transactions declarative. Just add one annotation:

```java
@Service
public class PaymentService {
    
    @Transactional
    public void processPayment(PaymentRequest request) {
        // 1. Deduct from payer
        accountRepository.debit(request.getFromAccount(), request.getAmount());
        
        // 2. Add to payee  
        accountRepository.credit(request.getToAccount(), request.getAmount());
        
        // 3. Record transaction
        transactionRepository.save(request);
        
        // 4. Update statistics
        statsService.recordPayment(request.getAmount());
        
        // ALL 4 operations succeed together, or ALL rollback together
    }
}
```

**What Spring does:**
1. Starts transaction before method entry
2. Commits if method completes without exception
3. Rolls back if ANY exception is thrown
4. Handles all connection management automatically

---

## Where to Put @Transactional?

| Layer | Recommendation | Reason |
|-------|----------------|--------|
| **Controller** | ❌ Never | Too coarse, mixes web and business logic |
| **Service** | ✅ Yes | Business transaction boundaries |
| **Repository** | ⚠️ Rarely | Too granular, usually part of larger transaction |

:::tip Best Practice
Place `@Transactional` at the **Service layer** where business logic lives. One service method = one business transaction.
:::
