const gulp = require('gulp'),
      rename = require('gulp-rename'),
      autoprefixer = require('gulp-autoprefixer'),
      minify = require('gulp-minify'),
      pump = require('pump'),
      cleanCSS = require('gulp-clean-css')

gulp.task('default', ['minJs', 'minCss']);

gulp.task('minJs', function(cb){
    pump([
        gulp.src(['./js/emojibuilder.js']),
        minify({
            ext: {
                min: ".min.js"
            },
            noSource: true
        }),
        gulp.dest('./js/')
    ],
        cb
    );
});

gulp.task('minCss', ['minJs'], function(cb) {
    pump([
        gulp.src('./css/style.css'),
        autoprefixer({browsers: "last 2 versions"}),
        cleanCSS(),
        rename({suffix: '.min'}),
        gulp.dest('./css')
    ],
        cb
    );
});