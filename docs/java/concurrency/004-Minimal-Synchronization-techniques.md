In this we will see how JVM's memory model works with Threads and what are Atomic Classes given by Java

## Can we Avoid Synchronization

- :::info[DEFINATION]
    
    - `Uncontended Lock:` A Lock that is not held by any thread; the 1st thread that attempts to acquire get it immediately.

    - `Contended Lock:` A lock that have at least 1 thread waiting on it to acquire. (it can be many more than 1)

  :::


- Acquiring a lock can become expensive if:

  - If the lock is Contended Lock, VM has to do extra computation to figure out which thread will get the lock

  - Threads always have to wait for the Lock to be released. This basically greatly decrease the performance of this program.

- We have previously seen that by using `volatile` we can avoid synchronization problems of a certain type, which only became possible when we know how OS optimize programs.

### The Effect of registers

- So most CPU have direct access to store variables defined into the main memory. They can even operate directly in the main memory but these CPU also have a set of registers with themselves in which they can hold the data and do operation on it which are very fast compared to main memory operation.

- So because of this registers are used often, also from a logical perspective every thread have its own set of registers. So when OS assigns a thread to a CPU, it also loads the CPU registers with info specific to that thread. It saves the register information before it assigns a different thread to the CPU. 

- Basically threads never share data that is held in registers.

- So basically it might happen that some Thread A can load a variable from memory to a register and based on that register value it is busy, and it was hoping to stop its busy waiting loop by some other thread which can change that variable value, but since it value is loaded into the Thread A register, it will not never break its loop as register are not shared between threads.

- That why we use `volatile` to tell threads that do not load memory location into registers but instead directly use the memory location.


### The Effect of reordering statements

- We can not depend on the ordered execution of statement while using multiple threads. The VM may decide that some line or thing is more efficient to do in a certain way which can effect the execution order.

- To save us from this the only way is to do synchronization. Synchronized blocks also prevents reordering of the statements. The VM can not move a statement from inside a `synchronized` block to outside a `synchronized` block.

- But the converse is not true; a statement before `synchronized` block can move inside the block and similarly statement after the `synchronized` block can be moved inside the block.


## Correct Double Checked Locking case for Singleton

  
  ```java
class Singleton {
    private Static volatile Singleton singleton;
    public String val;

    // private constructor
    private Singleton(String val){
      this.val = val;
    }

    public static Singleton getInstance(String val){
      // used localRef instead of singleton variable as singleton is volatile and 
      // it would have to read twice in case for threads which will simply 
      // return the instance but by doing so they will have touch main memory twice
      // which is slow compared to localref which will touch it only once
      Singleton localRef = singleton;
      if(locaRef == null){
        synchronized(Singleton.class){
          localRef = singleton;
          if(localRef == null){
            localRef = singleton = new Singleton(val);
          }
        }
      }
      return localRef;
    }
  }
  ```


## Atomic Variables

