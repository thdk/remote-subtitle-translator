
// Add our dependencies
const gulp = require('gulp');
const ts = require('gulp-typescript');
const sass = require('gulp-sass');
const rev = require('gulp-rev');

// Configuration
const configuration = {
    paths: {
        src: {
            html: './src/*.html',
            images: './src/images/*.png',
            css: [
                './src/css/*.scss'
            ],
            js: './src/js/*.ts',
            manifest: './src/manifest.json'
        },
        dist: './dist'
    }
};

// Gulp task to copy HTML files to output directory
gulp.task('root', function() {
    gulp.src([configuration.paths.src.html, configuration.paths.src.manifest])
        .pipe(gulp.dest(configuration.paths.dist));
});

gulp.task('images', function() {
    gulp.src(configuration.paths.src.images)
        .pipe(gulp.dest(configuration.paths.dist + '/images'));
});

// Gulp task to concatenate our scss files
gulp.task('scss', function () {
   gulp.src(configuration.paths.src.css)
       .pipe(sass({
        includePaths: ['node_modules/'] // added includePaths to resolve scss partials from node modules
      }).on('error', sass.logError))
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