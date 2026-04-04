# AutoSkills Backend Issues Triage

## Metadata
- taskId: `aiw-observer-autoskills-backend-issues-triage-20260404-01`
- correlationId: `aiw-autoskills-backend-20260404`
- owner: `Observer`
- date: `2026-04-04`
- status: `in_progress`

## Objective
Investigar por que en la pasada de `npx autoskills` enfocada en Backend no se obtuvieron recomendaciones backend, revisar señales MCP/dispatcher/comandos, clasificar severidad e impacto, y proponer acciones correctivas.

## Evidence reviewed
1. `MCP_Server/shared_context.jsonl` (eventos `1150-1159` del correlation autoskills backend).
2. `docs/internal/reports/aiw-optimizer-autoskills-gap-scan-backend-20260404.md`.
3. Reproduccion local de comandos:
   - `npx autoskills --dry-run -v`
   - `npx autoskills --dry-run -a codex -v`
   - `npx autoskills --dry-run -a cursor -v`
   - `npx autoskills --dry-run -a opencode -v`

## Minimal reproduction

From `AI_Workspace/`:

```bash
npx autoskills --dry-run -v
```

Observed output:
1. Tool prints `Web frontend detected (from project files)`.
2. Tool recommends only Frontend skills:
   - `anthropics/frontend-design`
   - `addyosmani/accessibility`
   - `addyosmani/seo`
3. No backend recommendation is emitted.

Result is consistent across `-a codex`, `-a cursor`, `-a opencode`.

## Findings
1. **No backend recommendation appears because autoskills classification is frontend-dominant in this repo state**, not because command execution failed.
2. The backend-focused scan task (`aiw-opt-autoskills-gap-scan-backend-20260404-01`) completed successfully with explicit evidence of this same output.
3. There is **task lifecycle noise** in MCP timeline:
   - `TASK_ASSIGNED` for this Observer triage at line 1155,
   - then `TASK_CANCELLED` at line 1156,
   - then new Observer task for monitor alerts at line 1157,
   - then this task was re-accepted/in-progress by user instruction (lines 1158-1159).
   This is governance/timeline inconsistency, not autoskills runtime failure.

## Severity and impact
1. **Autoskills functional severity:** `medium`
   - Impact: backend gap can be under-detected if repository heuristics are dominated by frontend signals.
2. **Operational/process severity (task state drift):** `medium`
   - Impact: duplicate/conflicting work due cancel/reassign churn for same operator window.
3. **System availability impact:** `low`
   - No outage; command runs complete and deterministic.

## Root cause hypothesis
1. **Primary cause:** heuristic bias in autoskills project fingerprinting toward frontend features in monorepo/workspace context.
2. **Secondary cause:** missing backend-specific forcing inputs in autoskills invocation for scoped backend-only analysis.
3. **Tertiary process cause:** fast reassignment/cancellation events introduce triage ambiguity.

## Corrective actions
1. Add a backend-scoped autoskills wrapper command/script (fixed cwd and include filters if supported).
2. Record a policy: for backend triage, pair autoskills output with manual backend checklist before “no-gap” conclusion.
3. Add MCP event contract guardrail in dispatcher/orchestration path to prevent cancel-and-reassign collisions in same minute for same operator unless explicit override reason includes replacement task reference.
4. Add report template field `classificationBasis` (`frontend-detected`, `backend-detected`, `mixed`) to avoid false interpretation.
5. Re-run backend scan after any backend surface change (APIs/services/deps) with artifact evidence.

## Current status
Investigation confirms reproducible frontend-only autoskills output and identifies process-level timeline inconsistency as separate issue.
