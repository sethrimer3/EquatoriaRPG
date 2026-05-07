/**
 * renderLevelLayout.ts — Canvas renderer for top-down level layout rooms.
 *
 * Draws a RoomDefinition onto a 2D canvas context. No allocations happen
 * in the hot path — caller passes timeMs for animation.
 */

import type { RoomDefinition, LevelObject, EnemySpawnMarker, RuleZone } from '../types/levelTypes';

export function renderLevelLayout(
  ctx: CanvasRenderingContext2D,
  room: RoomDefinition,
  widthPx: number,
  heightPx: number,
  worldColor: string,
  timeMs: number,
): void {
  const pulse = 0.5 + 0.5 * Math.sin(timeMs * 0.002);

  ctx.save();

  // 1. Background
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, widthPx, heightPx);

  // 2. Floor color
  if (room.floorColor) {
    ctx.fillStyle = room.floorColor;
    ctx.fillRect(0, 0, widthPx, heightPx);
  }

  // 3. Room boundary (neon border)
  const bw = widthPx * 0.88;
  const bh = heightPx * 0.88;
  const bx = (widthPx - bw) / 2;
  const by = (heightPx - bh) / 2;
  ctx.shadowBlur = 18 + pulse * 8;
  ctx.shadowColor = worldColor;
  ctx.strokeStyle = worldColor;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.7;
  if (room.shape === 'circle' || room.shape === 'ring') {
    ctx.beginPath();
    ctx.arc(widthPx / 2, heightPx / 2, Math.min(bw, bh) / 2, 0, Math.PI * 2);
    ctx.stroke();
  } else if (room.shape === 'hexagon') {
    drawHexagon(ctx, widthPx / 2, heightPx / 2, Math.min(bw, bh) / 2);
    ctx.stroke();
  } else {
    ctx.strokeRect(bx, by, bw, bh);
  }
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.globalAlpha = 1;

  const toX = (nx: number): number => bx + nx * bw;
  const toY = (ny: number): number => by + ny * bh;
  const toSz = (ns: number): number => ns * Math.min(bw, bh);

  // 4. Rule zones
  for (const zone of room.ruleZones) {
    drawRuleZone(ctx, zone, toX, toY, toSz);
  }

  // 5. Math motifs (decorative corner text, semi-transparent)
  if (room.mathMotifs && room.mathMotifs.length > 0) {
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = worldColor;
    ctx.font = `bold ${Math.floor(toSz(0.055))}px 'Poiret One', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const motifPositions = [
      [0.1, 0.12], [0.9, 0.12], [0.1, 0.88], [0.9, 0.88], [0.5, 0.05],
    ];
    for (let i = 0; i < Math.min(room.mathMotifs.length, motifPositions.length); i++) {
      const pos = motifPositions[i];
      if (!pos) continue;
      ctx.fillText(room.mathMotifs[i] ?? '', toX(pos[0]!), toY(pos[1]!));
    }
    ctx.globalAlpha = 1;
  }

  // 6. Objects
  for (const obj of room.objects) {
    drawObject(ctx, obj, toX, toY, toSz, pulse, worldColor);
  }

  // 7. Enemy spawn markers
  for (const spawn of room.enemySpawns) {
    drawEnemySpawn(ctx, spawn, toX, toY, toSz, pulse);
  }

  // 8. Room name at top
  ctx.shadowBlur = 8;
  ctx.shadowColor = worldColor;
  ctx.fillStyle = '#e6e6ea';
  ctx.font = `bold ${Math.max(13, Math.floor(heightPx * 0.028))}px 'Poiret One', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.globalAlpha = 0.9;
  ctx.fillText(room.name, widthPx / 2, 6);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  ctx.restore();
}

function drawHexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawRuleZone(
  ctx: CanvasRenderingContext2D,
  zone: RuleZone,
  toX: (n: number) => number,
  toY: (n: number) => number,
  toSz: (n: number) => number,
): void {
  ctx.save();
  if (zone.shape === 'circle' && zone.bounds.length >= 3) {
    const cx = toX(zone.bounds[0]!);
    const cy = toY(zone.bounds[1]!);
    const r = toSz(zone.bounds[2]!);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = zone.color;
    ctx.fill();
    ctx.strokeStyle = zone.borderColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = zone.borderColor;
    ctx.font = `${Math.max(10, Math.floor(r * 0.35))}px 'Poiret One', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(zone.label, cx, cy);
  } else if (zone.bounds.length >= 4) {
    const x = toX(zone.bounds[0]!);
    const y = toY(zone.bounds[1]!);
    const w = toX(zone.bounds[0]! + zone.bounds[2]!) - x;
    const h = toY(zone.bounds[1]! + zone.bounds[3]!) - y;
    ctx.fillStyle = zone.color;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = zone.borderColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    const fontSize = Math.max(9, Math.floor(Math.min(w, h) * 0.16));
    ctx.fillStyle = zone.borderColor;
    ctx.font = `${fontSize}px 'Poiret One', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(zone.label, x + w / 2, y + h / 2);
  }
  ctx.restore();
}

function drawObject(
  ctx: CanvasRenderingContext2D,
  obj: LevelObject,
  toX: (n: number) => number,
  toY: (n: number) => number,
  toSz: (n: number) => number,
  pulse: number,
  worldColor: string,
): void {
  const cx = toX(obj.x);
  const cy = toY(obj.y);
  const r = toSz(obj.size);
  const color = obj.color ?? worldColor;
  const glow = obj.glowColor ?? (color + '44');
  ctx.save();
  switch (obj.type) {
    case 'shrine':
    case 'mote_fountain': {
      ctx.shadowBlur = 12 + pulse * 6;
      ctx.shadowColor = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = color + '44';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      if (obj.label) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = color;
        ctx.font = `bold ${Math.max(9, Math.floor(r * 0.7))}px 'Poiret One', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obj.label, cx, cy + r + Math.max(8, r * 0.8));
      }
      break;
    }
    case 'gate':
    case 'equation_gate': {
      const w = r * 2.2;
      const h = r * 1.2;
      ctx.shadowBlur = 10 + pulse * 5;
      ctx.shadowColor = glow;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
      ctx.fillStyle = color + '22';
      ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
      if (obj.label) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = color;
        ctx.font = `bold ${Math.max(8, Math.floor(h * 0.5))}px 'Poiret One', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obj.label, cx, cy);
      }
      break;
    }
    case 'pillar': {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      break;
    }
    case 'boss_sigil': {
      ctx.shadowBlur = 20 + pulse * 12;
      ctx.shadowColor = glow;
      const points = 6;
      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.45;
        const px = cx + Math.cos(angle) * rad;
        const py = cy + Math.sin(angle) * rad;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = color + '33';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      if (obj.label) {
        ctx.shadowBlur = 8;
        ctx.fillStyle = color;
        ctx.font = `bold ${Math.max(9, Math.floor(r * 0.55))}px 'Poiret One', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obj.label, cx, cy);
      }
      break;
    }
    case 'key_fragment': {
      ctx.shadowBlur = 8;
      ctx.shadowColor = glow;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.7, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r * 0.7, cy);
      ctx.closePath();
      ctx.fillStyle = color + '55';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      if (obj.label) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = color;
        ctx.font = `${Math.max(8, Math.floor(r * 0.6))}px 'Poiret One', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(obj.label, cx, cy + r + 2);
      }
      break;
    }
    case 'hazard_zone': {
      const hw = r * 3;
      const hh = r * 1.5;
      ctx.fillStyle = 'rgba(255,60,60,0.12)';
      ctx.fillRect(cx - hw / 2, cy - hh / 2, hw, hh);
      ctx.strokeStyle = 'rgba(255,60,60,0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(cx - hw / 2, cy - hh / 2, hw, hh);
      ctx.setLineDash([]);
      break;
    }
    case 'bridge':
    case 'platform': {
      ctx.fillStyle = color + '66';
      ctx.fillRect(cx - r * 1.5, cy - r * 0.4, r * 3, r * 0.8);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - r * 1.5, cy - r * 0.4, r * 3, r * 0.8);
      if (obj.label) {
        ctx.fillStyle = color;
        ctx.font = `${Math.max(8, Math.floor(r * 0.7))}px 'Poiret One', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obj.label, cx, cy);
      }
      break;
    }
    case 'treasure': {
      ctx.shadowBlur = 8;
      ctx.shadowColor = glow;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.45;
        const px = cx + Math.cos(angle) * rad;
        const py = cy + Math.sin(angle) * rad;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = color + '55';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      break;
    }
    case 'decorative': {
      if (obj.rotation !== undefined && obj.rotation !== 0) {
        ctx.translate(cx, cy);
        ctx.rotate(obj.rotation);
        ctx.translate(-cx, -cy);
      }
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.65;
      ctx.font = `bold ${Math.max(10, Math.floor(r * 1.4))}px 'Poiret One', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(obj.label ?? '?', cx, cy);
      ctx.globalAlpha = 1;
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

function drawEnemySpawn(
  ctx: CanvasRenderingContext2D,
  spawn: EnemySpawnMarker,
  toX: (n: number) => number,
  toY: (n: number) => number,
  toSz: (n: number) => number,
  pulse: number,
): void {
  const cx = toX(spawn.x);
  const cy = toY(spawn.y);
  const r = toSz(0.038);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + pulse * 4, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,100,100,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,80,80,0.18)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,100,100,0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#ffaaaa';
  const fontSize = Math.max(7, Math.floor(r * 0.65));
  ctx.font = `${fontSize}px 'Poiret One', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const label = spawn.concept.length > 16 ? spawn.concept.slice(0, 14) + '…' : spawn.concept;
  ctx.fillText(label, cx, cy + r + 2);
  ctx.restore();
}
