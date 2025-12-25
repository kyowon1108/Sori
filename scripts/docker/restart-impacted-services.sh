#!/bin/sh
# SORI Docker Service Restart Script
# Analyzes git diff to identify and restart/rebuild impacted Docker services
# Usage:
#   ./scripts/docker/restart-impacted-services.sh          # Execute restart
#   DRY_RUN=1 ./scripts/docker/restart-impacted-services.sh # Dry-run mode

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN="${DRY_RUN:-0}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

# Service lists
BACKEND_SERVICES="backend celery-worker celery-beat flower"
FRONTEND_SERVICES="frontend"
INFRA_SERVICES="postgres redis nginx"
ALL_SERVICES="$BACKEND_SERVICES $FRONTEND_SERVICES $INFRA_SERVICES"

echo "${GREEN}=== SORI Docker Service Restart ===${NC}"
echo ""

# Get changed files
echo "${YELLOW}[1/5] Detecting changed files...${NC}"
if git rev-parse --verify origin/main >/dev/null 2>&1; then
    CHANGED_FILES=$(git diff --name-only origin/main...HEAD)
    echo "Comparing against: origin/main"
else
    CHANGED_FILES=$(git diff --name-only HEAD~1...HEAD)
    echo "Comparing against: HEAD~1"
fi

if [ -z "$CHANGED_FILES" ]; then
    echo "${YELLOW}No changed files detected. Exiting.${NC}"
    exit 0
fi

echo "Changed files:"
echo "$CHANGED_FILES" | sed 's/^/  - /'
echo ""

# Initialize service sets
RESTART_SERVICES=""
REBUILD_SERVICES=""

# Analyze changed files and map to services
echo "${YELLOW}[2/5] Mapping changes to services...${NC}"

# Backend source changes (mounted volume - restart only)
if echo "$CHANGED_FILES" | grep -q '^backend/app/.*\.py$'; then
    echo "  Backend Python code changed (volume mounted)"
    RESTART_SERVICES="$RESTART_SERVICES backend celery-worker celery-beat flower"
fi

# Backend dependency/build changes (rebuild required)
if echo "$CHANGED_FILES" | grep -qE '^backend/(requirements\.txt|Dockerfile|pyproject\.toml)$'; then
    echo "  Backend build context changed (rebuild required)"
    REBUILD_SERVICES="$REBUILD_SERVICES backend celery-worker celery-beat flower"
fi

# Frontend source changes (mounted volume - check if rebuild needed)
if echo "$CHANGED_FILES" | grep -qE '^frontend/(app|src|public)/'; then
    # Check if build files changed
    if echo "$CHANGED_FILES" | grep -qE '^frontend/(package\.json|package-lock\.json|next\.config\.|Dockerfile)'; then
        echo "  Frontend code + build files changed (rebuild required)"
        REBUILD_SERVICES="$REBUILD_SERVICES frontend"
    else
        echo "  Frontend code changed (volume mounted)"
        RESTART_SERVICES="$RESTART_SERVICES frontend"
    fi
fi

# Frontend build-only changes
if echo "$CHANGED_FILES" | grep -qE '^frontend/(package\.json|package-lock\.json|next\.config\.|Dockerfile)$'; then
    if ! echo "$REBUILD_SERVICES" | grep -q frontend; then
        echo "  Frontend build context changed (rebuild required)"
        REBUILD_SERVICES="$REBUILD_SERVICES frontend"
    fi
fi

# Docker compose file changes (validate + rebuild all)
if echo "$CHANGED_FILES" | grep -qE '^docker-compose.*\.yml$'; then
    echo "  Docker compose file changed (validation + rebuild all)"
    REBUILD_SERVICES="$ALL_SERVICES"
fi

# Environment file changes (restart all to pick up env vars)
if echo "$CHANGED_FILES" | grep -qE '\.(env|env\..*|.*\.env)$'; then
    echo "  Environment file changed (restart all)"
    RESTART_SERVICES="$ALL_SERVICES"
fi

# Nginx config changes
if echo "$CHANGED_FILES" | grep -q '^nginx\.conf$'; then
    echo "  Nginx config changed (restart required)"
    RESTART_SERVICES="$RESTART_SERVICES nginx"
fi

# Database init script changes (requires postgres recreate)
if echo "$CHANGED_FILES" | grep -q '^init-db\.sql$'; then
    echo "  ${RED}WARNING: init-db.sql changed - manual postgres recreate may be needed${NC}"
    echo "  Run: docker compose down postgres && docker compose up -d postgres"
fi

# Remove duplicates and filter out services that will be rebuilt
RESTART_SERVICES=$(echo "$RESTART_SERVICES" | tr ' ' '\n' | sort -u | tr '\n' ' ')
REBUILD_SERVICES=$(echo "$REBUILD_SERVICES" | tr ' ' '\n' | sort -u | tr '\n' ' ')

# Filter restart services: don't restart if already rebuilding
FINAL_RESTART=""
for svc in $RESTART_SERVICES; do
    if ! echo "$REBUILD_SERVICES" | grep -wq "$svc"; then
        FINAL_RESTART="$FINAL_RESTART $svc"
    fi
done
RESTART_SERVICES=$(echo "$FINAL_RESTART" | xargs)

echo ""
echo "${GREEN}Impacted services:${NC}"
if [ -n "$REBUILD_SERVICES" ]; then
    echo "  ${YELLOW}Rebuild:${NC} $REBUILD_SERVICES"
fi
if [ -n "$RESTART_SERVICES" ]; then
    echo "  ${GREEN}Restart:${NC} $RESTART_SERVICES"
fi
if [ -z "$REBUILD_SERVICES" ] && [ -z "$RESTART_SERVICES" ]; then
    echo "  ${YELLOW}None - no service-specific changes detected${NC}"
    exit 0
fi
echo ""

# Validate compose file
echo "${YELLOW}[3/5] Validating docker-compose configuration...${NC}"
CMD="docker compose -f $COMPOSE_FILE config >/dev/null"
echo "  $ $CMD"
if [ "$DRY_RUN" = "0" ]; then
    if docker compose -f "$COMPOSE_FILE" config >/dev/null 2>&1; then
        echo "  ${GREEN}✓ Configuration valid${NC}"
    else
        echo "  ${RED}✗ Configuration validation failed${NC}"
        exit 1
    fi
else
    echo "  ${YELLOW}[DRY-RUN] Skipped${NC}"
fi
echo ""

# Execute rebuilds
if [ -n "$REBUILD_SERVICES" ]; then
    echo "${YELLOW}[4/5] Rebuilding services...${NC}"
    CMD="docker compose up -d --build $REBUILD_SERVICES"
    echo "  $ $CMD"
    if [ "$DRY_RUN" = "0" ]; then
        docker compose up -d --build $REBUILD_SERVICES
        echo "  ${GREEN}✓ Rebuild completed${NC}"
    else
        echo "  ${YELLOW}[DRY-RUN] Skipped${NC}"
    fi
    echo ""
fi

# Execute restarts
if [ -n "$RESTART_SERVICES" ]; then
    if [ -n "$REBUILD_SERVICES" ]; then
        echo "${YELLOW}[5/5] Restarting services...${NC}"
    else
        echo "${YELLOW}[4/5] Restarting services...${NC}"
    fi
    CMD="docker compose restart $RESTART_SERVICES"
    echo "  $ $CMD"
    if [ "$DRY_RUN" = "0" ]; then
        docker compose restart $RESTART_SERVICES
        echo "  ${GREEN}✓ Restart completed${NC}"
    else
        echo "  ${YELLOW}[DRY-RUN] Skipped${NC}"
    fi
    echo ""
fi

# Verify services are running
if [ "$DRY_RUN" = "0" ]; then
    STEP_NUM=5
    if [ -z "$REBUILD_SERVICES" ] && [ -n "$RESTART_SERVICES" ]; then
        STEP_NUM=5
    fi

    echo "${YELLOW}[$STEP_NUM/5] Verifying service status...${NC}"
    echo "  $ docker compose ps"

    # Get status of all impacted services
    ALL_IMPACTED="$REBUILD_SERVICES $RESTART_SERVICES"
    for svc in $ALL_IMPACTED; do
        STATUS=$(docker compose ps --format json "$svc" 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
        if [ "$STATUS" = "running" ]; then
            echo "  ${GREEN}✓ $svc: running${NC}"
        else
            echo "  ${RED}✗ $svc: $STATUS${NC}"
        fi
    done
    echo ""

    # Show recent logs for rebuilt/restarted services
    echo "${YELLOW}Recent logs (last 50 lines):${NC}"
    for svc in $ALL_IMPACTED; do
        echo "${YELLOW}--- $svc ---${NC}"
        docker compose logs --tail=50 "$svc" 2>/dev/null | tail -10 || echo "  (no logs)"
    done
    echo ""

    echo "${GREEN}=== Restart process completed ===${NC}"
    echo ""
    echo "${YELLOW}Next steps:${NC}"
    echo "  1. Check backend health: curl -f http://localhost:8000/health"
    echo "  2. Check frontend: curl -f http://localhost:3000"
    echo "  3. Monitor logs: docker compose logs -f ${ALL_IMPACTED}"
else
    echo "${GREEN}=== Dry-run completed ===${NC}"
    echo "${YELLOW}Run without DRY_RUN=1 to execute the restart${NC}"
fi
