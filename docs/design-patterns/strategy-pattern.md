# Strategy Pattern - The Complete Guide

*A comprehensive guide based on "Head First Design Patterns" Chapter 1*

---

## The Story Begins: Meet SimUDuck

Once upon a time (well, in the early 2000s), there was a highly successful duck pond simulation game called **SimUDuck**. This game could display hundreds of different duck species swimming and making quacking sounds. The original designers used standard object-oriented principles and created one `Duck` superclass from which all other duck types inherited.

```java
// The original Duck superclass
public class Duck {
    public void quack() {
        System.out.println("Quack");
    }
    
    public void swim() {
        System.out.println("Swimming");
    }
    
    public void display() {
        System.out.println("I look like a duck");
    }
}

// MallardDuck inherits from Duck
public class MallardDuck extends Duck {
    public void display() {
        System.out.println("I'm a real Mallard duck");
    }
}

// RubberDuck inherits from Duck
public class RubberDuck extends Duck {
    public void display() {
        System.out.println("I'm a rubber duck");
    }
}
```

Everything was great until the company executives asked Joe (the developer) to add a flying feature to make the game even more spectacular.

---

## The Problem: What Joe Tried First

### Attempt 1: Just Add the fly() Method to Duck

Joe thought this was easy - just add a `fly()` method to the `Duck` superclass:

```java
public class Duck {
    public void quack() { System.out.println("Quack"); }
    public void swim() { System.out.println("Swimming"); }
    public void display() { System.out.println("I look like a duck"); }
    public void fly() { System.out.println("I'm flying"); }  // Added!
}
```

**This broke everything.**

Rubber ducks started flying. Decoy ducks (which are fake wooden decoys) started flying. Ducks that shouldn't fly were now flying across the screen. The problem? Not all ducks should fly.

### Attempt 2: Using Java Interfaces

Joe realized inheritance wasn't the answer, so he tried Java interfaces - `Flyable` and `Quackable`:

```java
public interface Flyable {
    void fly();
}

public interface Quackable {
    void quack();
}

public class MallardDuck extends Duck implements Flyable, Quackable {
    public void fly() { System.out.println("I'm flying"); }
    public void quack() { System.out.println("Quack"); }
}
```

**This was even worse.**

- Every duck that flies needs to implement `Flyable` - massive code duplication
- If you need to change how flying works, you have to modify every duck class
- RubberDuck will implement `Flyable` but the `fly()` method does nothing - messy code
- No code reuse - the flying logic is repeated in every class
- Maintenance nightmare - imagine changing flying behavior for 50 different ducks!

---

## The Design Principles That Save the Day

### Principle #1: Identify What Varies and Encapsulate It

> **"Take what varies and encapsulate it so it won't affect the rest of your code."**

This is the most important design principle in all of design patterns. If something in your code changes often, separate it from the parts that don't change.

In SimUDuck:
- `display()` varies - but it's different for each duck and relatively stable
- `swim()` is the same for all ducks - never changes
- **`fly()` varies** - different ducks fly differently, and not all ducks can fly
- **`quack()` varies** - different ducks quack differently

So we encapsulate the behaviors that change into their own classes.

### Principle #2: Program to an Interface, Not an Implementation

> **"Program to a supertype so that the actual runtime object isn't locked into code."**

Instead of programming to specific implementations, program to abstract types (interfaces or superclasses). This allows you to change the concrete implementation without affecting client code.

```java
// Instead of this:
FlyWithWings fly = new FlyWithWings();

// Program to the interface:
FlyBehavior fly = new FlyWithWings();
```

---

## The Strategy Pattern Solution

### The Definition

> **The Strategy Pattern defines a family of algorithms, encapsulates each one, and makes them interchangeable. Strategy lets the algorithm vary independently from clients that use it.**

In plain English: We create separate classes (strategies) for each behavior - flying and quacking. Each strategy implements a common interface. Duck objects delegate their behavior to these strategy objects.

### The Solution Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Duck (Abstract)                 │
├─────────────────────────────────────────────────────────────┤
│  flyBehavior: FlyBehavior                              │
│  quackBehavior: QuackBehavior                          │
├─────────────────────────────────────────────────────────────┤
│  performFly()  ──────────►  flyBehavior.fly()               │
│  performQuack() ─────────►  quackBehavior.quack()           │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ delegates to
                         ▼
┌────────────────────┐       ┌────────────────────┐
│ FlyBehavior        │       │ QuackBehavior      │
│ (interface)        │       │ (interface)        │
├────────────────────┤       ├────────────────────┤
│ fly()              │       │ quack()            │
└─────────┬──────────┘       └─────────┬──────────┘
          │                            │
    ┌─────┴─────┐                 ┌────┴────┐
    ▼           ▼                 ▼         ▼
┌─────────┐ ┌─────────┐    ┌─────────┐ ┌─────────┐
│FlyWith  │ │FlyNoWay │    │ Quack   │ │MuteQuack│
│  Wings  │ │         │    │         │ │         │
└─────────┘ └─────────┘    └─────────┘ └─────────┘
```

---

## Complete Code Implementation

### Step 1: Create Behavior Interfaces

```java
// Flying behavior interface
public interface FlyBehavior {
    void fly();
}

// Quacking behavior interface
public interface QuackBehavior {
    void quack();
}
```

### Step 2: Create Concrete Behavior Classes

```java
// All ducks with wings can fly
public class FlyWithWings implements FlyBehavior {
    @Override
    public void fly() {
        System.out.println("I'm flying!!");
    }
}

// Some ducks can't fly
public class FlyNoWay implements FlyBehavior {
    @Override
    public void fly() {
        System.out.println("I can't fly");
    }
}

// Rocket-powered flying (for model ducks!)
public class FlyRocketPowered implements FlyBehavior {
    @Override
    public void fly() {
        System.out.println("I'm flying with a rocket!");
    }
}
```

```java
// Normal quack
public class Quack implements QuackBehavior {
    @Override
    public void quack() {
        System.out.println("Quack");
    }
}

// Silent quack (for rubber ducks)
public class MuteQuack implements QuackBehavior {
    @Override
    public void quack() {
        System.out.println("<< Silence >>");
    }
}

// Squeak (for toy ducks)
public class Squeak implements QuackBehavior {
    @Override
    public void quack() {
        System.out.println("Squeak");
    }
}
```

### Step 3: Modify the Duck Class

```java
public abstract class Duck {
    // Reference variables for behavior interfaces
    FlyBehavior flyBehavior;
    QuackBehavior quackBehavior;
    
    public Duck() {
    }
    
    // Abstract method - each duck must define its appearance
    public abstract void display();
    
    // Delegates to the behavior object
    public void performFly() {
        flyBehavior.fly();
    }
    
    // Delegates to the behavior object
    public void performQuack() {
        quackBehavior.quack();
    }
    
    // Same for all ducks
    public void swim() {
        System.out.println("All ducks float, even decoys!");
    }
    
    // Allow changing behavior at runtime!
    public void setFlyBehavior(FlyBehavior fb) {
        flyBehavior = fb;
    }
    
    public void setQuackBehavior(QuackBehavior qb) {
        quackBehavior = qb;
    }
}
```

### Step 4: Create Specific Duck Types

```java
public class MallardDuck extends Duck {
    public MallardDuck() {
        quackBehavior = new Quack();
        flyBehavior = new FlyWithWings();
    }
    
    public void display() {
        System.out.println("I'm a real Mallard duck");
    }
}
```

```java
public class RubberDuck extends Duck {
    public RubberDuck() {
        quackBehavior = new MuteQuack();
        flyBehavior = new FlyNoWay();
    }
    
    public void display() {
        System.out.println("I'm a rubber duck");
    }
}
```

```java
public class ModelDuck extends Duck {
    public ModelDuck() {
        flyBehavior = new FlyNoWay();  // Starts with no fly behavior!
        quackBehavior = new Quack();
    }
    
    public void display() {
        System.out.println("I'm a model duck");
    }
}
```

### Step 5: The Simulator

```java
public class MiniDuckSimulator {
    public static void main(String[] args) {
        Duck mallard = new MallardDuck();
        mallard.performQuack();      // Output: Quack
        mallard.performFly();         // Output: I'm flying!!
        
        Duck rubber = new RubberDuck();
        rubber.performQuack();       // Output: << Silence >>
        rubber.performFly();        // Output: I can't fly
        
        Duck model = new ModelDuck();
        model.performFly();         // Output: I can't fly
        
        // DYNAMIC BEHAVIOR CHANGE!
        // Give the model duck a rocket!
        model.setFlyBehavior(new FlyRocketPowered());
        model.performFly();         // Output: I'm flying with a rocket!
    }
}
```

---

## Key Concepts Explained

### Composition Over Inheritance

> **"Favor composition over inheritance."**

Instead of using inheritance to get behavior, use composition (has-a relationship). The Duck "has" a fly behavior and "has" a quack behavior. This gives you:

- **Flexibility**: Change behavior at runtime
- **Reuse**: Share behavior classes across different ducks
- **Loose Coupling**: Duck doesn't need to know HOW to fly, just THAT it can fly
- **Easy Maintenance**: Change flying behavior in one place

### Delegation

The Duck class delegates behavior to separate strategy objects instead of implementing behavior itself. This follows the **Hollywood Principle**: "Don't call us, we'll call you." The Duck doesn't call the flying algorithm - it calls the behavior object's `fly()` method.

---

## Real-World Applications

### Java I/O Classes

The Strategy Pattern is used extensively in Java's I/O libraries:

```java
// Different strategies for different compression algorithms
InputStream in = new BufferedInputStream(new FileInputStream("file.txt"));
InputStream in = new GZIPInputStream(new FileInputStream("file.gz"));
InputStream in = new ZipInputStream(new FileInputStream("file.zip"));
```

All these are different strategies that implement the same `InputStream` interface.

### Sorting Algorithms

```java
// Different sorting strategies
Comparator<String> comparator = new StringLengthComparator();
Collections.sort(list, comparator);

Comparator<String> comparator = new AlphabeticalComparator();
Collections.sort(list, comparator);
```

### Payment Processing

```java
// Different payment strategies
PaymentStrategy creditCard = new CreditCardPayment();
PaymentStrategy paypal = new PayPalPayment();
PaymentStrategy bitcoin = new BitcoinPayment();

checkout.processPayment(amount, creditCard);
```

### Authentication

```java
// Different authentication strategies
Authenticator oauth = new OAuthAuthenticator();
Authenticator token = new TokenAuthenticator();
Authenticator biometric = new BiometricAuthenticator();

login.authenticate(user, oauth);
```

---

## Common Mistakes and Pitfalls

### Mistake #1: Not Using Interfaces

```java
// BAD: Tight coupling to concrete class
public class Duck {
    FlyWithWings flyBehavior;  // BAD!
}
```

**Fix**: Use the interface type:
```java
// GOOD: Program to interface
public class Duck {
    FlyBehavior flyBehavior;  // GOOD!
}
```

### Mistake #2: Hardcoding Behavior in Constructors Only

If you only set behavior in constructors, you can't change behavior at runtime.

**Fix**: Always provide setter methods:
```java
public void setFlyBehavior(FlyBehavior fb) {
    flyBehavior = fb;
}
```

### Mistake #3: Creating Too Many Concrete Classes

If you have too few strategies, you defeat the purpose. If you have too many, it's complex.

**Rule of Thumb**: Create a strategy class for each behavior variation, not each individual duck.

### Mistake #4: Not Considering Future Changes

When designing, ask yourself:
- What might change in the future?
- What behaviors vary between different types?

If flying might change, make it a strategy - even if all ducks currently fly the same way.

---

## Lambda Expressions (Modern Java Enhancement)

Since the behavior interfaces have only one method, they are **functional interfaces**. In Java 8+, you can use lambda expressions:

```java
// Instead of creating a class
public class Squeak implements QuackBehavior {
    public void quack() {
        System.out.println("Squeak");
    }
}

// Use lambda
Duck rubberDuck = new RubberDuck();
rubberDuck.setQuackBehavior(() -> System.out.println("Squeak"));

// Or in constructor
public RubberDuck() {
    quackBehavior = () -> System.out.println("Squeak");
}
```

---

## The Full Picture: How It All Fits Together

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT CODE                                                    │
│  (MiniDuckSimulator)                                            │
├─────────────────────────────────────────────────────────────────┤
│  Duck mallard = new MallardDuck();                              │
│  mallard.performFly();  // Client asks Duck to perform fly      │
│                                                                 │
│  Duck model = new ModelDuck();                                  │
│  model.setFlyBehavior(new FlyRocketPowered()); // Change        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  DUCK (Context)                                                 │
├─────────────────────────────────────────────────────────────────┤
│  flyBehavior.performFly();  // Duck delegates to Strategy       │
│  quackBehavior.performQuack();                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  FLYBEHAVIOR (Strategy Interface)                               │
├─────────────────────────────────────────────────────────────────┤
│  void fly()                                                     │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ FlyWithWings    │  │ FlyNoWay        │  │ FlyRocketPowered│
│ (Concrete       │  │ (Concrete       │  │ (Concrete       │
│  Strategy)      │  │  Strategy)      │  │  Strategy)      │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ fly() {         │  │ fly() {         │  │ fly() {         │
│   "I'm flying!" │  │   "I can't fly" │  │   "Rocket!"     │
│ }               │  │ }               │  │ }               │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Summary: The Strategy Pattern in a Nutshell

| Aspect | Description |
|--------|-------------|
| **Problem** | Different objects need different behaviors, and behaviors may change at runtime |
| **Solution** | Define each behavior as a separate class implementing a common interface |
| **Key Benefit** | Change behavior at runtime without modifying Duck classes |
| **Design Principle** | Identify what varies and encapsulate it |
| **Second Principle** | Program to an interface, not an implementation |
| **Third Principle** | Favor composition over inheritance |
| **Pattern Name** | Strategy - because you can swap algorithms (strategies) like different duck behaviors |

---

## Test Your Understanding

Use this quick test to verify you understand the Strategy Pattern:

1. **Can you add a new flying behavior without modifying Duck classes?** → Yes, just create a new class implementing `FlyBehavior`

2. **Can you change a duck's flying behavior at runtime?** → Yes, using `setFlyBehavior()`

3. **Do MallardDuck and RubberDuck share flying code?** → Yes, through composition, not inheritance

4. **Is the Duck class affected when you change how flying works?** → No, Duck delegates to the strategy

5. **Can you add completely new ducks (like a DecoyDuck) without changing existing behavior classes?** → Yes, compose behaviors in the constructor

If you answered "Yes" to all five questions, you understand the Strategy Pattern!

---

## Key Takeaways

> **"The Strategy Pattern encapsulates each behavior in its own class, making behaviors interchangeable and independent from the Duck classes that use them."**

> **"Design principles matter more than design patterns. Use the principles to guide your code, and the patterns will emerge naturally."**

> **"Change is the only constant. Encapsulate what varies so it doesn't ripple through your entire codebase."**

---

## Spotting In the wild
To spot where the **Strategy Pattern** belongs in the "wild" (your day-to-day coding), you need to look for specific **Code Smells**. When you see these signs, your brain should instantly scream: *"I need the Strategy Pattern here!"*

Here are the top 4 red flags to look for in the wild, and how to spot them:

### 1. The `If-Else` / `Switch` Explosion (The Monster Method)
This is the most common place to find the Strategy Pattern hiding in the real world. 
* **What you see:** A method that has grown massive because it uses a `switch` statement or a giant chain of `if-else` blocks to decide *how* to do something based on a flag, type, or enum.
* **The "Wild" Example:**
  ```java
  public void calculateShipping(Order order, String shippingMethod) {
      if (shippingMethod.equals("FEDEX")) {
          // 50 lines of complex FedEx math
      } else if (shippingMethod.equals("UPS")) {
          // 50 lines of complex UPS math
      } else if (shippingMethod.equals("USPS")) {
          // 50 lines of complex USPS math
      }
  }
  ```
* **Why Strategy fixes it:** Every time the business adds a new shipping method, you have to modify this core file (violating the Open/Closed Principle). The Strategy pattern extracts each of those `if` blocks into its own `ShippingStrategy` class.

### 2. Forced, Awkward Inheritance (The Rubber Duck Problem)
* **What you see:** You are looking at a subclass, and it is overriding methods from its parent class just to make them do **nothing**, or it's throwing an `UnsupportedOperationException`. 
* **The "Wild" Example:**
  ```java
  class Employee {
      public void attendManagementMeeting() { ... }
  }

  class JuniorDeveloper extends Employee {
      @Override
      public void attendManagementMeeting() {
          // Do nothing, I'm not a manager! Or:
          throw new UnsupportedOperationException("Not allowed!");
      }
  }
  ```
* **Why Strategy fixes it:** The parent class has trapped the child class with a behavior it doesn't want. Instead of inheritance, you pull the `MeetingBehavior` out into an interface, and only compose it into the Employees who actually need it.

### 3. The Need for "On-the-Fly" Swapping (Runtime Changes)
* **What you see:** A system where a user's action or a system event requires an algorithm to completely change its behavior *while the program is already running*. 
* **The "Wild" Example:** Think of Google Maps. You calculate a route. Midway through, you tap the "Walking" icon instead of the "Car" icon. The app doesn't reboot; it just swaps the routing algorithm seamlessly.
* **Why Strategy fixes it:** If you have an object that needs to change its core behavior dynamically, you can give it a `setStrategy()` method. 
  ```java
  navigator.setRouteStrategy(new WalkingStrategy());
  navigator.calculateRoute(); 
  ```

### 4. You Have Multiple Versions of the Same Algorithm
* **What you see:** You have a task to perform (sorting a list, compressing a file, encrypting a password), but you have several different formulas or rules to do it.
* **The "Wild" Example:** An image processing app that lets you save files as PNG, JPEG, or WEBP. 
* **Why Strategy fixes it:** Instead of putting all the image compression logic into one gigantic `ImageSaver` class, you create a `CompressionStrategy` interface with `JpegCompression`, `PngCompression`, etc., as concrete implementations.

***

### 💡 Quick Summary Checklist:
If you ask yourself any of these questions, **use Strategy**:
1. *"Am I writing an `if` statement to pick an algorithm?"* 👉 Use Strategy.
2. *"Do I need to swap how this behaves at runtime?"* 👉 Use Strategy.
3. *"Am I copy-pasting this exact same behavior across three unrelated classes?"* 👉 Use Strategy.
4. *"Is my child class refusing to use the parent's behavior?"* 👉 Use Strategy.



## Principles And Concept Explained


### 1. The 4 OO Basics (The Prerequisites)
Before diving into patterns, the chapter quickly reminds you of the foundational pillars of Object-Oriented Programming:
* **Abstraction:** Hiding complex reality behind a simple interface.
* **Encapsulation:** Keeping data (and the code that manipulates it) safe from outside interference.
* **Polymorphism:** The ability of different objects to respond to the same method call in their own way.
* **Inheritance:** Passing down traits and behaviors from a parent class to a child class.

### 2. The 3 Golden OO Design Principles
This is the true meat of the chapter. While the OO Basics give you the tools, these principles teach you how to use them without building a fragile, unmaintainable mess.

* **Principle #1: Encapsulate what varies.**
    * *The Concept:* Identify the aspects of your application that change frequently, and separate them from what stays the same.
    * *The Why:* If you isolate the changing parts, you can alter or extend them later without affecting the stable parts of your code. 
* **Principle #2: Program to an interface, not an implementation.**
    * *The Concept:* Variables and return types should use interface or abstract class types, not concrete class types. 
    * *The Why:* Your main code shouldn't care *how* a job is done, just that the object knows *what* to do. This allows you to swap out implementations (like swapping `PayPalPayment` for `CreditCardPayment`) without rewriting the core logic.
* **Principle #3: Favor composition over inheritance.**
    * *The Concept:* Instead of inheriting behavior from a parent class ("IS-A" relationship), give your class an instance variable that holds the behavior ("HAS-A" relationship).
    * *The Why:* Inheritance is rigid and set at compile-time. Composition is flexible and allows you to change behaviors at runtime. 

### 3. The Core Pattern
* **The Strategy Pattern:** Defines a family of algorithms, encapsulates each one, and makes them interchangeable. Strategy lets the algorithm vary independently from clients that use it. 

### 4. The Mindset Shift
* **Patterns are a Shared Vocabulary:** The chapter emphasizes that knowing design patterns isn't just about writing better code; it's about communicating better. Saying "We should use a Strategy Pattern here" instantly conveys the entire architecture to another developer, saving hours of explanation.
* **Code Should be Resilient to Change:** The overarching theme is that in software development, the only constant is **CHANGE**. A good design anticipates future modifications and makes them painless.
