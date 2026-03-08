#!/bin/bash
set -e

cd "$(dirname "$0")/.."

rm -rf build/ dist/

# Generate declaration files
tsc -p tsconfig.build.json

# Bundle the library
esbuild src/index.ts \
  --bundle \
  --sourcemap \
  --platform=browser \
  --target=es2022 \
  --outdir=dist \
  --format=esm \
  --external:@ralfstx/pdf-core

# Copy declaration files to dist
cp build/index.d.ts dist/
cp -a build/api dist/api

# Verify that all references in dist/index.d.ts resolve
node scripts/check-dist.ts
