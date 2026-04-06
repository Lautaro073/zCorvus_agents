# Documenter i18n Canonical Sync Report

## Metadata

- taskId: `aiw-documenter-i18n-canonical-sync-20260406-33`
- correlationId: `aiw-frontend-i18n-common-canonical-20260406`
- owner: `Documenter`
- date: `2026-04-06`

## Objective

Update documentation to reflect canonical i18n migration after frontend task `...-32`, removing ambiguity around shared/common keys, wrapper usage, and migrated route scope.

## Inputs reviewed

1. `docs/internal/reports/aiw-frontend-i18n-common-canonical-migration-20260406.md`
2. `docs/internal/reports/aiw-frontend-i18n-hardcoded-text-fix-20260406.md`
3. `docs/internal/reports/aiw-frontend-i18n-show-all-fix-20260406.md`
4. `docs/internal/reports/aiw-tester-i18n-show-all-recheck-20260406.md`
5. `docs/internal/reports/aiw-frontend-orchestrator-handoff-20260406.md`
6. `docs/internal/specs/frontend-theme-persistence-contract.md`
7. `docs/internal/runbooks/premium-flow-runbook.md`

## Documentation updates

1. `docs/internal/specs/frontend-theme-persistence-contract.md`
   - metadata updated to canonical i18n sync task/correlation
   - explicit canonical icon key set documented
   - migrated route/surface map added

2. `docs/internal/runbooks/premium-flow-runbook.md`
   - metadata updated to canonical i18n sync task/correlation
   - canonical key expectations expanded
   - migrated route scope and baseline guard added

## Acceptance mapping

1. Docs explican el esquema i18n canónico post `...-32` -> `PASS`
2. Runbook enumera rutas migradas y namespaces/keys usados -> `PASS`
3. Registry actualizado con docs editados y reporte -> `PASS`

## Artifacts

- `docs/internal/specs/frontend-theme-persistence-contract.md`
- `docs/internal/runbooks/premium-flow-runbook.md`
- `docs/internal/reports/aiw-documenter-i18n-canonical-sync-20260406.md`
