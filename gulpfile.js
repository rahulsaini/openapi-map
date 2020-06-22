const gulp = require('gulp');
const concat = require('gulp-concat');
const yamltojson = require('gulp-yaml');
const prettify = require('gulp-jsbeautifier');
const handlebars = require('gulp-handlebars');
const wrap = require('gulp-wrap');
const declare = require('gulp-declare');
const del = require('del');
const webserver = require('gulp-webserver');  // webserver to serve pages

// https://github.com/gulpjs/gulp/blob/master/docs/recipes/running-task-steps-per-folder.md
const fs = require('fs');
const path = require('path');
const merge = require('merge-stream');
const gulpSequence = require('gulp-sequence');
//
const filelist = require('gulp-filelist');
//test
var mocha = require('gulp-mocha');
var gutil = require('gulp-util');

/**
 * @description List directories in a directory
 * @param {string} dir The directory
 * @return {string[]} The directories
 */
function getFolders(dir) {
  return fs.readdirSync(dir)
    .filter(function(file) {
      return fs.statSync(path.join(dir, file)).isDirectory();
    });
}

// Default task: test then build
gulp.task('default', async function(callback){
    console.log("Gulp DEFAULT Task .... ....... ......... ..........");
    gulp.series('test', 'build')(callback);
});

// Concat data/<each version>/**/*.yaml in <each version>.json
gulp.task('build-data-files', function() {
    console.log("Gulp task build-data-files ...");
  const dataPath = 'data';
  const folders = getFolders(dataPath);
  var tasks = folders.map(function(folder) {
    return gulp.src(path.join(dataPath, folder, '/**/*.yaml'))
      .pipe(concat(folder + '.yaml'))
      .pipe(yamltojson(folder + '.json'))
      .pipe(prettify(folder + '.json'))
      .pipe(gulp.dest('dist'));
  });
  return merge(tasks);
});

// Copy versions.json file to dist
gulp.task('build-version-file', function() {
    console.log("Copied versions.json to dist");
  return gulp.src('data/*.json')
    .pipe(gulp.dest('dist'));

});

// Build versions.json and <each version>.json files
gulp.task('build-data', function(callback) {
    console.log("build data ...");
  gulp.series('build-data-files', 'build-version-file')(callback);
});

// Generate js code for the tooltip panel's templating and copy to dist
gulp.task('templates', done => {
    console.log("Gulp task templates ...");
  gulp.src('web/templates/*.hbs')
    .pipe(handlebars({
      handlebars: require('handlebars')
    }))
    .pipe(wrap('Handlebars.template(<%= contents %>)'))
    .pipe(declare({
      namespace: 'JavaAPIFeaturesVisualDocumentation',
      noRedeclare: true // Avoid duplicate declarations
    }))
    .pipe(concat('templates.js'))
    .pipe(gulp.dest('dist/js'));
  done();
});

// Copy html, css dans js files to dist
gulp.task('static', () => {
  return gulp.src('web/static/**/*')
    .pipe(gulp.dest('dist/'));
});

// Copy static and templated files to dist
gulp.task('build-web', async function(){
    gulp.series('static', 'templates')
});

// Copy web and data files to dist
gulp.task('build', async function(callback) {
  gulp.series('clean', 'build-web', 'build-data')(callback);
});

// Deletes dist
gulp.task('clean', del.bind(null, ['dist']));

// Watch for modifications on web and data files, relaunch tests and build if files are modified
gulp.task('watch', gulp.series('default', async function() {
   gulp.watch(('data/**/*'));
   gulp.watch(('web/**/*'));
   gulp.watch(('default'));
}));

// Launch web server on dist directory with live-reload
gulp.task('webserver', function() {
  return gulp.src(['dist'])
    .pipe(webserver({
      port: 8080,
      livereload: true,
        directoryListing: {
            enable:true,
            path: 'dist'
        },
      open: true,
      fallback: 'index.html',
      baseDir: '.',
      index: 'index.html'
    }));
});

// Launch dev mode
gulp.task('serve', async function(callback) {
    console.log("Launch DEV Mode and Serve ...");
  gulp.series('watch', 'webserver')(callback);
});

// Test with mocha (prerequisites: npm install -g mocha)
gulp.task('test', function() {
  return gulp.src(['test/*.js'], { read: false })
      .pipe(mocha())
      .on('error', gutil.log);
});
