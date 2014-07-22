'use strict';

/**
The behaviour module is concerned with behaviour. Be on your best behaviour. It exports
a single class, entitled Behaviour. 
@module behaviour
@example
```js
var Behaviour = angular.module("decipher.debaser.behavior");
```
*/

angular.module('decipher.debaser').factory('decipher.debaser.behavior',
  ['decipher.debaser.config', function $behaviorFactory(Config) {
      
    /**
    @class
    @classdesc The main behaviour class
    @param {object} - the input object
    @param {string} - the aspect name
    @alias module:behaviour
    */
    var Behavior = function Behavior(o, aspect_name) {
      angular.extend(this, o);
      this._aspect_name = aspect_name;
      this._id = Behavior._id++;
    };

    /**
    the ID class property. Not intended for public use. 
    @protected
    */
    Behavior._id = 0;

    /**
    Enqueue something
    @param {array} - the calls to enqueue
    @return {undefined} nothing returned
    */
    Behavior.prototype.enqueue = function enqueue(calls) {
      this.queue.push.apply(this.queue, calls);
    };

    /**
    Flush everything
    @return {array} the results of the flushings
    */
    Behavior.prototype.flush = function flush() {
      return this.queue.map(function (action) {
        return action.deserialize();
      });
    };

    Object.defineProperties(Behavior.prototype, {
      /**
      The queue
      @property queue
      @instance
      @type {object}
      */
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

      /**
      The config
      @property config
      @instance
      @type {object}
      */
      config: {
        get: function getConfig() {
          if (!this._config) {
            this._config = new Config(this._aspect_name);
          }
          return this._config;
        },
        set: function setConfig(config) {
          this._config = config || new Config(this._aspect_name);
        }
      }
    });

    return Behavior;
  }]);
