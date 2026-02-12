## JWT Authentication for Detached Architecture

### The Scenario

You are building a modern application where:
- **Frontend**: React app running on `http://localhost:3000`
- **Backend**: Spring Boot API running on `http://localhost:8080`

The frontend and backend are completely separate. They communicate via HTTP requests, and the backend must authenticate users without traditional session cookies.

### Why JWT?

**JSON Web Tokens (JWT)** are perfect for this setup because:
- They are **stateless** — no session storage needed on the server
- They travel with every request in the Authorization header
- They can contain user information (claims) inside the token
- They expire automatically after a set time

Think of a JWT like a **magical train ticket**: it proves who you are, shows where you can go, and expires after your journey.

---

## The JWT Authentication Flow

Before diving into code, understand how JWT authentication works step by step:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LOGIN PHASE                                  │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐                              ┌──────────────┐
│   Frontend   │                              │   Backend    │
│  (React App) │                              │  (Spring)    │
│              │  1. POST /api/auth/login     │              │
│              │     {username, password}     │              │
│              │─────────────────────────────▶│              │
│              │                              │  AuthController
│              │                              │  validates   │
│              │                              │  credentials │
│              │  2. {jwt: "eyJhbG...",       │              │
│              │     user: {...}}             │  JwtService  │
│              │◀─────────────────────────────│  generates   │
│              │                              │  token       │
│              │                              │              │
└──────────────┘                              └──────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      SUBSEQUENT REQUESTS                             │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐                              ┌──────────────┐
│   Frontend   │  3. GET /api/spells          │   Backend    │
│              │     Authorization: Bearer    │              │
│              │     eyJhbG...                │              │
│              │─────────────────────────────▶│              │
│              │                              │  JwtFilter   │
│              │                              │  validates   │
│              │                              │  token       │
│              │                              │              │
│              │  4. {spells: [...]}          │  Controller  │
│              │◀─────────────────────────────│  returns     │
│              │                              │  data        │
└──────────────┘                              └──────────────┘
```

**Key Points:**
1. **Login happens once** — client sends credentials, server returns JWT
2. **Token is stored on client** (localStorage, sessionStorage, or memory)
3. **Token sent with every request** in `Authorization: Bearer <token>` header
4. **Server validates token** — no database lookup for sessions

---

## Architecture Overview

Here are all the components we need and what each one does:

### 1. Entity & Repository Layer
| Component | Role | Why We Need It |
|-----------|------|----------------|
| `Wizard` (Entity) | Defines the user table structure | Stores wizard data (username, email, password, roles) in database |
| `WizardRepository` | Database access | Finds wizards by username/email when logging in |

### 2. DTOs (Data Transfer Objects)
| Component | Role | Why We Need It |
|-----------|------|----------------|
| `LoginRequest` | Receives login data | Captures username/password from HTTP request body |
| `SignupRequest` | Receives registration data | Captures new user info with validation rules |
| `JwtResponse` | Sends token back to client | Returns JWT + user info after successful login |

### 3. Security Layer
| Component | Role | Why We Need It |
|-----------|------|----------------|
| `UserDetailsImpl` | Wraps our Wizard for Spring Security | Converts our `Wizard` entity into Spring's `UserDetails` format |
| `UserDetailsServiceImpl` | Loads user from database | Spring calls this to find users during authentication |
| `JwtService` | Creates and validates JWT tokens | **Core component** — signs tokens with secret key, extracts data from tokens |
| `JwtAuthenticationFilter` | Intercepts every request | Checks if request has valid JWT in header, sets authentication context |
| `JwtAuthenticationEntryPoint` | Handles auth failures | Returns proper 401 JSON response when authentication fails |

### 4. Configuration Layer
| Component | Role | Why We Need It |
|-----------|------|----------------|
| `SecurityConfig` | Main security setup | Configures CORS (for frontend origin), disables CSRF (stateless), sets URL permissions, adds JWT filter |

### 5. Controller Layer
| Component | Role | Why We Need It |
|-----------|------|----------------|
| `AuthController` | Login & signup endpoints | Receives credentials, authenticates user, returns JWT token |
| `TestController` | Protected endpoints | Demonstrates role-based access control |

---

## How They Work Together

```
┌────────────────────────────────────────────────────────────────────┐
│                         REQUEST FLOW                                │
└────────────────────────────────────────────────────────────────────┘

1. LOGIN REQUEST
   POST /api/auth/login
   {username: "harry", password: "hedwig"}
        │
        ▼
   ┌──────────────────┐
   │ AuthController   │──▶ Calls AuthenticationManager
   └──────────────────┘
        │
        ▼
   ┌──────────────────┐
   │ UserDetailsServiceImpl │──▶ Loads Wizard from database
   └──────────────────┘
        │
        ▼
   ┌──────────────────┐
   │ DaoAuthenticationProvider │──▶ Checks password with BCrypt
   └──────────────────┘
        │
        ▼
   ┌──────────────────┐
   │ JwtService       │──▶ Creates signed JWT token
   └──────────────────┘
        │
        ▼
   Returns {token: "eyJhbG..."} to client

2. PROTECTED REQUEST
   GET /api/spells
   Authorization: Bearer eyJhbG...
        │
        ▼
   ┌──────────────────┐
   │ JwtAuthenticationFilter │──▶ Extracts token from header
   └──────────────────┘
        │
        ▼
   ┌──────────────────┐
   │ JwtService       │──▶ Validates signature & expiration
   └──────────────────┘
        │
        ▼
   ┌──────────────────┐
   │ UserDetailsServiceImpl │──▶ Loads user details (optional, from token)
   └──────────────────┘
        │
        ▼
   ┌──────────────────┐
   │ SecurityContext  │──▶ Sets authentication for this request
   └──────────────────┘
        │
        ▼
   ┌──────────────────┐
   │ TestController   │──▶ Returns data if user has permission
   └──────────────────┘
```

---

## Project Structure

```
src/main/java/com/hogwarts/auth/
├── config/
│   └── SecurityConfig.java
├── controller/
│   └── AuthController.java
├── dto/
│   ├── LoginRequest.java
│   ├── SignupRequest.java
│   └── JwtResponse.java
├── entity/
│   └── Wizard.java
├── repository/
│   └── WizardRepository.java
├── security/
│   ├── JwtAuthenticationEntryPoint.java
│   ├── JwtAuthenticationFilter.java
│   ├── UserDetailsImpl.java
│   └── UserDetailsServiceImpl.java
├── service/
│   └── JwtService.java
└── AuthApplication.java
```

---

## Dependencies (pom.xml)

```xml
<dependencies>
    <!-- Spring Boot Starters -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    
    <!-- JWT Library -->
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.12.3</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>0.12.3</version>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>0.12.3</version>
        <scope>runtime</scope>
    </dependency>
    
    <!-- Database -->
    <dependency>
        <groupId>com.h2database</groupId>
        <artifactId>h2</artifactId>
        <scope>runtime</scope>
    </dependency>
    
    <!-- Lombok (optional, reduces boilerplate) -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
</dependencies>
```

---

## Entity: The Wizard

**Role:** Defines the database table structure for storing user information.

**Why we need it:** This is our `User` entity that JPA will map to a database table. It stores the wizard's identity (username, email), credentials (password), and permissions (roles).

```java
package com.hogwarts.auth.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "wizards")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Wizard {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank
    @Size(max = 50)
    private String username;
    
    @NotBlank
    @Size(max = 100)
    @Email
    private String email;
    
    @NotBlank
    @Size(max = 120)
    private String password;
    
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "wizard_roles", joinColumns = @JoinColumn(name = "wizard_id"))
    @Column(name = "role")
    private Set<String> roles = new HashSet<>();
    
    private boolean enabled = true;
    
    public Wizard(String username, String email, String password) {
        this.username = username;
        this.email = email;
        this.password = password;
    }
}
```

---

## Repository: Finding Wizards

**Role:** Provides database access methods for the Wizard entity.

**Why we need it:** Spring Data JPA automatically implements the methods to find wizards by username or email. We need this to look up users during login.

```java
package com.hogwarts.auth.repository;

import com.hogwarts.auth.entity.Wizard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WizardRepository extends JpaRepository<Wizard, Long> {
    
    Optional<Wizard> findByUsername(String username);
    
    Optional<Wizard> findByEmail(String email);
    
    boolean existsByUsername(String username);
    
    boolean existsByEmail(String email);
}
```

---

## DTOs: Data Transfer Objects

**Role:** Objects that carry data between frontend and backend.

**Why we need them:** They define the structure of JSON requests/responses and add validation rules. They keep our entity classes separate from the API contract.

### LoginRequest.java

```java
package com.hogwarts.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    
    @NotBlank
    private String username;
    
    @NotBlank
    private String password;
}
```

### SignupRequest.java

```java
package com.hogwarts.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Set;

@Data
public class SignupRequest {
    
    @NotBlank
    @Size(min = 3, max = 50)
    private String username;
    
    @NotBlank
    @Size(max = 100)
    @Email
    private String email;
    
    @NotBlank
    @Size(min = 6, max = 40)
    private String password;
    
    private Set<String> roles;
}
```

### JwtResponse.java

```java
package com.hogwarts.auth.dto;

import lombok.Data;
import lombok.AllArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
public class JwtResponse {
    
    private String token;
    private String type = "Bearer";
    private Long id;
    private String username;
    private String email;
    private List<String> roles;
    
    public JwtResponse(String token, Long id, String username, String email, List<String> roles) {
        this.token = token;
        this.id = id;
        this.username = username;
        this.email = email;
        this.roles = roles;
    }
}
```

### MessageResponse.java

```java
package com.hogwarts.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MessageResponse {
    
    private String message;
}
```

---

## Security: UserDetails Implementation

**Role:** Bridges our `Wizard` entity with Spring Security's user representation.

**Why we need it:** Spring Security expects a `UserDetails` object with specific methods (`getUsername()`, `getPassword()`, `getAuthorities()`, etc.). This class wraps our `Wizard` entity and provides those methods.

### UserDetailsImpl.java

```java
package com.hogwarts.auth.security;

import com.hogwarts.auth.entity.Wizard;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

@Data
@AllArgsConstructor
public class UserDetailsImpl implements UserDetails {
    
    private static final long serialVersionUID = 1L;
    
    private Long id;
    private String username;
    private String email;
    
    @JsonIgnore
    private String password;
    
    private Collection<? extends GrantedAuthority> authorities;
    
    private boolean enabled;
    
    public static UserDetailsImpl build(Wizard wizard) {
        List<GrantedAuthority> authorities = wizard.getRoles().stream()
            .map(SimpleGrantedAuthority::new)
            .collect(Collectors.toList());
        
        return new UserDetailsImpl(
            wizard.getId(),
            wizard.getUsername(),
            wizard.getEmail(),
            wizard.getPassword(),
            authorities,
            wizard.isEnabled()
        );
    }
    
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }
    
    @Override
    public boolean isAccountNonLocked() {
        return true;
    }
    
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }
}
```

### UserDetailsServiceImpl.java

```java
package com.hogwarts.auth.security;

import com.hogwarts.auth.entity.Wizard;
import com.hogwarts.auth.repository.WizardRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {
    
    @Autowired
    private WizardRepository wizardRepository;
    
    @Override
    @Transactional
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Wizard wizard = wizardRepository.findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException(
                "Wizard not found: " + username
            ));
        
        return UserDetailsImpl.build(wizard);
    }
}
```

---

## JWT Service: Creating and Validating Tokens

**Role:** The core JWT operations — creating tokens and checking if they're valid.

**Why we need it:** This is the heart of JWT authentication. It:
- **Signs tokens** with a secret key (so they can't be forged)
- **Validates tokens** on incoming requests (checks signature and expiration)
- **Extracts information** from tokens (username, claims)

**Important:** The secret key must be kept secure! Anyone with the key can create valid tokens.

```java
package com.hogwarts.auth.service;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import com.hogwarts.auth.security.UserDetailsImpl;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {
    
    @Value("${jwt.secret:mySecretKey123456789012345678901234567890}")
    private String jwtSecret;
    
    @Value("${jwt.expiration:86400000}")  // 24 hours in milliseconds
    private int jwtExpirationMs;
    
    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
    
    // Generate token from authentication object
    public String generateToken(Authentication authentication) {
        UserDetailsImpl userPrincipal = (UserDetailsImpl) authentication.getPrincipal();
        
        Map<String, Object> claims = new HashMap<>();
        claims.put("id", userPrincipal.getId());
        claims.put("email", userPrincipal.getEmail());
        
        return Jwts.builder()
            .claims(claims)
            .subject(userPrincipal.getUsername())
            .issuedAt(new Date())
            .expiration(new Date((new Date()).getTime() + jwtExpirationMs))
            .signWith(getSigningKey())
            .compact();
    }
    
    // Generate token from username
    public String generateToken(String username) {
        Map<String, Object> claims = new HashMap<>();
        return createToken(claims, username);
    }
    
    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
            .claims(claims)
            .subject(subject)
            .issuedAt(new Date(System.currentTimeMillis()))
            .expiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
            .signWith(getSigningKey())
            .compact();
    }
    
    // Validate token
    public boolean validateToken(String authToken) {
        try {
            Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(authToken);
            return true;
        } catch (SecurityException | MalformedJwtException | ExpiredJwtException |
                 UnsupportedJwtException | IllegalArgumentException e) {
            System.err.println("Invalid JWT: " + e.getMessage());
        }
        return false;
    }
    
    // Check if token is valid for user
    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }
    
    // Extract username from token
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }
    
    // Extract expiration date
    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }
    
    // Extract any claim
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }
    
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
    
    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }
}
```

---

## JWT Authentication Filter

**Role:** Intercepts every HTTP request and validates the JWT token.

**Why we need it:** This filter runs before every request to protected endpoints. It:
- Extracts the JWT from the `Authorization: Bearer <token>` header
- Validates the token using `JwtService`
- Loads user details and sets the authentication in `SecurityContext`
- If valid, the request proceeds to the controller
- If invalid, the request is rejected with 401

**Flow:** Every request → Filter checks token → Sets auth context → Controller handles request

```java
package com.hogwarts.auth.security;

import com.hogwarts.auth.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Autowired
    private JwtService jwtService;
    
    @Autowired
    private UserDetailsServiceImpl userDetailsService;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            // Get JWT from request
            String jwt = parseJwt(request);
            
            // Validate and set authentication
            if (jwt != null && jwtService.validateToken(jwt)) {
                String username = jwtService.extractUsername(jwt);
                
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                
                UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                    );
                
                authentication.setDetails(
                    new WebAuthenticationDetailsSource().buildDetails(request)
                );
                
                // Set authentication in SecurityContext
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception e) {
            logger.error("Cannot set user authentication: {}", e);
        }
        
        filterChain.doFilter(request, response);
    }
    
    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");
        
        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }
        
        return null;
    }
}
```

---

## Authentication Entry Point

**Role:** Handles authentication failures (when someone tries to access a protected endpoint without a valid token).

**Why we need it:** When authentication fails, Spring Security needs to send a proper response. Instead of a default HTML error page, we return a JSON response that the frontend can handle.

**Example response:**
```json
{
  "error": "Unauthorized",
  "message": "Full authentication is required to access this resource"
}
```

```java
package com.hogwarts.auth.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {
    
    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException, ServletException {
        
        // Return 401 Unauthorized when authentication fails
        response.setContentType("application/json");
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.getWriter().write(
            "{\"error\": \"Unauthorized\", \"message\": \"" + 
            authException.getMessage() + "\"}"
        );
    }
}
```

---

## Security Configuration

**Role:** The main security setup that wires everything together.

**Why we need it:** This class tells Spring Security:
- **Which URLs are public** (`/api/auth/**`) and which need authentication
- **How to handle CORS** — allowing requests from the React frontend
- **To disable CSRF** — not needed for stateless JWT authentication
- **To use stateless sessions** — no server-side session storage
- **To add our JWT filter** — so it runs before every request
- **Which authentication provider to use** — DaoAuthenticationProvider with our UserDetailsService

**Key configurations explained:**
- `csrf().disable()` — CSRF protection is for session-based auth, not JWT
- `sessionManagement().sessionCreationPolicy(STATELESS)` — Don't create sessions
- `cors()` — Allow cross-origin requests from React app
- `addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)` — Check JWT before standard auth

```java
package com.hogwarts.auth.config;

import com.hogwarts.auth.security.JwtAuthenticationEntryPoint;
import com.hogwarts.auth.security.JwtAuthenticationFilter;
import com.hogwarts.auth.security.UserDetailsServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {
    
    @Autowired
    private UserDetailsServiceImpl userDetailsService;
    
    @Autowired
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    
    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    
    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }
    
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Enable CORS and disable CSRF (for JWT stateless auth)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            
            // Exception handling for unauthorized requests
            .exceptionHandling(exception -> 
                exception.authenticationEntryPoint(jwtAuthenticationEntryPoint)
            )
            
            // Stateless session (no server-side session)
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            
            // URL authorization rules
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/test/**").permitAll()
                
                // Swagger/OpenAPI (if you use it)
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                
                // All other endpoints require authentication
                .anyRequest().authenticated()
            );
        
        // Add JWT filter before UsernamePasswordAuthenticationFilter
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // Allow frontend origin
        configuration.setAllowedOrigins(Arrays.asList(
            "http://localhost:3000",      // React dev server
            "http://localhost:4200",      // Angular dev server
            "http://localhost:8081",      // Vue dev server
            "http://localhost:5173"       // Vite dev server
        ));
        
        // Allowed HTTP methods
        configuration.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
        ));
        
        // Allowed headers
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "Accept",
            "Origin",
            "X-Requested-With"
        ));
        
        // Allow credentials (cookies, authorization headers)
        configuration.setAllowCredentials(true);
        
        // Expose headers to frontend
        configuration.setExposedHeaders(Arrays.asList("Authorization"));
        
        // Max age for preflight cache
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        
        return source;
    }
}
```

---

## Auth Controller

**Role:** Handles login and registration HTTP requests.

**Why we need it:** This is the API that the frontend calls:
- **POST `/api/auth/login`** — Validates credentials, returns JWT token
- **POST `/api/auth/signup`** — Creates new user, saves to database

**Login flow:**
1. Receive username/password from frontend
2. Call `AuthenticationManager` to validate credentials
3. If valid, use `JwtService` to generate a token
4. Return the token + user info to frontend

**Signup flow:**
1. Receive user details from frontend
2. Check if username/email already exists
3. Encrypt password with `PasswordEncoder`
4. Save new wizard to database

```java
package com.hogwarts.auth.controller;

import com.hogwarts.auth.dto.*;
import com.hogwarts.auth.entity.Wizard;
import com.hogwarts.auth.repository.WizardRepository;
import com.hogwarts.auth.security.UserDetailsImpl;
import com.hogwarts.auth.service.JwtService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {
    
    @Autowired
    private AuthenticationManager authenticationManager;
    
    @Autowired
    private WizardRepository wizardRepository;
    
    @Autowired
    private PasswordEncoder encoder;
    
    @Autowired
    private JwtService jwtService;
    
    // LOGIN endpoint
    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        
        // Authenticate the user
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                loginRequest.getUsername(),
                loginRequest.getPassword()
            )
        );
        
        // Set authentication in context
        SecurityContextHolder.getContext().setAuthentication(authentication);
        
        // Generate JWT token
        String jwt = jwtService.generateToken(authentication);
        
        // Get user details
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        // Get roles
        List<String> roles = userDetails.getAuthorities().stream()
            .map(item -> item.getAuthority())
            .collect(Collectors.toList());
        
        // Return JWT response
        return ResponseEntity.ok(new JwtResponse(
            jwt,
            userDetails.getId(),
            userDetails.getUsername(),
            userDetails.getEmail(),
            roles
        ));
    }
    
    // SIGNUP endpoint
    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        
        // Check username exists
        if (wizardRepository.existsByUsername(signUpRequest.getUsername())) {
            return ResponseEntity.badRequest()
                .body(new MessageResponse("Error: Username is already taken!"));
        }
        
        // Check email exists
        if (wizardRepository.existsByEmail(signUpRequest.getEmail())) {
            return ResponseEntity.badRequest()
                .body(new MessageResponse("Error: Email is already in use!"));
        }
        
        // Create new wizard
        Wizard wizard = new Wizard(
            signUpRequest.getUsername(),
            signUpRequest.getEmail(),
            encoder.encode(signUpRequest.getPassword())
        );
        
        // Set roles
        Set<String> strRoles = signUpRequest.getRoles();
        Set<String> roles = new HashSet<>();
        
        if (strRoles == null || strRoles.isEmpty()) {
            roles.add("ROLE_STUDENT");
        } else {
            strRoles.forEach(role -> {
                switch (role) {
                    case "admin":
                        roles.add("ROLE_ADMIN");
                        break;
                    case "teacher":
                        roles.add("ROLE_TEACHER");
                        break;
                    default:
                        roles.add("ROLE_STUDENT");
                }
            });
        }
        
        wizard.setRoles(roles);
        wizardRepository.save(wizard);
        
        return ResponseEntity.ok(new MessageResponse("Wizard registered successfully!"));
    }
}
```

---

## Test Controller

**Role:** Demonstrates how to protect endpoints with role-based access.

**Why we need it:** Shows how to use `@PreAuthorize` annotations to restrict access based on user roles. This is how you protect your actual business endpoints.

**Example usage:**
- `@PreAuthorize("hasRole('STUDENT')")` — Only logged-in students can access
- `@PreAuthorize("hasRole('ADMIN')")` — Only admins can access
- `@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")` — Teachers or admins can access

```java
package com.hogwarts.auth.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test")
@CrossOrigin(origins = "*", maxAge = 3600)
public class TestController {
    
    @GetMapping("/all")
    public String allAccess() {
        return "Public Content.";
    }
    
    @GetMapping("/student")
    @PreAuthorize("hasRole('STUDENT') or hasRole('TEACHER') or hasRole('ADMIN')")
    public String studentAccess() {
        return "Student Content.";
    }
    
    @GetMapping("/teacher")
    @PreAuthorize("hasRole('TEACHER')")
    public String teacherAccess() {
        return "Teacher Board.";
    }
    
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public String adminAccess() {
        return "Admin Board.";
    }
}
```

---

## Application Properties

**Role:** Configuration values for the application.

**Key settings:**
- `jwt.secret` — The secret key used to sign JWT tokens (keep this safe!)
- `jwt.expiration` — Token validity period in milliseconds (24 hours = 86400000)
- `spring.datasource` — Database connection (using H2 in-memory for demo)
- `spring.jpa.hibernate.ddl-auto=create-drop` — Recreate database on each run (for development only!)

:::danger Production Warning
- Never use `create-drop` in production — you'll lose all data!
- Never commit the JWT secret to Git — use environment variables!
- Use a proper database (PostgreSQL, MySQL) in production!
:::

```yaml
# Server
server.port=8080

# Database (H2 for demo)
spring.datasource.url=jdbc:h2:mem:hogwartsdb
spring.datasource.driverClassName=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect
spring.h2.console.enabled=true

# JPA
spring.jpa.hibernate.ddl-auto=create-drop
spring.jpa.show-sql=true

# JWT
jwt.secret=mySecretKey12345678901234567890123456789012
jwt.expiration=86400000

# Logging
logging.level.org.springframework.security=DEBUG
```

---

## Data Initializer (Optional)

**Role:** Creates test users when the application starts.

**Why we need it:** For development and testing, it's useful to have pre-created users. This runs automatically on startup and adds:
- `dumbledore` / `phoenix` — Admin user
- `harry.potter` / `hedwig123` — Student user

**Note:** This is for development only. Remove or modify for production.

```java
package com.hogwarts.auth.config;

import com.hogwarts.auth.entity.Wizard;
import com.hogwarts.auth.repository.WizardRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class DataInitializer implements CommandLineRunner {
    
    @Autowired
    private WizardRepository wizardRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Override
    public void run(String... args) throws Exception {
        // Create admin
        if (!wizardRepository.existsByUsername("dumbledore")) {
            Wizard admin = new Wizard();
            admin.setUsername("dumbledore");
            admin.setEmail("dumbledore@hogwarts.edu");
            admin.setPassword(passwordEncoder.encode("phoenix"));
            admin.setRoles(Set.of("ROLE_ADMIN", "ROLE_TEACHER"));
            wizardRepository.save(admin);
        }
        
        // Create student
        if (!wizardRepository.existsByUsername("harry.potter")) {
            Wizard student = new Wizard();
            student.setUsername("harry.potter");
            student.setEmail("harry@hogwarts.edu");
            student.setPassword(passwordEncoder.encode("hedwig123"));
            student.setRoles(Set.of("ROLE_STUDENT"));
            wizardRepository.save(student);
        }
    }
}
```

---

## Testing with curl

### 1. Register a new wizard

```bash
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "hermione.granger",
    "email": "hermione@hogwarts.edu",
    "password": "crookshanks",
    "roles": ["student"]
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "harry.potter",
    "password": "hedwig123"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "type": "Bearer",
  "id": 2,
  "username": "harry.potter",
  "email": "harry@hogwarts.edu",
  "roles": ["ROLE_STUDENT"]
}
```

### 3. Access protected endpoint

```bash
curl -X GET http://localhost:8080/api/test/student \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

### 4. Access without token (should fail)

```bash
curl -X GET http://localhost:8080/api/test/student
```

**Response:**
```json
{
  "error": "Unauthorized",
  "message": "Full authentication is required to access this resource"
}
```

---

## React Frontend Integration Example

```javascript
// api.js - Axios configuration
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// AuthService.js
import api from './api';

const AuthService = {
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },
  
  signup: async (username, email, password, roles) => {
    return api.post('/auth/signup', { username, email, password, roles });
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  getCurrentUser: () => {
    return JSON.parse(localStorage.getItem('user'));
  }
};

export default AuthService;

// Using in a component
import AuthService from './services/AuthService';

const handleLogin = async (e) => {
  e.preventDefault();
  try {
    const data = await AuthService.login(username, password);
    console.log('Login successful:', data);
    navigate('/dashboard');
  } catch (error) {
    console.error('Login failed:', error.response?.data?.message);
  }
};
```

---

## Summary

This implementation includes:

| Component | Purpose |
|-----------|---------|
| **JWT Service** | Creates and validates tokens |
| **JWT Filter** | Intercepts requests and validates tokens |
| **UserDetailsService** | Loads users from database |
| **Security Config** | CORS, URL rules, stateless sessions |
| **Auth Controller** | Login and signup endpoints |
| **Method Security** | Role-based access with `@PreAuthorize` |

The backend is now ready to serve a detached frontend on any origin!
