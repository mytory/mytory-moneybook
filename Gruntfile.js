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
                    'js/src/polyglot.min.js',
                    'js/src/moment.min.js',
                    'js/src/lang.js',
                    'js/src/mytory-moneybook-category.js',
                    'js/src/mmb-router.js',
                    'js/src/mmb-backbone.js',
                    'js/src/view-*.js',
                    'js/src/mmb.js',
                    'js/src/mmb.util.js',
                    'js/src/mytory-moneybook.js',
                    'js/src/moment.ko.js'
                ],
                dest: 'js/production.js'
            },
            dist2: {
                src: [
                    'css/src/bootstrap.css',
                    'css/src/bootstrap-theme.css',
                    'css/src/mytory-moneybook.css',
                    'css/src/spinner.css'
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

        manifest: {
            generate: {
                options: {
                    basePath: './',
                    network: ['*'],
                    timestamp: true,
                    master: ['moneybook.html']
                },
                src: [
                    'moneybook.html',
                    'config.js',
                    'pages/*.html',
                    'js/production.js',
                    'js/xls.js',
                    'js/xlsworker.js',
                    'css/production.min.css',
                    'fonts/*',
                    'images/icon4.png'
                ],
                dest: 'manifest.appcache'
            }
        },

        watch: {
            scripts: {
                files: ['*.html', 'pages/*.html', '*.js', 'js/*.js', 'js/src/*.js', 'css/src/*.css', 'images/src/*'],
                tasks: ['concat', 'manifest', 'uglify', 'cssmin', 'imagemin'],
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
    grunt.loadNpmTasks('grunt-manifest');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // 4. Where we tell Grunt what to do when we type "grunt" into the terminal.
    grunt.registerTask('default', ['concat', 'manifest', 'uglify', 'cssmin', 'imagemin', 'watch']);

};
