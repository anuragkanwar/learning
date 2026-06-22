Let's build the mental model for Subqueries! Since you already understand `GROUP BY`, `HAVING`, and `JOINs`, subqueries will actually feel very familiar.

### The Mental Model: "The Preliminary Researcher"

Imagine you are the Head Detective (the Main Query). You are trying to solve a case, but you realize you are missing a crucial piece of information. 

Instead of doing all the work yourself, you send a Junior Detective (the Subquery) to go fetch that specific piece of information. The Junior Detective goes off, does their research, comes back, and hands you a result. You then take that result and continue your main investigation.

**In SQL terms:** A subquery is just a `SELECT` statement hidden inside another `SELECT` statement. It is a query inside a query. 

The golden rule is: **The subquery must execute completely first.** Once it finishes, it hands its result over to the main query. 


### Where can the Junior Detective go? (The 3 Types of Subqueries)

Depending on where you put the subquery, it behaves slightly differently. Let's look at the three main places you'll use them.

#### 1. The Subquery in the `WHERE` clause (The Filter)
This is the most common use. You use a subquery when you want to filter your main query, but you don't know the exact values to filter by ahead of time.

**Scenario:** You want to find all books whose price is higher than the *average* price of all books.

If you try to write this normally, you get stuck:
```sql
SELECT title, price FROM books WHERE price > AVG(price); 
-- ERROR! You cannot put an aggregate function directly in a WHERE clause.
```

**The Subquery Solution:** Send the Junior Detective to find the average price first.
```sql
SELECT title, price 
FROM books 
WHERE price > (
    SELECT AVG(price) FROM books
);
```
* **The Main Query:** "Give me titles and prices where price is greater than X."
* **The Subquery (in parentheses):** "Go calculate X for me."
* **Mental Model:** The database runs the bottom query first, gets a number (let's say $15.00). It then invisibly replaces the parentheses with `15.00`. The main query effectively becomes `WHERE price > 15.00`.

#### 2. The Subquery in the `FROM` clause (The Derived Table)
Remember how your mental model for `GROUP BY` is "buckets and calculators"? What if you want to run a `GROUP BY` once, and then run a *second* `GROUP BY` or `JOIN` on those results? 

You can't group by a group. So, you wrap the first group in parentheses, give it a nickname, and pretend it's a brand new table.

**Scenario:** You want to find the average of the departmental total salaries. (Step 1: Sum salaries by department. Step 2: Average those sums).

```sql
SELECT AVG(dept_total)
FROM (
    SELECT department, SUM(salary) AS dept_total
    FROM employees
    GROUP BY department
) AS dept_buckets;
```
* **The Main Query:** "Average the `dept_total` column."
* **The Subquery:** "Create a temporary, invisible table called `dept_buckets` that holds the sum of salaries for each department."
* **Mental Model:** The subquery literally creates a temporary table in the database's memory. The main query has no idea it's a subquery; it just thinks it's querying a normal table named `dept_buckets`. (Note: You *must* give it an alias, like `AS dept_buckets`, so the main query has a name to call it).

#### 3. The Subquery in the `SELECT` clause (The Calculated Column)
Sometimes you want to return your normal rows, but attach a specific calculated value to every single row that requires its own separate query.

**Scenario:** For every book, show its title, price, and how much *more* expensive it is compared to the absolute cheapest book in the database.

```sql
SELECT 
    title, 
    price,
    price - (SELECT MIN(price) FROM books) AS price_difference
FROM books;
```
* **Mental Model:** For every single row the main query outputs, it pauses, asks the Junior Detective "What's the minimum price?", gets the answer, does the math, and attaches it to the row.

### Do you need to learn anything else about Subqueries?

Yes, there is **one massive concept** you need to be aware of, which directly leads into why CTEs (which we will do next) are so popular. 

**Correlated vs. Non-Correlated Subqueries**

1. **Non-Correlated (The Independent Researcher):** 
   The examples above are non-correlated. The Junior Detective doesn't care what the Head Detective is doing. They run their query once, get a single result (or list), hand it over, and they are done. They are fast and efficient.

2. **Correlated (The Dependent Researcher):**
   This is when the subquery *depends* on the specific row the main query is currently looking at. 
   **Example:** "Give me all books where the price is greater than the average price of books *in that specific author's genre*."
   
   ```sql
   SELECT title, price, author_id
   FROM books b1
   WHERE price > (
       SELECT AVG(price) 
       FROM books b2 
       WHERE b2.author_id = b1.author_id
   );
   ```
   
   **Mental Model for Correlated Subqueries:** 
   The main query looks at Book 1 (by Author A). It pauses. It tells the Junior Detective: "Go find the average price for Author A." The subquery runs, comes back with $20. The main query checks if Book 1 is > $20. 
   Then the main query moves to Book 2 (by Author B). It pauses. It tells the Junior Detective: "Go find the average price for Author B." 
   *This means the subquery runs over and over again for every single row.* It is incredibly powerful, but it can be very slow on large tables.

### Summary Checklist for Subqueries:
1. It's a query inside a query, wrapped in `( )`.
2. It always executes before the main query can finish.
3. In `WHERE`: Used to dynamically find filtering values (like finding the AVG first).
4. In `FROM`: Used to create a temporary table you can query or join onto.
5. In `SELECT`: Used to attach a calculated value to each row.
6. **Correlated Subqueries:** The subquery references the outer query and runs row-by-row (use with caution for performance!).

