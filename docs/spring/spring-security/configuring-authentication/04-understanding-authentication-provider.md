## Understanding AuthenticationProvider

### Recap: The Hogwarts Flow

In Chapter 1, we saw Harry go through the castle gates. Now we dive into **how the Sorting Hat actually works** — or in Spring Security terms: **how authentication is performed**.

Remember:
- **Hagrid** (Filter) collects the name and password
- **McGonagall** (Manager) decides who checks it
- **Sorting Hat** (Provider) actually verifies the student

---

## The Authentication Contract

Before a student can be verified, Spring Security needs an object that holds:
- **Who are you claiming to be?** (username/principal)
- **How will you prove it?** (password/credentials)
- **Are you already verified?** (authenticated flag)

This is the `Authentication` interface.

### `Authentication` — The Student's Claim

```java
public interface Authentication extends Principal {
    
    // Who you claim to be (before auth) or who you are (after auth)
    Object getPrincipal();
    
    // Your proof: password (before auth) or null (after auth)
    Object getCredentials();
    
    // Your permissions after successful auth
    Collection<? extends GrantedAuthority> getAuthorities();
    
    // Extra info: IP address, session ID, etc.
    Object getDetails();
    
    // Are you verified yet?
    boolean isAuthenticated();
    void setAuthenticated(boolean isAuthenticated);
}
```

**Think of it like a student's temporary paper at Hogwarts:**

| Field | Before Sorting | After Sorting |
|-------|----------------|---------------|
| `principal` | "I am Harry Potter" | Harry's full student profile |
| `credentials` | "My password is Hedwig123" | `null` (erased for safety) |
| `authorities` | Empty list | [Gryffindor, ROLE_STUDENT, PLAY_QUIDDITCH] |
| `authenticated` | `false` | `true` |

:::tip Key Concept
The `Authentication` object starts as an **unverified claim** and becomes a **trusted identity** after the Sorting Hat does its work.
:::

---

### Common Authentication Implementations

Spring Security provides several implementations for different scenarios:

| Implementation | Use Case |
|----------------|----------|
| `UsernamePasswordAuthenticationToken` | Form login, username + password |
| `AnonymousAuthenticationToken` | Unauthenticated users browsing public pages |
| `RememberMeAuthenticationToken` | "Remember me" cookie login |
| `PreAuthenticatedAuthenticationToken` | Already authenticated by external system (SSO) |
| `AbstractAuthenticationToken` | Base class for building your own |

---

#### UsernamePasswordAuthenticationToken — The Most Common

This is what you use for standard username/password login:

```java
// Before authentication (what Hagrid creates)
Authentication unverified = new UsernamePasswordAuthenticationToken(
    "harry.potter",      // principal: who they claim to be
    "Hedwig123"          // credentials: their password
);

// After authentication (what the Sorting Hat returns)
Authentication verified = new UsernamePasswordAuthenticationToken(
    harryUserDetails,    // principal: full user object
    null,                // credentials: erased for security
    harryAuthorities     // authorities: what they can do
);
```

---

## The AuthenticationProvider Interface

Now we reach the **Sorting Hat itself** — the component that actually performs authentication.

```java
public interface AuthenticationProvider {
    
    // Perform the actual authentication check
    Authentication authenticate(Authentication authentication)
        throws AuthenticationException;
    
    // Can this provider handle this type of authentication?
    boolean supports(Class<?> authentication);
}
```

**Two Methods Explained:**

1. **`supports()`** — "Can I sort this type of student?"
   - The Hat checks if it can handle the authentication token type
   - Returns `true` if this provider knows how to verify this claim

2. **`authenticate()`** — "Let me verify this student"
   - Performs the actual check
   - Returns a **fully populated** `Authentication` object on success
   - Throws `AuthenticationException` on failure

---

## How It Works: The Sorting Hat's Process

```
Harry arrives at the Sorting Ceremony
      ↓
[Sorting Hat] Receives Harry's claim (UsernamePasswordAuthenticationToken)
      ↓
[Step 1] Check if Hat can sort this type (supports() returns true)
      ↓
[Step 2] Ask the Registry Book for Harry's profile (UserDetailsService)
      ↓
[Step 3] Use the Magic Glass to check password (PasswordEncoder)
      ↓
[Step 4] Create verified Authentication with Harry's full profile + house
      ↓
Harry is now officially a Gryffindor!
```

---

## Built-in Authentication Providers

Spring Security comes with several providers out of the box:

| Provider | What It Does | Use Case |
|----------|--------------|----------|
| `DaoAuthenticationProvider` | Database-based auth | Most common — checks username/password against database |
| `AnonymousAuthenticationProvider` | Guest users | Gives permissions to unauthenticated visitors |
| `RememberMeAuthenticationToken` | Cookie-based auth | "Remember me" functionality |
| `LdapAuthenticationProvider` | LDAP/Active Directory | Enterprise environments |
| `PreAuthenticatedAuthenticationProvider` | External auth | SSO, OAuth, SAML integrations |

---

### DaoAuthenticationProvider — The Default Sorting Hat

This is the provider you'll use most often. It:
1. Takes a username/password token
2. Loads user from database via `UserDetailsService`
3. Checks password via `PasswordEncoder`
4. Returns authenticated token if both match

```java
@Bean
public AuthenticationProvider authenticationProvider(
        UserDetailsService userDetailsService,
        PasswordEncoder passwordEncoder) {
    
    DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
    provider.setUserDetailsService(userDetailsService);
    provider.setPasswordEncoder(passwordEncoder);
    
    return provider;
}
```

---

## Creating a Custom AuthenticationProvider

Sometimes the built-in Sorting Hats aren't enough. Maybe you need to:
- Check a magic spell code instead of a password
- Verify against an external wizard guild API
- Use fingerprint + password together

### Example: Magic Spell Authentication

Imagine students prove their identity by casting a specific spell:

```java
@Component
public class SpellAuthenticationProvider implements AuthenticationProvider {
    
    @Autowired
    private WizardRegistryService wizardService;
    
    @Autowired
    private SpellVerifier spellVerifier;
    
    @Override
    public boolean supports(Class<?> authentication) {
        // Only handle SpellAuthenticationToken
        return SpellAuthenticationToken.class.isAssignableFrom(authentication);
    }
    
    @Override
    public Authentication authenticate(Authentication authentication) {
        String wizardName = authentication.getName();
        String spellCode = authentication.getCredentials().toString();
        
        // Step 1: Find the wizard in the registry
        UserDetails wizard = wizardService.loadUserByUsername(wizardName);
        if (wizard == null) {
            throw new BadCredentialsException("Wizard not found: " + wizardName);
        }
        
        // Step 2: Verify the spell is correct
        if (!spellVerifier.isValidSpell(wizardName, spellCode)) {
            throw new BadCredentialsException("Invalid spell!");
        }
        
        // Step 3: Return authenticated token
        return new SpellAuthenticationToken(
            wizard,              // Full wizard profile
            null,                // Credentials erased
            wizard.getAuthorities() // Their house/permissions
        );
    }
}
```

---

### Custom Authentication Token

You'll also need a custom token to hold your special credentials:

```java
public class SpellAuthenticationToken extends AbstractAuthenticationToken {
    
    private final Object principal;
    private Object credentials;
    
    // Constructor for unauthenticated token (before sorting)
    public SpellAuthenticationToken(Object principal, Object credentials) {
        super(null);  // No authorities yet
        this.principal = principal;
        this.credentials = credentials;
        setAuthenticated(false);  // Not verified yet
    }
    
    // Constructor for authenticated token (after sorting)
    public SpellAuthenticationToken(
            Object principal, 
            Object credentials,
            Collection<? extends GrantedAuthority> authorities) {
        super(authorities);
        this.principal = principal;
        this.credentials = credentials;
        super.setAuthenticated(true);  // Verified!
    }
    
    @Override
    public Object getCredentials() {
        return credentials;
    }
    
    @Override
    public Object getPrincipal() {
        return principal;
    }
}
```

---

### Using Your Custom Provider

Register it with Spring Security:

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Autowired
    private SpellAuthenticationProvider spellProvider;
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authenticationProvider(spellProvider)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/spells/public").permitAll()
                .anyRequest().authenticated()
            )
            .formLogin(Customizer.withDefaults());
        
        return http.build();
    }
}
```

---

## Multiple Providers: Many Sorting Hats

A castle might have different ways to verify people:
- Sorting Hat for students
- Guard validation for visitors
- Special crystal for staff

Spring Security supports multiple providers:

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public AuthenticationManager authenticationManager(
            SpellAuthenticationProvider spellProvider,
            DaoAuthenticationProvider daoProvider,
            VisitorAuthenticationProvider visitorProvider) {
        
        return new ProviderManager(
            spellProvider,    // Tries magic spell auth first
            daoProvider,      // Falls back to username/password
            visitorProvider   // Finally tries visitor pass
        );
    }
}
```

**How it works:**
1. Each provider's `supports()` is checked
2. First provider that returns `true` handles the auth
3. If all fail, authentication fails

---

## Chapter Summary

| Component | Hogwarts Role | What You Learned |
|-----------|---------------|------------------|
| `Authentication` | Student's temporary paper | Holds claim before and identity after |
| `AuthenticationProvider` | The Sorting Hat | Actually performs verification |
| `DaoAuthenticationProvider` | Standard Sorting Hat | Username/password against database |
| `supports()` | "Can I sort this?" | Checks if provider can handle the token |
| `authenticate()` | "Let me verify" | Performs the actual check |
| Custom Provider | Special verification | Create your own logic (spells, biometrics, etc.) |

---

## Quick Reference: When to Use What?

```
Standard username/password login?
    → Use DaoAuthenticationProvider

Need to verify against external API?
    → Write custom AuthenticationProvider

Multiple authentication methods?
    → Configure multiple providers in ProviderManager

Special credentials (tokens, biometrics)?
    → Create custom AuthenticationToken + Provider
```

---

**Next:** 2.3 Using SecurityContext — How the house badge follows Harry everywhere in the castle! 🏰
