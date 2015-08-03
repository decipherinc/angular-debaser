'use strict';

var angular = require('angular');

/**
 * @summary Options, and their defaults, which you can pass into {@link debaser
 *     window.debaser()}.
 * @description Default options
 * @typedef {Object} DebaserOptions
 * @property {boolean} [debugEnabled=false] Enable debug log messages?
 * @property {boolean} [autoScope=true] Enable auto-scope functionality when
 *     using {@link ng.$controller}?
 * @property {boolean} [skipConfigs=true] Enable stubbing of `config()` blocks?
 * @property {string} [defaultName=__default__] Default name of default Debaser
 *     instance; useless
 * @global
 */
var DEFAULT_OPTS = {
  debugEnabled: false,
  autoScope: true,
  skipConfigs: true,
  defaultName: '__default__'
};

function options(opts) {
  options.opts = angular.extend(options.opts, opts);

  return {
    opts: options.opts,
    runConfig: options.runConfig
  };
}

/*
 * @description Run configurations.  Mapping of {@link Config#_id} to {@link
 *     Config} objects. **Exposed for unit testing**
 * @todo test
 * @type {Object.<String,Config>}
 * @private
 */
options.runConfig = {};
options.opts = angular.extend({}, DEFAULT_OPTS);

module.exports = options;
