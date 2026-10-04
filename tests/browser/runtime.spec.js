const { test, expect } = require('@playwright/test');
const base = 'http://127.0.0.1:8767';
async function fixture(page) {
  await page.goto(base);
  await page.setContent(`<link rel="stylesheet" href="${base}/skills/Apple-Style/web/apple-style.css">
    <main id="root"><div class="as-segmented" role="radiogroup" aria-label="View">
    <button class="as-segment is-selected">One</button><button class="as-segment" disabled>Disabled</button><button class="as-segment">Three</button></div>
    <button class="as-toggle" role="switch" aria-checked="false" aria-label="Wi-Fi"><span class="as-knob"></span></button>
    <button id="glass" class="as-glass as-glass-interactive as-button">Glass</button></main>
    <script src="${base}/skills/Apple-Style/web/liquid-glass.js"></script>`);
  await page.evaluate(() => { LiquidGlass.init(document.querySelector('#root')); window.changes = 0; document.querySelector('.as-toggle').addEventListener('change', () => window.changes++); });
}
test.beforeEach(async ({ page }) => fixture(page));
test('radio keyboard skips disabled and moves focus', async ({ page }) => {
  const buttons = page.locator('.as-segment'); await buttons.first().focus(); await page.keyboard.press('ArrowRight');
  await expect(buttons.nth(2)).toBeFocused(); await expect(buttons.nth(2)).toHaveAttribute('aria-checked', 'true');
  await expect(buttons.first()).toHaveAttribute('tabindex', '-1');
});
test('standard click activates switch once and cancel leaves it unchanged', async ({ page }) => {
  const toggle = page.locator('.as-toggle');
  await toggle.evaluate(el => el.click()); await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await toggle.dispatchEvent('pointerdown', { pointerId: 1, button: 0, clientX: 10 });
  await toggle.dispatchEvent('pointercancel', { pointerId: 1 });
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => changes)).toBe(1);
});
test('destroy releases and remounts controls', async ({ page }) => {
  await page.evaluate(() => { LiquidGlass.init(document.querySelector('#root')); LiquidGlass.destroy(document.querySelector('#root')); });
  await expect(page.locator('.as-seg-indicator')).toHaveCount(0);
  await page.locator('.as-toggle').evaluate(el => el.click()); expect(await page.evaluate(() => changes)).toBe(0);
  await page.evaluate(() => LiquidGlass.init(document.querySelector('#root')));
  await page.locator('.as-toggle').click(); expect(await page.evaluate(() => changes)).toBe(1);
});
test('lens options survive resize', async ({ page }) => {
  await page.evaluate(() => { const el = document.querySelector('#glass'); LiquidGlass.attach(el, { scale: 7, rim: 9, chroma: false, adapt: false }); });
  await expect(page.locator('feDisplacementMap').first()).toHaveAttribute('scale', '7');
  await page.locator('#glass').evaluate(el => el.style.width = '200px');
  await expect(page.locator('feDisplacementMap').first()).toHaveAttribute('scale', '7');
});
test('pointer click, keyboard, drag and cancel each commit at most once', async ({ page }) => {
  const segs = page.locator('.as-segment');
  await segs.nth(2).click(); await expect(segs.nth(2)).toHaveAttribute('aria-checked', 'true');
  const toggle = page.locator('.as-toggle');
  await toggle.click(); expect(await page.evaluate(() => changes)).toBe(1);
  await toggle.focus(); await page.keyboard.press('Space'); expect(await page.evaluate(() => changes)).toBe(2);
  await page.keyboard.press('Enter'); expect(await page.evaluate(() => changes)).toBe(3);
  const b = await toggle.boundingBox();
  await page.mouse.move(b.x + b.width - 8, b.y + b.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + 4, b.y + b.height / 2, { steps: 5 }); await page.mouse.up();
  await expect(toggle).toHaveAttribute('aria-checked', 'false'); expect(await page.evaluate(() => changes)).toBe(4);
  await toggle.dispatchEvent('pointerdown', { pointerId: 5, button: 0, clientX: 10 });
  await toggle.dispatchEvent('pointermove', { pointerId: 5, clientX: 80 });
  await toggle.dispatchEvent('pointercancel', { pointerId: 5 });
  await toggle.dispatchEvent('click', { detail: 1 });
  await expect(toggle).toHaveAttribute('aria-checked', 'false'); expect(await page.evaluate(() => changes)).toBe(4);
});
test('manual tabs wire panels, focus and explicit activation', async ({ page }) => {
  await page.evaluate(() => {
    const root = document.querySelector('#root');
    root.insertAdjacentHTML('beforeend', `<div class="as-segmented" id="tabs" role="tablist" data-activation="manual" aria-label="Details"><button class="as-segment is-selected" aria-controls="panel1">First</button><button class="as-segment" aria-controls="panel2">Second</button></div><section id="panel1">First panel</section><section id="panel2">Second panel</section>`);
  });
  const tabs = page.locator('#tabs .as-segment'); await expect(tabs.first()).toHaveAttribute('role', 'tab');
  await tabs.first().focus(); await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toBeFocused(); await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Space'); await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#panel1')).toBeHidden(); await expect(page.locator('#panel2')).toBeVisible();
});
test('scope excludes neighbors, removed root releases filters, remount works', async ({ page }) => {
  await page.evaluate(() => {
    const other = document.createElement('button'); other.id = 'other'; other.className = 'as-toggle'; other.innerHTML = '<span class="as-knob"></span>'; document.body.append(other);
  });
  await expect(page.locator('#other')).not.toHaveAttribute('role', 'switch');
  await page.evaluate(() => { window.savedRoot = document.querySelector('#root'); savedRoot.remove(); });
  await expect(page.locator('filter')).toHaveCount(0);
  await page.evaluate(() => { document.body.append(savedRoot); LiquidGlass.init(savedRoot); });
  await expect(page.locator('.as-seg-indicator')).toHaveCount(1);
  await page.locator('#root .as-toggle').click(); expect(await page.evaluate(() => changes)).toBe(1);
});
test('lens false stays off; adapt false survives refresh and preference changes', async ({ page }) => {
  await page.evaluate(() => { const el = document.querySelector('#glass'); LiquidGlass.attach(el, { lens: false, adapt: false }); el.dataset.glassScheme = 'sentinel'; el.style.width = '240px'; LiquidGlass.refresh(); });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('filter')).toHaveCount(0);
  await expect(page.locator('#glass')).toHaveAttribute('data-glass-scheme', 'sentinel');
});
test('segmented drag cancel restores selection; disabled controls and secondary pointers do nothing', async ({page}) => {
 const group=page.locator('.as-segmented'); const segments=page.locator('.as-segment');
 const boxes=await Promise.all([segments.first().boundingBox(),segments.nth(2).boundingBox()]);
 await segments.first().dispatchEvent('pointerdown',{pointerId:9,button:0,clientX:boxes[0].x+5});
 await group.dispatchEvent('pointermove',{pointerId:9,clientX:boxes[1].x+5});
 await group.dispatchEvent('pointercancel',{pointerId:9});
 await expect(segments.first()).toHaveAttribute('aria-checked','true');
 await segments.nth(2).evaluate(el=>el.click());await expect(segments.nth(2)).toHaveAttribute('aria-checked','true');
 await segments.nth(1).evaluate(el=>el.click());await expect(segments.nth(1)).toHaveAttribute('aria-checked','false');
 const toggle=page.locator('.as-toggle');await toggle.evaluate(el=>el.setAttribute('aria-disabled','true'));
 await toggle.evaluate(el=>el.click());await expect(toggle).toHaveAttribute('aria-checked','false');
 await toggle.dispatchEvent('keydown',{key:'Enter'});expect(await page.evaluate(()=>changes)).toBe(0);
});
test('subtree moved outside its initialized scope is released', async ({page})=>{
 await page.evaluate(()=>{const el=document.querySelector('.as-segmented');document.body.append(el);});
 await expect(page.locator('.as-seg-indicator')).toHaveCount(0);
});
test('zero scale, chroma and explicit theme regeneration preserve options',async({page})=>{
 await page.evaluate(()=>LiquidGlass.attach(document.querySelector('#glass'),{scale:0,rim:3,chroma:true,adapt:false}));
 await expect(page.locator('feDisplacementMap')).toHaveCount(3);await expect(page.locator('feDisplacementMap').first()).toHaveAttribute('scale','0');
 const map=await page.locator('feImage').getAttribute('href');
 await page.evaluate(()=>{LiquidGlass.attach(document.querySelector('#glass'),{rim:18}); document.documentElement.dataset.theme='dark';});
 await expect(page.locator('feDisplacementMap')).toHaveCount(3);await expect(page.locator('feDisplacementMap').first()).toHaveAttribute('scale','0');
 expect(await page.locator('feImage').getAttribute('href')).not.toBe(map);
});
test('segmented roving semantics and repeated init preserve rendered pixels',async({page})=>{
 const group=page.locator('.as-segmented');
 await expect(group).toMatchAriaSnapshot(`
- radiogroup "View":
  - radio "One" [checked]
  - radio "Disabled" [disabled]
  - radio "Three"
`);
 const before=await group.screenshot({animations:'disabled'});
 await page.evaluate(()=>LiquidGlass.init(document.querySelector('#root')));
 const after=await group.screenshot({animations:'disabled'});
 expect(after.equals(before)).toBeTruthy();
});
test('disabling a selected segment and filling an empty control repairs roving state',async({page})=>{
 await page.locator('.as-segment').first().evaluate(el=>el.disabled=true);
 await expect(page.locator('.as-segment').nth(2)).toHaveAttribute('tabindex','0');
 await expect(page.locator('.as-segment').nth(2)).toHaveAttribute('aria-checked','true');
 await page.evaluate(()=>{
  const empty=document.createElement('div');empty.className='as-segmented';empty.id='late';document.querySelector('#root').append(empty);
 });
 await page.locator('#late').evaluate(el=>el.innerHTML='<button class="as-segment">Late</button>');
 await expect(page.locator('#late .as-segment')).toHaveAttribute('role','radio');
});
test('real segmented drag commits once and the following click cannot reset selection',async({page})=>{
 await page.evaluate(()=>{window.segmentChanges=0;document.querySelector('.as-segmented').addEventListener('change',()=>segmentChanges++);});
 const first=await page.locator('.as-segment').first().boundingBox(),last=await page.locator('.as-segment').nth(2).boundingBox();
 await page.mouse.move(first.x+first.width/2,first.y+first.height/2);await page.mouse.down();
 await page.mouse.move(last.x+last.width/2,last.y+last.height/2,{steps:8});await page.mouse.up();
 await expect(page.locator('.as-segment').nth(2)).toHaveAttribute('aria-checked','true');
 await expect(page.locator('.as-segment').nth(2)).toBeFocused();expect(await page.evaluate(()=>segmentChanges)).toBe(1);
});
test('custom switch supports keyboard and assistive click',async({page})=>{
 await page.evaluate(()=>document.querySelector('#root').insertAdjacentHTML('beforeend','<div class="as-toggle" id="custom" aria-label="Custom"><span class="as-knob"></span></div>'));
 const custom=page.locator('#custom');await expect(custom).toHaveAttribute('role','switch');await custom.focus();
 await page.keyboard.press('Space');await expect(custom).toHaveAttribute('aria-checked','true');
 await custom.evaluate(el=>el.click());await expect(custom).toHaveAttribute('aria-checked','false');
});
test('component destroy stays destroyed under an initialized document until explicit remount',async({page})=>{
 await page.evaluate(()=>{LiquidGlass.init(document);LiquidGlass.destroy(document.querySelector('#root'));});
 await expect(page.locator('.as-seg-indicator')).toHaveCount(0);
 await page.locator('.as-toggle').evaluate(el=>el.click());expect(await page.evaluate(()=>changes)).toBe(0);
 await page.evaluate(()=>LiquidGlass.init(document.querySelector('#root')));
 await expect(page.locator('.as-seg-indicator')).toHaveCount(1);
});
