import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Accesos rápidos del login (solo desarrollo). Mismo patrón que el resto de
// suites: esbuild + node --test.
await mkdir('.cache', { recursive: true });

const baseOptions = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  tsconfig: 'tsconfig.app.json',
  jsx: 'automatic',
  loader: { '.css': 'empty' },
};

// Compila StaffLoginPage como lo haría Vite en cada modo y devuelve el código.
async function bundleLoginPage(dev) {
  const result = await build({
    ...baseOptions,
    entryPoints: ['src/public/pages/StaffLoginPage.tsx'],
    write: false,
    minify: true,
    define: {
      'import.meta.env': JSON.stringify({
        DEV: dev,
        PROD: !dev,
        VITE_API_BASE_URL: 'http://localhost:8080/api/v1',
      }),
      'import.meta.env.DEV': JSON.stringify(dev),
    },
  });
  return result.outputFiles.map((file) => file.text).join('\n');
}

test('producción: el login no incluye el componente ni las credenciales demo', async () => {
  const code = await bundleLoginPage(false);
  for (const secret of ['admin@aurora.test', 'huesped1', 'Acceso rápido', 'DevQuickLogin']) {
    assert.ok(!code.includes(secret), `el bundle de producción no debe contener "${secret}"`);
  }
});

test('desarrollo: el login sí incluye los accesos rápidos', async () => {
  const code = await bundleLoginPage(true);
  assert.ok(code.includes('admin@aurora.test'));
  assert.ok(code.includes('Acceso r'));
});

await build({
  ...baseOptions,
  entryPoints: ['tests/dev-quick-login.test.jsx'],
  outfile: '.cache/dev-quick-login.test.cjs',
  define: {
    'import.meta.env': JSON.stringify({
      DEV: true,
      VITE_API_BASE_URL: 'http://localhost:8080/api/v1',
    }),
  },
});
const result = spawnSync(process.execPath, ['--test', '.cache/dev-quick-login.test.cjs'], {
  stdio: 'inherit',
});
if (result.status !== 0) process.exitCode = result.status ?? 1;
