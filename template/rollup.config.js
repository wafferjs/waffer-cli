import nodent from 'rollup-plugin-nodent'
import buble from 'rollup-plugin-buble'
import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import uglify from 'rollup-plugin-uglify'
import gzip from 'rollup-plugin-gzip'

import fs from 'fs'

const options = {
  plugins: [
    // NOTE: support async/await
    nodent({
      promises: true,
      noRuntime: true,
    }),

    // NOTE: add node modules
    resolve({
      jsNext: true,
      browser: true,
    }),
    commonjs({
      include: 'node_modules/**',
    }),

    // NOTE: transpile to es5
    buble({
      transforms: {
        dangerousForOf: true,
      }
    }),

    // NOTE: prepare for production
    uglify.uglify(),
    gzip(),
  ]
}

const views = fs.readdirSync('views/')
export default views.map(view => ({
  ...options,
  // NOTE: use app.js by default
  input: `views/${view}/scripts/app.js`,
  output: {
    file: `views/${view}/scripts/app.prod.js`,
    // NOTE: use iife since we want the smallest size
    format: 'iife',
    sourcemap: 'inline',
  },
}))
