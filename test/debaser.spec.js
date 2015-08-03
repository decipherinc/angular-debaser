'use strict';

require('./fixture');

describe('Debaser', function () {
  var createDebaser = require('../lib/debaser');
  var sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create('Debaser');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('Debaser factory', function () {
    it('should set defaults', function () {
      var d = createDebaser();
      expect(d.name).to.be.undefined;
      expect(d.$queue).to.eql([]);
      expect(d.$$aspect.name).to.equal('base');
    });
  });

  describe('method', function () {

    var d;

    beforeEach(function () {
      d = createDebaser();
    });

    describe('$aspect()', function () {

      it('should return same type of Aspect', function () {
        expect(d.$$aspect.name).to.equal(d.$aspect().name);
      });

      it('should shift Aspects', function () {
        var prevAspect = d.$aspect();
        expect(d.$$aspect.name).to.equal('base');
        expect(d.$aspect()).not.to.be.undefined;
        d.$aspect('some other aspect');
        expect(d.$$aspect.name).to.equal('some other aspect');
        expect(d.$aspect()).to.not.equal(prevAspect);
      });

    });

    describe('debase()', function () {

      it('should execute the functions in the queue', function () {
        var spy = sandbox.spy();
        d.$queue.push(spy);
        d.debase();
        expect(spy).to.have.been.called;
        expect(d.$queue.length).to.equal(0);
      });

      it('should return nothing', function () {
        expect(d.debase()).to.be.undefined;
      });

      it('should flush the current aspect, empty the queue, and reset the aspect',
        function () {
          var queue;
          var Utils = require('../lib/utils');
          sandbox.spy(d.$$aspect, 'flush');
          sandbox.spy(d, '$aspect');
          sandbox.stub(angular, 'module');
          sandbox.stub(angular.mock, 'module');
          d.module('foo');
          expect(d.$aspect).to.have.been.calledOnce;
          expect(d.$aspect).to.have.been.calledWith('module');
          expect(d.$$aspect.name).to.equal('module');
          queue = d.$queue;
          expect(queue.length).to.equal(0);
          sandbox.spy(Utils, 'each');
          d.debase();
          expect(Utils.each).to.have.been.calledThrice;
          expect(d.$queue.length).to.equal(0);
          expect(d.$aspect).to.have.been.calledTwice;
          expect(d.$aspect).to.have.been.calledWith('base');
          expect(d.$$aspect.name).to.equal('base');
        });
    });
  });
});
