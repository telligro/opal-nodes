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
const gulp = require('gulp');
const gulpIf = require('gulp-if');
const eslint = require('gulp-eslint');
const eslintThreshold = require('gulp-eslint-threshold');

/**
* checks for an eslint fixed flag
* @function
* @param {object} file - file to be checked.
* @return {boolean} isFixed
*/
function isFixed(file) {
    // Has ESLint fixed the file contents?
    return file.eslint != null && file.eslint.fixed;
}

gulp.task('lint', function() {
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

gulp.task('fixLint', () => {
    const thresholdWarnings = 50;
    const thresholdErrors = 1;
    // This is a *very* basic CLI flag check.
    // For a more robust method, check out [yargs](https://www.npmjs.com/package/yargs)
    const hasFixFlag = (process.argv.slice(2).indexOf('--fix') >= 0);

    return gulp.src('../test/fixtures/*.js')
        .pipe(eslint({fix: hasFixFlag}))
        .pipe(eslint.format())
        // if fixed, write the file to dest
        .pipe(gulpIf(isFixed, gulp.dest('../test/fixtures')))
        .pipe(eslintThreshold.afterWarnings(thresholdWarnings, (numberOfWarnings) => {
            throw new Error('ESLint warnings (' + numberOfWarnings + ') equal to or greater than the threshold (' + thresholdWarnings + ')');
        }))
        .pipe(eslintThreshold.afterErrors(thresholdErrors, (numberOfErrors) => {
            throw new Error('ESLint errors (' + numberOfErrors + ') equal to or greater than the threshold (' + thresholdErrors + ')');
        }));
});

gulp.task('default', ['lint']);
