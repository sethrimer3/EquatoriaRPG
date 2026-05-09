# Equatoria Idle — Manual Test Checklist

## Tap Responsiveness
- [ ] Tapping the canvas area generates motes (score increases)
- [ ] Tap produces visible particle burst at pointer location
- [ ] Tap flash overlay fades smoothly
- [ ] Rapid tapping does not cause lag or missed inputs
- [ ] Touch input works on mobile devices

## Equation Rendering
- [ ] Equation displays "E = 1" initially (one red tier)
- [ ] Equation values update when tier upgrades are purchased
- [ ] All unlocked tier segments display with correct colours
- [ ] Equation remains readable as more tiers unlock
- [ ] Multi-line wrap works when equation gets long

## Portrait and Landscape Layout
- [ ] Portrait: canvas on top, panels below, tabs at bottom
- [ ] Landscape: canvas on left, panels on right, tabs at bottom
- [ ] No layout breakage when rotating device
- [ ] Tab bar remains accessible in both orientations

## Tab Switching
- [ ] Tapping "Equation" tab shows upgrade panel
- [ ] Tapping "Upgrades" tab shows resource panel
- [ ] Tapping "Settings" tab shows settings panel
- [ ] Active tab is visually highlighted
- [ ] Tab state persists across panel scrolling

## Settings Persistence
- [ ] SFX and Music volume sliders move and save
- [ ] Reduced Particles toggle saves
- [ ] Screen Shake toggle saves
- [ ] Number Format dropdown changes and saves (Letters / Scientific / Engineering)
- [ ] Settings survive page reload

## Particle Performance
- [ ] Particles render smoothly at 60fps on desktop
- [ ] Particles render acceptably on mobile
- [ ] Particle trails display correctly
- [ ] Particles wrap around canvas edges (toroidal)
- [ ] Particles fade out over their lifetime
- [ ] Reduced Particles setting decreases particle count

## Particle Life Behaviour
- [ ] Different mote types visibly behave differently (some chase, some repel)
- [ ] 1×1 motes drift inertly without interacting
- [ ] 2×2+ motes interact normally with visible emergent motion
- [ ] Short-range collapse prevention works (motes don't collapse into singularities)
- [ ] Mote swarms, streams, and orbiting structures form naturally
- [ ] Size-force bias makes larger motes feel stronger (when enabled)
- [ ] Disabling size-force bias makes all sizes behave identically
- [ ] Debug toggles work when activated (interaction radius, grid, inert highlights)

## Upgrade Purchasing
- [ ] Upgrade buttons show correct cost and level
- [ ] Clicking an affordable upgrade purchases it (cost deducted, level incremented)
- [ ] Clicking an unaffordable upgrade does nothing (button appears disabled)
- [ ] Per-tier upgrade buttons appear only for unlocked tiers
- [ ] Auto-Tap upgrade enables automatic tapping
- [ ] Global Multiplier upgrade increases mote income
- [ ] Maxed upgrades show "MAX" label

## Tier Unlocking
- [ ] "Unlock <Next Tier>" button appears with correct cost
- [ ] Purchasing unlock reveals new tier colour in equation
- [ ] Corresponding tier upgrade buttons appear
- [ ] Secret tiers (prismatic, void) are not shown in normal unlock flow

## Late-Game Scaling
- [ ] Numbers display correctly in Letters mode (K/M/B/T suffixes)
- [ ] Numbers display correctly in Scientific mode (1.23e9)
- [ ] Numbers display correctly in Engineering mode (1.23×10⁹)
- [ ] Number format setting applies to all panels: Looms, Resources, Tiers, Achievements, Equation
- [ ] Canvas Equivalence and on-screen mote count respect the format setting
- [ ] Number formatting is consistent across UI
- [ ] No NaN or Infinity displayed

## Save/Load
- [ ] Game auto-saves periodically
- [ ] Manual save via Settings works
- [ ] Progress survives page reload
- [ ] Reset game clears all progress
- [ ] Reset game starts fresh state

## Desktop Mouse Support
- [ ] Mouse click on canvas triggers tap
- [ ] Mouse click on buttons triggers actions
- [ ] No hover-only interactions required

## Mobile Touch Support
- [ ] Touch on canvas triggers tap
- [ ] Touch on buttons triggers actions
- [ ] Buttons are large enough to tap comfortably (44px+ touch targets)
- [ ] No accidental zoom or scroll on double-tap

## RPG Combat
- [ ] Low graphics mode removes visible RPG weapon, projectile, enemy, player-movement, and boss glows/trails while preserving readable bodies and bars
- [ ] Sapphire Ships persist while equipped, one ship per weapon tier
- [ ] Sapphire Ships move toward the nearest enemy, orbit it, and fire small curving blue lasers
- [ ] Sapphire Ships shoot enemies in range while moving toward their orbit target
- [ ] Amethyst Ships persist while equipped, one ship per weapon tier
- [ ] Amethyst Ships choose the furthest enemies from the player, spread across targets first, and share targets evenly when ships outnumber enemies
- [ ] Amethyst lasers fire slowly, spiral inward, pierce non-target enemies, and end on the intended target
- [ ] The RPG stats panel no longer shows the old `WEAPON:` text
- [ ] The right-side RPG stats widget shows one DPS row per equipped weapon with three-letter color abbreviations and colored bars
- [ ] The DPS widget shows low/high axis labels that move with the sampled 10 second DPS range
- [ ] DPS bars update smoothly over a rolling 10 second damage window

## Charge Attack (Space / F / Mobile Button)
- [ ] Holding Space or F key builds up a charge (arc ring grows around player)
- [ ] At full charge the arc ring is complete and "CHARGED!" text appears
- [ ] Releasing the key fires a boosted shot visible as a brighter projectile
- [ ] Charge damage scales from 1× (minimal hold) to 3× ATK (full hold)
- [ ] Releasing before CHARGE_MIN_MS threshold discards the charge (no shot)
- [ ] `onChargeReady` SFX plays when meter reaches 100%
- [ ] `onChargeRelease` SFX plays when charged shot fires
- [ ] Charge resets on player death
- [ ] `[Space/F] Charge shot` canvas hint appears for the first 3 waves then disappears
- [ ] On mobile (touch device): `⚡` button is visible in bottom-right of the RPG arena
- [ ] Holding mobile `⚡` button builds charge; releasing fires the charged shot
- [ ] Mobile `⚡` button is hidden on desktop (pointer:fine screens)

## Campaign Level Completion Flow
- [ ] After clearing enough waves (3 for standard, 5 for boss), level-complete banner appears
- [ ] "🗺 Return to Map" button appears and navigates back to the world map
- [ ] The button is hidden when a new level starts or on map return
- [ ] Completing a level that unlocks a new world shows a pulsing gold ring + "NEW!" on the map node

## World Map UX
- [ ] Hovering over a world node shows a tooltip with world name, chapter, and unlock state
- [ ] Tooltip disappears when mouse leaves the canvas
- [ ] Tooltip does not overflow beyond the canvas right edge
- [ ] Level progress dots appear below world names showing completion per mandatory level
- [ ] Boss-level dot is larger than standard dots
- [ ] FPS auto-quality reduces particle quality after sustained < 30 FPS
- [ ] Reduced quality is persisted to settings (survives reload)
- [ ] FPS auto-quality restores particle quality after sustained > 50 FPS

## Per-World Enemy Composition
- [ ] Playing Origin Nexus: only laser/quartz enemies; no heavy enemies (void, iolite, etc.)
- [ ] Playing Arithmetic Sands: ruby and sunstone enemies appear more often; no emerald/fracteryl
- [ ] Playing Fraction Fen: quartz and sapphire are dominant; no void enemies
- [ ] Playing Calculus Falls: iolite beams and void enemies are prominent
- [ ] Playing Eigen Citadel: eigenstein and alivened swarm enemies dominate

## Tutorial Banners
- [ ] First time encountering an "exact" objective: 4s banner explains "Deal EXACTLY the shown damage!"
- [ ] First time encountering a "threshold" objective: banner explains "Hit for ≥ the shown value!"
- [ ] Tutorial banners persist across sessions (not shown again after first encounter)
- [ ] Banner fades in and out smoothly over ~600 ms
- [ ] Multiple objectives of the same kind in one session do not re-trigger the banner
