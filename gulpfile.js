var path = require('path');
var gulp = require('gulp');
var src = gulp.src;
var dest = gulp.dest;
var series = gulp.series;
var parallel = gulp.parallel;
var watch = gulp.watch;
var slash = require('slash');
var del = require('del');
var pugLinter = require('gulp-pug-linter');
var pugLintStylish = require('puglint-stylish');
var pug = require('gulp-pug');
var gulpStylelint = require('gulp-stylelint');
var sass = require('gulp-sass');
var postcss = require('gulp-postcss');
var postcssPresetEnv = require('postcss-preset-env');
var cssnano = require('cssnano');
var rename = require('gulp-rename');
var imagemin = require('gulp-imagemin');

var browserSync = require('browser-sync').create();

// used to build platform/os-consistant globs
var buildGlob = (...args) => slash(path.resolve(...args));

// CONFIGURATION
var production = process.env.NODE_ENV === 'production';
var source = buildGlob(__dirname, 'src');
var destination = buildGlob(__dirname, 'dist');
var reportsPath = buildGlob(__dirname, 'reports');
// DESTINATION PATHS
var destCss = buildGlob(destination, 'css');
var destImg = buildGlob(destination, 'img');
// SOURCE PATHS
var pugSourcePath = buildGlob(source, 'views', '*.pug');
var pugSourcePathAll = buildGlob(source, 'views', '**', '*.pug');
var scssSourcePath = buildGlob(source, 'scss', 'index.scss');
var scssSourcePathAll = buildGlob(source, 'scss', '**', '*.scss');
var assetPath = buildGlob(source, 'assets');
var imgPath = buildGlob(assetPath, 'img', '*');
var gulpPath = buildGlob(__dirname, 'gulpfile.babel.js');
var watchPath = [
  buildGlob(destCss, '*.css'),
  buildGlob(destination, '*.html'),
  buildGlob(destImg, '*'),
];

// TASKS
function lintViews() {
  return src(pugSourcePathAll)
    .pipe(pugLinter({
      failAfterError: production,
      reporter: pugLintStylish,
    }))
};

function processViews(){
  return src(pugSourcePath)
    .pipe(pug({
      doctype: 'html',
    }))
    .pipe(dest(destination))
};


function lintScss() {
  return src(scssSourcePathAll)
    .pipe(gulpStylelint({
      failAfterError: true,
      reportOutputDir: reportsPath,
      reporters: [
        {
          formatter: 'string',
          console: !production,
          save: 'report-styles.txt',
        },
        // {formatter: 'json', save: 'report.json'},
      ],
      debug: true,
      // fix: true,
    }))
};

function processScss() {
  var postCssPlugins = [
    postcssPresetEnv({
      autoprefixer: { grid: true },
    }),
    cssnano(),
  ];
  return (
    src(scssSourcePath, { sourcemaps: !production })
      .pipe(sass().on('error', sass.logError))
      .pipe(postcss(postCssPlugins))
      .pipe(rename('styles.min.css'))
      .pipe(dest(destCss, { sourcemaps: !production }))
  );
};

function minimizeImgs(){
  return src(imgPath)
    .pipe(imagemin())
    .pipe(dest(destImg))
};

var views = series(lintViews, processViews);
var styles = series(lintScss, processScss);

function watchTask() {
  browserSync.init({
    server: 'dist',
    open: 'external',
    port: 9000,
  });
  watch(pugSourcePathAll, views);
  watch(scssSourcePathAll, styles);
  watch(imgPath, minimizeImgs);
  watch(watchPath).on('change', browserSync.reload);
};

function clean(done) {
  del.sync([destination, reportsPath]);
  done();
};

var build = (
  series(
    clean,
    parallel(
      views,
      styles,
      minimizeImgs,
    ),
    watchTask,
  )
);

exports.views = views;
exports.styles = styles;
exports.minimgs = minimizeImgs;
exports.watch = watchTask;
exports.clean = clean;

exports.default = build;
