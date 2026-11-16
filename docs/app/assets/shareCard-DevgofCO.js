import{n as e}from"./rolldown-runtime-WkwZ5CU-.js";import{t}from"./html2canvas-DOSCTA7E.js";import{d as n,u as r}from"./index-0f1f4_PP.js";var i=e(t(),1),a=e=>e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`);async function o(e,t=`八字命盘.png`){let o=Object.values(e.weighted).reduce((e,t)=>e+t,0)||1,s=r.map(t=>{let r=e.weighted[t],i=Math.round(r/o*100),a=n[t].color;return`<div style="display:flex;align-items:center;gap:8px;margin:6px 0;">
      <span style="width:16px;color:${a};font-family:'Noto Serif SC',serif;font-size:14px;">${t}</span>
      <span style="flex:1;height:8px;background:rgba(255,255,255,.08);border-radius:6px;overflow:hidden;">
        <span style="display:block;height:100%;width:${i}%;background:${a};border-radius:6px;"></span>
      </span>
      <span style="width:58px;text-align:right;color:#a8a293;font-size:12px;font-family:'Cormorant Garamond',serif;">${r.toFixed(1)}·${i}%</span>
    </div>`}).join(``),c=e.pillars.map((e,t)=>`<div style="flex:1;text-align:center;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px 4px;">
        <div style="font-size:12px;color:#8a877e;letter-spacing:.16em;margin-bottom:4px;">${[`年`,`月`,`日`,`时`][t]}柱</div>
        <div style="font-family:'Noto Serif SC',serif;font-size:26px;font-weight:700;line-height:1.1;">
          <span style="color:${n[e.ganEl].color}">${e.gan}</span><span style="color:${n[e.zhiEl].color}">${e.zhi}</span>
        </div>
        <div style="font-size:12px;color:#9d998f;margin-top:3px;">${a(e.shiShen)}</div>
        <div style="font-size:12px;color:#8a877e;margin-top:2px;">${e.hidden.map(e=>e.gan).join(` `)}</div>
      </div>`).join(``),l=document.createElement(`div`);l.style.cssText=`position:fixed;left:0;top:0;width:720px;z-index:-1;box-sizing:border-box;padding:44px 46px;background:radial-gradient(120% 80% at 50% 0%,#1c1a17 0%,#0b0b0d 70%);color:#ece9e2;font-family:'Noto Sans SC',sans-serif;`,l.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.12);padding-bottom:16px;">
      <div style="font-family:'Noto Serif SC',serif;font-size:18px;letter-spacing:.28em;color:#ece9e2;">四柱 · 八字</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:11px;letter-spacing:.3em;color:#c9a05a;">BAZI · ATELIER</div>
    </div>
    <div style="display:flex;align-items:flex-end;gap:16px;margin:26px 0 8px;">
      <div style="font-family:'Noto Serif SC',serif;font-size:96px;font-weight:700;line-height:1;color:${n[e.dayMaster.element].color};">${e.dayMaster.gan}</div>
      <div style="padding-bottom:10px;">
        <div style="font-size:15px;color:#d8d5ce;letter-spacing:.1em;">日主 · ${e.dayMaster.yinYang}${e.dayMaster.element}</div>
        <div style="font-size:12px;color:#9d998f;margin-top:4px;">生于 ${e.pillars[1].zhi}月 · 生肖 ${e.pillars[0].zhi}</div>
      </div>
    </div>
    <div style="font-size:12px;color:#9d998f;letter-spacing:.06em;margin-bottom:18px;">${a(e.solarText)} · ${e.input.gender===`male`?`乾造（男）`:`坤造（女）`}</div>
    <div style="display:flex;gap:10px;margin-bottom:24px;">${c}</div>
    <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px 18px;margin-bottom:24px;">
      <div style="font-family:'Cormorant Garamond',serif;font-size:12px;letter-spacing:.24em;color:#c9a05a;margin-bottom:8px;">FIVE ELEMENTS · 五行</div>
      ${s}
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(255,255,255,.12);padding-top:14px;">
      <div style="font-size:12px;color:#8a877e;letter-spacing:.06em;line-height:1.7;">立春换年 · 节气换月 · 干支纪日<br/>真太阳时 · 子时换日口径</div>
      <div style="width:52px;height:52px;border:2px solid #a8322a;border-radius:3px;color:#a8322a;display:flex;align-items:center;justify-content:center;font-family:'Noto Serif SC',serif;font-size:22px;font-weight:700;transform:rotate(-4deg);">命</div>
    </div>`,document.body.appendChild(l);try{await document.fonts?.ready}catch{}await new Promise(e=>setTimeout(e,60));try{let e=(await(0,i.default)(l,{scale:2,backgroundColor:null,useCORS:!0,logging:!1})).toDataURL(`image/png`),n=document.createElement(`a`);n.href=e,n.download=t,n.click()}finally{l.remove()}}export{o as exportShareCard};