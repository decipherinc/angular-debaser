'use strict';

var angular = require('angular');
var options = require('./options');
var Debaser = require('./debaser');

/**
 * @typedef {Array.<String>} Annotation
 * @ignore
 * @description Annotation for AngularJS factories.
 */

/**
 * @external angular
 * @ignore
 * @see {@link http://angularjs.org}
 */

/**
 * @description Whether or not we are currently running in a spec.
 * @returns {boolean}
 */
function hasCurrentSpec() {
  return !!debaser.$$currentSpec;
}

/**
 * @alias window.debase.debaser
 * @summary Provides a {@link Debaser} object with which you can stub
 *     dependencies easily.
 * @description The object by this method exposes {@link Action actions}, which
 *     are chainable.  Each action "queues up" something to be stubbed, be that
 *     a module, function, object, or whatever.  When you have queued all your
 *     actions, execute {@link Debaser#debase debase()} and the stubs will be
 *     provided.
 * @param {(String|Object)} [name=DebaserOptions.name] Optional name of
 *     Debaser.  Only useful if using multiple instances.  If omitted, this is
 *     considered the `opts` parameter.
 * @param {DebaserOptions} [opts={}] Options to modify angular-debaser's
 *     behavior; see {@link DebaserOptions}.
 * @example
 *
 * // Defaults
 * var d = debase.debaser({
 *  debugEnabled: false,
 *  autoScope: true
 *  skipConfigs: true
 * });
 *
 * // Named
 * var d = debase.debaser('foo', {
 *  debugEnabled: false,
 *  autoScope: true
 *  skipConfigs: true
 * });
 *
 * @returns {Debaser}
 * @global
 * @public
 * @tutorial donny-developer
 */
function debaser(name, opts) {
  var defaultName;
  var instance;

  // setup args
  if (angular.isObject(name)) {
    opts = name;
    name = null;
  }

  opts = options(opts || {});

  defaultName = opts.defaultName;

  // if we are not given a name and the default instance exists, return it so
  // we don't re-instantiate. eliminate debaser.__globalInstance TODO why?
  if (!name && hasInstance(defaultName)) {
    debaser.__globalInstance = null;
    return getInstance(defaultName);
  }

  // init new Debaser instance or get existing if given name.  eliminate
  // debaser.__globalInstance since it's no longer applicable.
  if (name) {
    if (!hasInstance(name)) {
      debaser.__debasers[name] = new Debaser(name);
    }
    debaser.__globalInstance = null;
    return getInstance(name);
  }

  // (this is a new Debaser with the default name)
  instance = new Debaser();

  // if we're not in a beforeEach() then we're not in a spec.  call this the
  // global, default instance.
  debaser.__globalInstance = hasCurrentSpec() ? null : instance;

  return instance;
}


/**
 * @description Retrieve an existing Debaser instance by name.
 * @param {string} name Name of instance
 * @returns {Debaser}
 */
function getInstance(name) {
  return debaser.__debasers[name];
}

/**
 * @description Whether or not an instance with name exists.
 * @param {string} name Name of instance
 * @returns {boolean}
 */
function hasInstance(name) {
  return !!getInstance(name);
}

/**
 * @description Mapping of {@link Debaser#name}s to {@link Debaser} instances,
 *     for potential retrieval later.  **Exposed for unit testing.**
 * @type {Object.<String,Debaser>}
 * @private
 */
debaser.__debasers = {};

/**
 * @description Default instance if we are not running in a spec; presumably
 *     created in a `before()` block.  **Exposed for unit testing**
 * @type {?Debaser}
 * @todo test
 * @private
 */
debaser.__globalInstance = null;

/**
 * @alias window.debase
 * @summary Shortcut to the {@link Debaser#debase debase} method of the default
 *     {@link Debaser} instance.
 * @description Convenience method.  Retrieves the default {@link Debaser}
 *     instance (whatever that may be) and runs its {@link Debaser#debase
 *     debase()} method.
 * @example
 *
 * before(function() {
 *   debaser()
 *     .func('foo')
 *     .object('bar')
 * });
 *
 * beforeEach(debase);
 *
 * // above equivalent to:
 *
 * var d;
 * before(function() {
 *   d = debaser()
 *     .func('foo')
 *     .object('bar')
 * });
 *
 * beforeEach(function() {
 *   d.debase();
 * });
 * @returns {(function|Debaser)}
 * @param {string} [name] Name of {@link Debaser} instance to call {@link
  *     Debaser#debase} upon.
 * @global
 * @public
 */
function debase(name) {
  var defaultName = options.opts.defaultName;

  /**
   * @description Calls {@link Debaser#debase} with proper persistance options.
   *      Unlike {@link Debaser#debase}, will return a {@link Debaser}
   *     instance.
   * @memberof globalHelpers
   * @function callDebase
   * @returns {Debaser}
   * @throws Invalid {@link Debaser} name
   * @throws If {@link debaser} was never called
   */
  function callDebase() {
    var d;

    if (!name || !angular.isString(name)) {
      if (!hasInstance(defaultName)) {
        if (debaser.__globalInstance) {
          return debaser.__globalInstance.debase({ persist: true });
        }
        throw new Error('debaser: no Debaser initialized!');
      }
      name = defaultName;
    } else if (!hasInstance(name)) {
      throw new Error('debaser: cannot find Debaser instance with name "' +
        name + '"');
    }
    d = getInstance(name);
    // TODO not sure if persist value is correct.
    d.debase({
      persist: name !== defaultName
    });
    return d;
  }

  return hasCurrentSpec() ? callDebase() : callDebase;
}

debase.debaser = debaser;

/**
 * Attaches {@link debaser} and {@link debase} to the `global` object.
 * Registers `setup()`/`teardown()` or `beforeEach()`/`afterEach()` functions
 * to retrieve the current spec.
 */
(function install() {

  var afterHook;
  var beforeHook;

  // TODO document these
  beforeHook = (global.beforeEach || global.setup);
  beforeHook(function () {
    debaser.$$currentSpec = this;
  });

  afterHook = (global.afterEach || global.teardown);
  afterHook(function () {
    delete debaser.$$currentSpec;
  });

  if (typeof window !== 'undefined') {
    /* global window */
    window.debase = debase;
  }

}());

debase.__version = require('../package.json').version;

module.exports = debase;
