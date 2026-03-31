# Token & Context Optimization Research

- **taskId:** `aiw-opt-token-context-research-20260331-01`
- **correlationId:** `aiw-token-context-optimization-20260331`
- **owner:** `AI_Workspace_Optimizer`
- **date:** 2026-03-31

## Scope

Research-only pass to identify the highest-ROI opportunities to reduce token/context overhead in AI Workspace.

Covered areas:

1. Shared context growth (`MCP_Server/shared_context.jsonl`)
2. MCP read/write patterns (`mcp-publish-event`, `mcp-stdio`, `monitor-server`)
3. API payload amplification in `/api/events`
4. Practical roadmap (quick wins -> structural changes)

## Baseline (Current State)

Baseline measured with `AI_Workspace/scripts/context-token-baseline.mjs`.

### Context volume

- File size: **626,266 bytes** (~**0.60 MB**)
- Estimated token mass in file: **~156,567 tokens**
- Parsed events: **726**
- Date range: `2026-03-23` -> `2026-03-31`
- Open tasks from latest status snapshot: **25**

### Payload cost per common reads

- `get_events` style payload (`limit=50`, events only):
  - **53,358 bytes** (~**13,340 tokens**)
- `/api/events` payload (`limit=50`, includes summary + task groups with nested events):
  - **110,442 bytes** (~**27,611 tokens**)
- Amplification factor of `/api/events` vs events-only view: **2.07x**

### Potential savings detected immediately

- Remove duplicated canonical fields from `payload` (when already present top-level):
  - estimated reduction vs all events: **22.99%**
- Compact hot context to latest event per task for retrieval use-cases:
  - estimated reduction vs all events: **76.57%**

## Bottleneck Map

1. **Full-file read/parse on hot paths (O(n) each operation)**
   - `AI_Workspace/scripts/mcp-publish-event.mjs:66`
   - `AI_Workspace/MCP_Server/mcp-stdio.js:234`
   - `AI_Workspace/MCP_Server/monitor-server.js:118`
   - Impact: linear growth in latency/cost and repeated serialization of historical context.

2. **API payload duplication in `/api/events`**
   - `AI_Workspace/MCP_Server/monitor-server.js:267`
   - Task groups include `events` arrays that re-embed already-returned events.
   - Measured impact: ~**48.5%** removable bytes for `limit=50` by omitting nested `task.events`.

3. **Schema-level duplication (canonical fields duplicated in top-level + payload)**
   - Writer paths currently preserve many repeated fields.
   - Impact: measurable overhead (~**23%** reduction potential on stored context payload mass).

4. **Event noise / replay duplicates for same lifecycle state**
   - Repeated `TASK_ASSIGNED` / repeated terminal transitions on same task history increase context entropy.
   - Impact: lower signal-to-noise and larger retrieval windows to extract actionable state.

5. **No relevance-first retrieval strategy**
   - Consumers often fetch recent windows by time, not by relevance (task/correlation/priority).
   - Impact: high token transfer per query and more downstream summarization burden.

## Top 5 Viable Strategies (with tradeoffs)

| # | Strategy | Expected Impact | Cost | Risk | Tradeoff |
|---|---|---|---|---|---|
| 1 | **Slim `/api/events` default**: exclude `task.events` unless `includeTaskEvents=true` | ~**48%** payload reduction on common monitor calls | Low | Low | Some deep-debug views must request expanded mode explicitly |
| 2 | **Canonical payload normalization**: do not persist duplicated canonical fields inside `payload` | ~**23%** context size reduction | Low | Medium | Requires compatibility guard for legacy readers expecting duplicated fields |
| 3 | **Incremental compacted index** (`latestByTask`, `latestByCorrelation`) sidecar | ~**70%+** reduction for hot retrieval context | Medium | Medium | Additional write complexity and cache invalidation rules |
| 4 | **Relevance-gated retrieval** with strict token budget | 60-85% lower query token transfer for agent workflows | Medium | Medium | Ranking heuristics can hide edge-case events unless fallback path exists |
| 5 | **Cache + fingerprint layer** (query cache, artifact path dictionary/hash) | 10-30% runtime + serialization savings | Medium | Low | Extra memory footprint and dictionary maintenance |

## Prioritized Recommendation (Execution Phases)

### Phase 1 (Quick Wins, 1-2 days)

1. Add `includeTaskEvents` flag to `/api/events` and default to `false`.
2. Keep a compact task summary (`eventCount`, `latestStatus`, `updatedAt`) instead of nested event arrays.
3. Add a writer-side normalization pass to drop duplicated canonical fields from `payload`.

**Expected result:** immediate reduction in monitor/API token volume with minimal risk.

### Phase 2 (Structural, 3-5 days)

1. Introduce sidecar index files:
   - `latest_by_task.json`
   - `latest_by_correlation.json`
2. Move common reads to index-first retrieval and keep JSONL as source of truth/history.
3. Add deterministic dedup rule for repeated lifecycle state emissions (same `taskId+type+status+agent`).

**Expected result:** better read scalability and lower context reconstruction cost.

### Phase 3 (Intelligent Retrieval, 4-7 days)

1. Add a relevance endpoint/tool mode (`taskId`, `correlationId`, recency decay, status priority).
2. Enforce hard response token budgets and include `truncated=true` metadata.
3. Add optional semantic fallback (lightweight embedding or lexical scorer) for ambiguous task lookups.

**Expected result:** stable token usage as event history scales and better signal quality for agents.

## Immediate Recommendation to Execute Next

If only one execution slice is approved now, implement **Phase 1** first:

- highest ROI,
- lowest migration risk,
- unblocks both runtime efficiency and cleaner agent context retrieval.

## Evidence / Repro Commands

```bash
node AI_Workspace/scripts/context-token-baseline.mjs
```

```bash
# Optional payload spot-check
# GET /api/events?limit=50 and compare bytes vs events-only representation
```
