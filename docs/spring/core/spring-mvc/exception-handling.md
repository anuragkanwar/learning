---
sidebar_position: 3
title: "8.3 Exception Handling"
---

# 8.3 Exception Handling in Spring MVC

## The Problem

If an exception is thrown in a controller, Spring returns a default error page or stack trace (in dev). This is bad for APIs.

**Without handling:**
- Client receives HTML error page (for JSON API!)
- HTTP status is 500 for all errors
- No structured error response

---

## @ControllerAdvice (Global Exception Handler)

`@ControllerAdvice` allows you to handle exceptions **centrally** for all controllers.

```java
@RestControllerAdvice // Combines @ControllerAdvice + @ResponseBody
public class GlobalExceptionHandler {

    // Handle specific exception
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException ex) {
        ErrorResponse error = new ErrorResponse(
            HttpStatus.NOT_FOUND.value(),
            ex.getMessage(),
            LocalDateTime.now()
        );
        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }

    // Handle validation errors
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(MethodArgumentNotValidException ex) {
        List<String> errors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .collect(Collectors.toList());
        
        ErrorResponse error = new ErrorResponse(
            HttpStatus.BAD_REQUEST.value(),
            "Validation failed",
            errors
        );
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    // Catch-all handler
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
        ErrorResponse error = new ErrorResponse(
            HttpStatus.INTERNAL_SERVER_ERROR.value(),
            "An unexpected error occurred",
            LocalDateTime.now()
        );
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
```

---

## Response Status Annotation

For simple cases, annotate your exception class directly.

```java
@ResponseStatus(HttpStatus.NOT_FOUND)
public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(String message) {
        super(message);
    }
}

// Now anywhere you throw this, Spring returns 404 automatically
@GetMapping("/users/{id}")
public User getUser(@PathVariable Long id) {
    return repo.findById(id)
        .orElseThrow(() -> new UserNotFoundException("User " + id + " not found"));
}
```

---

## Standard Error Response Structure

Create a consistent error format for your API:

```java
public class ErrorResponse {
    private int status;
    private String message;
    private LocalDateTime timestamp;
    private List<String> errors; // For validation
    
    // constructors, getters
}
```

**Example Response:**
```json
{
    "status": 400,
    "message": "Validation failed",
    "timestamp": "2023-12-01T10:30:00",
    "errors": [
        "email: must be a valid email address",
        "name: size must be between 2 and 50"
    ]
}
```

---

## Controller-Level Exception Handling

For exceptions only relevant to one controller, use `@ExceptionHandler` inside the controller.

```java
@RestController
@RequestMapping("/orders")
public class OrderController {

    @ExceptionHandler(OrderNotFoundException.class)
    public ResponseEntity<String> handleOrderNotFound(OrderNotFoundException ex) {
        return ResponseEntity.status(404).body(ex.getMessage());
    }
}
```

:::tip
Use `@ControllerAdvice` for global exceptions (DB errors, auth errors).
Use controller-level `@ExceptionHandler` for controller-specific logic.
:::
