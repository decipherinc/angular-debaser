/*! angular-debaser - v0.3.3
 * https://github.com/decipherinc/angular-debaser
 * Copyright (c) 2015 Focusvision Worldwide; Licensed MIT
 */

(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var Utils = require('./utils');

/**
 * @description Creates a new Action object.
 * @param {object} action Raw action object
 * @param {function} [action.callback=angular.noop] Function to call with the
 *     return value of the main Function to call
 * @param {object} [action.object] Object containing main Function to call
 * @param {function} action.func Main Function to call
 * @param {object} [action.context=null] Context to call main Function with
 * @param {Array} [action.args=[]] Arguments to function
 * @constructor
 * @ignore
 * @memberof loadAction
 */

var Action = {
  assemble: function assemble() {
    /**
     * @description Executes an assembled function
     * @memberof! Action#assemble
     * @inner
     */
    function action() {
      this.callback(this.object ?
        this.object[this.func].apply(this.context, this.args) :
        this.func.apply(this.context, this.args));
    }

    return Utils.bind(this, action);
  }
};

/**
 * @description Accepts a {@link Config} object, constructs and returns
 * {@link Action} instances from its `actions` property
 * @constructs Action
 * @private
 */
function loadAction(cfg) {
  return cfg.actions.map(function (action) {
    return Utils.create(Action, Utils.extend({
      callback: Utils.noop,
      context: null
    }, action));
  });
}

module.exports = loadAction;

},{"./utils":18}],2:[function(require,module,exports){
'use strict';

var Superpowers = require('./superpowers');
var createBehavior = require('./behavior');
var Utils = require('./utils');

var id = 0;
var DEFAULT_NAME = 'base';

/**
 * @typedef Aspect
 * @type {{flush: Function, _initProto: Function, _initBehavior: Function,
 *   _isDirty: Function, createProxy: Function, isAspectOf: Function}}
 */
var Aspect = {

  flush: function flush() {
    return this.behavior.flush();
  },

  _initProto: function _initProto() {
    var o;
    if (this._proto && !this._dirty) {
      return;
    }
    o = {};
    if (this.parent) {
      Utils.extend(o, this.parent.proto);
    }
    Utils.each(Superpowers, function (fn, name) {
      if (name.charAt(0) !== '$' &&
        fn.$aspect.indexOf(this._name) !== -1) {
        o[name] = this.createProxy(fn, name);
      }
    }, this);
    this._proto = o;
  },
  _initBehavior: function _initBehavior() {
    if (this._behavior && !this._dirty) {
      return;
    }
    this._behavior = createBehavior(Utils.extend(this._behavior || {},
      this.parent && this.parent.isAspectOf(this.name) &&
      this.parent.behavior), this.name);
  },
  _isDirty: function _isDirty(value, prop) {
    // noinspection OverlyComplexBooleanExpressionJS
    return value && value !== this[prop] ||
      Utils.isUndefined(value) && this[prop];
  },
  createProxy: function createProxy(fn, name) {
    var proxy;
    /**
     * @this Debaser
     * @returns {Debaser|*}
     * @todo trim fat
     */
    proxy = function proxy() {
      var currentAspect = this.$$aspect;
      var inherits = currentAspect.isAspectOf(name);
      /* eslint consistent-this:0 */
      var retval = this;
      var aspect;
      var result;

      if (!inherits && currentAspect.name !== 'base') {
        this.$enqueue();
      }
      aspect = this.$aspect(fn.$name || name);
      result = fn.apply(aspect.config, arguments);

      if (Utils.isArray(result)) {
        aspect.behavior.enqueue(result);
      } else if (result) {
        retval = result;
      }
      return retval;
    };
    return proxy;
  },
  isAspectOf: function isAspectOf(name) {
    return name !== 'base' && Superpowers[name] &&
      Superpowers[name].$aspect.indexOf(this.name) !== -1;
  }
};

Object.defineProperties(Aspect, {
  name: {
    get: function getName() {
      return this._name;
    },
    set: function setName(name) {
      this._dirty = this._isDirty(name, '_name');
      this._name = name || DEFAULT_NAME;
    }
  },
  parent: {
    get: function getParent() {
      return this._parent;
    },
    set: function setParent(parent) {
      this._dirty = this._isDirty(parent, '_parent');
      this._parent = parent;
    }
  },
  proto: {
    get: function getProto() {
      var dirty = this._dirty;
      if (!this._proto || dirty) {
        this._initProto();
      }
      this._dirty = false;
      return this._proto;
    },
    set: function setProto(proto) {
      this._proto = proto;
    }
  },
  behavior: {
    get: function getBehavior() {
      var dirty = this._dirty;
      if (!this._behavior || dirty) {
        this._initBehavior();
      }
      this._dirty = false;
      return this._behavior;
    },
    set: function setBehavior(behavior) {
      this._behavior = behavior;
    }
  },
  config: {
    get: function getConfig() {
      return this.behavior.config;
    },
    set: function setConfig(config) {
      this.behavior.config = config;
    }
  }
});

Aspect.createProxy.cache = {};

/**
 * Creates an Aspect
 * @param {string} [name] Name of this aspect; defaults to DEFAULT_NAME
 * @param {Aspect} [parent] Parent Aspect, if any
 * @returns {Aspect}
 */
function createAspect(name, parent) {
  return Utils.create(Aspect, {
    name: name || DEFAULT_NAME,
    parent: parent,
    _id: id++
  });
}

module.exports = createAspect;

},{"./behavior":3,"./superpowers":10,"./utils":18}],3:[function(require,module,exports){
'use strict';

var createConfig = require('./config');
var Utils = require('./utils');

var id = 0;

var Behavior = {
  enqueue: function enqueue(calls) {
    this.queue.push.apply(this.queue, calls);
  },
  flush: function flush() {
    return this.queue.map(function (action) {
      return action.assemble();
    });
  }
};

Object.defineProperties(Behavior, {
  queue: {
    get: function getQueue() {
      if (!this._queue) {
        this._queue = [];
      }
      return this._queue;
    },
    set: function setQueue(queue) {
      this._queue = queue || [];
    }
  },
  config: {
    get: function getConfig() {
      if (!this._config) {
        this._config = createConfig(this._aspectName);
      }
      return this._config;
    },
    set: function setConfig(config) {
      this._config = config || createConfig(this._aspectName);
    }
  }
});

function createBehavior(obj, aspectName) {
  if (Utils.isString(obj)) {
    aspectName = obj;
    obj = {};
  }
  obj = obj || {};
  return Utils.create(Behavior, Utils.extend(obj, {
    _aspectName: aspectName,
    _id: id++
  }));
}

module.exports = createBehavior;

},{"./config":4,"./utils":18}],4:[function(require,module,exports){
'use strict';

var Utils = require('./utils');
var bind = Utils.bind;

var id = 0;

var Config = {
  addAction: function addAction(opts) {
    if (!opts) {
      throw new Error('$debaser: addCall() expects call options');
    }
    opts.callback = opts.callback || this.runner();
    opts.context =
      Utils.isDefined(opts.context) ? opts.context : opts.object || null;
    this.actions.push(opts);
  },
  next: function next() {
    if (this._callbacks[this._cbIdx]) {
      this._callbacks[this._cbIdx++].apply(this, arguments);
    } else {
      this.done();
    }
  },
  done: function done() {
    this._cbIdx = 0;
  },
  chain: function chain(fn) {
    this._callbacks.push(bind(this, function debaserCallbackProxy() {
      this.next(fn.apply(this, arguments));
    }));
  },
  runner: function runner() {
    function run() {
      this.next.apply(this, arguments);
    }

    return bind(this, run);
  }
};

Object.defineProperty(Config, 'chained', {
  get: function () {
    return !!this._callbacks.length;
  }
});

/**
 * @param {(object|string)} obj Raw {@link Behavior} configuration object, or
 *     {@link Aspect} name
 * @class
 * @param {string} [aspectName] Name of {@link Aspect} this configuration
 *     belongs to
 */
function createConfig(obj, aspectName) {
  if (Utils.isString(obj)) {
    aspectName = obj;
    obj = {};
  }
  obj = obj || {};
  return Utils.create(Config, Utils.extend(obj, {
    _aspectName: aspectName,
    _callbacks: [],
    _cbIdx: 0,
    _id: id++,
    actions: obj.actions || []
  }));
}

module.exports = createConfig;

},{"./utils":18}],5:[function(require,module,exports){
(function (global){
'use strict';

var createAspect = require('./aspect');
var opts = require('./options').opts;
var Utils = require('./utils');

/**
 * @description Provides an object with which you can stub AngularJS
 *     dependencies.  Do not attempt to instantiate this class directly; use
 *     the {@link debaser} function instead.
 * @public
 * @mixes base
 * @global
 */
var Debaser = {
  $aspect: function aspect(name) {
    var currentAspect = this.$$aspect;
    var aspect;
    var proto;
    if (Utils.isUndefined(name)) {
      name = currentAspect.name;
    }
    if (currentAspect) {
      proto = currentAspect.proto;
      Utils.each(proto, function(value, key) {
        delete this[key];
      }, this);
    }
    aspect = createAspect(name, currentAspect);
    Utils.extend(this, aspect.proto);
    this.$$aspect = aspect;
    return aspect;
  },
  $enqueue: function enqueue() {
    var currentAspect = this.$$aspect;
    if (currentAspect) {
      this.$queue.push.apply(this.$queue, currentAspect.flush());
    }
  },
  /**
   * @description All previously queued stubs will be installed upon execution
   *     of this method.
   * @param {Object} [opts] Options
   * @param {boolean} [opts.persist=false] If true, retain the queue.  Only
   *     used in a non-spec context; {@link debase window.debase} can call it
   *     with this option.  You probably don't want to specify this yourself.
   * @returns undefined
   */
  $debase: function debase(opts) {
    var angular = (typeof window !== "undefined" ? window['angular'] : typeof global !== "undefined" ? global['angular'] : null);
    var jasmine;
    (typeof window !== "undefined" ? window['angular-mocks'] : typeof global !== "undefined" ? global['angular-mocks'] : null);
    opts = opts || {};
    this.$enqueue();
    try {
      jasmine = (typeof window !== "undefined" ? window['jasmine'] : typeof global !== "undefined" ? global['jasmine'] : null);
      angular.mock.module(function ($provide) {
        $provide.value('$$jasmineHack$$', null);
      });
    } catch (ignored) {
      // ignored
    }
    Utils.each(this.$queue, function (fn) {
      fn();
    });
    if (!opts.persist) {
      this.$queue = [];
    }
    this.$aspect('base');
    if (opts.autoScope) {
      angular.mock.module(autoScopeProvider);
    }
  }
};

function autoScopeProvider($provide) {
  $provide.decorator('$controller',
    [
      '$rootScope', '$delegate', function ($rootScope, $delegate) {
      return function (name, locals) {
        locals = locals || {};
        if (!locals.$scope) {
          locals.$scope = $rootScope.$new();
        }
        $delegate(name, locals);
        return locals.$scope;
      };
    }
    ]);
}
autoScopeProvider.$inject = ['$provide'];

function createDebaser(name) {
  var aspect = createAspect();
  if (!Utils.isString(name)) {
    name = opts.defaultName;
  }
  return Utils.create(Debaser, Utils.extend({
    $name: name,
    $queue: [],
    $$aspect: aspect
  }, aspect.proto));
}

module.exports = createDebaser;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./aspect":2,"./options":7,"./utils":18}],6:[function(require,module,exports){
(function (global){
'use strict';

var angular = (typeof window !== "undefined" ? window['angular'] : typeof global !== "undefined" ? global['angular'] : null);
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
 * Attaches {@link debaser} and {@link debase} to the `window` object.
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

}());

debase.__version = require('../package.json').version;

module.exports = debase;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../package.json":65,"./debaser":5,"./options":7}],7:[function(require,module,exports){
(function (global){
'use strict';

var angular = (typeof window !== "undefined" ? window['angular'] : typeof global !== "undefined" ? global['angular'] : null);

/**
 * @summary Options, and their defaults, which you can pass into {@link debaser
 *     window.debaser()}.
 * @description Default options
 * @typedef {Object} DebaserOptions
 * @property {boolean} [debugEnabled=false] Enable debug log messages?
 * @property {boolean} [autoScope=true] Enable auto-scope functionality when
 *     using {@link ng.$controller}?
 * @property {boolean} [skipConfigs=true] Enable stubbing of `config()` blocks?
 * @property {string} [defaultName=__default__] Default name of default Debaser
 *     instance; useless
 * @global
 */
var DEFAULT_OPTS = {
  debugEnabled: false,
  autoScope: true,
  skipConfigs: true,
  defaultName: '__default__'
};

function options(opts) {
  options.opts = angular.extend(options.opts, opts);

  return {
    opts: options.opts,
    runConfig: options.runConfig
  };
}

/*
 * @description Run configurations.  Mapping of {@link Config#_id} to {@link
 *     Config} objects. **Exposed for unit testing**
 * @todo test
 * @type {Object.<String,Config>}
 * @private
 */
options.runConfig = {};
options.opts = angular.extend({}, DEFAULT_OPTS);

module.exports = options;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],8:[function(require,module,exports){
'use strict';

module.exports = function debaserConstantCallback(mod) {
  if (this.name && this.stub && mod && mod.constant) {
    return mod.constant(this.name, this.stub);
  }
};


},{}],9:[function(require,module,exports){
'use strict';

var Utils = require('../utils');
var sinonPowers = require('./sinon');

/**
 * @description Creates an injectable function.
 * @param {string} name Name of injectable
 * @memberof base
 * @instance
 * @returns {base.func}
 * @see Action
 */
function func(name) {
  var args = Array.prototype.slice.call(arguments, 1);
  var sinon;
  if (!name) {
    return console.debug('$debaser: ignoring empty call to func()');
  }
  if (!Utils.isString(name)) {
    throw new Error('$debaser: func() expects a name');
  }
  this.func =
    (sinon = sinonPowers.$sinon) ? sinon.stub.apply(sinon, args) : Utils.noop;
  return require('./object').call(this, name, this.func);
}
func.$aspect = ['base'];
func.$name = 'func';

module.exports = func;

},{"../utils":18,"./object":12,"./sinon":13}],10:[function(require,module,exports){
'use strict';

var Utils = require('../utils');

module.exports = Utils.extend({
  func: require('./func'),
  module: require('./module'),
  object: require('./object'),
  withDep: require('./with-dep'),
  withDeps: require('./with-deps'),
  withFunc: require('./with-func'),
  withObject: require('./with-object')
}, Utils.omit(require('./sinon'), '$sinon'));

/**
 * @external sinon.stub
 * @description A stub function.  (Almost) all functions available to Sinon.JS
 *     stubs.
 * @see http://sinonjs.org/docs/#stubs
 * @mixin sinon.stub
 */

/**
 * @external sinon.Stub
 * @description
 * A Stub object.  Returned when using an `*onCall*` method, instead of a
 *     {@link sinon.stub stub}.  In this context, use {@link sinon.Stub.end
 *     end()} to return to a {@link Debaser} instance.
 * > The `create()`, `resetBehavior()` and `isPresent()` functions of the
 *     Sinon.JS "stub" API are not used.  If someone needs these, please {@link
  *     https://github.com/decipherinc/angular-debaser/issues/ create an issue}
 *     and provide a use case.
 * @mixin sinon.Stub
 */

/**
 * @namespace base
 * @mixin
 */

/**
 * @namespace module
 * @memberof base
 * @mixin
 * @mixes base.object
 */

/**
 * @namespace func
 * @memberof base
 * @mixin
 * @mixes sinon.stub
 */

/**
 * @namespace object
 * @memberof base
 * @mixin
 */

/**
 * @namespace withObject
 * @memberof base.module
 * @mixes base.object
 * @mixin
 */

/**
 * @namespace withFunc
 * @memberof base.module
 * @mixes base.func
 * @mixin
 */

/**
 * @typedef {function} Action
 * @summary A method (on a {@link Debaser} instance) which tells
 *     angular-debaser to provide some object, method, function, etc.
 * @description These functions will always return {@link Debaser} instances,
 *     however, the mixins used will change.  The "root" mixin is the {@link
  *     base} mixin.  All other mixins "inherit" from this one, meaning the
 *     {@link base} methods *will always be available*.
 * @example
 * debaser
 *   .object('Foo') // we are now in the `base.object` mixin.
 *   .withFunc('bar') // we are now in the `base.withFunc` mixin.
 *   // however, since these mixins are inherited, we always have access to
 *   // method `object`, which is on the `base` mixin.
 *   .object('Baz')
 *   .debase(); // go!
 *   // `Foo` and `Baz` are now injectable; `Foo` has a static function `bar`
 *
 */

},{"../utils":18,"./func":9,"./module":11,"./object":12,"./sinon":13,"./with-dep":14,"./with-deps":15,"./with-func":16,"./with-object":17}],11:[function(require,module,exports){
(function (global){
'use strict';

var Utils = require('../utils');
var angular = (typeof window !== "undefined" ? window['angular'] : typeof global !== "undefined" ? global['angular'] : null);
var opts = require('../options').opts;
var loadAction = require('../action');

/**
 * @memberof base
 * @instance
 * @description Stubs a module, or bootstraps an existing module.
 * @param {string} name Module name to bootstrap/stub.
 * @param {Array<String>} [deps] Any dependencies of this module.
 * @returns {base.module}
 * @see Action
 */
function mod(name, deps) {
  var realModule;
  var i;
  if (!name) {
    name = 'dummy-' + mod.$id++;
  }
  if (!Utils.isString(name)) {
    throw new Error('$debaser: module() expects a string');
  }
  this.mod = name;
  this.modDependencies = [];
  if (deps) {
    if (!Utils.isArray(deps)) {
      throw new Error('$debaser: module() expects array or undefined as ' +
        'second parameter');
    }
    require('./with-deps').call(this, deps);
  }
  try {
    realModule = angular.module(name);
    if (opts.skipConfigs && realModule) {
      i = realModule._invokeQueue.length;
      while (i--) {
        if (realModule._invokeQueue[i][0] === '$injector' &&
          realModule._invokeQueue[i][1] === 'invoke') {
          realModule._invokeQueue.splice(i, 1);
        }
      }
    }
  } catch (ignored) {
    // ignored
  }
  this.addAction({
    object: angular,
    func: 'mod',
    args: realModule ? [this.module] : [this.module, this.modDependencies]
  });
  this.addAction({
    object: angular.mock,
    func: 'mod',
    args: [this.module]
  });
  return loadAction(this);
}
mod.$aspect = ['base'];
mod.$id = 0;
mod.$name = 'module';

module.exports = mod;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../action":1,"../options":7,"../utils":18,"./with-deps":15}],12:[function(require,module,exports){
(function (global){
'use strict';

var angular = (typeof window !== "undefined" ? window['angular'] : typeof global !== "undefined" ? global['angular'] : null);
var Utils = require('../utils');
var runConfig = require('../options').runConfig;
var loadAction = require('../action');
var sinonPowers = require('./sinon');

/**
 * @description Creates an injectable object.
 * @param {string} name Name of injectable
 * @param {Object} [base] If supplied, will inject this object instead.  If
 *     {@link http://sinonjs.org Sinon.JS) is present, the object's functions
 *     will be spied upon.
       * @memberof base
       * @instance
 * @returns {base.object}
 * @this Config
 * @see Action
 */
function object(name, base) {
  var sinon;

  function provider($provide) {
    var cfg = runConfig[provider._id];
    $provide[cfg.component](cfg.name, cfg.stub);
  }

  /**
   * @this Config
   * @returns {string}
   */
  function toString() {
    return 'debaserProvider-' + this._id.toString();
  }

  if (!name) {
    return console.debug('$debaser: ignoring empty call to object()');
  }
  if (!Utils.isString(name)) {
    throw new Error('$debaser: object() expects a name');
  }
  if (base && !Utils.isFunction(base) && !Utils.isObject(base)) {
    throw new Error('$debaser: object() second param should be an ' +
      'Object or undefined');
  }
  if (!this.stub) {
    if (!Utils.isObject(base) && !Utils.isFunction(base)) {
      base = {};
    }
    if (Utils.isObject(base)) {
      this.stub =
        (sinon = sinonPowers.$sinon) && !Utils.isSinon(base) ?
          sinon.stub(base) :
          base;
    } else {
      this.stub = base;
    }
  }
  if (!this.chained) {
    this.name = name;
    this.component = 'value';
    // angularjs hates to inject identical functions.
    // this makes them no longer identical.
    this.provider = provider;
    this.provider.toString = Utils.bind(this, toString);
    this.provider._id = this._id;
    this.provider.$inject = ['$provide'];
    this.addAction(
      {
        object: angular.mock,
        func: 'module',
        args: [this.provider]
      }
    );
    runConfig[this._id] = this;
    return loadAction(this);
  }
}
object.$aspect = ['base'];
object.$name = 'object';

module.exports = object;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../action":1,"../options":7,"../utils":18,"./sinon":13}],13:[function(require,module,exports){
(function (global){
'use strict';

var Utils = require('../utils');

var SINON_EXCLUDE = [
  'create',
  'resetBehavior',
  'isPresent'
];
var sinon;
var sinonPowers = {};

Object.defineProperty(sinonPowers, '$sinon', {
  get: function getSinon() {
    try {
      return (typeof window !== "undefined" ? window['sinon'] : typeof global !== "undefined" ? global['sinon'] : null);
    } catch (ignored) {
      return null;
    }
  }
});

if ((sinon = sinonPowers.$sinon)) {
  Utils.each(sinon.stub, function (fn, name) {
    function sinonProxy() {
      var retval = fn.apply(this.func, arguments);
      if (retval && retval.stub && retval.stub.func) {
        /**
         * @description Gives you a {@link Debaser} instance back if you have
         *     been setting things up via `*onCall*` methods.
         * @function sinon.Stub#end
         * @returns {(base.func|base.module.withFunc)}
         */
        retval.end = Utils.bind(this, function debaserEnd() {
          return this;
        });
        return retval;
      }
    }

    if (Utils.isFunction(fn) && SINON_EXCLUDE.indexOf(name) === -1) {
      sinonProxy.$aspect = ['func', 'withFunc'];
      sinonPowers[name] = sinonProxy;
    }
  });
}

module.exports = sinonPowers;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../utils":18}],14:[function(require,module,exports){
'use strict';

var Utils = require('../utils');

/**
 * @description Adds dependencies to the current module.  Potentially useful if
 *     you have a dependency chain `A -> B -> C` and you wish to stub `B` but
 *     not `A` or `C`.
 * @memberof base.module
 * @instance
 * @returns {base.module}
 * @this Config
 * @see Action
 */
function withDep() {
  if (!arguments.length) {
    return console.debug('$debaser: ignoring empty call to withDep()');
  }
  Utils.each(Array.prototype.slice.call(arguments), function (arg) {
    if (!Utils.isString(arg)) {
      throw new Error('$debaser: withDep() expects one or more strings');
    }
  });
  this.moduleDependencies.push.apply(this.moduleDependencies,
    arguments);
}
withDep.$aspect = ['module'];
withDep.$name = 'withDep';

module.exports = withDep;

},{"../utils":18}],15:[function(require,module,exports){
'use strict';

var Utils = require('../utils');

/**
 * @description Like {@link base.module.withDep withDep}, but accepts an array
 *     instead.
 * @param {Array<String>} arr Array of module dependencies
 * @memberof base.module
 * @instance
 * @returns {base.module}
 * @see Action
 */
function withDeps(arr) {
  if (!arr) {
    return console.debug('$debaser: ignoring empty call to withDeps()');
  }
  if (!Utils.isArray(arr)) {
    throw new Error('$debaser: withDeps() expects an array');
  }
  require('./with-dep').apply(this, arr);
}
withDeps.$aspect = ['module'];
withDeps.$name = 'withDeps';

module.exports = withDeps;

},{"../utils":18,"./with-dep":14}],16:[function(require,module,exports){
'use strict';

var Utils = require('../utils');
var sinonPowers = require('./sinon');

/**
 * @description Provides a function on the object, or injectable function on
 *     the module.  If used in a module context, then provides a constant.  If
 *     {@link http://sinonjs.org Sinon.JS} is present,
 * @memberof base.object
 * @instance
 * @param {string} name Name of member function or injectable function
 * @returns {(base.object|base.module|base.module.withObject)}
 * @see Action
 */
function withFunc(name) {
  // todo: add warnings here
  var args = Array.prototype.slice.call(arguments, 1);
  var sinon;
  if (Utils.isObject(this.stub)) {
    this.func =
      (sinon = sinonPowers.$sinon) ? sinon.stub.apply(sinon, args) : Utils.noop;
    this.stub[name] = this.func;
  } else {
    this.name = name;
    this.chain(Utils.bind(this, require('./callback')));
    require('./func').apply(this, arguments);
  }
}
withFunc.$aspect = [
  'module',
  'object',
  'withObject'
];
withFunc.$name = 'withFunc';

module.exports = withFunc;

},{"../utils":18,"./callback":8,"./func":9,"./sinon":13}],17:[function(require,module,exports){
'use strict';

var Utils = require('../utils');

/**
 * @description Provides a *constant* injectable object on the module.
 * @param {string} name Name of injectable object
 * @see Action
 */
function withObject(name) {
  this.name = name;
  this.chain(Utils.bind(this, require('./callback')));
  require('./object').apply(this, arguments);
}
withObject.$aspect = ['module'];
withObject.$name = 'withObject';

module.exports = withObject;

},{"../utils":18,"./callback":8,"./object":12}],18:[function(require,module,exports){
(function (global){
'use strict';

var angular = (typeof window !== "undefined" ? window['angular'] : typeof global !== "undefined" ? global['angular'] : null);

var Utils = {
  extend: require('lodash.assign'),
  create: require('lodash.create'),
  each: require('lodash.foreach'),
  omit: require('lodash.omit'),
  bind: angular.bind,
  isString: angular.isString,
  isObject: angular.isObject,
  isFunction: angular.isFunction,
  isUndefined: angular.isUndefined,
  isArray: angular.isArray,
  noop: angular.noop,
  keys: Object.keys,
  isDefined: function isDefined(value) {
    return !Utils.isUndefined(value);
  },
  isSinon: function isSinon(value) {
    return value.displayName === 'stub' ||
      value.displayName === 'spy';
  }
};

module.exports = Utils;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"lodash.assign":19,"lodash.create":30,"lodash.foreach":39,"lodash.omit":47}],19:[function(require,module,exports){
/**
 * lodash 3.2.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseAssign = require('lodash._baseassign'),
    createAssigner = require('lodash._createassigner'),
    keys = require('lodash.keys');

/**
 * A specialized version of `_.assign` for customizing assigned values without
 * support for argument juggling, multiple sources, and `this` binding `customizer`
 * functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @param {Function} customizer The function to customize assigned values.
 * @returns {Object} Returns `object`.
 */
function assignWith(object, source, customizer) {
  var index = -1,
      props = keys(source),
      length = props.length;

  while (++index < length) {
    var key = props[index],
        value = object[key],
        result = customizer(value, source[key], key, object, source);

    if ((result === result ? (result !== value) : (value === value)) ||
        (value === undefined && !(key in object))) {
      object[key] = result;
    }
  }
  return object;
}

/**
 * Assigns own enumerable properties of source object(s) to the destination
 * object. Subsequent sources overwrite property assignments of previous sources.
 * If `customizer` is provided it is invoked to produce the assigned values.
 * The `customizer` is bound to `thisArg` and invoked with five arguments:
 * (objectValue, sourceValue, key, object, source).
 *
 * **Note:** This method mutates `object` and is based on
 * [`Object.assign`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.assign).
 *
 * @static
 * @memberOf _
 * @alias extend
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} [sources] The source objects.
 * @param {Function} [customizer] The function to customize assigned values.
 * @param {*} [thisArg] The `this` binding of `customizer`.
 * @returns {Object} Returns `object`.
 * @example
 *
 * _.assign({ 'user': 'barney' }, { 'age': 40 }, { 'user': 'fred' });
 * // => { 'user': 'fred', 'age': 40 }
 *
 * // using a customizer callback
 * var defaults = _.partialRight(_.assign, function(value, other) {
 *   return _.isUndefined(value) ? other : value;
 * });
 *
 * defaults({ 'user': 'barney' }, { 'age': 36 }, { 'user': 'fred' });
 * // => { 'user': 'barney', 'age': 36 }
 */
var assign = createAssigner(function(object, source, customizer) {
  return customizer
    ? assignWith(object, source, customizer)
    : baseAssign(object, source);
});

module.exports = assign;

},{"lodash._baseassign":20,"lodash._createassigner":22,"lodash.keys":26}],20:[function(require,module,exports){
/**
 * lodash 3.2.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseCopy = require('lodash._basecopy'),
    keys = require('lodash.keys');

/**
 * The base implementation of `_.assign` without support for argument juggling,
 * multiple sources, and `customizer` functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @returns {Object} Returns `object`.
 */
function baseAssign(object, source) {
  return source == null
    ? object
    : baseCopy(source, keys(source), object);
}

module.exports = baseAssign;

},{"lodash._basecopy":21,"lodash.keys":26}],21:[function(require,module,exports){
/**
 * lodash 3.0.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * Copies properties of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy properties from.
 * @param {Array} props The property names to copy.
 * @param {Object} [object={}] The object to copy properties to.
 * @returns {Object} Returns `object`.
 */
function baseCopy(source, props, object) {
  object || (object = {});

  var index = -1,
      length = props.length;

  while (++index < length) {
    var key = props[index];
    object[key] = source[key];
  }
  return object;
}

module.exports = baseCopy;

},{}],22:[function(require,module,exports){
/**
 * lodash 3.1.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var bindCallback = require('lodash._bindcallback'),
    isIterateeCall = require('lodash._isiterateecall'),
    restParam = require('lodash.restparam');

/**
 * Creates a function that assigns properties of source object(s) to a given
 * destination object.
 *
 * **Note:** This function is used to create `_.assign`, `_.defaults`, and `_.merge`.
 *
 * @private
 * @param {Function} assigner The function to assign values.
 * @returns {Function} Returns the new assigner function.
 */
function createAssigner(assigner) {
  return restParam(function(object, sources) {
    var index = -1,
        length = object == null ? 0 : sources.length,
        customizer = length > 2 ? sources[length - 2] : undefined,
        guard = length > 2 ? sources[2] : undefined,
        thisArg = length > 1 ? sources[length - 1] : undefined;

    if (typeof customizer == 'function') {
      customizer = bindCallback(customizer, thisArg, 5);
      length -= 2;
    } else {
      customizer = typeof thisArg == 'function' ? thisArg : undefined;
      length -= (customizer ? 1 : 0);
    }
    if (guard && isIterateeCall(sources[0], sources[1], guard)) {
      customizer = length < 3 ? undefined : customizer;
      length = 1;
    }
    while (++index < length) {
      var source = sources[index];
      if (source) {
        assigner(object, source, customizer);
      }
    }
    return object;
  });
}

module.exports = createAssigner;

},{"lodash._bindcallback":23,"lodash._isiterateecall":24,"lodash.restparam":25}],23:[function(require,module,exports){
/**
 * lodash 3.0.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * A specialized version of `baseCallback` which only supports `this` binding
 * and specifying the number of arguments to provide to `func`.
 *
 * @private
 * @param {Function} func The function to bind.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {number} [argCount] The number of arguments to provide to `func`.
 * @returns {Function} Returns the callback.
 */
function bindCallback(func, thisArg, argCount) {
  if (typeof func != 'function') {
    return identity;
  }
  if (thisArg === undefined) {
    return func;
  }
  switch (argCount) {
    case 1: return function(value) {
      return func.call(thisArg, value);
    };
    case 3: return function(value, index, collection) {
      return func.call(thisArg, value, index, collection);
    };
    case 4: return function(accumulator, value, index, collection) {
      return func.call(thisArg, accumulator, value, index, collection);
    };
    case 5: return function(value, other, key, object, source) {
      return func.call(thisArg, value, other, key, object, source);
    };
  }
  return function() {
    return func.apply(thisArg, arguments);
  };
}

/**
 * This method returns the first argument provided to it.
 *
 * @static
 * @memberOf _
 * @category Utility
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'user': 'fred' };
 *
 * _.identity(object) === object;
 * // => true
 */
function identity(value) {
  return value;
}

module.exports = bindCallback;

},{}],24:[function(require,module,exports){
/**
 * lodash 3.0.9 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** Used to detect unsigned integer values. */
var reIsUint = /^\d+$/;

/**
 * Used as the [maximum length](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

/**
 * Checks if the provided arguments are from an iteratee call.
 *
 * @private
 * @param {*} value The potential iteratee value argument.
 * @param {*} index The potential iteratee index or key argument.
 * @param {*} object The potential iteratee object argument.
 * @returns {boolean} Returns `true` if the arguments are from an iteratee call, else `false`.
 */
function isIterateeCall(value, index, object) {
  if (!isObject(object)) {
    return false;
  }
  var type = typeof index;
  if (type == 'number'
      ? (isArrayLike(object) && isIndex(index, object.length))
      : (type == 'string' && index in object)) {
    var other = object[index];
    return value === value ? (value === other) : (other !== other);
  }
  return false;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = isIterateeCall;

},{}],25:[function(require,module,exports){
/**
 * lodash 3.6.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * Creates a function that invokes `func` with the `this` binding of the
 * created function and arguments from `start` and beyond provided as an array.
 *
 * **Note:** This method is based on the [rest parameter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters).
 *
 * @static
 * @memberOf _
 * @category Function
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 * @example
 *
 * var say = _.restParam(function(what, names) {
 *   return what + ' ' + _.initial(names).join(', ') +
 *     (_.size(names) > 1 ? ', & ' : '') + _.last(names);
 * });
 *
 * say('hello', 'fred', 'barney', 'pebbles');
 * // => 'hello fred, barney, & pebbles'
 */
function restParam(func, start) {
  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  start = nativeMax(start === undefined ? (func.length - 1) : (+start || 0), 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        rest = Array(length);

    while (++index < length) {
      rest[index] = args[start + index];
    }
    switch (start) {
      case 0: return func.call(this, rest);
      case 1: return func.call(this, args[0], rest);
      case 2: return func.call(this, args[0], args[1], rest);
    }
    var otherArgs = Array(start + 1);
    index = -1;
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = rest;
    return func.apply(this, otherArgs);
  };
}

module.exports = restParam;

},{}],26:[function(require,module,exports){
/**
 * lodash 3.1.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var getNative = require('lodash._getnative'),
    isArguments = require('lodash.isarguments'),
    isArray = require('lodash.isarray');

/** Used to detect unsigned integer values. */
var reIsUint = /^\d+$/;

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/* Native method references for those with the same name as other `lodash` methods. */
var nativeKeys = getNative(Object, 'keys');

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * A fallback implementation of `Object.keys` which creates an array of the
 * own enumerable property names of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function shimKeys(object) {
  var props = keysIn(object),
      propsLength = props.length,
      length = propsLength && object.length;

  var allowIndexes = !!length && isLength(length) &&
    (isArray(object) || isArguments(object));

  var index = -1,
      result = [];

  while (++index < propsLength) {
    var key = props[index];
    if ((allowIndexes && isIndex(key, length)) || hasOwnProperty.call(object, key)) {
      result.push(key);
    }
  }
  return result;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/6.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
var keys = !nativeKeys ? shimKeys : function(object) {
  var Ctor = object == null ? undefined : object.constructor;
  if ((typeof Ctor == 'function' && Ctor.prototype === object) ||
      (typeof object != 'function' && isArrayLike(object))) {
    return shimKeys(object);
  }
  return isObject(object) ? nativeKeys(object) : [];
};

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  if (object == null) {
    return [];
  }
  if (!isObject(object)) {
    object = Object(object);
  }
  var length = object.length;
  length = (length && isLength(length) &&
    (isArray(object) || isArguments(object)) && length) || 0;

  var Ctor = object.constructor,
      index = -1,
      isProto = typeof Ctor == 'function' && Ctor.prototype === object,
      result = Array(length),
      skipIndexes = length > 0;

  while (++index < length) {
    result[index] = (index + '');
  }
  for (var key in object) {
    if (!(skipIndexes && isIndex(key, length)) &&
        !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = keys;

},{"lodash._getnative":27,"lodash.isarguments":28,"lodash.isarray":29}],27:[function(require,module,exports){
/**
 * lodash 3.9.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var funcTag = '[object Function]';

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = object == null ? undefined : object[key];
  return isNative(value) ? value : undefined;
}

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 equivalents which return 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (isFunction(value)) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reIsHostCtor.test(value);
}

module.exports = getNative;

},{}],28:[function(require,module,exports){
/**
 * lodash 3.0.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Native method references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is classified as an `arguments` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
function isArguments(value) {
  return isObjectLike(value) && isArrayLike(value) &&
    hasOwnProperty.call(value, 'callee') && !propertyIsEnumerable.call(value, 'callee');
}

module.exports = isArguments;

},{}],29:[function(require,module,exports){
/**
 * lodash 3.0.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var arrayTag = '[object Array]',
    funcTag = '[object Function]';

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/* Native method references for those with the same name as other `lodash` methods. */
var nativeIsArray = getNative(Array, 'isArray');

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = object == null ? undefined : object[key];
  return isNative(value) ? value : undefined;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(function() { return arguments; }());
 * // => false
 */
var isArray = nativeIsArray || function(value) {
  return isObjectLike(value) && isLength(value.length) && objToString.call(value) == arrayTag;
};

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 equivalents which return 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (isFunction(value)) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reIsHostCtor.test(value);
}

module.exports = isArray;

},{}],30:[function(require,module,exports){
/**
 * lodash 3.1.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseAssign = require('lodash._baseassign'),
    baseCreate = require('lodash._basecreate'),
    isIterateeCall = require('lodash._isiterateecall');

/**
 * Creates an object that inherits from the given `prototype` object. If a
 * `properties` object is provided its own enumerable properties are assigned
 * to the created object.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} prototype The object to inherit from.
 * @param {Object} [properties] The properties to assign to the object.
 * @param- {Object} [guard] Enables use as a callback for functions like `_.map`.
 * @returns {Object} Returns the new object.
 * @example
 *
 * function Shape() {
 *   this.x = 0;
 *   this.y = 0;
 * }
 *
 * function Circle() {
 *   Shape.call(this);
 * }
 *
 * Circle.prototype = _.create(Shape.prototype, {
 *   'constructor': Circle
 * });
 *
 * var circle = new Circle;
 * circle instanceof Circle;
 * // => true
 *
 * circle instanceof Shape;
 * // => true
 */
function create(prototype, properties, guard) {
  var result = baseCreate(prototype);
  if (guard && isIterateeCall(prototype, properties, guard)) {
    properties = undefined;
  }
  return properties ? baseAssign(result, properties) : result;
}

module.exports = create;

},{"lodash._baseassign":31,"lodash._basecreate":37,"lodash._isiterateecall":38}],31:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"dup":20,"lodash._basecopy":32,"lodash.keys":33}],32:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"dup":21}],33:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"dup":26,"lodash._getnative":34,"lodash.isarguments":35,"lodash.isarray":36}],34:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"dup":27}],35:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],36:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],37:[function(require,module,exports){
/**
 * lodash 3.0.3 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * The base implementation of `_.create` without support for assigning
 * properties to the created object.
 *
 * @private
 * @param {Object} prototype The object to inherit from.
 * @returns {Object} Returns the new object.
 */
var baseCreate = (function() {
  function object() {}
  return function(prototype) {
    if (isObject(prototype)) {
      object.prototype = prototype;
      var result = new object;
      object.prototype = undefined;
    }
    return result || {};
  };
}());

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = baseCreate;

},{}],38:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"dup":24}],39:[function(require,module,exports){
/**
 * lodash 3.0.3 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var arrayEach = require('lodash._arrayeach'),
    baseEach = require('lodash._baseeach'),
    bindCallback = require('lodash._bindcallback'),
    isArray = require('lodash.isarray');

/**
 * Creates a function for `_.forEach` or `_.forEachRight`.
 *
 * @private
 * @param {Function} arrayFunc The function to iterate over an array.
 * @param {Function} eachFunc The function to iterate over a collection.
 * @returns {Function} Returns the new each function.
 */
function createForEach(arrayFunc, eachFunc) {
  return function(collection, iteratee, thisArg) {
    return (typeof iteratee == 'function' && thisArg === undefined && isArray(collection))
      ? arrayFunc(collection, iteratee)
      : eachFunc(collection, bindCallback(iteratee, thisArg, 3));
  };
}

/**
 * Iterates over elements of `collection` invoking `iteratee` for each element.
 * The `iteratee` is bound to `thisArg` and invoked with three arguments:
 * (value, index|key, collection). Iteratee functions may exit iteration early
 * by explicitly returning `false`.
 *
 * **Note:** As with other "Collections" methods, objects with a "length" property
 * are iterated like arrays. To avoid this behavior `_.forIn` or `_.forOwn`
 * may be used for object iteration.
 *
 * @static
 * @memberOf _
 * @alias each
 * @category Collection
 * @param {Array|Object|string} collection The collection to iterate over.
 * @param {Function} [iteratee=_.identity] The function invoked per iteration.
 * @param {*} [thisArg] The `this` binding of `iteratee`.
 * @returns {Array|Object|string} Returns `collection`.
 * @example
 *
 * _([1, 2]).forEach(function(n) {
 *   console.log(n);
 * }).value();
 * // => logs each value from left to right and returns the array
 *
 * _.forEach({ 'a': 1, 'b': 2 }, function(n, key) {
 *   console.log(n, key);
 * });
 * // => logs each value-key pair and returns the object (iteration order is not guaranteed)
 */
var forEach = createForEach(arrayEach, baseEach);

module.exports = forEach;

},{"lodash._arrayeach":40,"lodash._baseeach":41,"lodash._bindcallback":45,"lodash.isarray":46}],40:[function(require,module,exports){
/**
 * lodash 3.0.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.7.0 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * A specialized version of `_.forEach` for arrays without support for callback
 * shorthands or `this` binding.
 *
 * @private
 * @param {Array} array The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns `array`.
 */
function arrayEach(array, iteratee) {
  var index = -1,
      length = array.length;

  while (++index < length) {
    if (iteratee(array[index], index, array) === false) {
      break;
    }
  }
  return array;
}

module.exports = arrayEach;

},{}],41:[function(require,module,exports){
/**
 * lodash 3.0.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var keys = require('lodash.keys');

/**
 * Used as the [maximum length](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * The base implementation of `_.forEach` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Array|Object|string} collection The collection to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array|Object|string} Returns `collection`.
 */
var baseEach = createBaseEach(baseForOwn);

/**
 * The base implementation of `baseForIn` and `baseForOwn` which iterates
 * over `object` properties returned by `keysFunc` invoking `iteratee` for
 * each property. Iteratee functions may exit iteration early by explicitly
 * returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

/**
 * The base implementation of `_.forOwn` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForOwn(object, iteratee) {
  return baseFor(object, iteratee, keys);
}

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Creates a `baseEach` or `baseEachRight` function.
 *
 * @private
 * @param {Function} eachFunc The function to iterate over a collection.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseEach(eachFunc, fromRight) {
  return function(collection, iteratee) {
    var length = collection ? getLength(collection) : 0;
    if (!isLength(length)) {
      return eachFunc(collection, iteratee);
    }
    var index = fromRight ? length : -1,
        iterable = toObject(collection);

    while ((fromRight ? index-- : ++index < length)) {
      if (iteratee(iterable[index], index, iterable) === false) {
        break;
      }
    }
    return collection;
  };
}

/**
 * Creates a base function for `_.forIn` or `_.forInRight`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var iterable = toObject(object),
        props = keysFunc(object),
        length = props.length,
        index = fromRight ? length : -1;

    while ((fromRight ? index-- : ++index < length)) {
      var key = props[index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Converts `value` to an object if it's not one.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {Object} Returns the object.
 */
function toObject(value) {
  return isObject(value) ? value : Object(value);
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = baseEach;

},{"lodash.keys":42}],42:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"dup":26,"lodash._getnative":43,"lodash.isarguments":44,"lodash.isarray":46}],43:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"dup":27}],44:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],45:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"dup":23}],46:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],47:[function(require,module,exports){
/**
 * lodash 3.1.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var arrayMap = require('lodash._arraymap'),
    baseDifference = require('lodash._basedifference'),
    baseFlatten = require('lodash._baseflatten'),
    bindCallback = require('lodash._bindcallback'),
    pickByArray = require('lodash._pickbyarray'),
    pickByCallback = require('lodash._pickbycallback'),
    keysIn = require('lodash.keysin'),
    restParam = require('lodash.restparam');

/**
 * The opposite of `_.pick`; this method creates an object composed of the
 * own and inherited enumerable properties of `object` that are not omitted.
 * Property names may be specified as individual arguments or as arrays of
 * property names. If `predicate` is provided it is invoked for each property
 * of `object` omitting the properties `predicate` returns truthy for. The
 * predicate is bound to `thisArg` and invoked with three arguments:
 * (value, key, object).
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The source object.
 * @param {Function|...(string|string[])} [predicate] The function invoked per
 *  iteration or property names to omit, specified as individual property
 *  names or arrays of property names.
 * @param {*} [thisArg] The `this` binding of `predicate`.
 * @returns {Object} Returns the new object.
 * @example
 *
 * var object = { 'user': 'fred', 'age': 40 };
 *
 * _.omit(object, 'age');
 * // => { 'user': 'fred' }
 *
 * _.omit(object, _.isNumber);
 * // => { 'user': 'fred' }
 */
var omit = restParam(function(object, props) {
  if (object == null) {
    return {};
  }
  if (typeof props[0] != 'function') {
    var props = arrayMap(baseFlatten(props), String);
    return pickByArray(object, baseDifference(keysIn(object), props));
  }
  var predicate = bindCallback(props[0], props[1], 3);
  return pickByCallback(object, function(value, key, object) {
    return !predicate(value, key, object);
  });
});

module.exports = omit;

},{"lodash._arraymap":48,"lodash._basedifference":49,"lodash._baseflatten":54,"lodash._bindcallback":57,"lodash._pickbyarray":58,"lodash._pickbycallback":59,"lodash.keysin":61,"lodash.restparam":64}],48:[function(require,module,exports){
/**
 * lodash 3.0.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.7.0 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * A specialized version of `_.map` for arrays without support for callback
 * shorthands or `this` binding.
 *
 * @private
 * @param {Array} array The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function arrayMap(array, iteratee) {
  var index = -1,
      length = array.length,
      result = Array(length);

  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }
  return result;
}

module.exports = arrayMap;

},{}],49:[function(require,module,exports){
/**
 * lodash 3.0.3 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseIndexOf = require('lodash._baseindexof'),
    cacheIndexOf = require('lodash._cacheindexof'),
    createCache = require('lodash._createcache');

/** Used as the size to enable large array optimizations. */
var LARGE_ARRAY_SIZE = 200;

/**
 * The base implementation of `_.difference` which accepts a single array
 * of values to exclude.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {Array} values The values to exclude.
 * @returns {Array} Returns the new array of filtered values.
 */
function baseDifference(array, values) {
  var length = array ? array.length : 0,
      result = [];

  if (!length) {
    return result;
  }
  var index = -1,
      indexOf = baseIndexOf,
      isCommon = true,
      cache = (isCommon && values.length >= LARGE_ARRAY_SIZE) ? createCache(values) : null,
      valuesLength = values.length;

  if (cache) {
    indexOf = cacheIndexOf;
    isCommon = false;
    values = cache;
  }
  outer:
  while (++index < length) {
    var value = array[index];

    if (isCommon && value === value) {
      var valuesIndex = valuesLength;
      while (valuesIndex--) {
        if (values[valuesIndex] === value) {
          continue outer;
        }
      }
      result.push(value);
    }
    else if (indexOf(values, value, 0) < 0) {
      result.push(value);
    }
  }
  return result;
}

module.exports = baseDifference;

},{"lodash._baseindexof":50,"lodash._cacheindexof":51,"lodash._createcache":52}],50:[function(require,module,exports){
/**
 * lodash 3.1.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * The base implementation of `_.indexOf` without support for binary searches.
 *
 * @private
 * @param {Array} array The array to search.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseIndexOf(array, value, fromIndex) {
  if (value !== value) {
    return indexOfNaN(array, fromIndex);
  }
  var index = fromIndex - 1,
      length = array.length;

  while (++index < length) {
    if (array[index] === value) {
      return index;
    }
  }
  return -1;
}

/**
 * Gets the index at which the first occurrence of `NaN` is found in `array`.
 * If `fromRight` is provided elements of `array` are iterated from right to left.
 *
 * @private
 * @param {Array} array The array to search.
 * @param {number} fromIndex The index to search from.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {number} Returns the index of the matched `NaN`, else `-1`.
 */
function indexOfNaN(array, fromIndex, fromRight) {
  var length = array.length,
      index = fromIndex + (fromRight ? 0 : -1);

  while ((fromRight ? index-- : ++index < length)) {
    var other = array[index];
    if (other !== other) {
      return index;
    }
  }
  return -1;
}

module.exports = baseIndexOf;

},{}],51:[function(require,module,exports){
/**
 * lodash 3.0.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * Checks if `value` is in `cache` mimicking the return signature of
 * `_.indexOf` by returning `0` if the value is found, else `-1`.
 *
 * @private
 * @param {Object} cache The cache to search.
 * @param {*} value The value to search for.
 * @returns {number} Returns `0` if `value` is found, else `-1`.
 */
function cacheIndexOf(cache, value) {
  var data = cache.data,
      result = (typeof value == 'string' || isObject(value)) ? data.set.has(value) : data.hash[value];

  return result ? 0 : -1;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = cacheIndexOf;

},{}],52:[function(require,module,exports){
(function (global){
/**
 * lodash 3.1.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var getNative = require('lodash._getnative');

/** Native method references. */
var Set = getNative(global, 'Set');

/* Native method references for those with the same name as other `lodash` methods. */
var nativeCreate = getNative(Object, 'create');

/**
 *
 * Creates a cache object to store unique values.
 *
 * @private
 * @param {Array} [values] The values to cache.
 */
function SetCache(values) {
  var length = values ? values.length : 0;

  this.data = { 'hash': nativeCreate(null), 'set': new Set };
  while (length--) {
    this.push(values[length]);
  }
}

/**
 * Adds `value` to the cache.
 *
 * @private
 * @name push
 * @memberOf SetCache
 * @param {*} value The value to cache.
 */
function cachePush(value) {
  var data = this.data;
  if (typeof value == 'string' || isObject(value)) {
    data.set.add(value);
  } else {
    data.hash[value] = true;
  }
}

/**
 * Creates a `Set` cache object to optimize linear searches of large arrays.
 *
 * @private
 * @param {Array} [values] The values to cache.
 * @returns {null|Object} Returns the new cache object if `Set` is supported, else `null`.
 */
function createCache(values) {
  return (nativeCreate && Set) ? new SetCache(values) : null;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

// Add functions to the `Set` cache.
SetCache.prototype.push = cachePush;

module.exports = createCache;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"lodash._getnative":53}],53:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"dup":27}],54:[function(require,module,exports){
/**
 * lodash 3.1.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var isArguments = require('lodash.isarguments'),
    isArray = require('lodash.isarray');

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Used as the [maximum length](http://ecma-international.org/ecma-262/6.0/#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Appends the elements of `values` to `array`.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {Array} values The values to append.
 * @returns {Array} Returns `array`.
 */
function arrayPush(array, values) {
  var index = -1,
      length = values.length,
      offset = array.length;

  while (++index < length) {
    array[offset + index] = values[index];
  }
  return array;
}

/**
 * The base implementation of `_.flatten` with added support for restricting
 * flattening and specifying the start index.
 *
 * @private
 * @param {Array} array The array to flatten.
 * @param {boolean} [isDeep] Specify a deep flatten.
 * @param {boolean} [isStrict] Restrict flattening to arrays-like objects.
 * @param {Array} [result=[]] The initial result value.
 * @returns {Array} Returns the new flattened array.
 */
function baseFlatten(array, isDeep, isStrict, result) {
  result || (result = []);

  var index = -1,
      length = array.length;

  while (++index < length) {
    var value = array[index];
    if (isObjectLike(value) && isArrayLike(value) &&
        (isStrict || isArray(value) || isArguments(value))) {
      if (isDeep) {
        // Recursively flatten arrays (susceptible to call stack limits).
        baseFlatten(value, isDeep, isStrict, result);
      } else {
        arrayPush(result, value);
      }
    } else if (!isStrict) {
      result[result.length] = value;
    }
  }
  return result;
}

/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792)
 * that affects Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

/**
 * Checks if `value` is array-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value));
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

module.exports = baseFlatten;

},{"lodash.isarguments":55,"lodash.isarray":56}],55:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],56:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],57:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"dup":23}],58:[function(require,module,exports){
/**
 * lodash 3.0.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * A specialized version of `_.pick` which picks `object` properties specified
 * by `props`.
 *
 * @private
 * @param {Object} object The source object.
 * @param {string[]} props The property names to pick.
 * @returns {Object} Returns the new object.
 */
function pickByArray(object, props) {
  object = toObject(object);

  var index = -1,
      length = props.length,
      result = {};

  while (++index < length) {
    var key = props[index];
    if (key in object) {
      result[key] = object[key];
    }
  }
  return result;
}

/**
 * Converts `value` to an object if it's not one.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {Object} Returns the object.
 */
function toObject(value) {
  return isObject(value) ? value : Object(value);
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = pickByArray;

},{}],59:[function(require,module,exports){
/**
 * lodash 3.0.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.7.0 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var baseFor = require('lodash._basefor'),
    keysIn = require('lodash.keysin');

/**
 * The base implementation of `_.forIn` without support for callback
 * shorthands and `this` binding.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Object} Returns `object`.
 */
function baseForIn(object, iteratee) {
  return baseFor(object, iteratee, keysIn);
}

/**
 * A specialized version of `_.pick` that picks `object` properties `predicate`
 * returns truthy for.
 *
 * @private
 * @param {Object} object The source object.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {Object} Returns the new object.
 */
function pickByCallback(object, predicate) {
  var result = {};
  baseForIn(object, function(value, key, object) {
    if (predicate(value, key, object)) {
      result[key] = value;
    }
  });
  return result;
}

module.exports = pickByCallback;

},{"lodash._basefor":60,"lodash.keysin":61}],60:[function(require,module,exports){
/**
 * lodash 3.0.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/**
 * The base implementation of `baseForIn` and `baseForOwn` which iterates
 * over `object` properties returned by `keysFunc` invoking `iteratee` for
 * each property. Iteratee functions may exit iteration early by explicitly
 * returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

/**
 * Creates a base function for `_.forIn` or `_.forInRight`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var iterable = toObject(object),
        props = keysFunc(object),
        length = props.length,
        index = fromRight ? length : -1;

    while ((fromRight ? index-- : ++index < length)) {
      var key = props[index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

/**
 * Converts `value` to an object if it's not one.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {Object} Returns the object.
 */
function toObject(value) {
  return isObject(value) ? value : Object(value);
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = baseFor;

},{}],61:[function(require,module,exports){
/**
 * lodash 3.0.8 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var isArguments = require('lodash.isarguments'),
    isArray = require('lodash.isarray');

/** Used to detect unsigned integer values. */
var reIsUint = /^\d+$/;

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used as the [maximum length](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-number.max_safe_integer)
 * of an array-like value.
 */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
  length = length == null ? MAX_SAFE_INTEGER : length;
  return value > -1 && value % 1 == 0 && value < length;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is based on [`ToLength`](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength).
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 */
function isLength(value) {
  return typeof value == 'number' && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  if (object == null) {
    return [];
  }
  if (!isObject(object)) {
    object = Object(object);
  }
  var length = object.length;
  length = (length && isLength(length) &&
    (isArray(object) || isArguments(object)) && length) || 0;

  var Ctor = object.constructor,
      index = -1,
      isProto = typeof Ctor == 'function' && Ctor.prototype === object,
      result = Array(length),
      skipIndexes = length > 0;

  while (++index < length) {
    result[index] = (index + '');
  }
  for (var key in object) {
    if (!(skipIndexes && isIndex(key, length)) &&
        !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = keysIn;

},{"lodash.isarguments":62,"lodash.isarray":63}],62:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"dup":28}],63:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"dup":29}],64:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25}],65:[function(require,module,exports){
module.exports={
  "name": "angular-debaser",
  "version": "0.3.3",
  "main": "lib/index.js",
  "description": "Just a better way to test AngularJS apps",
  "devDependencies": {
    "angular": "^1.4.3",
    "angular-mocks": "^1.4.3",
    "chai": "^3.2.0",
    "exposify": "^0.4.3",
    "grunt": "^0.4.5",
    "grunt-bower-install-simple": "^1.1.3",
    "grunt-browserify": "^3.9.0",
    "grunt-bump": "^0.3.1",
    "grunt-cli": "^0.1.13",
    "grunt-contrib-clean": "^0.6.0",
    "grunt-contrib-uglify": "^0.9.1",
    "grunt-contrib-watch": "^0.6.1",
    "grunt-dev-update": "^1.3.0",
    "grunt-gh-pages": "^0.10.0",
    "grunt-jsdoc": "^0.6.7",
    "grunt-mochify": "^0.2.0",
    "jasmine-core": "^2.3.4",
    "jit-grunt": "^0.9.1",
    "jsdoc": "^3.3.0-alpha9",
    "jsonminifyify": "^0.1.1",
    "load-grunt-config": "^0.17.2",
    "sinon": "^1.15.4",
    "sinon-chai": "^2.8.0",
    "time-grunt": "^1.2.1",
    "uglifyify": "^3.0.1"
  },
  "scripts": {
    "test": "grunt test"
  },
  "repository": {
    "type": "git",
    "url": "git://github.com/decipherinc/angular-debaser"
  },
  "author": {
    "name": "Christopher Hiller",
    "email": "chiller@decipherinc.com"
  },
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/decipherinc/angular-debaser/issues"
  },
  "homepage": "https://github.com/decipherinc/angular-debaser",
  "dependencies": {
    "lodash.assign": "^3.2.0",
    "lodash.create": "^3.1.1",
    "lodash.foreach": "^3.0.3",
    "lodash.omit": "^3.1.0"
  },
  "peerDependencies": {
    "angular": "^1.2.0",
    "angular-mocks": "^1.2.0"
  }
}

},{}]},{},[6]);
