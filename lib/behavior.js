'use strict';

var createConfig = require('./config');
var Utils = require('./utils');

var id = 0;

var Behavior = {
  enqueue: function enqueue(calls) {
    this.queue.push.apply(this.queue, calls);
  },
  flush: function flush() {
    return this.queue.map(function (action) {
      return action.assemble();
    });
  }
};

Object.defineProperties(Behavior, {
  queue: {
    get: function getQueue() {
      if (!this._queue) {
        this._queue = [];
      }
      return this._queue;
    },
    set: function setQueue(queue) {
      this._queue = queue || [];
    }
  },
  config: {
    get: function getConfig() {
      if (!this._config) {
        this._config = createConfig(this._aspectName);
      }
      return this._config;
    },
    set: function setConfig(config) {
      this._config = config || createConfig(this._aspectName);
    }
  }
});

function createBehavior(obj, aspectName) {
  if (Utils.isString(obj)) {
    aspectName = obj;
    obj = {};
  }
  obj = obj || {};
  return Utils.create(Behavior, Utils.extend(obj, {
    _aspectName: aspectName,
    _id: id++
  }));
}

module.exports = createBehavior;
