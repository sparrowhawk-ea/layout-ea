import commonjs from '@rollup/plugin-commonjs'
import dts from 'rollup-plugin-dts'
import esbuild from 'rollup-plugin-esbuild'
import { nodeResolve } from '@rollup/plugin-node-resolve'

export default [
  {
    input: 'src/index.ts',
    plugins: [esbuild(), nodeResolve(), commonjs()],
    output: [
      {
        esModule: false,
        exports: 'named',
        file: `dist/index.js`,
        format: 'umd',
        name: 'LayoutEa'
      },
      {
        exports: 'named',
        file: `dist/index.mjs`,
        format: 'es'
      },
    ],
  },{
    input: 'src/index.ts',
    plugins: [dts()],
    output: {
      file: `dist/index.d.ts`,
      format: 'es',
    },
  },
]
