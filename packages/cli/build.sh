#!/bin/bash

DEFINE_NODEENV="--define:process.env.NODE_ENV=\"production\""
MINIFY="--minify"

while [[ $# -gt 0 ]]; do
  case $1 in
    --dev)
      DEFINE_NODEENV=""
      MINIFY=""
      shift # past argument
      ;;
    -*|--*)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

esbuild src/cli.tsx \
    $DEFINE_NODEENV \
    --outfile=build/cli.js \
    --platform=node \
    --target=node16 \
    --format=esm \
    --bundle \
    $MINIFY \
    --sourcemap \
    --external:zwave-js \
    --external:react-devtools-core \
    --external:yoga-wasm-web \
    --banner:js="import { createRequire } from 'module'; var require = require || createRequire(import.meta.url);"
    # Fix esbuild not being able to do dynamic require() in ESM mode
