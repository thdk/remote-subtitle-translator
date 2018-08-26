// rollup.config.js
export default {
    input: 'tmp/js/app.js',
    output: {
      file: 'dist/js/app.js',
      format: 'iife',
      name: 'rollupBundle'
    }
  };