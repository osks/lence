#!/bin/bash
# Download vendor libraries for Lence
# Run this script after cloning the repository

set -e

VENDOR_DIR="$(dirname "$0")/../static/vendor"
mkdir -p "$VENDOR_DIR"/{lit,marked,echarts}

echo "Downloading vendor libraries..."

# Lit - Web Components library
echo "  Downloading Lit..."
curl -sL "https://cdn.jsdelivr.net/npm/lit@3/+esm" -o "$VENDOR_DIR/lit/lit-all.min.js"

# Marked - Markdown parser
echo "  Downloading Marked..."
curl -sL "https://cdn.jsdelivr.net/npm/marked@11/+esm" -o "$VENDOR_DIR/marked/marked.esm.js"

# ECharts - Charting library
echo "  Downloading ECharts..."
curl -sL "https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.esm.min.js" -o "$VENDOR_DIR/echarts/echarts.esm.min.js"

# Pico CSS
echo "  Downloading Pico CSS..."
curl -sL "https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" -o "$(dirname "$0")/../static/css/pico.min.css"

echo "Done! Vendor libraries downloaded to $VENDOR_DIR"
