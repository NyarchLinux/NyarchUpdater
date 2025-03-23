#!/bin/bash
APPID="moe.nyarchlinux.updater"
git add *
git commit -m "test"
flatpak-builder --install --user --force-clean flatpak-app "$APPID".json
git reset --soft HEAD~1
flatpak run $APPID