'use strict';

module.exports = function (grunt) {

  var path = require('path'),

      MIN_HEADER = '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
        '* Copyright (c) <%= grunt.template.today("yyyy") %> Decipher, Inc.;' +
        ' Licensed <%= pkg.license %> */',

      MAIN_HEADER = MIN_HEADER +
        '\n\n(function (window, angular) {\n' +
        '  \'use strict\';\n\n',

      pkg = grunt.file.readJSON(path.join(__dirname, 'package.json'));

  require('time-grunt')(grunt);

  require('load-grunt-config')(grunt, {
    configPath: path.join(__dirname, 'tasks'),
    data: {
      pkg: pkg,
      banner: MAIN_HEADER,
      banner_min: MIN_HEADER,
      footer: '})(window, window.angular);',
      src_files: [
        './lib/globals.js',
        './lib/module.js',
        './lib/*.js'
      ],
      test_files: [
        './test/*.js',
        './test/e2e/*.js',
        './test/issues/*.js'
      ],
      test_deps: [
        './support/angular/angular.js',
        './support/angular-mocks/angular-mocks.js'
      ],
      test_deps_unstable: [
        './support/angular-unstable/angular.js',
        './support/angular-mocks-unstable/angular-mocks.js'
      ],
      task_files: [
        './Gruntfile.js',
        'tasks/*.js',
        'package.json'
      ]
    }
  });

};

