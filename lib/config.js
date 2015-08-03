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
