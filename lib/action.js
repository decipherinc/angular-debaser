'use strict';

var Utils = require('./utils');

/**
 * @description Creates a new Action object.
 * @param {object} action Raw action object
 * @param {function} [action.callback=angular.noop] Function to call with the
 *     return value of the main Function to call
 * @param {object} [action.object] Object containing main Function to call
 * @param {function} action.func Main Function to call
 * @param {object} [action.context=null] Context to call main Function with
 * @param {Array} [action.args=[]] Arguments to function
 * @constructor
 * @ignore
 * @memberof loadAction
 */

var Action = {
  assemble: function assemble() {
    /**
     * @description Executes an assembled function
     * @memberof! Action#assemble
     * @inner
     */
    function action() {
      this.callback(this.object ?
        this.object[this.func].apply(this.context, this.args) :
        this.func.apply(this.context, this.args));
    }

    return Utils.bind(this, action);
  }
};

/**
 * @description Accepts a {@link Config} object, constructs and returns
 * {@link Action} instances from its `actions` property
 * @constructs Action
 * @private
 */
function loadAction(cfg) {
  return cfg.actions.map(function (action) {
    return Utils.create(Action, Utils.extend({
      callback: Utils.noop,
      context: null
    }, action));
  });
}

module.exports = loadAction;
