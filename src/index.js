import Clock from './Clock'
import Class from 'lowclass'

export const AnimationLoop =
Class('AnimationLoop', ({Public, Protected, Private}) => ({

    constructor() {

        // `Private(this)` gives us access to truly "private" members
        const self = Private(this)

        self.animationFnsBefore = new Set()
        self.animationFns = new Set()
        self.animationFnsAfter = new Set()
        self.baseFns = new Set()

        self.animationFrame = null
        Protected(this).needsToRequestEachFrame = true

        self.elapsed = 0
        self.lastTick = 0
        self.interval = null
        self.intervals = -1
        self.clock = new Clock()

        self.started = false
        self.paused = false
        self.ticking = false
        self.forcedTick = false
    },

    // read-only
    get elapsed() { return Private(this).elapsed },
    get started() { return Private(this).started },
    get paused() { return Private(this).paused },
    get running() { return Private(this).started && !Private(this).paused },
    get ticking() { return Private(this).ticking },

    get interval() { return Private(this).interval },
    set interval(value) { Private(this).interval = value },

    addAnimationFnBefore(fn) {
        const self = Private(this)
        if (typeof fn === 'function') self.animationFnsBefore.add(fn)
        if (this.running) self._startTicking()
        return fn
    },

    removeAnimationFnBefore(fn) {
        const self = Private(this)
        self.animationFnsBefore.delete(fn)
    },

    addAnimationFn(fn) {
        const self = Private(this)
        if (typeof fn === 'function') self.animationFns.add(fn)
        if (this.running) self._startTicking()
        return fn
    },

    removeAnimationFn(fn) {
        const self = Private(this)
        self.animationFns.delete(fn)
    },

    addAnimationFnAfter(fn) {
        const self = Private(this)
        if (typeof fn === 'function') self.animationFnsAfter.add(fn)
        if (this.running) self._startTicking()
        return fn
    },

    removeAnimationFnAfter(fn) {
        const self = Private(this)
        self.animationFnsAfter.delete(fn)
    },

    hasAnimationFunctions() {
        const self = Private(this)
        return self.animationFnsBefore.size ||
            self.animationFns.size ||
            self.animationFnsAfter.size
    },

    addBaseFn(fn) {
        const self = Private(this)
        if (typeof fn === 'function') self.baseFns.add(fn)
        return fn
    },

    removeBaseFn(fn) {
        const self = Private(this)
        self.baseFns.delete(fn)
    },

    start() {
        const self = Private(this)

        // do nothing if already running
        if ( self.started && !self.paused ) return

        self.started = true
        self.paused = false
        self.clock.start()
        self._startTicking()
    },

    stop() {
        const self = Private(this)

        // do nothing if already stopped
        if (!self.started) return

        self.started = false
        self.elapsed = 0
        self.clock.stop()
        self._stopTicking()
    },

    pause() {
        const self = Private(this)

        // only pause if already running, otherwise do nothing
        if ( self.started && !self.paused ) {
            self.paused = true
            self.clock.stop()
            self._stopTicking()
        }
    },

    // add an empty function that removes itself on the next tick, forcing a
    // tick of all other animation base functions.
    forceTick() {
        const self = Private(this)
        if (self.forcedTick) return
        self.forcedTick = true
        this.addAnimationFn(() => self.forcedTick = false)
    },

    addChildLoop() {
        return new ChildAnimationLoop(this)
    },

    removeChildLoop( child ) {
        Protected(child)._dispose()
    },

    protected: {
        _requestFrame() {
            const pro = Protected(this)
            return requestAnimationFrame( () => pro._tick() )
        },

        _cancelFrame( frame ) {
            cancelAnimationFrame( frame )
        },

        _dispose() {
            Public(this).stop()
            Private(this)._clearFunctions()
        },

        _tick() {
            const self = Private(this)

            let dt = self.clock.getDelta()

            self.elapsed += dt

            if ( !self.interval ) {

                self._callAnimationFunctions( dt )

            }

            else {

                const numIntervals = Math.floor( self.elapsed / self.interval )

                if ( numIntervals > self.intervals ) {

                    dt = self.elapsed - self.lastTick
                    self.intervals = numIntervals
                    self.lastTick = self.elapsed

                    self._callAnimationFunctions( dt )

                }

            }

            if ( Protected(this).needsToRequestEachFrame )
                self.animationFrame = Protected(this)._requestFrame()

            if ( !Public(this).hasAnimationFunctions() ) self._stopTicking()

        },
    },

    private: {
        _clearFunctions() {
            this.animationFnsBefore.clear()
            this.animationFns.clear()
            this.animationFnsAfter.clear()
            this.baseFns.clear()
        },

        _startTicking() {
            if ( !Public(this).hasAnimationFunctions() ) return

            const self = Private(this)

            if ( self.ticking ) return

            self.ticking = true
            self.animationFrame = Protected(this)._requestFrame()
        },

        _stopTicking() {
            const self = Private(this)
            self.ticking = false
            Protected(this)._cancelFrame(self.animationFrame)
        },

        _callAnimationFunctions( dt ) {
            for (const fn of Array.from(this.animationFnsBefore))
                if ( fn(dt, this.elapsed) === false ) Public(this).removeAnimationFnBefore( fn )

            for (const fn of Array.from(this.animationFns))
                if ( fn(dt, this.elapsed) === false ) Public(this).removeAnimationFn( fn )

            for (const fn of Array.from(this.animationFnsAfter))
                if ( fn(dt, this.elapsed) === false ) Public(this).removeAnimationFnAfter( fn )

            for (const fn of Array.from(this.baseFns))
                if ( fn(dt, this.elapsed) === false ) Public(this).removeBaseFn( fn )
        },
    },

}))

export default AnimationLoop

// Child loops hook into parent animationFns instead of requestAnimationFrame,
// so that there's a single rAF loop at the root AnimationLoop.
const ChildAnimationLoop =
Class('ChildAnimationLoop').extends(AnimationLoop, ({Protected, Super}) => ({
    constructor(parentLoop) {
        Super(this).constructor()
        Protected(this).parentLoop = parentLoop
        Protected(this).needsToRequestEachFrame = false
    },

    protected: {
        _requestFrame() {
            const pro = Protected(this)
            return this.parentLoop.addAnimationFn( () => pro._tick() )
        },

        _cancelFrame( frame ) {
            this.parentLoop.removeAnimationFn( frame )
        },

        _dispose() {
            Super(this)._dispose()
            this.parentLoop = null
        },
    },
}))

export const version = '1.3.0'
