The run method is the standard for thread class where it begins its execution just like for any normal java application (main thread) its main function.

### Lifecycle

#### Creation
- So basically threads are created as an instance of the `Thread` class. So basically when its `constructor` is called a new thread is created.

#### Starting a thread
- so a thread is constructed using its constructor but it is not alive yet, basically thread is in the `WAITING` state.
- In this waiting state, other threads can interact with the existing threads.
- when we are ready to make thread run its execution code, we call its `start()` method, which does some internal house keeping and then calls its `run()` method.
- When the `start()` method returns, 2 threads are now executing in parallel. (original thread which called the `start()` method, but the newly started thread which is running its `run()`).

#### Pausing, Suspending, and Resuming Threads
- Only after a thread's `start()` method is called after that the thread is called `ALIVE`.
- Thread can also be in `SUSPEND` state when called with `suspend()` method and then later can resume using `resume()` method. (but they suffer from some race condition problem as for `stop()` to stop the execution of a thread, so they are deprecated).
- but it is possible to suspend a thread own execution for some amount of time using `sleep()` method. this i called the `ASLEEP` state.

- there is a difference between `SLEEP` and `SUSPEND`, other threads can suspend some other thread but a thread can only sleep it own execution. Threads can use `wait and notify` mechanism to tell other thread to suspend some thread.

#### Thread Cleanup
- As long as some object is holding a reference to a thread, other threads can call methods on this thread and can get information. If there is no thread reference it will got garbage collected. (which in turn in some situation this will allow to free up system resources as well), so it always a good idea to not hold any references.

- One of the reason to hold thread reference is to determine when it has completed its work. That can be accomplished with `join()` call. The `join()` method is often used when you have started threads to perform discrete tasks and want to know when the tasks have completed.

- The `join()` method blocks the current thread where it is called, until the thread has completed its `run()` method. If the thread has already completed its `run()` method, the `join()` method returns immediately. This means that you may call the `join()` method any number of times to see whether a thread has terminated. Be aware, though, that the first time you call the `join()` method, it blocks until the thread has actually completed. You cannot use the `join()` method to poll a thread to see if it’s running (instead, use the `isAlive()` method)

### Two approaches to stopping a thread

#### Setting a Flag
- we should set some internal flag to signal that the thread should stop and keep periodically checking on that flag

```java
private volatile boolean done = false;

public void run(){
  while(!done){
    // do something
  }
}

public void setDone(){
  done = true;
}
```

- But now Question came lets say we need this particular thread again, so it is better to stop it and get garbage collected or to suspend it and reuse it when required. But in general it is easier to abandon a thread create a new one rather than reusing an existing one.

- But again this is a smoking gun, what is `volatile` and since now there is thing which multiple threads can change how can we handle this.

#### Interrupting a thread
- Now in the above case this happen that ur thread lets say take couple of minutes to check the `while(!done)` as there are some huge big code statements inside it or maybe it is waiting for somethig to get done/happen, and what if some thread calls the `setDone()` just after the thread has checked its flag state, then we have to wait for another loop cycle or maybe we cant even wwait for 1 more loop cycle as the thread might be waiting, but we do not want this.

- Often we want to complete its blocking method immediately, we do not want to wait for anything since thread is going to exit anyway, In this case we can use `interrupt()` method of the thread class to interrupt any blocking method.

- `interrupt()` method have 2 effects.
  - **1st effect:** it cause any blocked method to throw an `InterruptedException`. like for example `sleep()` is a blocking method, so if some thread is doing `sleep()` and some other thread do `interrupt()`, the `sleep()` method immediately wakes up and it will throw `InterruptedException`. Other methods with same behaviour are : `wait()`, `join()`, methods that read I/O.
  - **2nd effect**: is to set a flag inside the thread Object that indicates the thread has been interrupted. we can query this via `isInterrupted()`. It return `true` if thread has been interrupted even if it was not blocked.

- so basically `interrupt` is doing the almost same thing as we did in 1st approach. But still there will be race condition on the `interrupt()` is called and when will actually the thread will stop, if in any blocking call it will stop and if not it will after doing all the work and exiting on next loop iteration.


### The Runnable Interface

- The runnable interface allows u to separate the implementation of a task from the thread used to run the task. So instead of extending a class from `Thread` we can just implement the `runnable` interface on a class.

- This changes the way on how thread are created, now we have to explicitly create a thread and pass the runnable object to it.

- We can use both methods to create a thread, depending on the situation. Answer depend upon do u want to extend other classes or not ? if yes use `runnable` else u can just simply use `Thread` class.

- but there are other advantages as well for `runnable` interface, Java provides a number of classes that handle threading issues for you. These classes handle thread pooling, task scheduling, or timing issues. If we’re going to use such a class, our task must be a Runnable object (or, in some cases, an object that has an embedded Runnable object).

- so basically we can use the Runnable interface, which gives us a little more flexibility at the cost of the overhead of keeping track of the thread objects separately, or we can trade that flexibility for simplicity and subclass the Thread class.

### Thread And Objects
- Thread class does not mean the thread is linked to that object of thread.
- Any thread can execute any other thread method in its own thread execution, they are just objects.
- basically u can't just look at some code and can definitely say which thread will be running this piece of code.

#### Determining the current thread
- to know which thread is running a piece of information just call `Thread.currentThread()`.
- `currentThread()` gives us the reference of the current thread that is running this piece of code. This maybe used by `runnable` interface to check somethings like 
```java
while(!Thread.currentThread().isInterrupted()){
  // do something
}
```

- in fact the `Thread` class already have `interrupted()` `static` which does exactly the same thing.


