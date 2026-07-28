#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_URL="${UPSTREAM_URL:-https://github.com/cisco-open/mcptoolkit-contract.git}"
TARGET_DIR="${1:-$(pwd)}"
IMPORT_BRANCH="${IMPORT_BRANCH:-import/cisco-mcpdesc-0.7.0}"

if ! command -v git >/dev/null 2>&1; then
  echo "error: git is required" >&2
  exit 1
fi

if ! command -v git-filter-repo >/dev/null 2>&1 && ! git filter-repo --help >/dev/null 2>&1; then
  echo "error: git-filter-repo is required (https://github.com/newren/git-filter-repo)" >&2
  exit 1
fi

if ! git -C "$TARGET_DIR" rev-parse --git-dir >/dev/null 2>&1; then
  echo "error: target is not a Git repository: $TARGET_DIR" >&2
  exit 1
fi

if git -C "$TARGET_DIR" show-ref --verify --quiet "refs/heads/$IMPORT_BRANCH"; then
  echo "error: local import branch already exists: $IMPORT_BRANCH" >&2
  exit 1
fi

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

source_repo="$workdir/upstream"
echo "Cloning upstream into temporary workspace..."
git clone --no-local "$UPSTREAM_URL" "$source_repo"
source_sha="$(git -C "$source_repo" rev-parse HEAD)"
source_date="$(git -C "$source_repo" show -s --format=%cI HEAD)"

cat > "$workdir/origin.env" <<EOF
UPSTREAM_URL=$UPSTREAM_URL
UPSTREAM_COMMIT=$source_sha
UPSTREAM_COMMIT_DATE=$source_date
IMPORT_DATE=$(date -u +%Y-%m-%d)
EOF

printf 'Upstream commit: %s\n' "$source_sha"

# Retain only specification-related paths. This rewrites commit IDs while
# retaining the relevant commit authorship and history.
git -C "$source_repo" filter-repo --force \
  --path spec/ \
  --path schemas/mcp-description/ \
  --path schemas/latest.json \
  --path LICENSE \
  --path NOTICE

remote_name="temporary-cisco-spec-import"
if git -C "$TARGET_DIR" remote get-url "$remote_name" >/dev/null 2>&1; then
  git -C "$TARGET_DIR" remote remove "$remote_name"
fi

git -C "$TARGET_DIR" remote add "$remote_name" "$source_repo"
git -C "$TARGET_DIR" fetch "$remote_name" "main:refs/heads/$IMPORT_BRANCH"
git -C "$TARGET_DIR" remote remove "$remote_name"

cp "$workdir/origin.env" "$TARGET_DIR/.origin-import.env"

cat <<EOF

Created local branch: $IMPORT_BRANCH
Recorded source data: $TARGET_DIR/.origin-import.env

No merge and no push were performed.
Inspect the imported branch, then either:

  # Empty target repository / no meaningful main history:
  git -C "$TARGET_DIR" switch -C main "$IMPORT_BRANCH"

or:

  # Existing target history that must be retained:
  git -C "$TARGET_DIR" switch main
  git -C "$TARGET_DIR" merge --allow-unrelated-histories "$IMPORT_BRANCH"

Review before committing or pushing.
EOF
