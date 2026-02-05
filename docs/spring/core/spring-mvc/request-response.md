---
sidebar_position: 2
title: "8.2 Request & Response"
---

# 8.2 Request & Response Handling

## Extracting Data from Requests

### 1. Path Variables
Extract values from the URL path itself.

```java
@GetMapping("/users/{userId}/orders/{orderId}")
public Order getOrder(
    @PathVariable Long userId, 
    @PathVariable Long orderId
) {
    // URL: /users/42/orders/100
    // userId = 42, orderId = 100
    return orderService.find(userId, orderId);
}
```

### 2. Query Parameters
Extract values from the query string (`?key=value`).

```java
@GetMapping("/users")
public List<User> searchUsers(
    @RequestParam String name,           // Required
    @RequestParam(required = false) Integer age,  // Optional
    @RequestParam(defaultValue = "10") int size   // Default value
) {
    // URL: /users?name=john&age=25&size=20
    return userService.search(name, age, size);
}
```

### 3. Request Body
Bind JSON payload to a Java object.

```java
@PostMapping("/users")
public User createUser(@RequestBody CreateUserRequest request) {
    // JSON: {"name": "John", "email": "john@example.com"}
    // Spring uses Jackson to map JSON → Java Object
    return userService.create(request);
}

// DTO Class
public class CreateUserRequest {
    private String name;
    private String email;
    // getters/setters
}
```

### 4. Headers
Extract HTTP headers.

```java
@GetMapping("/users/header")
public String getHeader(@RequestHeader("X-Api-Key") String apiKey) {
    return "API Key: " + apiKey;
}
```

---

## Returning Proper Responses

### ResponseEntity
Use `ResponseEntity` for full control over HTTP status, headers, and body.

```java
@GetMapping("/users/{id}")
public ResponseEntity<User> getUser(@PathVariable Long id) {
    User user = userService.findById(id);
    
    if (user == null) {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(null);
    }
    
    return ResponseEntity
        .ok()
        .header("X-Custom-Header", "value")
        .body(user);
}
```

### Common Status Codes

| Scenario | HTTP Status | Spring Constant |
|----------|-------------|-----------------|
| Success | 200 OK | `HttpStatus.OK` |
| Created | 201 Created | `HttpStatus.CREATED` |
| No Content | 204 No Content | `HttpStatus.NO_CONTENT` |
| Bad Request | 400 Bad Request | `HttpStatus.BAD_REQUEST` |
| Not Found | 404 Not Found | `HttpStatus.NOT_FOUND` |
| Server Error | 500 Internal Error | `HttpStatus.INTERNAL_SERVER_ERROR` |

```java
@PostMapping("/users")
public ResponseEntity<User> create(@RequestBody User user) {
    User created = userService.save(user);
    
    URI location = ServletUriComponentsBuilder
        .fromCurrentRequest()
        .path("/{id}")
        .buildAndExpand(created.getId())
        .toUri();
    
    return ResponseEntity
        .created(location) // 201 + Location header
        .body(created);
}
```

---

## Content Negotiation

Spring automatically converts objects to JSON (via Jackson) when you use `@RestController`.

```java
@RestController
public class ProductController {
    
    @GetMapping(value = "/products/{id}", produces = "application/json")
    public Product getProduct(@PathVariable Long id) {
        return productService.find(id); // Auto-converted to JSON
    }
}
```

---

## Common Pitfalls

:::danger Missing @RequestBody
If you forget `@RequestBody`, Spring tries to bind form data instead of JSON, and all fields will be null.

```java
// ❌ WRONG: All fields null
@PostMapping("/users")
public User create(User user) { ... }

// ✅ CORRECT: JSON binding
@PostMapping("/users")
public User create(@RequestBody User user) { ... }
```
:::

:::warning Date Format Issues
Jackson expects ISO format (`2023-01-01`) by default. Use `@DateTimeFormat` or configure ObjectMapper for custom formats.
:::
