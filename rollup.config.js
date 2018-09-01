import resolve from 'rollup-plugin-node-resolve';
import commonJS from 'rollup-plugin-commonjs'

export default {
  external: ['firebase'],  
    input: 'tmp/js/app.js',
    output: {
      file: 'dist/js/app.js',
      format: 'iife',
      name: 'rollupBundle',
      globals: {
        'firebase': 'firebase',
      },
    },
    plugins: [
      resolve(),
      commonJS({
        include: 'node_modules/**'
      })
    ]
  };