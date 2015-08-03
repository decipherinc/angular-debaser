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
