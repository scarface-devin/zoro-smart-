#!/usr/bin/env bash
# Re-bootstraps the SolShare Roadmap Project v2 board, milestones, status
# labels, and per-issue column assignments for scarface-devin/zoro-smart-.
# See CONTRIBUTING.md for prerequisites + idempotency caveats.
#
# Failure handling:
# - `set -Eeuo pipefail` + ERR trap: a real gh failure (auth expired,
#   network down, repo permissions) aborts with a clear "while trying
#   to:" context line.
# - INTENTIONAL FALLBACKS (must NOT abort):
#   - `gh project create` when the gh integration lacks the `project`
#     scope — script falls back to status-label-only mode and tells the
#     user to create the board manually at the GitHub web UI.
#   - `gh project item-add` and `gh project card-move` per issue —
#     best-effort: a single failed card prints WARN and the loop
#     continues. (We don't want one bad card to skip the other four.)
# - Idempotency is preserved via local `/tmp/existing-*.txt` snapshots
#   that grep by name. Each snapshot is a single upfront `gh`/`gh api`
#   call, so the idempotency check doesn't itself fail loudly when the
#   underlying `gh` call fails (it just aborts via the ERR trap, with
#   a precise "snapshot existing X" context).

set -Eeuo pipefail

CURRENT_TASK=""
trap 'rc=$?; echo "" >&2; echo "ERROR: setup-project-board.sh failed (exit ${rc}) at line ${LINENO} while trying to: ${CURRENT_TASK:-<setup>}" >&2; exit "${rc}"' ERR

cd /workspaces/zoro-smart-

OWNER=scarface-devin
REPO=scarface-devin/zoro-smart-
PROJECT_TITLE="SolShare Roadmap"
PROJECT_OK=0
PROJECT_NUMBER=""

# ---- Step 1: create project board (warn + fall back if scope is missing) ----
CURRENT_TASK="create project '$PROJECT_TITLE' (warn + fall back if scope missing)"
echo "=== Trying to create project '$PROJECT_TITLE' ==="
# `|| CREATE_RC=$?` captures the failure into CREATE_RC without
# triggering the ERR trap, so an expected scope-related failure does
# NOT abort the script.
CREATE_OUT=$(gh project create --owner "$OWNER" --title "$PROJECT_TITLE" --format json 2>&1) || CREATE_RC=$?
CREATE_RC="${CREATE_RC:-0}"

if [ "$CREATE_RC" -eq 0 ]; then
  PROJECT_NUMBER=$(echo "$CREATE_OUT" | jq -r '.number // empty')
  if [ -z "$PROJECT_NUMBER" ]; then
    echo "WARN: gh project create exited 0 but returned no project number." >&2
    echo "Output:" >&2
    echo "$CREATE_OUT" >&2
  else
    echo "Created project #$PROJECT_NUMBER — will add columns + items next"
    PROJECT_OK=1
  fi
elif echo "$CREATE_OUT" | grep -qiE "(project.*scope|resource not accessible|accessible by integration|permission denied|cannot create|forbidden|HTTP 403)"; then
  # Expected fallback: gh ran but the integration doesn't have the
  # `project` OAuth scope. Treat as fatal-for-project, non-fatal-for-
  # the rest of the bootstrap (status labels + milestones + per-issue
  # assignments still work fine).
  echo "WARN: project create failed (gh integration likely lacks 'project' scope)."
  echo "Falling back to status labels only. Create the board manually at"
  echo "https://github.com/${REPO}/projects and re-run this script to populate it."
else
  # UNEXPECTED failure (auth, network, repository permission). Surface
  # it cleanly instead of silently degrading.
  echo "ERROR: Unexpected failure from 'gh project create' (exit $CREATE_RC)." >&2
  echo "$CREATE_OUT" >&2
  exit "$CREATE_RC"
fi

# ---- Step 2: if project was created, ensure Backlog + Review columns ----
if [ "$PROJECT_OK" -eq 1 ]; then
  CURRENT_TASK="snapshot existing columns for project #$PROJECT_NUMBER"
  gh project column-list "$PROJECT_NUMBER" --owner "$OWNER" --format json --jq '.columns[].name' > /tmp/existing-columns.txt

  ensure_column() {
    local name="$1"
    if grep -qxF "$name" /tmp/existing-columns.txt 2>/dev/null; then
      echo "Column '$name' already exists — skipping"
    else
      CURRENT_TASK="create project column '$name'"
      echo "Creating column: $name"
      gh project column-create "$PROJECT_NUMBER" --owner "$OWNER" --name "$name"
    fi
  }
  CURRENT_TASK="ensure Backlog + Review columns"
  ensure_column "Backlog"
  ensure_column "Review"
fi

# ---- Step 3: create milestones (idempotent via local snapshot) ----
CURRENT_TASK="snapshot existing milestones"
gh api "repos/$REPO/milestones?state=all" --jq '.[].title' > /tmp/existing-milestones.txt

ensure_milestone() {
  local title="$1"
  local desc="$2"
  if grep -qxF "$title" /tmp/existing-milestones.txt 2>/dev/null; then
    echo "Milestone '$title' already exists — skipping"
  else
    CURRENT_TASK="create milestone '$title'"
    echo "Creating milestone: $title"
    gh api "repos/$REPO/milestones" -X POST -f "title=$title" -f "description=$desc" -f "state=open" >/dev/null
  fi
}
CURRENT_TASK="ensure v0.2/v0.3/v0.4 milestones"
ensure_milestone "v0.2" "Live Testnet"
ensure_milestone "v0.3" "Cross-chain MVP"
ensure_milestone "v0.4" "Drips Wave submission polish"

echo
CURRENT_TASK="report current milestones"
echo "=== Milestones after ==="
gh api "repos/$REPO/milestones?state=all" --jq '.[] | "  - \(.title) (#\(.number))"'

# ---- Step 4: create status labels (idempotent via local snapshot) ----
CURRENT_TASK="snapshot existing labels"
gh label list --repo "$REPO" --limit 200 --json name -q '.[].name' > /tmp/existing-labels.txt

ensure_label() {
  local name="$1"
  local color="$2"
  local desc="$3"
  if grep -qxF "$name" /tmp/existing-labels.txt 2>/dev/null; then
    echo "Label '$name' already exists — skipping"
  else
    CURRENT_TASK="create label '$name'"
    echo "Creating label: $name"
    gh label create "$name" --repo "$REPO" --color "$color" --description "$desc"
  fi
}
CURRENT_TASK="ensure status:* labels"
ensure_label "status: backlog"      "ededed" "Not yet started — lives in the project Backlog column"
ensure_label "status: in progress"  "fbca04" "Actively being worked on"
ensure_label "status: review"       "5319e7" "Implementation done — needs review before merge"
ensure_label "status: done"         "0e8a16" "Implementation merged + verified"

# ---- Step 5: per-issue milestone + status-label assignment ----
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
  ms="${ISSUE_MILESTONE[$issue]:-}"
  st="${ISSUE_STATUS[$issue]:-}"

  CURRENT_TASK="get status:* labels on issue #$issue"
  # jq filters to status:* AND preserves multi-word label names like
  # "status: backlog" (no shell word-splitting — the previous bug
  # where "status: backlog" became "status:" + "backlog" is fixed by
  # storing the label list into a literal string rather than iterating
  # over a sub-pipeline).
  existing_status_labels=$(gh issue view "$issue" --repo "$REPO" --json labels -q '.labels[].name | select(startswith("status:"))')

  args=()
  if [ -n "$ms" ]; then
    args+=(--milestone "$ms")
  fi
  # Preserve spaces in label names by feeding them through `while
  # read` instead of the shell's word-splitting `for` loop.
  while IFS= read -r l; do
    [ -n "$l" ] && args+=(--remove-label "$l")
  done <<< "$existing_status_labels"
  args+=(--add-label "$st")

  CURRENT_TASK="edit issue #$issue (milestone=$ms, status=$st)"
  echo "Issue #$issue  -> milestone=$ms  status=$st"
  gh issue edit "$issue" --repo "$REPO" "${args[@]}"

  # Also add the issue to the project board if we managed to create
  # one. This is best-effort per-card: a single failure should NOT
  # abort the whole bootstrap loop.
  if [ "$PROJECT_OK" -eq 1 ] && [ -n "$st" ]; then
    col=""
    case "$st" in
      "status: backlog")     col="Backlog"     ;;
      "status: in progress") col="In Progress" ;;
      "status: review")      col="Review"      ;;
      "status: done")        col="Done"        ;;
    esac
    if [ -n "$col" ]; then
      CURRENT_TASK="add issue #$issue to project board"
      echo "  Adding to project + column '$col'"
      add_rc=0
      ADD_OUT=$(gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url "https://github.com/$REPO/issues/$issue" --format json) || add_rc=$?
      if [ "$add_rc" -ne 0 ]; then
        echo "WARN: gh project item-add failed for issue #$issue (skipping card for this issue)" >&2
        continue
      fi
      item_id=$(echo "$ADD_OUT" | jq -r '.id // empty')
      column_id=$(gh project column-list "$PROJECT_NUMBER" --owner "$OWNER" --format json --jq ".columns[] | select(.name == \"$col\") | .id")
      if [ -n "$item_id" ] && [ -n "$column_id" ]; then
        CURRENT_TASK="move card for issue #$issue to column '$col'"
        if ! gh project card-move "$item_id" --column-id "$column_id"; then
          echo "WARN: gh project card-move failed for issue #$issue (card added but not in column)" >&2
        fi
      fi
    fi
  fi
done

# ---- Step 6: final report ----
CURRENT_TASK="print final issue list"
echo
echo "=== Final state ==="
gh issue list --repo "$REPO" --limit 10 --json number,title,state,milestone,labels | jq -r '
  .[] |
  "  #\(.number | tostring | ("   " + .)[-3:]) [\(.state | ("      " + .)[-6:])]  ms=\((.milestone.title // "—") | ("                    " + .)[-20:])  \(.title)" +
  (if (.labels | length) > 0 then "\n        labels: " + ([.labels[].name] | join(", ")) else "" end)
'
if [ "$PROJECT_OK" -eq 1 ]; then
  echo
  echo "=== Project board ==="
  echo "https://github.com/$OWNER/$REPO/projects/$PROJECT_NUMBER"
fi
