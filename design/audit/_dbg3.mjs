import { chromium } from '../../node_modules/playwright/index.mjs';
const b=await chromium.launch();
const p=await (await b.newContext({viewport:{width:1920,height:1080}})).newPage();
await p.goto('http://localhost:8765/pages/s2_main_hub.html'); await p.waitForTimeout(2500);
console.log(await p.evaluate(()=>{
  const c=document.getElementById('hub-right-canvas');
  const t=document.getElementById('panel-tavern');
  return JSON.stringify({
    canvas子元素数: c.children.length,
    canvas子id: [...c.children].map(e=>e.tagName+'#'+e.id+'.'+String(e.className).split(' ')[0]),
    canvas自身类: c.className,
    tavern父链: (()=>{let e=t,out=[];while(e&&e!==document.body){out.push(e.tagName+(e.id?'#'+e.id:''));e=e.parentElement;}return out.join(' < ');})(),
    hubCanvas数量: document.querySelectorAll('#hub-right-canvas').length,
    rail数量: document.querySelectorAll('#hub-expedition-rail').length,
    body直接子: [...document.body.children].map(e=>e.tagName+(e.id?'#'+e.id:''))
  },null,1);
}));
await b.close();
