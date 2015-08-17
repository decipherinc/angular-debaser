'use strict';

describe('e2e', function() {
  var exposed = ['CommonJS', 'Globals'];
  var funcs = [require('../../lib'), global.debase];
  var angular = require('angular');

  funcs.forEach(function(func, idx) {
    describe(exposed[idx], function() {
      var d;
      var sandbox;

      beforeEach(function() {
        d = func.debaser();
        sandbox = sinon.sandbox.create('e2e');
      });

      afterEach(function() {
        sandbox.restore();
      });

      it('should always return a Debaser', function() {
        Object.keys(d).filter(function(key) {
          return key.charAt(0) !== '$';
        }).forEach(function(name) {
          expect(d[name]()).to.equal(d);
        });
      });

      describe('module()', function() {
        it('should throw if invalid parameters', function() {
          var err = '$debaser: module() expects a string';
          expect(function() {
            d.module();
          }).not.to.throw();
          expect(function() {
            d.module({herp: 'derp'});
          }).to.throw(err);
          expect(function() {
            d.module([1, 2, 3]);
          }).to.throw(err);
        });

        it('should accept a string', function() {
          expect(function() {
            d.module('foo');
          }).not.to.throw();
        });

        it('should create a fake module upon debase()', function() {
          sandbox.stub(angular, 'module');
          sandbox.stub(angular.mock, 'module');
          d.module('hoos-foos');
          expect(d.module).to.be.a('function');
          d.debase();
          expect(angular.module).to.have.been.calledWith('hoos-foos', []);
          expect(angular.mock.module).to.have.been.calledWith('hoos-foos');
        });

        it('should set the aspect to "module"', function() {
          d.module('snimm');
          expect(d.$$aspect.name).to.equal('module');
          expect(d.module).to.be.a('function');
          expect(d.withDep).to.be.a('function');
          expect(d.withDeps).to.be.a('function');
        });
      });

      describe('withDep', function() {
        it('should throw if invalid arguments', function() {
          expect(function() {
            d.module('hot-shot').withDep();
          }).not.to.throw();
          expect(function() {
            d.module('sunny jim').withDep({});
          }).to.throw('$debaser: withDep() expects one or more strings');
        });

        it('should accept a string', function() {
          expect(function() {
            d.module('shadrack').withDep('blinkey');
          }).not.to.throw();
        });

        it('should create a fake module with a dependency upon debase()',
          function() {
            sandbox.stub(angular, 'module');
            sandbox.stub(angular.mock, 'module');
            d.module('stuffy').withDep('stinkey');
            expect(d.withDep).to.be.a('function');
            d.debase();
            expect(angular.module).to.have.been.calledWith('stuffy',
              ['stinkey']);
            expect(angular.mock.module).to.have.been.calledWith('stuffy');
          });
      });


      describe('withDeps', function() {
        it('should throw if invalid arguments', function() {
          expect(function() {
            d.module('foo').withDeps();
          }).not.to.throw();
          expect(function() {
            d.module('foo').withDeps({});
          }).to.throw('$debaser: withDeps() expects an array');
        });

        it('should accept an array', function() {
          expect(function() {
            d.module('foo').withDeps(['bar']);
          }).not.to.throw();
        });

        it('should create a fake module with a dependency upon debase()',
          function() {
            sandbox.stub(angular, 'module');
            sandbox.stub(angular.mock, 'module');
            d.module('foo').withDeps(['bar']);
            expect(d.withDeps).to.be.a('function');
            d.debase();
            expect(angular.module).to.have.been.calledWith('foo',
              ['bar']);
            expect(angular.mock.module).to.have.been.calledWith('foo');
          });
      });

      describe('func()', function() {
        it('should make a value upon debase()', function() {
          sandbox.stub(angular.mock, 'module');
          d.func('foo');
          expect(d.func).to.be.a('function');
          expect(d.withDep).to.be.undefined;
          d.debase();
          expect(angular.mock.module).to.have.been.calledOnce;
        });
      });
    });
  });
});

