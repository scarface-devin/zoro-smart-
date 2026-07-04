#!/usr/bin/env bash
set +e
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

echo "=== Existing labels ==="
gh label list --limit 200 --json name -q '.[].name' 2>/dev/null | sort > /tmp/existing-labels.txt
wc -l /tmp/existing-labels.txt

echo
echo "=== Creating missing labels ==="
for lbl in "${!LABEL_COLORS[@]}"; do
  color="${LABEL_COLORS[$lbl]}"
  if ! grep -qxF "$lbl" /tmp/existing-labels.txt; then
    gh label create "$lbl" --color "$color" --description "SolShare Network project label" 2>&1 | head -2
  fi
done

# ---- Step 2: create the 5 issues ----
echo
echo "=== Creating issues ==="
for f in docs/issues/000*.md; do
  num=$(basename "$f" | cut -d'-' -f1)
  title=$(head -1 "$f" | sed 's/^# //')
  body=$(tail -n +6 "$f")
  labels=$(grep -E '^- \*\*Labels:\*\*' "$f" | sed -E 's/.*Labels:\*\*\s*//' | tr -d '`')

  label_args=()
  IFS=',' read -ra parts <<< "$labels"
  for l in "${parts[@]}"; do
    l=$(echo "$l" | xargs)
    if [ -n "$l" ]; then
      label_args+=("--label" "$l")
    fi
  done

  echo
  echo "=== ${num} ==="
  echo "Title: ${title}"
  echo "Labels: ${labels}"
  echo "---"
  gh issue create --title "$title" --body "$body" "${label_args[@]}" 2>&1
done

echo
echo "=== Final issue list ==="
gh issue list --limit 10 --json number,title,state,url
