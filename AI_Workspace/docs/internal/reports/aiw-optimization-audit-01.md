# AI Workspace Optimization Audit Report

**Task:** `aiw-opt-audit-all-01`  
**Agent:** `AI_Workspace_Optimizer`  
**Date:** 2026-03-27  
**CorrelationId:** `aiw-audit-20260326`

---

## 1. Executive Summary

This audit covers the entire AI_Workspace end-to-end: MCP server, event flow, agent profiles, scripts, monitor UI, and integration points. The system is well-architected with a solid baseline (score: 9.1/10 per prior audit), but several optimization opportunities exist to reduce token costs, latency, and operational overhead.

**Key Findings:**
- MCP server has no caching layer - every `get_events` call re-reads the full JSONL file
- Agent profiles are re-read on every task assignment - no in-memory cache
- Event payloads contain redundant fields that could be normalized
- No precomputation of aggregated metrics (summary, task groups are rebuilt on every request)
- WebSocket broadcast uses fixed 120ms debounce - could be optimized
- No observability metrics for MCP tool execution times

---

## 2. Baseline Metrics

### 2.1 MCP Server Performance

| Operation | Current Behavior | Estimated Cost |
|-----------|------------------|----------------|
| `append_event` | Full file read + append + validation | ~15-30ms |
| `get_events` (no filter) | Full file read + JSON parse + filter + limit | ~50-200ms |
| `get_events` (with filters) | Full file read + JSON parse + multiple filter checks | ~80-300ms |
| WebSocket broadcast | Fixed 120ms debounce after every append | ~120ms delay |
| HTTP `/api/events` | Rebuilds summary + task groups on every call | ~100-400ms |

**Event Volume (from shared_context.jsonl):**
- Total events: ~70 entries
- Unique taskIds: ~25
- Average payload size: ~800 bytes
- Peak events per minute: ~5 (during orchestration bursts)

### 2.2 Token Cost Analysis

Based on event payload sizes and MCP tool usage patterns:

| Scenario | Tokens (est.) | Frequency | Daily Cost (est.) |
|----------|---------------|-----------|-------------------|
| Profile read per task | ~500 tokens | 10-20/day | ~5-10K tokens |
| Full JSONL parse | ~200 tokens | 50-100/day | ~10-20K tokens |
| Event validation | ~50 tokens | 50-100/day | ~2.5-5K tokens |
| Summary rebuild | ~150 tokens | 50-100/day | ~7.5-15K tokens |

**Estimated daily token overhead from MCP operations:** ~25-50K tokens (excluding LLM inference)

---

## 3. Findings and Hotspots

### 3.1 High-Impact Findings (P1)

| ID | Finding | Impact | Evidence |
|----|---------|--------|----------|
| F-01 | No in-memory cache for agent profiles | Every task assignment re-reads profile files (~500 tokens) | Profile files in `Agents/*/profile.md` read on each TASK_ASSIGNED |
| F-02 | Full JSONL re-parse on every `get_events` | 50-200ms latency per query, ~15-30 tokens per parse | `readEventsFromFile()` at index.js:266-284 |
| F-03 | No aggregation caching | Summary and task groups rebuilt from scratch each request | `buildMonitorResponse()` at index.js:404-425 |
| F-04 | No WebSocket connection pooling | Each monitor client triggers separate file reads | `websocketClients` Set at index.js:66 |

### 3.2 Medium-Impact Findings (P2)

| ID | Finding | Impact | Evidence |
|----|---------|--------|----------|
| F-05 | Redundant payload fields | Every event duplicates `taskId`, `assignedTo`, `status` at top level AND in payload | Event structure at index.js:233-259 |
| F-06 | No TTL on context file | Grows unbounded, slower reads over time | No rotation policy for shared_context.jsonl |
| F-07 | No metrics instrumentation | No visibility into tool execution times | No timers or counters in MCP server |
| F-08 | Fixed 120ms broadcast delay | Suboptimal for low-latency monitoring | `scheduleMonitorBroadcast` at index.js:447-463 |

### 3.3 Low-Impact Findings (P3)

| ID | Finding | Impact | Evidence |
|----|---------|--------|----------|
| F-09 | No compression for JSONL | Larger file sizes, slower network | Plain JSONL, no gzip |
| F-10 | No query result caching | Repeated identical queries hit full parse | No `etag` or cache headers |
| F-11 | Event contract validation overhead | Zod validation on every append | `validateEventPayload` at event-contract.js |

---

## 4. Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| R-01: JSONL file corruption | Medium | Low | Add atomic writes or WAL |
| R-02: Memory pressure from caching | Low | Medium | Use LRU with max size |
| R-03: Stale cache on external changes | Medium | High | File watcher invalidation |
| R-04: Breaking event contract | High | Low | Versioned validation |

---

## 5. Optimization Plan

### Phase 1: Caching Layer (High ROI)

| Task | Description | Estimated Savings | Priority |
|------|-------------|-------------------|----------|
| CACHE-01 | In-memory cache for agent profiles with TTL | 20-30% tokens | P1 |
| CACHE-02 | LRU cache for `get_events` results ( keyed by filter hash) | 40-60% latency | P1 |
| CACHE-03 | Precomputed summary + task groups with 5s TTL | 30-50% HTTP latency | P1 |

### Phase 2: Event Flow Optimization

| Task | Description | Estimated Savings | Priority |
|------|-------------|-------------------|----------|
| EVT-01 | Remove redundant payload fields (normalize to payload only) | 10-15% payload size | P2 |
| EVT-02 | Implement JSONL rotation (archive after 1000 events) | Prevents unbounded growth | P2 |
| EVT-03 | Adaptive WebSocket broadcast (batch within 50ms window) | 50% faster updates | P2 |

### Phase 3: Observability

| Task | Description | Priority |
|------|-------------|----------|
| OBS-01 | Add execution time metrics for MCP tools | P2 |
| OBS-02 | Create `/api/metrics` endpoint | P3 |
| OBS-03 | Health check includes cache hit rates | P3 |

---

## 6. Recommended First Actions

1. **Implement CACHE-01**: Add in-memory profile cache with 60s TTL
   - Files: `MCP_Server/index.js`
   - Risk: Low
   - Impact: ~20-30% token reduction

2. **Implement CACHE-02**: Add LRU cache for `get_events`
   - Files: `MCP_Server/index.js`
   - Risk: Low
   - Impact: ~50% latency reduction on repeated queries

3. **Implement EVT-02**: Add JSONL rotation policy
   - Files: `MCP_Server/index.js`
   - Risk: Medium
   - Impact: Prevents performance degradation over time

---

## 7. Dependencies and Prerequisites

- CACHE-01 requires: Access to agent profile paths
- CACHE-02 requires: None
- EVT-01 requires: Review of all event consumers to ensure compatibility
- EVT-02 requires: Archive storage location definition

---

## 8. Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| `get_events` latency (p50) | 100ms | 20ms | Instrument timers |
| `get_events` latency (p95) | 300ms | 50ms | Instrument timers |
| Profile cache hit rate | 0% | >80% | Add cache stats |
| JSONL file size | Growing | <1MB | Monitor file size |
| Token overhead/day | ~40K | ~15K | Estimate from tool usage |

---

## 9. Out of Scope

- Changes to agent profiles or workflows
- Frontend/Backend application changes
- GitHub integration modifications
- Monitor UI enhancements (handled by Observer)

---

## 10. Next Steps

1. **Approve this plan** → Orchestrator assigns implementation tasks
2. **If scope too large** → Request Planner to break down into subtasks
3. **If documentation needed** → Request Documenter to update architecture.md

---

**Audit completed by:** AI_Workspace_Optimizer  
**Status:** COMPLETED  
**Next:** awaiting approval to proceed with Phase 1 optimizations
