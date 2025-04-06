# TypeScript

1. static type validation
2. type validation
3. is also a compiler (ts -> js)
4. is not a runtime language
5. Javascript superset
6. works as guide to your codebase

## Fundamentals of types in javascript

In JavaScript, there are **seven primitive data types**, which are immutable and not objects. They are the most basic building blocks of the language:

1. **`undefined`**:  
   Represents a variable that has been declared but not assigned a value.  
   Example: `let x; console.log(x); // undefined`.

   ### Falsey values

   ```javascript
   Any undefined value is falsey
   ```

2. **`null`**:  
   Represents the intentional absence of any value.  
   Example: `let x = null;`.  
   ⚠️ Note: `typeof null` returns `"object"` due to a historical bug, but `null` is still a primitive.

3. **`boolean`**:  
   Represents a logical value: `true` or `false`.  
   Example: `let isActive = true;`.

   ### Falsey values

   ```javascript
    !!(0) === false
    Boolean("") === false
   ```

4. **`number`**:  
   Represents numeric values (integers, floats, `Infinity`, `NaN`, etc.).  
   Example: `let num = 42;` or `let pi = 3.14;`.

   ```javascript
   const imgNum = Math.sqrt(-1);
   console.log(typeof imgNum); // number
   console.log(imgNum === NaN); // false
   console.log(Number.isNaN(imgNum)); // true
   ```

   ### Falsey values

   ```javascript
   0 or NaN are falsey values
   ```

5. **`string`**:  
   Represents textual data.  
   Example: `let greeting = "Hello";`.  
   ⚠️ Strings are immutable, but methods like `.toUpperCase()` return new strings.

   ### Falsey values

   ```javascript
   "" (empty) string is falsey value
   ```

6. **`symbol`** (ES6+):  
   Represents a unique, immutable identifier. Often used as object property keys.  
   Example: `const id = Symbol('id');`.

   ### Falsey values

   ```javascript
   Every symbol that u create is never going to be equal.
   let symbol1 = Symbol("Apple");
   let symbol2 = Symbol("Apple");
   console.log(symbol1 === symbol2); // false
   ```

7. **`bigint`** (ES2020+):  
   Represents integers larger than the `Number` type can safely hold. Created by appending `n`.  
   Example: `const bigNum = 12345678901234567890n;`.

   ### falsey value

    ```javascript
    1227n === 1227 // false
    ```

### Key Notes

- **Primitives are stored by value**, not by reference (unlike objects).
- **Auto-boxing**: JavaScript temporarily wraps primitives (e.g., `string` to `String` object) to allow method calls like `'text'.toUpperCase()`.
- **`typeof` quirks**:  
  - `typeof null` → `"object"` (historical bug).  
  - `typeof function(){}` → `"function"` (but functions are objects, not primitives).

### Example

```javascript
let a;          // undefined
let b = null;   // null
let c = true;   // boolean
let d = 42;     // number
let e = "text"; // string
let f = Symbol('key'); // symbol
let g = 10n;    // bigint
```

These seven types form the foundation of JavaScript's type system, with all other values being objects (e.g., arrays, functions, dates).

## Type Annotations Vs Type Inference

In TypeScript, **type annotations** and **type inference** are core concepts that work together to enforce type safety while balancing code clarity and developer convenience. Here's a breakdown:

---

### **1. Type Annotations**  

Explicitly declaring the type of a variable, function parameter, return value, etc.  
**Use Cases**:  

- When TypeScript can’t infer the type (e.g., uninitialized variables).  
- To enforce stricter contracts (e.g., function parameters).  
- To document complex types for readability.  

#### **Examples**  

```typescript
// Variables
let age: number = 25;        // Explicitly a number
let name: string = "Alice";  // Explicitly a string

// Function Parameters & Return Types
function add(a: number, b: number): number {
  return a + b;
}

// Arrays
let numbers: number[] = [1, 2, 3];

// Objects
type User = { id: number; name: string };
const user: User = { id: 1, name: "Bob" };

// Union Types (multiple possible types)
let value: string | number;
value = "hello"; // OK
value = 42;      // OK
```

---

### **2. Type Inference**  

TypeScript automatically deduces the type of a value when no explicit annotation is provided.  
**How It Works**:  

- Based on the **initial value** (e.g., `let x = 10` → inferred as `number`).  
- Based on **context** (e.g., event handlers in DOM elements).  

#### **Examples**  

```typescript
// Variables (inferred from initialization)
let isActive = true;     // Inferred as `boolean`
let greeting = "Hello";  // Inferred as `string`

// Functions (return type inferred)
function multiply(a: number, b: number) {
  return a * b;          // Inferred return type: `number`
}

// Arrays (inferred element types)
let fruits = ["apple", "banana"];  // Inferred as `string[]`

// Objects (inferred shape)
const person = { name: "Alice", age: 30 };  
// Inferred as `{ name: string; age: number }`

// Generic Functions (inferred from usage)
function identity<T>(arg: T): T { return arg; }
const result = identity("text");  // Inferred `T` as `string`
```

---

### **Key Differences**  

| **Type Annotations**          | **Type Inference**               |
|-------------------------------|-----------------------------------|
| Explicitly defined by the dev. | Automatically deduced by TS.     |
| Required when TS can’t infer.  | Works when types are obvious.     |
| Improves readability.          | Reduces boilerplate code.         |

---

### **When to Use Which?**  

- **Use Annotations**:  
  - For function parameters and complex return types.  
  - When declaring variables without initializing them (`let x: number;`).  
  - For union/intersection types or custom types (e.g., `User`).  

- **Rely on Inference**:  
  - For initialized variables (e.g., `let x = 10;`).  
  - When the type is obvious from context (e.g., array literals).  
  - To avoid redundancy (e.g., `const user = { name: "Alice" }` instead of writing the full object type).  

---

### **Edge Cases & Notes**  

1. **Empty Arrays**:  

   ```typescript
   let arr = [];  // Inferred as `any[]` (unless strict settings are enabled).  
   // Better to annotate: let arr: number[] = [];
   ```

2. **`any` Type**:  
   Disables type checking. Avoid unless necessary:  

   ```typescript
   let data: any = fetchExternalData(); // Opt-out of type safety
   ```

3. **Contextual Typing**:  
   TypeScript infers types based on context, such as event handlers:  

   ```typescript
   document.addEventListener("click", (e) => { 
     // `e` is inferred as `MouseEvent`
   });
   ```

---

### **Summary**  

- **Type annotations** give you explicit control.  
- **Type inference** reduces boilerplate while maintaining safety.  
- Together, they let TypeScript catch errors at compile time without sacrificing developer productivity.

In TypeScript, `!` and `?` are operators used in specific contexts to handle **nullability** and **optionality**, but they have distinct purposes. Let’s break them down with examples and clarify other related nuances:

---

### **1. `?` (Optional Properties/Parameters)**  

Used to denote **optional** properties in objects or optional parameters in functions.  

#### **Use Cases**

- **Optional Object Properties**:  

  ```typescript
  interface User {
    name: string;
    age?: number; // Optional property (`age` can be `undefined`)
  }

  const alice: User = { name: "Alice" }; // ✅ Valid (no `age`)
  ```

- **Optional Function Parameters**:  

  ```typescript
  function greet(name: string, greeting?: string) {
    // `greeting` is `string | undefined`
    return `${greeting || "Hello"}, ${name}!`;
  }
  greet("Bob"); // ✅ Works (uses default greeting)
  ```

#### **Key Notes**

- Optional properties/parameters are implicitly allowed to be `undefined`.
- Use `?` when a value might not exist at runtime (e.g., partial configurations, optional inputs).

---

### **2. `!` (Non-Null Assertion Operator)**  

Tells TypeScript to treat a value as **non-null/non-undefined**, overriding its default null-checking.  

#### **Use Cases**

- **Definite Assignment Assertion**:  
  Assert that a class property will be initialized later (e.g., in a lifecycle hook like `ngOnInit` in Angular):  

  ```typescript
  class UserProfile {
    username!: string; // Assertion: "Trust me, this will be initialized"
    constructor() { /* Initialization might happen later */ }
  }
  ```

- **Non-Null Assertion in Expressions**:  
  Assert that a variable isn’t `null`/`undefined` in a specific context:  

  ```typescript
  function getLength(str: string | null) {
    return str!.length; // ⚠️ Use with caution! Runtime error if `str` is null.
  }
  ```

#### **Key Notes**

- `!` **does not change runtime behavior**—it’s a compile-time assertion.  
- Overuse can lead to runtime errors if the assertion is incorrect.  
- Prefer safer alternatives like **type guards** or **optional chaining** (`?.`) where possible.

---

### **3. `?:` vs `!:`**  

| **Syntax** | **Meaning**                                 | Example                          |
|------------|---------------------------------------------|----------------------------------|
| `?:`       | Optional property/parameter (`T | undefined`) | `age?: number`                   |
| `!:`       | Definite assignment assertion (no `undefined`) | `name!: string` (class property) |

---

### **Other Nuances**  

#### **Optional Chaining (`?.`)**  

Safely access nested properties without throwing errors if intermediate values are `null`/`undefined`:  

```typescript
const address = user?.profile?.address; // Type: `string | undefined`
```

#### **Nullish Coalescing (`??`)**  

Provide a default value when dealing with `null`/`undefined`:  

```typescript
const greeting = inputGreeting ?? "Hello"; // Uses "Hello" if `inputGreeting` is null/undefined
```

#### **Type Assertions (`as`)**  

Force TypeScript to treat a value as a specific type (use sparingly):  

```typescript
const value = document.getElementById("input") as HTMLInputElement;
```

#### **Union Types (`|`)**  

Combine multiple possible types:  

```typescript
let id: string | number; // Can hold either type
```

---

### **When to Use `?` vs `!`**  

| **Scenario**                          | **Use `?`** | **Use `!`** |
|---------------------------------------|-------------|-------------|
| A property/parameter might be omitted | ✅           | ❌           |
| A value is initialized later (e.g., Angular `ngOnInit`) | ❌ | ✅ |
| You’re certain a value isn’t `null`   | ❌           | ✅ (sparingly) |

---

### **Best Practices**  

1. **Avoid `!` Unless Necessary**: Use type guards or runtime checks instead.  

   ```typescript
   // Safer alternative to `!`
   if (str !== null) {
     console.log(str.length); // TypeScript knows `str` is not null here
   }
   ```

2. **Prefer Optional Chaining (`?.`) and Nullish Coalescing (`??`)**:  
   These provide safer, more readable alternatives to manual checks.  
3. **Use `strictNullChecks`**: Enable this compiler flag to catch potential `null`/`undefined` errors early.  

---

### **Example Workflow**  

```typescript
interface Config {
  timeout?: number; // Optional property
}

class App {
  config!: Config; // Definite assignment assertion (initialized later)

  initialize(config: Config) {
    this.config = config;
    console.log(this.config.timeout ?? 1000); // Use default if missing
  }
}

// Optional parameters and non-null assertion
function fetchData(url: string, retries?: number) {
  const attempts = retries ?? 3; // Default to 3 retries
  const response = makeRequest(url)!; // ⚠️ Unsafe if `makeRequest` can return `null`
}
```

---

### **Summary**  

- **`?`**: Declare optional properties/parameters.  
- **`!`**: Assert non-null/definite assignment (use cautiously).  
- **`?.` and `??`**: Safely handle nullable values.  
- **Avoid `any` and `as`**: Prefer type safety unless unavoidable.  

By combining these tools, you can write robust TypeScript code that balances safety and flexibility.

## Interfaces

In TypeScript, **interfaces** are a powerful way to define **contracts** (shapes) for objects, classes, functions, and other data structures. They act as a blueprint for the expected structure of values, enabling type checking, autocompletion, and documentation. Here’s a detailed breakdown:

---

### **1. Basic Syntax**

Define an interface with the `interface` keyword:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}
```

Use it to type-check objects:

```typescript
const user: User = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
};
```

---

### **2. Key Features of Interfaces**

#### **Optional Properties**  

Use `?` to mark properties as optional:

```typescript
interface Config {
  apiKey: string;
  timeout?: number; // Optional property
}

const config: Config = { apiKey: "123" }; // ✅ Valid (timeout is optional)
```

#### **Readonly Properties**  

Use `readonly` to prevent modification after initialization:

```typescript
interface Point {
  readonly x: number;
  readonly y: number;
}

const p: Point = { x: 10, y: 20 };
p.x = 5; // ❌ Error: Cannot assign to 'x' (readonly)
```

#### **Function Types**  

Define function signatures:

```typescript
interface MathOperation {
  (a: number, b: number): number;
}

const add: MathOperation = (a, b) => a + b;
```

#### **Extending Interfaces**  

Create hierarchical relationships:

```typescript
interface Animal {
  name: string;
}

interface Dog extends Animal {
  breed: string;
}

const myDog: Dog = { name: "Buddy", breed: "Golden Retriever" };
```

#### **Class Implementation**  

Enforce classes to adhere to a contract with `implements`:

```typescript
interface Vehicle {
  start(): void;
  stop(): void;
}

class Car implements Vehicle {
  start() { console.log("Engine started"); }
  stop() { console.log("Engine stopped"); }
}
```

#### **Indexable Types**  

Define arrays or objects with index signatures:

```typescript
interface StringArray {
  [index: number]: string; // Index signature
}

const arr: StringArray = ["a", "b"];
```

---

### **3. Advanced Use Cases**

#### **Hybrid Types**  

Combine multiple roles (e.g., function + object):

```typescript
interface Counter {
  (): void; // Function type
  count: number;
}

const counter: Counter = () => { counter.count++ };
counter.count = 0;
```

#### **Generic Interfaces**  

Use generics for reusable type definitions:

```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
}

const response: ApiResponse<User> = {
  data: { id: 1, name: "Alice" },
  status: 200,
};
```

#### **Declaration Merging**  

Interfaces with the same name **merge** automatically:

```typescript
interface Window {
  title: string;
}

interface Window {
  width: number;
}

// Merged interface: { title: string; width: number; }
```

---

### **4. Interfaces vs. Type Aliases**

| **Interfaces**                          | **Type Aliases**                     |
|-----------------------------------------|--------------------------------------|
| Focus on object shapes.                 | Can represent any type (primitives, unions, etc.). |
| Support declaration merging.            | No merging.                          |
| Extendable via `extends`.               | Use `&` for intersections.           |
| Preferred for OOP/class contracts.      | Better for complex unions or tuples. |

Example with `type`:

```typescript
type User = {
  id: number;
  name: string;
};
```

---

### **5. Best Practices**

1. **Use Interfaces for Object Shapes**: They’re ideal for defining contracts for objects/classes.
2. **Leverage Declaration Merging**: Extend built-in or third-party types (e.g., adding props to `Window`).
3. **Prefer `interface` for Public APIs**: They’re more readable and encourage extension.
4. **Combine with Utility Types**: Use `Partial<T>`, `Pick<T>`, or `Omit<T>` for flexibility:

   ```typescript
   type UserUpdate = Partial<User>; // All properties optional
   ```

---

### **6. Example Workflow**

```typescript
// Define an interface
interface Product {
  id: string;
  name: string;
  price: number;
  discount?: number; // Optional
}

// Extend the interface
interface DigitalProduct extends Product {
  downloadLink: string;
}

// Implement in a class
class Ebook implements DigitalProduct {
  id = "123";
  name = "TS Guide";
  price = 29.99;
  downloadLink = "/download/123";
}

// Use with utility types
type CheapProduct = Pick<Product, "name" | "price">;
```

---

### **Summary**

- **Interfaces** define the shape of objects, functions, classes, and more.
- They support **inheritance**, **merging**, and **optional/readonly modifiers**.
- Use them to enforce consistency, document code, and leverage TypeScript’s type-checking.

## Enum and Tuples

**Enums and Tuples in TypeScript**

**1. Enums (Enumerations)**  
Enums allow you to define a set of named constants, making code more readable and maintainable.

- **Syntax**:  

  ```typescript
  enum Direction {
    Up = 1, // Explicit value (starts at 1)
    Down,   // Auto-increments to 2
    Left,   // 3
    Right,  // 4
  }
  ```

- **Types of Enums**:
  - **Numeric Enums**: Default (auto-increment from `0`), or with explicit values.

    ```typescript
    console.log(Direction.Up); // 1
    console.log(Direction[1]); // "Up" (reverse mapping)
    ```

  - **String Enums**: Each member must be initialized with a string.

    ```typescript
    enum LogLevel {
      Error = "ERROR",
      Warn = "WARN",
    }
    ```

  - **Const Enums**: Inlined during compilation for performance. No runtime object.

    ```typescript
    const enum Size { Small = 10, Medium }
    let size = Size.Small; // Compiles to: let size = 10;
    ```

- **Use Cases**:  
  - Replace magic numbers/strings with meaningful names (e.g., status codes, fixed options).
  - Group related constants (e.g., `HttpMethod.GET`, `UserRole.Admin`).

- **Pitfalls**:  
  - Numeric enums auto-increment, which can break code if members are reordered.
  - String enums lack reverse mappings.

---

**2. Tuples**  
Tuples are arrays with fixed types and lengths, enforcing structure.

- **Syntax**:  

  ```typescript
  let person: [string, number] = ["Alice", 30]; // [name, age]
  let point3D: [number, number, number] = [1, 2, 3];
  ```

- **Features**:
  - **Optional Elements**: Use `?` for optional entries (TypeScript 4.0+).

    ```typescript
    let optionalTuple: [number, string?] = [42]; // Second element is optional
    ```

  - **Rest Elements**: Flexible tails using spread syntax.

    ```typescript
    type StringBooleans = [string, ...boolean[]];
    let flags: StringBooleans = ["start", true, false];
    ```

  - **Labeled Tuples** (TypeScript 4.0+): Names for clarity (no type-checking impact).

    ```typescript
    type HttpStatus = [code: number, message: string];
    let response: HttpStatus = [200, "OK"];
    ```

- **Use Cases**:  
  - Fixed-format data (e.g., coordinates, key-value pairs).
  - Return multiple values from a function with structured types.

- **Pitfalls**:  
  - Runtime array methods (e.g., `push()`) can violate length constraints.
  - Out-of-bounds access isn’t caught at compile time.

---

**When to Use**:

- **Enums**: For a fixed set of related constants (e.g., configuration options).
- **Tuples**: When working with arrays of known length and specific types (e.g., CSV rows).

**Example Comparison**:

```typescript
// Enum Example
enum Status { Pending = "P", Approved = "A" }
let currentStatus: Status = Status.Approved;

// Tuple Example
let httpResponse: [number, string] = [200, "OK"];
```

Enums provide semantic naming, while tuples enforce structured array formats. Both enhance type safety in TypeScript! 🚀
