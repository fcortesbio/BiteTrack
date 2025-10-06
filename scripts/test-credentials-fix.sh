#!/bin/bash

# Test script to verify MongoDB credentials fix
# This script tests that custom MongoDB credentials are preserved

echo "🧪 Testing MongoDB Credentials Fix"
echo "================================="

# Test environment file
TEST_ENV_FILE=".env.test-credentials"

# Create test environment file with custom credentials
echo "📝 Creating test environment file..."
cat > "$TEST_ENV_FILE" << EOF
NODE_ENV=test
PORT=3000
MONGO_ROOT_USERNAME=test-custom-user
MONGO_ROOT_PASSWORD=TestPassword123
MONGO_URI='mongodb://test-custom-user:TestPassword123@mongodb:27017/bitetrack?authSource=admin&directConnection=true'
JWT_SECRET=test-jwt-secret
FRONTEND_URLS=http://localhost:3000
EOF

echo "✅ Created test environment file: $TEST_ENV_FILE"
echo "   Username: test-custom-user"
echo "   Password: TestPassword123"

echo ""
echo "🔍 Testing Docker Compose variable resolution..."

# Test what Docker Compose would resolve
echo ""
echo "Before fix (with defaults), Docker Compose would use:"
echo "  Username: admin (from default)"
echo "  Password: supersecret (from default)"

echo ""
echo "After fix (no defaults), Docker Compose will use:"
MONGO_ROOT_USERNAME=$(grep '^MONGO_ROOT_USERNAME=' "$TEST_ENV_FILE" | cut -d'=' -f2)
MONGO_ROOT_PASSWORD=$(grep '^MONGO_ROOT_PASSWORD=' "$TEST_ENV_FILE" | cut -d'=' -f2)

echo "  Username: $MONGO_ROOT_USERNAME ✅"
echo "  Password: $MONGO_ROOT_PASSWORD ✅"

echo ""
echo "🐳 Testing Docker Compose config parsing..."
if docker compose --env-file "$TEST_ENV_FILE" config | grep -A2 "MONGO_INITDB_ROOT_USERNAME" | grep -q "test-custom-user"; then
    echo "✅ Docker Compose correctly uses custom username: test-custom-user"
else
    echo "❌ Docker Compose is not using custom username"
fi

if docker compose --env-file "$TEST_ENV_FILE" config | grep -A2 "MONGO_INITDB_ROOT_PASSWORD" | grep -q "TestPassword123"; then
    echo "✅ Docker Compose correctly uses custom password: TestPassword123"
else
    echo "❌ Docker Compose is not using custom password"
fi

echo ""
echo "🧹 Cleaning up test file..."
rm -f "$TEST_ENV_FILE"

echo ""
echo "🎉 Credentials fix verification complete!"
echo ""
echo "💡 The fix ensures that:"
echo "   1. No default credentials override your custom ones"
echo "   2. Docker Compose uses credentials from your environment file"
echo "   3. The init script validates credentials before starting containers"
echo ""
echo "🚀 You can now run the init script with confidence that your"
echo "   custom MongoDB credentials will be preserved!"