#!/usr/bin/env bash
set -euo pipefail

npx next build

rm -rf netlify-dist
mkdir -p netlify-dist/_next
cp .next/server/app/index.html netlify-dist/index.html
cp -R public/. netlify-dist/
cp -R .next/static netlify-dist/_next/static
