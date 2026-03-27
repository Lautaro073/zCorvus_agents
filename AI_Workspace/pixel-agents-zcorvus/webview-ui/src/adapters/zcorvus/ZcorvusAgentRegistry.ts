import { CharacterState, type Character, type Seat } from '../../office/types.js';
import { createCharacter } from '../../office/engine/characters.js';

export interface ZcorvusAgentConfig {
  id: number;
  displayName: string;
  agentName: string;
  palette: number;
  hueShift: number;
  seatCol: number;
  seatRow: number;
  facingDir: 0 | 1 | 2 | 3;
}

const SEAT_COLS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
const SEAT_ROWS = [2, 4, 6, 8, 10];

function getNextSeatPosition(index: number): { col: number; row: number } {
  return {
    col: SEAT_COLS[index % SEAT_COLS.length],
    row: SEAT_ROWS[Math.floor(index / SEAT_COLS.length) % SEAT_ROWS.length],
  };
}

function getNextPalette(index: number): { palette: number; hueShift: number } {
  return {
    palette: index % 6,
    hueShift: (index % 6) * 45,
  };
}

export interface AgentStateUpdate {
  agentId: number;
  state: typeof CharacterState.IDLE | typeof CharacterState.WALK | typeof CharacterState.TYPE;
  tool: string | null;
  bubbleType: 'waiting' | 'permission' | null;
  alertType: 'blocked' | 'incident' | null;
  isActive: boolean;
  message?: string;
  taskId?: string;
  correlationId?: string;
}

export class ZcorvusAgentRegistry {
  private agents: Map<number, ZcorvusAgentConfig> = new Map();
  private agentStates: Map<number, AgentStateUpdate> = new Map();
  private officeState: { characters: Map<number, Character>; seats: Map<string, Seat> } | null = null;
  private agentNameToId: Map<string, number> = new Map();
  private nextAgentId = 1;

  initialize(officeState: { characters: Map<number, Character>; seats: Map<string, Seat> }): void {
    this.officeState = officeState;
  }

  registerAgentFromMcpEvent(agentName: string): number {
    if (this.agentNameToId.has(agentName)) {
      return this.agentNameToId.get(agentName)!;
    }

    const agentId = this.nextAgentId++;
    const index = this.agents.size;
    const seatPos = getNextSeatPosition(index);
    const paletteInfo = getNextPalette(index);

    const config: ZcorvusAgentConfig = {
      id: agentId,
      displayName: agentName,
      agentName: agentName,
      palette: paletteInfo.palette,
      hueShift: paletteInfo.hueShift,
      seatCol: seatPos.col,
      seatRow: seatPos.row,
      facingDir: 0,
    };

    this.agents.set(agentId, config);
    this.agentNameToId.set(agentName, agentId);

    if (this.officeState) {
      this.addAgentToOffice(config);
    }

    return agentId;
  }

  private addAgentToOffice(agent: ZcorvusAgentConfig): void {
    if (!this.officeState) return;

    const seatId = `seat-${agent.seatCol}-${agent.seatRow}`;
    let seat = this.officeState.seats.get(seatId);

    if (!seat) {
      seat = {
        uid: seatId,
        seatCol: agent.seatCol,
        seatRow: agent.seatRow,
        facingDir: agent.facingDir,
        assigned: true,
      };
      this.officeState.seats.set(seatId, seat);
    } else {
      seat.assigned = true;
      seat.facingDir = agent.facingDir;
    }

    const ch = createCharacter(
      agent.id,
      agent.palette,
      seatId,
      seat,
      agent.hueShift
    );

    ch.isActive = false;
    ch.state = CharacterState.IDLE;

    this.officeState.characters.set(agent.id, ch);

    this.agentStates.set(agent.id, {
      agentId: agent.id,
      state: CharacterState.IDLE,
      tool: null,
      bubbleType: null,
      alertType: null,
      isActive: false,
      taskId: '',
      correlationId: '',
    });
  }

  updateAgentState(update: AgentStateUpdate): void {
    if (!this.officeState) return;

    const ch = this.officeState.characters.get(update.agentId);
    if (!ch) return;

    ch.state = update.state;
    ch.currentTool = update.tool;
    ch.alertType = update.alertType;
    ch.isActive = update.isActive;

    if (update.message) {
      console.log(`[ZcorvusAgent] ${this.getAgentName(update.agentId)}: ${update.message}`);
    }

    this.agentStates.set(update.agentId, update);
  }

  getAgentState(agentId: number): AgentStateUpdate | undefined {
    return this.agentStates.get(agentId);
  }

  getAgentConfig(agentId: number): ZcorvusAgentConfig | undefined {
    return this.agents.get(agentId);
  }

  getAgentName(agentId: number): string {
    const config = this.agents.get(agentId);
    return config?.displayName || `Agent ${agentId}`;
  }

  getAllAgentIds(): number[] {
    return Array.from(this.agents.keys());
  }

  getActiveAgents(): number[] {
    const active: number[] = [];
    for (const [id, state] of this.agentStates) {
      if (state.isActive) {
        active.push(id);
      }
    }
    return active;
  }

  getBlockedAgents(): number[] {
    const blocked: number[] = [];
    for (const [id, state] of this.agentStates) {
      const agent = this.agents.get(id);
      if (agent && (state.message === 'blocked' || state.message === 'incident' || state.message === 'test failed')) {
        blocked.push(id);
      }
    }
    return blocked;
  }

  hasAgent(agentId: number): boolean {
    return this.agents.has(agentId);
  }

  getAgentCount(): number {
    return this.agents.size;
  }

  getSeatPosition(agentId: number): { col: number; row: number } | null {
    const config = this.agents.get(agentId);
    return config ? { col: config.seatCol, row: config.seatRow } : null;
  }

  getAgentIdByName(agentName: string): number | undefined {
    return this.agentNameToId.get(agentName);
  }

  reset(): void {
    if (!this.officeState) return;

    for (const [id] of this.agents) {
      const ch = this.officeState.characters.get(id);
      if (ch) {
        ch.state = CharacterState.IDLE;
        ch.currentTool = null;
        ch.bubbleType = null;
        ch.isActive = false;
      }

      this.agentStates.set(id, {
        agentId: id,
        state: CharacterState.IDLE,
        tool: null,
        bubbleType: null,
        alertType: null,
        isActive: false,
        taskId: '',
        correlationId: '',
      });
    }
  }

  clear(): void {
    this.agents.clear();
    this.agentStates.clear();
    this.agentNameToId.clear();
    this.nextAgentId = 1;
  }
}

let globalRegistry: ZcorvusAgentRegistry | null = null;

export function getZcorvusAgentRegistry(): ZcorvusAgentRegistry {
  if (!globalRegistry) {
    globalRegistry = new ZcorvusAgentRegistry();
  }
  return globalRegistry;
}

export function initializeZcorvusAgents(
  officeState: { characters: Map<number, Character>; seats: Map<string, Seat> }
): void {
  const registry = getZcorvusAgentRegistry();
  registry.initialize(officeState);
}