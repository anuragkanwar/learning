---
sidebar_position: 1
title: "Intro to AOP"
---

# Introduction to AOP

## What is AOP?

**Aspect-Oriented Programming (AOP)** separates **business logic** (what your code does) from **cross-cutting concerns** (infrastructure plumbing).

**Cross-Cutting Concerns** are functionalities that cut across multiple modules:
- Logging
- Security / Authorization
- Transaction Management
- Caching
- Error Handling

:::tip Analogy
**Business Logic**: The act of transferring money in a bank.
**AOP**: The security guard, the CCTV camera, and the audit log. They exist *around* the transaction but aren't part of the math itself.
:::

---

## Core Terminology

| Term | Definition |
|------|------------|
| **Aspect** | The class containing the cross-cutting logic (e.g., `LoggingAspect`). |
| **Join Point** | A point in the application execution. In Spring AOP, this is **always a method execution**. |
| **Advice** | The action taken by an aspect at a particular Join Point (e.g., "Log this"). |
| **Pointcut** | An expression that defines **WHERE** (which methods) the advice should run. |
| **Weaving** | The process of linking aspects to target objects. Spring uses **Runtime Proxy Weaving**. |
| **Target Object** | The object being advised (the real business service). |

---

## Types of Advice

| Annotation | When it runs | Use Case |
|------------|--------------|----------|
| `@Before` | Before method execution | Validation, Auth checks |
| `@AfterReturning` | After successful return | Logging success, modifying return value |
| `@AfterThrowing` | After an exception is thrown | Error logging, alert emails |
| `@After` | Finally (Always runs) | Resource cleanup (rarely used) |
| `@Around` | **Before AND After** | Transactions, Timing, Caching, Retry logic |

---

## Enabling AOP

In Spring Boot, AOP is auto-configured.
If you are using legacy Spring, you need:

```java
@Configuration
@EnableAspectJAutoProxy
public class AppConfig { ... }
```

---

## A Simple Aspect

```java
@Aspect
@Component
public class LoggingAspect {

    /**
     * Pointcut: Matches any method in UserService
     */
    @Before("execution(* com.example.service.UserService.*(..))")
    public void logBefore(JoinPoint joinPoint) {
        System.out.println("Executing: " + joinPoint.getSignature().getName());
    }
}
```
