---
name: pr-reviewer
description: |
  Automated PR review and merge workflow for the Orchestrator.
  Reviews open PRs, checks CI status, approves code, and merges when ready.
  Use when PRs need to be reviewed and merged autonomously.
license: MIT
metadata:
  author: zCorvus
  version: "1.0.0"
---

# PR Reviewer

Automated PR review and merge workflow for the Orchestrator.

## Quick Reference

| Action | Command |
|--------|---------|
| List open PRs to develop | `node scripts/github/list-open-prs.mjs --base develop` |
| Check PR CI status | `curl -s "https://api.github.com/repos/{owner}/{repo}/commits/{sha}/status"` |
| Approve PR | `node scripts/github/approve-pr.mjs --pr <number>` |
| Merge PR | `node scripts/github/merge-pr.mjs --pr <number> --base develop` |

## When to Use

- After an agent creates a PR to `develop`
- When CI checks need to pass before merge
- When you want autonomous review and merge workflow

## Workflow

### 1. Detect PR Created

When you receive a `GITHUB_PR_OPENED` event:
- Extract PR number, branch, and base from the event
- Log the PR for review queue

### 2. Review PR

For each open PR to `develop`:

1. **Check CI Status:**
   ```bash
   curl -s "https://api.github.com/repos/OWNER/REPO/commits/{head_sha}/status"
   ```

2. **Check Reviews:**
   ```bash
   curl -s "https://api.github.com/repos/OWNER/REPO/pulls/{number}/reviews"
   ```

3. **Check Files Changed:**
   ```bash
   curl -s "https://api.github.com/repos/OWNER/REPO/pulls/{number}/files"
   ```

### 3. Decision Matrix

| CI Status | Reviews | Action |
|-----------|---------|--------|
| ✅ success | approved | Merge |
| ✅ success | none | Approve → Wait → Merge |
| ❌ failure | any | Report failure, don't merge |
| ⏳ pending | any | Wait for CI |

### 4. Execute Actions

**Approve PR:**
```bash
curl -X POST "https://api.github.com/repos/OWNER/REPO/pulls/{number}/reviews" \
  -H "Authorization: Bearer {GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -d '{"event":"APPROVE","body":"LGTM"}'
```

**Merge PR:**
```bash
curl -X PUT "https://api.github.com/repos/OWNER/REPO/pulls/{number}/merge" \
  -H "Authorization: Bearer {GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -d '{"merge_method":"squash"}'
```

### 5. Publish Events

After merge:
- Publish `TASK_COMPLETED` for the original task
- Publish `MERGED_TO_DEVELOP` event

## Example Integration

```javascript
// In your main loop, after GITHUB_PR_OPENED:
if (event.type === "GITHUB_PR_OPENED") {
  const prNumber = event.payload.prNumber;
  const baseBranch = event.payload.baseBranch;
  
  if (baseBranch === "develop") {
    await reviewAndMergePR(prNumber);
  }
}
```

## Rules

- Only merge to `develop`, never directly to `main`
- Wait for CI to pass before merging
- If CI fails, publish `INCIDENT_OPENED` and notify
- Log all actions to MCP for observability
