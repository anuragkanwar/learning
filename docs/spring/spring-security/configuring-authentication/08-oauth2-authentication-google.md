## OAuth2 Authentication with Google

### The Scenario

You want users to log in with their **Google account** instead of creating a new username/password. This is called **OAuth2 Authentication** or **Social Login**.

**Why use OAuth2?**
- Users don't need to remember another password
- Google handles security (2FA, suspicious activity detection)
- Faster registration — one click to sign up
- Users trust Google more than a new unknown service

**The Hogwarts Analogy:**
Imagine instead of creating a new student ID at Hogwarts, you can prove your identity with official documents. A wizard might have:
- **Ministry of Magic ID** (Google account)
- **Gringotts Bank ID** (GitHub account)
- **Hogwarts Letter** (local username/password)

All these IDs prove the **same person** (one wizard), just through different authorities. Hogwarts keeps a record of:
1. **Who you are** (your core student profile — name, house, year)
2. **Which IDs you've shown** (Google ID #123, GitHub ID #456)

This way, whether you show your Ministry card or Gringotts card, Hogwarts knows you're the **same wizard**.

---

## How OAuth2 Works

### The OAuth2 Flow (Authorization Code Grant)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     STEP 1: INITIATE LOGIN                           │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐                              ┌──────────────┐
│   Frontend   │  1. Click "Login with Google" │   Backend    │
│  (React App) │─────────────────────────────▶│  (Spring)    │
│              │                              │              │
│              │  2. Redirect to Google       │              │
│              │◀─────────────────────────────│              │
│              │  https://accounts.google.com │              │
└──────────────┘  /o/oauth2/v2/auth            └──────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     STEP 2: USER AUTHENTICATES                       │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐                              ┌──────────────┐
│   Browser    │  3. User enters Google       │    Google    │
│              │     credentials              │              │
│              │─────────────────────────────▶│  Validates   │
│              │                              │  User        │
│              │  4. Redirect back with       │              │
│              │     "authorization code"     │              │
│              │◀─────────────────────────────│              │
└──────────────┘                              └──────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     STEP 3: EXCHANGE CODE FOR TOKEN                  │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐  5. Send code to backend    ┌──────────────┐
│   Frontend   │─────────────────────────────▶│   Backend    │
│              │                              │              │
│              │                              │  Backend     │
│              │                              │  exchanges   │
│              │                              │  code with   │
│              │                              │  Google      │
│              │                              │              │
│              │  6. Google returns           │◀─────────────│
│              │     access_token +           │   Google     │
│              │     user info (email, name)  │              │
│              │                              │              │
│              │                              │  Backend     │
│              │                              │  checks DB   │
│              │                              │  for user    │
│              │                              │              │
│              │  7. If new user → save to DB │              │
│              │     If existing → update     │              │
│              │                              │              │
│              │  8. Create JWT/Session       │              │
│              │     Return success           │              │
│              │◀─────────────────────────────│              │
└──────────────┘                              └──────────────┘
```

**Key Points:**
1. **Frontend redirects** to Google — we never see the user's Google password
2. **Google authenticates** the user directly
3. **Google sends a code** back to our app (not the user's credentials!)
4. **Backend exchanges code** for access token + user info
5. **We get user details** from Google (email, name, profile picture)
6. **We check: Is this a new account or existing?**
   - If new account + user exists by email → **Link account to existing user**
   - If new account + new user → **Create both user and account**
   - If existing account → **Just log them in**
7. **We create our own session/JWT** — OAuth is just the first step

---

## Database Design: User vs Account

Instead of putting everything in one table, we split into two entities:

### Why Two Tables?

| Problem with Single Table | Solution with Two Tables |
|---------------------------|-------------------------|
| User logs in with Google → gets record #1 | **User table**: Core profile (name, email) |
| Same user logs in with GitHub → gets record #2 | **Account table**: OAuth connections (provider, providerId) |
| Now we have **duplicate users** for same person! | One user can have **multiple accounts** |
| Can't easily merge accounts | Link accounts by email → same user |

### Entity Relationship

```
┌─────────────────────┐         ┌─────────────────────┐
│        USER         │         │       ACCOUNT       │
├─────────────────────┤         ├─────────────────────┤
│ id (PK)             │◄───────│ id (PK)             │
│ name                │    1:M  │ user_id (FK)        │
│ email (unique)      │         │ provider            │
│ image_url           │         │ provider_id         │
│ roles               │         │ email               │
│ created_at          │         │ created_at          │
└─────────────────────┘         └─────────────────────┘
```

**One User can have Many Accounts (1:M relationship)**

**Example:**
- User: Harry Potter (harry@hogwarts.edu)
  - Account #1: Google (provider=GOOGLE, providerId=google-123)
  - Account #2: GitHub (provider=GITHUB, providerId=github-456)
  - Account #3: Local (provider=LOCAL, password_hash=xxx)

**Benefits:**
- ✅ User can log in with Google OR GitHub → same profile
- ✅ No duplicate user records
- ✅ Can add more providers later without changing User table
- ✅ Can unlink accounts (delete Account record) without deleting User

---

## Do We Need UserDetailsManager?

**Short Answer: No, but we need a service to save users.**

With OAuth2, Spring Security handles most authentication automatically. You don't need to implement `UserDetailsManager` because:

| Traditional Auth | OAuth2 Auth |
|-----------------|-------------|
| You validate passwords | Google validates passwords |
| You implement `UserDetailsService` | Spring provides `OAuth2UserService` |
| You implement `UserDetailsManager` | You create a custom service to save users |
| Manual user CRUD | Users are created automatically on first login |

**What you DO need:**
1. **A custom `OAuth2UserService`** — tells Spring what to do when a user logs in via OAuth2
2. **A user service/repository** — to save/update users in your database
3. **A way to link OAuth users** — connect their Google ID to your local user record

---

## Architecture Overview

### Components We Need

| Component | Role | Why We Need It |
|-----------|------|----------------|
| **OAuth2 Client Registration** | Tells Spring how to talk to Google | Stores client ID, client secret, redirect URLs |
| **Custom OAuth2UserService** | Handles OAuth2 login success | Gets user info from OAuth provider, decides: link account or create new user |
| **User Entity** | Core user profile | Stores identity (name, email, roles) — independent of login method |
| **Account Entity** | OAuth connection | Links OAuth provider to a User — one User can have many Accounts |
| **User Repository** | Find users | Find by email to check if user already exists |
| **Account Repository** | Find OAuth accounts | Find by (provider, providerId) to check if this OAuth account already exists |
| **SecurityConfig** | Main security setup | Enables OAuth2 login, configures URL rules |
| **UserController** | Get user info | Returns current user profile |
| **CustomSuccessHandler** | Post-login redirect | Where to go after successful OAuth2 login |

### How They Work Together

```
┌────────────────────────────────────────────────────────────────────┐
│                         OAUTH2 LOGIN FLOW                           │
└────────────────────────────────────────────────────────────────────┘

1. USER CLICKS "LOGIN WITH GOOGLE"
        │
        ▼
   ┌──────────────────┐
   │ Spring Security  │──▶ Redirects to Google OAuth2 endpoint
   │ OAuth2 Client    │
   └──────────────────┘

2. USER AUTHENTICATES WITH GOOGLE
        │
        ▼
   Google validates user
   Redirects back to /login/oauth2/code/google?code=xxx
        │
        ▼
   ┌──────────────────┐
   │ Spring Security  │──▶ Exchanges code for access_token
   │ OAuth2Login      │    Gets user info from Google
   │ Authentication   │
   │ Filter           │
   └──────────────────┘
        │
        ▼

3. CUSTOM HANDLER PROCESSES USER
   ┌──────────────────┐
   │ CustomOAuth2User │──▶ Extracts email, name, provider, providerId
   │ Service          │    from OAuth provider (Google, GitHub, etc.)
   └──────────────────┘
        │
        ├── Check: Does Account exist?
        │   (provider + providerId)
        │
        ├── YES: Account exists ──▶ Get linked User
        │                           Login as that User
        │
        └── NO: New Account
                │
                ├── Check: Does User exist with this email?
                │
                ├── YES: User exists ──▶ Create new Account
                │                        Link to existing User
                │                        Login as that User
                │
                └── NO: Completely new ──▶ Create new User
                                          Create new Account
                                          Link Account to User
                                          Login as new User
        │
        ▼
   ┌──────────────────┐
   │ SecurityContext  │──▶ Sets authentication
   └──────────────────┘
        │
        ▼
   Redirect to frontend with session/cookie

4. SUBSEQUENT REQUESTS
   ┌──────────────────┐
   │ Session/Cookie   │──▶ Spring Security recognizes user
   │ (or JWT)         │    User is authenticated
   └──────────────────┘
```

---

## Implementation

### Step 1: Dependencies (pom.xml)

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
    
    <!-- OAuth2 Client (THIS IS THE KEY DEPENDENCY) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-oauth2-client</artifactId>
    </dependency>
    
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    
    <!-- Database -->
    <dependency>
        <groupId>com.h2database</groupId>
        <artifactId>h2</artifactId>
        <scope>runtime</scope>
    </dependency>
    
    <!-- Optional: Lombok -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
</dependencies>
```

**Note:** The `spring-boot-starter-oauth2-client` dependency gives us everything needed for OAuth2 login.

---

### Step 2: Application Properties

```yaml
# Server
server.port=8080

# Database
spring.datasource.url=jdbc:h2:mem:hogwartsdb
spring.datasource.driverClassName=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect
spring.h2.console.enabled=true
spring.jpa.hibernate.ddl-auto=create-drop

# OAuth2 Client Registration for Google
# Get these from Google Cloud Console: https://console.cloud.google.com/
spring.security.oauth2.client.registration.google.client-id=YOUR_GOOGLE_CLIENT_ID
spring.security.oauth2.client.registration.google.client-secret=YOUR_GOOGLE_CLIENT_SECRET
spring.security.oauth2.client.registration.google.scope=profile,email
spring.security.oauth2.client.registration.google.redirect-uri=http://localhost:8080/login/oauth2/code/google

# Frontend URL (where to redirect after login)
app.oauth2.authorized-redirect-uri=http://localhost:3000/oauth2/redirect
```

**Getting Google OAuth2 Credentials:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Go to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth client ID"
5. Choose "Web application"
6. Add authorized redirect URI: `http://localhost:8080/login/oauth2/code/google`
7. Copy the Client ID and Client Secret

---

### Step 3: User Entity (Core Profile)

**Role:** Stores the core user identity — independent of how they log in.

**Why we need this:** This is the "master record" for a person. Whether they log in with Google, GitHub, or username/password, they always point to this one User record. This prevents duplicate users when someone uses multiple login methods.

```java
package com.hogwarts.oauth.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false, unique = true)
    private String email;
    
    private String imageUrl;
    
    @Column(nullable = false)
    private Boolean emailVerified = false;
    
    // Roles (apply to user regardless of login method)
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "role")
    private Set<String> roles = new HashSet<>();
    
    // Relationships
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<Account> accounts = new HashSet<>();
    
    // Local password (optional - only if user also has local account)
    private String password;
    
    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```

---

### Account Entity (OAuth Connection)

**Role:** Links an OAuth provider account to a User.

**Why we need this:** One User can have multiple Accounts (Google, GitHub, Facebook, Local). This table stores the provider-specific details while the User table stays clean with just the core profile.

```java
package com.hogwarts.oauth.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Entity
@Table(name = "accounts", 
       uniqueConstraints = {
           @UniqueConstraint(columnNames = {"provider", "provider_id"})
       })
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Account {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // Link to User (many accounts can belong to one user)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    // OAuth Provider (GOOGLE, GITHUB, FACEBOOK, LOCAL)
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private AuthProvider provider;
    
    // Provider's unique ID for this user
    @Column(name = "provider_id", nullable = false)
    private String providerId;
    
    // Email from provider (might differ from User email if user changes it)
    private String email;
    
    // Provider-specific data
    private String accessToken;     // OAuth access token (optional)
    private String refreshToken;    // OAuth refresh token (optional)
    
    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        lastLoginAt = LocalDateTime.now();
    }
}
```

**Why this design is better:**
- ✅ One user profile, many ways to log in
- ✅ Can add new OAuth providers without changing User table
- ✅ Can unlink an account (delete Account row) without deleting User
- ✅ Can track which provider was used for each login
- ✅ Can store provider-specific tokens if needed

**AuthProvider Enum:**

```java
package com.hogwarts.oauth.entity;

public enum AuthProvider {
    LOCAL,    // Traditional username/password
    GOOGLE,   // Google OAuth2
    GITHUB,   // GitHub OAuth2
    FACEBOOK  // Facebook OAuth2
}
```

---

### Step 4: Repositories

#### User Repository

**Role:** Find core user profiles by email.

**Why we need it:** When someone logs in with OAuth, we check if a User with that email already exists. If yes, we link the new OAuth Account to that existing User.

```java
package com.hogwarts.oauth.repository;

import com.hogwarts.oauth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByEmail(String email);
    
    boolean existsByEmail(String email);
}
```

#### Account Repository

**Role:** Find OAuth accounts by provider and providerId.

**Why we need it:** When someone logs in, we first check if they've used this OAuth provider before (by looking up their provider + providerId). This tells us if we should:
- Log them in (account exists)
- Create a new account and link to existing user (same email, new provider)
- Create both new user and new account (completely new person)

```java
package com.hogwarts.oauth.repository;

import com.hogwarts.oauth.entity.Account;
import com.hogwarts.oauth.entity.AuthProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {
    
    // Find account by OAuth provider and provider's unique ID
    Optional<Account> findByProviderAndProviderId(AuthProvider provider, String providerId);
    
    // Check if account exists
    boolean existsByProviderAndProviderId(AuthProvider provider, String providerId);
    
    // Get all accounts for a user (to show "Linked Accounts" in profile)
    List<Account> findByUserId(Long userId);
    
    // Count how many accounts a user has (to prevent deleting last account)
    long countByUserId(Long userId);
}
```

---

### Step 5: Custom OAuth2 User Service

**Role:** The most important class! Handles what happens when a user logs in via OAuth2.

**Why we need it:**
- Spring calls this after successful Google/GitHub authentication
- We get the OAuth user info (email, name, picture, providerId)
- We decide: Link to existing user? Create new user? Or just login?
- This is where the User/Account linking logic lives

**The Logic Flow:**
1. Check if Account exists (provider + providerId)
2. If YES → Account found → Login as linked User
3. If NO → Check if User exists (by email)
4. If YES User found → Create new Account → Link to User → Login
5. If NO User found → Create new User → Create new Account → Link → Login

```java
package com.hogwarts.oauth.security;

import com.hogwarts.oauth.entity.Account;
import com.hogwarts.oauth.entity.AuthProvider;
import com.hogwarts.oauth.entity.User;
import com.hogwarts.oauth.repository.AccountRepository;
import com.hogwarts.oauth.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

@Service
@Slf4j
public class CustomOAuth2UserService extends DefaultOAuth2UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private AccountRepository accountRepository;
    
    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        // 1. Get user info from OAuth2 provider (Google, GitHub, etc.)
        OAuth2User oAuth2User = super.loadUser(userRequest);
        
        // 2. Extract provider info
        String registrationId = userRequest.getClientRegistration().getRegistrationId(); // "google", "github"
        AuthProvider provider = AuthProvider.valueOf(registrationId.toUpperCase());
        
        // 3. Extract user attributes from OAuth provider
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String picture = oAuth2User.getAttribute("picture");
        String pictureUrl = oAuth2User.getAttribute("avatar_url"); // GitHub uses different field
        if (pictureUrl != null) picture = pictureUrl;
        
        Boolean emailVerified = oAuth2User.getAttribute("email_verified");
        if (emailVerified == null) emailVerified = true; // GitHub emails are verified
        
        // Get provider's unique ID for this user
        String providerId;
        if (provider == AuthProvider.GITHUB) {
            providerId = String.valueOf(oAuth2User.getAttribute("id")); // GitHub uses numeric ID
        } else {
            providerId = oAuth2User.getAttribute("sub"); // Google uses "sub"
        }
        
        log.info("OAuth2 login attempt: email={}, provider={}, providerId={}", 
            email, provider, providerId);
        
        // 4. Check if this OAuth Account already exists
        Optional<Account> existingAccount = accountRepository
            .findByProviderAndProviderId(provider, providerId);
        
        User user;
        Account account;
        
        if (existingAccount.isPresent()) {
            // SCENARIO 1: Account exists → User has logged in with this provider before
            account = existingAccount.get();
            user = account.getUser();
            
            // Update account's last login time
            account.setLastLoginAt(LocalDateTime.now());
            accountRepository.save(account);
            
            // Update user's profile (in case name/picture changed)
            user.setName(name);
            user.setImageUrl(picture);
            userRepository.save(user);
            
            log.info("Existing account login: user={}, provider={}", 
                user.getEmail(), provider);
            
        } else {
            // Account doesn't exist → New OAuth connection
            // Check if User with this email already exists (different provider)
            Optional<User> existingUser = userRepository.findByEmail(email);
            
            if (existingUser.isPresent()) {
                // SCENARIO 2: User exists, but this is a NEW OAuth provider
                // → Link new Account to existing User
                user = existingUser.get();
                
                // Update user's profile
                user.setName(name);
                user.setImageUrl(picture);
                userRepository.save(user);
                
                // Create new Account linked to existing User
                account = Account.builder()
                    .user(user)
                    .provider(provider)
                    .providerId(providerId)
                    .email(email)
                    .lastLoginAt(LocalDateTime.now())
                    .build();
                accountRepository.save(account);
                
                log.info("Linked new account to existing user: user={}, newProvider={}",
                    user.getEmail(), provider);
                
            } else {
                // SCENARIO 3: Completely new User and new Account
                // Create User
                user = User.builder()
                    .name(name)
                    .email(email)
                    .imageUrl(picture)
                    .emailVerified(emailVerified)
                    .roles(new HashSet<>() {{ add("ROLE_STUDENT"); }})
                    .build();
                userRepository.save(user);
                
                // Create Account linked to User
                account = Account.builder()
                    .user(user)
                    .provider(provider)
                    .providerId(providerId)
                    .email(email)
                    .lastLoginAt(LocalDateTime.now())
                    .build();
                accountRepository.save(account);
                
                log.info("Created new user and account: email={}, provider={}",
                    email, provider);
            }
        }
        
        // 5. Return OAuth2User with authorities from User
        // We use the User's roles, not hardcoded ones
        Set<SimpleGrantedAuthority> authorities = new HashSet<>();
        user.getRoles().forEach(role -> 
            authorities.add(new SimpleGrantedAuthority(role))
        );
        
        return new DefaultOAuth2User(
            authorities,
            oAuth2User.getAttributes(),
            "email"  // This tells Spring which attribute to use as the username
        );
    }
}
```

**What this code does:**
- **Scenario 1 (Existing Account)**: User logs in with Google again → Just update timestamps
- **Scenario 2 (New Provider)**: User has Google account, now logs in with GitHub → Link GitHub Account to same User
- **Scenario 3 (New User)**: First time visitor → Create both User and Account

**Benefits:**
- ✅ One User profile, multiple login methods
- ✅ User can add Google, GitHub, Facebook to same account
- ✅ Can switch between login methods seamlessly

---

### Step 6: OAuth2 Success Handler

**Role:** Decides where to redirect after successful OAuth2 login.

**Why we need it:** After Google authentication, Spring needs to know where to send the user. For detached frontend/backend, we redirect back to the frontend with a token or cookie.

```java
package com.hogwarts.oauth.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
@Slf4j
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    
    @Value("${app.oauth2.authorized-redirect-uri:http://localhost:3000/oauth2/redirect}")
    private String redirectUri;
    
    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                       HttpServletResponse response,
                                       Authentication authentication) throws IOException, ServletException {
        
        log.info("OAuth2 authentication successful for user: {}", authentication.getName());
        
        // Option 1: Redirect to frontend with JWT token (if using JWT)
        // String token = jwtService.generateToken(authentication);
        // String targetUrl = UriComponentsBuilder.fromUriString(redirectUri)
        //     .queryParam("token", token)
        //     .build().toUriString();
        
        // Option 2: Redirect to frontend (session cookie is already set)
        String targetUrl = redirectUri;
        
        if (response.isCommitted()) {
            log.debug("Response has already been committed");
            return;
        }
        
        clearAuthenticationAttributes(request);
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
```

---

### Step 7: OAuth2 Failure Handler

**Role:** Handles OAuth2 login failures (user denies permission, account disabled, etc.).

```java
package com.hogwarts.oauth.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
@Slf4j
public class OAuth2AuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {
    
    @Value("${app.oauth2.authorized-redirect-uri:http://localhost:3000/oauth2/redirect}")
    private String redirectUri;
    
    @Override
    public void onAuthenticationFailure(HttpServletRequest request,
                                       HttpServletResponse response,
                                       AuthenticationException exception) throws IOException, ServletException {
        
        log.error("OAuth2 authentication failed: {}", exception.getMessage());
        
        // Redirect to frontend with error
        String targetUrl = UriComponentsBuilder.fromUriString(redirectUri)
            .queryParam("error", exception.getLocalizedMessage())
            .build().toUriString();
        
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
```

---

### Step 8: Security Configuration

**Role:** Wires everything together and enables OAuth2 login.

**Key configurations:**
- `oauth2Login()` — Enables OAuth2 login
- `userInfoEndpoint()` — Configures our custom user service
- `successHandler()` / `failureHandler()` — What to do after login

```java
package com.hogwarts.oauth.config;

import com.hogwarts.oauth.security.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {
    
    @Autowired
    private CustomOAuth2UserService customOAuth2UserService;
    
    @Autowired
    private OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;
    
    @Autowired
    private OAuth2AuthenticationFailureHandler oAuth2AuthenticationFailureHandler;
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF (for stateless/session-based API)
            .csrf(AbstractHttpConfigurer::disable)
            
            // Enable CORS for frontend
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            
            // URL authorization rules
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/", "/login", "/error", "/oauth2/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                
                // All other endpoints need authentication
                .anyRequest().authenticated()
            )
            
            // OAuth2 Login configuration
            .oauth2Login(oauth2 -> oauth2
                // The endpoint where Spring shows login options
                .loginPage("/login")
                
                // Custom user service to process OAuth2 user info
                .userInfoEndpoint(userInfo -> 
                    userInfo.userService(customOAuth2UserService)
                )
                
                // Success and failure handlers
                .successHandler(oAuth2AuthenticationSuccessHandler)
                .failureHandler(oAuth2AuthenticationFailureHandler)
            )
            
            // Logout configuration
            .logout(logout -> logout
                .logoutSuccessUrl("http://localhost:3000")
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
                .permitAll()
            );
        
        return http.build();
    }
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // Allow frontend origins
        configuration.setAllowedOrigins(Arrays.asList(
            "http://localhost:3000",
            "http://localhost:5173"
        ));
        
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        
        return source;
    }
}
```

---

### Step 9: User Controller

**Role:** Provides endpoints to get current user info and linked accounts.

```java
package com.hogwarts.oauth.controller;

import com.hogwarts.oauth.entity.Account;
import com.hogwarts.oauth.entity.User;
import com.hogwarts.oauth.repository.AccountRepository;
import com.hogwarts.oauth.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class UserController {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private AccountRepository accountRepository;
    
    // Get current logged-in user info
    @GetMapping("/user/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal OAuth2User principal) {
        if (principal == null) {
            return ResponseEntity.ok(Map.of("authenticated", false));
        }
        
        String email = principal.getAttribute("email");
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        Map<String, Object> response = new HashMap<>();
        response.put("authenticated", true);
        response.put("id", user.getId());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("imageUrl", user.getImageUrl());
        response.put("roles", user.getRoles());
        
        return ResponseEntity.ok(response);
    }
    
    // Get linked accounts for current user
    @GetMapping("/user/accounts")
    public ResponseEntity<?> getLinkedAccounts(@AuthenticationPrincipal OAuth2User principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        
        String email = principal.getAttribute("email");
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Get all accounts linked to this user
        List<Account> accounts = accountRepository.findByUserId(user.getId());
        
        List<Map<String, Object>> accountList = accounts.stream()
            .map(account -> {
                Map<String, Object> acc = new HashMap<>();
                acc.put("id", account.getId());
                acc.put("provider", account.getProvider());
                acc.put("email", account.getEmail());
                acc.put("linkedAt", account.getCreatedAt());
                acc.put("lastLoginAt", account.getLastLoginAt());
                return acc;
            })
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(Map.of(
            "userEmail", user.getEmail(),
            "linkedAccounts", accountList,
            "totalAccounts", accountList.size()
        ));
    }
    
    // Public endpoint
    @GetMapping("/public/info")
    public ResponseEntity<?> publicInfo() {
        return ResponseEntity.ok(Map.of(
            "message", "This is public information",
            "loginUrls", List.of(
                "/oauth2/authorization/google",
                "/oauth2/authorization/github"
            )
        ));
    }
}
```

---

### Step 10: React Frontend Integration

**Login Button Component:**

```javascript
// LoginButton.js
import React from 'react';

const LoginButton = () => {
  const handleGoogleLogin = () => {
    // Redirect to Spring Boot OAuth2 endpoint
    window.location.href = 'http://localhost:8080/oauth2/authorization/google';
  };

  return (
    <button onClick={handleGoogleLogin} className="google-login-btn">
      <img src="/google-icon.png" alt="Google" />
      Sign in with Google
    </button>
  );
};

export default LoginButton;
```

**OAuth2 Redirect Handler:**

```javascript
// OAuth2RedirectHandler.js
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const OAuth2RedirectHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if there's an error
    const params = new URLSearchParams(location.search);
    const error = params.get('error');
    
    if (error) {
      console.error('OAuth2 error:', error);
      navigate('/login?error=' + error);
      return;
    }
    
    // Successful login - session cookie is already set
    // Redirect to dashboard
    navigate('/dashboard');
  }, [location, navigate]);

  return <div>Processing login...</div>;
};

export default OAuth2RedirectHandler;
```

**Protected Route with User Info:**

```javascript
// Dashboard.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Dashboard = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Fetch current user (cookie automatically sent)
    axios.get('http://localhost:8080/api/user/me', {
      withCredentials: true  // Important for sending cookies!
    })
    .then(response => {
      if (response.data.authenticated) {
        setUser(response.data);
      } else {
        window.location.href = '/login';
      }
    })
    .catch(error => {
      console.error('Error fetching user:', error);
      window.location.href = '/login';
    });
  }, []);

  if (!user) return <div>Loading...</div>;

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <img src={user.imageUrl} alt={user.name} />
      <p>Email: {user.email}</p>
      <p>Provider: {user.provider}</p>
      
      <button onClick={() => {
        window.location.href = 'http://localhost:8080/logout';
      }}>
        Logout
      </button>
    </div>
  );
};

export default Dashboard;
```

---

## Testing the OAuth2 Flow

### 1. Start the Application

```bash
./mvnw spring-boot:run
```

### 2. Access Public Info

```bash
curl http://localhost:8080/api/public/info
```

### 3. Try to Access Protected Endpoint (Should Fail)

```bash
curl http://localhost:8080/api/user/me
# Response: 302 Redirect to /login
```

### 4. Initiate OAuth2 Login

Open browser and go to:
```
http://localhost:8080/oauth2/authorization/google
```

This redirects to Google's login page.

### 5. After Login

Google redirects back to:
```
http://localhost:8080/login/oauth2/code/google?code=xxx
```

Spring processes this and redirects to your frontend.

### 6. Check User Was Saved

```bash
curl http://localhost:8080/h2-console
# Check the WIZARDS table — your Google account should be there!
```

---

## Summary: Do You Need UserDetailsManager?

**No!** With OAuth2, Spring Security handles authentication. You only need:

| What You Think You Need | What You Actually Need |
|------------------------|----------------------|
| `UserDetailsManager` | `UserRepository` and `AccountRepository` |
| `UserDetailsService` | `CustomOAuth2UserService` (extends `DefaultOAuth2UserService`) |
| Password encoding | Not required for OAuth users (provider handles passwords) |
| Manual user CRUD | Automatic creation in `CustomOAuth2UserService` with linking logic |
| Single table for users | **Two tables:** `User` (profile) + `Account` (OAuth connections) |

**The OAuth2 user lifecycle with User/Account pattern:**

1. **First login with Google** → Create User + Create Account → Link Account to User
2. **Login again with Google** → Find existing Account → Login as linked User
3. **First login with GitHub** (same email as Google) → Create new Account → Link to existing User
4. **Result:** One User profile, multiple login methods

**Database after multiple OAuth logins:**
```
USER table:
┌────┬────────────────┬──────────────────┐
│ id │ name           │ email            │
├────┼────────────────┼──────────────────┤
│ 1  │ Harry Potter   │ harry@hogwarts.edu│
└────┴────────────────┴──────────────────┘

ACCOUNT table:
┌────┬─────────┬─────────────┬─────────────────┐
│ id │ user_id │ provider    │ provider_id     │
├────┼─────────┼─────────────┼─────────────────┤
│ 1  │ 1       │ GOOGLE      │ google-123      │
│ 2  │ 1       │ GITHUB      │ github-456      │
└────┴─────────┴─────────────┴─────────────────┘
```

**One User, Multiple Accounts!**

---

## Chapter Summary

| Component | Role | Harry Potter Analogy |
|-----------|------|---------------------|
| **OAuth2 Client** | Configures Google/GitHub connection | Ministry of Magic / Gringotts registration |
| **CustomOAuth2UserService** | Links accounts or creates users | Sorting Hat connecting IDs to student |
| **User Entity** | Core student profile | Hogwarts student record |
| **Account Entity** | OAuth provider link | Ministry ID card, Gringotts card, etc. |
| **Success Handler** | Redirects after login | Pointing to Gryffindor tower |
| **SecurityConfig** | Enables OAuth2 | Castle gates configuration |

**Key Design Decision: User vs Account**
- **User** = The person (Harry Potter)
- **Account** = The login method (Google #123, GitHub #456)
- **One User can have Many Accounts** (1:M relationship)
- **Benefit:** User can log in with Google OR GitHub → same profile

**Key Differences from JWT:**
- No passwords to manage
- No `AuthenticationProvider` needed
- Spring handles token exchange with OAuth providers
- You only handle the "what to do with user info" part
- **Database is more normalized** (separate User and Account tables)

**Next:** Chapter 3 — Authorization: What wizards can do at Hogwarts! 🛡️
