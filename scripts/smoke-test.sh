#!/usr/bin/env bash
# Checks a running stack from outside: the sign-in page, the api root and the auth
# endpoint. All checks are repeated until they pass together or the attempts run out,
# so the script can run right after a deploy.
#
#   scripts/smoke-test.sh https://desk.example.com https://api.desk.example.com
#
# SMOKE_ATTEMPTS and SMOKE_WAIT_SECONDS set the retries (default 12 x 10 s).
set -uo pipefail

WEB="${1:?usage: smoke-test.sh <web-url> <api-url>}"
API="${2:?usage: smoke-test.sh <web-url> <api-url>}"
WEB="${WEB%/}"
API="${API%/}"
attempts="${SMOKE_ATTEMPTS:-12}"
wait_seconds="${SMOKE_WAIT_SECONDS:-10}"

descriptions=("sign-in page renders" "api answers" "auth endpoint answers")
urls=("$WEB/login" "$API/" "$API/api/auth/ok")
expected=("<html" '"status":"ok"' '"ok":true')
failures=()

probe() { # probe <index>; sets failures[index] to a message, or empty when it passes
    local i="$1" body status
    body="$(curl -sS -m 10 -w '\n%{http_code}' "${urls[$i]}" 2>&1)"
    status="${body##*$'\n'}"
    if [[ "$status" == 200 && "$body" == *"${expected[$i]}"* ]]; then
        failures[$i]=""
    else
        failures[$i]="${urls[$i]} answered '$status' without '${expected[$i]}'"
    fi
}

echo "Smoke test: web $WEB, api $API"
for ((attempt = 1; attempt <= attempts; attempt++)); do
    for i in "${!urls[@]}"; do probe "$i"; done
    pending="$(printf '%s' "${failures[*]}")"
    [ -z "${pending// /}" ] && break
    [ "$attempt" -lt "$attempts" ] && sleep "$wait_seconds"
done

fail=0
for i in "${!urls[@]}"; do
    if [ -z "${failures[$i]}" ]; then
        echo "  ok    ${descriptions[$i]}"
    else
        echo "  FAIL  ${descriptions[$i]}: ${failures[$i]}"
        fail=1
    fi
done

if [ "$fail" != 0 ]; then
    echo "Smoke test FAILED."
    exit 1
fi
echo "Smoke test passed."
