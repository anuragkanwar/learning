---
sidebar_position: 2
title: "Chapter 2: Context & Beans"
---

# Chapter 2: Spring Context and Beans

## What is a Spring Bean?

- An **object** that is instantiated, assembled, and managed by the Spring IoC container.
- Unlike regular Java objects (`new MyClass()`), beans are "managed" throughout their existence in the application.
- **POJO based**: Any normal Java class can be a bean.
- Lives inside the **Spring Container**.

---

## What is Spring Context?

- The **Inversion of Control (IoC) Container**.
- Represented by the `ApplicationContext` interface.
- Acts as a **central registry** (the "Bucket") for all beans.
- Responsibilities:
    - Instantiating beans based on configuration.
    - Providing a registry to look up beans.
    - Managing the environment and property sources.

### Common Context Implementations
| Implementation | Description | Use Case |
|----------------|-------------|----------|
| `AnnotationConfigApplicationContext` | Loads beans from `@Configuration` classes | Standard Java apps |
| `WebApplicationContext` | Integrated with Servlet API | Spring MVC apps |
| `ClassPathXmlApplicationContext` | Loads from XML files | Legacy apps |

---

## Defining Beans: Three Main Ways

### 1. Stereotype Annotations (Automatic Discovery)
Spring scans your classpath and automatically creates beans for classes marked with these. This is the most common way for your own code.

| Annotation | Use Case |
|------------|----------|
| `@Component` | Generic managed component |
| `@Service` | Business logic layer |
| `@Repository` | Persistence layer (adds automatic DB exception translation) |
| `@Controller` | Web MVC layer |

```java
@Service // Spring automatically finds and registers this
public class PaymentService {
    public void process() { ... }
}
```

### 2. `@Bean` in `@Configuration` (Explicit Definition)
Used for **third-party libraries** where you cannot add `@Component` to the source code, or when you need complex logic to create an object.

```java
@Configuration
public class AppConfig {
    
    @Bean // The method name becomes the Bean ID
    public RestTemplate restTemplate() {
        // You have full control over how the object is created
        RestTemplate restTemplate = new RestTemplate();
        restTemplate.setConnectTimeout(Duration.ofSeconds(5));
        return restTemplate;
    }
}
```

### 3. XML Configuration (Legacy)
Externalizes configuration without recompiling code. Rare in modern Spring but still supported.

```xml
<bean id="myBean" class="com.example.MyClass" />
```

---

## Handling Bean Conflicts (Ambiguity)

If you define two beans of the **same type**, Spring won't know which one to use when one is requested.

### 1. `@Primary`
- Designates a "default" bean. When someone asks for this type, Spring picks the primary one unless told otherwise.

```java
@Component
@Primary // This is the default choice
public class LocalFileStore implements FileStore {}

@Component
public class S3FileStore implements FileStore {}
```

### 2. `@Qualifier`
- Gives a specific name to a bean so you can refer to it specifically later.

```java
@Component
@Qualifier("fastStore")
public class RedisStore implements DataStore {}
```

### 3. Bean Naming Strategy
- By default, bean name is the class name in **lowerCamelCase**.
    - `PaymentService` -> `"paymentService"`.
- You can override names: 
    - `@Component("myCustomName")`
    - `@Bean("otherName")`

---

## Key Annotations Cheat Sheet

| Annotation | Purpose |
|------------|---------|
| `@Configuration` | Marks a class as a source of bean definitions. |
| `@ComponentScan` | Tells Spring where to look for `@Component` classes. |
| `@Bean` | Defines a single bean inside a configuration class. |
| `@Primary` | Resolves ambiguity by marking a preferred bean. |
| `@Qualifier` | Resolves ambiguity by identifying a bean by name. |
| `@Lazy` | Delays bean creation until the first time it is used. |

---

## Real World Production Use Case

### Scenario: Registering 3rd Party Clients
In production, you often need to register clients for external services (like AWS, Algolia, or Stripe). Since you can't edit their code to add `@Component`, you use `@Bean`.

```java
@Configuration
public class ExternalApiConfig {

    @Bean
    public AmazonS3 s3Client() {
        return AmazonS3ClientBuilder.standard()
                .withRegion(Regions.US_EAST_1)
                .build();
    }
}
```

### Scenario: Environment-Specific Beans
Defining different beans for different environments (e.g., a "Mock" mail service for dev and a "Real" one for prod).

```java
@Configuration
public class MailConfig {

    @Bean
    @Primary
    public MailService realMailService() {
        return new SmtpMailService();
    }

    @Bean
    @Qualifier("mock")
    public MailService mockMailService() {
        return new DevLoggingMailService();
    }
}
```

---

## Pitfalls to Avoid

:::danger NoUniqueBeanDefinitionException
This happens if you have two beans of the same interface/class and Spring doesn't have a `@Primary` or a way to distinguish them.
:::

:::warning Naming Collisions
If two classes in different packages have the same name (e.g., `user.Service` and `admin.Service`), Spring will throw an error during scanning unless you give them unique names via `@Component("name")`.
:::

:::tip Bean vs. Regular Object
Don't make everything a bean. If an object doesn't need to be shared, doesn't need dependencies, and has no lifecycle needs (like a simple `User` model/DTO), just use `new User()`.
:::
