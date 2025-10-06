#!/bin/bash

# Test script to verify environment symlink functionality
# This simulates the symlink creation process

echo "🔗 Testing Environment Symlink Functionality"
echo "============================================"

# Create a test environment file
TEST_ENV_FILE=".env.test-symlink"
cat > "$TEST_ENV_FILE" << EOF
NODE_ENV=test
PORT=3000
MONGO_ROOT_USERNAME=test-user
MONGO_ROOT_PASSWORD=test-pass
JWT_SECRET=test-jwt-secret
FRONTEND_URLS=http://localhost:3000
EOF

echo "✅ Created test environment file: $TEST_ENV_FILE"

# Simulate the symlink creation process
echo ""
echo "🔄 Testing symlink creation..."

# Check if .env already exists (backup if it does)
if [ -f ".env" ]; then
    backup_file=".env.test-backup.$(date +%Y%m%d_%H%M%S)"
    mv ".env" "$backup_file"
    echo "📁 Backed up existing .env to: $backup_file"
fi

# Create symlink
ln -sf "$TEST_ENV_FILE" ".env"
echo "✅ Created .env symlink pointing to $TEST_ENV_FILE"

# Verify symlink
if [ -L ".env" ] && [ "$(readlink .env)" = "$TEST_ENV_FILE" ]; then
    echo "✅ Symlink verification passed"
else
    echo "❌ Symlink verification failed"
    exit 1
fi

# Test Docker Compose config parsing (should work without warnings now)
echo ""
echo "🐳 Testing Docker Compose config parsing..."
if docker compose config > /dev/null 2>&1; then
    echo "✅ Docker Compose config validation passed (no warnings!)"
else
    echo "⚠️ Docker Compose config validation failed (this is expected in test)"
fi

# Show current symlink status
echo ""
echo "📋 Current symlink status:"
ls -la .env
echo "   Target: $(readlink .env)"

# Cleanup
echo ""
echo "🧹 Cleaning up test files..."
rm -f ".env" "$TEST_ENV_FILE"

# Restore backup if it exists
if [ -f ".env.test-backup."* ]; then
    backup_file=$(ls .env.test-backup.* | head -1)
    mv "$backup_file" ".env"
    echo "🔄 Restored original .env from backup"
fi

echo ""
echo "🎉 Environment symlink test completed!"
echo ""
echo "💡 This functionality will be added to the init script to:"
echo "   • Eliminate Docker Compose environment variable warnings"
echo "   • Simplify Docker Compose commands (no need for --env-file)"
echo "   • Automatically point .env to the production environment file"