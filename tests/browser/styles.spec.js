const { test, expect } = require('@playwright/test');
const base = 'http://127.0.0.1:8767';
for (const colorScheme of ['light', 'dark']) {
  test(`default meaningful white text contrast: ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme }); await page.goto(base + '/skills/Apple-Style/web/demo-desktop.html');
    const ratios = await page.evaluate(() => {
      const lum = c => { const rgb = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => x/255).map(x => x<=.04045 ? x/12.92 : ((x+.055)/1.055)**2.4); return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722; };
      return [...document.querySelectorAll('.as-button-filled,.as-sidebar .as-row.is-selected,.list li[aria-selected="true"]')].map(el => {
        const cs = getComputedStyle(el), a=lum(cs.color), b=lum(cs.backgroundColor);
        return { text: el.textContent.trim(), ratio: (Math.max(a,b)+.05)/(Math.min(a,b)+.05) };
      });
    });
    expect(ratios.length).toBeGreaterThan(0); for (const r of ratios) expect(r.ratio, r.text).toBeGreaterThanOrEqual(4.5);
  });
}
for (const url of ['/demo/index.html','/skills/Apple-Style/web/demo.html','/skills/Apple-Style/web/demo-desktop.html']) {
  for (const width of [320,390,768,1024,1440,2000]) {
    test(`layout ${url} at ${width}`, async ({page}, testInfo) => {
      const errors=[]; page.on('pageerror',e=>errors.push(e.message));
      await page.setViewportSize({width,height:900});
      await page.addInitScript(() => { let seed=12345; Math.random=()=>((seed=(seed*16807)%2147483647)-1)/2147483646; });
      await page.goto(base+url); await page.evaluate(()=>document.fonts.ready);
      await expect(page.locator('body')).toBeVisible();
      const sizes=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
      expect(sizes.scroll).toBeLessThanOrEqual(sizes.client+1); expect(errors).toEqual([]);
      if(width===390 || width===1440) await page.screenshot({path:testInfo.outputPath(`example-${width}.png`),animations:'disabled'});
    });
  }
}
test('real accessibility preferences and theme keep lenses off or configured', async ({page}) => {
  await page.goto(base+'/skills/Apple-Style/web/demo.html');
  await page.emulateMedia({reducedMotion:'reduce',contrast:'more'});
  await expect(page.locator('filter')).toHaveCount(0);
  const transition=await page.locator('.as-toggle .as-knob').first().evaluate(el=>getComputedStyle(el).transitionDuration);
  expect(transition.split(',').every(t=>parseFloat(t)<=0.01)).toBeTruthy();
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});
  await expect(page.locator('filter')).toHaveCount(0);
});
for(const colorScheme of ['light','dark']) test(`prominent glass semantic tint ${colorScheme}`,async({page})=>{
 await page.emulateMedia({colorScheme});await page.goto(base+'/skills/Apple-Style/web/demo.html');
 const result=await page.evaluate(()=>{
  const el=document.querySelector('.as-glass-prominent'); const cs=getComputedStyle(el);
  const probe=document.createElement('span');probe.style.color=cs.getPropertyValue('--as-glass-tint');document.body.append(probe);
  const background=getComputedStyle(probe).color;probe.remove();
  const lum=rgb=>{const values=rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return values[0]*.2126+values[1]*.7152+values[2]*.0722;};
  const fg=lum(cs.color),bg=lum(background);return{foreground:cs.color,background,ratio:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)};
 });
 expect(result.foreground).toBe('rgb(255, 255, 255)');expect(result.ratio).toBeGreaterThanOrEqual(4.5);
});
