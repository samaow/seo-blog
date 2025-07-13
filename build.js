const fs = require('fs');
     const CleanCSS = require('clean-css');
     const UglifyJS = require('uglify-js');

     const css = new CleanCSS().minify(fs.readFileSync('public/styles.css', 'utf8'));
     fs.writeFileSync('public/styles.min.css', css.styles);

     const js = UglifyJS.minify({
         'script.js': fs.readFileSync('public/script.js', 'utf8')
     });
     fs.writeFileSync('public/script.min.js', js.code);