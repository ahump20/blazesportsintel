#!/bin/bash

# Blaze Sports Intel - Deployment Test Suite
echo "🔥 BLAZE SPORTS INTEL - DEPLOYMENT TESTING"
echo "========================================"
echo "Deep South Sports Authority Verification"
echo ""

TEST_URL="https://c8584ca5.blazesportsintel.pages.dev"
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
run_test() {
    local test_name="$1"
    local command="$2"
    echo -n "🧪 Testing $test_name... "
    if eval "$command" > /dev/null 2>&1; then
        echo "✅ PASSED"
        ((TESTS_PASSED++))
    else
        echo "❌ FAILED"
        ((TESTS_FAILED++))
    fi
}

# Test 1: Homepage accessibility
run_test "Homepage loads" "curl -s -o /dev/null -w '%{http_code}' $TEST_URL | grep -q '200'"

# Test 2: Content verification
run_test "Blaze Sports Intel branding" "curl -s $TEST_URL | grep -q 'Blaze Sports Intel'"

# Test 3: Sports navigation
run_test "Baseball section exists" "curl -s $TEST_URL | grep -q 'Baseball'"
run_test "Football section exists" "curl -s $TEST_URL | grep -q 'Football'"
run_test "Basketball section exists" "curl -s $TEST_URL | grep -q 'Basketball'"
run_test "Track section exists" "curl -s $TEST_URL | grep -q 'Track'"

# Test 4: Data files
run_test "Cardinals data created" "test -f data/mlb/cardinals.json"
run_test "Titans data created" "test -f data/nfl/titans.json"
run_test "Longhorns data created" "test -f data/ncaa/football/longhorns.json"
run_test "Grizzlies data created" "test -f data/nba/grizzlies.json"
run_test "Texas HS Football data" "test -f data/highschool/football/rankings.json"
run_test "Perfect Game data" "test -f data/perfectgame/prospects.json"
run_test "Track data created" "test -f data/track/texas-relays.json"

# Test 5: Build artifacts
run_test "Web build output exists" "test -d apps/web/dist"
run_test "Index.html exists" "test -f apps/web/dist/index.html"
run_test "JavaScript bundles created" "ls apps/web/dist/assets/*.js 2>/dev/null | head -1"

# Test 6: Performance
echo ""
echo "🏁 Performance Metrics:"
RESPONSE_TIME=$(curl -s -o /dev/null -w '%{time_total}' $TEST_URL)
echo "   Response time: ${RESPONSE_TIME}s"

if (( $(echo "$RESPONSE_TIME < 1.0" | bc -l) )); then
    echo "   ✅ Performance: EXCELLENT (<1s)"
    ((TESTS_PASSED++))
elif (( $(echo "$RESPONSE_TIME < 2.0" | bc -l) )); then
    echo "   ⚠️  Performance: ACCEPTABLE (1-2s)"
    ((TESTS_PASSED++))
else
    echo "   ❌ Performance: POOR (>2s)"
    ((TESTS_FAILED++))
fi

# Summary
echo ""
echo "========================================"
echo "📋 TEST SUMMARY"
echo "   ✅ Tests Passed: $TESTS_PASSED"
echo "   ❌ Tests Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo "🎆 ALL TESTS PASSED! 🎆"
    echo "Blaze Sports Intel is ready for production!"
    exit 0
else
    echo "⚠️  Some tests failed. Please review and fix."
    exit 1
fi