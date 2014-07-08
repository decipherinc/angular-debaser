(function (window, angular) {

  'use strict';

  var DEFAULTS = {
    debugEnabled: false,
    autoScope: true,
    skipConfigs: true
  };

  var setup = function setup(options) {
    var _setup = function _setup($provide) {
      $provide.constant('decipher.debaser.options',
        angular.extend({}, DEFAULTS, options));
    };
    _setup.$inject = ['$provide'];
    return _setup;
  };

  var debaser = function debaser(name, opts) {
    var Debaser,
        instance,
        debasers = window.debaser.$$debasers,
        injector;

    if (angular.isObject(name)) {
      opts = name;
      name = null;
    }

    if (!name && debasers.__default__) {
      return debasers.__default__;
    }

    opts = opts || {};
    injector = angular.injector(['ng', setup(opts), 'decipher.debaser']);
    Debaser = injector.get('decipher.debaser.debaser');

    if (name) {
      if (!debasers[name]) {
        debasers[name] = new Debaser(name);
      }
      return debasers[name];
    }
    debasers.__default__ = instance = new Debaser();
    window.debase = instance.debase.bind(instance);
    angular.mock.module(setup(opts), 'decipher.debaser');
    return instance;
  };
  debaser.$$debasers = {};
  debaser.$$config = {};

  window.debaser = debaser;

})(window, window.angular);