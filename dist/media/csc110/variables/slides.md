# Variables

![](img/get.png)

![](img/set.png)

![](img/change.png)

<!--
Notes:
- Draw a square manually, show challenge with resizing
- Repeat slide
- Show how to make a repeat square
- Visible step to show how it works
- Modify task to triangle
- Show code after repeat
- Quiz
-->

---
## Variables

Variables allow the computer to remember things like:

* How many sides should the shape have?
* What is the player's name?
* What are the (x, y) coordinates of the button on the screen?

A computer can **store** a value in a variable, **get** the current value, or **modify** the value.

---
## Variable Blocks

These are the primary blocks used with variables

* ![](img/set.png) **Sets** a variable to the given value (e.g. 0)
* ![](img/change.png) **Changes** a variable, increasing its value by the input (or decreasing if negative)
* ![](img/get.png) **Uses** the variable in another block.

---
## Types of Data

Variables can store different types of data:

* A number: `5`, `0`, `-2`, `7.3`
* Some text: `"Hello, World!"`, `"Goodbye"`
* A "boolean" value: `true` or `false`
* A list of other data: `[1, 2, 3]` or `["A", "B", "C"]`


---
<!-- .slide: id="triangle" -->
## Modify: Make a Triangle

**Goal**: Modify the current code so that it draws a *triangle* instead of a square:

![](img/triangle.png)

<div class="quiz">

[Hints](#/triangle-hint)

</div>

v---v
<!-- .slide: id="triangle-hint" -->
## Hints

* You will need to change two blocks' *inputs*, but not the structure of the code.
* After drawing the 3 sides of a triangle, the Sprite should have turned 360 degrees. How much should it turn each time?

[Back](#/triangle)




---
<!-- .slide: id="q1" -->
## Knowledge Check: Repeat
What will the following code say when it runs?

<div class="container">

<div class="col">

![](img/q1.png)

</div>

<div class="col quiz">

[A) One Two Three Four](#/a)

[B) One Two Three Four One Two Three Four](#/b)

[C) One Two Two Three Three Four](#/c)

[D) One Two Three Two Three Four](#/d)

</div>
</div>

v---v
<!-- .slide: id="a" -->
## A

Incorrect: Remember, the `Repeat` block causes the code inside of it to run multiple times.

[Try again?](#/q1)

v---v
<!-- .slide: id="b" -->
## B

Incorrect: Remember, the `Repeat` block only affects code inside of it.

[Try again?](#/q1)

v---v
<!-- .slide: id="c" -->
## C

Incorrect: Remember, the `Repeat` runs the code inside of it *in order*!

[Try again?](#/q1)

v---v
<!-- .slide: id="d" data-background-color="#3333aa" -->
## D

Correct! Only the code inside of the loop gets repeated.

<button class="navigate-right btn btn-success">Continue</button>


---
<!-- .slide: id="q1-finished" data-state="q-finished" -->
## Good job!