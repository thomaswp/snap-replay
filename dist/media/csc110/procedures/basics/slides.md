# Procedures

![](img/draw-square.png)

<!--
Notes:
-->

---
## Motivation

I know how to draw a square, but what if I wanted to draw 3 squares...

![](img/3-squares.png)


---
## Procedures

**Procedure**: In programming, a procedure is a name that we give to a series of commands that can be reused multiple times.

For example, let's give the code below a name: "draw a square"

![](img/draw-square-impl.png)


---
## Why use procedures?
Procedures are useful when we want to:
* Save time by using the same code in multiple places.
* Make our code easy to read for ourselves and others.
* Use the same code to do different variations on the same task:
   * E.g. drawing a square of size 100, size 50, size 25


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