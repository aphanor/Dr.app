require('dotenv').load();

// Request GULP modules
var gulp = require('gulp'),
    gutil = require('gulp-util'),
    webserver = require('gulp-webserver'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat-sourcemap'),
    rename = require("gulp-rename"),
    minifyCss = require('gulp-minify-css'),
    gutil = require('gulp-util'),
    sass = require("gulp-ruby-sass"),
    sourcemaps = require('gulp-sourcemaps'),
    livereload = require('gulp-livereload'),
    replace = require('gulp-replace'),
    changed = require('gulp-changed'),
    sync = require('gulp-directory-sync'),
    ip = require("ip"),
    fs = require('fs');
/*
 var gulp = require('gulp'),
      $ = require('gulp-load-plugins')({
        pattern: ['gulp-*', 'gulp.*'],
        replaceString: /\bgulp[\-.]/,
        lazy: true,
        camelize: true
      });
*/
    
// Setting working space

var env,
    dev = function() {
        env = 'dev/'; 
    }

ip.address() === process.env.MY_IP ? dev() : env = 'prod/';

var src_files = 'frontend/dev/',
    src_file = 'frontend/prod/';

var _html = src_file + '*.html',
    _sass = src_files + 'sass/**/*',
    _js = src_files + 'js/**/*',
    _bower = src_files + 'bower_components/**/*';

/*   
*   #GULP TASKS //
*   purpose: gulp task runner for front end
*   methods: sass will convert .scss files to css and compress them, minify will run uglify to compress js files, watch will check if any files have been changed
*   local server: yes, running via the task "server"
*/

gulp.task('libsass', function () {
      gulp.src('sass/app.scss')
          .pipe($.sass({errLogToConsole: true}))
          .pipe($.autoprefixer({
            browsers: ['last 2 versions'],
            cascade: false
           }))
          .pipe($.sourcemaps.write('app/css/map'))
          .pipe(gulp.dest('app/css'))
  });

// Sass & CSS configuration
gulp.task('mini-sass', function () {
    return sass(_sass, {style: 'compressed', sourcemap: false})
        .on('error', function (err) {
            console.error('Error!', err.message);
        })
        .pipe(concat('style.css'))
        .pipe(rename({
            extname: '.min.css'
        }))
        .pipe(gulp.dest(src_file + 'css/'));
});

// Uglify configuration 
gulp.task('minify', function() {
    return gulp.src([_js, '!' + src_files + 'js/*.min.js'])
    .pipe(uglify().on('error', gutil.log))
    .pipe(concat('all.js'))
    .pipe(rename({
        extname: '.min.js'
    }))
    .pipe(gulp.dest(src_file + 'js/'));
});

// Watch task
gulp.task('check', function() {
    //livereload.listen();
    gulp.watch(_js, ['minify']).on('change', function(file) { //livereload.changed(file.path);
        gutil.log(gutil.colors.yellow('JS has been updated' + ' (' + file.path + ')'));
    });
    
    gulp.watch(_html).on('change', function(file) { //livereload.changed(file.path);
        gutil.log(gutil.colors.cyan('HTML has been updated' + ' (' + file.path + ')'));
    });
    
    gulp.watch(_sass, ['mini-sass']).on('change', function(file) { //livereload.changed(file.path);
        gutil.log(gutil.colors.grey('SASS has been updated' + ' (' + file.path + ')'));
    });
    gulp.watch(_bower,['sync']).on('change', function(file) { //livereload.changed(file.path);
        gutil.log(gutil.colors.grey('New module added' + ' (' + file.path + ')'));
    });

});

gulp.task( 'sync', function() {
return gulp.src( '' )
    .pipe(sync('bower_components/', src_files + 'libraries/', { printSummary: true } ))
    .on('error', gutil.log);
});

// Webserver
gulp.task('server', ['mini-sass'], function() {
    gulp.src(src_file)
    .pipe(webserver({
    	livereload: true,
    	open: true
    }));
});

gulp.task('default', ['minify', 'mini-sass' , 'check', 'sync', 'server']);