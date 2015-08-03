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
    return;
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
