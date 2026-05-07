/**
 * levelLayoutData.ts — Archetype-based room layout generators.
 *
 * Each archetype function takes configuration parameters and returns a
 * RoomDefinition. These are the building blocks for all level layouts
 * across the 11 worlds. The actual level definitions are in worldLevelPlans.ts.
 */

import type { RoomDefinition, LevelObject, EnemySpawnMarker, RuleZone } from '../types/levelTypes';

// ─── Shared helpers ───────────────────────────────────────────────

let _oidCounter = 0;
function oid(prefix: string): string { return `${prefix}_${++_oidCounter}`; }

// ─── Parameter interfaces ─────────────────────────────────────────

export interface TeachChamberParams {
  roomId: string; roomName: string; floorColor: string;
  shrineLabel?: string; enemyConcepts: string[]; mathMotifs?: string[]; objective: string;
}

export interface CentralShrineArenaParams {
  roomId: string; roomName: string; floorColor: string;
  shrineLabel: string; shrineColor: string; enemyConcepts: string[]; mathMotifs?: string[];
}

export interface FourQuadrantArenaParams {
  roomId: string; roomName: string; floorColor: string;
  quadrantLabels: [string, string, string, string];
  quadrantColors: [string, string, string, string];
  enemyConcepts: string[]; mathMotifs?: string[];
}

export interface RingArenaParams {
  roomId: string; roomName: string; floorColor: string;
  centerLabel: string; centerColor: string; ringLabel?: string;
  enemyConcepts: string[]; isBoss?: boolean; mathMotifs?: string[];
}

export interface BranchingChoiceParams {
  roomId: string; roomName: string; floorColor: string;
  branchLabels: string[]; enemyConcepts: string[]; mathMotifs?: string[];
}

export interface GridChamberParams {
  roomId: string; roomName: string; floorColor: string;
  gridSize: 3 | 5 | 7; tileLabels?: string[][];
  enemyConcepts: string[]; mathMotifs?: string[];
}

export interface LockAndKeyParams {
  roomId: string; roomName: string; floorColor: string;
  roomCount: number; keyLabels: string[]; lockLabel: string;
  enemyConcepts: string[]; mathMotifs?: string[];
}

export interface ConvergingLanesParams {
  roomId: string; roomName: string; floorColor: string;
  laneCount: number; laneLabels: string[]; gateLabel: string;
  enemyConcepts: string[]; mathMotifs?: string[];
}

export interface SplitIslandArenaParams {
  roomId: string; roomName: string; floorColor: string;
  islandCount: number; islandLabels: string[]; bridgeLabel?: string;
  enemyConcepts: string[]; mathMotifs?: string[];
}

export interface MirrorReflectionParams {
  roomId: string; roomName: string; floorColor: string;
  mirrorCount: number; enemyConcepts: string[]; mathMotifs?: string[];
}

export interface FlowChamberParams {
  roomId: string; roomName: string; floorColor: string;
  flowLabel: string; flowColor: string;
  enemyConcepts: string[]; mathMotifs?: string[];
}

export interface RecursiveChamberParams {
  roomId: string; roomName: string; floorColor: string;
  nestingDepth: number; patternLabel: string;
  enemyConcepts: string[]; mathMotifs?: string[];
}

export interface BossArenaParams {
  roomId: string; roomName: string; floorColor: string;
  bossLabel: string; bossColor: string; phaseCount: number; phaseLabels: string[];
  enemyConcepts: string[]; mathMotifs?: string[];
}

// ─── Archetype generators ─────────────────────────────────────────

export function makeTeachChamber(p: TeachChamberParams): RoomDefinition {
  const objects: LevelObject[] = [
    { id: oid('tf'), type: 'mote_fountain', x: 0.5, y: 0.5, size: 0.06, label: p.shrineLabel ?? 'Learn', color: '#80c8ff', glowColor: 'rgba(128,200,255,0.4)' },
    { id: oid('tg'), type: 'gate', x: 0.5, y: 0.08, size: 0.07, label: 'Exit', color: '#70e080', glowColor: 'rgba(112,224,128,0.4)' },
    { id: oid('td'), type: 'decorative', x: 0.12, y: 0.15, size: 0.04, label: p.mathMotifs?.[0] ?? '○', color: 'rgba(200,200,255,0.3)' },
    { id: oid('td'), type: 'decorative', x: 0.88, y: 0.15, size: 0.04, label: p.mathMotifs?.[1] ?? '□', color: 'rgba(200,200,255,0.3)' },
    { id: oid('td'), type: 'decorative', x: 0.12, y: 0.85, size: 0.04, label: p.mathMotifs?.[2] ?? '=', color: 'rgba(200,200,255,0.3)' },
    { id: oid('td'), type: 'decorative', x: 0.88, y: 0.85, size: 0.04, label: p.mathMotifs?.[3] ?? '∅', color: 'rgba(200,200,255,0.3)' },
  ];
  const spawns: EnemySpawnMarker[] = [
    { concept: p.enemyConcepts[0] ?? 'basic mote', x: 0.3, y: 0.65, formation: 'single', count: 1 },
    { concept: p.enemyConcepts[1] ?? 'basic mote', x: 0.7, y: 0.65, formation: 'single', count: 1 },
    { concept: p.enemyConcepts[2] ?? 'basic mote', x: 0.5, y: 0.78, formation: 'single', count: 1 },
  ];
  return { id: p.roomId, name: p.roomName, shape: 'rectangle', objects, enemySpawns: spawns, ruleZones: [], mathMotifs: p.mathMotifs, floorColor: p.floorColor };
}

export function makeCentralShrineArena(p: CentralShrineArenaParams): RoomDefinition {
  const objects: LevelObject[] = [
    { id: oid('cs'), type: 'shrine', x: 0.5, y: 0.5, size: 0.07, label: p.shrineLabel, color: p.shrineColor, glowColor: p.shrineColor + '55' },
    { id: oid('cg'), type: 'gate', x: 0.5, y: 0.08, size: 0.07, label: 'Locked', color: '#ff6666', glowColor: 'rgba(255,100,100,0.4)', behaviorHook: 'shrine_unlock' },
    { id: oid('cp'), type: 'pillar', x: 0.3, y: 0.3, size: 0.035, color: '#8888aa' },
    { id: oid('cp'), type: 'pillar', x: 0.7, y: 0.3, size: 0.035, color: '#8888aa' },
    { id: oid('cp'), type: 'pillar', x: 0.3, y: 0.7, size: 0.035, color: '#8888aa' },
    { id: oid('cp'), type: 'pillar', x: 0.7, y: 0.7, size: 0.035, color: '#8888aa' },
  ];
  const zones: RuleZone[] = [
    { id: oid('rz'), label: p.shrineLabel, bounds: [0.5, 0.5, 0.18], shape: 'circle', color: p.shrineColor + '22', borderColor: p.shrineColor + '88', ruleHook: 'shrine_zone' },
  ];
  const spawns: EnemySpawnMarker[] = [
    { concept: p.enemyConcepts[0] ?? 'guardian', x: 0.5, y: 0.22, formation: 'pair', count: 2 },
    { concept: p.enemyConcepts[1] ?? 'guardian', x: 0.78, y: 0.5, formation: 'single', count: 1 },
    { concept: p.enemyConcepts[2] ?? 'guardian', x: 0.5, y: 0.78, formation: 'pair', count: 2 },
    { concept: p.enemyConcepts[0] ?? 'guardian', x: 0.22, y: 0.5, formation: 'single', count: 1 },
  ];
  return { id: p.roomId, name: p.roomName, shape: 'hexagon', objects, enemySpawns: spawns, ruleZones: zones, mathMotifs: p.mathMotifs, floorColor: p.floorColor };
}

export function makeFourQuadrantArena(p: FourQuadrantArenaParams): RoomDefinition {
  const zones: RuleZone[] = [
    { id: oid('q'), label: p.quadrantLabels[0], bounds: [0, 0, 0.5, 0.5], shape: 'rect', color: p.quadrantColors[0] + '22', borderColor: p.quadrantColors[0] + '88' },
    { id: oid('q'), label: p.quadrantLabels[1], bounds: [0.5, 0, 0.5, 0.5], shape: 'rect', color: p.quadrantColors[1] + '22', borderColor: p.quadrantColors[1] + '88' },
    { id: oid('q'), label: p.quadrantLabels[2], bounds: [0, 0.5, 0.5, 0.5], shape: 'rect', color: p.quadrantColors[2] + '22', borderColor: p.quadrantColors[2] + '88' },
    { id: oid('q'), label: p.quadrantLabels[3], bounds: [0.5, 0.5, 0.5, 0.5], shape: 'rect', color: p.quadrantColors[3] + '22', borderColor: p.quadrantColors[3] + '88' },
  ];
  const objects: LevelObject[] = [
    { id: oid('div'), type: 'platform', x: 0.5, y: 0.5, size: 0.01, label: '|', color: '#888' },
    { id: oid('div'), type: 'platform', x: 0.5, y: 0.5, size: 0.01, label: '—', color: '#888' },
    { id: oid('dg'), type: 'gate', x: 0.5, y: 0.08, size: 0.07, label: 'Exit', color: '#70e080', glowColor: 'rgba(112,224,128,0.4)' },
    { id: oid('dm'), type: 'decorative', x: 0.25, y: 0.25, size: 0.05, label: p.mathMotifs?.[0] ?? '①', color: p.quadrantColors[0] + 'aa' },
    { id: oid('dm'), type: 'decorative', x: 0.75, y: 0.25, size: 0.05, label: p.mathMotifs?.[1] ?? '②', color: p.quadrantColors[1] + 'aa' },
    { id: oid('dm'), type: 'decorative', x: 0.25, y: 0.75, size: 0.05, label: p.mathMotifs?.[2] ?? '③', color: p.quadrantColors[2] + 'aa' },
    { id: oid('dm'), type: 'decorative', x: 0.75, y: 0.75, size: 0.05, label: p.mathMotifs?.[3] ?? '④', color: p.quadrantColors[3] + 'aa' },
  ];
  const spawns: EnemySpawnMarker[] = [
    { concept: p.enemyConcepts[0] ?? 'quadrant enemy', x: 0.25, y: 0.25, formation: 'cluster', count: 2 },
    { concept: p.enemyConcepts[1] ?? 'quadrant enemy', x: 0.75, y: 0.25, formation: 'cluster', count: 2 },
    { concept: p.enemyConcepts[2] ?? 'quadrant enemy', x: 0.25, y: 0.75, formation: 'cluster', count: 2 },
    { concept: p.enemyConcepts[3] ?? 'quadrant enemy', x: 0.75, y: 0.75, formation: 'cluster', count: 2 },
  ];
  return { id: p.roomId, name: p.roomName, shape: 'rectangle', objects, enemySpawns: spawns, ruleZones: zones, mathMotifs: p.mathMotifs, floorColor: p.floorColor };
}

export function makeRingArena(p: RingArenaParams): RoomDefinition {
  const centerObj: LevelObject = p.isBoss
    ? { id: oid('bs'), type: 'boss_sigil', x: 0.5, y: 0.5, size: 0.1, label: p.centerLabel, color: p.centerColor, glowColor: p.centerColor + '55' }
    : { id: oid('sh'), type: 'shrine', x: 0.5, y: 0.5, size: 0.07, label: p.centerLabel, color: p.centerColor, glowColor: p.centerColor + '55' };
  const objects: LevelObject[] = [centerObj];
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 - Math.PI / 4;
    objects.push({ id: oid('rp'), type: 'pillar', x: 0.5 + Math.cos(angle) * 0.22, y: 0.5 + Math.sin(angle) * 0.22, size: 0.03, color: '#8888aa' });
  }
  const zones: RuleZone[] = [
    { id: oid('rz'), label: p.ringLabel ?? 'Ring Zone', bounds: [0.5, 0.5, 0.35], shape: 'circle', color: p.centerColor + '18', borderColor: p.centerColor + '66', ruleHook: 'ring_zone' },
  ];
  const spawns: EnemySpawnMarker[] = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    return { concept: p.enemyConcepts[i % p.enemyConcepts.length] ?? 'ring enemy', x: 0.5 + Math.cos(angle) * 0.35, y: 0.5 + Math.sin(angle) * 0.35, formation: 'single', count: 1 };
  });
  return { id: p.roomId, name: p.roomName, shape: 'ring', objects, enemySpawns: spawns, ruleZones: zones, mathMotifs: p.mathMotifs, floorColor: p.floorColor, isBoss: p.isBoss };
}

export function makeBranchingChoice(p: BranchingChoiceParams): RoomDefinition {
  const branchPositions = [
    { x: 0.2, y: 0.3 }, { x: 0.5, y: 0.12 }, { x: 0.8, y: 0.3 },
  ];
  const objects: LevelObject[] = [
    { id: oid('bs'), type: 'platform', x: 0.5, y: 0.85, size: 0.08, label: 'Start', color: '#80c8ff', glowColor: 'rgba(128,200,255,0.3)' },
  ];
  for (let i = 0; i < Math.min(p.branchLabels.length, 3); i++) {
    const pos = branchPositions[i];
    if (!pos) continue;
    objects.push({ id: oid('bg'), type: 'gate', x: pos.x, y: pos.y, size: 0.07, label: p.branchLabels[i], color: '#c8a840', glowColor: 'rgba(200,168,64,0.4)' });
  }
  const spawns: EnemySpawnMarker[] = p.branchLabels.slice(0, 3).map((_, i) => {
    const pos = branchPositions[i];
    return { concept: p.enemyConcepts[i % p.enemyConcepts.length] ?? 'branch enemy', x: (pos?.x ?? 0.5), y: (pos?.y ?? 0.3) + 0.15, formation: 'pair', count: 2 };
  });
  return { id: p.roomId, name: p.roomName, shape: 'cross', objects, enemySpawns: spawns, ruleZones: [], mathMotifs: p.mathMotifs, floorColor: p.floorColor };
}

export function makeGridChamber(p: GridChamberParams): RoomDefinition {
  const objects: LevelObject[] = [];
  const spawns: EnemySpawnMarker[] = [];
  const step = 1 / (p.gridSize + 1);
  for (let row = 0; row < p.gridSize; row++) {
    for (let col = 0; col < p.gridSize; col++) {
      const x = step * (col + 1);
      const y = step * (row + 1);
      const label = p.tileLabels?.[row]?.[col];
      objects.push({ id: oid('gt'), type: 'platform', x, y, size: 0.035, label, color: '#445566' });
      if ((row + col) % 2 === 0 && row > 0) {
        spawns.push({ concept: p.enemyConcepts[(row * p.gridSize + col) % p.enemyConcepts.length] ?? 'grid enemy', x, y: y - 0.05, formation: 'single', count: 1 });
      }
    }
  }
  objects.push({ id: oid('gg'), type: 'gate', x: 0.5, y: 0.08, size: 0.07, label: 'Exit', color: '#70e080', glowColor: 'rgba(112,224,128,0.4)' });
  return { id: p.roomId, name: p.roomName, shape: 'rectangle', objects, enemySpawns: spawns, ruleZones: [], mathMotifs: p.mathMotifs, floorColor: p.floorColor };
}

export function makeLockAndKeyDungeon(p: LockAndKeyParams): RoomDefinition {
  const keyPositions = [{ x: 0.2, y: 0.7 }, { x: 0.5, y: 0.8 }, { x: 0.8, y: 0.7 }, { x: 0.2, y: 0.45 }, { x: 0.8, y: 0.45 }];
  const objects: LevelObject[] = [
    { id: oid('lk'), type: 'gate', x: 0.5, y: 0.1, size: 0.07, label: p.lockLabel, color: '#ff6666', glowColor: 'rgba(255,100,100,0.4)', behaviorHook: 'key_lock' },
  ];
  for (let i = 0; i < Math.min(p.keyLabels.length, 5); i++) {
    const pos = keyPositions[i];
    if (!pos) continue;
    objects.push({ id: oid('kf'), type: 'key_fragment', x: pos.x, y: pos.y, size: 0.04, label: p.keyLabels[i], color: '#ffd764', glowColor: 'rgba(255,215,100,0.4)' });
  }
  const zones: RuleZone[] = [
    { id: oid('lz'), label: 'Locked Area', bounds: [0, 0, 1, 0.3], shape: 'rect', color: 'rgba(255,100,100,0.08)', borderColor: 'rgba(255,100,100,0.4)', ruleHook: 'locked_area' },
  ];
  const spawns: EnemySpawnMarker[] = p.keyLabels.slice(0, 3).map((_, i) => {
    const pos = keyPositions[i];
    return { concept: p.enemyConcepts[i % p.enemyConcepts.length] ?? 'key guardian', x: (pos?.x ?? 0.5) + 0.08, y: (pos?.y ?? 0.6), formation: 'single', count: 1 };
  });
  return { id: p.roomId, name: p.roomName, shape: 'rectangle', objects, enemySpawns: spawns, ruleZones: zones, mathMotifs: p.mathMotifs, floorColor: p.floorColor };
}

export function makeConvergingLanes(p: ConvergingLanesParams): RoomDefinition {
  const zones: RuleZone[] = [];
  const spawns: EnemySpawnMarker[] = [];
  const objects: LevelObject[] = [
    { id: oid('cg'), type: 'gate', x: 0.5, y: 0.1, size: 0.07, label: p.gateLabel, color: '#70e080', glowColor: 'rgba(112,224,128,0.4)' },
  ];
  const count = Math.min(p.laneCount, 3);
  const laneWidth = 0.9 / count;
  for (let i = 0; i < count; i++) {
    const lx = 0.05 + i * laneWidth;
    zones.push({ id: oid('ln'), label: p.laneLabels[i] ?? `Lane ${i + 1}`, bounds: [lx, 0.15, laneWidth - 0.02, 0.75], shape: 'rect', color: 'rgba(128,200,255,0.1)', borderColor: 'rgba(128,200,255,0.35)' });
    spawns.push({ concept: p.enemyConcepts[i % p.enemyConcepts.length] ?? 'lane enemy', x: lx + laneWidth / 2, y: 0.65, formation: 'pair', count: 2 });
    objects.push({ id: oid('br'), type: 'bridge', x: lx + laneWidth / 2, y: 0.15, size: 0.03, color: '#6688aa' });
  }
  return { id: p.roomId, name: p.roomName, shape: 'rectangle', objects, enemySpawns: spawns, ruleZones: zones, mathMotifs: p.mathMotifs, floorColor: p.floorColor };
}

export function makeSplitIslandArena(p: SplitIslandArenaParams): RoomDefinition {
  const zones: RuleZone[] = [];
  const spawns: EnemySpawnMarker[] = [];
  const objects: LevelObject[] = [
    { id: oid('sig'), type: 'gate', x: 0.5, y: 0.08, size: 0.07, label: 'Exit', color: '#70e080', glowColor: 'rgba(112,224,128,0.4)' },
  ];
  const count = Math.min(p.islandCount, 3);
  const islandWidth = 0.36;
  const islandPositions = count === 2
    ? [{ x: 0.07, y: 0.22 }, { x: 0.57, y: 0.22 }]
    : [{ x: 0.03, y: 0.22 }, { x: 0.37, y: 0.22 }, { x: 0.65, y: 0.22 }];
  for (let i = 0; i < count; i++) {
    const pos = islandPositions[i];
    if (!pos) continue;
    zones.push({ id: oid('il'), label: p.islandLabels[i] ?? `Island ${i + 1}`, bounds: [pos.x, pos.y, islandWidth, 0.58], shape: 'rect', color: 'rgba(160,220,160,0.1)', borderColor: 'rgba(160,220,160,0.4)' });
    spawns.push({ concept: p.enemyConcepts[i % p.enemyConcepts.length] ?? 'island enemy', x: pos.x + islandWidth / 2, y: pos.y + 0.35, formation: 'cluster', count: 2 });
    if (i < count - 1) {
      objects.push({ id: oid('ib'), type: 'bridge', x: pos.x + islandWidth + 0.02 + (count === 3 ? 0.02 : 0.045), y: pos.y + 0.29, size: 0.04, label: p.bridgeLabel, color: '#8899bb' });
    }
  }
  return { id: p.roomId, name: p.roomName, shape: 'rectangle', objects, enemySpawns: spawns, ruleZones: zones, mathMotifs: p.mathMotifs, floorColor: p.floorColor };
}

export function makeMirrorReflectionChamber(p: MirrorReflectionParams): RoomDefinition {
  const objects: LevelObject[] = [
    { id: oid('mg'), type: 'gate', x: 0.5, y: 0.08, size: 0.07, label: 'Exit', color: '#70e080', glowColor: 'rgba(112,224,128,0.4)' },
  ];
  const zones: RuleZone[] = [];
  const spawns: EnemySpawnMarker[] = [];
  const count = Math.min(p.mirrorCount, 4);
  const mirrorPositions = [
    { x: 0.3, y: 0.35, rot: Math.PI / 4 }, { x: 0.7, y: 0.35, rot: -Math.PI / 4 },
    { x: 0.25, y: 0.65, rot: -Math.PI / 6 }, { x: 0.75, y: 0.65, rot: Math.PI / 6 },
  ];
  for (let i = 0; i < count; i++) {
    const mp = mirrorPositions[i];
    if (!mp) continue;
    objects.push({ id: oid('mir'), type: 'decorative', x: mp.x, y: mp.y, size: 0.06, label: '/', color: 'rgba(200,220,255,0.7)', glowColor: 'rgba(200,220,255,0.3)', rotation: mp.rot });
    zones.push({ id: oid('mz'), label: 'Reflected Zone', bounds: [mp.x - 0.12, mp.y - 0.1, 0.24, 0.2], shape: 'rect', color: 'rgba(200,220,255,0.06)', borderColor: 'rgba(200,220,255,0.25)' });
    spawns.push({ concept: p.enemyConcepts[i % p.enemyConcepts.length] ?? 'mirror enemy', x: mp.x + 0.1, y: mp.y + 0.1, formation: 'single', count: 1 });
  }
  return { id: p.roomId, name: p.roomName, shape: 'rectangle', objects, enemySpawns: spawns, ruleZones: zones, mathMotifs: p.mathMotifs, floorColor: p.floorColor };
}

export function makeFlowChamber(p: FlowChamberParams): RoomDefinition {
  const objects: LevelObject[] = [
    { id: oid('ff'), type: 'mote_fountain', x: 0.1, y: 0.5, size: 0.06, label: p.flowLabel, color: p.flowColor, glowColor: p.flowColor + '55' },
    { id: oid('fg'), type: 'gate', x: 0.9, y: 0.5, size: 0.07, label: 'Outlet', color: p.flowColor, glowColor: p.flowColor + '55' },
  ];
  const zones: RuleZone[] = [
    { id: oid('fl'), label: p.flowLabel, bounds: [0, 0.35, 1, 0.3], shape: 'rect', color: p.flowColor + '22', borderColor: p.flowColor + '66', ruleHook: 'flow_zone' },
  ];
  const spawns: EnemySpawnMarker[] = [
    { concept: p.enemyConcepts[0] ?? 'flow enemy', x: 0.3, y: 0.5, formation: 'pair', count: 2 },
    { concept: p.enemyConcepts[1] ?? 'flow enemy', x: 0.5, y: 0.5, formation: 'pair', count: 2 },
    { concept: p.enemyConcepts[2] ?? 'flow enemy', x: 0.7, y: 0.5, formation: 'single', count: 1 },
  ];
  return { id: p.roomId, name: p.roomName, shape: 'rectangle', objects, enemySpawns: spawns, ruleZones: zones, mathMotifs: p.mathMotifs, floorColor: p.floorColor };
}

export function makeRecursiveChamber(p: RecursiveChamberParams): RoomDefinition {
  const zones: RuleZone[] = [];
  const spawns: EnemySpawnMarker[] = [];
  const objects: LevelObject[] = [
    { id: oid('rc'), type: 'shrine', x: 0.5, y: 0.5, size: 0.06, label: p.patternLabel, color: '#c490ff', glowColor: 'rgba(196,144,255,0.4)' },
    { id: oid('rg'), type: 'gate', x: 0.5, y: 0.08, size: 0.07, label: 'Exit', color: '#70e080', glowColor: 'rgba(112,224,128,0.4)' },
  ];
  const depth = Math.min(p.nestingDepth, 4);
  for (let d = 0; d < depth; d++) {
    const margin = 0.08 + d * 0.1;
    zones.push({ id: oid('rn'), label: `Depth ${d + 1}`, bounds: [margin, margin, 1 - 2 * margin, 1 - 2 * margin], shape: 'rect', color: `rgba(196,144,255,${0.04 + d * 0.02})`, borderColor: `rgba(196,144,255,${0.2 + d * 0.1})` });
    if (d < p.enemyConcepts.length) {
      spawns.push({ concept: p.enemyConcepts[d] ?? 'recursive enemy', x: 0.5 + (d % 2 === 0 ? 0.2 - d * 0.05 : -(0.2 - d * 0.05)), y: 0.3 + d * 0.08, formation: 'single', count: 1 });
    }
  }
  return { id: p.roomId, name: p.roomName, shape: 'rectangle', objects, enemySpawns: spawns, ruleZones: zones, mathMotifs: p.mathMotifs, floorColor: p.floorColor };
}

export function makeBossArena(p: BossArenaParams): RoomDefinition {
  const objects: LevelObject[] = [
    { id: oid('ba'), type: 'boss_sigil', x: 0.5, y: 0.5, size: 0.12, label: p.bossLabel, color: p.bossColor, glowColor: p.bossColor + '55' },
    { id: oid('bp'), type: 'pillar', x: 0.35, y: 0.35, size: 0.04, color: p.bossColor + '88' },
    { id: oid('bp'), type: 'pillar', x: 0.65, y: 0.35, size: 0.04, color: p.bossColor + '88' },
    { id: oid('bp'), type: 'pillar', x: 0.35, y: 0.65, size: 0.04, color: p.bossColor + '88' },
    { id: oid('bp'), type: 'pillar', x: 0.65, y: 0.65, size: 0.04, color: p.bossColor + '88' },
  ];
  const phaseAnchors = [{ x: 0.5, y: 0.15 }, { x: 0.85, y: 0.5 }, { x: 0.5, y: 0.85 }, { x: 0.15, y: 0.5 }];
  for (let i = 0; i < Math.min(p.phaseCount, 4); i++) {
    const pos = phaseAnchors[i];
    if (!pos) continue;
    objects.push({ id: oid('ph'), type: 'shrine', x: pos.x, y: pos.y, size: 0.05, label: p.phaseLabels[i] ?? `Phase ${i + 1}`, color: p.bossColor, glowColor: p.bossColor + '44' });
  }
  const zones: RuleZone[] = [
    { id: oid('bz'), label: 'Danger Zone', bounds: [0.3, 0.3, 0.4, 0.4], shape: 'rect', color: 'rgba(255,80,80,0.1)', borderColor: 'rgba(255,80,80,0.4)', ruleHook: 'boss_hazard' },
  ];
  const spawns: EnemySpawnMarker[] = [
    { concept: p.enemyConcepts[0] ?? 'boss minion', x: 0.2, y: 0.2, formation: 'pair', count: 2 },
    { concept: p.enemyConcepts[1] ?? 'boss minion', x: 0.8, y: 0.2, formation: 'pair', count: 2 },
    { concept: p.enemyConcepts[2] ?? 'boss minion', x: 0.2, y: 0.8, formation: 'pair', count: 2 },
    { concept: p.enemyConcepts[3] ?? 'boss minion', x: 0.8, y: 0.8, formation: 'pair', count: 2 },
  ];
  return { id: p.roomId, name: p.roomName, shape: 'rectangle', objects, enemySpawns: spawns, ruleZones: zones, mathMotifs: p.mathMotifs, floorColor: p.floorColor, isBoss: true };
}
