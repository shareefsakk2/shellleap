#!/bin/bash

# Script to push a git tag and trigger GitHub Actions
# Usage: ./scripts/push-tag.sh v0.1.2

TAG=$1

if [ -z "$TAG" ]; then
    echo "Usage: $0 <tag-name>"
    echo "Example: $0 v0.1.2"
    exit 1
fi

echo "🏷️  Pushing tag: $TAG"

# Delete remote tag if exists (to ensure fresh push triggers workflow)
git push --delete origin "$TAG" 2>/dev/null || true

# Delete local tag if exists
git tag -d "$TAG" 2>/dev/null || true

# Create new local tag
git tag "$TAG"

# Push tag separately (ensures GitHub Actions triggers)
git push origin "$TAG"

echo "✅ Tag $TAG pushed successfully!"
echo "🚀 Check GitHub Actions: https://github.com/shareefsakk2/shellleap/actions"
