'use strict';

var Utils = require('../utils');

module.exports = Utils.extend({
  func: require('./func'),
  module: require('./module'),
  object: require('./object'),
  withDep: require('./with-dep'),
  withDeps: require('./with-deps'),
  withFunc: require('./with-func'),
  withObject: require('./with-object')
}, Utils.omit(require('./sinon'), '$sinon'));

/**
 * @external sinon.stub
 * @description A stub function.  (Almost) all functions available to Sinon.JS
 *     stubs.
 * @see http://sinonjs.org/docs/#stubs
 * @mixin sinon.stub
 */

/**
 * @external sinon.Stub
 * @description
 * A Stub object.  Returned when using an `*onCall*` method, instead of a
 *     {@link sinon.stub stub}.  In this context, use {@link sinon.Stub.end
 *     end()} to return to a {@link Debaser} instance.
 * > The `create()`, `resetBehavior()` and `isPresent()` functions of the
 *     Sinon.JS "stub" API are not used.  If someone needs these, please {@link
  *     https://github.com/decipherinc/angular-debaser/issues/ create an issue}
 *     and provide a use case.
 * @mixin sinon.Stub
 */

/**
 * @namespace base
 * @mixin
 */

/**
 * @namespace module
 * @memberof base
 * @mixin
 * @mixes base.object
 */

/**
 * @namespace func
 * @memberof base
 * @mixin
 * @mixes sinon.stub
 */

/**
 * @namespace object
 * @memberof base
 * @mixin
 */

/**
 * @namespace withObject
 * @memberof base.module
 * @mixes base.object
 * @mixin
 */

/**
 * @namespace withFunc
 * @memberof base.module
 * @mixes base.func
 * @mixin
 */

/**
 * @typedef {function} Action
 * @summary A method (on a {@link Debaser} instance) which tells
 *     angular-debaser to provide some object, method, function, etc.
 * @description These functions will always return {@link Debaser} instances,
 *     however, the mixins used will change.  The "root" mixin is the {@link
  *     base} mixin.  All other mixins "inherit" from this one, meaning the
 *     {@link base} methods *will always be available*.
 * @example
 * debaser
 *   .object('Foo') // we are now in the `base.object` mixin.
 *   .withFunc('bar') // we are now in the `base.withFunc` mixin.
 *   // however, since these mixins are inherited, we always have access to
 *   // method `object`, which is on the `base` mixin.
 *   .object('Baz')
 *   .debase(); // go!
 *   // `Foo` and `Baz` are now injectable; `Foo` has a static function `bar`
 *
 */
