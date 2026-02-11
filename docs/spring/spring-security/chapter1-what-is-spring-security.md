# What is Spring Security?

## Overview

Spring Security is a **powerful and highly customizable authentication and access-control framework** for Spring applications. It protects your application at two levels:

- **Authentication**: Verifying *who* you are (identity verification)
- **Authorization**: Deciding *what* you can do (permission verification)

:::note Key Principle
Security in Spring is **filter-based**. Every request passes through a chain of filters before reaching your controllers.
:::

---

## Analogy: Entering Hogwarts (Harry Potter)

Remember when **Harry first arrives at Hogwarts**? The castle has a special system to check if you really belong there. Here is how it works:

| Component | Hogwarts Role | What They Do |
|-----------|---------------|--------------|
| **AuthenticationFilter** | Hagrid at the Boats | Hagrid is the first person you meet after the train. He asks: "Are you a first-year student?" He collects everyone and writes down their names. He creates a list of all students who want to enter. |
| **AuthenticationManager** | Professor McGonagall | She meets you at the castle door. She does not sort you herself. Instead, she decides who should check you: "The Sorting Hat will handle the first-years." |
| **AuthenticationProvider** | The Sorting Hat | The Hat actually checks if you belong at Hogwarts. It looks into your mind and decides which house fits you. This is where the real "who are you?" check happens. |
| **UserDetailsService** | The Hogwarts Registry Book | A big book in Dumbledore's office with every wizard's name, their house, and what they can do (like "can enter the library" or "can play Quidditch"). The book only finds your name — it does not decide if you belong. |
| **PasswordEncoder** | The Hat's Magic Check | The Hat has magic that checks if you are really a wizard (not a Muggle or impostor). When you try to trick it, the Hat knows. It checks if your "magic inside" matches what the Registry Book says. |
| **SecurityContext** | Your House Badge | After the Hat sorts you, you get a house badge (Gryffindor lion, Slytherin snake, etc.). Now you can walk anywhere in the castle. The badge tells everyone: "This student belongs here." |

**The Story:**
```
Harry gets off the Hogwarts Express
      ↓
[Hagrid at the Boats] Collects all first-years, writes their names down
      ↓
[Professor McGonagall] Leads them to the Great Hall, tells the Sorting Hat to check them
      ↓
[The Sorting Hat] Opens the Hogwarts Registry Book to find Harry's name (UserDetailsService)
               + Uses magic to check if Harry really has wizard blood (PasswordEncoder)
               + Decides: "GRYFFINDOR!"
      ↓
[House Badge on Harry's Robe!] Now Harry can enter the common room, library, and Great Hall
                              without being questioned again!
```

**Why this matters:** Just like Harry's house badge lets him walk freely at Hogwarts, `SecurityContext` lets users use your app without typing their password on every page.

**Keep this Hogwarts story in mind** as we explore each component.

---

## The Authentication Flow

![Spring Security Authentication Flow](@site/static/img/spring-security-authentication-flow.png)

---

## Core Players: The Security Orchestra

### 1. `AuthenticationFilter` (The Gatekeeper / Hagrid)

**Role**: Intercepts incoming requests and extracts credentials.

- **Analogy**: Hagrid at the boats — first person you meet after the train, collects your name and creates a list
- Extracts username/password from HTTP request (form, JSON, headers)
- Creates an `Authentication` object (usually `UsernamePasswordAuthenticationToken`)
- Passes the token to `AuthenticationManager`

**Common implementations**:
- `UsernamePasswordAuthenticationFilter` – form-based login
- `BasicAuthenticationFilter` – HTTP Basic auth
- `BearerTokenAuthenticationFilter` – JWT tokens

```java
// Simplified: What a filter does internally
@Override
protected void doFilterInternal(HttpServletRequest request, 
                                HttpServletResponse response, 
                                FilterChain chain) {
    
    // 1. Extract credentials
    String username = obtainUsername(request);
    String password = obtainPassword(request);
    
    // 2. Create authentication token (unauthenticated)
    UsernamePasswordAuthenticationToken authRequest =
        new UsernamePasswordAuthenticationToken(username, password);
    
    // 3. Delegate to AuthenticationManager
    Authentication authResult = 
        this.getAuthenticationManager().authenticate(authRequest);
    
    // 4. Store result in SecurityContext
    SecurityContextHolder.getContext().setAuthentication(authResult);
}
```

---

### 2. `AuthenticationManager` (The Coordinator / Professor McGonagall)

**Role**: Delegates authentication to the right provider.

- **Analogy**: Professor McGonagall — does not sort you herself, but decides the Sorting Hat should check you
- Single method interface: `authenticate(Authentication authentication)`
- Does not contain authentication logic itself
- Iterates through `AuthenticationProvider`s and delegates to the first one that supports the token type

```java
public interface AuthenticationManager {
    Authentication authenticate(Authentication authentication) 
        throws AuthenticationException;
}
```

**Default implementation**: `ProviderManager`

---

### 3. `AuthenticationProvider` (The Specialist / The Sorting Hat)

**Role**: Contains the actual authentication logic.

- **Analogy**: The Sorting Hat — actually checks if you belong at Hogwarts and decides your house
- Receives the authentication request from `AuthenticationManager`
- Validates credentials against a data source (database, LDAP, OAuth, etc.)
- Returns a fully populated `Authentication` object on success
- Throws `AuthenticationException` on failure

```java
public interface AuthenticationProvider {
    
    // Perform authentication
    Authentication authenticate(Authentication authentication);
    
    // Check if this provider supports the given token type
    boolean supports(Class<?> authentication);
}
```

**Most common implementation**: `DaoAuthenticationProvider`

| Method | Responsibility |
|--------|----------------|
| `retrieveUser()` | Fetches user details via `UserDetailsService` |
| `additionalAuthenticationChecks()` | Validates password using `PasswordEncoder` |

---

### 4. `UserDetailsService` (The Data Fetcher / Hogwarts Registry Book)

**Role**: Loads user-specific data from your data source.

- **Analogy**: The Registry Book in Dumbledore's office — finds your name and tells us what you are allowed to do
- **Single responsibility**: Retrieve user by username
- Returns a `UserDetails` object
- Does NOT perform authentication
- Does NOT check passwords

```java
public interface UserDetailsService {
    UserDetails loadUserByUsername(String username) 
        throws UsernameNotFoundException;
}
```

**Custom implementation example**:

```java
@Service
public class MyUserDetailsService implements UserDetailsService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Override
    public UserDetails loadUserByUsername(String username) {
        
        // Fetch from database
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        
        // Convert to UserDetails
        return new org.springframework.security.core.userdetails.User(
            user.getUsername(),
            user.getPassword(),
            user.getAuthorities()  // roles/permissions
        );
    }
}
```

---

### 5. `PasswordEncoder` (The Hasher / The Hat's Magic)

**Role**: Encodes and verifies passwords securely.

- **Analogy**: The Sorting Hat's magic — checks if you really have wizard blood and are not a Muggle or impostor
- **Never store plain text passwords**
- Uses one-way hashing algorithms (BCrypt, Argon2, PBKDF2)
- Adds salt automatically to prevent rainbow table attacks

```java
public interface PasswordEncoder {
    
    // Hash a password for storage
    String encode(CharSequence rawPassword);
    
    // Verify raw password against encoded password
    boolean matches(CharSequence rawPassword, String encodedPassword);
}
```

**Recommended**: `BCryptPasswordEncoder`

```java
@Bean
public PasswordEncoder passwordEncoder() {
    // Strength factor 10 (default). Higher = slower but more secure
    return new BCryptPasswordEncoder();
}

// Usage
String encoded = passwordEncoder.encode("myPassword");
boolean matches = passwordEncoder.matches("myPassword", encoded);
```

---

### 6. `SecurityContext` (The Session Storage / House Badge)

**Role**: Holds the authentication details for the current request.

- **Analogy**: Your house badge (Gryffindor/Slytherin/etc.) — proves you belong at Hogwarts, lets you walk freely without being questioned again
- Stored in `ThreadLocal` (per-thread storage)
- Accessible anywhere via `SecurityContextHolder`
- Automatically cleared after request completes

```java
// Get current authenticated user anywhere in your code
Authentication auth = SecurityContextHolder.getContext().getAuthentication();
String username = auth.getName();
Collection<? extends GrantedAuthority> authorities = auth.getAuthorities();
```

**Storage strategies**:

| Strategy | Use Case |
|----------|----------|
| `MODE_THREADLOCAL` | Standard servlet applications (default) |
| `MODE_INHERITABLETHREADLOCAL` | Async processing, child threads |
| `MODE_GLOBAL` | Standalone apps, not recommended for web |

---

## The `UserDetails` Interface

Represents the authenticated user in Spring Security.

```java
public interface UserDetails {
    String getUsername();
    String getPassword();
    Collection<? extends GrantedAuthority> getAuthorities();
    boolean isAccountNonExpired();
    boolean isAccountNonLocked();
    boolean isCredentialsNonExpired();
    boolean isEnabled();
}
```

**Default implementation**: `org.springframework.security.core.userdetails.User`

---

## The `Authentication` Interface

Represents the token in different stages:

| Stage | State | Principal | Credentials | Authorities |
|-------|-------|-----------|-------------|-------------|
| Before auth | Unauthenticated | Username | Password | Empty |
| After auth | Authenticated | UserDetails | null (erased) | Populated |

```java
public interface Authentication extends Principal {
    Collection<? extends GrantedAuthority> getAuthorities();
    Object getCredentials();      // Password (cleared after auth)
    Object getDetails();          // Additional details (IP, session ID)
    Object getPrincipal();        // UserDetails after authentication
    boolean isAuthenticated();    // false initially, true after
    void setAuthenticated(boolean isAuthenticated);
}
```

---

## Complete Flow Recap

```
HTTP Request
     ↓
[AuthenticationFilter] → Extracts credentials
     ↓
[AuthenticationManager] → Delegates to provider
     ↓
[AuthenticationProvider] → Validates credentials
     ↓                    ↘
     ↓              [UserDetailsService] → Loads user
     ↓                    ↘
     ↓              [PasswordEncoder] → Validates password
     ↓
[SecurityContext] ← Stores authenticated user
     ↓
Request reaches Controller
```

---

## Quick Configuration Example

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .httpBasic(Customizer.withDefaults());
        
        return http.build();
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

---

## Real-World Use Cases

| Scenario | Components Involved |
|----------|---------------------|
| **JWT-based API** | `OncePerRequestFilter` → Custom JWT validation → `SecurityContext` |
| **Form login with database** | `UsernamePasswordAuthenticationFilter` → `DaoAuthenticationProvider` → `UserDetailsService` → `BCryptPasswordEncoder` |
| **OAuth2 / Google Login** | `OAuth2LoginAuthenticationFilter` → `OAuth2UserService` → External provider |
| **LDAP authentication** | `LdapAuthenticationProvider` → `LdapUserSearch` → `PasswordComparisonAuthenticator` |

---

## Key Pitfalls

:::danger Security Risk
**Never disable CSRF protection for form-based applications**. Only disable for stateless APIs that use tokens.
:::

:::danger Memory Leak
Always clear `SecurityContextHolder` manually in async operations or non-web threads.
:::

:::tip Best Practice
Use `DelegatingPasswordEncoder` if you need to support multiple password formats during migration.
:::
