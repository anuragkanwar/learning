Whenever we share data / memory between Threads, the issue arises. We will look into how to solve them


## The Synchronized Keyword

- Lets take an example of a hypothetical 2 threads, 1 is viewer which is displaying UI changes, 1 is source of change, and 1 is listener of the change. Source generate the change and tries to change the listener's internal field and at the same time viewer is also checking the internal field to display the thing, maybe it have some position, some text etc... 
- Now here is a race condition, why because these operations are not `Atmomic`. It is possible for the source to update these values while the viewer is reading them mid position. Basically lets say viewer is doing animation while updating its x value and it tried to do `x = x+1`; which in memory are 2 ops `read x` and `update x as x+1`, now what if source made update on this when the viewer had done the `read x` so flow will look like

  ```sh
  read x          # viewer (let say 10)            | x = 10
  update x = 0    # source                         | x = 0
  update x = 10+1 # viewer update with stale value | x = 11
  ```

- For these type of cases Java provides a builtin keyword `synchronized`, it simply prevents 2 or more threads calling the methods of the same object at the same time. Kinda like a `Mutex Lock`

  :::note
    `Atmomic:` the smallest possible unit of code which cant be broken / interrupted during its execution.
  :::

- Under the hood the concept is simple, any thread which want to execute a `synchronized` method should 1st acquire a lock. Once the thread have acquired the lock, it executes the method, in the mean time if any thread comes it will see there is lock and will wait, and when the 1st thread is finished with execution it will release the lock, and the waiting thread will acquire it. Also there is only 1 lock per object (should be);


  :::note
    `Mutex Lock`: also known as Mutually exclusive lock. These are basic look which only lets only 1 thread grab the lock at any point of time and rest of thread(s) have to wait until it is released.

    In java Every Object has an associated lock. When a method is declared synchronized, the executing thread must grab the lock associated with the object before it starts executing the method, and after the thread is done executing the method the lock is automatically released.

  :::


## The Volatile Keyword

- Now here comes the kicker lets say, our viewer has an internal field called `done` which just is there to stop executing the `run()`. So basically it is checking on every paint cycle that `while(!done)` it needs to repaint on its `run()`, and this done is set by some other thread like `viewer.setDone()`. Now this single data is used in 2 places maybe can we synchronized these method 🤔??

- No we cant make both our method synchronized, why because when viewer will start it will grab the lock and start the `run()`, and `run()` will not stop until `setDone()` is called, and `setDone()` cant be called as any other thread as viewer is holding on to the lock 😤.

- At this point problem is about the scope of the lock and that is **method scope**, which is the scope of the `run()` is too large as it is a while loop and it cant just release the lock, there are ways to make only part of code synchronized but there is a very elegant way we can handle this situation here.

- here the scenario is we somehow only need to make threads to only use the `done` field one at a time. Rest of the `run()` does not care, and it is different from `synchronized`, as earlier multiple threads were accessing multiple pieces of data and there were now way to update/make them atomic without using the `synchronized` keyword, but here only 1 piece of info requires to be atomic.

- As we also see viewer is doing a atomic operation which is `load` and other thread also wants to do atomic operation `store` the value (`store` is different from `update`).

- :::danger[Problem with Java Memory]
    
    Java specifies that basic loading and storing of variables (except for long and double) is atomic. That means its value cant be found in a interim state during the store, nor it can be changed in the middle of loading the variable to a register.

    But Unfortunately, Java's memory model is a bit more complex. Threads are allowed to hold the values of the variables in local memory (eg machine register) instead of main memory (eg RAM, where all variables are officially stored) to speed things up, which usually happens for variables like in `for` loops. In this case when some thread changes the value of the variable by calling `setDone()`, viewer thread may not see the changed variables as it was reading the value from local memory instead of main memory. This is also known as `visibility problem`

- So one could solve this problem by making getter and setter and making these as `synchronized` method and this will work, but Java saw this give us the `volatile` keyword, which basically tells everyone read and write the variable from the main memory only, no local memory caching.

- This can only be used when operation done the variable is atomic in a method. Meaning there should be only a single load or store. If method has other code, that code may not depend on the variable changing its value during operation, for example operation like (`++` or `--` as they are load, update and store)

- So basically there is a difference here of `visibility` and `atmomicity`, making variable `volatile` does not guarantee all its operation will became `atomic`, making `volatile` only means the variable will now be store and read from the main memory. So only `load` and `store` operation will became `atomic` not any `update` or so on.

- :::note
    `volatile` keyword on array wont make its element `volatile`, it will just make the reference of array `volatile`, threads can still make copies of its element in local register.

    For these specific reasons we have more things like (Atomic Variables).


## More On Race Conditions

- Intrinsic lock is per object , that means if two or more methods are synchronized of an object and even if multiple threads wants to run different methods, they cant, as only 1 will acquire the lock, and the lock is same for all the methods.

- In case of `static synchronized` methods, we can safely assume there is also a class lock. So when a `static synchronized` method is called, the program obtains this class lock before doing method execution. The scenario is identical as when grabbing an object lock. It is just a different lock. The class lock can be grabbed and released independently of the object lock, as these are 2 different locks.

- If a non `static synchronized` calls a `static synchronized` both locks are requires to run the complete logic.

- Class lock does not actually exists. The class lock is the Object lock of the Class object the models the class, and since there is only one Class object per class, using this object achieves the  `synchronization` for static methods.


- :::info[Points To Remember]
    - Only 1 thread can execute a `static synchronized` method per class.
    - Only 1 thread per instance can execute a `non static` `synchronized` method.
    - Any number of threads can execute a `non synchronized` method (static or normal)
  :::


## Explicit Locking

- The synchronization tools implement a common interface called `Lock`, in which the most important methods are `lock()` and `unlock()`, basically these are the methods which acquire and release the lock.

- Think of `synchronized` keyword as using `lock()` at start of method and `unlock()` at the end of the method.

- but now we can have even fine tuning while using the locks, because now we have an actual object that represent the lock like this 
  ```java
  private Lock lock = new ReentrantLock()
  ```

- so now theory is still the same, if some thread calls `lock()` on the lock object, other threads have to wait until the thread that have the lock calls `unlock()` on the lock object.

- Using explicit locks lets us to minimize the scope of the critical section, basically can acquire and release the locks whenever we require.

- :::info[Thing To Remeber]
    by using explicit Lock, the lock is no longer tied to implicit object whose method is called upon, which means it is now possible for 2 or objects to share a common lock. It is also possible to have more than 1 lock.
  :::


## Lock Scope
- It also enables us to grab 1 lock in one method and unlock in some different method 🤔

- By using locks, we can move time consuming and thread safe code outside of the lock scope.

- we can also have `synchronized` blocks instead `synchronized` method.
  ```java
  synchronized(this) {
    // some code here
  }
  ```

- syntax of `synchronized` block requires an object whose lock it should obtain.


## Choosing a Locking Mechanism
- which one to choose ? It depends, explicit give us more power but using `synchronized` is simple but rigid. For complex synchronization that involves both static and non static methods, it may be easier to use explicit locks instead of `synchronized` keyword.

- using synchronization also have problems as it lock scope can be too large and thus sometimes may create deadlocks situation.

- it may also be inefficient to hold a lock for the section of code where it is not actually needed.

- using `synchronized` block can also be a problem if too many variables are involved. This can also cause deadlock if we require too many locks to acquire.

### The Lock Interface

- ```java
  public interace Lock {
    void Lock();
    void lockInterruptibly() throws InterruptedException;
    boolean tryLock();
    boolean tryLock(long time, TimeUnit unit);
    void unlock();
    Condition newCondition();
  }
  ```

