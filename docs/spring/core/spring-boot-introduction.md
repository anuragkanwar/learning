---
sidebar_position: 7
title: "Spring Boot Introduction"
---

# Spring Boot Introduction

## What is Spring Boot?

Spring Boot is an **opinionated framework** built **on top of Spring Framework** that simplifies setup and development.

While Spring Framework provides the **flexibility** to configure everything, Spring Boot provides **sensible defaults** so you can start immediately.

| Spring Framework | Spring Boot |
|------------------|-------------|
| Manual configuration (`@Configuration`) | Auto-configuration (Zero config) |
| External Tomcat setup | Embedded Tomcat (Run with `main()`) |
| Complex dependency management | Starter dependencies (single line) |
| XML or Java config | `application.properties` convention |
| Boilerplate code | Production-ready features out-of-box |

:::tip Core Philosophy
**"Convention over Configuration"** — Do what most people want by default, allow customization only when needed.
:::

---

## Key Features

### 1. Auto-Configuration
Spring Boot guesses what you need based on the classpath.

- **Found H2 on classpath?** → Auto-configures an in-memory database.
- **Found Spring Web?** → Auto-configures embedded Tomcat.
- **Found Spring Data JPA?** → Auto-configures a DataSource and EntityManager.

```java
// Just add dependencies. No XML. No @Configuration needed for basics.
// Tomcat starts automatically.
```

### 2. Starter Dependencies
A **Starter** is a curated set of compatible dependencies.

| Starter | Includes |
|---------|----------|
| `spring-boot-starter-web` | Spring MVC, Tomcat, Jackson, Validation |
| `spring-boot-starter-data-jpa` | Spring Data, Hibernate, HikariCP |
| `spring-boot-starter-test` | JUnit, Mockito, AssertJ, Spring Test |
| `spring-boot-starter-security` | Spring Security, Password encoding |

```xml
<!-- One dependency instead of 10+ -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

### 3. Embedded Servers
No need to deploy WAR files to external Tomcat.

```java
// Run like a normal Java application
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

### 4. Externalized Configuration
Configure everything in one place: `application.properties` or `application.yml`.

```yaml
# application.yml
server:
  port: 8080
spring:
  datasource:
    url: jdbc:mysql://localhost/db
    username: root
  jpa:
    hibernate:
      ddl-auto: update
```

---

## The @SpringBootApplication Annotation

This single annotation combines three things:

```java
@SpringBootApplication
public class Application { ... }

// Is equivalent to:
@Configuration          // Marks this as a configuration class
@EnableAutoConfiguration // Enables the magic auto-config
@ComponentScan          // Scans for @Component in this package and below
```

---

## Spring Boot vs Spring Framework

| Feature | Spring Framework | Spring Boot |
|---------|------------------|-------------|
| **Setup Time** | Hours (XML/Config) | Minutes (Starter) |
| **Server** | External (Deploy WAR) | Embedded (Run JAR) |
| **Database** | Manual DataSource config | Auto-configured |
| **Metrics/Health** | Manual setup | Actuator built-in |
| **Use Case** | Enterprise customization | Rapid development, Microservices |

---

## Real World Production Example

### Building a REST API in 5 Minutes

**Step 1: pom.xml**
```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
</parent>

<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
</dependencies>
```

**Step 2: Application.java**
```java
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

**Step 3: Controller.java**
```java
@RestController
public class HelloController {
    
    @GetMapping("/hello")
    public String hello() {
        return "Hello World!";
    }
}
```

**Result**: Run `main()`. Tomcat starts on port 8080. API is live. No XML, no server setup.

---

## Spring Boot Actuator (Production Ready)

Add production-grade monitoring with one dependency:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

Endpoints exposed:
- `/actuator/health` — Is the app up?
- `/actuator/info` — App version/info
- `/actuator/metrics` — JVM, CPU, Memory stats

---

## Common Pitfalls

:::warning Component Scan Path
`@SpringBootApplication` scans only the current package and sub-packages. If you put classes in a sibling package, Spring won't find them.
```
com.example.app (Application.java here)
com.example.service (✅ Scanned)
com.other.util (❌ NOT scanned - different branch)
```
:::

:::danger Auto-Configuration Conflicts
If you define a bean manually (e.g., `DataSource`) that Boot also auto-configures, you might get conflicts. Use `@ConditionalOnMissingBean` or exclude specific auto-configs.
```java
@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})
```
:::

:::tip Profiles for Environments
Use `application-dev.properties` and `application-prod.properties`. Activate with `--spring.profiles.active=prod`.
:::
