#!/bin/bash
# Setup MongoDB keyfile for replica set authentication

set -e

KEYFILE_PATH="./keyfile"
EXAMPLE_PATH="./keyfile.example"

echo "🔐 Setting up MongoDB keyfile for development..."

if [[ -f "$KEYFILE_PATH" ]]; then
    echo "✅ Keyfile already exists at $KEYFILE_PATH"
else
    if [[ -f "$EXAMPLE_PATH" ]]; then
        echo "📋 Copying from keyfile.example..."
        cp "$EXAMPLE_PATH" "$KEYFILE_PATH"
    else
        echo "🔧 Generating new keyfile..."
        # Generate a random 1024-character base64 key
        openssl rand -base64 756 | tr -d '\n' > "$KEYFILE_PATH"
    fi
    
    echo "✅ Keyfile created at $KEYFILE_PATH"
fi

# Set proper permissions for MongoDB
chmod 600 "$KEYFILE_PATH"
echo "🔒 Set keyfile permissions to 600"

echo "🎉 MongoDB keyfile setup complete!"
echo ""
echo "💡 Note: This keyfile is for development only."
echo "   For production, generate a unique keyfile per environment."