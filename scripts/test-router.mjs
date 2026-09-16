import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

await mkdir('.cache', { recursive: true });
await build({
  entryPoints: ['tests/router.test.jsx'],
  outfile: '.cache/router.test.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  tsconfig: 'tsconfig.app.json',
  jsx: 'automatic',
  loader: { '.css': 'empty' },
  plugins: [
    {
      name: 'memory-history',
      setup(builder) {
        builder.onResolve({ filter: /^react-router-dom$/ }, (args) =>
          args.namespace === 'memory-history'
            ? { path: 'react-router-dom', external: true }
            : { path: 'router', namespace: 'memory-history' },
        );
        builder.onLoad({ filter: /.*/, namespace: 'memory-history' }, () => ({
          contents:
            "export * from 'react-router-dom'; import { createMemoryRouter } from 'react-router-dom'; export const createBrowserRouter = (routes) => createMemoryRouter(routes);",
          loader: 'js',
        }));
      },
    },
  ],
});
const result = spawnSync(process.execPath, ['--test', '.cache/router.test.cjs'], {
  stdio: 'inherit',
});
process.exitCode = result.status ?? 1;
