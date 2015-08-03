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
    return;
  }
  if (!Utils.isArray(arr)) {
    throw new Error('$debaser: withDeps() expects an array');
  }
  require('./with-dep').apply(this, arr);
}
withDeps.$aspect = ['module'];
withDeps.$name = 'withDeps';

module.exports = withDeps;
