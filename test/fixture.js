'use strict';

var chai = require('chai');
var sinon = require('sinon');
var angular = require('angular');

chai.use(require('sinon-chai'));

global.angular = angular;
global.sinon = sinon;
global.expect = chai.expect;
