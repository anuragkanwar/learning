---
sidebar_position: 2
title: "Pointcuts & Advice"
---

# Pointcuts & Advice Deep Dive

## Pointcut Expression Cheat Sheet

The syntax for `execution` is:
`execution(modifiers? return-type package.class.method(args) throws?)`

| Designator | Pattern | Meaning |
|------------|---------|---------|
| `execution` | `* com.service.*.*(..)` | Any method in `com.service` package. |
| `execution` | `String com..*.*(String)` | Any method returning `String` taking 1 `String` arg. |
| `within` | `com.service.*` | Any join point within the service package (coarser than execution). |
| `bean` | `bean(*Service)` | Any bean ending with "Service". |
| `@annotation` | `@annotation(com.Track)` | Any method annotated with `@Track`. |
| `args` | `args(java.lang.String)` | Any method taking a single String argument. |

:::tip
Use `@annotation` for the cleanest AOP. It decouples the aspect from specific class names.
:::

---

## Mastering `@Around` Advice

`@Around` is the most powerful advice. It can:
1.  Inspect arguments.
2.  **Skip** the method entirely.
3.  **Modify** the return value.
4.  **Wrap** the method in a try-catch block (swallow exceptions).

**Crucial**: You MUST call `proceed()` or the original method will never run.

```java
@Aspect
@Component
public class PerformanceAspect {

    @Around("@annotation(com.example.TrackTime)")
    public Object measure(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.currentTimeMillis();
        
        try {
            // 1. Proceed with original logic
            Object result = pjp.proceed(); 
            
            // 2. You can modify the result here
            return result;
            
        } catch (Exception e) {
            // 3. You can swallow or rethrow exceptions
            throw e;
        } finally {
            // 4. Always runs
            long time = System.currentTimeMillis() - start;
            System.out.println(pjp.getSignature() + " took " + time + "ms");
        }
    }
}
```

---

## Accessing Method Arguments

You can access the actual arguments passed to the method using `JoinPoint`.

```java
@Before("execution(* com.example.UserService.updateUser(..))")
public void validateUser(JoinPoint joinPoint) {
    Object[] args = joinPoint.getArgs();
    
    if (args[0] instanceof User) {
        User user = (User) args[0];
        if (user.getEmail() == null) {
            throw new IllegalArgumentException("Email cannot be null");
        }
    }
}
```

---

## Aspect Ordering

If multiple aspects target the same method, the order is undefined unless you specify it.
Use `@Order(n)` where `n` is the priority.

**Low Number = High Priority (Outer Layer of the Onion)**

```java
@Aspect @Order(1) public class SecurityAspect { ... } // Runs 1st
@Aspect @Order(2) public class TransactionAspect { ... } // Runs 2nd
```

**Execution Flow:**
```
Security (Before)
  -> Transaction (Before)
      -> Target Method
  -> Transaction (After)
Security (After)
```
