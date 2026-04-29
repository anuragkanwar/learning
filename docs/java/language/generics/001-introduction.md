# Introduction to Java Generics

:::note What You Will Learn
- What generics are and why they matter
- How type erasure works
- Writing generic methods
- Understanding primitive vs reference types
:::

## What Are Generics?

Generics allow **the same code to be reused** for creating or handling objects of different types.

Instead of writing separate code for each type, you write generic code that works with any type.

```java
// Without generics - need separate lists
List intList = new ArrayList();
List stringList = new ArrayList();

// With generics - one list works for any type
List<Integer> ints = new ArrayList<>();
List<String> strings = new ArrayList<>();
```

### Two Kinds of Generic Code

| Kind | Examples | Where Found |
|------|----------|--------------|
| **Generic Types** | Collection classes (`List`, `Set`, `Map`) | `java.util` package |
| **Generic Methods** | Static utility methods | `java.util.Collections` |

---

## Generic Types

### Type Parameters

A **type parameter** is a placeholder for a specific type that you provide when using the generic type.

```java
List<String>  // String is the type parameter
Map<Integer, String>  // Integer and String are type parameters
```

### Type Erasure

:::important Key Concept
`List<Integer>` and `List<String>` are **the same type at runtime**. The type information is **erased** during compilation.
:::

```java
List<Integer> ints = new ArrayList<>();
List<String> strings = new ArrayList<>();

// At runtime, both are just "List"
System.out.println(ints.getClass() == strings.getClass()); // true
```

This is called **type erasure** — the compile-time process by which type annotations are removed prior to bytecode generation.

#### Why Erasure?

Java chose erasure to maintain backward compatibility with older code. This design was crucial for **easing evolution** and keeping Java popular.

### Cast-Iron Guarantee

:::tip Guaranteed Safety
The implicit casts added by the compilation of generics **never fail**.
:::

When you retrieve an element from a `List<String>`, the compiler automatically casts it to `String`. This cast is guaranteed to succeed because the compiler already verified the types at compile time.

### Arrays vs Generic Types

| Aspect | Arrays | Generic Types |
|--------|--------|---------------|
| **Reification** | Component types are preserved at runtime | Element types are **not** reified |
| **Runtime Type Info** | `new String[5]` stores component type `String` | `new ArrayList<String>()` stores **no** element type |

```java
// Arrays preserve component type
String[] arr = new String[5];
String element = arr[0]; // No cast needed, type is known

// Lists lose element type info
List<String> list = new ArrayList<>();
// When retrieving, you get Object - compiler adds cast
String element = (String) list.get(0); // Implicit cast added
```

---

## Generic Methods

A **generic method** is a method that declares its own type parameter.

### Syntax

```java
public class Lists {
    public static <T> List<T> toList(T[] arr) {
        List<T> list = new ArrayList<>();
        for (T elt : arr) {
            list.add(elt);
        }
        return list;
    }
}
```

Key points:
- **`<T>`** before the return type declares `T` as a type variable
- **T** can be any reference type (not primitive)
- The scope of `T` is **local to the method**

### Calling Generic Methods

```java
// Type is inferred from the argument
List<Integer> ints = Lists.toList(new Integer[] {1, 2, 3});
List<String> words = Lists.toList(new String[] {"Hello", "world!"});
```

### When to Explicitly Specify Type

When arguments don't provide enough type information, you must specify the type explicitly:

```java
// Correct - use dotted form with explicit type
List<Integer> ints = Lists.<Integer>toList();
var objs = Lists.<Object>toList(1, "two");

// Wrong - non-dotted form cannot use explicit type
List<Integer> ints = <Integer>toList(); // Compile error!
```

:::note Java Grammar Rule
Type parameters in method invocations only appear with **dotted form** (e.g., `Lists.<Integer>toList()`).
:::

---

## Primitive vs Reference Types

### The Distinction

| Category | Types | Can Use as Type Parameter? |
|----------|-------|----------------------------|
| **Primitive** | `byte`, `short`, `int`, `long`, `float`, `double`, `boolean`, `char` | ❌ No |
| **Reference** | Classes, interfaces, arrays | ✅ Yes |

### Boxing and Unboxing

- **Boxing**: Converting primitive → wrapper class (`int` → `Integer`)
- **Unboxing**: Converting wrapper class → primitive (`Integer` → `int`)

```java
// Explicit boxing
Integer boxed = Integer.valueOf(42);

// Explicit unboxing
int primitive = boxed.intValue();

// Autoboxing - compiler does it automatically
List<Integer> list = new ArrayList<>();
list.add(5);  // int 5 auto-boxed to Integer

// Autounboxing
int num = list.get(0);  // Integer auto-unboxed to int
```

### Performance Example

```java
// ✅ Efficient - uses primitive in loop
public static int sum(List<Integer> ints) {
    int s = 0;
    for (int n : ints) {  // Autounboxing happens here
        s += n;
    }
    return s;  // Returns primitive
}

// ⚠️ Less efficient - uses wrapper everywhere
public static Integer sumInefficient(List<Integer> ints) {
    Integer s = 0;
    for (Integer n : ints) {
        s += n;  // Unboxing, addition, boxing on every iteration!
    }
    return s;
}
```

:::danger Performance Warning
Boxing/unboxing on every iteration in tight loops **significantly impacts performance** in critical code paths.
:::

### The null Gotcha

`null` is a member of every reference type, but **not** a valid primitive:

```java
List<Integer> list = new ArrayList<>();
list.add(null);  // OK - null is valid for Integer

int num = list.get(0);  // NullPointerException! Cannot unbox null to int
```

---

## Summary

| Concept | Key Point |
|---------|-----------|
| **Generics** | Reusable code for different types |
| **Type Erasure** | Type info removed at compile time |
| **Generic Methods** | Declare `<T>` before return type |
| **Type Parameters** | Must be reference types (no primitives) |
| **Boxing/Unboxing** | Auto-conversion between primitives and wrappers |
| **Arrays vs Generics** | Arrays reify component types; generics don't |

These fundamentals will guide you through the rest of this chapter on Java Generics.
