import esbuild from 'esbuild';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function build() {
  console.log('🔨 Building with esbuild...');

  try {
    // Get all TypeScript files
    const entryPoints = await glob('src/**/*.ts', {
      ignore: ['**/*.spec.ts', '**/*.test.ts'],
      cwd: __dirname,
    });

    await esbuild.build({
      entryPoints,
      bundle: false,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outdir: 'dist',
      sourcemap: true,
      keepNames: true,
      preserveSymlinks: true,
      logLevel: 'info',
      loader: {
        '.ts': 'ts',
      },
      tsconfig: './tsconfig.build.json',
    });

    console.log('✅ Build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
