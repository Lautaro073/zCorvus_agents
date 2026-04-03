# TCO-00 Baseline Expansion Report

- **taskId:** `aiw-opt-tco-00-baseline-expansion-20260331-01`
- **correlationId:** `aiw-token-context-optimization-20260331`
- **owner:** `AI_Workspace_Optimizer`
- **date:** 2026-04-02

## Objective

Expand token/context baseline with missing KPIs requested by plan TCO-00:

1. Message length distribution
2. Intake cost by agent
3. Event volume by type
4. Broad-read rate and latency (p50/p95) with explicit methodology

## Methodology (Explicit)

- **Input source:** `AI_Workspace/MCP_Server/shared_context.jsonl`
- **Tooling:** `node AI_Workspace/scripts/context-token-baseline.mjs`
- **Runtime environment:** Windows (`win32`), Node `v24.14.0`, Ryzen 5 5600X, 12 logical CPUs, 15.94 GB RAM
- **Benchmark sample size:** 120 runs + 20 warmup
- **Broad read definition:** wide window read (`limit >= 20`) without strong task/correlation focus
- **Token estimate:** heuristic `tokens ~= bytes / 4`

## Baseline Snapshot (Expanded)

### Context volume

- `shared_context.jsonl`: **668,370 bytes** (~**167,093 tokens**) with **766 events**
- Date range: `2026-03-23` -> `2026-04-02`
- Open tasks (latest-state view): **24**

### Message length distribution

- Messages analyzed: **732**
- Average length: **161.68 chars**
- p50: **124**, p90: **311**, p95: **367**, p99: **477**, max: **972**
- Messages >160 chars: **294**
- Messages >280 chars: **109**

### Intake cost per agent (profile-driven)

- Profiles scanned: **8**
- Profiles with explicit intake query: **7**
- All 7 default to `limit=20` (broad-window): **100%**
- Estimated cost per intake query (`limit=20`):
  - `get_events`: **~4,808 tokens**
  - `/api/events`: **~10,042 tokens**

### Event volume by type (top)

- `TASK_ASSIGNED`: **175** (22.85%)
- `TASK_COMPLETED`: **165** (21.54%)
- `TASK_ACCEPTED`: **142** (18.54%)
- `TASK_IN_PROGRESS`: **119** (15.54%)

### Broad reads + latency

- `jsonl_read_parse_disk`:
  - p50: **3.441 ms**, p95: **5.053 ms**, avg: **3.732 ms**
- `broad_end_to_end_sim_limit50` (read + parse + `/api/events` style build):
  - p50: **3.538 ms**, p95: **4.246 ms**, avg: **3.641 ms**
  - throughput: **274.59 reads/s**
- `compact_end_to_end_sim_limit10_no_nested`:
  - p50: **3.497 ms**, p95: **5.977 ms**, avg: **3.901 ms**

## KPI Table Update (TBD -> Numeric)

| KPI (Plan) | Baseline now |
|---|---:|
| `/api/events` tokens (`limit=50`) | **26,650** |
| `get_events` tokens (`limit=50`) | **12,920** |
| `shared_context.jsonl` token mass | **167,093** |
| Mensaje MCP promedio | **161.68 chars** |
| Query de intake por agente | **100% broad-window (`limit=20`)** |
| Eventos leidos para empezar tarea | **20** (promedio y mediana de intake defaults) |
| Snapshot de tarea disponible | **0%** |
| Snapshot de correlacion disponible | **0%** |
| Snapshots suficientes sin expansion | **0%** |
| Handoff corto por tarea cerrada | **60.37%** (proxy: `TASK_COMPLETED` con `message <= 160`) |
| Tareas que requieren fallback broad scan | **100%** |
| Profile conformance rate (limit <=10) | **0%** |
| Latencia promedio lectura compacta | **3.901 ms** (p50 3.497 / p95 5.977) |
| Snapshot stale rate | **100%** (no snapshot contract in runtime) |
| Snapshot rebuild success rate | **0%** (no snapshot engine deployed) |
| Snapshot conflict rate | **0%** observed |
| Sidecar partial write incidents | **0** observed |
| Wave rollout incidents | **0** (no rollout iniciado) |
| Alert ack time | **0 incidents resolved** (baseline sample without ack events) |
| Legacy mode hit rate | **100%** (snapshot model aun no implementado) |

## Additional Optimization Signal (from same run)

- `/api/events limit=50` vs events-only duplication factor: **2.06x**
- Nested `task.events` overhead in `/api/events`: **48.6%** of payload
- Potential savings:
  - Latest-per-task compaction: **76.79%**
  - Canonical payload field dedupe: **22.93%**

## Deliverables

- Updated baseline script: `AI_Workspace/scripts/context-token-baseline.mjs`
- Expanded baseline report: `AI_Workspace/docs/internal/reports/aiw-optimizer-tco-00-baseline-expansion-20260402.md`

## Repro Command

```bash
node AI_Workspace/scripts/context-token-baseline.mjs
```
