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
      return require('sinon');
    } catch (ignored) {
      return null;
    }
  }
});

if ((sinon = sinonPowers.$sinon)) {
  Utils.each(Utils.functions(sinon.stub), function (name) {
    var fn = sinon.stub[name];

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
