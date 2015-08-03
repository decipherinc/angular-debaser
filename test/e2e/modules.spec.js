'use strict';

var debaser = require('../../lib/').debaser;
var angular = require('angular');

describe('multiple modules', function () {

  var marvin = 'marvin o\'gravel balloon face';

  before(function () {
    angular.module('putt-putt', [])
      .factory('moonface', function (ziggy) {
        return ziggy();
      });
  });

  beforeEach(function () {
    expect(function () {
      debaser({ skipConfigs: true })
        .module('putt-putt')
        .module('soggy muff')
        .module('buffalo bill')
        .module('biffalo buff')
        .object('sneepy')
        .func('weepyWeed')
        .object('paris_garters')
        .func('ziggy')
        .returns(marvin)
        .object('harris_tweed')
        .debase();
    }).not.to.throw();
  });

  describe('putt-putt', function () {

    var moonface;

    beforeEach(function () {
      require('../../lib/ng-mock');
    });

    beforeEach(window.inject(function (_moonface_) {
      moonface = _moonface_;
    }));

    it('should provide "moonface", a function which returns "marvin"',
      function () {
        expect(moonface).to.equal(marvin);
      });

  });
});

