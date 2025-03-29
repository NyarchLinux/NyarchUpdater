#!/bin/bash
APPID="moe.nyarchlinux.updater"

# Function to handle cleanup
cleanup() {
    echo "Cleaning up..."
    flatpak remove --user $APPID --noninteractive --delete-data
}

# Trap SIGINT (Ctrl + C) and call the cleanup function
trap 'cleanup; exit' SIGINT

git add *
git commit -m "test"
flatpak-builder --install --user --force-clean flatpak-app "$APPID".json
git reset --soft HEAD~1

# Run the flatpak application
flatpak run $APPID

# Call the cleanup function after the flatpak application exits
cleanup