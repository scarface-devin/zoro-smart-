#!/usr/bin/env bash
# Re-bootstraps the SolShare Network GitHub repo with the canonical label
# set and the 5 seeded issues from docs/issues/000*.md.
#
# Idempotent: safe to re-run on an already-bootstrapped repo.
# - Labels: a `grep` check against the existing label list skips labels
#   that already exist (so `gh label create` is only called for the
#   genuinely missing ones).
# - Issues: the script does NOT de-dupe by title; if you re-run after
#   the 5 issues already exist you'll get duplicates. Manage that by
#   either deleting the old issues or skipping this script.
#
# Error handling:
# - `set -Eeuo pipefail` causes the script to abort on the first real
#   `gh` failure (auth expired, network down, repo permissions) instead
#   of silently producing a partial issue backlog.
# - The ERR trap prints a contextual "while trying to: ..." line so
#   the user can see which step broke without scrolling the full gh
#   error output.

set -Eeuo pipefail

# The loops below set CURRENT_TASK to a human-readable description of
# the next `gh` call so the ERR trap can report which step broke.
CURRENT_TASK=""

trap 'rc=$?; echo "" >&2; echo "ERROR: create-issues.sh failed (exit ${rc}) at line ${LINENO} while trying to: ${CURRENT_TASK:-<setup>}" >&2; exit "${rc}"' ERR

cd /workspaces/zoro-smart-

# ---- Step 1: ensure all required labels exist ----
declare -A LABEL_COLORS=(
  ["bug"]="d73a4a"
  ["enhancement"]="a2eeef"
  ["good first issue"]="7057ff"
  ["documentation"]="0075ca"
  ["frontend"]="1d76db"
  ["api"]="5319e7"
  ["sdk"]="bfdadc"
  ["soroban"]="3fc06a"
  ["bridge"]="d4c5f9"
  ["help wanted"]="008672"
  ["needs-triage"]="ededed"
  ["priority: high"]="b60205"
  ["priority: medium"]="fbca04"
  ["priority: low"]="0e8a16"
)

CURRENT_TASK="list existing labels"
echo "=== Existing labels ==="
# pipefail + set -e: if `gh label list` fails (auth, network), the
# script aborts here via the ERR trap.
gh label list --limit 200 --json name -q '.[].name' | sort > /tmp/existing-labels.txt
wc -l /tmp/existing-labels.txt
CURRENT_TASK="create missing labels (loop)"

echo
echo "=== Creating missing labels ==="
for lbl in "${!LABEL_COLORS[@]}"; do
  color="${LABEL_COLORS[$lbl]}"
  if ! grep -qxF "$lbl" /tmp/existing-labels.txt; then
    CURRENT_TASK="create label '$lbl'"
    gh label create "$lbl" --color "$color" --description "SolShare Network project label"
  fi
done

# ---- Step 2: create the 5 issues ----
echo
echo "=== Creating issues ==="
# Fail loudly on a misconfigured repo (no docs/issues/*.md files)
# instead of either (a) silently creating zero issues, or (b) under
# strict mode aborting with a confusing "create issue #000*.md"
# message because the unmatched glob expanded to its literal pattern.
# `nullglob` makes the unmatched glob expand to the empty string; the
# explicit count check then aborts with a precise error.
shopt -s nullglob
docs_files=(docs/issues/000*.md)
shopt -u nullglob
if [ "${#docs_files[@]}" -eq 0 ]; then
  echo "ERROR: no docs/issues/000*.md files found in $(pwd)" >&2
  echo "These are the source markdown files this script creates GitHub issues from." >&2
  echo "Either populate docs/issues/ or skip this script in this repo." >&2
  exit 1
fi
for f in "${docs_files[@]}"; do
  num=$(basename "$f" | cut -d'-' -f1)
  title=$(head -1 "$f" | sed 's/^# //')
  body=$(tail -n +6 "$f")
  # Extract the labels line, tolerating docs that omit it (config issue,
  # not a gh failure — we warn + fall back to no labels instead of
  # aborting the whole script). Bare `grep|sed|tr` in a $() under
  # `pipefail` would otherwise abort here, which is a behavior change
  # vs. the prior `set +e` setup.
  if grep -qE '^- \*\*Labels:\*\*' "$f"; then
    labels=$(grep -E '^- \*\*Labels:\*\*' "$f" | sed -E 's/.*Labels:\*\*\s*//' | tr -d '`')
  else
    echo "WARN: $f has no '- **Labels:**' line; creating issue without labels" >&2
    labels=""
  fi

  label_args=()
  IFS=',' read -ra parts <<< "$labels"
  for l in "${parts[@]}"; do
    l=$(echo "$l" | xargs)
    if [ -n "$l" ]; then
      label_args+=("--label" "$l")
    fi
  done

  CURRENT_TASK="create issue #${num} ('${title}')"
  echo
  echo "=== ${num} ==="
  echo "Title: ${title}"
  echo "Labels: ${labels}"
  echo "---"
  # No `|| true`, no `2>&1 | head -N`: with `set -Eeuo pipefail`, a
  # real `gh` failure (auth expired, network down, permissions) makes
  # the pipeline return non-zero, the ERR trap fires with the
  # CURRENT_TASK context, and the script aborts with the original
  # exit code. The user sees a clear "which issue broke" message
  # instead of silently ending up with issues 1-3 created and 4-5
  # silently skipped.
  gh issue create --title "$title" --body "$body" "${label_args[@]}"
done

CURRENT_TASK="print final issue list"
echo
echo "=== Final issue list ==="
gh issue list --limit 10 --json number,title,state,url
