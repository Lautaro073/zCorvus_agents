# AgentMonitor V2 Invalid Date Triage Report

- Task ID: `aiw-tester-v2-invalid-date-triage-20260331-01`
- Correlation ID: `aiw-agentmonitor-v2-20260330`
- Scope: `AI_Workspace/agentmonitor-v2`
- Date: 2026-03-31

## Symptom reported

Runtime crash in browser:

`RangeError: Invalid time value`

Log evidence from `C:/Users/El Yisus Pai/Desktop/zCorvus/log.txt`:
- `at Date.toISOString`
- stack points to minified app chunk where dashboard metrics are computed.

## Reproduction (deterministic)

### Repro path
1. Ensure any event in the dataset has an invalid timestamp string (for example: `"INVALID_TIMESTAMP"` or missing `timestamp`).
2. Load AgentMonitor V2.
3. Dashboard metrics hook executes bucketing.
4. App throws `RangeError: Invalid time value`.

### Repro command used

```bash
node -e "const events=[{timestamp:'2026-03-30T10:00:00.000Z',taskId:'a',status:'TASK_ASSIGNED',type:'TASK_ASSIGNED'},{timestamp:'INVALID_TIMESTAMP',taskId:'b',status:'TASK_IN_PROGRESS',type:'TASK_IN_PROGRESS'}];const sorted=[...events].sort((a,b)=>new Date(a.timestamp).getTime()-new Date(b.timestamp).getTime());function toMinuteBucket(timestamp){const d=new Date(timestamp);d.setSeconds(0,0);return d.toISOString();}try{for(const e of sorted){toMinuteBucket(e.timestamp)}const now=new Date(sorted[sorted.length-1].timestamp).getTime();const b=new Date(now);b.setSeconds(0,0);console.log(b.toISOString());}catch(e){console.log('error',e.name,e.message);}"
```

Observed output:

```text
error RangeError Invalid time value
```

## Root cause

`useDashboardMetrics.ts` assumes all `event.timestamp` values are valid ISO dates and calls `toISOString()` without sanitization.

Primary failure points:
- `toMinuteBucket(timestamp)` -> `new Date(timestamp)` -> `date.toISOString()`
- `now` derived from possibly invalid latest timestamp, then used to build more buckets with `toISOString()`

If one malformed event is present in the feed, the dashboard can crash.

## Files and lines impacted

### Critical crash path
- `AI_Workspace/agentmonitor-v2/src/hooks/useDashboardMetrics.ts:10`
- `AI_Workspace/agentmonitor-v2/src/hooks/useDashboardMetrics.ts:13`
- `AI_Workspace/agentmonitor-v2/src/hooks/useDashboardMetrics.ts:70`
- `AI_Workspace/agentmonitor-v2/src/hooks/useDashboardMetrics.ts:80`

### Additional unsafe date consumers (can also throw with invalid date)
- `AI_Workspace/agentmonitor-v2/src/components/layout/Header.tsx:167`
- `AI_Workspace/agentmonitor-v2/src/components/criticalPanel/AlertItem.tsx:21`
- `AI_Workspace/agentmonitor-v2/src/components/taskGroups/TaskRow.tsx:50`
- `AI_Workspace/agentmonitor-v2/src/components/timeline/TimelineEvent.tsx:45`

## Regression test proposal

Add a targeted regression test for invalid timestamps in dashboard metrics flow:

1. Inject events containing one invalid timestamp.
2. Render dashboard.
3. Assert app does not crash.
4. Assert invalid events are ignored or sanitized.
5. Assert remaining valid metrics render.

Suggested test file:
- `agentmonitor-v2/tests/e2e/invalid-timestamp.spec.ts`

Suggested assertions:
- no unhandled exception in console
- hero section still visible
- metric cards still render

## Notes

- Current API sample checked during triage had valid timestamps, so the issue is data-quality triggered (intermittent) rather than constant.
- Root cause remains valid because code path has no guardrails for malformed timestamp inputs.
