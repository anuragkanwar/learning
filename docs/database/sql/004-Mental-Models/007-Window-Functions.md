You are in for a treat. Window functions are the **final boss of SQL**. Once you understand them, you go from being a "beginner" to a "pro" in the eyes of any interviewer. 

The reason you don't have a clue about them is because they do something that completely breaks the rules of `GROUP BY`.

### The Mental Model: "The Sticky Note" (Group By vs. Window)

Remember the golden rule of `GROUP BY`? *If you use an aggregate function like SUM(), the database crushes multiple rows down into one single row.* You lose the individual details.

**Window functions do not crush rows.** 

Imagine you are looking at a spreadsheet of employees. You want to know the total salary of their department, but you *also* want to see their individual name and salary on the same row.

*   **The `GROUP BY` way:** You crush the IT department into one row. `IT | $300,000`. You can't see the individual employees anymore.
*   **The Window Function way:** The database looks at the IT department, calculates the total ($300,000), writes that number on a **Sticky Note**, and slaps that sticky note onto *every single IT employee's row*.

**Mental Model:** A window function performs a calculation across a set of rows (the "window"), but instead of collapsing those rows into one, it **attaches the result to the original row** like a sticky note.

### The Anatomy of a Window Function: `OVER()`

Every window function has a special keyword at the end: `OVER()`. This is the literal "window" the function is looking through. 

Let's look at the syntax:
```sql
SELECT 
    name,
    department,
    salary,
    SUM(salary) OVER (PARTITION BY department) AS dept_total
FROM employees;
```

*   **`PARTITION BY`**: This is the `GROUP BY` of the window world. It tells the database how to build the buckets. "Partition the data by department."
*   **The Execution:** The database creates a bucket for IT. It calculates the sum ($300,000). But instead of returning one row, it attaches $300,000 to Alice's row, Bob's row, and Charlie's row. Then it moves to the HR bucket and does the same.

### The 3 Types of Window Functions (RANK, LAG, LEAD)

Now let's look at the specific functions you asked about. These are special because they don't just calculate totals; they look at the **order** of rows.

For these to work, we must add an `ORDER BY` *inside* the `OVER()` clause. This tells the sticky note maker: "Line up the rows in this specific order before you start writing notes."

#### 1. `RANK()` (The Podium)
*   **What it does:** Ranks rows based on a specific value, like a leaderboard.
*   **Scenario:** You want to rank employees by salary within their department.
```sql
SELECT 
    name,
    department,
    salary,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) as salary_rank
FROM employees;
```
*   **Mental Model:** The database partitions the data by department. Then, within the IT department, it lines everyone up from highest salary to lowest. It gives the top person a sticky note saying "1", the next person "2", etc. (If two people tie for 1st, they both get "1", and the next person gets "3"—just like the Olympics).
*   *(Note: `ROW_NUMBER()` is similar, but it just counts 1, 2, 3 strictly, even if there are ties).*

#### 2. `LAG()` (The Rearview Mirror)
*   **What it does:** Lets you look at the **previous row's** data and pull it onto the current row.
*   **Scenario:** You have a table of daily stock prices. You want to see today's price and yesterday's price on the same row to calculate the daily change.
```sql
SELECT 
    date,
    stock_price,
    LAG(stock_price, 1) OVER (ORDER BY date) as prev_day_price
FROM stocks;
```
*   **Mental Model:** The database lines up all the rows by date. For the current row, it reaches backward to the previous row, copies the stock price, and puts it on a sticky note for the current row. (The `1` means "look back 1 row". The very first row in the table has no previous row, so it gets a `NULL` sticky note).

#### 3. `LEAD()` (The Crystal Ball)
*   **What it does:** The exact opposite of `LAG()`. It lets you look at the **next row's** data.
*   **Scenario:** You want to know what tomorrow's stock price is, today.
```sql
SELECT 
    date,
    stock_price,
    LEAD(stock_price, 1) OVER (ORDER BY date) as next_day_price
FROM stocks;
```
*   **Mental Model:** The database lines up the rows. For the current row, it reaches *forward* to the next row, copies the stock price, and attaches it to the current row. (The very last row in the table gets a `NULL` sticky note because there is no "next" row).

### Do you need to know anything else?

Yes, just two quick things to complete the picture:

**1. The "Running Total" trick (Advanced ORDER BY)**
If you put an `ORDER BY` *inside* an aggregate function like `SUM()`, it changes its behavior. It no longer calculates the total for the whole bucket. It calculates a **running total**.
```sql
-- This gives a running total of sales over time!
SUM(sales) OVER (ORDER BY date) 
```
*Mental Model:* As it goes down the rows, it adds the current row's sales to the sticky note. So row 1 has 100. Row 2 has 250 (100+150). Row 3 has 400 (250+50).

**2. Why they are called "Window"**
The "window" is literally the frame of rows the function can "see" at any given moment. `PARTITION BY` builds walls so you can't see other departments. `ORDER BY` defines whether you look backward (`LAG`) or forward (`LEAD`).

### Summary Checklist:
1.  **Rule 1:** Window functions never delete or crush rows. They just add a "sticky note" column to your existing rows.
2.  **Rule 2:** `OVER()` is mandatory. It's the engine that makes it a window function.
3.  **`PARTITION BY`**: Builds the buckets (like Group By).
4.  **`RANK()`**: Writes the position (1st, 2nd, 3rd) on the sticky note.
5.  **`LAG()`**: Copies a value from the *previous* row to the sticky note.
6.  **`LEAD()`**: Copies a value from the *next* row to the sticky note.


Now that you have the "Glass Walls" and "Sticky Note" mental model locked in, learning the rest of the window functions is incredibly easy. 

You don't need to learn new concepts; you just need to learn **what new tool writes on the sticky note.** 

Here are the other most useful window functions in PostgreSQL, broken down by what they do.

### 1. The Ranking Family (Cousins of `RANK()`)
These are used when you line up rows in order (using `ORDER BY` inside `OVER()`) and need to number them. 

*   **`ROW_NUMBER()` — The Ticket Dispenser**
    *   **What it does:** Just counts rows 1, 2, 3, 4. It doesn't care about ties. 
    *   **Mental Model:** Like pulling a number at a deli counter. Even if two people arrive at the exact same millisecond, one gets ticket #1 and the other gets ticket #2.
*   **`DENSE_RANK()` — The Packed Leaderboard**
    *   **What it does:** Ranks rows, but unlike `RANK()`, it leaves **no gaps** in the numbers when there are ties.
    *   **Mental Model:** A golf leaderboard. If three players tie for 1st place, they all get a "1". The *next* player gets a "2" (because they are in 2nd place). 
    *   *(Reminder: Standard `RANK()` would give the next player a "4" because it skips 2 and 3).*
*   **`NTILE(n)` — The Slicer**
    *   **What it does:** Divides your sorted rows into `n` equal buckets and tells you which bucket the row belongs to (1, 2, 3...).
    *   **Mental Model:** You have 100 employees and you want to split them into 4 quartiles based on salary. `NTILE(4)` writes "1" on the top 25%, "2" on the next 25%, etc. Great for finding the "Top 25% earners" vs "Bottom 25% earners".

### 2. The Value Family (Cousins of `LAG()` and `LEAD()`)
Instead of looking 1 row back or 1 row forward, these functions let you grab a value from a very specific spot in your "glass room".

*   **`FIRST_VALUE()` — The Front Desk**
    *   **What it does:** Grabs a value from the very first row in your partition/window.
    *   **Mental Model:** You line up everyone in the IT department by salary (highest to lowest). `FIRST_VALUE(salary)` writes the highest salary onto everyone's sticky note. Now everyone can instantly compare their own salary to the top earner.
*   **`LAST_VALUE()` — The Back Desk**
    *   **What it does:** Grabs a value from the very last row in your window.
    *   *Warning/Pro-Tip:* To make `LAST_VALUE` work correctly, you usually have to add `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` to your `OVER()` clause. By default, SQL's "window" only looks up to the *current row*. You have to explicitly tell it to look all the way to the end of the room.
*   **`NTH_VALUE(x, n)` — The Target Sniper**
    *   **What it does:** Grabs the value of the *nth* row. 
    *   **Mental Model:** "Write the salary of the 3rd highest paid IT employee on everyone's sticky note." `NTH_VALUE(salary, 3)`.

### 3. The Aggregate Family (The Calculators)
You already know `SUM()`, `AVG()`, `MAX()`, `MIN()`, and `COUNT()`. In PostgreSQL, **every single one of these can be used as a window function** just by slapping `OVER()` on the end.

*   **`MAX()` / `MIN()` — The Highlighter**
    *   `MAX(salary) OVER (PARTITION BY department)`
    *   **Mental Model:** Finds the highest salary in the glass room and writes it on the sticky note. Great for comparing individual performance to the department peak.
*   **`COUNT()` — The Tally Counter**
    *   `COUNT(*) OVER (PARTITION BY department)`
    *   **Mental Model:** Counts how many people are in the glass room and writes "10" on everyone's sticky note. (This is a very common trick to get a "Total Headcount" column alongside individual employee data).

### 4. The Percentile Family (Advanced, but good to know)
PostgreSQL has special functions for statistical analysis.

*   **`PERCENT_RANK()` — The Standing**
    *   **What it does:** Gives you a percentage (from 0.0 to 1.0) of where a row ranks compared to its peers.
    *   **Mental Model:** If your `PERCENT_RANK()` is 0.90, it means your salary is higher than 90% of the people in your department. 
*   **`CUME_DIST()` — The Threshold**
    *   **What it does:** Similar to `PERCENT_RANK`, but answers: "What percentage of people make *this amount or less*?"

### The "Frame" Concept (The Final Puzzle Piece)

There is one last feature of window functions you should know exists: **Window Frames**.

Right now, your glass room looks at the *entire* department. But you can put a sliding magnifying glass inside the room using `ROWS BETWEEN`. 

**Example:** A 3-month rolling average.
```sql
AVG(sales) OVER (
    ORDER BY month 
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
)
```
**Mental Model:** The calculator doesn't look at the whole year. It only looks at a sliding frame of 3 months: the current month and the 2 previous months. As it moves down the rows, the frame slides along with it.

### Summary Checklist:
1.  **Rankings:** `ROW_NUMBER` (no ties), `DENSE_RANK` (no gaps), `NTILE` (buckets).
2.  **Values:** `FIRST_VALUE`, `LAST_VALUE`, `NTH_VALUE` (grabbing specific rows).
3.  **Aggregates:** `MAX`, `MIN`, `COUNT`, `AVG` (all work with `OVER()`).
4.  **Frames:** `ROWS BETWEEN` (a sliding window inside your glass room).


## Mutliple Values ?

This is a fantastic question. It is a very common real-world problem. 

Let's expand your "Rearview Mirror" (`LAG`) and "Crystal Ball" (`LEAD`) mental models.

### The Mental Model: "The Single-Periscope Submarine"

Right now, your `LAG()` function is a periscope that can only look at **one specific column** in the previous row. 

If you are in a submarine and you want to see the previous row's `price`, you look through the `LAG(price)` periscope. But if you *also* want to see the previous row's `volume`, you can't look at both through the same periscope at the same time. 

**The Rule:** In standard SQL, window functions only accept **one** column as their first argument. `LAG(price, volume)` is invalid syntax.

**The Solution:** You have to build a second periscope. You just write another `LAG()` function for the second column. 

### The Standard Way (Multiple Periscopes)

If you want to fetch 3 pieces of data from the previous row, you write 3 separate `LAG()` functions. **The secret is that they must all share the exact same `OVER()` clause** so they are all looking at the exact same "previous row."

```sql
SELECT 
    date,
    ticker,
    price,
    volume,
    -- Periscope 1: Look back at price
    LAG(price, 1) OVER (ORDER BY date) AS prev_price,
    -- Periscope 2: Look back at volume
    LAG(volume, 1) OVER (ORDER BY date) AS prev_volume,
    -- Periscope 3: Look back at ticker
    LAG(ticker, 1) OVER (ORDER BY date) AS prev_ticker
FROM stocks;
```

**Output:**
| date | ticker | price | volume | prev_price | prev_volume | prev_ticker |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Mon | AAPL | 100 | 10k | NULL | NULL | NULL |
| Tue | AAPL | 105 | 12k | 100 | 10k | AAPL |
| Wed | AAPL | 102 | 8k | 105 | 12k | AAPL |

*Notice how Tue's row successfully grabbed `100`, `10k`, and `AAPL` from Monday's row. You just stacked three sticky notes onto Tuesday's row.*

### The PostgreSQL Superpower Way (The Array Periscope)

Because you are learning PostgreSQL specifically, I have to show you a cool trick. Postgres allows you to group multiple columns together into an **Array** or a **Row** before passing them into the window function. 

Instead of 3 periscopes, you package the 3 values into 1 box, look back at the box, and then unpack it.

**Using an Array:**
```sql
SELECT 
    date,
    ticker,
    price,
    volume,
    -- Package price and volume into an array, look back 1 row
    LAG(ARRAY[price, volume], 1) OVER (ORDER BY date) AS prev_row_data
FROM stocks;
```
**Output:**
| date | ticker | price | volume | prev_row_data |
| :--- | :--- | :--- | :--- | :--- |
| Mon | AAPL | 100 | 10k | NULL |
| Tue | AAPL | 105 | 12k | {100, 10000} |
| Wed | AAPL | 102 | 8k | {105, 12000} |

Now, all the previous row's data is inside a single column (`prev_row_data`) as an array! If you want to extract just the price from that array in your application code, you can use `prev_row_data[1]`.

### Summary Checklist for Multiple LAG/LEAD:
1. **Standard SQL:** You must write a separate `LAG()` or `LEAD()` for *every single column* you want to fetch.
2. **Alignment:** All of those `LAG()` functions must have the **exact same `OVER(...)` clause**. If one orders by `date` and another orders by `id`, they will be looking at different "previous rows" and your data will be misaligned.
3. **Postgres Trick:** You can use `LAG(ARRAY[col1, col2, col3])` to grab multiple columns at once into a single array sticky note.

Does the "Multiple Periscopes with the same alignment" model make sense?
