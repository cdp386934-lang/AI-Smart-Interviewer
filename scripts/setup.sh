#!/usr/bin/env bash
set -euo pipefail
cp -n .env.example .env || true
cp -n .env.example .env.development || true
npm install
mkdir -p uploads
printf 'Setup complete. Please edit .env before starting.\n'
