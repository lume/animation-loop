import Clock from './Clock'

import Privates from './Privates'
const _ = new Privates()

export
class AnimationLoop {

    constructor() {

        // `_(this)` gives us access to truly "private" members
        const self = _(this)

        self.animationFnsBefore = new Set()
        self.animationFns = new Set()
        self.animationFnsAfter = new Set()
        self.baseFns = new Set()

        self.animationFrame = null
        self.needsToRequestEachFrame = true

        self.elapsed = 0
        self.lastTick = 0
        self.interval = null
        self.intervals = -1
        self.clock = new Clock()

        self.started = false
        self.paused = false
        self.ticking = false
        self.forcedTick = false

        self.childLoops = new Set()

        this._tick = this._tick.bind(this)
    }

    // read-only
    get elapsed() { return _(this).elapsed }
    get started() { return _(this).started }
    get paused() { return _(this).paused }
    get running() { return _(this).started && !_(this).paused }
    get ticking() { return _(this).ticking }

    get interval() { return _(this).interval }
    set interval(value) { _(this).interval = value }

    addAnimationFnBefore(fn) {
        const self = _(this)
        if (typeof fn === 'function') self.animationFnsBefore.add(fn)
        if (this.running) this._startTicking()
        return fn
    }

    removeAnimationFnBefore(fn) {
        const self = _(this)
        self.animationFnsBefore.delete(fn)
    }

    addAnimationFn(fn) {
        const self = _(this)
        if (typeof fn === 'function') self.animationFns.add(fn)
        if (this.running) this._startTicking()
        return fn
    }

    removeAnimationFn(fn) {
        const self = _(this)
        self.animationFns.delete(fn)
    }

    addAnimationFnAfter(fn) {
        const self = _(this)
        if (typeof fn === 'function') self.animationFnsAfter.add(fn)
        if (this.running) this._startTicking()
        return fn
    }

    removeAnimationFnAfter(fn) {
        const self = _(this)
        self.animationFnsAfter.delete(fn)
    }

    hasAnimationFunctions() {
        const self = _(this)
        return self.animationFnsBefore.size ||
            self.animationFns.size ||
            self.animationFnsAfter.size
    }

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
        if ( !this.hasAnimationFunctions() ) return

        const self = _(this)

        if ( self.ticking ) return

        self.ticking = true
        self.animationFrame = this._requestFrame( this._tick )
    }

    _stopTicking() {
        const self = _(this)
        self.ticking = false
        this._cancelFrame(self.animationFrame)
    }

    _requestFrame( fn ) {
        return requestAnimationFrame( fn )
    }

    _cancelFrame( fn ) {
        cancelAnimationFrame( fn )
    }

    _tick() {
        const self = _(this)

        let dt = self.clock.getDelta()

        self.elapsed += dt

        if ( !self.interval ) {

            this._callAnimationFunctions( dt )

        }

        else {

            const numIntervals = Math.floor( self.elapsed / self.interval )

            if ( numIntervals > self.intervals ) {

                dt = self.elapsed - self.lastTick
                self.intervals = numIntervals
                self.lastTick = self.elapsed

                this._callAnimationFunctions( dt )

            }

        }

        if ( self.needsToRequestEachFrame )
            self.animationFrame = this._requestFrame( this._tick )

        if ( !this.hasAnimationFunctions() ) this._stopTicking()

    }

    _callAnimationFunctions( dt ) {
        const self = _(this)

        for (const fn of Array.from(self.animationFnsBefore))
            if ( fn(dt, self.elapsed) === false ) this.removeAnimationFnBefore( fn )

        for (const fn of Array.from(self.animationFns))
            if ( fn(dt, self.elapsed) === false ) this.removeAnimationFn( fn )

        for (const fn of Array.from(self.animationFnsAfter))
            if ( fn(dt, self.elapsed) === false ) this.removeAnimationFnAfter( fn )

        for (const fn of Array.from(self.baseFns))
            if ( fn(dt, self.elapsed) === false ) this.removeBaseFn( fn )
    }

    // add an empty function that removes itself on the next tick, forcing a
    // tick of all other animation base functions.
    forceTick() {
        const self = _(this)
        if (self.forcedTick) return
        self.forcedTick = true
        this.addAnimationFn(() => self.forcedTick = false)
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
        self.needsToRequestEachFrame = false
    }

    _requestFrame( fn ) {
        const self = _(this)
        return self.parentLoop.addAnimationFn( fn )
    }

    _cancelFrame( fn ) {
        const self = _(this)
        self.parentLoop.removeAnimationFn( fn )
    }
}

export const version = '1.3.0'
