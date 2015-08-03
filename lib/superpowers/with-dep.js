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
    return;
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
