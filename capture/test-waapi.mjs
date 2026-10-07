import puppeteer from 'puppeteer-core';
import { CFT } from './lib.mjs';
const browser = await puppeteer.launch({ executablePath: CFT, headless: 'new' });
const page = await browser.newPage();
await page.setContent(`<style>@keyframes fi{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
.a{width:100px;height:40px;background:red;animation:fi .4s cubic-bezier(.22,1,.36,1) both;animation-delay:200ms}</style>
<div id=x class=a></div><div id=y></div>`);
const r = await page.evaluate(() => {
  const el = document.getElementById('x');
  const before = getComputedStyle(el).opacity;
  const anims = el.getAnimations();
  for (const a of anims) { a.pause(); a.currentTime = 100000; }
  const after = getComputedStyle(el).opacity;
  return { n: anims.length, before, after, state: anims.map(a => a.playState + ':' + a.currentTime) };
});
console.log(JSON.stringify(r));
await new Promise(r => setTimeout(r, 100));
console.log('later', await page.evaluate(() => getComputedStyle(document.getElementById('x')).opacity));
// Now: add a new element mid-way, as React would, and drive in the same tick.
const r2 = await page.evaluate(() => {
  const d = document.createElement('div'); d.className = 'a'; d.id = 'z'; document.body.appendChild(d);
  const anims = document.body.getAnimations({ subtree: true });
  for (const a of anims) { a.pause(); a.currentTime = 100000; }
  return { n: anims.length, op: getComputedStyle(d).opacity };
});
console.log(JSON.stringify(r2));
await new Promise(r => setTimeout(r, 100));
console.log('later2', await page.evaluate(() => getComputedStyle(document.getElementById('z')).opacity));
await browser.close();
