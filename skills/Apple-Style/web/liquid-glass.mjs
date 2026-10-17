/*  Apple-Style — ES module entry for liquid-glass.js (no build step).
 *    import LiquidGlass, { init, destroy } from './liquid-glass.mjs';
 *  Keep both files side by side. The runtime loads once and is shared with a
 *  classic <script src="liquid-glass.js"> include on the same page. Safe to
 *  import while server rendering: without a DOM every function is an inert
 *  no-op, so call init() after the component mounts in the browser.
 */
import './liquid-glass.js';

const LiquidGlass = globalThis.LiquidGlass;
export default LiquidGlass;
export const {
  init, attach, detach, destroy, refresh, adapt, applyLens, morph, materialize,
  controls, segmented, toggle, slider, tabBarMinimize, titleOnScroll, concentric,
  splitDivider, menuBar, menuShortcuts, supportsLens
} = LiquidGlass;
