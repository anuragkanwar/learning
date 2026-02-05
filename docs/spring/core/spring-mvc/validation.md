---
sidebar_position: 4
title: "8.4 Validation & Web Scopes"
---

# 8.4 Validation & Web Scopes

## Bean Scopes in Web Applications

Spring MVC provides web-specific scopes for beans that need to live only during a request or session.

| Annotation | Scope | Lifecycle |
|------------|-------|-----------|
| `@RequestScope` | One per HTTP request | Created at request start, destroyed after response |
| `@SessionScope` | One per HTTP session | Lives until session expires or user logs out |
| `@ApplicationScope` | One per ServletContext | Lives as long as the web app runs |

```java
@Component
@RequestScope
public class RequestContext {
    private String requestId;
    private String userAgent;
    // Getters/setters - stores data for single request
}

@Component
@SessionScope
public class UserSession {
    private String userId;
    private ShoppingCart cart;
    // Lives across multiple requests from same user
}
```

:::warning Injecting Web Scopes
When injecting `@RequestScope` or `@SessionScope` beans into singletons (like `@Service`), use `ScopedProxyMode.TARGET_CLASS` or `ObjectFactory` to avoid issues.
:::

---

## Setup

Add `spring-boot-starter-validation` dependency.

---

## Validating Request Bodies

Use `@Valid` to trigger validation on `@RequestBody` objects.

```java
public class CreateUserRequest {
    
    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 50, message = "Name must be between 2 and 50 characters")
    private String name;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;
    
    @Min(value = 18, message = "Must be at least 18 years old")
    private int age;
    
    // getters/setters
}
```

```java
@PostMapping("/users")
public ResponseEntity<User> createUser(
    @Valid @RequestBody CreateUserRequest request  // Triggers validation
) {
    // If validation fails, MethodArgumentNotValidException is thrown
    // Handle in @ControllerAdvice
    return ResponseEntity.ok(userService.create(request));
}
```

---

## Validating Path/Query Parameters

```java
@GetMapping("/users/{id}")
public User getUser(
    @PathVariable @Positive(message = "ID must be positive") Long id
) { ... }

@GetMapping("/search")
public List<User> search(
    @RequestParam @NotBlank String name
) { ... }
```

---

## Common Validation Annotations

| Annotation | Purpose |
|------------|---------|
| `@NotNull` | Value must not be null |
| `@NotBlank` | String must not be null, empty, or whitespace |
| `@NotEmpty` | Collection or String must not be empty |
| `@Size(min, max)` | Size of String or Collection |
| `@Min(value)` | Number must be greater than or equal to value |
| `@Max(value)` | Number must be less than or equal to value |
| `@Positive` | Number must be greater than 0 |
| `@Email` | Must be valid email format |
| `@Pattern(regex)` | Must match regex pattern |

---

## Custom Validation

Create reusable custom validators.

```java
// Annotation
@Target({ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = PhoneValidator.class)
public @interface ValidPhone {
    String message() default "Invalid phone number";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

// Validator
public class PhoneValidator implements ConstraintValidator<ValidPhone, String> {
    @Override
    public boolean isValid(String phone, ConstraintValidatorContext context) {
        if (phone == null) return true; // @NotNull handles null
        return phone.matches("^\\+?[0-9]{10,15}$");
    }
}

// Usage
public class UserRequest {
    @ValidPhone
    private String phoneNumber;
}
```

---

## Group Validation

Validate different rules for different scenarios (create vs update).

```java
public interface OnCreate {}
public interface OnUpdate {}

public class UserRequest {
    @NotNull(groups = OnUpdate.class) // Only required on update
    private Long id;
    
    @NotBlank(groups = {OnCreate.class, OnUpdate.class})
    private String name;
}

@PostMapping
public User create(
    @Validated(OnCreate.class) @RequestBody UserRequest request
) { ... }

@PutMapping("/{id}")
public User update(
    @Validated(OnUpdate.class) @RequestBody UserRequest request
) { ... }
```
