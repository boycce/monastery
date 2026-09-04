---
title: Migrating from the image plugin
parent: File Plugin
---

# Migrating from the image plugin

v5 renamed the image plugin to the file plugin. File objects stored in your database are unchanged, only your code needs updating.

**Manager setup**

```js
// Before
monastery('localhost/mydb', { imagePlugin: { ... } })
// After
monastery('localhost/mydb', { filePlugin: { ... } })
```

**Model schema**

```js
// Before
logo: { type: 'image' }
// After
logo: { type: 'file' }
```

**References**

- `manager.imagePlugin` is now `manager.filePlugin`
- `model.imageFields` is now `model.fileFields`
- In the upload hooks, `ctx.image` is now `ctx.fileObject` and `ctx.imageField` is now `ctx.fileField`

Both `imagePlugin` and `type: 'image'` now throw an error.

### Example source code migration script

**Warning:** this script rewrites your source files in place. Commit or back up your work before running it, and review the diff afterwards.

Save the script below and run it against your source directory, e.g. `node migrate-file-plugin.js ./src`. Destructured hook arguments like `({ image, imageField })` aren't covered.

```js
// migrate-file-plugin.js
const fs = require('fs')
const path = require('path')

const skip = ['node_modules', '.git', 'dist', 'build']
const exts = ['.js', '.mjs', '.cjs', '.ts']
const renames = [
  [/\bimagePlugin\b/g, 'filePlugin'],
  [/type:\s*(['"])image\1/g, "type: 'file'"],
  [/\bctx\.image\b/g, 'ctx.fileObject'],
  [/\bctx\.imageField\b/g, 'ctx.fileField'],
  [/\bimageFields\b/g, 'fileFields'],
]

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (skip.includes(name)) continue
    const file = path.join(dir, name)
    if (fs.statSync(file).isDirectory()) walk(file)
    else if (exts.includes(path.extname(file))) migrate(file)
  }
}

function migrate(file) {
  const src = fs.readFileSync(file, 'utf8')
  const out = renames.reduce((s, [re, to]) => s.replace(re, to), src)
  if (out === src) return
  fs.writeFileSync(file, out)
  console.log('updated', file)
}

walk(process.argv[2] || '.')
```
