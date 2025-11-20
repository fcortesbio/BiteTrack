#!/bin/bash

# BiteTrack API Endpoints Test Script
# Tests all critical endpoints after deployment

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

API_BASE_URL="${1:-http://localhost:3000}"
TESTS_PASSED=0
TESTS_FAILED=0

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="$3"
    local method="${4:-GET}"
    local data="${5:-}"
    
    if [ -n "$data" ]; then
        local actual_code=$(curl -s -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$url" -o /dev/null)
    else
        local actual_code=$(curl -s -w "%{http_code}" -X "$method" "$url" -o /dev/null)
    fi
    
    if [ "$actual_code" = "$expected_code" ]; then
        log_success "$name: $method $url → $actual_code"
    else
        log_error "$name: $method $url → Expected $expected_code, got $actual_code"
    fi
}

main() {
    log_info "Testing BiteTrack API endpoints at: $API_BASE_URL"
    echo ""
    
    # Health and basic endpoints
    log_info "=== Core System Endpoints ==="
    test_endpoint "Health Check" "$API_BASE_URL/api/v2/health" "200"
    test_endpoint "API Documentation" "$API_BASE_URL/api/v2/docs" "200"
    test_endpoint "OpenAPI Spec JSON" "$API_BASE_URL/api/v2/docs.json" "200"
    test_endpoint "Welcome Page" "$API_BASE_URL/" "200"
    echo ""
    
    # Authentication endpoints
    log_info "=== Authentication Endpoints ==="
    test_endpoint "Login (Invalid Data)" "$API_BASE_URL/api/v2/auth/login" "400" "POST" '{"email":"invalid","password":"test"}'
    test_endpoint "Login (Valid Format)" "$API_BASE_URL/api/v2/auth/login" "401" "POST" '{"email":"test@example.com","password":"wrongpassword"}'
    echo ""
    
    # Resource endpoints (should require authentication)
    log_info "=== Protected Resource Endpoints ==="
    test_endpoint "Sellers List (Unauthorized)" "$API_BASE_URL/api/v2/sellers" "401"
    test_endpoint "Customers List (Unauthorized)" "$API_BASE_URL/api/v2/customers" "401"
    test_endpoint "Products List (Unauthorized)" "$API_BASE_URL/api/v2/products" "401"
    test_endpoint "Sales List (Unauthorized)" "$API_BASE_URL/api/v2/sales" "401"
    test_endpoint "Reporting Analytics (Unauthorized)" "$API_BASE_URL/api/v2/reporting/sales/analytics" "401"
    echo ""
    
    # Test data endpoints
    log_info "=== Test Data Endpoints ==="
    test_endpoint "Test Data Status (Unauthorized)" "$API_BASE_URL/api/v2/test-data/status" "401"
    echo ""
    
    # Non-existent endpoints (should return 404)
    log_info "=== Non-Existent Endpoints ==="
    test_endpoint "Non-existent Route" "$API_BASE_URL/api/v2/nonexistent" "404"
    test_endpoint "Old API Path (No Prefix)" "$API_BASE_URL/auth/login" "404"
    test_endpoint "Old Docs Path" "$API_BASE_URL/api-docs" "404"
    echo ""
    
    # Summary
    local total_tests=$((TESTS_PASSED + TESTS_FAILED))
    echo "=== Test Results ==="
    log_info "Total tests: $total_tests"
    log_success "Passed: $TESTS_PASSED"
    if [ $TESTS_FAILED -gt 0 ]; then
        log_error "Failed: $TESTS_FAILED"
        exit 1
    else
        log_success "All tests passed!"
        echo ""
        log_info "Your BiteTrack API is responding on the /api/v2 namespace."
        log_info "Ready for reverse-proxy deployment!"
    fi
}

# Check if curl and jq are available
for tool in curl; do
    if ! command -v "$tool" &> /dev/null; then
        log_error "$tool is required but not installed"
        exit 1
    fi
done

main "$@"