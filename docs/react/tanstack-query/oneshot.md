# its an async state manager that is acutely aware of the needs of server state

## Query Fundamentals

**Fundamentals of TanStack React Query**

**Overview**  
TanStack React Query simplifies server-state management in React apps, handling data fetching, caching, synchronization, and updates. Below are the core concepts:

---

### **1. Query Client**  

- **What it is**: The central manager for all data operations.  
- **Role**:  
  - Stores cached data.  
  - Manages query lifecycles (fetching, caching, retries).  
  - Provides methods like `invalidateQueries` (force refetch) and `prefetchQuery`.  
- **Usage**:  
  - Created once and shared via `QueryClientProvider`.  

  ```javascript
  const queryClient = new QueryClient();
  ```

---

### **2. QueryClientProvider**  

- **What it is**: A context provider component.  
- **Role**:  
  - Makes the `QueryClient` available to all child components.  
  - Typically wraps the entire app or a feature section.  
- **Usage**:  

  ```javascript
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

  function App() {
    return (
      <QueryClientProvider client={queryClient}>
        <RestOfApp />
      </QueryClientProvider>
    );
  }
  ```

---

### **3. useQuery Hook**  

- **What it is**: A hook for fetching and managing server data in components.  
- **Role**:  
  - Fetches data using a **query key** (unique identifier) and **query function** (e.g., API call).  
  - Returns state variables: `isLoading`, `isError`, `data`, `error`, `isSuccess`, and `refetch`.  
  - Automatically caches data and handles background updates.  
- **Usage**:  

  ```javascript
  import { useQuery } from '@tanstack/react-query';

  function TodoList() {
    const { data, isLoading, isError } = useQuery({
      queryKey: ['todos'], // Unique key for caching
      queryFn: () => fetch('/api/todos').then(res => res.json()),
      staleTime: 5000, // Optional: Data stays fresh for 5 seconds
    });

    if (isLoading) return 'Loading...';
    if (isError) return 'Error!';
    return <div>{data.map(todo => <div>{todo.text}</div>)}</div>;
  }
  ```

---

### **Key Features & Options**  

- **Query Key**: An array (e.g., `['todos', 1]`) to uniquely identify and cache queries.  
- **Common Options**:  
  - `staleTime`: Time until data becomes stale (default: `0`).  
  - `cacheTime`: Time inactive queries remain cached (default: `5 minutes`).  
  - `refetchOnWindowFocus`: Auto-refetch on window focus (default: `true`).  
  - `enabled`: Control when the query runs (e.g., wait for user input).  
  - `retry`: Number of retry attempts on failure.  

---

**Example Workflow**:  

1. **Setup** `QueryClient` and wrap the app with `QueryClientProvider`.  
2. **Fetch Data**: Use `useQuery` in components with a query key and function.  
3. **Automatic Caching**: React Query handles deduping, caching, and background updates.  
4. **Invalidation**: Use `queryClient.invalidateQueries({ queryKey: ['todos'] })` to trigger refetch.  

By abstracting complex server-state logic, React Query reduces boilerplate and ensures efficient, up-to-date data handling.

## Deduplication

In React Query, **deduplication** (or "request deduplication") refers to the automatic process of **eliminating redundant network requests** for the same data. It ensures that if multiple components request data with the **same query key** simultaneously, only **one network request** is made, and all components share the result. This optimizes performance and prevents unnecessary API calls.

---

### **How Deduplication Works**  

1. **Query Key Uniqueness**:  
   - Queries are identified by their `queryKey`. If two components use the **same query key**, React Query treats them as the same query.  
   - Example: Two components fetching a user with `queryKey: ['user', 1]` will share a single request.  

2. **Active Queries**:  
   - An "active" query is one currently being used by a mounted component.  
   - If a new component mounts and requests the same query key, React Query checks:  
     - If the data is **fresh** (not stale), it returns the cached data immediately.  
     - If the data is **stale** or missing, it triggers a single network request (deduplicated).  

3. **Promise Sharing**:  
   - While a request is in progress, subsequent calls for the same query key **reuse the same promise** instead of firing new requests.  

---

### **Example Scenario**  

Imagine two components, `ComponentA` and `ComponentB`, both rendering on the same page and needing the same todo list:  

```javascript
// ComponentA
const { data } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
});

// ComponentB
const { data } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
});
```

- **Without Deduplication**: Two separate network requests would fire.  
- **With Deduplication**: Only **one request** is made, and both components receive the same cached result.  

---

### **Key Benefits**  

1. **Reduced Network Traffic**: Avoids duplicate API calls.  
2. **Consistent Data**: All components get the same data at the same time.  
3. **Performance Optimization**: Prevents redundant loading states.  

---

### **Deduplication vs. Caching**  

- **Deduplication**: Focuses on avoiding **simultaneous duplicate requests**.  
- **Caching**: Focuses on **storing data** for future use (even after components unmount).  

---

### **When Deduplication Happens**  

- During **mounting** of multiple components needing the same data.  
- When **refetching** data (e.g., due to window focus or network reconnection).  

---

### **Controlling Deduplication**  

By default, deduplication is automatic. To customize:  

- **`staleTime`**: Adjust how long data is considered fresh.  

  ```javascript
  useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    staleTime: 60_000, // Data stays fresh for 1 minute
  });
  ```

- **`enabled`**: Conditionally enable/disable queries to avoid unnecessary calls.  

---

### **Edge Cases**  

- **Different Query Functions**: If two components use the same `queryKey` but different `queryFn` functions, deduplication **won’t work** (this is a misconfiguration).  
- **Dynamic Keys**: Deduplication applies only if the `queryKey` is identical. For example:  
  - `['todos', 1]` and `['todos', 2]` are treated as separate queries.  

---

By leveraging deduplication, React Query ensures efficient data fetching and a smoother user experience. 🚀

## Query Lifecycle

### **Query Lifecycle in React Query**  

React Query manages the lifecycle of a query through distinct stages, optimizing data fetching, caching, and updates. Here's a breakdown of how a query progresses:

---

#### **1. Query Initialization**  

- **Trigger**: A component calls `useQuery` with a `queryKey` and `queryFn`.  
- **Check Cache**:  
  - If cached data exists and is **fresh** (based on `staleTime`), it returns the cached data immediately.  
  - If cached data is **stale** or missing, a network request is initiated.  

---

#### **2. Fetching (Loading State)**  

- **Network Request**:  
  - The `queryFn` (e.g., API call) executes.  
  - Deduplication ensures only **one request** is made for identical `queryKey`s.  
- **State Flags**:  
  - `isLoading: true` (first-time load).  
  - `isFetching: true` (any subsequent refetch).  

---

#### **3. Success or Error State**  

- **Success**:  
  - Data is cached under the `queryKey`.  
  - `isSuccess: true`, `data` is populated.  
  - Data is marked as **fresh** until `staleTime` (default: `0`).  
- **Error**:  
  - `isError: true`, `error` contains details.  
  - Retries (if configured via `retry` option) occur automatically.  

---

#### **4. Caching**  

- **Stale Data**: After `staleTime`, data becomes **stale** but remains cached.  
- **Background Updates**:  
  - Stale queries automatically refetch when:  
    - The component re-renders.  
    - The window regains focus (`refetchOnWindowFocus: true`).  
    - The network reconnects (`refetchOnReconnect: true`).  
    - A polling interval (`refetchInterval`) is set.  

---

#### **5. Inactivity & Garbage Collection**  

- **Inactive Queries**:  
  - When all components using the `queryKey` unmount, the query becomes **inactive**.  
  - Cached data remains for `cacheTime` (default: 5 minutes).  
- **Garbage Collection**:  
  - After `cacheTime` expires, inactive data is removed from the cache.  

---

#### **6. Manual Interactions**  

- **Refetching**:  

  ```javascript
  const { refetch } = useQuery(...);
  refetch(); // Manually triggers a refetch
  ```

- **Invalidation**:  

  ```javascript
  const queryClient = useQueryClient();
  queryClient.invalidateQueries({ queryKey: ['todos'] }); // Marks data as stale, triggers refetch
  ```

- **Reset/Remove**:  

  ```javascript
  queryClient.resetQueries(...); // Resets data to initial state
  queryClient.removeQueries(...); // Deletes data from cache
  ```

---

### **Key Options Affecting the Lifecycle**  

1. **`staleTime`**: Time until data is considered stale (default: `0`).  
   - Set `staleTime: Infinity` to disable background refetches.  
2. **`cacheTime`**: Time inactive data stays cached (default: 5 minutes).  
3. **`retry`**: Number of retry attempts on failure (default: `3`).  
4. **`refetchOnWindowFocus`**: Auto-refetch on window focus (default: `true`).  

---

### **Example Lifecycle Timeline**  

1. **Component Mounts**:  
   - `useQuery` checks the cache.  
   - Fetches data if stale/missing → `isLoading: true`.  
2. **Data Retrieved**:  
   - Cached → `isSuccess: true`.  
3. **User Navigates Away**:  
   - Component unmounts → query becomes inactive.  
4. **Window Refocuses**:  
   - Stale data triggers background refetch → updates cache.  
5. **After 5 Minutes (default `cacheTime`)**:  
   - Inactive data is garbage-collected.  

---

### **Visualizing the Lifecycle**  

```
Initialization → Fetching → [Success/Error] → Cached → Stale → Background Refetch → Inactive → Garbage Collected
```

---

### **Why It Matters**  

Understanding the query lifecycle helps:  

- Avoid unnecessary network requests.  
- Optimize performance with `staleTime` and `cacheTime`.  
- Ensure data consistency across components.  
- Gracefully handle errors and retries.  

By leveraging React Query’s lifecycle management, you can build efficient, resilient data-fetching logic with minimal boilerplate. 🛠️

# Fetching Data

### **Fetching Data with React Query**  

React Query simplifies data fetching by handling caching, deduplication, error handling, and background updates. Here's a step-by-step guide to fetching data:

#### **2. Fetch Data with `useQuery`**  

Use the `useQuery` hook to fetch data in components. It requires:  

- **`queryKey`**: Unique identifier for the query (e.g., `['todos']`).  
- **`queryFn`**: Function that returns a promise (e.g., API call).  

**Example**: Fetch a list of todos.  

```javascript
import { useQuery } from '@tanstack/react-query';

const fetchTodos = async () => {
  const response = await fetch('/api/todos');
  if (!response.ok) throw new Error('Failed to fetch todos');
  return response.json();
};

function Todos() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['todos'], // Unique cache key
    queryFn: fetchTodos, // Function to fetch data
    // Optional settings:
    staleTime: 10000, // Data stays fresh for 10 seconds
    retry: 2, // Retry twice on failure
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data.map((todo) => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}
```

### **Advanced Fetching**  

#### **1. Dynamic Query Keys**  

Use dynamic keys for parameterized requests (e.g., pagination, filters):  
`NOTE: Include every value used by the queryFn inside the queryKey array`

```javascript
const fetchUser = async (userId) => {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
};

function UserProfile({ userId }) {
  const { data } = useQuery({
    queryKey: ['user', userId], // Cache key includes userId
    queryFn: () => fetchUser(userId),
  });
}
```

#### **2. Dependent Queries**  

Fetch data conditionally using the `enabled` option:  

```javascript
// Fetch user only after userId is available
const { data: user } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  enabled: !!userId, // Query runs only if userId exists
});
```

#### **3. Pagination**  

Use `keepPreviousData` to avoid UI flickering during page changes:  

```javascript
const fetchPage = async (page) => {
  const response = await fetch(`/api/todos?page=${page}`);
  return response.json();
};

function Todos({ page }) {
  const { data } = useQuery({
    queryKey: ['todos', page],
    queryFn: () => fetchPage(page),
    keepPreviousData: true, // Show old data while new data loads
  });
}
```

---

### **Handling Errors**  

- **Retries**: Use `retry` to specify retry attempts.  
- **Global Error Handling**: Configure defaults in `QueryClient`:  

```javascript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3, // Retry 3 times
      onError: (error) => console.log('Global error:', error),
    },
  },
});
```

---

### **Benefits Over Manual Fetching**  

1. **Automatic Caching**: No need to manage cache manually.  
2. **Deduplication**: Avoids duplicate API calls.  
3. **Background Updates**: Keeps data fresh without extra code.  
4. **Devtools**: Inspect queries with React Query Devtools.  

---

By leveraging React Query, you eliminate boilerplate code and focus on building features while ensuring optimal performance and data consistency. 🚀

## Data Synchronization

React Query maintains data synchronization between the client and server through a combination of **smart caching**, **background updates**, and **event-driven triggers**. Here’s how it handles ever-changing server state:

---

### **1. Stale Data & Background Refetching**  

- **Stale Data**: By default, fetched data is marked as **stale** immediately (`staleTime: 0`).  
- **Background Refetch**: Stale data automatically triggers a refetch in the background when:  
  - The component re-renders (e.g., due to state/prop changes).  
  - The user refocuses the window (`refetchOnWindowFocus: true`).  
  - The network reconnects (`refetchOnReconnect: true`).  
  - A polling interval is set (`refetchInterval: 5000`).  

```javascript
useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  staleTime: 5000, // Data becomes stale after 5 seconds
  refetchOnWindowFocus: true, // Auto-refetch on window focus
});
```

---

### **2. Query Invalidation**  

Manually mark data as stale to force a refetch:  

```javascript
const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: ['todos'] }); // Triggers background refetch
```

- Use this after mutations (e.g., POST, DELETE) to ensure fresh data.

---

### **3. Real-Time Updates with Optimistic Updates**  

React Query supports **optimistic updates** to reflect changes immediately in the UI before the server confirms them. After the mutation:  

1. Update the cache optimistically.  
2. Refetch data to ensure consistency.  

```javascript
const { mutate } = useMutation({
  mutationFn: updateTodo,
  onMutate: (newTodo) => {
    // Optimistically update the cache
    queryClient.setQueryData(['todos'], (old) => [...old, newTodo]);
  },
  onSettled: () => {
    // Refetch todos to sync with the server
    queryClient.invalidateQueries(['todos']);
  },
});
```

---

### **4. WebSocket/SSE Integration**  

For real-time apps (e.g., chat, live feeds), pair React Query with WebSocket/SSE:  

1. Listen to server events.  
2. Invalidate queries or update the cache when new data arrives.  

```javascript
const socket = new WebSocket('ws://api');
socket.onmessage = (event) => {
  const newData = JSON.parse(event.data);
  queryClient.setQueryData(['messages'], (old) => [...old, newData]);
};
```

---

### **5. Query Key Dependency System**  

- Queries with the same **query key** share data and synchronization logic.  
- Example: Two components using `['todos']` will always reflect the same data.  

---

### **6. Garbage Collection & Cache Management**  

- **Cache Persistence**: Data remains cached even after components unmount (for `cacheTime`, default 5 minutes).  
- **Garbage Collection**: Inactive queries (unused by components) are removed after `cacheTime`.  

---

### **7. Automatic Retries**  

Failed queries retry automatically (default: 3 retries) to recover from transient errors:  

```javascript
useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  retry: 3, // Retry 3 times on failure
});
```

---

### **8. Deduplication**  

- Identical concurrent requests (same `queryKey`) are deduped into a single network call.  
- Prevents redundant API requests during rapid component mounts or user actions.  

---

### **Example Workflow**  

1. **Initial Fetch**: Data is fetched and cached.  
2. **Data Goes Stale**: After `staleTime`, it’s marked as stale.  
3. **Background Refetch**: Triggered by window focus, re-render, or interval.  
4. **Manual Invalidation**: After a mutation, data is invalidated to force a refetch.  
5. **Real-Time Sync**: WebSocket updates or polling keep data fresh.  

---

### **Why It Works**  

React Query treats server state as **ephemeral and dynamic**, not a static snapshot. By combining:  

- **Staleness checks** (to decide when to refetch).  
- **Event-driven triggers** (focus, reconnect, etc.).  
- **Explicit invalidation** (post-mutation).  
- **Real-time patterns** (WebSocket integration).  

It ensures the client state stays in sync with the server **without manual polling or excessive network traffic**.  

---

### **Key Settings for Synchronization**  

1. **`staleTime`**: Balance freshness vs. performance (shorter = more frequent updates).  
2. **`refetchOnWindowFocus`**: Keep data fresh during user interactions.  
3. **`refetchInterval`**: Polling for real-time apps without WebSocket.  
4. **`cacheTime`**: Tune how long inactive data persists.  

---

By abstracting these complexities, React Query lets you focus on building features while ensuring **server-state consistency** out of the box. 🔄

## Fetching on demand

### **Fetching on Demand in React Query: States & Usage**  

React Query provides granular control over data fetching, including manual ("on-demand") fetching. Here’s how to use it with key states like `isLoading`, `isFetching`, `isPending`, and when to apply them:

---

### **1. Core States**  

#### **For Queries (`useQuery`)**  

| State          | Description                                                                 | Use Case                                                                 |
|----------------|-----------------------------------------------------------------------------|--------------------------------------------------------------------------|
| **`isLoading`** | True during the **initial fetch** (no cached data exists).                  | Show a loading spinner on first load.                                   |
| **`isFetching`**| True **any time a fetch is in progress** (initial or background refetch).   | Show a subtle loading indicator (e.g., skeleton UI) during refetches.   |
| **`isError`**   | True if the fetch failed.                                                   | Display error messages or retry buttons.                                |
| **`isSuccess`** | True when data is available.                                                | Render the data.                                                        |

#### **For Mutations (`useMutation`)**  

| State          | Description                                                                 | Use Case                                                                 |
|----------------|-----------------------------------------------------------------------------|--------------------------------------------------------------------------|
| **`isPending`** | True while the mutation (e.g., POST/PUT/DELETE) is in progress.             | Disable a submit button during form submission.                         |
| **`isError`**   | True if the mutation failed.                                                | Show error feedback.                                                    |
| **`isSuccess`** | True when the mutation succeeded.                                           | Trigger side effects (e.g., redirect, show success toast).              |

---

### **2. Fetching on Demand**  

#### **Scenario 1: Manual Refetch with `useQuery`**  

Use `refetch` from `useQuery` to manually trigger a data fetch (e.g., reload button).  

```javascript
import { useQuery } from '@tanstack/react-query';

function UserProfile() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
  });

  return (
    <div>
      <button onClick={refetch} disabled={isFetching}>
        {isFetching ? 'Refreshing...' : 'Reload Data'}
      </button>
      {isLoading ? (
        'Loading...'
      ) : (
        <div>{data.name}</div>
      )}
    </div>
  );
}
```

- **`isLoading`**: First-time load (no cached data).  
- **`isFetching`**: Manual refetch or background update.  

---

#### **Scenario 2: Triggering a Mutation with `useMutation`**  

Use `useMutation` for actions that modify server state (e.g., form submission), then invalidate/refetch queries.  

```javascript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function AddTodo() {
  const queryClient = useQueryClient();
  const { mutate, isPending, isError } = useMutation({
    mutationFn: (newTodo) => axios.post('/api/todos', newTodo),
    onSuccess: () => {
      // Invalidate the todos query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  const handleSubmit = (data) => {
    mutate(data); // Trigger the mutation
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="todo" />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Adding...' : 'Add Todo'}
      </button>
      {isError && <p>Failed to add todo.</p>}
    </form>
  );
}
```

- **`isPending`**: Disable the submit button during mutation.  
- **`invalidateQueries`**: Ensures the todos list refetches after mutation.  

---

### **3. When to Use Each State**  

| State          | Component Type | Use Case Example                                                                 |
|----------------|----------------|----------------------------------------------------------------------------------|
| **`isLoading`** | Query          | Full-page loading spinner on initial data load.                                  |
| **`isFetching`**| Query          | Skeleton UI or progress bar during background refetches.                         |
| **`isPending`** | Mutation       | Disabling a form button to prevent duplicate submissions.                       |

---

### **4. Key Patterns**  

1. **Manual Refetch**: Use `refetch` from `useQuery` for user-triggered reloads.  
2. **Optimistic Updates**: Combine `useMutation` with `setQueryData` for instant UI changes.  
3. **Dependent Queries**: Use `enabled` to chain queries (e.g., fetch user details after user ID is available).  

---

### **5. Common Pitfalls**  

- **Confusing `isLoading` and `isFetching`**:  
  - `isLoading` is **only for the first load**.  
  - `isFetching` covers **all fetch states** (including manual/background).  
- **Overfetching**: Use `staleTime` to control how often data refetches automatically.  
- **Unnecessary Refetches**: Use `enabled: false` for queries that should only run manually.  

---

### **Example: Combined Query & Mutation**  

```javascript
function TodoList() {
  // Query to fetch todos
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  });

  // Mutation to delete a todo
  const { mutate, isPending } = useMutation({
    mutationFn: deleteTodo,
    onSuccess: () => {
      // Invalidate todos query after deletion
      queryClient.invalidateQueries(['todos']);
    },
  });

  return (
    <div>
      <button onClick={refetch} disabled={isFetching}>
        {isFetching ? 'Refreshing...' : 'Refresh List'}
      </button>
      {isLoading ? (
        'Loading todos...'
      ) : (
        <ul>
          {data.map((todo) => (
            <li key={todo.id}>
              {todo.text}
              <button 
                onClick={() => mutate(todo.id)} 
                disabled={isPending}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- **`isFetching`** for the refresh button.  
- **`isPending`** for the delete button.  

---

By understanding these states and patterns, you can build responsive UIs that handle server-state changes gracefully while minimizing unnecessary network requests. 🎯

# Garbage Collection

**Garbage Collection in React Query**

React Query's garbage collection (GC) automatically manages the cache by removing inactive queries, optimizing memory usage and performance. Here's a detailed breakdown:

---

### **1. Key Concepts**  

- **Inactive Query**: A query with **no active components** using it (i.e., all components using the query have unmounted).  
- **Cache Time (`cacheTime`)**: The duration (default: `5 minutes`) inactive queries remain cached before being garbage-collected.  
- **Activity Tracking**: React Query uses a **reference counter** to track how many components are using a query.  

---

### **2. How It Works**  

1. **Component Mounts**:  
   - When a component calls `useQuery`, React Query increments the query’s **reference count**.  
   - If the query is **inactive** (not in the cache), it fetches fresh data.  

2. **Component Unmounts**:  
   - The query’s reference count decrements.  
   - If the count hits **0**, the query becomes **inactive**, and the GC timer starts.  

3. **Garbage Collection**:  
   - After `cacheTime` expires, the query and its data are **permanently removed** from the cache.  
   - If the query is reused before `cacheTime` ends, the timer resets.  

---

### **3. Example Workflow**  

1. **Component A** mounts and uses `useQuery({ queryKey: ['todos'] })`:  
   - Reference count = 1.  
   - Data is cached.  

2. **Component A** unmounts:  
   - Reference count = 0 → Query becomes inactive.  
   - GC timer starts (5 minutes by default).  

3. **Within 5 minutes**:  
   - If **Component B** mounts and uses the same query:  
     - Reference count = 1 → Timer canceled.  
     - Uses cached data (if fresh) or fetches new data (if stale).  

4. **After 5 minutes**:  
   - If no component uses the query, it’s garbage-collected.  

---

### **4. Key Configuration**  

- **`cacheTime`**:  

  ```javascript
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        cacheTime: 1000 * 60 * 10, // 10 minutes
      },
    },
  });
  ```

  - Adjust based on app needs (e.g., shorter for real-time apps, longer for sparingly used data).  

- **Manual Removal**:  

  ```javascript
  const queryClient = useQueryClient();
  queryClient.removeQueries({ queryKey: ['todos'] }); // Immediate removal
  ```

---

### **5. Garbage Collection vs. Stale Data**  

- **`staleTime`**: Determines when data is considered outdated (triggers background refetch).  
- **`cacheTime`**: Determines when inactive data is deleted.  
  - Example:  
    - `staleTime: 0` (data is stale immediately).  
    - `cacheTime: 5 minutes` (data removed 5 minutes after last component unmounts).  

---

### **6. When to Tweak `cacheTime`**  

- **Increase `cacheTime`**:  
  - For data reused frequently across navigation (e.g., user settings).  
  - When instant access to historical data is critical.  

- **Decrease `cacheTime`**:  
  - For highly dynamic data (e.g., live notifications).  
  - To reduce memory usage in low-end devices.  

---

### **7. Edge Cases**  

- **Shared Query Keys**:  
  - If two components use the same query key, GC only triggers when **both** unmount.  
- **Background Refetches**:  
  - Refetching data doesn’t reset the `cacheTime` timer (only component activity does).  

---

### **8. Benefits**  

- **Memory Efficiency**: Prevents cache bloat by removing unused data.  
- **Performance**: Reduces unnecessary re-renders from stale cache entries.  
- **Simplified State Management**: No manual cleanup required.  

---

**Summary**:  
React Query’s garbage collection ensures your app’s cache stays lean and efficient by automatically removing inactive queries after a configurable period. This balances performance and memory usage while abstracting complex cache management. 🗑️🚀

## Polling

### **Polling in React Query**  

Polling refers to **periodically refetching data** at a set interval to keep the client state synchronized with the server. React Query simplifies polling with built-in options, reducing manual timer management. Here’s how it works:

---

### **1. Basic Polling**  

Use the `refetchInterval` option in `useQuery` to trigger automatic refetches:  

```javascript
const { data } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  refetchInterval: 5000, // Refetch every 5 seconds
});
```

- **How It Works**:  
  - Fetches data initially.  
  - Re-fetches every `refetchInterval` milliseconds, **regardless of data staleness**.  
  - Continues polling even if the window is not in focus (use `refetchIntervalInBackground: false` to disable this).  

---

### **2. Dynamic Polling**  

Conditionally enable/disable polling using a **dynamic `refetchInterval`**:  

```javascript
const [isPolling, setIsPolling] = useState(false);

const { data } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  refetchInterval: isPolling ? 3000 : false, // Poll only when `isPolling` is true
});
```

- **Use Case**: Start/stop polling based on user actions (e.g., toggle button).  

---

### **3. Polling on Error**  

By default, polling **pauses temporarily** if a fetch fails. Customize retry behavior:  

```javascript
useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  refetchInterval: 5000,
  retry: 3, // Retry 3 times on error before stopping
  retryDelay: 1000, // Wait 1 second between retries
});
```

---

### **4. Background Polling**  

Control whether polling continues when the window/tab is inactive:  

```javascript
useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  refetchInterval: 5000,
  refetchIntervalInBackground: true, // Keep polling in background
});
```

---

### **5. Polling with Stale Data**  

Combine polling with `staleTime` to balance freshness and performance:  

```javascript
useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  staleTime: 10000, // Data becomes stale after 10 seconds
  refetchInterval: 5000, // Poll every 5 seconds (even if data is fresh)
});
```

- **Note**: Polling happens **regardless of staleness** unless the query is inactive.  

---

### **6. Stopping Polling**  

- **Unmounting**: Polling stops when all components using the query unmount.  
- **Manual Stop**: Set `refetchInterval: false` dynamically.  

---

### **Example: Real-Time Dashboard**  

```javascript
function Dashboard() {
  const { data, isError } = useQuery({
    queryKey: ['metrics'],
    queryFn: fetchMetrics,
    refetchInterval: 2000, // Poll every 2 seconds
    refetchIntervalInBackground: true,
    retry: 2,
  });

  return (
    <div>
      {isError ? (
        <p>Failed to load metrics.</p>
      ) : (
        <Chart data={data} />
      )}
    </div>
  );
}
```

---

### **When to Use Polling**  

- **Real-Time Updates**: When WebSocket/SSE isn’t feasible.  
- **High-Frequency Data**: Stock tickers, live scores, IoT sensor data.  
- **Fallback Strategy**: Supplement with polling if WebSocket connections drop.  

---

### **Best Practices**  

1. **Avoid Over-Polling**: Use longer intervals for non-critical data.  
2. **Combine with Stale Time**: Let `staleTime` handle freshness between polls.  
3. **Error Handling**: Use `retry` and `retryDelay` to handle transient failures.  

---

By leveraging React Query’s polling features, you can easily implement real-time data synchronization without complex state management. 🔄

## Dependent Queries

**Dependent Queries in React Query**  
Dependent queries allow you to **conditionally fetch data** based on the results of another query or external state. This is useful for scenarios like:  

- Fetching data in sequence (e.g., user profile → user’s orders).  
- Preventing unnecessary requests until required parameters are available.  

---

### **How It Works**  

Use the `enabled` option in `useQuery` to control when a query executes:  

```javascript
// 1. Fetch user ID first
const { data: user } = useQuery({
  queryKey: ['user', userId],
  queryFn: fetchUser,
});

// 2. Fetch user's orders ONLY after user ID is available
const { data: orders } = useQuery({
  queryKey: ['orders', user?.id],
  queryFn: () => fetchOrders(user.id),
  enabled: !!user?.id, // Query runs only if user.id exists
});
```

---

### **Key Features**  

1. **Conditional Execution**:  
   - The dependent query (e.g., `orders`) runs **only when `enabled` is `true`**.  
   - If `enabled` becomes `false` mid-request, the query cancels automatically.  

2. **Automatic Retries**:  
   - If the parent query (e.g., `user`) fails, the dependent query skips execution.  

3. **Loading States**:  
   - `isLoading: true` for the dependent query only when it’s actively fetching.  
   - Combine states for a unified UI:  

     ```javascript
     const isUserLoading = userIsLoading;
     const isOrdersLoading = ordersIsLoading && !isUserLoading;
     ```

---

### **Use Cases**  

#### **1. Sequential Data Fetching**  

Fetch data in a specific order:  

```javascript
// Fetch user → then fetch their posts
const { data: user } = useQuery(['user'], fetchUser);
const { data: posts } = useQuery({
  queryKey: ['posts', user?.id],
  queryFn: () => fetchPosts(user.id),
  enabled: !!user?.id,
});
```

#### **2. Dynamic Parameters**  

Wait for user input or external state:  

```javascript
const [selectedCategory, setSelectedCategory] = useState();

// Fetch products only after a category is selected
const { data: products } = useQuery({
  queryKey: ['products', selectedCategory],
  queryFn: () => fetchProducts(selectedCategory),
  enabled: !!selectedCategory, // Runs when selectedCategory is set
});
```

#### **3. Multiple Dependencies**  

Wait for multiple conditions:  

```javascript
const { data: user } = useQuery(['user'], fetchUser);
const { data: permissions } = useQuery(['permissions'], fetchPermissions);

// Fetch dashboard data only after user AND permissions are loaded
const { data: dashboard } = useQuery({
  queryKey: ['dashboard'],
  queryFn: fetchDashboard,
  enabled: !!user && !!permissions,
});
```

---

### **Best Practices**  

- **Avoid Over-Nesting**: Break complex dependency chains into smaller queries.  
- **Error Handling**: Handle errors in parent queries to prevent cascading failures.  
- **Optimistic Updates**: Use `setQueryData` to update dependent queries after mutations.  

---

### **Edge Cases**  

- **Changing Dependencies**: If the dependent query’s `queryKey` changes (e.g., `user.id` updates), React Query auto-refetches.  
- **Stale Data**: Dependent queries respect `staleTime` and `cacheTime` settings.  

---

**Example**:  

```javascript
function UserDashboard({ userId }) {
  // 1. Fetch user
  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  // 2. Fetch dashboard stats (depends on user.teamId)
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['stats', user?.teamId],
    queryFn: () => fetchStats(user.teamId),
    enabled: !!user?.teamId, // Wait for user.teamId
  });

  if (isUserLoading) return 'Loading user...';
  if (isStatsLoading) return 'Loading stats...';

  return <Dashboard user={user} stats={stats} />;
}
```

---

By leveraging `enabled` and React Query’s lifecycle management, you can orchestrate complex data-fetching logic while keeping your code declarative and efficient. 🎯

## Parallel Queries

### **Parallel Queries in React Query**  

Parallel queries allow you to **fetch multiple data sources simultaneously** (in parallel) rather than sequentially. This is useful for:  

- Fetching independent datasets (e.g., user profile + notifications + settings).  
- Optimizing load times by avoiding waterfall requests.  

React Query supports two patterns for parallel queries: **static** (fixed number of queries) and **dynamic** (variable number of queries).

---

### **1. Static Parallel Queries**  

Use multiple `useQuery` hooks in the same component. Each query runs independently and in parallel.  

```javascript
function Dashboard() {
  // Fetch user and posts in parallel
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
  });

  const { data: posts } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  });

  return (
    <div>
      <UserProfile data={user} />
      <PostList data={posts} />
    </div>
  );
}
```

---

### **2. Dynamic Parallel Queries**  

Use the `useQueries` hook to fetch a **dynamic number of queries** (e.g., based on an array of IDs).  

```javascript
function UserProfiles({ userIds }) {
  // Generate an array of query options
  const userQueries = useQueries({
    queries: userIds.map((id) => ({
      queryKey: ['user', id],
      queryFn: () => fetchUser(id),
    })),
  });

  // All queries run in parallel
  return (
    <div>
      {userQueries.map(({ data, isLoading }, index) => (
        isLoading ? (
          <Loader key={userIds[index]} />
        ) : (
          <UserProfile key={data.id} data={data} />
        )
      ))}
    </div>
  );
}
```

---

### **Key Features**  

- **Independent Loading States**: Each query has its own `isLoading`, `isError`, etc.  
- **Optimized Performance**: Queries are deduped and cached individually.  
- **Cancellation**: Unmounting a component cancels in-progress queries (if not used elsewhere).  

---

### **Handling Loading & Error States**  

#### **Aggregate Loading State**  

Check if any query is still loading:  

```javascript
const isAnyLoading = userQueries.some((query) => query.isLoading);
```

#### **Aggregate Error State**  

Check if any query has errored:  

```javascript
const anyError = userQueries.find((query) => query.isError);
```

---

### **When to Use Parallel Queries**  

- **Independent Data**: Fetching unrelated resources (e.g., user data + product catalog).  
- **Dynamic Lists**: Rendering UIs based on an array of IDs (e.g., user IDs in a dashboard).  
- **Avoiding Waterfalls**: Prevent sequential waits (e.g., fetch all data needed for a page at once).  

---

### **Best Practices**  

1. **Combine with Suspense**: Use React Suspense to handle loading states declaratively.  
2. **Limit Concurrent Requests**: Avoid overwhelming the server with too many parallel requests (use pagination or batch APIs if needed).  
3. **Cache Optimization**: Set appropriate `staleTime` and `cacheTime` for each query.  

---

### **Example: Parallel + Dependent Queries**  

Combine parallel and dependent queries for complex workflows:  

```javascript
function UserDashboard({ userId }) {
  // Parallel: Fetch user and permissions
  const { data: user } = useQuery(['user', userId], fetchUser);
  const { data: permissions } = useQuery(['permissions'], fetchPermissions);

  // Dependent: Fetch projects only after user/permissions are loaded
  const { data: projects } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: () => fetchProjects(user.id),
    enabled: !!user && permissions?.canViewProjects,
  });

  // Render UI...
}
```

---

### **Dynamic Parallel Queries with `useQueries`**  

Use `useQueries` for scenarios like fetching data for a list of items:  

```javascript
function ProductList({ productIds }) {
  const productQueries = useQueries({
    queries: productIds.map((id) => ({
      queryKey: ['product', id],
      queryFn: () => fetchProduct(id),
    })),
  });

  return (
    <div>
      {productQueries.map(({ data, isLoading }, index) => (
        isLoading ? (
          <Skeleton key={productIds[index]} />
        ) : (
          <Product key={data.id} data={data} />
        )
      ))}
    </div>
  );
}
```

---

### **Performance Considerations**  

- **Server Load**: Parallel queries can stress your API. Consider batch endpoints if you’re fetching many related items.  
- **Client Memory**: Large datasets may increase memory usage (adjust `cacheTime`).  

---

By leveraging parallel queries, you maximize data-fetching efficiency while keeping your code clean and maintainable. 🚀

## Avoid loading states by Prefetching

### **Prefetching in React Query: Avoiding Loading States & Performance Insights**  

Prefetching allows you to **load data in advance** before it’s needed, reducing or eliminating loading states and improving user experience. Here’s how it works and its performance implications:

---

### **1. What is Prefetching?**  

- **Goal**: Fetch and cache data proactively so it’s instantly available when the user navigates to a component.  
- **Use Case**:  
  - Preload data for a detail page when hovering over a link.  
  - Fetch paginated data for the next page in advance.  
- **Tools**:  
  - `queryClient.prefetchQuery` (manual prefetching).  
  - `useQuery` with `initialData` (for SSR/SSG).  

---

### **2. How Prefetching Works**  

#### **Step 1: Prefetch Data**  

Call `prefetchQuery` to fetch and cache data for a specific `queryKey`:  

```javascript
import { useQueryClient } from '@tanstack/react-query';

function App() {
  const queryClient = useQueryClient();

  // Prefetch data on hover (e.g., for a link/button)
  const handleHover = () => {
    queryClient.prefetchQuery({
      queryKey: ['user', userId],
      queryFn: () => fetchUser(userId),
      staleTime: 5000, // Optional: Control freshness
    });
  };

  return (
    <Link to="/user" onMouseEnter={handleHover}>
      View Profile
    </Link>
  );
}
```

#### **Step 2: Use Prefetched Data**  

When the component mounts, `useQuery` uses the cached data if available:  

```javascript
function UserProfile({ userId }) {
  const { data } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  // No loading state if prefetched data is fresh and cached
  return <div>{data.name}</div>;
}
```

---

### **3. Performance Benefits**  

1. **No Loading States**: Users see cached data immediately (if fresh).  
2. **Faster Navigation**: Data is ready before the component renders.  
3. **Reduced Network Churn**: Avoids duplicate requests via caching.  

---

### **4. Performance Trade-Offs**  

1. **Overfetching Risk**: Prefetching data the user never accesses wastes bandwidth.  
2. **Memory Usage**: Cached data consumes memory until garbage-collected (`cacheTime`).  
3. **Server Load**: Aggressive prefetching can strain APIs.  

---

### **5. Best Practices for Optimal Performance**  

#### **A. Strategic Prefetching**  

- **User Intent**: Trigger prefetching on high-probability actions (e.g., hover, button focus).  
- **Critical Data Only**: Prefetch data for likely next steps (e.g., first page of a list).  

#### **B. Cache Configuration**  

- **`staleTime`**: Set higher values for data that changes infrequently (e.g., `staleTime: 60_000`).  
- **`cacheTime`**: Adjust to balance memory usage and re-fetch frequency (default: 5 minutes).  

#### **C. Conditional Prefetching**  

Only prefetch if data isn’t already cached:  

```javascript
const handleHover = async () => {
  const cachedData = queryClient.getQueryData(['user', userId]);
  if (!cachedData) {
    await queryClient.prefetchQuery(...);
  }
};
```

#### **D. Use with SSR/SSG**  

Hydrate the cache server-side to avoid client-side fetching:  

```javascript
// Next.js example
export async function getStaticProps() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery(['user', userId], fetchUser);
  return { props: { dehydratedState: dehydrate(queryClient) } };
}
```

---

### **6. Performance Impact Scenarios**  

| Scenario                  | Pros                          | Cons                          |  
|---------------------------|-------------------------------|-------------------------------|  
| **Prefetch on Hover**     | Low risk, high UX payoff      | Minimal bandwidth waste       |  
| **Prefetch All Pages**    | Seamless pagination           | High memory/bandwidth cost    |  
| **Aggressive StaleTime**  | Fewer background refetches    | Risk of stale data            |  

---

### **7. Example: Pagination Prefetching**  

Prefetch the next page while the user views the current one:  

```javascript
function TodoList({ page }) {
  const queryClient = useQueryClient();

  // Prefetch next page on mount
  useEffect(() => {
    if (page < totalPages) {
      queryClient.prefetchQuery({
        queryKey: ['todos', page + 1],
        queryFn: () => fetchTodos(page + 1),
      });
    }
  }, [page]);

  // Render current page...
}
```

---

### **8. When to Avoid Prefetching**  

- **Low-Probability Data**: If users rarely access certain routes.  
- **Large Datasets**: Prefetching 1000 records could slow down the app.  
- **Real-Time Data**: Use WebSocket/SSE instead for constantly changing data.  

---

By strategically prefetching data, you can eliminate loading spinners and create a snappier UX. However, balance this with resource efficiency to avoid unnecessary costs. 🚀

### **`initialData` in React Query: Concept & Usage**  

The `initialData` option in `useQuery` allows you to **provide preloaded data** to a query before it fetches fresh data from the server. This is useful for scenarios where you already have data available (e.g., from a parent component, SSR, or a cache) and want to avoid loading states while the query fetches the latest version.

---

### **How `initialData` Works**  

- **Initial Render**: The query uses `initialData` immediately, skipping the `isLoading` state.  
- **Background Fetch**: React Query silently refetches fresh data in the background (unless `staleTime` is set to `Infinity`).  
- **Data Update**: If the background fetch succeeds, the UI updates with the new data.  

---

### **When to Use `initialData`**  

#### 1. **Server-Side Rendering (SSR/SSG)**  

Pass data fetched on the server to the client:  

```javascript
// Next.js example: Fetch data in getServerSideProps
export async function getServerSideProps() {
  const initialData = await fetchTodos();
  return { props: { initialData } };
}

function Todos({ initialData }) {
  const { data } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    initialData, // Use server-fetched data first
  });
}
```

#### 2. **Partial/Placeholder Data**  

Show a subset of data while fetching the full dataset:  

```javascript
const { data } = useQuery({
  queryKey: ['user'],
  queryFn: fetchUser,
  initialData: { id: 1, name: 'Placeholder' }, // Temporary data
});
```

#### 3. **State Sharing Between Components**  

Reuse data fetched in a parent component:  

```javascript
function Parent() {
  const { data: user } = useQuery(['user'], fetchUser);
  return <Child userId={user.id} />;
}

function Child({ userId }) {
  const { data: posts } = useQuery({
    queryKey: ['posts', userId],
    queryFn: fetchPosts,
    initialData: [], // Avoid loading state while posts fetch
  });
}
```

#### 4. **Optimistic Updates**  

Provide an optimistic UI after a mutation:  

```javascript
const queryClient = useQueryClient();

const { mutate } = useMutation({
  mutationFn: updateTodo,
  onMutate: (newTodo) => {
    // Optimistically update the cache
    queryClient.setQueryData(['todos'], (old) => [...old, newTodo]);
  },
});
```

---

### **Key Considerations**  

#### **`initialData` vs. `placeholderData`**  

| Feature                | `initialData`                          | `placeholderData`                      |  
|-------------------------|----------------------------------------|----------------------------------------|  
| **Cache Persistence**   | Saved to cache (treated as valid data).| Not saved to cache (temporary UI fill).|  
| **Background Refetch**  | Always triggers a refetch*.            | No refetch unless explicitly called.   |  
| **Use Case**            | SSR, hydration, or known partial data.| Skeleton placeholders or fallbacks.    |  

_\* Unless `staleTime` is set to `Infinity`._

---

#### **Data Freshness**  

- If `initialData` is provided, React Query treats it as **fresh** until `staleTime` expires (default: `0`).  
- Adjust `staleTime` to control how quickly background refetches happen:  

```javascript
useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  initialData: cachedTodos,
  staleTime: 30_000, // Refetch after 30 seconds
});
```

---

### **Performance Impact**  

- ✅ **Faster Perceived Load**: Users see data immediately.  
- ⚠️ **Overfetching Risk**: Ensure `initialData` isn’t stale or irrelevant.  
- ⚠️ **Memory Overhead**: Cached `initialData` persists until garbage-collected.  

---

### **Example: Avoiding Loading States**  

```javascript
function Todo({ todoId }) {
  // Get partial data from a parent component or cache
  const partialTodo = { id: todoId, title: '...' };

  const { data } = useQuery({
    queryKey: ['todo', todoId],
    queryFn: () => fetchTodoDetails(todoId),
    initialData: partialTodo, // Show partial data immediately
  });

  return <div>{data.title}</div>;
}
```

---

### **When to Avoid `initialData`**  

- **No Pre-Existing Data**: If you don’t have any data to provide upfront.  
- **Highly Dynamic Data**: When the initial data is likely outdated quickly.  
- **Complex Data Structures**: If matching the server response shape is error-prone.  

---

### **Summary**  

Use `initialData` to:  

1. Improve perceived performance with instant data rendering.  
2. Share data between components or SSR/SSG.  
3. Provide fallbacks while avoiding loading spinners.  

Always pair it with a background fetch to ensure data freshness! 🚀

## Pagination

### **Pagination in React Query**  

Pagination in React Query involves fetching and managing data in chunks (pages) while maintaining a smooth user experience. React Query provides tools to handle page transitions, caching, and background fetching efficiently. Here's how it works:

---

### **1. Basic Pagination Setup**  

Use `useQuery` with a dynamic `queryKey` that includes the current page number.  

```javascript
import { useQuery } from '@tanstack/react-query';

function TodoList() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['todos', page], // Unique key per page
    queryFn: () => fetchTodos(page), // Fetch function with page param
    keepPreviousData: true, // Optional: Keep old data during transitions
  });

  return (
    <div>
      {data?.todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
      <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>
        Previous
      </button>
      <button onClick={() => setPage(p => p + 1)} disabled={!data?.hasNextPage}>
        Next
      </button>
    </div>
  );
}
```

---

### **2. Key Features**  

#### **`keepPreviousData`**  

- **Purpose**: Retains the previous page’s data while fetching the next page.  
- **Benefit**: Avoids UI flickering and provides seamless transitions.  
- **Usage**:  

  ```javascript
  keepPreviousData: true
  ```

#### **Prefetching Pages**  

Fetch the next page in advance (e.g., on hover) to make navigation instant:  

```javascript
const queryClient = useQueryClient();

// Prefetch the next page
const prefetchNextPage = (page) => {
  queryClient.prefetchQuery({
    queryKey: ['todos', page + 1],
    queryFn: () => fetchTodos(page + 1),
  });
};

// Trigger on button hover
<button 
  onMouseEnter={() => prefetchNextPage(page)}
  onClick={() => setPage(p => p + 1)}
>
  Next
</button>
```

---

### **3. Infinite Scroll (Cursor/Offset-Based)**  

Use `useInfiniteQuery` for infinite scroll UIs:  

```javascript
import { useInfiniteQuery } from '@tanstack/react-query';

function InfiniteTodoList() {
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteQuery({
    queryKey: ['todos'],
    queryFn: ({ pageParam = 1 }) => fetchTodos(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPage, // Logic for next page
  });

  return (
    <div>
      {data.pages.map((page) => (
        page.todos.map((todo) => <TodoItem key={todo.id} todo={todo} />)
      ))}
      <button 
        onClick={() => fetchNextPage()} 
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage ? 'Loading...' : 'Load More'}
      </button>
    </div>
  );
}
```

---

### **4. Pagination Patterns**  

#### **Offset-Based Pagination**  

- **Example**: `page=1`, `page=2`.  
- **Implementation**:  

  ```javascript
  queryFn: () => fetch(`/api/todos?page=${pageParam}&limit=10`)
  ```

#### **Cursor-Based Pagination**  

- **Example**: Use a cursor ID from the last item.  
- **Implementation**:  

  ```javascript
  getNextPageParam: (lastPage) => lastPage.nextCursor,
  ```

---

### **5. Caching & Performance**  

- **Automatic Caching**: Each page is cached under its unique `queryKey`.  
- **Garbage Collection**: Inactive pages are removed after `cacheTime` (default: 5 minutes).  
- **Optimization**:  
  - Set `staleTime` to control how often pages refetch.  
  - Use `initialData` for SSR/SSG hydration.  

---

### **6. Best Practices**  

1. **Prefetch Pages**: Load the next page in advance for instant navigation.  
2. **Use `keepPreviousData`**: Avoid UI flickering during page transitions.  
3. **Batch Updates**: Invalidate all paginated data after mutations:  

   ```javascript
   queryClient.invalidateQueries({ queryKey: ['todos'] });
   ```

---

### **Example: Full Pagination Workflow**  

```javascript
function PaginatedTodos() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  // Fetch current page
  const { data, isLoading } = useQuery({
    queryKey: ['todos', page],
    queryFn: () => fetchTodos(page),
    keepPreviousData: true,
  });

  // Prefetch next page
  useEffect(() => {
    if (data?.hasNextPage) {
      queryClient.prefetchQuery({
        queryKey: ['todos', page + 1],
        queryFn: () => fetchTodos(page + 1),
      });
    }
  }, [data, page]);

  return (
    <div>
      {isLoading ? (
        'Loading...'
      ) : (
        data.todos.map((todo) => <TodoItem key={todo.id} todo={todo} />)
      )}
      <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>
        Previous
      </button>
      <button 
        onClick={() => setPage(p => p + 1)} 
        disabled={!data?.hasNextPage}
      >
        Next
      </button>
    </div>
  );
}
```

---

### **Performance Considerations**  

- **Bandwidth**: Avoid prefetching too many pages.  
- **Memory**: Adjust `cacheTime` to balance speed and memory usage.  
- **Server Load**: Use `staleTime` to minimize redundant fetches.  

---

By leveraging React Query’s pagination features, you can build fast, resilient UIs with minimal boilerplate. 🚀

## Infinite Queries

### **Infinite Queries & Infinite Scroll in React Query**

Infinite queries and infinite scroll are techniques for efficiently loading large datasets in chunks (pages) as the user interacts with the UI (e.g., scrolling). React Query's `useInfiniteQuery` hook simplifies this by managing pagination state, caching, and background fetching.

---

### **1. Core Concepts**  

#### **Infinite Query**  

A specialized query for paginated data where each page depends on the previous one. Common use cases:  

- Social media feeds.  
- Product listings with "Load More" buttons.  
- Infinite scroll UIs.

#### **Infinite Scroll**  

A UI pattern where new data is fetched automatically as the user scrolls near the bottom of the page.

---

### **2. `useInfiniteQuery` Fundamentals**  

The `useInfiniteQuery` hook provides:  

- **Page Management**: Track fetched pages.  
- **Automatic Pagination**: Fetch next/previous pages.  
- **Caching**: Store pages individually for quick access.  

#### **Key Parameters**  

| Parameter            | Description                                                                 |  
|----------------------|-----------------------------------------------------------------------------|  
| **`queryKey`**       | Unique identifier for the query (e.g., `['posts']`).                        |  
| **`queryFn`**        | Fetcher function that accepts `pageParam` (e.g., cursor or page number).    |  
| **`getNextPageParam`** | Function to derive the next page parameter from the last page’s data.       |  
| **`getPreviousPageParam`** | Function to derive the previous page parameter (for bidirectional pagination). |  

---

### **3. Implementing Infinite Scroll**  

#### **Step 1: Configure `useInfiniteQuery`**  

```javascript
import { useInfiniteQuery } from '@tanstack/react-query';

const fetchPosts = async ({ pageParam = 0 }) => {
  const res = await fetch(`/api/posts?cursor=${pageParam}`);
  return res.json();
};

function Feed() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
    getNextPageParam: (lastPage) => lastPage.nextCursor, // Get next cursor
    initialPageParam: 0, // Starting point (required in v5+)
  });
}
```

#### **Step 2: Render Pages**  

Flatten the paginated data into a single list:  

```javascript
const posts = data?.pages.flatMap((page) => page.posts) || [];
```

#### **Step 3: Trigger Fetch on Scroll**  

Use a scroll event listener or `IntersectionObserver` to detect when the user is near the bottom:  

```javascript
// Using a "Load More" button
<button
  onClick={() => fetchNextPage()}
  disabled={!hasNextPage || isFetchingNextPage}
>
  {isFetchingNextPage ? 'Loading...' : 'Load More'}
</button>

// Using auto-fetch on scroll
useEffect(() => {
  const handleScroll = () => {
    if (
      window.innerHeight + document.documentElement.scrollTop >=
      document.documentElement.offsetHeight - 100 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [hasNextPage, isFetchingNextPage]);
```

---

### **4. Data Structure**  

The `data` object returned by `useInfiniteQuery` has:  

- **`pages`**: Array of fetched pages (e.g., `[Page1, Page2, Page3]`).  
- **`pageParams`**: Array of parameters used for each page (e.g., `[0, 15, 30]`).  

```javascript
{
  pages: [
    { posts: [...], nextCursor: 15 },
    { posts: [...], nextCursor: 30 },
    { posts: [...], nextCursor: null },
  ],
  pageParams: [0, 15, 30]
}
```

---

### **5. Pagination Strategies**  

#### **Cursor-Based Pagination**  

- **Usage**: APIs return a cursor (e.g., `nextCursor: 15`) for the next page.  
- **Implementation**:  

  ```javascript
  getNextPageParam: (lastPage) => lastPage.nextCursor,
  ```

#### **Offset-Based Pagination**  

- **Usage**: Track page numbers (e.g., `/posts?page=1`).  
- **Implementation**:  

  ```javascript
  getNextPageParam: (lastPage, allPages) => allPages.length + 1,
  ```

---

### **6. Performance Optimizations**  

1. **Prefetch Pages**: Load the next page in advance.  
2. **`keepPreviousData`**: Retain old data during transitions to avoid UI flicker.  
3. **`staleTime`**: Control how quickly data refetches (e.g., `staleTime: 60_000`).  
4. **Virtualization**: Use libraries like `react-virtual` to render only visible items.  

---

### **7. Example: Full Infinite Scroll**  

```javascript
function InfiniteFeed() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
  });

  const posts = data?.pages.flatMap((page) => page.posts) || [];

  // Auto-fetch on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage]);

  return (
    <div>
      {posts.map((post) => (
        <Post key={post.id} post={post} />
      ))}
      {isFetchingNextPage && <LoadingSpinner />}
    </div>
  );
}
```

---

### **8. Key Return Values**  

| Property               | Description                                                                 |  
|------------------------|-----------------------------------------------------------------------------|  
| **`fetchNextPage`**    | Function to load the next page.                                             |  
| **`fetchPreviousPage`** | Function to load the previous page (bidirectional pagination).             |  
| **`hasNextPage`**      | Boolean indicating if more pages exist (based on `getNextPageParam`).      |  
| **`hasPreviousPage`**  | Boolean indicating if previous pages exist (bidirectional pagination).     |  
| **`isFetchingNextPage`** | True when the next page is being fetched.                                  |  

---

### **9. Common Pitfalls**  

- **Missing `initialPageParam`**: Required in React Query v5+ for initial page.  
- **Over-fetching**: Ensure `hasNextPage` is checked before calling `fetchNextPage()`.  
- **Memory Leaks**: Clean up scroll listeners when components unmount.  

---

### **10. Best Practices**  

- **Debounce Scroll Events**: Prevent rapid consecutive fetches.  
- **Error Handling**: Retry failed pages with `retry` and `retryDelay`.  
- **SSR/SSG**: Prefetch initial pages server-side using `initialData`.  

---

By leveraging `useInfiniteQuery`, you can build performant infinite scroll UIs with minimal boilerplate, while React Query handles caching, deduplication, and pagination state under the hood. 🚀

## Managing Mutations

### **In-Depth Explanation of Mutations in React Query**

Mutations in React Query are **operations that modify server-side data**, such as creating, updating, or deleting resources (e.g., `POST`, `PUT`, `PATCH`, `DELETE` requests). Unlike queries (which fetch data), mutations are designed for write operations and provide tools to handle side effects, optimistic updates, and synchronization with cached data.

---

### **1. What Are Mutations?**  

- **Purpose**: Perform write operations on the server (e.g., submitting a form, updating a user profile).  
- **Key Features**:  
  - **Optimistic Updates**: Reflect changes in the UI before the server confirms them.  
  - **Automatic Retries**: Retry failed mutations.  
  - **Side Effect Management**: Invalidate cached data or update the cache after a mutation.  
- **Lifecycle Hooks**: Track the mutation's progress (`onMutate`, `onSuccess`, `onError`, `onSettled`).  

---

### **2. Core Concepts**  

#### **`useMutation` Hook**  

The primary API for mutations. It returns:  

- **`mutate`**: Function to trigger the mutation.  
- **`mutateAsync`**: Promise-based version of `mutate`.  
- **State Variables**:  
  - `isPending`: True while the mutation is in progress.  
  - `isError`/`isSuccess`: Status after completion.  
  - `data`: Response from the successful mutation.  
  - `error`: Error object if the mutation fails.  

```javascript
import { useMutation } from '@tanstack/react-query';

const addTodo = async (newTodo) => {
  const response = await axios.post('/api/todos', newTodo);
  return response.data;
};

function TodoForm() {
  const { mutate, isPending, isError } = useMutation({
    mutationFn: addTodo,
    onSuccess: () => {
      // Handle success (e.g., invalidate todos query)
    },
    onError: (error) => {
      // Handle error (e.g., show toast)
    },
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      mutate({ text: e.target.todo.value });
    }}>
      <input name="todo" />
      <button disabled={isPending}>
        {isPending ? 'Adding...' : 'Add Todo'}
      </button>
    </form>
  );
}
```

---

### **3. Mutation Lifecycle**  

React Query provides hooks to tap into the mutation lifecycle:  

| Lifecycle Hook  | Trigger                                              | Use Case                                                                 |  
|-----------------|------------------------------------------------------|--------------------------------------------------------------------------|  
| **`onMutate`**  | Before the mutation executes.                        | Capture current state for optimistic updates.                           |  
| **`onSuccess`** | After the mutation succeeds.                         | Invalidate related queries or update the cache.                         |  
| **`onError`**   | After the mutation fails.                            | Roll back optimistic updates or show error messages.                    |  
| **`onSettled`** | After the mutation succeeds or fails (finally block).| Perform cleanup or analytics.                                           |  

---

### **4. Optimistic Updates**  

Update the UI optimistically before the server confirms the change. If the mutation fails, roll back:  

```javascript
const queryClient = useQueryClient();

const { mutate } = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    // Cancel ongoing queries for the todos list
    await queryClient.cancelQueries({ queryKey: ['todos'] });

    // Snapshot previous todos
    const previousTodos = queryClient.getQueryData(['todos']);

    // Optimistically update the cache
    queryClient.setQueryData(['todos'], (old) => [...old, newTodo]);

    // Return context for rollback on error
    return { previousTodos };
  },
  onError: (error, newTodo, context) => {
    // Roll back to previous state
    queryClient.setQueryData(['todos'], context.previousTodos);
  },
  onSettled: () => {
    // Ensure fresh data after mutation
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
```

---

### **5. Invalidation vs. Direct Cache Updates**  

After a mutation, you can either:  

1. **Invalidate Queries**:  

   ```javascript
   queryClient.invalidateQueries({ queryKey: ['todos'] });
   ```  

   - Triggers a background refetch of the `todos` query.  
   - Use when the server state is complex or frequently updated.  

2. **Update the Cache Directly**:  

   ```javascript
   queryClient.setQueryData(['todos'], (old) => [...old, newTodo]);
   ```  

   - Immediately update the cache without refetching.  
   - Use for simple, client-predictable changes.  

---

### **6. Advanced Patterns**  

#### **Dependent Mutations**  

Chain mutations or queries after a mutation succeeds:  

```javascript
const { mutate: createUser } = useMutation({
  mutationFn: postUser,
  onSuccess: (data) => {
    // Fetch user details after creation
    queryClient.fetchQuery({
      queryKey: ['user', data.id],
      queryFn: () => fetchUser(data.id),
    });
  },
});
```

#### **Batched Mutations**  

Group multiple mutations and handle them together:  

```javascript
const { mutate: batchUpdate } = useMutation({
  mutationFn: (updates) => Promise.all(updates.map(updateTodo)),
});
```

---

### **7. Best Practices**  

1. **Optimistic Updates**: Use `onMutate` and `onError` for smooth UI transitions.  
2. **Error Handling**: Provide user feedback via toasts or alerts.  
3. **Retry Logic**: Configure `retry` and `retryDelay` for transient errors.  
4. **Cleanup**: Use `onSettled` to reset forms or close modals.  

---

### **8. Mutation vs. Query**  

| Feature               | Query (`useQuery`)          | Mutation (`useMutation`)       |  
|-----------------------|-----------------------------|---------------------------------|  
| **Purpose**           | Read data (GET).            | Write data (POST, PUT, DELETE). |  
| **Caching**           | Cached by default.          | Not cached.                     |  
| **Automatic Triggers**| Runs automatically.         | Triggered manually (`mutate`).  |  
| **Retries**           | Yes (configurable).         | Yes (configurable).             |  

---

### **9. Real-World Example**  

```javascript
function EditProfile() {
  const { mutate, isPending } = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      // Invalidate profile query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated!');
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  return (
    <Form onSubmit={(data) => mutate(data)}>
      <Input name="name" />
      <Button disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </Button>
    </Form>
  );
}
```

---

### **Summary**  

React Query’s mutation system simplifies complex write operations by:  

- Managing asynchronous logic and state.  
- Supporting optimistic updates and error rollbacks.  
- Seamlessly integrating with cached queries.  

By leveraging `useMutation`, you can build resilient, user-friendly interfaces that handle server-state changes efficiently. 🚀

## Fuzzy query key matching

### **Query Key Invalidation & Fuzzy Matching in React Query**

In React Query, **query keys** uniquely identify cached data. Invalidating these keys allows you to mark data as stale, triggering automatic refetches to keep your UI in sync with the server. **Fuzzy key matching** enables bulk invalidation of queries that share partial key structures, reducing boilerplate and ensuring consistency.

---

### **1. Query Key Invalidation Basics**  

Use `queryClient.invalidateQueries()` to mark cached data as stale and force refetches.  

```javascript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

// Invalidate all queries with the key ['todos']
queryClient.invalidateQueries({ queryKey: ['todos'] });
```

---

### **2. Exact vs. Fuzzy Matching**  

By default, `invalidateQueries` uses **fuzzy (partial) matching**. Add `exact: true` for exact matches.  

| Scenario                | Code Example                                      | Matches                                      |  
|-------------------------|--------------------------------------------------|----------------------------------------------|  
| **Exact Match**         | `invalidateQueries({ queryKey: ['todos'], exact: true })` | Only `['todos']` (no subkeys).               |  
| **Fuzzy Match** (Default)| `invalidateQueries({ queryKey: ['todos'] })`      | All keys starting with `['todos']` (e.g., `['todos', 'list']`, `['todos', 1]`). |  

---

### **3. Fuzzy Key Matching in Action**  

#### **Example 1: Invalidate All Todos**  

Invalidate all queries related to `todos`, regardless of subkeys:  

```javascript
// Invalidates:
// - ['todos']
// - ['todos', { status: 'done' }]
// - ['todos', 1]
queryClient.invalidateQueries({ queryKey: ['todos'] });
```

#### **Example 2: Invalidate Nested Keys**  

Invalidate all user-related queries for a specific `userId`:  

```javascript
// Invalidates:
// - ['user', 1, 'profile']
// - ['user', 1, 'posts']
queryClient.invalidateQueries({ queryKey: ['user', userId] });
```

---

### **4. Advanced Invalidation with Predicates**  

For complex scenarios, use a `predicate` function to filter queries:  

```javascript
// Invalidate all todos that are marked as stale
queryClient.invalidateQueries({
  predicate: (query) =>
    query.queryKey[0] === 'todos' && query.isStale(),
});

// Invalidate all queries with a numeric ID in the key
queryClient.invalidateQueries({
  predicate: (query) =>
    typeof query.queryKey[1] === 'number',
});
```

---

### **5. Key Structure Best Practices**  

Design query keys hierarchically to leverage fuzzy matching:  

```javascript
// Good: Hierarchical keys for easy invalidation
['todos', 'list', { status: 'active' }]
['todos', 'detail', 1]

// Bad: Unstructured keys complicate fuzzy matching
['todos-active-list']
['todo-detail-1']
```

---

### **6. Use Cases for Fuzzy Matching**  

1. **After Mutations**: Invalidate all related queries when data changes.  

   ```javascript
   // After deleting a todo, invalidate all todo lists
   queryClient.invalidateQueries({ queryKey: ['todos'] });
   ```

2. **Bulk Updates**: Refresh all entries of a type (e.g., all `posts`).  
3. **Multi-Tab Apps**: Sync data across components with similar keys.  

---

### **7. Avoiding Over-Invalidation**  

- Use `exact: true` when targeting specific queries.  
- Avoid overly broad keys (e.g., `['data']`).  
- Prefer granular keys for independent data segments.  

---

### **8. How Invalidation Works**  

- **Stale Data**: Invalidated queries are marked stale.  
- **Refetching**: If the query is active (used in a mounted component), it refetches automatically.  
- **Cache Retention**: Invalidated data stays cached until garbage-collected (`cacheTime`).  

---

### **9. Example: Todo App Workflow**  

```javascript
function useDeleteTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTodo,
    onSuccess: () => {
      // Invalidate all todo-related queries
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      // Exact match for a single todo detail
      queryClient.invalidateQueries({
        queryKey: ['todo', id],
        exact: true,
      });
    },
  });
}
```

---

### **Key Takeaways**  

1. **Fuzzy Matching** simplifies bulk operations by targeting partial keys.  
2. **Exact Matching** ensures precision for unique keys.  
3. **Predicates** offer fine-grained control for complex scenarios.  
4. **Key Design** is critical for efficient invalidation.  

By mastering these concepts, you can keep your cached data fresh with minimal code! 🚀
