import { Clock } from 'three'

import Privates from './Privates'
const _ = new Privates()

export
class AnimationLoop {

  constructor() {

    // `_(this)` gives us access private properties (in the same sense as
    // private members in C++) of this AnimationLoop instance, without leaking
    // memory, and while still being able to use the properties across class
    // methods unlike closure-based private properties inside constructors.
    const self = _(this)

    self.animationFnsBefore = new Set()
    self.animationFns = new Set()
    self.animationFnsAfter = new Set()
    self.baseFns = new Set()
    self.animationFrame = null

    self.elapsed = 0
    self.clock = new Clock()

    self.started = false
    self.paused = false

    self.childLoops = new Set()
  }

  // read-only
  get elapsed() { return _(this).elapsed }
  get started() { return _(this).started }
  get paused() { return _(this).paused }

  addAnimationFnBefore(fn) {
    const self = _(this)
    if (typeof fn === 'function') self.animationFnsBefore.add(fn)
    return fn
  }

  removeAnimationFnBefore(fn) {
    const self = _(this)
    self.animationFnsBefore.delete(fn)
  }

  // animation functions are called repeatedly while they are added to an
  // AnimationLoop instance. They must be removed in order to stop them from
  // being called repeatedly.
  addAnimationFn(fn) {
    const self = _(this)
    if (typeof fn === 'function') self.animationFns.add(fn)
    return fn
  }

  removeAnimationFn(fn) {
    const self = _(this)
    self.animationFns.delete(fn)
  }

  addAnimationFnAfter(fn) {
    const self = _(this)
    if (typeof fn === 'function') self.animationFnsAfter.add(fn)
    return fn
  }

  removeAnimationFnAfter(fn) {
    const self = _(this)
    self.animationFnsAfter.delete(fn)
  }

  // base functions are executed after regular functions. They aren't repeated
  // on their own, they are only fired after animation functions. If there are
  // no animation functions, then base functions don't fire even if they remain
  // added to the AnimationLoop instance. This is useful for adding tasks that
  // always need to be triggered after updating animation values, for example
  // in Three.js we need to always call renderer.render(scene, camera) to
  // update the drawing.
  addBaseFn(fn) {
    const self = _(this)
    if (typeof fn === 'function') self.baseFns.add(fn)
    return fn
  }

  removeBaseFn(fn) {
    const self = _(this)
    self.baseFns.delete(fn)
  }

  start() {
    const self = _(this)

    // do nothing if already running
    if ( self.started && !self.paused ) return

    self.started = true
    self.paused = false
    self.clock.start()
    this._startTicking()
  }

  stop() {
    const self = _(this)

    // do nothing if already stopped
    if (!self.started) return

    self.started = false
    self.elapsed = 0
    self.clock.stop()
    this._stopTicking()
  }

  pause() {
    const self = _(this)

    // only pause if already running, otherwise do nothing
    if ( self.started && !self.paused ) {
      self.paused = true
      self.clock.stop()
      this._stopTicking()
    }
  }

  _startTicking() {
    const self = _(this)

    const fn = () => {
      this.tick( self.clock.getDelta() )
      self.animationFrame = requestAnimationFrame( fn )
    }

    self.animationFrame = requestAnimationFrame( fn )
  }

  _stopTicking() {
    const self = _(this)
    cancelAnimationFrame(self.animationFrame)
  }

  tick( dt ) {
    const self = _(this)

    self.elapsed += dt

    for (const fn of self.animationFnsBefore)
      if ( fn(dt, self.elapsed) === false ) this.removeAnimationFnBefore( fn )

    for (const fn of self.animationFns)
      if ( fn(dt, self.elapsed) === false ) this.removeAnimationFn( fn )

    for (const fn of self.animationFnsAfter)
      if ( fn(dt, self.elapsed) === false ) this.removeAnimationFnAfter( fn )
  }

  addChildLoop( child ) {
    const self = _(this)
    _(child).parentLoop = this
    self.childLoops.add( child )
  }

  removeChildLoop( child ) {
    const self = _(this)
    _(child).parentLoop = null
    self.childLoops.delete( child )
  }

}

export default AnimationLoop

// Child loops hook into parent animationFns instead of requestAnimationFrame,
// so that there's a single rAF loop at the root AnimationLoop.
export
class ChildAnimationLoop extends AnimationLoop {
  constructor() {
    super()
    const self = _(this)
    self.parentLoop = null
  }

  _startTicking() {
    const self = _(this)

    if (! self.parentLoop )
      throw new Error('ChildAnimationLoop must have parent AnimationLoop before being started')

    const fn = ( dt, elapsed ) => {
      this.tick( dt )
    }

    self.animationFrame = self.parentLoop.addAnimationFn( fn )
  }

  _stopTicking() {
    const self = _(this)
    self.parentLoop.removeAnimationFn( self.animationFrame )
  }
}
