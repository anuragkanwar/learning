# Event-Based Flows in Spring

## The Core Problem: Tight Coupling

In a traditional tightly-coupled system, your services know about each other and call each other directly. Consider a **Life Planner** application with modules for habits, health, and finance:

```java
// The Tightly Coupled Way
public class HabitService {
    private final HealthService healthService;
    private final FinanceService financeService;
    private final NotificationService notificationService;

    public void completeHabit(Long habitId) {
        // 1. Update habit in DB
        habitRepository.markCompleted(habitId);

        // 2. Log calories burned in the health module
        healthService.logActivity(habitId);

        // 3. Add a small monetary reward to the finance tracker
        financeService.addReward(habitId);

        // 4. Send a push notification
        notificationService.send("Great job on your workout!");
    }
}
```

### Why This Fails at Scale

- **Bloat:** `HabitService` now needs to know about health, finance, and notifications. It accumulates too many dependencies.
- **Circular Dependencies:** If `FinanceService` also needs to call `HabitService`, Spring throws a circular dependency error on startup.
- **Fragility:** If `notificationService` crashes or takes too long, the entire `completeHabit` transaction might fail or lag.
- **Violates Open/Closed Principle:** To add a new feature like `AchievementService`, you must modify `HabitService`.

---

## The Solution: Spring Events (Decoupling)

Spring Events allow components to communicate without knowing about each other. The architecture shifts from **"Hey you, do this"** to **"Hey everyone, this just happened."**

### Publisher (HabitService)

```java
public class HabitService {
    private final ApplicationEventPublisher publisher;

    public void completeHabit(Long habitId) {
        // 1. Update habit in DB
        habitRepository.markCompleted(habitId);

        // 2. Shout into the void that a habit was completed
        publisher.publishEvent(new HabitCompletedEvent(this, habitId));
    }
}
```

### Listeners (Anywhere in Your Application)

```java
@Component
public class HealthModuleListener {
    @EventListener
    public void handleHabitCompleted(HabitCompletedEvent event) {
        // Automatically logs health stats when it hears the event
    }
}

@Component
public class FinanceModuleListener {
    @EventListener
    public void handleHabitCompleted(HabitCompletedEvent event) {
        // Adds monetary reward when it hears the event
    }
}

@Component
public class NotificationListener {
    @EventListener
    public void handleHabitCompleted(HabitCompletedEvent event) {
        // Sends push notification
    }
}
```

---

## Key Benefits

### 1. Open/Closed Principle
Add new features without touching existing code. Create a new listener to handle `HabitCompletedEvent` for badges, achievements, or analytics.

### 2. Transactional Safety with `@TransactionalEventListener`

Execute listeners **only after the database transaction commits**:

```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void handleHabitCompleted(HabitCompletedEvent event) {
    // Only runs if the habit completion transaction succeeds
    // Prevents: "Email sent: Account Created!" but transaction rolled back
}
```

:::danger
Without `@TransactionalEventListener`, your listener executes immediately—even if the transaction rolls back later.
:::

### 3. Seamless Async Processing

Add `@Async` to run listeners on a separate thread:

```java
@Async
@EventListener
public void handleHabitCompleted(HabitCompletedEvent event) {
    notificationService.send("Great job!");
}
```

User gets an instant API response while email sends in the background.

### 4. Team Autonomy
Different teams can work on different domains (Finance, Health, Habits) without coordinating code changes. They just agree on the event contract.

---

## When to Use Spring Events

Use events when you see these patterns:

| Scenario | Example |
|----------|---------|
| **Crossing Domain Boundaries** | Habit completion triggers health score update and finance allowance adjustment |
| **"Fire and Forget" Side Effects** | Sending welcome emails, pushing notifications, logging audit trails |
| **Pluggable Features** | Adding achievements/badges later without modifying core code |
| **Decouple Slow Operations** | Third-party API calls that would slow down the main response |

---

## When NOT to Use Spring Events

Avoid events when you see these patterns:

| Scenario | Why |
|----------|-----|
| **Strict Sequential Workflows** | Step B *must* happen immediately after Step A. Events hide the flow. |
| **Transactional Dependency** | If Step B fails, Step A must rollback. Events make rollback extremely difficult. |
| **Simple CRUD Operations** | Saving an entity and returning it—events are over-engineering here. |

### Example: Money Transfer (Do NOT Use Events)

```java
// This MUST be a direct call, NOT an event
@Transactional
public void transferMoney(Long fromAccount, Long toAccount, BigDecimal amount) {
    accountService.deduct(fromAccount, amount);  // Step 1
    accountService.add(toAccount, amount);        // Step 2 - MUST happen after Step 1
}
```

If Step 2 fails, Step 1 must rollback. Events cannot guarantee this atomicity.

---

## The Decision Framework: The "Who Cares?" Test

Ask yourself: **"If the second step fails, does the first step care?"**

### Scenario A: Chronological Reactions (Use Events)

- **Flow:** User completes a habit → Update Health Score → Adjust Finance Allowance
- **Failure:** Finance module has a bug and throws an error
- **Question:** Does the Habit module care? **No.** The user still ran. The habit is still completed.
- **Verdict:** Use Spring Events. These are independent side effects.

### Scenario B: Strict Sequential Transactions (Do NOT Use Events)

- **Flow:** Transfer ₹1000 from "Entertainment" to "Savings"
- **Step 1:** Deduct ₹1000 from Entertainment
- **Step 2:** Add ₹1000 to Savings
- **Failure:** Adding to savings fails (database lock)
- **Question:** Does Step 1 care? **Yes.** That ₹1000 vanished into thin air.
- **Verdict:** Keep tightly coupled in a single `@Transactional` method.

---

## Real-World Use Cases

### 1. User Registration (The Classic Example)

```java
// WITHOUT events - User waits 4+ seconds for signup
@Transactional
public void registerUser(UserDto dto) {
    User user = userRepository.save(new User(dto));
    emailService.sendWelcomeEmail(user.getEmail());           // Slow
    financeModule.createDefaultBudgetTemplate(user.getId());  // Slow
    habitModule.createStarterHabits(user.getId());             // Slow
    analyticsService.logNewSignup(user.getId());               // Slow
}
```

**With events:** Save user → Return 200 OK instantly → Listeners handle side effects asynchronously.

**Why events work here:**
- Email failure should NOT rollback user registration
- Future features (Mailchimp sync) can be added without touching `UserService`

### 2. Audit Logging

```java
// BAD: Pollutes business logic
public void updateTransaction(Transaction tx) {
    transactionRepository.save(tx);
    auditRepository.save(new AuditLog("Updated transaction"));  // Don't mix concerns
}

// GOOD: Use events
public void updateTransaction(Transaction tx) {
    transactionRepository.save(tx);
    publisher.publishEvent(new TransactionUpdatedEvent(tx));
}

@Component
public class AuditListener {
    @EventListener
    public void onTransactionUpdated(TransactionUpdatedEvent event) {
        auditRepository.save(new AuditLog("Updated: " + event.getTransaction().getId()));
    }
}
```

A single `AuditListener` catches ALL updates across the application without cluttering business logic.

---

## The Trade-off: Traceability

| Approach | Traceability | Debugging |
|----------|-------------|-----------|
| **Tight Coupling** | Ctrl+Click to see the full story | Easy - call stack is obvious |
| **Spring Events** | Search codebase for `@EventListener` | Harder - "what triggered what?" |

**Warning:** Overuse events and your code becomes magic. When a bug occurs, you have no idea what triggered what.

---

## Summary

| Concept | Use Events? | Reason |
|---------|-------------|--------|
| User Registration → Welcome Email | ✅ Yes | Independent side effect |
| Habit Completed → Health + Finance update | ✅ Yes | Domain boundaries crossed |
| Money Transfer | ❌ No | Must be atomic |
| CRUD: Save entity and return | ❌ No | Over-engineering |
| Audit logging | ✅ Yes | Cross-cutting concern |
| Sequential workflow | ❌ No | Flow must be obvious |
