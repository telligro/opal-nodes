/**
 *  Copyright Telligro Pte Ltd 2017
 *
 *  This file is part of OPAL.
 *
 *  OPAL is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  OPAL is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with OPAL.  If not, see <http://www.gnu.org/licenses/>.
 */
'use strict';

const browserify = require('browserify');
const gulp = require('gulp');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');
const gutil = require('gulp-util');
const gulpIf = require('gulp-if');
const eslint = require('gulp-eslint');
const eslintThreshold = require('gulp-eslint-threshold');
// const combiner = require('stream-combiner2');
const pump = require('pump');
const htmllint = require('gulp-htmllint');
// const preen = require('preen');
gulp.task('html', function() {
    return gulp.src('web-page.html')
        .pipe(htmllint({}, htmllintReporter));
});
gulp.task('eslint', function() {
    // const thresholdWarnings = 50;
    // const thresholdErrors = 1;
    return gulp.src(['*.js'])
        .pipe(eslint())
        .pipe(eslint.format())
        // .pipe(gulpIf(isFixed, gulp.dest('.')))
        .pipe(eslint.failAfterError());
    // .pipe(eslintThreshold.afterWarnings(thresholdWarnings, (numberOfWarnings) => {
    //     throw new Error('ESLint warnings (' + numberOfWarnings + ') equal to or greater than the threshold (' + thresholdWarnings + ')');
    // }))
    // .pipe(eslintThreshold.afterErrors(thresholdErrors, (numberOfErrors) => {
    //     throw new Error('ESLint errors (' + numberOfErrors + ') equal to or greater than the threshold (' + thresholdErrors + ')');
    // }));
});
function htmllintReporter(filepath, issues) {
    if (issues.length > 0) {
        issues.forEach(function(issue) {
            gutil.log(gutil.colors.cyan('[gulp-htmllint] ') + gutil.colors.white(filepath + ' [' + issue.line + ',' + issue.column + ']: ') + gutil.colors.red('(' + issue.code + ') ' + issue.msg));
        });

        process.exitCode = 1;
    }
}
// gulp.task('preen', function(cb) {
//     preen.preen({}, cb);
// });
gulp.task('scripts', function(cb) {
    // set up the browserify instance on a task basis
    let b = browserify({
        // entries: ['./ServiceManager.js', './WebNodeUtils.js'],
        transform: ['babelify'],
        debug: true,
    }).require('./ServiceManager.js', {expose: 'ServiceManager'})
        .require('./WebNodeUtils.js', {expose: 'WebNodeUtils'})
        .require('fast-deep-equal', {expose: 'fast-deep-equal'});
    pump([
        b.bundle(),
        source('app.js'),
        buffer(),
        sourcemaps.init({loadMaps: true}),
        uglify(),
        gulp.dest('public/bootstrap'),
        sourcemaps.write('./'),
        gulp.dest('./plugins/'),
    ], cb);

    // let combined = combiner.obj([
    //     b.bundle(),
    //     source('app.js'),
    //     buffer(),
    //     sourcemaps.init({loadMaps: true}),
    //     uglify(),
    //     gulp.dest('public/bootstrap'),
    //     sourcemaps.write('./'),
    //     gulp.dest('./dist/js/')
    // ],cb);
    // any errors in the above streams will get caught
    // by this listener, instead of being thrown:
    // combined.on('error', console.error.bind(console));

    // return combined;

    // return b.bundle()
    //     // .pipe(source('app.js'))
    //     .pipe(buffer())
    //     .pipe(sourcemaps.init({loadMaps: true}))
    //     // Add transformation tasks to the pipeline here.
    //     .pipe(uglify())
    //     .on('error', gutil.log)
    //     .pipe(sourcemaps.write('./'))
    //     .pipe(gulp.dest('./dist/js/'));
});

gulp.task('default', ['scripts', 'html', 'eslint']);
