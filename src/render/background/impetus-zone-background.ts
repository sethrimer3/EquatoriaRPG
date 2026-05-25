type Vec2 = { x: number; y: number };

type StarfieldCanvasType = HTMLCanvasElement | OffscreenCanvas;
type Starfield2DContextType = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

type ReworkedStarData = {
  x: number;
  y: number;
  sizePx: number;
  haloScale: number;
  brightness: number;
  colorRgb: [number, number, number];
  flickerHz: number;
  phase: number;
  hasChromaticAberration: boolean;
  colorIndex: number;
};

type ReworkedStarLayer = {
  stars: ReworkedStarData[];
  parallaxFactor: number;
};

const STAR_WRAP_SIZE = 8000;

/**
 * 2D value noise function using smoothstep interpolation.
 */
function valueNoise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const smooth = (v: number): number => v * v * (3 - 2 * v);
  const hash = (hx: number, hy: number): number => {
    let n = hx * 374761393 + hy * 668265263;
    n = (n ^ (n >> 13)) * 1274126177;
    n ^= n >> 16;
    return (n >>> 0) / 4294967295;
  };
  const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

  const v00 = hash(ix, iy);
  const v10 = hash(ix + 1, iy);
  const v01 = hash(ix, iy + 1);
  const v11 = hash(ix + 1, iy + 1);
  const ux = smooth(fx);
  const uy = smooth(fy);

  return lerp(lerp(v00, v10, ux), lerp(v01, v11, ux), uy);
}

/**
 * Fractal (multi-octave) 2D noise using value noise.
 */
function fractalNoise2D(x: number, y: number, octaves: number): number {
  let amplitude = 0.5;
  let frequency = 1;
  let value = 0;
  let norm = 0;

  for (let i = 0; i < octaves; i++) {
    value += valueNoise2D(x * frequency, y * frequency) * amplitude;
    norm += amplitude;
    frequency *= 2;
    amplitude *= 0.5;
  }

  return value / Math.max(0.0001, norm);
}

class StarfieldRenderer {
  private readonly cinematicOrangePaletteRgb: Array<[number, number, number]> = [
    [255, 178, 26],
    [255, 191, 104],
    [249, 216, 162],
    [255, 235, 198],
    [255, 246, 228],
    [241, 245, 251],
    [232, 239, 255],
  ];

  private readonly reworkedStarCacheRefreshIntervalMs: Record<'low' | 'medium' | 'high' | 'ultra', number> = {
    low: 200,
    medium: 100,
    high: 50,
    ultra: 16,
  };

  private reworkedParallaxStarLayers: ReworkedStarLayer[] = [];
  private readonly reworkedStarCoreCacheByPalette: StarfieldCanvasType[];
  private readonly reworkedStarHaloCacheByPalette: StarfieldCanvasType[];
  private reworkedStarCacheCanvas: StarfieldCanvasType | null = null;
  private reworkedStarCacheCtx: Starfield2DContextType | null = null;
  private reworkedStarCacheWidthPx = 0;
  private reworkedStarCacheHeightPx = 0;
  private reworkedStarCacheCameraX = Number.NaN;
  private reworkedStarCacheCameraY = Number.NaN;
  private reworkedStarCacheQuality: 'low' | 'medium' | 'high' | 'ultra' | '' = '';
  private reworkedStarCacheLastRefreshMs = 0;

  constructor(
    private readonly canvasFactory: (widthPx: number, heightPx: number) => StarfieldCanvasType =
      (widthPx, heightPx) => {
        const canvas = document.createElement('canvas');
        canvas.width = widthPx;
        canvas.height = heightPx;
        return canvas;
      },
  ) {
    this.reworkedStarCoreCacheByPalette = this.createReworkedStarCoreCacheByPalette();
    this.reworkedStarHaloCacheByPalette = this.createReworkedStarHaloCacheByPalette();
    this.initializeReworkedParallaxStarLayers();
  }

  private initializeReworkedParallaxStarLayers(): void {
    let seed = 7331;
    const seededRandom = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    const layerConfigs = [
      { count: 1300, parallaxFactor: 0.12, sizeMinPx: 0.65, sizeMaxPx: 1.6 },
      { count: 1000, parallaxFactor: 0.17, sizeMinPx: 0.72, sizeMaxPx: 1.85 },
      { count: 850, parallaxFactor: 0.22, sizeMinPx: 0.8, sizeMaxPx: 2.1 },
      { count: 650, parallaxFactor: 0.27, sizeMinPx: 0.9, sizeMaxPx: 2.3 },
      { count: 450, parallaxFactor: 0.32, sizeMinPx: 1.0, sizeMaxPx: 2.55 },
      { count: 300, parallaxFactor: 0.38, sizeMinPx: 1.12, sizeMaxPx: 2.8 },
      { count: 180, parallaxFactor: 0.45, sizeMinPx: 1.26, sizeMaxPx: 3.05 },
      { count: 110, parallaxFactor: 0.53, sizeMinPx: 1.4, sizeMaxPx: 3.3 },
    ];

    const noiseScale = 0.0042;

    for (const layerConfig of layerConfigs) {
      const stars: ReworkedStarData[] = [];

      for (let i = 0; i < layerConfig.count; i++) {
        const x = seededRandom() * STAR_WRAP_SIZE - STAR_WRAP_SIZE / 2;
        const y = seededRandom() * STAR_WRAP_SIZE - STAR_WRAP_SIZE / 2;
        const clusterNoise = fractalNoise2D((x + STAR_WRAP_SIZE * 0.5) * noiseScale, (y + STAR_WRAP_SIZE * 0.5) * noiseScale, 4);
        const sizePx = layerConfig.sizeMinPx + seededRandom() * (layerConfig.sizeMaxPx - layerConfig.sizeMinPx);
        const brightness = (0.48 + seededRandom() * 0.5) * (0.85 + clusterNoise * 0.3);
        const colorIndex = this.sampleReworkedParallaxPaletteIndex(seededRandom());

        stars.push({
          x,
          y,
          sizePx,
          haloScale: 3.6 + seededRandom() * 2.4,
          brightness,
          colorRgb: this.cinematicOrangePaletteRgb[colorIndex],
          colorIndex,
          flickerHz: 0.08 + seededRandom() * 0.1,
          phase: seededRandom() * Math.PI * 2,
          hasChromaticAberration: sizePx > 2.05 && brightness > 0.8 && seededRandom() > 0.45,
        });
      }

      this.reworkedParallaxStarLayers.push({
        stars,
        parallaxFactor: layerConfig.parallaxFactor,
      });
    }
  }

  private sampleReworkedParallaxPaletteIndex(randomSample: number): number {
    if (randomSample < 0.2) return 0;
    if (randomSample < 0.36) return 1;
    if (randomSample < 0.52) return 2;
    if (randomSample < 0.68) return 3;
    if (randomSample < 0.82) return 4;
    if (randomSample < 0.92) return 5;
    return 6;
  }

  private createReworkedStarCoreCacheByPalette(): StarfieldCanvasType[] {
    return this.cinematicOrangePaletteRgb.map((colorRgb) => this.createStarCoreCacheCanvas(colorRgb));
  }

  private createReworkedStarHaloCacheByPalette(): StarfieldCanvasType[] {
    return this.cinematicOrangePaletteRgb.map((colorRgb) => this.createStarHaloCacheCanvas(colorRgb));
  }

  public drawReworkedParallaxStars(
    ctx: Starfield2DContextType,
    parallaxCamera: Vec2,
    screenWidth: number,
    screenHeight: number,
    graphicsQuality: 'low' | 'medium' | 'high' | 'ultra',
  ): void {
    if (!this.reworkedStarCacheCanvas) {
      this.reworkedStarCacheCanvas = this.canvasFactory(screenWidth, screenHeight);
      this.reworkedStarCacheCtx = this.reworkedStarCacheCanvas.getContext('2d');
    }

    if (!this.reworkedStarCacheCanvas || !this.reworkedStarCacheCtx) return;

    const shouldRenderStarChromaticAberration = graphicsQuality === 'high' || graphicsQuality === 'ultra';
    const centerX = screenWidth * 0.5;
    const centerY = screenHeight * 0.5;
    const wrapSpanX = centerX * 2 + STAR_WRAP_SIZE;
    const wrapSpanY = centerY * 2 + STAR_WRAP_SIZE;
    const cameraX = parallaxCamera.x;
    const cameraY = parallaxCamera.y;
    const nowMs = performance.now();
    const nowSeconds = nowMs * 0.001;
    const dimensionsChanged = this.reworkedStarCacheWidthPx !== screenWidth || this.reworkedStarCacheHeightPx !== screenHeight;

    if (dimensionsChanged) {
      this.reworkedStarCacheCanvas.width = screenWidth;
      this.reworkedStarCacheCanvas.height = screenHeight;
      this.reworkedStarCacheWidthPx = screenWidth;
      this.reworkedStarCacheHeightPx = screenHeight;
    }

    const cameraChanged = cameraX !== this.reworkedStarCacheCameraX || cameraY !== this.reworkedStarCacheCameraY;
    const qualityChanged = graphicsQuality !== this.reworkedStarCacheQuality;
    const refreshIntervalMs = this.reworkedStarCacheRefreshIntervalMs[graphicsQuality];
    const refreshIntervalElapsed = nowMs - this.reworkedStarCacheLastRefreshMs >= refreshIntervalMs;
    const shouldRefresh = dimensionsChanged || cameraChanged || qualityChanged || refreshIntervalElapsed;

    if (shouldRefresh) {
      const cacheCtx = this.reworkedStarCacheCtx;
      cacheCtx.globalCompositeOperation = 'source-over';
      cacheCtx.clearRect(0, 0, screenWidth, screenHeight);
      cacheCtx.save();
      cacheCtx.globalCompositeOperation = 'lighter';

      for (const layer of this.reworkedParallaxStarLayers) {
        const parallaxX = cameraX * layer.parallaxFactor;
        const parallaxY = cameraY * layer.parallaxFactor;
        const depthScale = Math.min(1, 0.48 + layer.parallaxFactor * 1.08);
        const depthAlpha = 0.5 + depthScale * 0.5;
        const depthSizeMultiplier = 0.84 + depthScale * 0.62;
        const haloAlphaMultiplier = 0.56 + depthScale * 0.44;

        for (const star of layer.stars) {
          const screenX = centerX + (star.x - parallaxX);
          const screenY = centerY + (star.y - parallaxY);
          const wrappedX = ((screenX + centerX) % wrapSpanX) - centerX;
          const wrappedY = ((screenY + centerY) % wrapSpanY) - centerY;
          if (wrappedX < -140 || wrappedX > screenWidth + 140 || wrappedY < -140 || wrappedY > screenHeight + 140) continue;

          const flicker = 1 + 0.03 * Math.sin(star.phase + nowSeconds * Math.PI * 2 * star.flickerHz);
          const alpha = star.brightness * flicker * depthAlpha;
          const renderedSizePx = star.sizePx * depthSizeMultiplier;
          const cacheIndex = star.colorIndex;

          const haloRadiusPx = renderedSizePx * star.haloScale;
          cacheCtx.globalAlpha = alpha * haloAlphaMultiplier;
          cacheCtx.drawImage(
            this.reworkedStarHaloCacheByPalette[cacheIndex],
            wrappedX - haloRadiusPx,
            wrappedY - haloRadiusPx,
            haloRadiusPx * 2,
            haloRadiusPx * 2,
          );

          const coreRadiusPx = renderedSizePx * 0.95;
          cacheCtx.globalAlpha = alpha;
          cacheCtx.drawImage(
            this.reworkedStarCoreCacheByPalette[cacheIndex],
            wrappedX - coreRadiusPx,
            wrappedY - coreRadiusPx,
            coreRadiusPx * 2,
            coreRadiusPx * 2,
          );

          if (star.hasChromaticAberration && shouldRenderStarChromaticAberration) {
            this.renderStarChromaticAberration(cacheCtx, wrappedX, wrappedY, renderedSizePx, alpha * 0.17, star.colorRgb);
          }
        }
      }

      cacheCtx.restore();
      cacheCtx.filter = 'none';
      cacheCtx.globalAlpha = 1;
      cacheCtx.globalCompositeOperation = 'source-over';
      this.reworkedStarCacheCameraX = cameraX;
      this.reworkedStarCacheCameraY = cameraY;
      this.reworkedStarCacheQuality = graphicsQuality;
      this.reworkedStarCacheLastRefreshMs = nowMs;
    }

    ctx.drawImage(this.reworkedStarCacheCanvas, 0, 0, screenWidth, screenHeight);
    ctx.globalAlpha = 1;
  }

  private createStarCoreCacheCanvas(colorRgb: [number, number, number]): StarfieldCanvasType {
    const cacheCanvas = this.canvasFactory(64, 64);
    const cacheContext = cacheCanvas.getContext('2d');
    if (!cacheContext) return cacheCanvas;

    const centerPx = cacheCanvas.width * 0.5;
    const coreGradient = cacheContext.createRadialGradient(centerPx, centerPx, 0, centerPx, centerPx, centerPx);
    coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    coreGradient.addColorStop(0.18, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.95)`);
    coreGradient.addColorStop(0.5, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.44)`);
    coreGradient.addColorStop(1, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0)`);

    cacheContext.fillStyle = coreGradient;
    cacheContext.beginPath();
    cacheContext.arc(centerPx, centerPx, centerPx, 0, Math.PI * 2);
    cacheContext.fill();
    return cacheCanvas;
  }

  private createStarHaloCacheCanvas(colorRgb: [number, number, number]): StarfieldCanvasType {
    const cacheCanvas = this.canvasFactory(96, 96);
    const cacheContext = cacheCanvas.getContext('2d');
    if (!cacheContext) return cacheCanvas;

    const centerPx = cacheCanvas.width * 0.5;
    const haloGradient = cacheContext.createRadialGradient(centerPx, centerPx, 0, centerPx, centerPx, centerPx);
    haloGradient.addColorStop(0, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.36)`);
    haloGradient.addColorStop(0.3, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.18)`);
    haloGradient.addColorStop(0.75, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.05)`);
    haloGradient.addColorStop(1, `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0)`);

    cacheContext.fillStyle = haloGradient;
    cacheContext.beginPath();
    cacheContext.arc(centerPx, centerPx, centerPx, 0, Math.PI * 2);
    cacheContext.fill();
    return cacheCanvas;
  }

  private renderStarChromaticAberration(
    ctx: Starfield2DContextType,
    x: number,
    y: number,
    sizePx: number,
    alpha: number,
    colorRgb: [number, number, number],
  ): void {
    const offsetPx = Math.min(0.45, sizePx * 0.1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgba(${Math.min(255, colorRgb[0] + 20)}, 92, 92, 0.65)`;
    ctx.beginPath();
    ctx.arc(x - offsetPx, y, sizePx * 0.34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(118, ${Math.min(255, colorRgb[1] + 16)}, 255, 0.62)`;
    ctx.beginPath();
    ctx.arc(x + offsetPx, y, sizePx * 0.34, 0, Math.PI * 2);
    ctx.fill();
  }
}

interface ImpetusGravitySource {
  x: number;
  y: number;
  radiusPx: number;
  r: number;
  g: number;
  b: number;
}

interface ImpetusGridContext {
  ctx: CanvasRenderingContext2D;
  widthPx: number;
  heightPx: number;
  /** camera center in world space */
  camera: Vec2;
  zoom: number;
  /** Convert world pos to screen coords */
  worldToScreen(world: Vec2): Vec2;
  graphicsQuality: 'low' | 'medium' | 'high' | 'ultra';
}

interface InternalGravitySource {
  worldX: number;
  worldY: number;
  influenceRadiusWorld: number;
  influenceRadiusSq: number;
  invInfluenceRadius: number;
  maxDisplacementWorld: number;
}

const GRID_SPACING_WORLD_PX = 14;
const GRID_SPACING_HIGH_PX = 18;
const GRID_SPACING_MEDIUM_PX = 28;
const MAX_EXTRA_OPACITY = 0.25;
const MAX_DISPLACEMENT_CAP_PX = 20;
const REF_DISP_PX = 12;
const SOLAR_MIRROR_COLLISION_RADIUS_PX = 20;
const SOURCE_INFLUENCE_MULTIPLIER = 4;
const SOURCE_DISPLACEMENT_MULTIPLIER = 0.25;
const LINE_WIDTH_SCALE = 0.8;
const ALPHA_LEVELS = 32;
const BASE_R = 255;
const BASE_G = 220;
const BASE_B = 180;

function buildColorLut(): string[] {
  const lut: string[] = new Array(ALPHA_LEVELS);
  for (let i = 0; i < ALPHA_LEVELS; i++) {
    const t = i / (ALPHA_LEVELS - 1);
    const alpha = t * MAX_EXTRA_OPACITY;
    lut[i] = `rgba(${BASE_R},${BASE_G},${BASE_B},${alpha.toFixed(3)})`;
  }
  return lut;
}

const COLOR_LUT = buildColorLut();

class ImpetusGravityGridRenderer {
  private readonly _sources: InternalGravitySource[] = [];
  private readonly _viewSources: InternalGravitySource[] = [];
  private readonly _dispResult = { dispWorldX: 0, dispWorldY: 0, stretch: 0 };
  private readonly _lineVerticesX: number[] = [];
  private readonly _lineVerticesY: number[] = [];
  private readonly _lineAlphaIdx: number[] = [];

  public drawImpetusGravityGrid(sources: ImpetusGravitySource[], context: ImpetusGridContext): void {
    const { ctx, widthPx, heightPx, zoom, graphicsQuality } = context;
    if (graphicsQuality === 'low') return;

    this._collectRpgSources(sources);
    if (this._sources.length === 0) return;

    const spacing = graphicsQuality === 'medium'
      ? GRID_SPACING_MEDIUM_PX
      : graphicsQuality === 'high'
        ? GRID_SPACING_HIGH_PX
        : GRID_SPACING_WORLD_PX;

    const halfW = widthPx / (2 * zoom);
    const halfH = heightPx / (2 * zoom);
    const camX = context.camera.x;
    const camY = context.camera.y;

    const margin = spacing * 1.5;
    const worldMinX = camX - halfW - margin;
    const worldMaxX = camX + halfW + margin;
    const worldMinY = camY - halfH - margin;
    const worldMaxY = camY + halfH + margin;

    this._filterSourcesToViewport(worldMinX, worldMaxX, worldMinY, worldMaxY);
    if (this._viewSources.length === 0) return;

    const startGridX = Math.floor(worldMinX / spacing) * spacing;
    const endGridX = Math.ceil(worldMaxX / spacing) * spacing;
    const startGridY = Math.floor(worldMinY / spacing) * spacing;
    const endGridY = Math.ceil(worldMaxY / spacing) * spacing;

    ctx.save();
    ctx.lineWidth = Math.max(1, zoom * LINE_WIDTH_SCALE);
    ctx.lineCap = 'butt';
    this._drawLines(context, startGridX, endGridX, startGridY, endGridY, true, spacing);
    this._drawLines(context, startGridX, endGridX, startGridY, endGridY, false, spacing);
    ctx.restore();
  }

  private _collectRpgSources(sources: ImpetusGravitySource[]): void {
    const out = this._sources;
    out.length = 0;
    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      this._pushSource(src.x, src.y, src.radiusPx > 0 ? src.radiusPx : SOLAR_MIRROR_COLLISION_RADIUS_PX);
    }
  }

  private _pushSource(worldX: number, worldY: number, radiusPx: number): void {
    const influenceRadiusWorld = radiusPx * SOURCE_INFLUENCE_MULTIPLIER;
    const maxDisplacementWorld = radiusPx * SOURCE_DISPLACEMENT_MULTIPLIER;
    this._sources.push({
      worldX,
      worldY,
      influenceRadiusWorld,
      influenceRadiusSq: influenceRadiusWorld * influenceRadiusWorld,
      invInfluenceRadius: 1 / influenceRadiusWorld,
      maxDisplacementWorld,
    });
  }

  private _filterSourcesToViewport(minX: number, maxX: number, minY: number, maxY: number): void {
    const out = this._viewSources;
    out.length = 0;
    for (let i = 0; i < this._sources.length; i++) {
      const src = this._sources[i];
      const r = src.influenceRadiusWorld;
      if (src.worldX + r < minX || src.worldX - r > maxX) continue;
      if (src.worldY + r < minY || src.worldY - r > maxY) continue;
      out.push(src);
    }
  }

  private _drawLines(
    context: ImpetusGridContext,
    startGridX: number,
    endGridX: number,
    startGridY: number,
    endGridY: number,
    isVertical: boolean,
    spacing: number,
  ): void {
    const { ctx } = context;
    const sources = this._viewSources;
    const outerStart = isVertical ? startGridX : startGridY;
    const outerEnd = isVertical ? endGridX : endGridY;
    const innerStart = isVertical ? startGridY : startGridX;
    const innerEnd = isVertical ? endGridY : endGridX;

    for (let outer = outerStart; outer <= outerEnd; outer += spacing) {
      let hasNearby = false;
      for (let s = 0; s < sources.length; s++) {
        const src = sources[s];
        const perpDist = isVertical ? Math.abs(src.worldX - outer) : Math.abs(src.worldY - outer);
        if (perpDist < src.influenceRadiusWorld) {
          hasNearby = true;
          break;
        }
      }
      if (!hasNearby) continue;

      const vx = this._lineVerticesX;
      const vy = this._lineVerticesY;
      const va = this._lineAlphaIdx;
      vx.length = 0;
      vy.length = 0;
      va.length = 0;

      for (let inner = innerStart; inner <= innerEnd; inner += spacing) {
        const worldX = isVertical ? outer : inner;
        const worldY = isVertical ? inner : outer;
        this._displace(worldX, worldY);
        const stretch = this._dispResult.stretch;

        if (stretch < 0.001) {
          vx.push(NaN);
          vy.push(NaN);
          va.push(-1);
          continue;
        }

        const t = stretch * stretch * (3 - 2 * stretch);
        const alphaIdx = Math.min(ALPHA_LEVELS - 1, (t * (ALPHA_LEVELS - 1) + 0.5) | 0);
        const screen = context.worldToScreen({ x: this._dispResult.dispWorldX, y: this._dispResult.dispWorldY });

        vx.push(screen.x);
        vy.push(screen.y);
        va.push(alphaIdx);
      }

      const count = vx.length;
      if (count < 2) continue;

      let inBatch = false;
      let batchAlpha = -1;

      for (let i = 0; i < count; i++) {
        const curX = vx[i];
        const curA = va[i];
        if (curA < 0) {
          if (inBatch) {
            ctx.stroke();
            inBatch = false;
          }
          continue;
        }

        if (!inBatch) {
          batchAlpha = curA;
          ctx.strokeStyle = COLOR_LUT[curA];
          ctx.beginPath();
          ctx.moveTo(curX, vy[i]);
          inBatch = true;
        } else if (curA !== batchAlpha) {
          ctx.stroke();
          batchAlpha = curA;
          ctx.strokeStyle = COLOR_LUT[curA];
          ctx.beginPath();
          ctx.moveTo(vx[i - 1], vy[i - 1]);
          ctx.lineTo(curX, vy[i]);
        } else {
          ctx.lineTo(curX, vy[i]);
        }
      }

      if (inBatch) ctx.stroke();
    }
  }

  private _displace(worldX: number, worldY: number): void {
    let dx = 0;
    let dy = 0;

    for (let i = 0; i < this._viewSources.length; i++) {
      const src = this._viewSources[i];
      const ddx = src.worldX - worldX;
      const ddy = src.worldY - worldY;
      const distSq = ddx * ddx + ddy * ddy;
      if (distSq >= src.influenceRadiusSq) continue;

      const dist = Math.sqrt(distSq);
      const t = 1 - dist * src.invInfluenceRadius;
      const falloff = t * t * t;
      const strength = (falloff * src.maxDisplacementWorld) / (dist + 0.1);
      dx += ddx * strength;
      dy += ddy * strength;
    }

    const dispMagSq = dx * dx + dy * dy;
    if (dispMagSq > MAX_DISPLACEMENT_CAP_PX * MAX_DISPLACEMENT_CAP_PX) {
      const scale = MAX_DISPLACEMENT_CAP_PX / Math.sqrt(dispMagSq);
      dx *= scale;
      dy *= scale;
    }

    const dispMag = Math.sqrt(dx * dx + dy * dy);
    this._dispResult.dispWorldX = worldX + dx;
    this._dispResult.dispWorldY = worldY + dy;
    this._dispResult.stretch = Math.min(1, dispMag / REF_DISP_PX);
  }
}

export interface ImpetusZoneBackground {
  /** Call every frame. Renders starfield + gravity grid onto ctx. */
  draw(
    ctx: CanvasRenderingContext2D,
    widthPx: number,
    heightPx: number,
    cameraX: number,
    cameraY: number,
    zoom: number,
    worldToScreen: (world: { x: number; y: number }) => { x: number; y: number },
    gravitySources: ImpetusGravitySource[],
    graphicsQuality: 'low' | 'medium' | 'high' | 'ultra',
    nowMs: number,
  ): void;
  /** Call when canvas is resized. */
  resize(widthPx: number, heightPx: number): void;
}

export function createImpetusZoneBackground(): ImpetusZoneBackground {
  const starfieldRenderer = new StarfieldRenderer();
  const gravityGridRenderer = new ImpetusGravityGridRenderer();

  return {
    draw(
      ctx,
      widthPx,
      heightPx,
      cameraX,
      cameraY,
      zoom,
      worldToScreen,
      gravitySources,
      graphicsQuality,
      nowMs,
    ): void {
      void nowMs;
      const gradient = ctx.createLinearGradient(0, 0, 0, heightPx);
      gradient.addColorStop(0, 'rgba(4,6,18,1)');
      gradient.addColorStop(1, 'rgba(8,4,22,1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, widthPx, heightPx);

      starfieldRenderer.drawReworkedParallaxStars(
        ctx,
        { x: cameraX, y: cameraY },
        widthPx,
        heightPx,
        graphicsQuality,
      );

      gravityGridRenderer.drawImpetusGravityGrid(gravitySources, {
        ctx,
        widthPx,
        heightPx,
        camera: { x: cameraX, y: cameraY },
        zoom,
        worldToScreen,
        graphicsQuality,
      });
    },
    resize(widthPx: number, heightPx: number): void {
      void widthPx;
      void heightPx;
    },
  };
}

export type { ImpetusGravitySource, ImpetusGridContext };
export { StarfieldRenderer };
export { ImpetusGravityGridRenderer };
