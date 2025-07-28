#!/bin/bash
APPID="moe.nyarchlinux.updater"
BUILD_DIR="flatpak-app"
MANIFEST="$APPID.json"

git add *
git commit -m "test"

SHELL_DEBUG=all
echo "Building $APPID"
flatpak-builder --force-clean --user "$BUILD_DIR" "$MANIFEST"
echo "Running $APPID"
flatpak-builder --run "$BUILD_DIR" "$APPID.json" "$APPID"
git reset --soft HEAD~1