# AutoSkills Gap Scan Report

## Metadata
- taskId: `aiw-opt-autoskills-gap-scan-20260404-03`
- correlationId: `aiw-autoskills-test-20260404`
- owner: `AI_Workspace_Optimizer`
- date: `2026-04-04`
- status: `completed`

## Objective
Run `npx autoskills` as requested to audit missing/unassigned skills in `AI_Workspace`, then provide findings, recommendations per agent, suggested diff, risks, and command evidence.

## Commands executed

```bash
npx autoskills --help
npx autoskills --dry-run -v
npx autoskills --dry-run -a codex -v
npx autoskills --dry-run -a claude-code -v
```

## Findings

AutoSkills detection output was consistent across dry-run variants:

1. `anthropics/frontend-design` -> target agent: `Frontend`
2. `addyosmani/accessibility` -> target agent: `Frontend`
3. `addyosmani/seo` -> target agent: `Frontend`

No other missing skill recommendations were reported by the tool in this workspace context.

## Current assignment check

- `Agents/Frontend/profile.md` currently lists 15 installed skills.
- None of the three suggested skills appear in `Agents/Frontend/skills/` at this moment.

## Recommended assignment plan

### Frontend agent
Install and register the three suggested skills under Frontend ownership:

- `frontend-design`
- `accessibility`
- `seo`

Rationale:
- all recommendations from `autoskills` explicitly target Frontend,
- aligns with existing Frontend responsibilities for design/accessibility/UX quality.

## Suggested diff (proposed, not applied)

1. Install skills with chosen source policy (manual or automation flow).
2. Ensure canonical directories under:
   - `AI_Workspace/Agents/Frontend/skills/frontend-design/`
   - `AI_Workspace/Agents/Frontend/skills/accessibility/`
   - `AI_Workspace/Agents/Frontend/skills/seo/`
3. Update `AI_Workspace/Agents/Frontend/profile.md` skill list.
4. If lock/versioning is used for these entries, update `AI_Workspace/skills-lock.json` accordingly.

## Risks

1. **Source trust and quality variance**
   - External skills may differ in style/quality from current internal standards.
2. **Prompt overlap / instruction conflicts**
   - New design/accessibility guidance may overlap with existing Frontend skills.
3. **Governance drift**
   - Installing skills without profile/ownership sync can reintroduce mismatch issues.
4. **Tooling assumptions**
   - `autoskills` recommendations are heuristic and should be reviewed before install.

## Risk mitigations

1. Review each recommended skill content before installation.
2. Keep canonical ownership in `Agents/Frontend/skills` only.
3. Update profile and run a post-install profile-vs-skills consistency check.
4. Add a short integration test/checklist for prompt precedence conflicts.

## Conclusion
`npx autoskills` reports exactly three Frontend-oriented missing skills. Recommended next step is controlled installation + profile synchronization under Frontend ownership.

## Artifacts
- `AI_Workspace/docs/internal/reports/aiw-optimizer-autoskills-gap-scan-20260404-03.md`
