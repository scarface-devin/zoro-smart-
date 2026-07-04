#!/usr/bin/env bash
set +e
cd /workspaces/zoro-smart-

OWNER=scarface-devin
REPO=scarface-devin/zoro-smart-
PROJECT_TITLE="SolShare Roadmap"

# ---- Step 1: try to create a project board (may fail if gh integration lacks project scope) ----
echo "=== Trying to create project '$PROJECT_TITLE' ==="
CREATE_OUT=$(gh project create --owner "$OWNER" --title "$PROJECT_TITLE" --format json 2>&1)
echo "$CREATE_OUT" | head -10
PROJECT_NUMBER=$(echo "$CREATE_OUT" | python3 -c "import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('number', ''))
except Exception:
    print('')
" 2>/dev/null)
if [ -n "$PROJECT_NUMBER" ]; then
  echo "Created project #$PROJECT_NUMBER — will add columns + items next"
  PROJECT_OK=1
else
  echo "WARN: project create failed (likely gh integration lacks 'project' scope). Falling back to status labels for now."
  PROJECT_OK=0
fi

# ---- Step 2: if project was created, add columns + items ----
if [ "$PROJECT_OK" = "1" ]; then
  ensure_column() {
    local name="$1"
    local exists
    exists=$(gh project column-list "$PROJECT_NUMBER" --owner "$OWNER" --format json 2>/dev/null | python3 -c "import sys, json
try:
    data = json.load(sys.stdin)
    print(any(c['name'] == '$name' for c in data.get('columns', [])))
except Exception:
    print('False')
" 2>/dev/null)
    if [ "$exists" != "True" ]; then
      echo "Creating column: $name"
      gh project column-create "$PROJECT_NUMBER" --owner "$OWNER" --name "$name" 2>&1 | head -3
    fi
  }
  ensure_column "Backlog"
  ensure_column "Review"
fi

# ---- Step 3: create milestones via REST API (gh milestone is deprecated in gh 2.88) ----
echo
echo "=== Creating milestones ==="
ensure_milestone() {
  local title="$1"
  local desc="$2"
  local exists
  exists=$(gh api "repos/$REPO/milestones?state=all" 2>/dev/null | python3 -c "import sys, json
try:
    ms = json.load(sys.stdin)
    print(any(m['title'] == '$title' for m in ms))
except Exception:
    print('False')
" 2>/dev/null)
  if [ "$exists" != "True" ]; then
    echo "Creating milestone: $title"
    gh api "repos/$REPO/milestones" -X POST -f "title=$title" -f "description=$desc" -f "state=open" 2>&1 | head -3
  else
    echo "Milestone '$title' already exists — skipping"
  fi
}
ensure_milestone "v0.2" "Live Testnet"
ensure_milestone "v0.3" "Cross-chain MVP"
ensure_milestone "v0.4" "Drips Wave submission polish"

echo
echo "=== Milestones after ==="
gh api "repos/$REPO/milestones?state=all" 2>&1 | python3 -c "import sys, json
try:
    ms = json.load(sys.stdin)
    for m in ms:
        print(f\"  - {m['title']} (#{m['number']})\")
except Exception as e:
    print('parse error:', e)
" 2>/dev/null

# ---- Step 4: create status labels (fallback for project board, also useful regardless) ----
echo
echo "=== Creating status labels ==="
ensure_label() {
  local name="$1"
  local color="$2"
  local desc="$3"
  if gh label list --repo "$REPO" --limit 200 --json name -q ".[] | select(.name == \"$name\")" 2>/dev/null | grep -qx "$name"; then
    echo "Label '$name' already exists — skipping"
  else
    echo "Creating label: $name"
    gh label create "$name" --repo "$REPO" --color "$color" --description "$desc" 2>&1 | head -3
  fi
}
ensure_label "status: backlog"      "ededed" "Not yet started — lives in the project Backlog column"
ensure_label "status: in progress"  "fbca04" "Actively being worked on"
ensure_label "status: review"       "5319e7" "Implementation done — needs review before merge"
ensure_label "status: done"         "0e8a16" "Implementation merged + verified"

# ---- Step 5: assign milestone + status label to each issue ----
declare -A ISSUE_MILESTONE=(
  ["2"]="v0.2"
  ["3"]="v0.3"
  ["4"]="v0.2"
  ["5"]="v0.4"
  ["6"]="v0.4"
)
declare -A ISSUE_STATUS=(
  ["2"]="status: done"         # 0001 — solved by commit f966611
  ["3"]="status: backlog"
  ["4"]="status: backlog"
  ["5"]="status: backlog"
  ["6"]="status: backlog"
)

echo
echo "=== Assigning milestones + status labels ==="
for issue in 2 3 4 5 6; do
  ms="${ISSUE_MILESTONE[$issue]}"
  st="${ISSUE_STATUS[$issue]}"

  current_labels=$(gh issue view "$issue" --repo "$REPO" --json labels -q '.labels[].name' 2>/dev/null)

  args=()
  if [ -n "$ms" ]; then
    args+=(--milestone "$ms")
  fi
  # Remove any existing status:* label, then add the new one
  for l in $current_labels; do
    case "$l" in
      status:*)
        args+=(--remove-label "$l")
        ;;
    esac
  done
  args+=(--add-label "$st")

  echo "Issue #$issue  -> milestone=$ms  status=$st"
  gh issue edit "$issue" --repo "$REPO" "${args[@]}" 2>&1 | head -3

  # Also add the issue to the project board if we managed to create one
  if [ "$PROJECT_OK" = "1" ]; then
    target_col="${ISSUE_STATUS[$issue]}"
    # Map status: backlog -> Backlog, status: in progress -> In Progress, status: review -> Review, status: done -> Done
    case "$target_col" in
      "status: backlog") col="Backlog" ;;
      "status: in progress") col="In Progress" ;;
      "status: review") col="Review" ;;
      "status: done") col="Done" ;;
      *) col="" ;;
    esac
    if [ -n "$col" ]; then
      echo "  Adding to project + column '$col'"
      ADD_OUT=$(gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url "https://github.com/$REPO/issues/$issue" --format json 2>&1)
      item_id=$(echo "$ADD_OUT" | python3 -c "import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('id', ''))
except Exception:
    print('')
" 2>/dev/null)
      column_id=$(gh project column-list "$PROJECT_NUMBER" --owner "$OWNER" --format json 2>/dev/null | python3 -c "import sys, json
try:
    data = json.load(sys.stdin)
    print(next((c['id'] for c in data.get('columns', []) if c['name'] == '$col'), ''))
except Exception:
    print('')
" 2>/dev/null)
      if [ -n "$item_id" ] && [ -n "$column_id" ]; then
        gh project card-move "$item_id" --column-id "$column_id" 2>&1 | head -3
      fi
    fi
  fi
done

# ---- Step 6: final report ----
echo
echo "=== Final state ==="
gh issue list --repo "$REPO" --limit 10 --json number,title,state,milestone,labels 2>&1 | python3 -c "
import sys, json
issues = json.load(sys.stdin)
for i in issues:
    ms = i['milestone']['title'] if i['milestone'] else '—'
    labels = ', '.join(l['name'] for l in i['labels'])
    print(f\"  #{i['number']:>2} [{i['state']:>6}]  ms={ms:<20}  {i['title']}\")
    if labels:
        print(f'        labels: {labels}')
"
if [ "$PROJECT_OK" = "1" ]; then
  echo
  echo "=== Project board ==="
  echo "https://github.com/$OWNER/$REPO/projects/$PROJECT_NUMBER"
fi
