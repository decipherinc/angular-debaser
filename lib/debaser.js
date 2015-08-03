'use strict';

var createAspect = require('./aspect');
var opts = require('./options').opts;
var Utils = require('./utils');

/**
 * @description Provides an object with which you can stub AngularJS
 *     dependencies.  Do not attempt to instantiate this class directly; use
 *     the {@link debaser} function instead.
 * @public
 * @mixes base
 * @global
 */
var Debaser = {
  tap: function tap(func) {
    try {
      func(this);
    } catch (ignored) {
      // ignored
    }
    return this;
  },
  $aspect: function aspect(name) {
    var currentAspect = this.$$aspect;
    var aspect;
    var proto;
    if (Utils.isUndefined(name)) {
      name = currentAspect.name;
    }
    if (currentAspect) {
      proto = currentAspect.proto;
      Utils.each(proto, function(value, key) {
        delete this[key];
      }, this);
    }
    aspect = createAspect(name, currentAspect);
    Utils.extend(this, aspect.proto);
    this.$$aspect = aspect;
    return aspect;
  },
  $enqueue: function enqueue() {
    var currentAspect = this.$$aspect;
    if (currentAspect) {
      this.$queue.push.apply(this.$queue, currentAspect.flush());
    }
  },
  /**
   * @description All previously queued stubs will be installed upon execution
   *     of this method.
   * @param {Object} [opts] Options
   * @param {boolean} [opts.persist=false] If true, retain the queue.  Only
   *     used in a non-spec context; {@link debase window.debase} can call it
   *     with this option.  You probably don't want to specify this yourself.
   * @returns undefined
   */
  debase: function debase(opts) {
    opts = opts || {};
    this.$enqueue();
    if (global.jasmine) {
      require('./ng-mock').module(function ($provide) {
        $provide.value('$$jasmineHack$$', null);
      });
    }
    Utils.each(this.$queue, function (fn) {
      fn();
    });
    if (!opts.persist) {
      this.$queue = [];
    }
    this.$aspect('base');
    if (opts.autoScope) {
      require('./ng-mock').module(autoScopeProvider);
    }
  }
};

function autoScopeProvider($provide) {
  $provide.decorator('$controller',
    [
      '$rootScope', '$delegate', function ($rootScope, $delegate) {
      return function (name, locals) {
        locals = locals || {};
        if (!locals.$scope) {
          locals.$scope = $rootScope.$new();
        }
        $delegate(name, locals);
        return locals.$scope;
      };
    }
    ]);
}
autoScopeProvider.$inject = ['$provide'];

function createDebaser(name) {
  var aspect = createAspect();
  if (!Utils.isString(name)) {
    name = opts.defaultName;
  }
  return Utils.create(Debaser, Utils.extend({
    $name: name,
    $queue: [],
    $$aspect: aspect
  }, aspect.proto));
}

module.exports = createDebaser;
