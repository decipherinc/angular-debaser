/* eslint-env node */

'use strict';

module.exports = function (grunt) {
  var loadGruntConfig = require('load-grunt-config');
  var pkg = grunt.file.readJSON('package.json'),

    /**
     * Random bits of crap to send to the Grunt templates
     * @type {{pkg: Object, bower: ?Object, min: Function, author: *}}
     */
    data = {
      pkg: pkg,
      bower: grunt.file.isFile('bower.json') &&
      grunt.file.readJSON('bower.json'),

      /**
       * Dumb little function to generate a foo.min.ext filename from foo.ext
       * @param {string} filepath Filepath
       * @param {string} preExt Something other than 'min'
       * @returns {string} Minified filepath
       */
      min: function min(filepath, preExt) {
        var path = require('path');
        preExt = preExt || 'min';
        var ext = path.extname(filepath);
        return path.basename(filepath, ext) + '.' + preExt + ext;
      },

      author: typeof pkg.author === 'string' ? pkg.author :
        [pkg.author.name, pkg.author.email].join(' '),

      exorcist: function() {
        return require('exorcist')('envoy.js.map');
      }
    };

  Object.defineProperty(data, 'author', {
    /**
     * Normalizes `author` field of `package.json`.
     * @returns {string} Author name(s) and email(s)
     */
    get: function author() {
      function _author(author) {
        var format;
        if (typeof author === 'string') {
          return author;
        }
        format = require('util').format;
        return format('%s <%s>', author.name, author.email);
      }

      if (Array.isArray(pkg.author)) {
        return pkg.author.map(function (author) {
          return _author(author);
        }).join(', ');
      }
      return _author(pkg.author);
    }
  });

  if (grunt.option('time')) {
    require('time-grunt')(grunt);
  }

  loadGruntConfig(grunt, {
    jitGrunt: {
      staticMappings: {
        devUpdate: 'grunt-dev-update',
        'bump-only': 'grunt-bump',
        'bump-commit': 'grunt-bump',
        'mochacov': 'grunt-mocha-cov'
      }
    },
    data: data
  });
};
