Sometimes we just need more mechanism in our thread classes to make our thread more efficient, like do no re-create on every event, or maybe sometime we just want to pause a thread until something happens.

## Wait And Notify

- Like every object in java has a lock, it also provides a mechanism that allows it to be waiting area; this mechanism helps in communication between threads.

- **The idea behind the this mechanism is very simple: 1 thread needs a certain condition to exist and it assumes that some other thread will create the condition. When the other thread creates the condition, it notifies the 1st thread that has been waiting for the condition.**

- Now these things happens with the following methods in `Object` class.
  
  - `void wait():` Wait for a condition to occur. This method should be called from inside a `synchronized` method or a block.
  
  - `void wait(long timeout):` Wait for a condition to occur, however if the notification for that condition has not occurred in *timeout* ms, it return anyways. This method should also be called from inside a `synchronized` method or block.

  - `void notify():` notifies a thread that is `waiting` about the condition that it has occurred. This method also must be called from inside a `synchronized` block or method.

- :::note
    Just like `synchronized` method, the wait and notify mechanism is available to every `Object` in Java. However, this mechanism is accomplished by method invocation.

    This works because every `object` in java inherits from `Object` class.
  :::

- The *wait-and-notify* mechanism is a synchronization mechanism, but we can say it is more like a communication mechanism. It allows 1 thread to communicate to other thread that some condition has occurred.

- :::danger[REMEMBER]
    The *wait-and-notify* mechanism does not specify what specific condition has occurred, just something or some condition has occurred. Basically we cant say what has happened.
  :::


- difference between `wait()` and `sleep()` state, unlike the `sleep()`, the `wait()` requires that the thread own the synchronization lock of the object. When the `wait()` executes the synchronization lock is released. Upon receiving the notification, the thread needs to reacquire the synchronization lock before running from the `wait()` method.

- Also we also need to keep check on deadlock condition here, it this releasing the lock mechanism while waiting would not be there, we might end up in deadlock condition as the thread can be in a busy waiting loop, and only way to release the lock and also not exiting the method is via using `wait(long timeout)` for sometime.

- :::info[Read This 🙏 The Analogy]
    So couple of things to mention here to build the mental model.
    
    - Remember actual threads are not tied to classes and any thread can run any method of any class.

    - So how does `notify()` know which thread to notify to, as there can be multiple threads in the VM running.

    - Remember: `wait()`, `notify()`, `synchronized -> (lock basically)` are tied to object.

    - Think of each object as building, where there is only `1 key for the building (lock)` and 1 `waiting room for the building`.

    - Now here is the scene.

    - Thread A started running `synchronized` run method of a class. Now to do this it goes to that particular building(`object`), grabs it's key (`lock`), and starts executing.

    - After sometime Thread A hits a `wait()`, so it put back the key in its place `release the lock`, and went into the building's (`object`) waiting room (`wait()`);

    - Then another thread B comes up, and starts running a different `synchronized` method, so for that it goes to the building (`object`) and grabs it's key (`lock`) and start executing the method.

    - After sometime it happens to met a certain condition and it needs to call `notify()`, so it went to building's (`object`) waiting room (`Thread which are in waiting state for the object so that they can grab the key if something happen`) and randomly wakes up a thread so that it can start doing its job. let's say it was Thread A, but again it needs to wait for they key as it is with Thread B right now.

    - After sometime Thread B exists the method, leaves the building's (`object`) key (`lock`) it its place (`release the lock`), and after it Thread A comes picks up the key (`acquire the lock`) and start executing.

    - So Basically `notify()` only wake up threads which are in the current object's waiting room.

    - You can only call `wait()` or `notify()` if you currently hold the lock for that specific object (which is why they are inside synchronized blocks).

    - `wait()` puts the current thread into the waiting room of that specific object.

    - `notify()` wakes up a thread that is sitting in the waiting room of that specific object.

  :::



### The `wait-and-notify` Mechanism and Synchronization

- Remember there is inherent race condition between `wait()` and `notify()`, if locks are not involved and situation is called `The Lost Wake-up Problem`
  
  - Remember we use locks so that code we execute are atomic. Lets say we did not use locks when using `wait-and-notify`

  - Thread A start executing a method, it sees wait(), and before it went to sleep it was interrupted. (thread is not in waiting condition right now)

  - Some other thread comes and tries to call `notify()` and left hoping that Thread A will wake up, but in reality it was not in a waiting state.

  - after some time , OS resumes Thread A then it actually went in waiting state.

  - But we lost a wakeup call.

  - :::note
    
    There is a massive, strict distinction. The `JVM` completely ignores threads that were paused by the OS for CPU scheduling, and notify() will ONLY wake up threads that explicitly called wait(). Its a OS level waiting room for OS wait threads and inside `JVM` level per object waiting room

    :::

- So because of this so that threads are interrupted in between, it is necessary to make a rule that call to `wait()` and `notify()` should only be done inside a `synchronized` or inside method with a lock.


- If there is `notify()` call and there are no threads that are in waiting room of the object, `notify()` simply returns and the notification is lost. A thread who later executes a `wait()` should wait for another notification.


- In `wait-and-notify` mechanism, by using `wait()`, Thread A confirms that a condition has not occurred yet (typically by checking a variable) and then calls `wait()`. When another thread finds/create the condition (typically by setting the same variable), it calls the `notify()`.

- A race condition typically occurs when:

  - Thread A test the condition (check the variable) and confirms that it must wait (just confirms it).
  - Thread B find/create the condition
  - Thread B calls the `notify()`, this goes unheard since Thread A is not waiting yet.
  - Thread A calls the `wait()` to start waiting.

- :::note
  So as to not get into the deadlock state, we must always make sure that the `lock` we are using should make
  - Checking the condition
  - Setting the condition

  as a atomic step, which just means the check or set on the conditional variable must be inside a lock.
  :::

- `wait()` and `notify()` are atomic step, so the `lock` is not released until the waiting thread is already in a state in which it can receive the notifications.

- Since we do not really know what is condition that has occurred, a thread must always check the condition before doing `wait()` or while it is holding the `lock` and while returning from `wait()` should always retest the condition to determine should it wait again, as it might have happened that multiple threads were waiting for the condition and some other thread got the `lock`. 

- Same condition can also occur even when multiple threads are not waiting but as Thread A was waiting and as soon as Thread B calls notify and leaves the `lock` another Thread C just got the `lock` it check the condition and determines that it does not need to wait and just simply took the condition value and start executing, and after Thread A gets the `lock` and its start executing but while it was waiting to grab they `lock` some other thread (Thread C) might have used the condition to do some thing on the condition and might have changed, which can cause some issue if Thread A starts Executing. This is why to use `while` instead of `if`.

- The waiting threads can be treated as consumers, and there is no guarantee that when a consumer receives notification that notification has not processed by another consumer.

- Basically when a consumer wakes up, it cannot assume that the state it was waiting for is still valid, and this is why we always put condition checking in a loop.



### `wait()`, `notify()` and `notifyAll()`

- If multiple threads are waiting, there is no guarantee which thread will receive the notification. It highly depends upon the implementation of `JVM`, scheduling and timing issues during the execution of the program. There is no way to determine.

- `notifyAll():` Notifies all the threads waiting on the object that the condition has occurred. This method must also be called inside from `synchronized` method or a block or mainly inside a `lock` block;

- Again all of the threads wakes up but they still have to acquire the lock and only 1 of them will get the lock, so they do not run in parallel, so basically only 1 will be executed only after thread who called the `notifyAll()` release the lock.

- We need `notifyAll()` because there might multiple conditions to wait for, by doing this we can wake up all the threads and then threads can decide among themselves which thread got the desired state and can execute themselves.

### `Wait-and-Notify` Mechanism with Synchronized Blocks

- using explicit lock with `synchronized` blocks helps us to make our lock span smaller and thus multiple threads can enter multiple methods simultaneously if use multiple different locks for them.
