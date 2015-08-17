'use strict';

require('./fixture');

describe('Aspect', function() {
  var createAspect = require('../lib/aspect');
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create('Aspect');
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('factory', function() {
    it('should set a name', function() {
      var aspect;
      var namedAspect;

      aspect = createAspect();
      sandbox.stub(aspect, '_initBehavior');
      sandbox.stub(aspect, '_initProto');
      expect(aspect.name).to.equal('base');
      expect(aspect.parent).to.be.undefined;

      // accessing the getter will make these two defined, so don't.
      expect(aspect._behavior).to.be.undefined;
      expect(aspect._proto).to.be.undefined;
      namedAspect = createAspect('bob');
      expect(namedAspect.name).to.equal('bob');
    });

    it('should accept a parent aspect', function() {
      var parent;
      var child;
      parent = createAspect('parent');
      parent.config.foo = 'bar';
      child = createAspect('child', parent);
      expect(child.parent).to.equal(parent);
      sandbox.stub(parent, 'isAspectOf').returns(true);
      expect(child.config.foo).to.eql(parent.config.foo);
    });
  });

  describe('property', function() {
    var aspect;

    beforeEach(function() {
      aspect = createAspect('properties');
    });

    describe('behavior', function() {
      it('should be omnipresent', function() {
        expect(aspect._behavior).to.be.undefined;
        sandbox.spy(aspect, '_initBehavior');
        delete aspect.behavior;
        expect(aspect._behavior).to.be.undefined;
        expect(aspect.behavior).not.to.be.undefined;
        expect(aspect._initBehavior).to.have.been.calledOnce;
        aspect.behavior = null;
        expect(aspect._behavior).to.be.null;
        expect(aspect.behavior).not.to.be.null;
        expect(aspect._initBehavior).to.have.been.calledTwice;
      });
    });

    describe('proto', function() {
      it('should be omnipresent', function() {
        expect(aspect._proto).to.be.undefined;
        sandbox.spy(aspect, '_initProto');
        delete aspect.proto;
        expect(aspect._proto).to.be.undefined;
        expect(aspect.proto).not.to.be.undefined;
        expect(aspect._initProto).to.have.been.calledOnce;
        aspect.proto = null;
        expect(aspect._proto).to.be.null;
        expect(aspect.proto).not.to.be.null;
        expect(aspect._initProto).to.have.been.calledTwice;
      });
    });

    describe('parent', function() {
      it('should set dirty flag', function() {
        var parent = createAspect('parent');
        aspect.parent = null;
        expect(aspect._dirty).to.be.falsy;
        aspect.parent = parent;
        expect(aspect._dirty).to.be.true;
      });
    });
  });

  describe('method', function() {
    var aspect;

    describe('flush()', function() {
      beforeEach(function() {
        aspect = createAspect('flush');
      });

      it('should call serialize() against all queued items in the behavior',
        function() {
          aspect.behavior.queue = [
            {
              assemble: sinon.stub().returns('flushed')
            }
          ];
          expect(aspect.flush()).to.eql(['flushed']);
          expect(aspect.behavior.queue[0].assemble).to.have.been.calledOnce;
        });
    });

    describe('_initProto()', function() {
      var Utils = require('../lib/utils');

      beforeEach(function() {
        aspect = createAspect();
        sandbox.spy(aspect, '_initProto');
      });

      it('should do nothing if proto exists', function() {
        aspect.proto = 'proto';
        expect(aspect._initProto).not.to.have.been.called;
        aspect._initProto();
        expect(aspect.proto).to.equal('proto');
      });

      it('should avoid any superpowers beginning with $', function() {
        sandbox.stub(aspect, 'createProxy').yields();
        Utils.each(function(name) {
          expect(name.charAt(0)).not.to.equal('$');
        });
      });

      it('should provide superpowers', function() {
        expect(aspect.proto.module).to.be.a('function');
        expect(aspect.proto.func).to.be.a('function');
        expect(aspect.proto.withObject).to.be.undefined;
      });

      it('should inherit aspect from parent', function() {
        var child = createAspect('module', aspect);
        expect(Utils.keys(child.proto)).not.to.eql(Utils.keys(aspect.proto));
        expect(child.proto.module).to.be.a('function');
        expect(child.proto.func).to.be.a('function');
        expect(child.proto.withObject).to.be.a('function');
      });
    });
  });
});
