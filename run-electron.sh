#!/usr/bin/env bash
set -e

npm run build

export ELECTRON_DISABLE_GPU=1
export ELECTRON_DISABLE_SANDBOX=1
export DISPLAY=:0

electron . --no-sandbox --disable-gpu --disable-dev-shm-usage --disable-software-rasterizer --headless
