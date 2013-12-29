module.exports = function(grunt) {

    // 1. All configuration goes here 
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),


        concat: {
            dist: {
                src: [
                    'js/src/jquery.min.js',
                    'js/src/bootstrap.min.js',
                    'js/src/underscore-min.js',
                    'js/src/backbone-min.js',
                    'js/src/bootstrap3-typeahead.min.js',
                    'js/src/polyglot.min.js',
                    'js/src/xls.js',
                    'js/src/lang.js',
                    'js/src/mytory-moneybook-category.js',
                    'js/src/mytory-moneybook.js'
                ],
                dest: 'js/production.js'
            },
            dist2: {
                src: [
                    'css/src/bootstrap.min.css',
                    'css/src/bootstrap-theme.min.css',
                    'css/src/mytory-moneybook.css'
                ],
                dest: 'css/production.css'
            }
        },

        uglify: {
            build: {
                src: 'js/production.js',
                dest: 'js/production.min.js'
            }
        },

        cssmin: {
            combine: {
                files: {
                    'css/production.min.css': ['css/production.css']
                }
            }
        },

        imagemin: {
            dynamic: {
                files: [{
                    expand: true,
                    cwd: 'images/src/',
                    src: ['**/*.{png,jpg,gif}'],
                    dest: 'images/'
                }]
            }
        },

        watch: {
            scripts: {
                files: ['js/*.js', 'js/src/*.js', 'css/src/*.css', 'images/src/*'],
                tasks: ['concat', 'uglify', 'cssmin', 'imagemin'],
                options: {
                    spawn: false
                }
            }
        }

    });

    // 3. Where we tell Grunt we plan to use this plug-in.
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-imagemin');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
    grunt.registerTask('default', ['concat', 'uglify', 'cssmin', 'imagemin', 'watch']);

};
