# Security Filters: The Castle Guard Posts

## Recap: The Journey So Far

In our Hogwarts adventure:
1. **Chapter 1**: We learned about the **Registry Book** (`UserDetailsService`) — how Hogwarts knows who its wizards are
2. **Chapter 2**: We explored the **Sorting Hat's Magic** (`PasswordEncoder`) — how we verify a wizard's true identity

Now we arrive at the **castle gates themselves** — the **Security Filters**. Before any wizard enters Hogwarts, they pass through multiple checkpoints: the gates, the doors, the hallways. Each checkpoint has guards asking different questions.

This is exactly how Spring Security works: **a chain of filters**, each with a specific duty, guarding your application.

---

## 1. What Are Filters and Filter Chains?

### The Analogy: Entering Hogwarts Castle

When Harry first arrived at Hogwarts, he didn't just walk straight into the Great Hall. He passed through multiple checkpoints:

| Checkpoint | Guard's Question | Filter Equivalent |
|------------|------------------|-------------------|
| **The Main Gates** | "Are you a wizard or Muggle?" | `AuthenticationFilter` — checks credentials |
| **The Entrance Hall** | "Do you have your invitation letter?" | `AuthorizationFilter` — checks permissions |
| **Moving Stairs** | "Do you belong in this tower?" | `FilterSecurityInterceptor` — final access check |
| **Common Room Portrait** | "What's the password?" | `UsernamePasswordAuthenticationFilter` — specific auth check |

Each **guard post (Filter)** checks something different. Together, they form a **chain** — if any guard says "no," the visitor is turned away.

### Technical Definition

**Filter**: A Java object that intercepts HTTP requests before they reach your controllers. Think of it as middleware that can:
- Inspect the request
- Modify the request/response
- Block the request
- Pass it to the next filter

**Filter Chain**: Filters arranged in a specific order. The request passes through each filter sequentially, like moving through castle checkpoints.

```
HTTP Request
    ↓
[Filter 1] — Check: Is this HTTPS?
    ↓ (if yes)
[Filter 2] — Check: Is there a valid session?
    ↓ (if yes)
[Filter 3] — Check: Does user have permission?
    ↓ (if yes)
[Your Controller] — Process the request
    ↓
[Filter 3] — Post-processing
    ↓
[Filter 2] — Post-processing
    ↓
[Filter 1] — Post-processing
    ↓
HTTP Response
```

:::note Key Principle
**Order matters!** Just as you can't check someone's house badge before they enter the castle, filters must execute in the correct sequence.
:::

---

## 2. Spring Security's Default Filters: The Standard Guard Posts

Spring Security provides 15+ built-in filters, each with a specific duty. Here are the most important ones:

### The Guard Posts of Spring Security Castle

| Order | Filter | Guard Role | What It Does |
|-------|--------|------------|--------------|
| 1 | `ChannelProcessingFilter` | Portcullis Guard | Forces HTTPS (like requiring the enchanted bridge) |
| 2 | `WebAsyncManagerIntegrationFilter` | Owl Post Coordinator | Integrates with async requests |
| 3 | `SecurityContextPersistenceFilter` | Badge Clerk | Loads/Saves the SecurityContext (your house badge) |
| 4 | `HeaderWriterFilter` | Defense Spell Caster | Adds security headers (X-Frame-Options, etc.) |
| 5 | `CsrfFilter` | Impostor Detector | Validates CSRF tokens (prevents dark magic tricks) |
| 6 | `LogoutFilter` | Departure Gate | Handles logout requests |
| 7 | `UsernamePasswordAuthenticationFilter` | Sorting Hat Assistant | Processes username/password login |
| 8 | `DefaultLoginPageGeneratingFilter` | Welcome Desk | Generates default login page |
| 9 | `DefaultLogoutPageGeneratingFilter` | Exit Desk | Generates default logout page |
| 10 | `BasicAuthenticationFilter` | Ministry ID Checker | Processes HTTP Basic auth |
| 11 | `RequestCacheAwareFilter` | Memory Charm | Remembers where you were going before login |
| 12 | `SecurityContextHolderAwareRequestFilter` | Badge Enchanter | Wraps request with security context |
| 13 | `RememberMeAuthenticationFilter` | Trusted Visitor Pass | Handles "Remember Me" cookies |
| 14 | `AnonymousAuthenticationFilter` | Visitor Badge | Assigns anonymous identity if not authenticated |
| 15 | `SessionManagementFilter` | Time-Turner Monitor | Manages sessions (concurrency, fixation) |
| 16 | `ExceptionTranslationFilter` | Problem Handler | Catches security exceptions, redirects to login |
| 17 | `FilterSecurityInterceptor` | Final Gatekeeper | The ultimate authorization check |

### Visual Flow: A Request Through the Castle

```
Visitor (HTTP Request) arrives at Hogwarts
              ↓
    [ChannelProcessingFilter]
    "Must use the enchanted bridge (HTTPS)"
              ↓
    [SecurityContextPersistenceFilter]
    "Do they already have a house badge?"
              ↓
    [CsrfFilter]
    "Check for Polyjuice Potion (CSRF token)"
              ↓
    [UsernamePasswordAuthenticationFilter]
    "If they're trying to login, verify credentials"
              ↓
    [RememberMeAuthenticationFilter]
    "Do they have a trusted visitor pass?"
              ↓
    [AnonymousAuthenticationFilter]
    "Still no badge? Give them a visitor badge"
              ↓
    [FilterSecurityInterceptor]
    "FINAL CHECK: Can they enter this specific room?"
              ↓
    "Welcome to the Great Hall!" (Your Controller)
```

### Important Filter Details

**SecurityContextPersistenceFilter (Order 3)**
```java
// Loads existing authentication from session
// Like checking if visitor already has a house badge
SecurityContext context = SecurityContextHolder.getContext();
if (context.getAuthentication() == null) {
    // Try to load from session
    context = repo.loadContext(holder);
}
```

**CsrfFilter (Order 5)**
```java
// Validates CSRF tokens for state-changing operations
// Like checking that the visitor isn't under Imperius Curse
if (requiresCsrfProtection(request)) {
    String actualToken = request.getHeader("X-CSRF-TOKEN");
    String expectedToken = csrfTokenRepository.loadToken(request);
    
    if (!actualToken.equals(expectedToken.token())) {
        throw new InvalidCsrfTokenException("Dark magic detected!");
    }
}
```

**UsernamePasswordAuthenticationFilter (Order 7)**
```java
// Processes form-based login
// Like the Sorting Hat checking new students
if (requiresAuthentication(request, response)) {
    String username = obtainUsername(request);
    String password = obtainPassword(request);
    
    UsernamePasswordAuthenticationToken authRequest =
        new UsernamePasswordAuthenticationToken(username, password);
    
    // Delegate to AuthenticationManager (Professor McGonagall)
    Authentication authResult = 
        this.getAuthenticationManager().authenticate(authRequest);
    
    // Store in SecurityContext (give them a house badge)
    SecurityContextHolder.getContext().setAuthentication(authResult);
}
```

**FilterSecurityInterceptor (Order 17 - The Last)**
```java
// The final authorization check
// Like the portrait guarding the common room
InterceptorStatusToken token = super.beforeInvocation(fi);
try {
    fi.getChain().doFilter(fi.getRequest(), fi.getResponse());
}
finally {
    super.finallyInvocation(token);
}
super.afterInvocation(token, null);
```

---

## 3. Adding Your Own Filters: Posting Your Own Guards

Sometimes, the standard guard posts aren't enough. You need to post your own guards at specific points in the castle.

### Three Positions: Before, After, At

Spring Security lets you place custom filters in three positions:

```java
http
    .addFilterBefore(myFilter, UsernamePasswordAuthenticationFilter.class)
    // Your guard checks visitors BEFORE they reach the Sorting Hat
    
    .addFilterAfter(myFilter, UsernamePasswordAuthenticationFilter.class)
    // Your guard checks visitors AFTER they've passed the Sorting Hat
    
    .addFilterAt(myFilter, UsernamePasswordAuthenticationFilter.class)
    // Your guard replaces or competes with the Sorting Hat
```

### Example 1: Before (Request Validation)

Imagine you want to check that all requests have a required header before any authentication happens — like checking visitors have proper documentation at the outer gates.

```java
@Component
public class RequiredHeaderFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) 
            throws ServletException, IOException {
        
        String apiVersion = request.getHeader("X-API-Version");
        
        if (apiVersion == null || apiVersion.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().write("Missing required header: X-API-Version");
            return; // Stop here, don't proceed to next filter
        }
        
        // All good, proceed to next guard post
        filterChain.doFilter(request, response);
    }
}
```

**Registration:**
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Autowired
    private RequiredHeaderFilter requiredHeaderFilter;
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .addFilterBefore(requiredHeaderFilter, 
                           UsernamePasswordAuthenticationFilter.class)
            // Check headers BEFORE trying to authenticate
            
            .authorizeHttpRequests(auth -> auth
                .anyRequest().authenticated()
            );
        
        return http.build();
    }
}
```

### Example 2: After (Logging and Auditing)

You want to log every successful authentication — like a castle scribe who records everyone who passes the Sorting Hat.

```java
@Component
public class AuthenticationAuditFilter extends OncePerRequestFilter {
    
    private static final Logger log = LoggerFactory.getLogger(AuthenticationAuditFilter.class);
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) 
            throws ServletException, IOException {
        
        // Let the request proceed through remaining filters
        filterChain.doFilter(request, response);
        
        // AFTER authentication has happened, check if it succeeded
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        
        if (auth != null && auth.isAuthenticated() && 
            !(auth instanceof AnonymousAuthenticationToken)) {
            
            log.info("User '{}' successfully accessed '{}' with roles {}",
                auth.getName(),
                request.getRequestURI(),
                auth.getAuthorities());
        }
    }
}
```

**Registration:**
```java
http
    .addFilterAfter(authenticationAuditFilter, 
                   UsernamePasswordAuthenticationFilter.class)
    // Log AFTER authentication has been processed
```

### Example 3: At (Replacing/Competing)

You want to add a filter at the exact same position as another — like posting your own guard next to the Sorting Hat.

```java
@Component
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {
    
    @Value("${api.secret-key}")
    private String secretKey;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) 
            throws ServletException, IOException {
        
        String providedKey = request.getHeader("X-API-Key");
        
        if (secretKey.equals(providedKey)) {
            // Create API authentication
            Authentication auth = new PreAuthenticatedAuthenticationToken(
                "api-user", null, 
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_API"))
            );
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        
        filterChain.doFilter(request, response);
    }
}
```

**Registration:**
```java
http
    .addFilterAt(apiKeyAuthenticationFilter, 
                UsernamePasswordAuthenticationFilter.class)
    // Competes with/replaces standard username/password filter
```

---

## 4. WARNING: Why NOT to Use `addFilterAt`

:::danger The Danger of `addFilterAt`
**Never use `addFilterAt` unless you absolutely must.** Here's why:

**The Problem:**
When you use `addFilterAt`, you're saying "put my filter at the same position as Filter X." But Spring Security uses a **list**, not absolute positions. The order becomes **unpredictable** — your filter might execute before OR after the target filter, depending on:
- Registration order
- Bean initialization order
- Spring Security version

**Analogy:**
Imagine posting your guard "at the same location" as the Sorting Hat. But the castle has room for multiple guards at that spot. Will your guard check visitors before or after the Sorting Hat? Nobody knows!

**When the Order Matters:**
```java
// WRONG — Order is unpredictable!
http.addFilterAt(myFilter, UsernamePasswordAuthenticationFilter.class);

// Scenario A (might happen):
// 1. MyFilter runs
// 2. UsernamePasswordAuthenticationFilter runs

// Scenario B (might happen):
// 1. UsernamePasswordAuthenticationFilter runs
// 2. MyFilter runs

// You can't predict which!
```

**When to Use It (Rare):**
Only use `addFilterAt` when:
- You're **replacing** a standard filter entirely
- You don't care about the relative order
- Both filters can run in any sequence

**Better Alternatives:**
```java
// Use addFilterBefore when you need to run first
http.addFilterBefore(myFilter, TargetFilter.class);

// Use addFilterAfter when you need to run second
http.addFilterAfter(myFilter, TargetFilter.class);

// Both give you GUARANTEED order!
```
:::

---

## 5. Filter Implementations: Choose Your Guard Type

Spring Security provides several base classes for creating filters. Choose the right one for your needs.

### Option 1: Standard Java Filter Interface

Use when: You need **complete control** and none of the Spring-specific features.

```java
public class BasicGuardFilter implements Filter {
    
    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        // Initialization (called once)
    }
    
    @Override
    public void doFilter(ServletRequest request, 
                        ServletResponse response, 
                        FilterChain chain) 
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        // Your logic here
        
        chain.doFilter(request, response); // Continue chain
        
        // Post-processing here (optional)
    }
    
    @Override
    public void destroy() {
        // Cleanup (called once on shutdown)
    }
}
```

**Pros:**
- ✅ Standard Java EE — works anywhere
- ✅ Full control over everything
- ✅ No dependencies on Spring

**Cons:**
- ❌ No Spring dependency injection (unless you make it a bean)
- ❌ Manual type casting (ServletRequest → HttpServletRequest)
- ❌ No guarantee of "once per request" (see below)
- ❌ More boilerplate code

---

### Option 2: GenericFilterBean

Use when: You want **Spring integration** with property binding.

```java
@Component
public class ConfigurableGuardFilter extends GenericFilterBean {
    
    // Automatically populated from application.properties
    private String requiredHeader;
    private boolean enabled = true;
    
    public void setRequiredHeader(String requiredHeader) {
        this.requiredHeader = requiredHeader;
    }
    
    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
    
    @Override
    public void doFilter(ServletRequest request, 
                        ServletResponse response, 
                        FilterChain chain) 
            throws IOException, ServletException {
        
        if (!enabled) {
            chain.doFilter(request, response);
            return;
        }
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        
        if (requiredHeader != null) {
            String value = httpRequest.getHeader(requiredHeader);
            // Process header...
        }
        
        chain.doFilter(request, response);
    }
}
```

**application.properties:**
```properties
# Spring will auto-bind these to your filter
configurableGuardFilter.requiredHeader=X-Custom-Auth
configurableGuardFilter.enabled=true
```

**Pros:**
- ✅ Spring bean lifecycle support
- ✅ Automatic property binding from config
- ✅ Access to ServletContext

**Cons:**
- ❌ Still no "once per request" guarantee
- ❌ Manual type casting still needed
- ❌ Slightly more overhead than plain Filter

---

### Option 3: OncePerRequestFilter (Recommended)

Use when: You want **guaranteed execution once per request** with Spring conveniences.

```java
@Component
public class ReliableGuardFilter extends OncePerRequestFilter {
    
    @Autowired
    private AuditService auditService;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) 
            throws ServletException, IOException {
        
        // This method is guaranteed to execute only ONCE per request
        // Even if the request is forwarded or included
        
        auditService.recordRequest(request.getRequestURI());
        
        filterChain.doFilter(request, response);
    }
    
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Optional: Skip filtering for certain URLs
        String path = request.getRequestURI();
        return path.startsWith("/public/") || path.equals("/health");
    }
}
```

**Why "Once Per Request" Matters:**

In servlet containers, a single HTTP request might trigger your filter **multiple times**:
- Through `RequestDispatcher.forward()`
- Through `RequestDispatcher.include()`
- Through error handling

**Without OncePerRequestFilter:**
```
Request arrives
    ↓
[Your Filter] — Executes (1st time)
    ↓
Controller decides to forward
    ↓
[Your Filter] — Executes AGAIN (2nd time!) ❌
    ↓
Target resource
```

**With OncePerRequestFilter:**
```
Request arrives
    ↓
[Your Filter] — Executes (1st time)
    ↓
Controller decides to forward
    ↓
[Your Filter] — SKIPPED (already executed) ✅
    ↓
Target resource
```

**Pros:**
- ✅ **Guaranteed once per request** — the biggest benefit
- ✅ Automatic type casting (HttpServletRequest/Response)
- ✅ Spring dependency injection
- ✅ `shouldNotFilter()` for easy exclusion
- ✅ Handles async requests correctly

**Cons:**
- ❌ Slightly more overhead (but negligible)

:::tip Best Practice
**Always use `OncePerRequestFilter`** unless you have a specific reason not to. It prevents subtle bugs where your filter runs multiple times.
:::

---

## 6. Production Example: Comprehensive Logging Filter

Here's a complete, production-ready logging filter using `OncePerRequestFilter`. This is like having a detailed castle logbook that records everything.

```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)  // Run as early as possible
public class RequestResponseLoggingFilter extends OncePerRequestFilter {
    
    private static final Logger log = LoggerFactory.getLogger(RequestResponseLoggingFilter.class);
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) 
            throws ServletException, IOException {
        
        // Record start time
        long startTime = System.currentTimeMillis();
        
        // Generate unique request ID for tracking
        String requestId = UUID.randomUUID().toString();
        MDC.put("requestId", requestId);
        
        // Wrap request to capture body (for logging)
        ContentCachingRequestWrapper wrappedRequest = 
            new ContentCachingRequestWrapper(request);
        
        // Wrap response to capture body (for logging)
        ContentCachingResponseWrapper wrappedResponse = 
            new ContentCachingResponseWrapper(response);
        
        try {
            // Log incoming request
            logRequest(wrappedRequest, requestId);
            
            // Process the request through the filter chain
            filterChain.doFilter(wrappedRequest, wrappedResponse);
            
        } finally {
            // Calculate duration
            long duration = System.currentTimeMillis() - startTime;
            
            // Log outgoing response
            logResponse(wrappedResponse, requestId, duration);
            
            // IMPORTANT: Copy content back to original response
            wrappedResponse.copyBodyToResponse();
            
            // Clear MDC
            MDC.clear();
        }
    }
    
    private void logRequest(ContentCachingRequestWrapper request, String requestId) {
        try {
            String method = request.getMethod();
            String uri = request.getRequestURI();
            String queryString = request.getQueryString();
            String clientIp = getClientIpAddress(request);
            
            // Get current user if authenticated
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String user = (auth != null && auth.isAuthenticated()) 
                ? auth.getName() 
                : "anonymous";
            
            // Build log entry
            Map<String, Object> logData = new LinkedHashMap<>();
            logData.put("type", "REQUEST");
            logData.put("requestId", requestId);
            logData.put("timestamp", Instant.now().toString());
            logData.put("method", method);
            logData.put("uri", uri);
            logData.put("query", queryString);
            logData.put("clientIp", clientIp);
            logData.put("user", user);
            logData.put("headers", getHeaders(request));
            
            // Log body for POST/PUT (be careful with sensitive data!)
            if (isLoggableBody(request)) {
                String body = new String(request.getContentAsByteArray(), 
                                        StandardCharsets.UTF_8);
                // Mask sensitive fields
                body = maskSensitiveData(body);
                logData.put("body", body);
            }
            
            log.info("{} | {} {} | User: {} | IP: {} | RequestID: {}",
                method, uri, 
                queryString != null ? "?" + queryString : "",
                user, clientIp, requestId);
            
            // Detailed log in JSON for log aggregation systems
            log.debug("Request details: {}", objectMapper.writeValueAsString(logData));
            
        } catch (Exception e) {
            log.warn("Failed to log request", e);
        }
    }
    
    private void logResponse(ContentCachingResponseWrapper response, 
                            String requestId, 
                            long duration) {
        try {
            int status = response.getStatus();
            long contentLength = response.getContentSize();
            
            Map<String, Object> logData = new LinkedHashMap<>();
            logData.put("type", "RESPONSE");
            logData.put("requestId", requestId);
            logData.put("timestamp", Instant.now().toString());
            logData.put("status", status);
            logData.put("durationMs", duration);
            logData.put("contentLength", contentLength);
            
            // Determine log level based on status
            if (status >= 500) {
                log.error("Response: {} | Duration: {}ms | RequestID: {} | ERROR",
                    status, duration, requestId);
            } else if (status >= 400) {
                log.warn("Response: {} | Duration: {}ms | RequestID: {} | WARNING",
                    status, duration, requestId);
            } else {
                log.info("Response: {} | Duration: {}ms | RequestID: {} | SUCCESS",
                    status, duration, requestId);
            }
            
            log.debug("Response details: {}", objectMapper.writeValueAsString(logData));
            
        } catch (Exception e) {
            log.warn("Failed to log response", e);
        }
    }
    
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
    
    private Map<String, String> getHeaders(HttpServletRequest request) {
        Map<String, String> headers = new HashMap<>();
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String name = headerNames.nextElement();
            // Skip sensitive headers
            if (!name.toLowerCase().contains("authorization") &&
                !name.toLowerCase().contains("cookie")) {
                headers.put(name, request.getHeader(name));
            }
        }
        return headers;
    }
    
    private boolean isLoggableBody(HttpServletRequest request) {
        String method = request.getMethod();
        String contentType = request.getContentType();
        
        // Only log body for POST/PUT/PATCH
        if (!Arrays.asList("POST", "PUT", "PATCH").contains(method)) {
            return false;
        }
        
        // Only log if content type is JSON or form data
        if (contentType != null && (
            contentType.contains("application/json") ||
            contentType.contains("application/x-www-form-urlencoded"))) {
            return true;
        }
        
        return false;
    }
    
    private String maskSensitiveData(String body) {
        // Simple masking — in production, use a proper JSON parser
        return body
            .replaceAll("\"password\":\"[^\"]*\"", "\"password\":\"***\"")
            .replaceAll("\"ssn\":\"[^\"]*\"", "\"ssn\":\"***\"")
            .replaceAll("\"creditCard\":\"[^\"]*\"", "\"creditCard\":\"***\"");
    }
    
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Skip logging for static resources and health checks
        String path = request.getRequestURI();
        return path.startsWith("/static/") ||
               path.startsWith("/actuator/health") ||
               path.endsWith(".js") ||
               path.endsWith(".css") ||
               path.endsWith(".png") ||
               path.endsWith(".jpg");
    }
}
```

### Key Production Features:

1. **Request ID Tracking**: Each request gets a unique ID for distributed tracing
2. **MDC (Mapped Diagnostic Context)**: Maintains context across the request lifecycle
3. **Content Caching Wrappers**: Capture request/response bodies without consuming them
4. **Sensitive Data Masking**: Automatically masks passwords, SSNs, credit cards
5. **Smart Logging Levels**: ERROR for 5xx, WARN for 4xx, INFO for success
6. **Performance Metrics**: Tracks request duration
7. **Client IP Extraction**: Handles X-Forwarded-For for proxies/load balancers
8. **Selective Logging**: Skips static resources and health checks
9. **Error Resilience**: Try-finally ensures logging doesn't break functionality

### Registration:

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Autowired
    private RequestResponseLoggingFilter loggingFilter;
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Add logging filter FIRST (before anything else)
            .addFilterBefore(loggingFilter, ChannelProcessingFilter.class)
            
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .httpBasic(Customizer.withDefaults());
        
        return http.build();
    }
}
```

---

## 7. Filter Order Summary: The Guard Roster

```
Position 1-10:   Infrastructure (HTTPS, async, context loading)
Position 11-15:  Pre-authentication (CSRF, headers, logout)
Position 16-20:  Authentication (username/password, basic auth, remember-me)
Position 21-25:  Post-authentication (anonymous, session management)
Position 26+:    Authorization (final access checks)

Your custom filters should go:
- addFilterBefore(..., UsernamePasswordAuthenticationFilter) for validation
- addFilterAfter(..., UsernamePasswordAuthenticationFilter) for auditing/logging
- NEVER use addFilterAt() unless replacing a filter
```

---

## Chapter Summary

| Concept | Hogwarts Analogy | Technical Meaning |
|---------|------------------|-------------------|
| **Filter** | Guard Post | Intercepts and processes HTTP requests |
| **Filter Chain** | Castle Checkpoints | Sequential filters through which requests flow |
| **Filter Order** | Guard Schedule | The sequence in which filters execute |
| `addFilterBefore()` | Outer Gate | Your filter runs before the target filter |
| `addFilterAfter()` | Inner Checkpoint | Your filter runs after the target filter |
| `addFilterAt()` | Shared Post | **Avoid!** Unpredictable order |
| `Filter` | Basic Guard | Standard Java interface, minimal features |
| `GenericFilterBean` | Configurable Guard | Spring-aware with property binding |
| `OncePerRequestFilter` | Reliable Guard | **Recommended** — guarantees single execution |

---

## Quick Reference: Which Filter Base Class?

```
Need Spring dependency injection?
    → Use GenericFilterBean or OncePerRequestFilter
    
Need guaranteed single execution per request?
    → Use OncePerRequestFilter (prevents double execution on forwards)
    
Need to read request/response body?
    → Use OncePerRequestFilter with ContentCachingWrapper
    
Just doing simple header checks?
    → OncePerRequestFilter is still best (future-proof)
    
Writing a filter that might be used outside Spring?
    → Use standard Filter interface

Building a library for non-Spring projects?
    → Use standard Filter interface
```

---

**Next Chapter:** We'll dive deep into the AuthenticationProvider — understanding how Professor McGonagall (AuthenticationManager) delegates to the Sorting Hat (DaoAuthenticationProvider) and how you can create your own custom authentication logic! 🎩✨
