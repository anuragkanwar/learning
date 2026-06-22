Let's isolate `PARTITION BY` and give it a completely different mental model. It is very common to get confused here because `PARTITION BY` feels exactly like `GROUP BY`, but there is a massive difference in what they *output*.

### The Mental Model: "The Glass Walls"

Imagine your database table as a giant warehouse floor with thousands of employee records lying on the ground. 

When you use **`PARTITION BY department`**, a giant crane comes down and drops **glass walls** to separate the employees into different rooms. 
* All the IT employees are in one glass room.
* All the HR employees are in another glass room.

Once the walls are up, the window function goes to work. **The most important rule of the glass walls is: The function cannot see through the walls.**

If you are using `SUM(salary) OVER (PARTITION BY department)`:
1. The calculator goes into the IT glass room.
2. It adds up everyone's salary in that room (let's say it's $300,000).
3. It writes "$300,000" on a sticky note and slaps it on *every single person* inside the IT room.
4. Then, it walks out, goes into the HR glass room, and does the same thing (let's say HR's total is $150,000). It slaps "$150,000" on every HR person.

**Nobody gets crushed. Nobody gets deleted.** You still see Alice, Bob, and Charlie standing in the IT room, each with their own individual salary, but they all share the same sticky note showing the IT total.

### Contrast this with `GROUP BY` (The Crusher)

To really make it click, let's look at what `GROUP BY` does to the exact same data.

If you write `SUM(salary) ... GROUP BY department`:
1. The crane drops the glass walls (just like before).
2. The calculator goes into the IT room and adds up the salaries ($300,000).
3. **Here is the difference:** The calculator takes out a giant hydraulic press and **crushes** Alice, Bob, and Charlie into a single pile of dust.
4. It molds that dust into one single row that just says: `IT | $300,000`.
5. The individual people are gone from the final result.

### Let's look at the exact same data side-by-side:

**Your Raw Table:**
| Name | Dept | Salary |
| :--- | :--- | :--- |
| Alice | IT | 100k |
| Bob | IT | 200k |
| Charlie | HR | 50k |

**What `GROUP BY Dept` outputs (The Crusher):**
*Notice how the names vanish because the rows were destroyed.*
| Dept | Total Salary |
| :--- | :--- |
| IT | 300k |
| HR | 50k |

**What `PARTITION BY Dept` outputs (The Glass Walls):**
*Notice how the names stay, but the total is attached to them.*
| Name | Dept | Salary | Dept Total (Sticky Note) |
| :--- | :--- | :--- | :--- |
| Alice | IT | 100k | 300k |
| Bob | IT | 200k | 300k |
| Charlie | HR | 50k | 50k |

### What happens if you DON'T use `PARTITION BY`?

This is the final piece of the puzzle. What if you just write:
`SUM(salary) OVER ()` 
*(Notice the empty parentheses)*

**Mental Model:** The crane simply doesn't drop any glass walls. There are no partitions. The calculator looks at the entire warehouse floor as one giant room. It adds up the salary of *every single person in the whole company* and slaps that grand total onto every single row.

| Name | Dept | Salary | Company Total (Sticky Note) |
| :--- | :--- | :--- | :--- |
| Alice | IT | 100k | 350k |
| Bob | IT | 200k | 350k |
| Charlie | HR | 50k | 350k |

### Summary
*   **`GROUP BY`** = Crushes rows into a single summary row.
*   **`PARTITION BY`** = Builds glass walls. Calculates a summary for that wall, but leaves the original rows perfectly intact.
*   **No Partition (`OVER ()`)** = No walls. Looks at the whole table.

Does the "Glass Walls vs. The Crusher" analogy help separate `PARTITION BY` from `GROUP BY`?
