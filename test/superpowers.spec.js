'use strict';

var Utils = require('../lib/utils');

require('./fixture');

describe('superpowers', function () {

  var powers;
  var config;

  beforeEach(function () {
    config = {};
  });

  describe('sinon proxy functions', function () {
    it('should return the proper objects', function () {
      var stub = sinon.stub;
      var args = {
        callsArg: [0],
        callsArgOn: [0, {}],
        callsArgWith: [0],
        callsArgOnWith: [0, {}],
        yieldsOn: [{}],
        yieldsToOn: ['foo', {}],
        callsArgAsync: [0],
        callsArgOnAsync: [0, {}],
        callsArgWithAsync: [0],
        callsArgOnWithAsync: [0, {}],
        yieldsOnAsync: [{}],
        yieldsToOnAsync: ['foo', {}],
        returnsArg: [0]
      };

      Utils.each(stub, function (fn, name) {
        var result;
        config.func = stub();
        if (Utils.isFunction(fn) &&
          powers.$SINON_EXCLUDE.indexOf(name) === -1) {
          expect(powers[name]).to.be.a('function');
          if ([
              'onCall', 'onFirstCall', 'onSecondCall',
              'onThirdCall'
            ].indexOf(name) > -1) {
            result = powers[name].apply(config, args[name]);
            expect(result).to.be.an('object');
            expect(result.end).to.be.a('function');
            expect(result.end()).to.equal(config);
          }
          else {
            expect(powers[name].apply(config, args[name])).to.be.undefined;
          }
        }
      });
    });
  });

});

