## Understanding HTTP Basic and Form Login

### Recap: The Castle Gates

Hogwarts has multiple ways to enter:
- **Main Gate** — Guards check your invitation (like HTTP Basic)
- **Secret Passages** — Hidden doors for those who know the way (like Form Login)
- **Floo Network** — Special fireplaces for instant travel (like modern APIs)

Spring Security provides different "gates" for different situations.

---

## HTTP Basic Authentication — The Main Gate

HTTP Basic is the simplest authentication method. It sends the username and password with every request.

### How It Works

```
┌─────────────────────────────────────────┐
│  Client (Browser/App)                   │
│                                         │
│  1. Request: GET /spells                │
│     └─► No credentials                  │
│                                         │
│  2. Response: 401 Unauthorized          │
│     └─► WWW-Authenticate: Basic         │
│                                         │
│  3. Request: GET /spells                │
│     └─► Authorization: Basic xxx        │
│         (Base64: username:password)     │
│                                         │
│  4. Response: 200 OK + Spells List      │
└─────────────────────────────────────────┘
```

**Every request includes credentials.** No cookies, no sessions — simple but repetitive.

---

### When to Use HTTP Basic

| Good For | Bad For |
|----------|---------|
| Internal APIs | Public-facing websites |
| Testing with curl/Postman | Browser-based user login |
| Microservices communication | High-security applications |
| Simple scripts | Remember-me functionality |

---

### Spring Security Configuration

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .httpBasic(Customizer.withDefaults());  // Enable HTTP Basic
        
        return http.build();
    }
}
```

That's it! Spring Security handles the 401 challenges and credential parsing automatically.

---

### Testing HTTP Basic

**With curl:**
```bash
# With credentials
curl -u harry.potter:Hedwig123 http://localhost:8080/spells

# Or manually set header
curl -H "Authorization: Basic $(echo -n 'harry.potter:Hedwig123' | base64)" \
     http://localhost:8080/spells
```

**With Postman:**
1. Go to Authorization tab
2. Select "Basic Auth"
3. Enter username and password

---

### Security Considerations

:::danger Always Use HTTPS
HTTP Basic sends credentials in **every request**. Without HTTPS, anyone can read them!
:::

---

## Form Login — The Secret Passage

Form Login is what users see on websites: a page with username/password fields.

### How It Works

```
┌─────────────────────────────────────────┐
│  1. User visits /restricted-page        │
│                                         │
│  2. Redirect to /login page             │
│     └─► Show HTML form                  │
│                                         │
│  3. User submits form (POST /login)     │
│     └─► username=harry&password=Hedwig  │
│                                         │
│  4. Server validates credentials        │
│     └─► Creates session                 │
│     └─► Sets JSESSIONID cookie          │
│                                         │
│  5. Redirect to /restricted-page        │
│     └─► Cookie proves identity          │
└─────────────────────────────────────────┘
```

**After login, a cookie remembers you.** No need to send password repeatedly.

---

### When to Use Form Login

| Good For | Bad For |
|----------|---------|
| Browser-based web apps | Mobile apps |
| Traditional MVC applications | SPA with separate frontend |
| Admin dashboards | API-only backends |
| Remember-me functionality | Stateless microservices |

---

### Spring Security Configuration

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/login", "/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")              // Custom login page URL
                .loginProcessingUrl("/perform_login")  // Form submission URL
                .defaultSuccessUrl("/dashboard", true)  // Where to go after login
                .failureUrl("/login?error=true")  // Where to go on failure
                .permitAll()
            )
            .logout(logout -> logout
                .logoutUrl("/perform_logout")
                .logoutSuccessUrl("/login?logout=true")
                .deleteCookies("JSESSIONID")
            );
        
        return http.build();
    }
}
```

---

### Custom Login Page (Thymeleaf)

```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<head>
    <title>Hogwarts Login</title>
</head>
<body>
    <div class="login-container">
        <h1>Hogwarts School Login</h1>
        
        <div th:if="${param.error}" class="alert alert-danger">
            Invalid username or password!
        </div>
        
        <div th:if="${param.logout}" class="alert alert-success">
            You have been logged out.
        </div>
        
        <form th:action="@{/perform_login}" method="post">
            <div>
                <label>Wizard Name:</label>
                <input type="text" name="username" required />
            </div>
            
            <div>
                <label>Secret Password:</label>
                <input type="password" name="password" required />
            </div>
            
            <button type="submit">Enter Hogwarts</button>
        </form>
    </div>
</body>
</html>
```

---

### Default Form Login (No Custom Page)

If you don't specify `.loginPage()`, Spring Security generates a simple form:

```java
.httpBasic(Customizer.withDefaults())
.formLogin(Customizer.withDefaults());  // Auto-generated form
```

---

## Form Login vs HTTP Basic

| Feature | Form Login | HTTP Basic |
|---------|-----------|------------|
| User Experience | Web page with form | Browser popup or API headers |
| Session | Yes — cookie-based | No — sent every request |
| Logout | Yes — clear session | No — browser caches credentials |
| Remember Me | Supported | Not applicable |
| Best For | Browser users | APIs, microservices |
| CSRF | Protected by default | Not needed (stateless) |

---

## Frontend and Backend on Separate Servers (Detached)

Modern applications often have:
- **Frontend** — React/Vue/Angular app (runs on localhost:3000)
- **Backend** — Spring Boot API (runs on localhost:8080)

This is the **detached** or **decoupled** architecture.

### The Challenge

Traditional form login doesn't work well:
- Frontend wants JSON responses, not HTML redirects
- CORS issues between different ports
- Sessions are tricky with SPAs

### Solution 1: Stateless JWT Authentication

The most common approach for detached apps.

```
Frontend                Backend
   │                       │
   ├─── Login Request ─────▶
   │   {username, password}│
   │                       │ Validate
   │◄──── JWT Token ───────┤ Create Token
   │                       │
   ├─── Request + Token ───▶
   │   Authorization: Bearer xxx
   │                       │ Validate JWT
   │◄──── Data ────────────┤
```

**Implementation:**

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())  // Disable for stateless JWT
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter(), UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
}
```

---

### Solution 2: Session with CORS (Cookie-Based)

If you want traditional sessions with a detached frontend:

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/login").permitAll()
            .anyRequest().authenticated()
        )
        .formLogin(form -> form
            .loginProcessingUrl("/api/login")
            .successHandler((req, res, auth) -> {
                // Return JSON instead of redirect
                res.setContentType("application/json");
                res.getWriter().write("{\"success\": true}");
            })
        );
    
    return http.build();
}
```

**Frontend must include credentials:**

```javascript
fetch('http://localhost:8080/api/spells', {
    method: 'GET',
    credentials: 'include',  // Important: sends cookies!
    headers: {
        'Content-Type': 'application/json'
    }
});
```

---

## Choosing the Right Approach

| Scenario | Recommended Approach |
|----------|---------------------|
| Internal APIs / Testing | HTTP Basic |
| Traditional server-rendered web app | Form Login with sessions |
| React/Vue/Angular SPA + Spring Boot | JWT (stateless) |
| Mobile app backend | JWT or OAuth2 |
| Microservices internal comm | HTTP Basic or mTLS |
| Public API for third parties | OAuth2 / API Keys |

---

## Chapter Summary

| Method | Hogwarts Gate | Use Case | State |
|--------|--------------|----------|-------|
| HTTP Basic | Main Gate Guard | APIs, testing | Stateless |
| Form Login | Secret Passage | Web apps | Stateful |
| JWT Token | Floo Network | SPAs, mobile | Stateless |
| Session + CORS | Linked Portraits | Detached apps | Stateful |

---

**That completes Chapter 2!**

You now understand:
- How users are defined (UserDetails)
- How they're retrieved (UserDetailsService)
- How they're authenticated (AuthenticationProvider)
- How identity is tracked (SecurityContext)
- How they log in (HTTP Basic, Form Login, JWT)

**Next:** Chapter 3 — Authorization: What Harry is allowed to do at Hogwarts!
