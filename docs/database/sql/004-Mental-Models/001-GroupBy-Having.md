The rule (every column in `SELECT` must either be in `GROUP BY` or have an aggregate function) is the most common stumbling block for beginners. Since you already have that down, we can build the rest of the mental model around it.

Let's visualize `GROUP BY` as a **Factory Assembly Line**. 

### The Mental Model: The Bucket & The Calculator
Imagine a conveyor belt of raw data coming towards you. 
1. **GROUP BY** is the worker who sorts the items into different **buckets** based on a label (e.g., a bucket for "Electronics", a bucket for "Clothing").
2. **Aggregate Functions** (SUM, COUNT, AVG) are the calculators applied to the *contents* inside each bucket.
3. **The Output Rule** (the one you know): When you present the final buckets to the boss, you can only show them the **label on the bucket** (the GROUP BY column) or a **calculated number** for what's inside (the aggregate). You cannot show them a single loose item from inside the bucket, because the boss only cares about the bucket summary!

Here is the "extra" stuff you need to learn to master `GROUP BY`:

### 1. The `HAVING` Clause (Filtering Buckets)
You know `WHERE` filters rows *before* they go into the buckets. But what if you want to filter the *buckets themselves* after they are made? 
* **Example:** You want to find departments where the *total* salary is greater than $100,000. You can't use `WHERE` because the total salary isn't calculated until *after* the `GROUP BY` makes the buckets.
* **Rule:** `WHERE` filters rows; `HAVING` filters groups. 
* **Mental Model:** `WHERE` is the bouncer at the door. `HAVING` is the inspector checking the buckets after they are filled.

### 2. The Logical Execution Order of SQL
This is crucial for your mental model. SQL is written in a specific order, but the database *executes* it in a different order. 
1. `FROM` / `JOIN` (Gather the raw data)
2. `WHERE` (Filter out bad rows)
3. `GROUP BY` (Sort the remaining rows into buckets)
4. `HAVING` (Throw away buckets that don't meet criteria)
5. `SELECT` (Decide what columns/calculations to actually display)
6. `ORDER BY` (Sort the final output)
7. `LIMIT` (Chop off the top X rows)

*Why this matters:* This explains *why* you cannot use a column alias created in the `SELECT` clause inside your `WHERE` or `GROUP BY` clause. The database hasn't reached the `SELECT` step yet!

### 3. Grouping by Multiple Columns (Nested Buckets)
You can group by more than one column. 
* **Example:** `GROUP BY department, job_title`
* **Mental Model:** You first create a bucket for "IT". Then, *inside* the IT bucket, you create smaller sub-buckets for "Developer" and "SysAdmin". You will get one summary row for IT-Developer, and one for IT-SysAdmin. The order of columns in `GROUP BY` dictates the hierarchy of the buckets.

### 4. Implicit Grouping (No GROUP BY clause)
If you write `SELECT SUM(salary) FROM employees;` without a `GROUP BY`, SQL treats the *entire table* as one giant bucket. You don't need a `GROUP BY` clause if your `SELECT` *only* contains aggregate functions and no raw columns.

### 5. PostgreSQL Specifics: `GROUP BY` Ordinals or Aliases
In standard SQL, you must write out the column name in `GROUP BY`. PostgreSQL gives you two cool shortcuts (though some developers avoid them for readability):
* **By Alias:** `SELECT EXTRACT(MONTH FROM order_date) AS order_month, SUM(total) FROM orders GROUP BY order_month;` (Postgres lets you group by the alias `order_month`!).
* **By Ordinal:** `SELECT department, SUM(salary) FROM employees GROUP BY 1;` (The `1` refers to the first column in the SELECT clause).

### 6. The `DISTINCT` vs `GROUP BY` overlap
If you write `SELECT DISTINCT department FROM employees;`, it returns the exact same result as `SELECT department FROM employees GROUP BY department;`. 
* **Mental Model:** `GROUP BY` without any aggregate functions is basically just a `DISTINCT` (removing duplicates). However, `GROUP BY` is much more powerful because it allows you to add aggregates.

