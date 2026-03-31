import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

const distDir = path.resolve('dist')
const assetsDir = path.join(distDir, 'assets')
const htmlPath = path.join(distDir, 'index.html')

if (!fs.existsSync(htmlPath) || !fs.existsSync(assetsDir)) {
  console.error('Missing dist output. Run `npm run build` before perf:budget.')
  process.exit(1)
}

const html = fs.readFileSync(htmlPath, 'utf8')

const preloadJs = [
  ...html.matchAll(/(?:script[^>]*src|modulepreload[^>]*href)="\/(assets\/[^"]+\.js)"/g),
].map((m) => m[1])

const preloadCss = [...html.matchAll(/stylesheet[^>]*href="\/(assets\/[^"]+\.css)"/g)].map(
  (m) => m[1]
)

const uniq = (values) => [...new Set(values)]

function sizeForAssets(files) {
  let rawBytes = 0
  let gzipBytes = 0

  for (const file of files) {
    const assetPath = path.join(distDir, file)
    if (!fs.existsSync(assetPath)) continue
    const buffer = fs.readFileSync(assetPath)
    rawBytes += buffer.length
    gzipBytes += zlib.gzipSync(buffer).length
  }

  return { rawBytes, gzipBytes }
}

const jsAssetFiles = fs.readdirSync(assetsDir).filter((file) => file.endsWith('.js'))
const cssAssetFiles = fs.readdirSync(assetsDir).filter((file) => file.endsWith('.css'))

const initialJs = sizeForAssets(uniq(preloadJs))
const initialCss = sizeForAssets(uniq(preloadCss))
const totalJs = sizeForAssets(jsAssetFiles.map((file) => `assets/${file}`))
const totalCss = sizeForAssets(cssAssetFiles.map((file) => `assets/${file}`))

const BUDGETS_KB = {
  initialJsGzip: 150,
  initialCssGzip: 12,
  totalJsGzip: 170,
  entryJsRaw: 30,
}

const entryChunk = (html.match(/<script[^>]*src="\/(assets\/[^"]+\.js)"/) || [])[1]
const entrySize = entryChunk ? sizeForAssets([entryChunk]) : { rawBytes: 0, gzipBytes: 0 }

const toKB = (bytes) => bytes / 1024
const checks = [
  {
    name: 'Initial JS gzip',
    value: toKB(initialJs.gzipBytes),
    budget: BUDGETS_KB.initialJsGzip,
  },
  {
    name: 'Initial CSS gzip',
    value: toKB(initialCss.gzipBytes),
    budget: BUDGETS_KB.initialCssGzip,
  },
  {
    name: 'Total JS gzip',
    value: toKB(totalJs.gzipBytes),
    budget: BUDGETS_KB.totalJsGzip,
  },
  {
    name: 'Entry JS raw',
    value: toKB(entrySize.rawBytes),
    budget: BUDGETS_KB.entryJsRaw,
  },
]

console.log('Performance Budget Report')
console.log('-------------------------')
for (const check of checks) {
  const pass = check.value <= check.budget
  const status = pass ? 'PASS' : 'FAIL'
  console.log(`${status} ${check.name}: ${check.value.toFixed(2)} KB (budget ${check.budget} KB)`)
}

console.log('\nDetails')
console.log(`Initial JS: ${toKB(initialJs.rawBytes).toFixed(2)} KB raw / ${toKB(initialJs.gzipBytes).toFixed(2)} KB gzip`)
console.log(`Initial CSS: ${toKB(initialCss.rawBytes).toFixed(2)} KB raw / ${toKB(initialCss.gzipBytes).toFixed(2)} KB gzip`)
console.log(`Total JS: ${toKB(totalJs.rawBytes).toFixed(2)} KB raw / ${toKB(totalJs.gzipBytes).toFixed(2)} KB gzip`)
console.log(`Total CSS: ${toKB(totalCss.rawBytes).toFixed(2)} KB raw / ${toKB(totalCss.gzipBytes).toFixed(2)} KB gzip`)

const hasFailures = checks.some((check) => check.value > check.budget)
if (hasFailures) {
  process.exit(1)
}
