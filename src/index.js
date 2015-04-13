'use strict';

var polyfills = require('famous-polyfills');
var rAF = polyfills.requestAnimationFrame;
var cAF = polyfills.cancelAnimationFrame;

var _now;
if (typeof performance !== 'undefined') {
    _now = function() {
        return performance.now();
    };
}
else {
    _now = Date.now;
}

if (typeof document !== 'undefined') {
    var VENDOR_HIDDEN, VENDOR_VISIBILITY_CHANGE;

    // Opera 12.10 and Firefox 18 and later support
    if (typeof document.hidden !== 'undefined') {
        VENDOR_HIDDEN = 'hidden';
        VENDOR_VISIBILITY_CHANGE = 'visibilitychange';
    }
    else if (typeof document.mozHidden !== 'undefined') {
        VENDOR_HIDDEN = 'mozHidden';
        VENDOR_VISIBILITY_CHANGE = 'mozvisibilitychange';
    }
    else if (typeof document.msHidden !== 'undefined') {
        VENDOR_HIDDEN = 'msHidden';
        VENDOR_VISIBILITY_CHANGE = 'msvisibilitychange';
    }
    else if (typeof document.webkitHidden !== 'undefined') {
        VENDOR_HIDDEN = 'webkitHidden';
        VENDOR_VISIBILITY_CHANGE = 'webkitvisibilitychange';
    }
}

/**
 * Engine class used for updating objects on a frame-by-frame. Synchronizes the
 * `update` method invocations to the refresh rate of the screen. Manages
 * the `requestAnimationFrame`-loop by normalizing the passed in timestamp
 * when switching tabs.
 * 
 * @class Engine
 * @constructor
 */
function Engine() {
    this._updates = [];
    var _this = this;
    this._looper = function(time) {
        _this.loop(time);
    };
    this._stoppedAt = _now();
    this._sleep = 0;
    this._startOnVisibilityChange = true;
    this._rAF = null;
    this.start();

    if (typeof document !== 'undefined') {
        document.addEventListener(VENDOR_VISIBILITY_CHANGE, function() {
            if (document[VENDOR_HIDDEN]) {
                cAF(this._rAF);
                var startOnVisibilityChange = _this._startOnVisibilityChange;
                _this.stop();
                _this._startOnVisibilityChange = startOnVisibilityChange;
            }
            else {
                if (_this._startOnVisibilityChange) {
                    _this.start();
                }
            }
        });
    }
}

/**
 * Starts the Engine.
 *
 * @method start
 * @chainable
 * 
 * @return {Engine} this
 */
Engine.prototype.start = function start() {
    if (!this._running) {
        this._startOnVisibilityChange = true;
        this._running = true;
        this._sleep += _now() - this._stoppedAt;
        this._rAF = rAF(this._looper);
    }
    return this;
};

/**
 * Stops the Engine.
 *
 * @method stop
 * @chainable
 * 
 * @return {Engine} this
 */
Engine.prototype.stop = function stop() {
    if (this._running) {
        this._startOnVisibilityChange = false;
        this._running = false;
        this._stoppedAt = _now();
        cAF(this._rAF);
    }
    return this;
};

/**
 * Determines whether the Engine is currently running or not.
 *
 * @method isRunning
 * 
 * @return {Boolean}    boolean value indicating whether the Engine is
 *                      currently running or not
 */
Engine.prototype.isRunning = function isRunning() {
    return this._running;
};

/**
 * Updates all registered objects.
 *
 * @method step
 * @chainable
 * 
 * @param  {Number} time high resolution timstamp used for invoking the
 *                       `update` method on all registered objects
 * @return {Engine}      this
 */
Engine.prototype.step = function step (time) {
    for (var i = 0, len = this._updates.length ; i < len ; i++) {
        this._updates[i].update(time);
    }
    return this;
};

/**
 * Method being called by `requestAnimationFrame` on every paint. Indirectly
 * recursive by scheduling a future invocation of itself on the next paint.
 *
 * @method loop
 * @chainable
 * 
 * @param  {Number} time high resolution timstamp used for invoking the
 *                       `update` method on all registered objects
 * @return {Engine}      this
 */
Engine.prototype.loop = function loop(time) {
    this.step(time - this._sleep);
    this._rAF = rAF(this._looper);
    return this;
};

/**
 * Registeres an updateable object which `update` method should be invoked on
 * every paint, starting on the next paint (assuming the Engine is running).
 *
 * @method update
 * @chainable
 * 
 * @param  {Object} updateable          object to be updated
 * @param  {Function} updateable.update update function to be called on the
 *                                      registered object
 * @return {Engine}                     this
 */
Engine.prototype.update = function update(updateable) {
    if (this._updates.indexOf(updateable) === -1) {
        this._updates.push(updateable);
    }
    return this;
};

/**
 * Deregisters an updateable object previously registered using `update` to be
 * no longer updated.
 *
 * @method noLongerUpdate
 * @chainable
 * 
 * @param  {Object} updateable          updateable object previously
 *                                      registered using `update`
 * @return {Engine}                     this
 */
Engine.prototype.noLongerUpdate = function noLongerUpdate(updateable) {
    var index = this._updates.indexOf(updateable);
    if (index > -1) {
        this._updates.splice(index, 1);
    }
    return this;
};

module.exports = Engine;
