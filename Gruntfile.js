'use strict'

module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    connect: {
      server: {
        options: {
          port: 9000,
          hostname: 'localhost',
          //livereload: 35729,
          base: 'app',
          keepalive: true
        }
      }
    }
    // watch: {
    //   livereload: {
    //     options: {
    //       livereload: '<%= connect.server.options.livereload %>'
    //     },
    //     files: [
    //       'app/{,*/}*.html'
    //     ]
    //   },
    //   js: {
    //     files: ['app/scripts/{,*/}*.js'],
    //     options: {
    //       livereload: true
    //     }
    //   },
    //   css: {
    //     files: ['app/styles/{,*/}*.css'],
    //     options: {
    //       livereload: true
    //     }
    //   }
    // }
  });

  grunt.registerTask('server', [
    'connect:server'
  ]);
}