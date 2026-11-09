import { access, copyFile, cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendorRoot = path.join(root, 'vendor');
const packages = [
  {
    name: 'katex',
    files: [
      ['dist/katex.min.css', 'katex.min.css'],
      ['dist/katex.min.js', 'katex.min.js'],
      ['dist/contrib/auto-render.min.js', 'auto-render.min.js']
    ],
    directories: [['dist/fonts', 'fonts']]
  },
  {
    name: 'marked',
    files: [['marked.min.js', 'marked.umd.js']]
  },
  {
    name: 'dompurify',
    files: [['dist/purify.min.js', 'purify.min.js']]
  },
  {
    name: '@highlightjs/cdn-assets',
    destination: 'highlight.js',
    files: [
      ['highlight.min.js', 'highlight.min.js'],
      ['styles/atom-one-dark.min.css', 'atom-one-dark.min.css']
    ]
  },
  {
    name: 'chart.js',
    files: [['dist/chart.umd.js', 'chart.umd.js']]
  },
  {
    name: 'html2canvas',
    files: [['dist/html2canvas.min.js', 'html2canvas.min.js']]
  },
  {
    name: 'pdfjs-dist',
    destination: 'pdfjs',
    files: [
      ['build/pdf.min.mjs', 'pdf.min.js'],
      ['build/pdf.worker.min.mjs', 'pdf.worker.min.js']
    ]
  }
];

async function copyPackageAssets(packageInfo) {
  const packageRoot = path.join(root, 'node_modules', packageInfo.name);
  const destination = path.join(vendorRoot, packageInfo.destination || packageInfo.name);
  await mkdir(destination, { recursive: true });

  for (const [source, target] of packageInfo.files || []) {
    await copyFile(path.join(packageRoot, source), path.join(destination, target));
  }
  for (const [source, target] of packageInfo.directories || []) {
    await cp(path.join(packageRoot, source), path.join(destination, target), { recursive: true });
  }

  for (const licenseFile of ['LICENSE', 'LICENSE.md', 'LICENSE.txt']) {
    try {
      await access(path.join(packageRoot, licenseFile));
      await copyFile(path.join(packageRoot, licenseFile), path.join(destination, 'LICENSE.txt'));
      return;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  throw new Error(`No license file found for ${packageInfo.name}.`);
}

await mkdir(vendorRoot, { recursive: true });
for (const packageInfo of packages) {
  await copyPackageAssets(packageInfo);
}
console.log(`Vendored ${packages.length} browser libraries to ${path.relative(root, vendorRoot)}.`);
