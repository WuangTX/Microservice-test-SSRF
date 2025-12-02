#!/bin/bash
# ============================================================
# SEMGREP SCAN - SSRF Vulnerability Detection
# Static Analysis Security Testing (SAST)
# ============================================================

echo "🔍 SEMGREP - SSRF Vulnerability Scanner"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if semgrep is installed
if ! command -v semgrep &> /dev/null; then
    echo -e "${RED}❌ Semgrep not installed${NC}"
    echo "Install: pip install semgrep"
    echo "Or use Docker: docker run --rm -v \"\${PWD}:/src\" returntocorp/semgrep semgrep --config=auto"
    exit 1
fi

echo -e "${GREEN}✅ Semgrep installed${NC}"
echo ""

# Scan with security audit rules
echo -e "${YELLOW}[1/4] Running security audit...${NC}"
semgrep --config="p/security-audit" \
    --config="p/ssrf" \
    --exclude="node_modules" \
    --exclude="target" \
    --exclude=".git" \
    --json \
    --output=semgrep-results.json \
    .

echo ""
echo -e "${YELLOW}[2/4] Scanning Python services for SSRF...${NC}"
semgrep \
    --lang python \
    --pattern 'requests.$METHOD($URL, ...)' \
    --pattern 'urllib.request.urlopen($URL)' \
    --pattern 'httpx.$METHOD($URL, ...)' \
    product-service/ inventory-service/ order-service/

echo ""
echo -e "${YELLOW}[3/4] Scanning Java services for SSRF...${NC}"
semgrep \
    --lang java \
    --pattern 'new URL($INPUT).openConnection()' \
    --pattern 'restTemplate.getForObject($INPUT, ...)' \
    --pattern 'HttpClient.send($REQUEST, ...)' \
    user-service/

echo ""
echo -e "${YELLOW}[4/4] Custom SSRF pattern detection...${NC}"

# Custom rules for this project
cat > ssrf-custom-rules.yaml << 'EOF'
rules:
  - id: ssrf-requests-get-user-input
    pattern: requests.get($INPUT, ...)
    message: |
      Potential SSRF vulnerability detected!
      User input flows directly to requests.get() without validation.
      Verify that $INPUT is validated against internal URLs.
    severity: ERROR
    languages: [python]
    metadata:
      cwe: "CWE-918: Server-Side Request Forgery (SSRF)"
      owasp: "A10:2021 - Server-Side Request Forgery"
      
  - id: ssrf-url-open-connection
    pattern: new URL($INPUT).openConnection()
    message: |
      SSRF vulnerability - URL opens connection to user input.
      Ensure $INPUT is validated and not from untrusted sources.
    severity: ERROR
    languages: [java]
    
  - id: missing-url-validation
    patterns:
      - pattern: $VAR = request.$METHOD.get('$PARAM')
      - pattern: requests.get($VAR, ...)
      - metavariable-regex:
          metavariable: $PARAM
          regex: .*(url|uri|link|callback|webhook|redirect).*
    message: URL parameter passed to HTTP client without validation
    severity: WARNING
    languages: [python]
EOF

semgrep --config=ssrf-custom-rules.yaml .

echo ""
echo "========================================"
echo -e "${GREEN}✅ Scan completed!${NC}"
echo ""
echo "📊 Results saved to: semgrep-results.json"
echo ""
echo "🔍 Vulnerabilities found:"
cat semgrep-results.json | jq '.results | length'
echo ""
echo "📋 View detailed results:"
echo "  jq '.results[] | {file: .path, line: .start.line, message: .extra.message}' semgrep-results.json"
echo ""
echo "🌐 Upload to Semgrep App:"
echo "  semgrep ci"
