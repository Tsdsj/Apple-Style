const {test,expect}=require('@playwright/test');
const base='http://127.0.0.1:8767';
test('showcase menu and modal have keyboard access and restore focus',async({page})=>{
 await page.goto(base+'/demo/index.html');
 await page.locator('#shareBtn').click(); await expect(page.locator('#shareMenu .as-menu-item').first()).toBeFocused();
 await page.keyboard.press('ArrowDown');await expect(page.locator('#shareMenu .as-menu-item').nth(1)).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.locator('#shareBtn')).toBeFocused();await expect(page.locator('#shareBtn')).toHaveAttribute('aria-expanded','false');
 await page.locator('#heroSheet').click();await expect(page.locator('#sheetFull')).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(page.locator('#sheetClose')).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.locator('#sheet')).toBeHidden();await expect(page.locator('#heroSheet')).toBeFocused();
});
