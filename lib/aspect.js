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
