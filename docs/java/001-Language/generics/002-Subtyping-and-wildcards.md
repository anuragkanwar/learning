# Subtyping and Wildcards in Java Generics

## Subtyping and Substitution Principle

### What is Subtyping?

In Java, one type is a **subtype** of another if they're related by `extends` or `implements`.

**Examples:**

- Integer extends Number → Integer is a subtype of Number
- Double extends Number → Double is a subtype of Number
- `ArrayList<E>` implements `List<E>` → `ArrayList<E>` is a subtype of `List<E>`
- `List<E>` extends `Collection<E>` → `List<E>` is a subtype of `Collection<E>`

### Key Properties of Subtyping

- **Transitive:** If A is a subtype of B, and B is a subtype of C, then A is a subtype of C
- **Reflexive:** Every type is a subtype of itself
- **Every reference type** is a subtype of Object
- Object is a supertype of every reference type

### The Substitution Principle

> Wherever a value of type T is expected, you can provide a value of a subtype of T.

```java
void printNumber(Number n) {
    System.out.println(n);
}

Integer i = 10;
printNumber(i); // Works! Integer is a subtype of Number
```

:::tip
This is the core principle behind polymorphism in Java. You can always use a subtype where a supertype is expected.
:::

### The Problem: Why `List<Integer>` is NOT a subtype of `List<Number>`

It seems logical: since Integer is a subtype of Number, shouldn't `List<Integer>` be a subtype of `List<Number>`?

**No!** Here's why:

```java
List<Integer> ints = new ArrayList<>();
List<Number> nums = ints;  // COMPILE ERROR - but imagine it worked
nums.add(3.14);            // Adding a Double to what is actually a List<Integer>

// Now ints sees a Double! Type system broken:
Integer i = ints.get(0);  // ClassCastException at runtime!
```

The same problem applies in reverse:

```java
List<Number> nums = new ArrayList<>();
nums.add(3.14);
List<Integer> ints = nums;  // COMPILE ERROR - but imagine it worked

// Now ints points to a list with a Double
```

:::danger
If `List<Integer>` were a subtype of `List<Number>`, the type system would be broken. You could add a Double to what appears to be a `List<Integer>` and cause runtime ClassCastException.
:::

**Conclusion:**

- `List<Integer>` is NOT a subtype of `List<Number>`
- `List<Number>` is NOT a subtype of `List<Integer>`
- The only subtype relationship is `List<Integer>` → `List<Integer>` (itself)

---

## Wildcards: The Solution

The wildcard `` `?` `` represents an **unknown but fixed type**. It solves the problem of flexible yet type-safe collections.

### Unbounded Wildcard: `` `?` ``

```java
void printCollection(Collection<?> c) {
    for (Object item : c) {
        System.out.println(item);
    }
}
```

- You can pass `Collection<String>` or `Collection<Integer>` or any type
- **Limitation:** You can only read as Object (the only guaranteed supertype)
- **Limitation:** You cannot add anything except null

:::note
`Collection<?>` is different from `Collection<Object>`. You can add to `Collection<Object>`, but you cannot add anything (except null) to `Collection<?>`.
:::

### Bounded Wildcards: Two Options

| Wildcard | Meaning | Use Case |
|----------|---------|----------|
| `` `?` `` extends E | Some unknown subtype of E | **Reading** from a collection |
| `` `?` `` super E | Some unknown supertype of E | **Writing** to a collection |

---

## `` `?` `` extends E - Producer Extends

Use `` `?` `` extends E when you only **read** from a collection.

```java
void printNumbers(List<? extends Number> nums) {
    for (Number n : nums) {
        System.out.println(n);
    }
}

// Works with any List of Number subtypes
List<Integer> ints = Arrays.asList(1, 2, 3);
List<Double> doubles = Arrays.asList(1.1, 2.2);

printNumbers(ints);     // OK
printNumbers(doubles);   // OK
```

### Why You CAN'T Add to `` `?` `` extends

```java
List<Integer> ints = new ArrayList<>();
List<? extends Number> nums = ints;  // OK - Integer is a subtype of Number
nums.add(3.14);                       // COMPILE ERROR!
```

**The Mental Model:** Think of `` `?` `` as a blindfold. The compiler doesn't "remember" what you assigned—it only sees the declaration type `List<? extends Number>`.

**Compiler's perspective:**

1. nums is declared as `List<? extends Number>`
2. I don't know if it's actually a `List<Integer>`, `List<Double>`, or something else
3. If I let you add a Double, it might crash a `List<Integer>` later
4. To be safe: I block all additions (except null)

:::tip
The wildcard doesn't become "defined" or "locked in" by the assignment. Instead, `` `?` `` literally means "Unknown" to the compiler at all times.
:::

### What WORKS with `` `?` `` extends:

```java
List<Integer> ints = new ArrayList<>();
ints.add(1);

List<? extends Number> nums = ints;
Number n = nums.get(0);  // OK! We know it's at least a Number
Object o = nums.get(0);  // OK! Everything is an Object
```

**Golden Rule:** `` `?` `` extends = **Producer** = Read-only (you can get out, but not put in)

---

## `` `?` `` super E - Consumer Super

Use `` `?` `` super E when you **write** to a collection.

```java
void addIntegers(List<? super Integer> list) {
    list.add(1);    // OK! We know Integer fits
    list.add(2);    // OK!
    // list.get(0);  // Returns Object, not Integer
}

// Works with any List that can hold Integer
List<Number> numbers = new ArrayList<>();
List<Object> objects = new ArrayList<>();

addIntegers(numbers);  // OK - Integer is a subtype of Number
addIntegers(objects);  // OK - Integer is a subtype of Object
```

### Why You CAN Add to `` `?` `` super

```java
List<Number> nums = new ArrayList<>();
List<? super Integer> list = nums;  // OK - Integer is a subtype of Number
list.add(3.14);                     // COMPILE ERROR! Double is not Integer
list.add(42);                       // OK! 42 is an Integer
```

**Compiler's perspective:**

1. list is declared as `List<? super Integer>`
2. I know it can hold Integer or any supertype (Number, Object)
3. I can safely let you add Integer because it fits in all of those
4. Reading returns Object (the only guaranteed type)

### What WORKS with `` `?` `` super:

```java
List<Number> nums = new ArrayList<>();
nums.add(1.5);

List<? super Integer> list = nums;
list.add(42);                       // OK!
Object o = list.get(0);             // OK! Only Object is guaranteed
// Integer i = list.get(0);         // COMPILE ERROR!
```

**Golden Rule:** `` `?` `` super = **Consumer** = Write-only (you can put in, but get out only as Object)

---

## PECS: Producer Extends, Consumer Super

```java
// If you ONLY read from a collection → use ? extends
void readList(List<? extends Number> list) {
    Number n = list.get(0);  // OK
}

// If you ONLY write to a collection → use ? super
void writeList(List<? super Integer> list) {
    list.add(42);  // OK
}

// If you BOTH read and write? → use exact type or bounded on both sides
void copyList(List<? extends Number> source, List<? super Number> dest) {
    for (Number n : source) {
        dest.add(n);
    }
}
```

:::tip
Remember: **PECS** = Producer Extends, Consumer Super. Use extends when producing/reading values, use super when consuming/writing values.
:::

---

## Quick Reference

| Scenario | Wildcard | Example |
|----------|----------|---------|
| Only reading items OUT | `` `?` `` extends T | `List<? extends Number>` |
| Only writing items IN | `` `?` `` super T | `List<? super Integer>` |
| Don't care about bounds | `` `?` `` | `Collection<?>` |

---

## Thingsd to remember

- **Subtyping** in Java is not transitive with generics—`List<Integer>` is not a subtype of `List<Number>`
- **Wildcards** solve this by letting you express "some unknown type"
- **`` `?` `` extends T** — Producer — Read-only, can only pull items out as type T
- **`` `?` `` super T** — Consumer — Write-only, can add items of type T, but only get Object back
- **PECS** — Use extends for producers (reading), super for consumers (writing)


## Arrays
Arrays compares how Java handles standard arrays versus generic lists, specifically focusing on the **Substitution Principle** and the **Get and Put Principle**

### 1. The Core Difference: Covariance vs. Invariance
* **Arrays are Covariant:** In Java, if `Integer` is a subtype of `Number`, then an `Integer[]` is automatically considered a subtype of `Number[]`. You can substitute an `Integer[]` wherever a `Number[]` is required.
* **Lists are Invariant:** A `List<Integer>` is **not** a subtype of `List<Number>`. They are treated as strictly separate types by the compiler.

### 2. The Problem with Arrays: Runtime Crashes
[cite_start]Because array subtyping is covariant, it suffers from a major type-safety flaw[cite: 11785]. You can point a `Number[]` reference to an `Integer[]` object. If you then try to insert a `Double` into that array, the compiler will allow it (because a `Double` is a `Number`). However, the program will crash at runtime because the actual array object in memory was instantiated to only hold `Integer`s.

**Code Example (The Array Trap):**
```java
Integer[] ints = new Integer[] {1, 2, 3};
Number[] nums = ints;  // Valid! Arrays are covariant.

nums[0] = 3.14;        // COMPILES FINE, but throws ArrayStoreException at RUNTIME!
```
[cite_start]To catch this, Java arrays are forced to perform type checks at runtime[cite: 11785]. This makes them prone to sudden runtime errors.

### 3. The Generics Solution: Compile-Time Safety
[cite_start]Generics were designed to fix this flaw by catching errors at compile time instead of run time[cite: 11785]. Because generics are invariant, the compiler stops you from making unsafe assignments.

**Code Example (The Generics Fix):**
```java
List<Integer> ints = new ArrayList<>(Arrays.asList(1, 2, 3));
// List<Number> nums = ints; // COMPILE-TIME ERROR! Prevents the trap.
```
Because the compiler outright rejects assigning a `List<Integer>` to a `List<Number>`, you can never accidentally insert a `Double` into an Integer list. 

### 4. Reintroducing Covariance Safely (The Get and Put Principle)
If you *want* the subtyping flexibility of arrays (where a `Number` collection can reference an `Integer` collection), you must use wildcards (`? extends`). [cite_start]Wildcards reintroduce covariant subtyping for generics[cite: 11639].

**Code Example (Safe Covariance with Wildcards):**
```java
List<Integer> ints = new ArrayList<>(Arrays.asList(1, 2, 3));
List<? extends Number> nums = ints; // Valid! Wildcards restore covariance.

// nums.add(3.14); // COMPILE-TIME ERROR! 
Number n = nums.get(0); // Valid! We can "Get" but not "Put"
```
[cite_start]This is where the **Get and Put Principle** comes in[cite: 11578]. When you use an `extends` wildcard, you are safely allowed to **Get** values out of the list (since we know they are at least `Number`s). However, the compiler completely prevents you from **Putting** any new elements into the list. By restricting mutations, Generics safely give you the flexibility of array subtyping without the dangerous runtime crashes.




## Bounded vs Unbounded

### The Fundamental Rule: The "Get and Put" Principle (PECS)

Before deciding on bounded vs. unbounded, the book relies heavily on the **Get and Put Principle** (often remembered as PECS: Producer Extends, Consumer Super). This principle dictates how you should type a collection based on what you are doing with it:

1.  **Producer (Get):** If you are only retrieving ("getting") values *out* of a structure, use an upper bound: `? extends T`.
2.  **Consumer (Put):** If you are only inserting ("putting") values *into* a structure, use a lower bound: `? super T`.
3.  **Both:** If you need to both get and put, you must use the exact type `T` (no wildcards).

### When to Use Unbounded Wildcards (`?`)

An unbounded wildcard (`?`) is essentially a shortcut for `? extends Object`. The book explains that you should use an unbounded wildcard when your code meets **two specific criteria**:

#### Criterion 1: Your logic does not depend on the specific type `T`.
You are performing operations that apply equally to all objects, regardless of their actual type. You don't need to invoke any methods specific to a certain class; methods defined on `Object` (like `toString()`, `equals()`, or `hashCode()`) are sufficient.

#### Criterion 2: You only need to *Get* (or manipulate the collection structure itself).
Because `?` implies `? extends Object`, the Get and Put principle applies. You can safely "Get" items out (and treat them as `Object`), but you cannot "Put" anything into a `Collection<?>` (except `null`, which is valid for any reference type).

**Code Example: The Unbounded Wildcard**

```java
// We only need to iterate and call toString() (which comes from Object).
// We don't care what specific type is in the collection.
public static void printAll(Collection<?> collection) {
    for (Object o : collection) {
        System.out.println(o); // Safe to Get as Object
    }
    
    // collection.add("String"); // COMPILE ERROR: Cannot Put into Collection<?>
    // collection.add(new Object()); // COMPILE ERROR
    collection.add(null); // Valid, but rarely useful
}
```

### When to Use Bounded Wildcards (`? extends T` or `? super T`)

Bounded wildcards are necessary when the logic of your method **does** depend on the elements being of a certain type (or a subtype/supertype thereof).

#### Using Upper Bounds (`? extends T`)
Use this when you are writing a "Producer" method that needs to read elements, and you need those elements to possess specific methods or properties defined by type `T`.

**Code Example: The Upper Bound**

```java
// We need to call doubleValue(), which is defined in Number.
// An unbounded wildcard <?> wouldn't work here.
public static double sum(Collection<? extends Number> numbers) {
    double total = 0.0;
    for (Number n : numbers) {
        total += n.doubleValue(); // Safe to Get as Number
    }
    
    // numbers.add(3.14); // COMPILE ERROR: Cannot Put into ? extends Number
    return total;
}
```

#### Using Lower Bounds (`? super T`)
Use this when you are writing a "Consumer" method that needs to insert elements of type `T` into a collection. The collection must be typed to `T` or one of its superclasses to guarantee that adding a `T` is safe.

**Code Example: The Lower Bound**

```java
// We are putting Integers INTO the list.
// The list can be List<Integer>, List<Number>, or List<Object>.
public static void addNumbers(List<? super Integer> list) {
    list.add(1); 
    list.add(2); // Safe to Put Integer
    
    // Integer i = list.get(0); // COMPILE ERROR: Get returns Object, not guaranteed Integer
}
```

### The Digest: Bounded vs. Unbounded

The book's ultimate guidance on choosing between them boils down to analyzing the **contract of your method**:

* **Choose Unbounded (`?`) when:** Your method is purely structural or relies solely on `Object` methods. You want maximum flexibility to accept *any* collection type, and you are willing to give up the ability to add elements or call specific type methods. Examples: `size()`, `clear()`, `contains()`, or iterating to print.
* **Choose Bounded (`? extends T` or `? super T`) when:** Your method's semantic logic requires knowledge of the type. If you need to read elements and treat them as `Shape`s to call `draw()`, use `? extends Shape`. If you need to populate a collection with `Apple`s, use `? super Apple`.

By rigidly adhering to the Get and Put Principle, the book demonstrates that the choice between bounded and unbounded is rarely a stylistic preference; it is dictated by whether your code acts as an agnostic observer (Unbounded) or a typed participant (Bounded).


## Wildcard capture


### The Problem: Wildcards Don't Know Their Own Type
When you use a wildcard (`?`), the compiler treats it as an "unknown type." This becomes a problem when you need to perform operations that require the compiler to logically connect two elements of the *same* unknown type. 

The classic example the book uses is writing a method to reverse a list. 

If you try to write a reverse method using an unbounded wildcard (`List<?>`), you might intuitively write something like this:

**The Failing Approach:**
```java
public static void reverse(List<?> list) {
    List<Object> tmp = new ArrayList<Object>(list);
    for (int i = 0; i < list.size(); i++) {
        list.set(i, tmp.get(list.size() - i - 1)); // COMPILE-TIME ERROR!
    }
}
```
**Why does this fail?** Because of the **Get and Put Principle**. `List<?>` acts as a producer. You can safely *get* elements out of it (as `Object`), but you **cannot** *put* elements into it (except `null`). The compiler doesn't know what type of objects `list` holds (it might be a `List<String>` or `List<Integer>`), so it prevents you from calling `list.set(...)` with an `Object`. 

### The Solution: Type Variables to the Rescue
To perform the swap, the compiler needs to guarantee that the item being taken out of the list is exactly the right type to be put back into the list. A wildcard (`?`) cannot express this guarantee, but a named type parameter (`<T>`) can.

If we rewrite the method using a type parameter `T`, it works perfectly:

**The Type-Variable Approach:**
```java
public static <T> void reverse(List<T> list) {
    List<T> tmp = new ArrayList<T>(list);
    for (int i = 0; i < list.size(); i++) {
        list.set(i, tmp.get(list.size() - i - 1)); // Valid!
    }
}
```
Because the list is `List<T>`, the compiler knows that `tmp` holds elements of type `T`, and `list.set` strictly accepts elements of type `T`. The types match perfectly.

### What is "Wildcard Capture"?
While the `<T>` approach works, API designers often prefer exposing methods with wildcards (`List<?>`) because they are simpler and more flexible for the caller. 

**Wildcard Capture** is a technique where you expose a public API using a wildcard, but internally delegate the work to a private helper method that uses a named type parameter.

**Code Example: The Wildcard Capture Idiom**

```java
// Public API uses the friendly wildcard
public static void reverse(List<?> list) {
    rev(list); // Calls the helper method
}

// Private helper method uses a named type parameter
private static <T> void rev(List<T> list) {
    List<T> tmp = new ArrayList<T>(list);
    for (int i = 0; i < list.size(); i++) {
        list.set(i, tmp.get(list.size() - i - 1));
    }
}
```

### How the Magic Works (The "Capture")
When `reverse(List<?> list)` calls `rev(list)`, a fascinating compiler mechanism happens:
1. The `reverse` method passes a `List<?>` (a list of some unknown type).
2. The `rev` method expects a `List<T>` (a list of some specific type `T`).
3. The compiler safely bridges this gap. It says: *"I don't know what the wildcard type is, but for the duration of this method call, I will bind the type parameter `T` to whatever that unknown type happens to be."*

This binding of the unknown wildcard type to a named type variable `T` is exactly what is meant by **Wildcard Capture**. 

### The Digest
The book emphasizes that Wildcard Capture isn't a new language feature you have to declare; it's an automatic compiler behavior. You use it by pairing a public wildcard method with a private `<T>` helper method. 

* **Why do it?** It allows you to offer a clean, flexible API to your users (`List<?>`) while internally gaining the strict type-safety and mutation abilities required by your logic (`List<T>`).
* **When to use it?** Whenever you receive a wildcard parameter but need to write code that depends on the exact identity of that type (like moving an element from one spot in a collection to another).
