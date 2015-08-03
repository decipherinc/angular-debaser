'use strict';

var Utils = require('../utils');
var angular = require('angular');
var ngMock = require('../ng-mock');
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
  this.module = name;
  this.moduleDependencies = [];
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
    func: 'module',
    args: realModule ? [this.module] : [this.module, this.moduleDependencies]
  });
  this.addAction({
    object: ngMock,
    func: 'module',
    args: [this.module]
  });
  return loadAction(this);
}
mod.$aspect = ['base'];
mod.$id = 0;
mod.$name = 'module';

module.exports = mod;
