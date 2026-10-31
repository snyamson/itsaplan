#!/usr/bin/env bash
# Asks Coolify to redeploy an application and waits until the deployment ends.
#
#   COOLIFY_URL=https://coolify.example.com COOLIFY_APP_UUID=<uuid> COOLIFY_TOKEN=<token> \
#     scripts/deploy-coolify.sh
#
# The token is a Coolify API token with the deploy permission. DEPLOY_TIMEOUT_SECONDS and
# DEPLOY_POLL_SECONDS set how long to wait and how often to look (default 1200 s, 10 s).
set -uo pipefail

: "${COOLIFY_URL:?COOLIFY_URL is not set}"
: "${COOLIFY_APP_UUID:?COOLIFY_APP_UUID is not set}"
: "${COOLIFY_TOKEN:?COOLIFY_TOKEN is not set}"
COOLIFY_URL="${COOLIFY_URL%/}"
timeout="${DEPLOY_TIMEOUT_SECONDS:-1200}"
poll="${DEPLOY_POLL_SECONDS:-10}"

field() { # field <name>: the first string value with that name in a JSON document
    grep -o "\"$1\":\"[^\"]*\"" | head -1 | cut -d'"' -f4
}

api() { # api <method> <path> [curl options]
    local method="$1" path="$2"
    shift 2
    curl -sS -m 30 -X "$method" -H "Authorization: Bearer $COOLIFY_TOKEN" \
        -H 'Accept: application/json' -H 'Content-Type: application/json' \
        -w '\n%{http_code}' "$@" "$COOLIFY_URL/api/v1$path"
}

response="$(api POST "/deploy?uuid=$COOLIFY_APP_UUID&force=false" \
    -d "{\"uuid\":\"$COOLIFY_APP_UUID\",\"force\":false}")"
status="${response##*$'\n'}"
body="${response%$'\n'*}"
if [ "$status" != 200 ]; then
    echo "Coolify refused the deploy request (HTTP $status): $(printf '%s' "$body" | head -c 300)"
    exit 1
fi

deployment="$(printf '%s' "$body" | field deployment_uuid)"
if [ -z "$deployment" ]; then
    echo "Coolify answered without a deployment id: $(printf '%s' "$body" | head -c 300)"
    exit 1
fi
echo "Deployment $deployment queued."

deadline=$((SECONDS + timeout))
while [ "$SECONDS" -lt "$deadline" ]; do
    response="$(api GET "/deployments/$deployment")"
    status="${response##*$'\n'}"
    body="${response%$'\n'*}"
    if [ "$status" = 200 ]; then
        # The response also carries the application's own status (running:healthy), so only
        # a deployment state counts.
        state="$(printf '%s' "$body" | grep -oE '"status":"(queued|in_progress|finished|failed|cancelled-by-user)"' | head -1 | cut -d'"' -f4)"
        case "$state" in
            finished)
                echo "Deployment finished."
                exit 0
                ;;
            failed | cancelled-by-user)
                echo "Deployment ended as '$state'. The logs are in Coolify under Deployments."
                exit 1
                ;;
            '') echo "  no deployment status in the answer: $(printf '%s' "$body" | head -c 200)" ;;
            *) echo "  deployment is $state" ;;
        esac
    else
        echo "  could not read the deployment (HTTP $status), trying again"
    fi
    sleep "$poll"
done

echo "Deployment did not finish within ${timeout}s."
exit 1
