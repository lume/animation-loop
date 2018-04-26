
animation-loop
==============

Easily make and manage animation loops.

#### `npm install animation-loop --save`

`animation-loop` lets you create animation loops that contain "animation
functions" that are called repeatedly in order to animate something. This is a
common thing that any application with animated graphics will want to do.

Basic usage
-----------

### Animation functions

In the following sample, a loop is created, and an "animation function" is
added which will be called repeatedly, in sync with the browser's render loop
(using `requestAnimationFrame` internally).

```js
import AnimationLoop from 'animation-loop'

const loop = new AnimationLoop

loop.addAnimationFn( ( deltaTime, elapsedTime ) => {

    console.log( deltaTime, elapsedTime )

})

loop.start()
```

It is useful to know the amount of time that passed since the last call of the
animation function, and sometimes also useful to know the total elapsed time.
These numbers are useful in animating properties of objects such as position,
rotation, scale, etc.

To remove an animation loop, there are a few ways to do it.

#### Return `false`

Just return `false` from an animation function to remove it from the loop.

In this sample, the `console.log` outputs will stop after 5 seconds:

```js
import AnimationLoop from 'animation-loop'

const loop = new AnimationLoop

loop.addAnimationFn( ( deltaTime, elapsedTime ) => {

    console.log( deltaTime, elapsedTime )

    return !( elapsedTime > 5 )

})

loop.start()
```

#### By reference

In this sample, the `console.log` outputs will stop after 5 seconds:

```js
import AnimationLoop from 'animation-loop'

const loop = new AnimationLoop

const animationFunction = ( deltaTime, elapsedTime ) => {

    console.log( deltaTime, elapsedTime )

    if ( elapsedTime > 5 ) {
        loop.removeAnimationFn( animationFunction )
    }

}

loop.addAnimationFn( animationFunction )

loop.start()
```

### Base functions

When there are no animations, we don't want to redraw the scene, so we can keep
CPU usage at 0%. This is where "base functions" come in.

We can add base functions to the loop, and then it will only called if the loop
has existing animation functions, otherwise base functions will not be executed
if there are no animation functions, even if the base functions are not removed
from the loop.

These are useful for adding certain tasks that always need to be executed after
the tick of an animation loop, while keeping CPU usage at 0% when there are no
animation functions.

For example, if we are using Three.js for rendering, then we generally always
want to call `renderer.render(scene, camera)` after we've modified anything in
a scene.

In the following sample, we will tell our animation loop how to redraw a scene
any time that we animate something with an animation function, by adding a base
function that describes how to redraw. Suppose we have references to a Three.js
`mesh`, `scene`, `camera`, and `renderer`. We will make the `mesh` move back
and forth based on a sine wave for 5 seconds, after which the animation loop
will be removed and CPU usage will go to 0%:

```js
import AnimationLoop from 'animation-loop'

// ... create scene, mesh, camera, and renderer ...

const loop = new AnimationLoop

loop.addAnimationFn( ( deltaTime, elapsedTime ) => {

    mesh.position = 10 * Math.sin( elapsedTime )

    return !( elapsedTime > 5 )

})

loop.addBaseFn( () => {
    renderer.render(scene, camera)
})

loop.start()
```

After the animation completed, the base function was not removed: it still
remains in the loop. At a future point in time, we can add a new animation
function to animate the `mesh` again, and it will simply work, and when
finished, the animation function is removed and CPU use goes back to 0%. This
time we animation rotation:

```js
// The loop is already started, so time is still elapsing (though CPU is still at 0% use)

// ... 5 seconds have passed after the previous animation function was removed ...

loop.addAnimationFn( ( deltaTime, elapsedTime ) => {

    mesh.rotation = 10 * Math.sin( elapsedTime )

    return !( elapsedTime > 15 )

})

// no need to add the base function again, it is already added to our loop.
```

What happened overall is we created a loop, started it (it tracks time), added
the first animation function to animate `position` for 5 seconds, let 5 seconds
pass, then added another animation function to animate `rotation`. During both
animations, the base function handled redrawing of our scene. Between 5 and 10
seconds, nothing was happening so CPU use was at 0%, between 10 and 15 seconds
the second animation was in play and using CPU, and finally after 15 seconds
the second animation ended and CPU went back to 0%.

TODO
----

- [ ] Explain other parts of the API, `ChildAnimationLoop`s with child time
  frames, and usage patterns.
