'use strict';

var angular = require('angular');

var Utils = {
  extend: require('lodash.assign'),
  create: require('lodash.create'),
  each: require('lodash.foreach'),
  omit: require('lodash.omit'),
  functions: require('lodash.functions'),
  bind: angular.bind,
  isString: angular.isString,
  isObject: angular.isObject,
  isFunction: angular.isFunction,
  isUndefined: angular.isUndefined,
  isArray: angular.isArray,
  noop: angular.noop,
  keys: Object.keys,
  isDefined: function isDefined(value) {
    return !Utils.isUndefined(value);
  },
  isSinon: function isSinon(value) {
    return value.displayName === 'stub' ||
      value.displayName === 'spy';
  },
};

module.exports = Utils;
