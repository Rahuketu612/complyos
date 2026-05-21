#!/bin/bash
# COMPLYOS E2E Smoke Test Script
# Tests core functionality without exposing tokens

set -e

echo "=========================================="
echo "COMPLYOS E2E Smoke Test"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0

log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; ((PASS_COUNT++)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; ((FAIL_COUNT++)); }
log_info() { echo -e "[INFO] $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

cleanup() {
  if [ -n "$TOKEN_FILE" ]; then
    rm -f "$TOKEN_FILE"
  fi
}
trap cleanup EXIT

# ===================
# TEST 1: Gateway Health
# ===================
test_gateway_health() {
  log_info "Testing gateway health..."
  
  if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
    log_pass "Gateway health check"
    return 0
  else
    log_fail "Gateway health check"
    return 1
  fi
}

# ===================
# TEST 2: Auth Health
# ===================
test_auth_health() {
  log_info "Testing auth-service health..."
  
  if curl -sf http://localhost:3001/auth/health > /dev/null 2>&1; then
    log_pass "Auth-service health check"
    return 0
  else
    log_fail "Auth-service health check"
    return 1
  fi
}

# ===================
# TEST 3: Login (Demo User)
# ===================
test_login() {
  log_info "Testing login with demo credentials..."
  
  TOKEN_FILE=$(mktemp)
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"demo@complyos.dev","password":"DemoPassword123!"}' \
    -w "\n%{http_code}" \
    2>&1) || true
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  
  if [ "$HTTP_CODE" = "200" ]; then
    # Extract access token (don't log it)
    TOKEN=$(echo "$RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4 || true)
    
    if [ -n "$TOKEN" ]; then
      echo "$TOKEN" > "$TOKEN_FILE"
      log_pass "Login successful"
      return 0
    fi
  fi
  
  log_fail "Login failed (HTTP: $HTTP_CODE)"
  return 1
}

# ===================
# TEST 4: Get Businesses
# ===================
test_get_businesses() {
  log_info "Testing GET /api/businesses..."
  
  if [ ! -f "$TOKEN_FILE" ]; then
    log_fail "No token available - skipping test"
    return 1
  fi
  
  TOKEN=$(cat "$TOKEN_FILE")
  
  RESPONSE=$(curl -s -X GET http://localhost:3000/api/businesses \
    -H "Authorization: Bearer $TOKEN" \
    -w "\n%{http_code}" 2>&1)
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  
  if [ "$HTTP_CODE" = "200" ]; then
    log_pass "GET /api/businesses (authenticated)"
    return 0
  elif [ "$HTTP_CODE" = "401" ]; then
    log_fail "Authentication failed - token may be expired"
    return 1
  else
    log_fail "GET /api/businesses failed (HTTP: $HTTP_CODE)"
    return 1
  fi
}

# ===================
# Run All Tests
# ===================

echo ""
test_gateway_health || true
test_auth_health || true
test_login || true
test_get_businesses || true

echo ""
echo "=========================================="
echo "Results: $PASS_COUNT passed, $FAIL_COUNT failed"
echo "=========================================="

if [ $FAIL_COUNT -gt 0 ]; then
  exit 1
fi

exit 0