#!/usr/bin/env bash
# One-time activation of the repo's git hooks (they live in .githooks, which is tracked).
# Run from anywhere inside the repo:  bash tools/setup-hooks.sh
set -e
cd "$(git rev-parse --show-toplevel)"
git config core.hooksPath .githooks
chmod +x .githooks/*
echo "hooks active: core.hooksPath = $(git config core.hooksPath)"
echo "pre-push runs drift-check + the service-worker bump check on every push, and the games load pass when game files change."
echo "skip once with: git push --no-verify"
