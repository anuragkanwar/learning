---
sidebar_position: 1
title: "Chapter 1: Introduction"
---

# Chapter 1: What is Spring?

## The Problem Spring Solves

Building enterprise Java applications used to be painful.

- **EJB (Enterprise JavaBeans)** required heavy, bloated containers
- **Tight coupling** made code hard to test and change
- **Boilerplate code** consumed 80% of development time
- **Dependencies** were hardcoded, making swapping implementations impossible

Spring was created in 2003 to solve these problems.

---

## What is Spring Framework?

Spring is a **lightweight, modular Java framework** that provides:

- **Infrastructure support** for building Java applications
- **Loose coupling** through Dependency Injection
- **Plumbing code** so you focus on business logic
- **Integration** with databases, messaging, web, and more

:::tip Core Idea
Spring handles the "how" so you can focus on the "what."
:::

---

## Why Use Spring?

| Without Spring | With Spring |
|---------------|-------------|
| Manually create objects | Container creates and wires objects |
| Hardcoded dependencies | Configurable, swappable dependencies |
| Write transaction boilerplate | `@Transactional` annotation |
| Manual database connection handling | Connection pooling auto-configured |
| Complex testing setup | Easy mocking and unit testing |

**Real-world impact:**
- Reduce boilerplate by **60-70%**
- Test code without deploying to server
- Swap database or services with config changes

---

## What Spring Provides

### Core Container
The foundation. Manages objects (beans) and their lifecycle.

### Data Access
Simplifies database interactions with JDBC, JPA, and transaction management.

### Web Framework
Build web apps and REST APIs with Spring MVC and Spring WebFlux.

### Integration
Connect with messaging systems, external APIs, and enterprise services.

### Security
Authentication, authorization, and protection against common attacks.

### Testing
First-class support for unit and integration testing.

---

## Spring Ecosystem

```
Spring Framework (Core)
    ↓
Spring Boot (Opinionated defaults)
    ↓
Spring Data (Database access)
Spring Security (Auth & security)
Spring Cloud (Microservices)
Spring Batch (Batch processing)
```

:::note
This book focuses on **Spring Framework Core**. Spring Boot and others build on these foundations.
:::

---

## A Simple Example

**Without Spring:**
```java
public class OrderService {
    // Hardcoded dependency - can't swap easily
    private DatabaseConnection db = new MySQLConnection();
    
    public void processOrder() {
        db.connect(); // Manual connection handling
        // ... business logic
    }
}
```

**With Spring:**
```java
@Service
public class OrderService {
    private final OrderRepository repository;
    
    // Dependency injected automatically
    public OrderService(OrderRepository repository) {
        this.repository = repository;
    }
    
    @Transactional
    public void processOrder(Order order) {
        repository.save(order); // Spring handles transactions
    }
}
```

---

## Key Principles

1. **Inversion of Control (IoC)** — Don't call framework, framework calls you
2. **Dependency Injection** — Dependencies provided, not created
3. **Convention over Configuration** — Sensible defaults, minimal setup
4. **Modularity** — Use only what you need

---

## What You Will Learn

This book covers Spring Core in depth:

1. **Dependency Injection** — How Spring wires components
2. **Bean Lifecycle** — Creation, initialization, and destruction
3. **Configuration** — Java-based and annotation-driven setup
4. **AOP** — Cross-cutting concerns like logging and transactions
5. **Data Access** — Working with databases the Spring way
6. **Testing** — Writing effective Spring tests
7. **Web MVC** — Building web applications

:::tip
Each chapter builds on the previous. Start from the beginning if you're new to Spring.
:::

---

## Who Should Read This?

- Java developers new to Spring
- Developers migrating from other frameworks
- Anyone preparing for Spring interviews
- Teams standardizing on Spring for new projects

---

## Prerequisites

- Basic Java knowledge (classes, interfaces, exceptions)
- Familiarity with Maven or Gradle
- Understanding of databases and SQL
- Optional: Experience with any web framework
