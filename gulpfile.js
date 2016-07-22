'use strict';
var gulp = require('gulp');
var sass = require('gulp-sass');
var browserify = require('browserify');
var uglify = require('gulp-uglify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync');
var pug = require('gulp-pug');
var watchify = require('watchify');
var del = require('del');
var gulpif = require('gulp-if');
var protractor = require('gulp-protractor').protractor;
var argv = require('yargs').argv;
var webdriver_standalone = require('gulp_protractor').webdriver_standalone;

// gulp build --production
var production = !!argv.production;
// determine if we're doing a build
// and if so, bypass the livereload
var build = argv._.length ? argv._[0] === 'build' : false;
var watch = argv._.length ? argv._[0] === 'watch' : true;

var tasks = {
    /** clear out the build folder */
    clean: function(callback){
        del(['build/']).then(function(){
            callback();
        });
    },
    /** copy static assets to build folder */
    assets: function(){
        return gulp.src('./dev/assets/**/*')
            .pipe(gulp.dest('build/assets/'));
    },
    /** compile dev html to build */
    html: function(){
        return gulp.src('./dev/**/*.pug')
            .pipe(pug({}))
            .pipe(gulp.dest('build/'));
    },
    /** SASS */
    sass: function(){
        return gulp.src('./dev/sass/**/*.sass')
            .pipe(sourcemaps.init())
            .pipe(sass({outputStyle:'compressed'})
            .on('error', sass.logError))
            .pipe(sourcemaps.write('./'))
            .pipe(gulp.dest('./build/css'));
    },
    /** Browserify */
    browserify: function(){
        var bundler = browserify('./dev/js/index.js');

        // if doing a build, buypass livereload
        var build = argv._.length ? argv._[0] === 'build' : false;
        if(watch){
            bundler = watchify(bundler);
        }
        var rebundle = function(){
            return bundler.bundle()
                .pipe(source('build.js'))
                .pipe(gulpif(production, buffer()))
                .pipe(gulpif(production, uglify()))
                .pipe(gulp.dest('build/js/'));
        };
        bundler.on('update', rebundle);
        return rebundle();
    },
    /** Protractor testing
     *  info: http://localhost:4444/wd/hub
     */
    test: function(){
        return gulp.src('./dev/**/*test.js')
            .pipe(protractor({
                configFile: 'dev/test/protractor.config.js',
                args: ['--baseUrl', 'http://127.0.0.1:8000']
            }))
            .on('error', function(e){throw e});
    }
}

// BrowserSync tasks

gulp.task('browser-sync', function(){
    browserSync({
        server:{
            baseDir: './build'
        }
    });
});

gulp.task('reload-sass', ['sass'], function(){
    browserSync.reload();
});

gulp.task('reload-js', ['browserify'], function(){
    browserSync.reload();
});

gulp.task('reload-html', ['html'], function(){
    browserSync.reload();
});

// Custom tasks

gulp.task('clean', tasks.clean);
// require clean task on individual tasks
var req = build ? ['clean'] : [];
// individual tasks
gulp.task('html', req, tasks.html);
gulp.task('assets', req, tasks.assets);
gulp.task('sass', req, tasks.sass);
gulp.task('browserify', req, tasks.browserify);
gulp.task('test', tasks.test);
gulp.task('webdriver', webdriver_standalone);

gulp.task('watch:sass', function(){
    gulp.watch('dev/sass/**/*.sass', ['reload-sass']);
});

gulp.task('watch:js',function(){
    gulp.watch('dev/js/**/*.js', ['reload-js']);
});

gulp.task('watch:html',function(){
    gulp.watch('dev/**/*.pug', ['reload-html']);
});

gulp.task('watch', [
    'assets', 
    'html', 
    'sass', 
    'browserify',
    'watch:sass',
    'watch:js',
    'watch:html',
    'browser-sync'
]);

// build tasks

gulp.task('build', [
  'clean',
  'html',
  'assets',
  'sass',
  'browserify'
]);

gulp.task('default', ['watch']);

// gulp (watch) : for development and livereload
// gulp build : for a one off development build
// gulp build --production : for a minified production build
