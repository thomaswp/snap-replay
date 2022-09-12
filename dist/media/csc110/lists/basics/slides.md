# Lists
<!--
Notes:

-->
---
## List Indexes
Each item in the list has an **index**, starting at 1.

![](img/list.png)

* The item at **index 2** is **b**.
* The **index of a** in the list is 1.


---
## Indexes Change

If I insert "Kiwi" at index 2...

1. Apple
2. Banana
3. Cherry

---
## Indexes Change

... Banana and Cherry shift down, and their index increases (to 3 / 4).

1. Apple
2. Kiwi
3. Banana
4. Cherry

---
## Indexes Change

If I delete "Banana" at index 3...

1. Apple
2. Kiwi
3. Banana
4. Cherry

---
## Indexes Change

... Cherry will shift up, and its index goes down (to 3).

1. Apple
2. Kiwi
3. Cherry


---
## List Blocks: Reporters

To read information about lists, we use these **reporter** blocks:

* ![](img/list.png) <br/> **Creates** a new list with the given items: [a, b, c].
* ![](img/item.png) <br/> Gets the **list item** at the given index: a.
* ![](img/length.png) <br/> Gets the **length** of the given list: 3.


---
## List Blocks: Commands

To read information about lists, we use these **reporter** blocks:

* ![](img/set.png) <br/> **Sets** `my list` to the list [a, b, c].
* ![](img/add.png) <br/> **Adds** a new item to the end of the list: [a, b, c, d].
* ![](img/delete.png) <br/> **Deletes** the item in the list at the given index: [a, c, d].
* ![](img/insert.png) <br/> **Inserts** the item in the list at the given index, pushing other items to the right: [x, a, c, d].


---
<!-- .slide: id="q1" -->
## Knowledge Check: Lists
What will the sprite say after this code is run?

<div class="container">

<div class="col">

![](img/q1.png)

</div>

<div class="col quiz">

[A) b, c](#/a)

[B) c, d](#/b)

[C) c, c](#/c)

[D) d, nothing](#/d)

</div>
</div>

v---v
<!-- .slide: id="a" -->
## A

Incorrect: Remember, items are added to the *end* of a list.

[Try again?](#/q1)

v---v
<!-- .slide: id="b" data-background-color="#3333aa" -->
## B

Correct: c is the third item in the list until b is deleted; then it's d.

<button class="navigate-right btn btn-success">Continue</button>

v---v
<!-- .slide: id="c" -->
## C

Incorrect: Remember, when an item (e.g. #2) is deleted, all items after it (e.g. c) shift to the left, and their index changes.

[Try again?](#/q1)

v---v
<!-- .slide: id="d" -->
## D

Incorrect: Remember that in Snap, indexes start at 1, so the third item to start with is c, not d.

[Try again?](#/q1)

---
<!-- .slide: id="q1-finished" data-state="q-finished" -->
## Good job!

<div class="container">
<div class="col">

![](img/q1.png)

</div>

<div class="col">

| Repeat | `value` | `total` |
| ------ | ------- | ------- |
| before | 5       | 0       |
| 1      | 4       | 4       |
| 2      | 3       | 7       |
| 3      | 2       | 9       |
| after  | 2       | 9       |

</div>
</div>




---
<!-- .slide: id="average" -->
## Modify: Average

**Goal**: Create a new variable, `count`, that counts the number of times
the user has entered a number. Then, after the user has said 'stop',
say the average of all the numbers.

Example: If the user says `4`, `2`, `5`, `3`, `stop` the sprite should say:

> Average: 3.5

<div class="quiz">

[Hints](#/average-hint)

</div>

v---v
<!-- .slide: id="average-hint" -->
## Hints

Follow the variable + loop recipe:

1. **Create** the variable and give it a descriptive name: "count"
2. **Initialize** the variable to a starting value **before the loop**: 0
3. **Change** the variable value when appropriate **inside the loop**: add 1
4. **Use** the variable value in your code, **after** the loop: say the average (sum / count)

[Back](#/average)

