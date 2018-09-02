import resolve from 'rollup-plugin-node-resolve';
import commonJS from 'rollup-plugin-commonjs'

export default {
  external: ['firebase', 'pubsub-js'],  
    input: 'tmp/js/app.js',
    output: {
      file: 'dist/js/app.js',
      format: 'iife',
      name: 'rollupBundlehh',
      globals: {
        'firebase': 'firebase',
        'pubsub-js': 'PubSub'
      },
    },
    plugins: [
      resolve(),
      commonJS({
        include: 'node_modules/**'
      })
    ]
  };