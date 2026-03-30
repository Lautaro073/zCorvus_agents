# AI_Workspace_Optimizer Learnings

## Skills Installation

### Always Ask for Target Agent
When installing skills from skills.sh, ALWAYS ask Orchestrator which agent should receive the skill before installing. Do NOT install globally with `-g` flag.

**Correct approach:**
1. Ask: "¿Qué agente usará esta skill?"
2. Install to: `AI_Workspace/Agents/{AgentName}/skills/`
3. Copy from global if already installed globally

### Skills by Agent (Reference)

| Agent | Skills Location |
|-------|----------------|
| Frontend | `AI_Workspace/Agents/Frontend/skills/` |
| Tester | `AI_Workspace/Agents/Tester/skills/` |
| Observer | `AI_Workspace/Agents/Observer/skills/` |
| Backend | `AI_Workspace/Agents/Backend/skills/` |
| Orchestrator | `AI_Workspace/Agents/Orchestrator/skills/` |
| Planner | `AI_Workspace/Agents/Planner/skills/` |
| Documenter | `AI_Workspace/Agents/Documenter/skills/` |

### Skills Installed to Date

- **Frontend**: svg-animation-engineer, dramatic-2000ms-plus, elevated-design, motion-designer, apple-ui-skills
- **Tester**: test-driven-development, systematic-debugging, playwright-testing
- **Observer**: layout-overflow-guardrails, observability-design-patterns
