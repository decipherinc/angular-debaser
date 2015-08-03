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
