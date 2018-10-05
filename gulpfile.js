
// Add our dependencies
const gulp = require('gulp');
const ts = require('gulp-typescript');
const sass = require('gulp-sass'); // Gulp File concatenation plugin
const rev = require('gulp-rev');

// Configuration
const configuration = {
    paths: {
        src: {
            html: './src/*.html',
            css: [
                './src/css/*.scss'
            ],
            js: '/src/js/*.ts'
        },
        dist: './dist'
    }
};

// Gulp task to copy HTML files to output directory
gulp.task('html', function() {
    gulp.src(configuration.paths.src.html)
        .pipe(gulp.dest(configuration.paths.dist));
});

// Gulp task to concatenate our scss files
gulp.task('scss', function () {
   gulp.src(configuration.paths.src.css)
       .pipe(sass().on('error', sass.logError))
       .pipe(gulp.dest(configuration.paths.dist + '/css'))
});

gulp.task('scss:watch', function() {
    gulp.watch('./src/css/**/*.scss', ['scss']);
})

// get the typescript settings from tsconfig.json file
var tsProject = ts.createProject('tsconfig.json');

// uncomment next line to overwrite / add settings from tsconfig.json
// var tsProject = ts.createProject('tsconfig.json', { noImplicitAny: true });

gulp.task('tsc', function () {
    return gulp.src('src/**/*.ts')
        .pipe(tsProject())
        .pipe(rev()) // Static asset revisioning by appending content hash to filenames
        .pipe(gulp.dest('dist/js'));
});

gulp.task('tsc:watch', function () {
    gulp.watch('./src/js/**/*.ts', ['tsc']);
});

// Gulp default task
gulp.task('default', ['html', 'scss']);

gulp.task('watch', ['tsc:watch', 'scss:watch']);