'use strict';

var gulp = require('gulp'),
    del = require('del'),
    rename = require('gulp-rename'),
    uglify = require('gulp-uglify');

gulp.task('clean', del.bind(null, ['dist/*', '!dist/.git'], {dot: true}));

gulp.task('compress', function () {
    return gulp.src('src/*.js')
        .pipe(gulp.dest('dist'))
        .pipe(uglify({
            preserveComments: 'some'
        }))
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('dist'))
});

gulp.task('default', ['clean'], function () {
    gulp.start('compress');
});
