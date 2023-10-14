import resolve from "@rollup/plugin-node-resolve";
import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import eslint from '@rollup/plugin-eslint';
// import pkg from './package.json';

const terserOptions = {
  // sourceMap: {
  //   // filename: "editor.min.js",
  //   url: "inline"
  // },
  // mangle:   true,
  // compress: {
  //   unused:        false,
  //   sequences:     true,
  //   dead_code:     true,
  //   conditionals:  true,
  //   booleans:      true,
  //   if_return:     true,
  //   join_vars:     true,
  //   drop_console:  false,
  //   drop_debugger: false,
  //   typeofs:       false,
  // },
//   output: {
//     preamble: `/**
//  * ${pkg.name}
//  * ${pkg.description}
//  *
//  * @version ${pkg.version}
//  * @author ${pkg.author}
//  * @license ${pkg.license}
//  * @link ${pkg.homepage}
//  */
// `.trimStart()
//   },
}

export default {
  input: "index.js",
  output: {
    file: "output.min.js",
    format: "iife",
    // sourcemap: true,
    // plugins: [
    //   terser(terserOptions)
    // ],
    // sourcemap: process.env.BUILD === "production" ? false : 'inline',
  },
  plugins: [
    resolve({
      jsnext: true,
      main: true,
      browser: true
    }),
    commonjs(),
    eslint({
      throwOnError: true,
      throwOnWarning: false
    }),
    babel({
      babelHelpers: "bundled"
    }),
    terser(terserOptions)
  ]
};
