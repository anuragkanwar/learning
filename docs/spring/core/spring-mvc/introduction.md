---
sidebar_position: 1
title: "8.1 MVC Architecture"
---

# 8.1 Spring MVC Architecture

## What is MVC?

**MVC (Model-View-Controller)** is a design pattern that separates an application into three logical components:

| Component | Responsibility | In Spring |
|-----------|----------------|-----------|
| **Model** | Data/Business Logic | POJOs, Services, Repositories |
| **View** | Presentation Layer | Thymeleaf, JSP, React (frontend) |
| **Controller** | Request Handling | `@Controller` or `@RestController` classes |

:::tip Analogy (Restaurant)
- **Customer** (Client) places an order
- **Waiter** (Controller) takes the order, gives it to kitchen
- **Chef** (Model/Service) prepares the food
- **Plate** (View) presents the food nicely
:::

---

## @Controller vs @RestController

| Annotation | Purpose | Use Case |
|------------|---------|----------|
| `@Controller` | Returns **Views** (HTML pages) | Traditional Server-Side Rendering |
| `@RestController` | Returns **Data** (JSON/XML) | REST APIs, Single Page Apps |

```java
// Returns HTML page (View)
@Controller
public class PageController {
    @GetMapping("/home")
    public String home(Model model) {
        model.addAttribute("msg", "Hello");
        return "home"; // resolves to home.html
    }
}

// Returns JSON data
@RestController
public class ApiController {
    @GetMapping("/api/user")
    public User getUser() {
        return new User("John", 30); // Automatically converted to JSON
    }
}
```

:::note
`@RestController` = `@Controller` + `@ResponseBody`. Every method returns data, not views.
:::

---

## The DispatcherServlet

**DispatcherServlet** is the **Front Controller** - the single entry point for all HTTP requests.

**Request Flow:**
1. Client sends HTTP Request
2. `DispatcherServlet` receives it
3. `HandlerMapping` finds the right Controller method
4. Controller executes business logic
5. `ViewResolver` (if needed) finds the view template
6. Response returned to Client

```
Client Request
     ↓
DispatcherServlet (Front Controller)
     ↓
Handler Mapping (Find @GetMapping)
     ↓
Controller Method
     ↓
Service Layer
     ↓
Database
     ↓
Controller (Wraps result)
     ↓
HttpMessageConverter (Object → JSON)
     ↓
Client Response
```

---

## Spring MVC for REST APIs

Modern Spring MVC is primarily used for building **REST APIs** (backend for SPAs/Mobile apps).

**REST Principles with Spring:**
- **Resource**: `/users`, `/orders`
- **HTTP Methods**: GET (read), POST (create), PUT (update), DELETE (remove)
- **Stateless**: No server-side session storage

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    @GetMapping
    public List<User> getAllUsers() { ... }

    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) { ... }

    @PostMapping
    public User createUser(@RequestBody User user) { ... }

    @PutMapping("/{id}")
    public User updateUser(@PathVariable Long id, @RequestBody User user) { ... }

    @DeleteMapping("/{id}")
    public void deleteUser(@PathVariable Long id) { ... }
}
```

---

## Key Annotations

| Annotation | Purpose |
|------------|---------|
| `@RequestMapping` | General mapping (can specify method, path, produces) |
| `@GetMapping` | Handle GET requests |
| `@PostMapping` | Handle POST requests |
| `@PutMapping` | Handle PUT requests |
| `@DeleteMapping` | Handle DELETE requests |
| `@PathVariable` | Extract value from URL path (`/users/{id}`) |
| `@RequestParam` | Extract value from query string (`?name=john`) |
| `@RequestBody` | Bind JSON request body to Java object |
| `@ResponseBody` | Return object as JSON (implicit in `@RestController`) |

---

## Common Pitfalls

:::warning PathVariable vs RequestParam
- **PathVariable**: `/users/123` → `@GetMapping("/{id}")` + `@PathVariable Long id`
- **RequestParam**: `/users?id=123` → `@RequestParam Long id`
- Don't mix them up in REST design. IDs usually go in path, filters in query.
:::

:::danger Returning Null
If your controller returns `null` or void with no `@ResponseStatus`, Spring returns HTTP 200 with empty body. Use `ResponseEntity` for proper status codes.
:::
