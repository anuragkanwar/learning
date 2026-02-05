---
sidebar_position: 4
title: "Chapter 4: Abstractions & Stereotypes"
---

# Chapter 4: Abstractions & Component Stereotypes

## Why Use Interfaces?

In Spring, you should almost always **inject interfaces**, not concrete classes.

- **Loose Coupling**: The consumer doesn't know *how* the logic is implemented.
- **Swappability**: You can change the implementation (e.g., SQL to MongoDB) without changing the dependent code.
- **Testability**: Allows easy mocking with tools like Mockito (JDK Dynamic Proxies).
- **Contracts**: Defines strict boundaries of what a bean *can* do.

### The Contract Pattern
1. **Define** the Interface (The Contract).
2. **Implement** the Interface (The Logic).
3. **Inject** the Interface (The Wiring).

```java
// 1. The Contract
public interface CloudStorage {
    void upload(File file);
}

// 2. The Implementation
@Service
public class AwsStorage implements CloudStorage {
    public void upload(File file) { /* AWS S3 logic */ }
}

// 3. The Injection
@Service
public class ImageService {
    private final CloudStorage storage; // ✅ Inject Interface
    
    // private final AwsStorage storage; // ❌ BAD: Tight coupling
    
    public ImageService(CloudStorage storage) {
        this.storage = storage;
    }
}
```

---

## Component Stereotypes (Roles)

While `@Component` is the generic annotation, Spring provides specialized stereotypes to define **architectural roles**. These aren't just for show; they carry specific behaviors.

| Annotation | Layer | Semantic Responsibility | Special Behavior |
|------------|-------|-------------------------|------------------|
| `@Component` | General | Generic utility/managed bean | None |
| `@Repository`| Persistence | Database/External API access | **Automatic Exception Translation** (converts SQL exceptions to Spring `DataAccessException`) |
| `@Service` | Business | Business logic, transactions | Ideal place for `@Transactional` |
| `@Controller`| Presentation| Handles Web/HTTP requests | Mapped by `DispatcherServlet` |
| `@RestController` | API | JSON/XML REST endpoints | Combines `@Controller` + `@ResponseBody` |

### Deep Dive: `@Repository` Magic
Spring automatically wraps classes annotated with `@Repository` in a proxy that catches platform-specific exceptions (like `SQLException` or Hibernate exceptions) and re-throws them as Spring's **unchecked** `DataAccessException`.

```java
@Repository
public class JdbcUserDao implements UserDao {
    public void save(User user) {
        // If this throws SQLException...
        jdbcTemplate.update("INSERT...", user.getName()); 
        // Spring catches it -> throws DataIntegrityViolationException (Runtime)
    }
}
```

---

## Coding to Interfaces in Practice

### Strategy Pattern (Runtime Selection)
You can inject a `Map<String, Interface>` to select implementations dynamically.

```java
public interface PaymentProvider {
    void pay(double amount);
}

@Component("paypal")
public class PayPalProvider implements PaymentProvider { ... }

@Component("stripe")
public class StripeProvider implements PaymentProvider { ... }

@Service
public class PaymentService {
    private final Map<String, PaymentProvider> providers;

    // Injects: {"paypal": PayPalProvider, "stripe": StripeProvider}
    public PaymentService(Map<String, PaymentProvider> providers) {
        this.providers = providers;
    }

    public void process(String method, double amount) {
        // method = "stripe"
        providers.get(method).pay(amount);
    }
}
```

---

## Real World Production Use Case

### Scenario: Feature Flagging with Abstractions
You are migrating from a legacy emailing system to SendGrid. You want to switch back and forth easily using configuration/profiles.

1. **The Contract**:
```java
public interface EmailSender {
    void sendEmail(String to, String body);
}
```

2. **Legacy Impl**:
```java
@Service
@Profile("legacy") // Only active when 'legacy' profile is set
public class SmtpSender implements EmailSender { ... }
```

3. **Modern Impl**:
```java
@Service
@Profile("modern") // Only active when 'modern' profile is set
public class SendGridSender implements EmailSender { ... }
```

4. **The Consumer (Unaware of change)**:
```java
@Service
public class NotificationService {
    private final EmailSender emailSender; // Doesn't care which one is active

    public NotificationService(EmailSender emailSender) {
        this.emailSender = emailSender;
    }
}
```

---

## Common Pitfalls

:::danger Interface Explosion (one-to-one)
Don't create an interface for **every** single class (e.g., `CustomerServiceImpl` implementing `CustomerService`).
**Rule of Thumb**: Create an interface if:
1. You expect multiple implementations (now or later).
2. You need to use JDK Dynamic Proxies (AOP).
3. It clearly defines a module boundary.
If it's internal domain logic with only one way to do it, a concrete class is often fine.
:::

:::warning Leaky Abstractions
Do not put implementation details in the interface.
**Bad:** `interface FileStore { void saveToS3(File f); }`
**Good:** `interface FileStore { void save(File f); }`
:::

:::tip Mixing Stereotypes
Technically, you can put `@Service` on a DAO or `@Component` on a Controller, and it *might* work, but you lose the specific benefits (like Exception Translation on Repositories) and confuse other developers. Stick to the layers.
:::
