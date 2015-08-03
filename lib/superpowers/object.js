'use strict';

var ngMock = require('../ng-mock');
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
    return;
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
        object: ngMock,
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
