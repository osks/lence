#!/bin/bash
#
# Collect all licenses and notices from npm production dependencies
# and generate a combined licenses file.
#
# Usage: ./scripts/collect-licenses.sh [output-file]
#

set -e

OUTPUT_FILE="${1:-licenses.txt}"
SELF_PACKAGE=$(jq -r '"lence@" + .version' package.json)

echo "Collecting licenses for npm production dependencies..."

# Get license info as JSON
LICENSE_JSON=$(npx license-checker --production --json --excludePackages "$SELF_PACKAGE")

# Start the output file
cat > "$OUTPUT_FILE" << 'EOF'
Third-Party Licenses
====================

This file contains the licenses for third-party software bundled in this package.

EOF

# Process each package
echo "$LICENSE_JSON" | jq -r 'to_entries[] | @base64' | while read -r entry; do
    # Decode the entry
    _jq() {
        echo "$entry" | base64 --decode | jq -r "$1"
    }

    pkg=$(_jq '.key')
    licenses=$(_jq '.value.licenses // "Unknown"')
    repository=$(_jq '.value.repository // "N/A"')
    license_file=$(_jq '.value.licenseFile // empty')
    notice_file=$(_jq '.value.noticeFile // empty')

    echo "  - $pkg ($licenses)"

    # Add package header
    {
        echo "--------------------------------------------------------------------------------"
        echo "$pkg"
        echo "License: $licenses"
        echo "Repository: $repository"
        echo "--------------------------------------------------------------------------------"
        echo ""
    } >> "$OUTPUT_FILE"

    # Add license file content if exists
    if [ -n "$license_file" ] && [ -f "$license_file" ]; then
        cat "$license_file" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi

    # Add notice file content if exists
    if [ -n "$notice_file" ] && [ -f "$notice_file" ]; then
        echo "--- NOTICE ---" >> "$OUTPUT_FILE"
        cat "$notice_file" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi

    echo "" >> "$OUTPUT_FILE"
done

echo ""
echo "✓ Generated $OUTPUT_FILE"
