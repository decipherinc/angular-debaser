'use strict';
require('./fixture');

describe('Config', function () {
  var createConfig = require('../lib/config');
  var sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create('Config');
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('factory', function () {
    it('should initialize callbacks, calls, id and callback idx',
      function () {
        var cc = createConfig();
        expect(cc._callbacks).to.eql([]);
        expect(cc._cbIdx).to.equal(0);
        expect(cc._id).to.equal(0);
        expect(cc.actions).to.eql([]);
      });

    it('should extend itself with a passed object', function () {
      var cc = createConfig({ foo: 'bar' });
      expect(cc.foo).to.equal('bar');
    });

    it('should not overwrite calls if present', function () {
      var cc = createConfig({ actions: 'schmalls' });
      expect(cc.actions).to.equal('schmalls');
    });
  });

  describe('method', function () {
    var cc;

    beforeEach(function () {
      cc = createConfig();
    });

    describe('addCall()', function () {
      it('should throw if passed nothing', function () {
        expect(function () {
          cc.addAction();
        }).to.throw('$debaser: addCall() expects call options');
      });

      it('should push data onto calls array', function () {
        sandbox.stub(cc, 'runner').returns('foo');
        cc.addAction({});
        expect(cc.actions.length).to.equal(1);
      });

      it('should use the value returned by runner() as the default callback',
        function () {
          sandbox.stub(cc, 'runner').returns('foo');
          cc.addAction({});
          expect(cc.actions[0].callback).to.equal('foo');
        });

      it('should use the null context if no object passed and no context ' +
        'passed',
        function () {
          cc.addAction({});
          expect(cc.actions[0].context).to.be.null;
        });

      it('should use the object context if no context passed', function () {
        var o = {};
        cc.addAction({ object: o });
        expect(cc.actions[0].context).to.equal(o);
      });

      it('should use the context itself if defined, even if falsy',
        function () {
          cc.addAction({ context: false });
          expect(cc.actions[0].context).to.be.false;
        });
    });

    describe('next()', function () {
      it('should call done() if no callbacks left', function () {
        sandbox.stub(cc, 'done');
        expect(cc.done).not.to.have.been.called;
        cc.next();
        expect(cc.done).to.have.been.calledOnce;
      });

      it('should execute the next callback w/ args and increment the pointer',
        function () {
          cc._callbacks[0] = sandbox.stub();
          sandbox.stub(cc, 'done');
          cc.next('foo');
          expect(cc._callbacks[0]).to.have.been.calledOnce;
          expect(cc._callbacks[0]).to.have.been.calledWith('foo');
          expect(cc._cbIdx).to.equal(1);
        });
    });

    describe('done()', function () {
      it('should reset the pointer', function () {
        cc._cbIdx = 1;
        cc.done();
        expect(cc._cbIdx).to.equal(0);
      });
    });

    describe('runner()', function () {
      it('should return a function which calls next', function () {
        var run = cc.runner();
        expect(run).to.be.a('function');
        sandbox.stub(cc, 'next');
        run('foo');
        expect(cc.next).to.have.been.calledWith('foo');
      });
    });

    describe('chain()', function () {
      it('should add a function to the list of callbacks', function () {
        cc.chain(angular.noop);
        expect(cc._callbacks.length).to.equal(1);
      });

      it('should wrap the passed function within a call to next()',
        function () {
          var foo = sinon.stub().returnsArg(0);
          sandbox.spy(cc, 'next');
          sandbox.spy(cc, 'done');
          cc.chain(foo);
          cc.next('bar');
          expect(foo).to.have.been.calledOnce;
          expect(foo).to.have.been.calledWith('bar');
          expect(cc.next).to.have.been.calledWith('bar');
          expect(cc.next).to.have.been.calledTwice;
          expect(cc.done).to.have.been.calledOnce;
        });
    });
  });
  describe('property', function () {
    var cc;

    beforeEach(function () {
      cc = createConfig();
    });

    describe('chained', function () {
      it('should tell us whether or not there are chained callbacks',
        function () {
          expect(cc.chained).to.be.false;
          cc._callbacks.push(angular.noop);
          expect(cc.chained).to.be.true;
        });
    });
  });
});
