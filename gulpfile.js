var gulp = require('gulp'),
  sass = require('gulp-ruby-sass'),
  autoprefixer = require('gulp-autoprefixer'),
  cssnano = require('gulp-cssnano'),
  rename = require('gulp-rename'),
  del = require('del'),
  fs = require('fs'),
  rimraf = require('gulp-rimraf'),
  s3 = require('gulp-s3-upload')(config),
  cloudfront = require('gulp-cloudfront-invalidate'),
  rp = require('request-promise'),
  config = { useIAM: true },
  webpack = require('webpack-stream'),
  pjson = require('./package.json'),
  git = require('gulp-git'),
  compareVersions = require('compare-versions'),
  bump = require('gulp-bump');

var buttonUploadName = `sezzle-widget${pjson.version}.js`;
var globalCssUploadName = 'sezzle-styles-global2.0.2.css';
var newVersion = '';

/**
 * Tasks for the CSS
 */

// cleans up dist directory
gulp.task('cleancss', function () {
  return del(['dist/global-css/**']);
});

// compiles scss and minifies
gulp.task('csscompile', function () {
  return sass('./styles/global.scss', {
    style: 'expanded'
  })
    .pipe(autoprefixer('last 2 version'))
    .pipe(gulp.dest('dist/global-css'))
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(cssnano({
      zindex: false
    }))
    .pipe(gulp.dest('dist/global-css'))
});

gulp.task('cssupload', function () {
  // bucket base url https://d3svog4tlx445w.cloudfront.net/
  var indexPath = './dist/global-css/global.min.css'
  gulp.src(indexPath)
    .pipe(rename('shopify-app/assets/' + globalCssUploadName))
    .pipe(s3({
      Bucket: 'sezzlemedia', //  Required
      ACL: 'public-read'       //  Needs to be user-defined
    }, {
        maxRetries: 5
      }))
});

gulp.task('post-button-css-to-wrapper', function () {
  console.log('Posting css version to shopify gateway')
  var options = {
    method: 'POST',
    uri: 'https://widget.sezzle.com/v1/css/price-widget/version',
    body: {
      'version_name': globalCssUploadName
    },
    json: true
  }
  rp(options)
    .then(function (body) {
      console.log('Posted new version to shopify wrapper')
    })
    .catch(function (err) {
      console.log('Post failed with sezzle pay, ')
      console.log(err);
    })
});


/**
 * Tasks for the sezzle-js widget
 */
gulp.task('bundlejs', function () {
  return gulp.src('src/sezzle-init.js')
    .pipe(webpack({
      output: {
        filename: buttonUploadName,
        libraryTarget: 'umd',
        library: 'SezzleJS'
      },
      optimization: {
        minimize: true, // <---- disables uglify.
      }
    }))
    .pipe(gulp.dest('dist/'));
});

gulp.task('upload-widget', function () {
  var indexPath = `./dist/${buttonUploadName}`
  gulp.src(indexPath)
    .pipe(s3({
      Bucket: 'sezzle-shopify-application', //  Required
      ACL: 'public-read'       //  Needs to be user-defined
    }, {
        // S3 Constructor Options, ie:
        maxRetries: 5
      }));
});

gulp.task('post-button-to-widget-server', function () {
  var options = {
    method: 'POST',
    uri: 'https://widget.sezzle.com/v1/javascript/price-widget/version',
    body: {
      'version_name': buttonUploadName
    },
    json: true
  }
  rp(options)
    .then(function (body) {
      console.log('Posted new version to shopify wrapper')
    })
    .catch(function (err) {
      console.log('Post failed with shopify, ')
      console.log(err);
    })
});

gulp.task('styles', gulp.series('cleancss', 'csscompile'));
gulp.task('deploywidget', gulp.series('upload-widget', 'post-button-to-widget-server'));
gulp.task('deploycss', gulp.series('cssupload', 'post-button-css-to-wrapper'));

function increaseVersion(oldVersion) {
  oldVersion.split('.')[2]
}

gulp.task('grabversion', function(done) {
  var argv = require('yargs').argv;
  newVersion = argv.newversion;
  if(typeof(newVersion) === 'boolean' ||
    typeof(newVersion) === 'undefined' ||
    !(/^\d{1,2}\.\d{1,2}\.\d{1,2}$/.test(newVersion)) ||
    compareVersions(newVersion, pjson.version) < 1
  ) {
    throw 'Invalid value for newversion'
  };
  done();
})

gulp.task('updatepackage', function() {
  return gulp.src(['./package.json', './package-lock.json'])
    .pipe(bump({version: newVersion}))
    .pipe(gulp.dest('./'));
})

gulp.task('commitupdate', function() {
  return gulp.src('./package.json')
    .pipe(git.commit(`version: ${newVersion}`));
})

gulp.task('createtag', function(done) {
  git.tag(`v${newVersion}`, '', function (err) {
    if (err) throw err;
    git.push('sanborn', '', {args: " --tags"}, function (err) {
      if (err) throw err;
      done();
    });
  });
})
gulp.task('updateversion', gulp.series('grabversion', 'updatepackage', 'commitupdate', 'createtag'));
