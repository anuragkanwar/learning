# Chapter 1: What is Spring Security?

## Overview

Spring Security is a **powerful and highly customizable authentication and access-control framework** for Spring applications. It protects your application at two levels:

- **Authentication**: Verifying *who* you are (identity verification)
- **Authorization**: Deciding *what* you can do (permission verification)

:::note Key Principle
Security in Spring is **filter-based**. Every request passes through a chain of filters before reaching your controllers.
:::

---

## Analogy: The Hotel Check-In Process

Before diving into code, understand Spring Security through a familiar scenario — **checking into a hotel**:

| Component | Hotel Role | What They Do |
|-----------|------------|--------------|
| **AuthenticationFilter** | Receptionist at the entrance | First person you meet. Takes your name and ID, creates a check-in request. |
| **AuthenticationManager** | Front Desk Manager | Doesn't check you in personally. Knows which specialist to call based on your membership type. |
| **AuthenticationProvider** | Specialist staff (Security/Concierge) | Actually performs the verification. For VIP members → checks VIP database. For regular guests → checks standard registry. |
| **UserDetailsService** | ID verification system | Looks up your reservation in the hotel database. Only fetches your info — doesn't decide if you can enter. |
| **PasswordEncoder** | ID scanner | Verifies your ID is genuine (not forged). Compares your face to the photo. |
| **SecurityContext** | Your room key card | After verification, you get a key card. It proves you're a guest. You show it to access the elevator, gym, pool. |

**The Flow:**
```
You arrive at hotel
      ↓
[Receptionist] Takes your name + ID
      ↓
[Front Desk Manager] Decides which specialist handles your membership type
      ↓
[Specialist] Fetches your reservation (UserDetailsService) 
           + Verifies your ID is real (PasswordEncoder)
      ↓
[Key Card Issued] You now carry proof of identity everywhere in the hotel
```

This is exactly how Spring Security works. **Keep this analogy in mind** as we explore each component.

---

## The Authentication Flow

![Spring Security Authentication Flow](@site/static/img/spring-security-authentication-flow.png)

---

## Core Players: The Security Orchestra

### 1. `AuthenticationFilter` (The Gatekeeper / Receptionist)

**Role**: Intercepts incoming requests and extracts credentials.

- **Analogy**: The receptionist at the hotel entrance — first point of contact
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

### 2. `AuthenticationManager` (The Coordinator / Front Desk Manager)

**Role**: Delegates authentication to the right provider.

- **Analogy**: The front desk manager — doesn't check you in personally, but knows who should
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

### 3. `AuthenticationProvider` (The Specialist)

**Role**: Contains the actual authentication logic.

- **Analogy**: Specialist staff (VIP concierge, security) — actually performs the verification
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

### 4. `UserDetailsService` (The Data Fetcher / ID Database)

**Role**: Loads user-specific data from your data source.

- **Analogy**: The reservation system — looks up your booking by name, returns your details
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

### 5. `PasswordEncoder` (The Hasher / ID Scanner)

**Role**: Encodes and verifies passwords securely.

- **Analogy**: The ID scanner — verifies your ID is genuine and matches your face
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

### 6. `SecurityContext` (The Session Storage / Room Key Card)

**Role**: Holds the authentication details for the current request.

- **Analogy**: Your room key card — proves you're a guest, used to access amenities
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
