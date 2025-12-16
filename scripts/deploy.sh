#!/bin/bash

# WordRush Deployment Script
# Usage: ./scripts/deploy.sh [message]

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 WordRush Deployment Script${NC}\n"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Not a git repository${NC}"
    exit 1
fi

# Get commit message
COMMIT_MSG="${1:-Update: $(date +'%Y-%m-%d %H:%M:%S')}"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  Uncommitted changes detected${NC}"
    echo "Staging all changes..."
    git add -A
fi

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo -e "${YELLOW}⚠️  No changes to commit${NC}"
else
    echo -e "${GREEN}📝 Committing changes...${NC}"
    git commit -m "$COMMIT_MSG"
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${GREEN}🌿 Current branch: ${CURRENT_BRANCH}${NC}"

# Ask for confirmation before pushing
read -p "Push to origin/${CURRENT_BRANCH}? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}❌ Deployment cancelled${NC}"
    exit 0
fi

# Push to remote
echo -e "${GREEN}📤 Pushing to origin/${CURRENT_BRANCH}...${NC}"
git push origin "$CURRENT_BRANCH"

echo -e "\n${GREEN}✅ Deployment initiated!${NC}"
echo -e "${YELLOW}📋 GitHub Actions will handle the build and deployment${NC}"
echo -e "${YELLOW}🔗 Check status at: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions${NC}"

