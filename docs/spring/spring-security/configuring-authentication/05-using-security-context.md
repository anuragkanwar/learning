## Using SecurityContext

### Recap: The House Badge

After the Sorting Hat places Harry in Gryffindor, he receives a **house badge**. This badge:
- Proves he belongs at Hogwarts
- Grants access to the Gryffindor common room
- Lets him enter the library, dining hall, and classrooms
- Stays with him throughout his time at the castle

In Spring Security, this badge is the **`SecurityContext`**.

---

## What is SecurityContext?

The `SecurityContext` holds the **currently authenticated user** for the duration of a request.

```java
public interface SecurityContext {
    
    // Get the current authentication (the house badge)
    Authentication getAuthentication();
    
    // Set the authentication (give someone a badge)
    void setAuthentication(Authentication authentication);
}
```

**Simple Rule:**
- After login → `SecurityContext` holds your authenticated identity
- During the request → Any part of the app can ask "Who is this user?"
- After request → Context is cleared (badge returned)

---

## SecurityContextHolder — The Badge Holder

You don't interact with `SecurityContext` directly. Instead, you use **`SecurityContextHolder`** — a static helper that manages the context for the current thread.

```java
// Get the current user's badge anywhere in your code
Authentication auth = SecurityContextHolder.getContext().getAuthentication();
String username = auth.getName();  // "harry.potter"

// Check if user has a specific permission
boolean canPlayQuidditch = auth.getAuthorities().stream()
    .anyMatch(a -> a.getAuthority().equals("PLAY_QUIDDITCH"));
```

**Common Use Cases:**

```java
@Service
public class PotionService {
    
    public void brewPotion(PotionRecipe recipe) {
        // Get current wizard
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String wizardName = auth.getName();
        
        // Log who brewed what
        log.info("Wizard {} is brewing {}", wizardName, recipe.getName());
        
        // Check permissions
        if (!hasAuthority("BREW_POTIONS")) {
            throw new AccessDeniedException("Only potion masters can brew!");
        }
        
        // Brew the potion...
    }
    
    private boolean hasAuthority(String authority) {
        return SecurityContextHolder.getContext().getAuthentication()
            .getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals(authority));
    }
}
```

---

## Storage Strategies: Where Is the Badge Kept?

Spring Security can store the `SecurityContext` in different ways depending on your application type.

### Strategy 1: ThreadLocal (Default) — The Pocket

```
Mode: MODE_THREADLOCAL (default)
Best for: Standard web applications
```

Each HTTP request runs on its own thread. The context is stored in that thread's "pocket" (ThreadLocal).

```java
// Spring Boot default — no config needed
// Each request gets its own SecurityContext
```

**Pros:**
- Simple and fast
- Automatic cleanup after request
- Works for 95% of applications

**Cons:**
- Doesn't work with async operations (child threads lose the context)
- Each thread has its own isolated context

---

### Strategy 2: InheritableThreadLocal — The Family Badge

```
Mode: MODE_INHERITABLETHREADLOCAL
Best for: Async operations, child threads
```

When you create a new thread (for async tasks), it inherits the parent's SecurityContext.

```java
// Configure at application startup
@SpringBootApplication
public class HogwartsApplication {
    
    public static void main(String[] args) {
        // Enable inheritance for async tasks
        SecurityContextHolder.setStrategyName(
            SecurityContextHolder.MODE_INHERITABLETHREADLOCAL
        );
        
        SpringApplication.run(HogwartsApplication.class, args);
    }
}
```

**Use Case:**

```java
@Service
public class OwlPostService {
    
    @Async  // Runs in a new thread
    public void sendOwlAsync(String message) {
        // With INHERITABLETHREADLOCAL, this works!
        String wizard = SecurityContextHolder.getContext()
            .getAuthentication().getName();
        
        // Send owl post as this user
        owlClient.send(wizard, message);
    }
}
```

:::warning Limitations
- Works with direct child threads
- Doesn't work with thread pools (workers reuse threads)
- For thread pools, use delegation instead (see next section)
:::

---

### Strategy 3: Global — The Shared Badge Board

```
Mode: MODE_GLOBAL
Best for: Standalone applications, desktop apps
Never use for: Web applications!
```

All threads share the same SecurityContext. **Dangerous for web apps!**

```java
// Only for standalone apps
SecurityContextHolder.setStrategyName(
    SecurityContextHolder.MODE_GLOBAL
);
```

**Why dangerous for web?**
- All users share the same context
- User A's request might see User B's identity!

---

## Strategy Comparison

| Strategy | Storage | Best For | Thread Safe? |
|----------|---------|----------|--------------|
| `MODE_THREADLOCAL` | Per-thread | Standard web apps | ✅ Yes |
| `MODE_INHERITABLETHREADLOCAL` | Inherited by children | Async operations | ⚠️ Partial |
| `MODE_GLOBAL` | Single shared | Desktop apps only | ❌ No |

---

## Forwarding Security Context: Delegation Pattern

For **thread pools** and **async operations**, inheritance doesn't work well. Instead, you **manually forward** the context.

### DelegatingSecurityContextRunnable

Wrap your Runnable to forward the context:

```java
@Service
public class MagicalTaskService {
    
    @Autowired
    private ExecutorService executorService;
    
    public void submitMagicalTask(Runnable task) {
        // Capture current context and wrap the task
        Runnable contextAwareTask = new DelegatingSecurityContextRunnable(task);
        
        // Submit to thread pool — context travels with it!
        executorService.submit(contextAwareTask);
    }
}
```

**How it works:**
1. Captures current SecurityContext when created
2. Sets context before running the task
3. Clears context after task completes

---

### DelegatingSecurityContextCallable

Same idea for Callable (tasks that return results):

```java
public Future<String> castSpellAsync(String spellName) {
    Callable<String> spellTask = () -> {
        String wizard = SecurityContextHolder.getContext()
            .getAuthentication().getName();
        
        return spellService.cast(wizard, spellName);
    };
    
    // Wrap with context delegation
    Callable<String> contextAwareTask = 
        new DelegatingSecurityContextCallable<>(spellTask);
    
    return executorService.submit(contextAwareTask);
}
```

---

### DelegatingSecurityContextExecutorService

Wrap the entire executor to automatically delegate all tasks:

```java
@Bean
public ExecutorService taskExecutor() {
    // Create your executor
    ThreadPoolExecutor executor = new ThreadPoolExecutor(
        5, 10, 60L, TimeUnit.SECONDS,
        new LinkedBlockingQueue<>()
    );
    
    // Wrap it to auto-delegate security context
    return new DelegatingSecurityContextExecutorService(executor);
}
```

Now **all submitted tasks** automatically get the context:

```java
@Autowired
private ExecutorService taskExecutor;  // The wrapped one

public void doAsyncWork() {
    // Context automatically forwarded!
    taskExecutor.submit(() -> {
        String user = SecurityContextHolder.getContext()
            .getAuthentication().getName();
        System.out.println("Working as: " + user);
    });
}
```

---

### Complete Async Example

```java
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {
    
    @Override
    @Bean(name = "taskExecutor")
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("hogwarts-async-");
        executor.initialize();
        
        // Wrap with security context delegation
        return new DelegatingSecurityContextExecutor(executor);
    }
    
    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return new SimpleAsyncUncaughtExceptionHandler();
    }
}
```

Now your `@Async` methods automatically have access to the SecurityContext:

```java
@Service
public class OwlService {
    
    @Async("taskExecutor")
    public void sendOwlToAll(String message) {
        // SecurityContext is available here!
        String sender = SecurityContextHolder.getContext()
            .getAuthentication().getName();
        
        for (String student : getAllStudents()) {
            owlPost.send(sender, student, message);
        }
    }
}
```

---

## Manual Context Management

Sometimes you need to manually set or clear the context.

### Setting Context Programmatically

```java
// Create authentication
Authentication auth = new UsernamePasswordAuthenticationToken(
    userDetails, null, userDetails.getAuthorities()
);

// Set in context
SecurityContextHolder.getContext().setAuthentication(auth);
```

### Clearing Context

```java
// Always clear when done (Spring does this automatically for requests)
SecurityContextHolder.clearContext();
```

**When to clear manually:**
- After running background tasks
- When switching users in admin panels
- In standalone applications between operations

---

## Common Pitfalls

:::danger Memory Leaks in Async
Always clear context in long-running threads:

```java
public void run() {
    try {
        // Do work with SecurityContext
    } finally {
        SecurityContextHolder.clearContext();  // Clean up!
    }
}
```
:::

:::danger Don't Use Global Mode for Web
`MODE_GLOBAL` shares context across all threads — never use in web applications!
:::

:::tip Test Helper
In tests, use `@WithMockUser` to set up SecurityContext:

```java
@Test
@WithMockUser(username = "harry.potter", roles = "STUDENT")
public void testWithAuthenticatedUser() {
    // Test runs with harry.potter in SecurityContext
}
```
:::

---

## Chapter Summary

| Concept | Hogwarts Analogy | What It Does |
|---------|------------------|--------------|
| `SecurityContext` | House Badge | Holds authenticated user during request |
| `SecurityContextHolder` | Badge Holder | Static access to current context |
| `MODE_THREADLOCAL` | Pocket (per person) | Default — each thread has own context |
| `MODE_INHERITABLETHREADLOCAL` | Family Badge | Child threads inherit parent's context |
| `MODE_GLOBAL` | Shared Board | All threads share context (dangerous!) |
| `DelegatingSecurityContextRunnable` | Message Owl | Forwards context to async tasks |
| `DelegatingSecurityContextExecutor` | Enchanted Owl Post | Auto-forwards context for all tasks |

---

## Quick Reference: Which Strategy?

```
Standard web application?
    → Use default MODE_THREADLOCAL

Using @Async or CompletableFuture?
    → Use DelegatingSecurityContextExecutor

Creating your own threads?
    → Use DelegatingSecurityContextRunnable/Callable

Standalone/desktop app?
    → Use MODE_GLOBAL (only option)

Thread pool workers?
    → Never rely on inheritance, always use delegation
```

---

**Next:** 2.4 Understanding HTTP Basic and Form Login — How students enter the castle through different gates! 🚪
