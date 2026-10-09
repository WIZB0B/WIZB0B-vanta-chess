import { test, expect } from '@playwright/test';
import { openingAfterE4D5, recordQueenMove } from './board-helpers.js';

// Backlog V1-fix, measured frame by frame by the owner: the queen sat on d1 for ~56ms, nothing
// was painted until ~93ms, and she appeared 65% of the way along. This spec runs on its own
// (the "timing" project in playwright.config.js, after every other test), so the load of other
// tests can't drop frames from the measurement.
test('Qd1-h5 starts at once and is painted at least every 20ms, through at least 8 positions, until it lands',async({page})=>{
  await openingAfterE4D5(page);
  const {frames,input,progress,log}=await recordQueenMove(page);
  const firstMoving=frames.findIndex(f=>progress(f)>.005);
  const landed=frames.findIndex(f=>progress(f)>.995);
  expect(firstMoving,log).toBeGreaterThan(0);
  expect(landed,log).toBeGreaterThan(firstMoving);
  // Leaves d1 at once (within two frames of the move) and the first moved frame is near the
  // start of the path, not part-way along it.
  expect(frames[firstMoving].time-input,log).toBeLessThanOrEqual(40);
  expect(progress(frames[firstMoving]),log).toBeLessThanOrEqual(.25);
  // A frame at least every 20ms from the first frame after the move until the queen lands.
  // (The wait for that first frame is the browser's input-to-paint latency, which Playwright's
  // injected clicks inflate; it is bounded by the 40ms "leaves d1" check above.)
  const fromInput=frames.findIndex(f=>f.time>=input),span=frames.slice(fromInput,landed+1);
  const gaps=span.slice(1).map((f,i)=>f.time-span[i].time);
  expect(Math.max(...gaps),log).toBeLessThanOrEqual(20);
  // At least 8 distinct positions strictly between d1 and h5.
  const between=new Set(frames.filter(f=>progress(f)>.005&&progress(f)<.995).map(f=>`${f.x.toFixed(1)},${f.y.toFixed(1)}`));
  expect(between.size,log).toBeGreaterThanOrEqual(8);
  // Lands in about 200ms (distance-scaled: ~150ms for one square up to ~250ms).
  expect(frames[landed].time-input,log).toBeLessThanOrEqual(300);
});
