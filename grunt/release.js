'use strict';

module.exports = function (grunt) {

  grunt.registerTask('release', 'Build & bump', function(target) {
    target = target || 'patch';
    grunt.task.run('bump-only:' + target);
    grunt.task.run('build');
    grunt.task.run('bump-commit');
  });
};
