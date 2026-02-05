---
sidebar_position: 4
title: "11.4 Pagination & Sorting"
---

# 11.4 Pagination & Sorting

## Why Pagination Matters

Fetching all records crashes your app:

```java
// DON'T DO THIS - loads millions of rows into memory
List<User> allUsers = userRepository.findAll();
```

**Solutions:**
1. Pagination (limit + offset)
2. Streaming (process one by one)

---

## Pageable Interface

Spring Data provides `Pageable` for pagination requests:

```java
@Service
public class UserService {
    
    public Page<User> getUsers(int pageNumber, int pageSize) {
        Pageable pageable = PageRequest.of(pageNumber, pageSize);
        return userRepository.findAll(pageable);
    }
    
    // With sorting
    public Page<User> getUsersSorted(int page, int size) {
        Pageable pageable = PageRequest.of(
            page, 
            size, 
            Sort.by("name").ascending()
        );
        return userRepository.findAll(pageable);
    }
}
```

---

## Page vs Slice

| Type | Description | Use When |
|------|-------------|----------|
| `Page<T>` | Contains data + total count | You need total pages (UI pagination) |
| `Slice<T>` | Contains data + hasNext flag | You only need next/prev (infinite scroll) |

```java
// Page - includes total count (extra COUNT query)
Page<User> page = repo.findAll(PageRequest.of(0, 10));
System.out.println("Total pages: " + page.getTotalPages());
System.out.println("Total elements: " + page.getTotalElements());

// Slice - no count query (faster)
Slice<User> slice = repo.findAll(PageRequest.of(0, 10));
System.out.println("Has next: " + slice.hasNext());
```

:::tip Performance
Use `Slice` when you don't need total count — avoids expensive `COUNT(*)` query.
:::

---

## Repository Methods

```java
public interface UserRepository extends JpaRepository<User, Long> {
    
    // Pagination with query methods
    Page<User> findByActiveTrue(Pageable pageable);
    
    // Slice (no count)
    Slice<User> findByDepartment(String dept, Pageable pageable);
    
    // List with Pageable (no count, returns single page)
    List<User> findTop10ByActiveTrue(Pageable pageable);
    
    // Custom query with pagination
    @Query("SELECT u FROM User u WHERE u.age > ?1")
    Page<User> findAdults(int minAge, Pageable pageable);
}
```

---

## Sorting Without Pagination

```java
// Static sorting
List<User> users = repo.findByActiveTrue(Sort.by("name"));

// Multiple fields
Sort sort = Sort.by("department").ascending()
                .and(Sort.by("name").ascending());
List<User> users = repo.findAll(sort);

// Nulls handling
Sort sort = Sort.by(
    Sort.Order.asc("name").nullsLast()
);
```

---

## Page Object Methods

```java
Page<User> page = repo.findAll(PageRequest.of(0, 10));

// Content
List<User> users = page.getContent();

// Pagination info
int currentPage = page.getNumber();        // 0-indexed
int pageSize = page.getSize();
int totalPages = page.getTotalPages();
long totalElements = page.getTotalElements();

// Navigation
boolean hasNext = page.hasNext();
boolean hasPrevious = page.hasPrevious();
Pageable nextPageable = page.nextPageable();
Pageable prevPageable = page.previousPageable();

// Check if first/last
boolean isFirst = page.isFirst();
boolean isLast = page.isLast();
```

---

## REST API Pagination Example

```java
@RestController
public class UserController {
    
    @GetMapping("/users")
    public ResponseEntity<Page<User>> getUsers(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(defaultValue = "id,desc") String[] sort
    ) {
        Sort.Direction direction = sort[1].equalsIgnoreCase("desc") ? 
            Sort.Direction.DESC : Sort.Direction.ASC;
        
        Pageable pageable = PageRequest.of(
            page, 
            size, 
            Sort.by(direction, sort[0])
        );
        
        return ResponseEntity.ok(userRepository.findAll(pageable));
    }
}
```

**Response:**
```json
{
    "content": [{...}, {...}],
    "pageable": {...},
    "totalPages": 10,
    "totalElements": 100,
    "number": 0,
    "size": 10,
    "first": true,
    "last": false
}
```
