import { validateMarketData } from './data-contract.js';
const $=s=>document.querySelector(s);
const guide=$('#data-guide');let guideReturnFocus=null;
$('#open-data-guide').addEventListener('click',()=>{guideReturnFocus=document.activeElement;guide.showModal();$('#close-data-guide').focus();});
$('#close-data-guide').addEventListener('click',()=>guide.close());
guide.addEventListener('cancel',event=>{event.preventDefault();guide.close();});
guide.addEventListener('click',event=>{if(event.target===guide)guide.close();});
guide.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const items=[...guide.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(item=>item.getClientRects().length>0);if(!items.length){event.preventDefault();return;}const first=items[0],last=items.at(-1),active=document.activeElement;if(items.length===1){event.preventDefault();first.focus();return;}if(event.shiftKey&&(active===first||!guide.contains(active))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(active===last||!guide.contains(active))){event.preventDefault();first.focus();}});
guide.addEventListener('close',()=>{if(guideReturnFocus?.isConnected){guideReturnFocus.focus();guideReturnFocus=null;}});
const markets=[{id:'stock',name:'주식 합계',color:'#edf2fa',parts:['kospi','kosdaq']},{id:'kospi',name:'코스피',color:'#ffd54a'},{id:'kosdaq',name:'코스닥',color:'#ff7755'},{id:'domestic',name:'국내코인 합계',color:'#ab91ff',parts:['upbit','bithumb']},{id:'upbit',name:'업비트',color:'#35c8ff'},{id:'bithumb',name:'빗썸',color:'#f074d4'},{id:'binance',name:'바이낸스',color:'#72e572'}];
const summaryMarkets=['kospi','kosdaq','upbit','bithumb','binance'].map(id=>markets.find(m=>m.id===id));
const defaults=['stock','domestic'];let selected=new Set(defaults),data,rows,viewStart=0,viewEnd=0,yMin=0,yMax=1,yAuto=true,chartStyle='dots',period='10y',hover=null,hoverY=null,drag=null;
const canvas=$('#chart'),ctx=canvas.getContext('2d');let width=0,height=0,geometry;
const fmt=v=>v===null?'—':(v/1e12).toLocaleString('ko-KR',{maximumFractionDigits:2,minimumFractionDigits:2});
function option(id){const m=markets.find(m=>m.id===id);return `<label class="market-option"><input type="checkbox" value="${id}" ${selected.has(id)?'checked':''}><span>${m.name}</span><i class="swatch" style="background:${m.color}"></i></label>`;}
$('#tree').innerHTML=`<details class="group" open><summary>주식</summary>${['stock','kospi','kosdaq'].map(option).join('')}</details><details class="group" open><summary>국내코인</summary>${['domestic','upbit','bithumb'].map(option).join('')}</details><div>${option('binance')}</div>`;
const adSlot=$('.sidebar-ad-space'),adSize=$('#sidebar-ad-size');
new ResizeObserver(()=>{const {width,height}=adSlot.getBoundingClientRect();adSize.textContent=`${Math.round(width)} × ${Math.round(height)} px`;}).observe(adSlot);
$('#tree').addEventListener('change',e=>{const id=e.target.value;if(!id)return;e.target.checked?selected.add(id):selected.delete(id);render();});
$('#reset').onclick=()=>{selected=new Set(defaults);document.querySelectorAll('#tree input').forEach(el=>el.checked=selected.has(el.value));chartStyle='dots';updateChartStyleControls();setPeriod('10y');};
function value(row,m){if(!m.parts)return row[m.id];return m.parts.every(k=>row[k]!==null)?m.parts.reduce((s,k)=>s+row[k],0):null;}
const active=()=>markets.filter(m=>selected.has(m.id));
function clampIndex(i){return Math.max(0,Math.min(rows.length-1,Math.round(i)));}
function clampViewX(s,e){
const minSpan=4,maxSpan=Math.max(minSpan,rows.length*3);
let span=Math.max(minSpan,Math.min(maxSpan,e-s));
let ns=s,ne=s+span;
const minEnd=Math.min(rows.length-1,1),maxStart=Math.max(0,rows.length-2);
if(ne<minEnd){ne=minEnd;ns=ne-span;}
if(ns>maxStart){ns=maxStart;ne=ns+span;}
return [ns,ne];
}
function autoYRange(){
const sIdx=Math.max(0,Math.floor(viewStart)),eIdx=Math.min(rows.length-1,Math.ceil(viewEnd));
let max=1;
if(sIdx<=eIdx){
for(const m of active()){
for(let i=sIdx;i<=eIdx;i++){
const v=value(rows[i],m);
if(v!==null)max=Math.max(max,v/1e12);
}
}
}
const step=nice(max/5),ceiling=Math.ceil(max*1.06/step)*step;
return [0,Math.max(step,ceiling)];
}
function updateChartStyleControls(){document.querySelectorAll('[data-style]').forEach(button=>{const selected=button.dataset.style===chartStyle;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});}
function setPeriod(p){if(!rows)return;period=p;yAuto=true;const hi=rows.length-1;let lo=0;if(p==='10y'){const end=new Date(rows[hi].date+'T00:00:00Z'),year=end.getUTCFullYear()-10,month=end.getUTCMonth(),day=Math.min(end.getUTCDate(),new Date(Date.UTC(year,month+1,0)).getUTCDate()),start=new Date(Date.UTC(year,month,day)).toISOString().slice(0,10);lo=Math.max(0,rows.findIndex(r=>r.date>=start));}else if(p!=='all'){const end=new Date(rows[hi].date+'T00:00:00Z');end.setUTCDate(end.getUTCDate()-Number(p)+1);lo=Math.max(0,rows.findIndex(r=>r.date>=end.toISOString().slice(0,10)));}viewStart=lo;viewEnd=hi;render();}
document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>setPeriod(b.dataset.period));document.querySelectorAll('[data-style]').forEach(button=>button.onclick=()=>{chartStyle=button.dataset.style;updateChartStyleControls();render();});
function datesChanged(){const start=$('#start').value,end=$('#end').value;if(!start||!end||start>end){$('#end').setCustomValidity('종료일은 시작일 이후여야 합니다.');$('#end').reportValidity();return;}$('#end').setCustomValidity('');const lo=rows.findIndex(r=>r.date>=start),hi=rows.findLastIndex(r=>r.date<=end);if(lo<0||hi<lo){setPeriod('10y');return;}viewStart=lo;viewEnd=hi;yAuto=true;period='custom';render();}
$('#start').onchange=datesChanged;$('#end').onchange=datesChanged;
function render(){if(!rows)return;hover=null;hoverY=null;$('#tooltip').hidden=true;const loIdx=clampIndex(viewStart),hiIdx=clampIndex(viewEnd);$('#start').value=rows[loIdx].date;$('#end').value=rows[hiIdx].date;document.querySelectorAll('[data-period]').forEach(b=>b.classList.toggle('active',b.dataset.period===period));
$('#legend').innerHTML=active().map(m=>`<span><i class="swatch" style="background:${m.color}"></i>${m.name}</span>`).join('');$('#empty').hidden=selected.size>0;
const cardHi=Math.min(rows.length-1,Math.max(0,Math.floor(viewEnd)));
$('#cards').innerHTML=summaryMarkets.map(m=>{let i=cardHi;while(i>=0&&value(rows[i],m)===null)i--;const v=i>=0?value(rows[i],m):null;let j=i-1;while(j>=0&&value(rows[j],m)===null)j--;const prev=j>=0?value(rows[j],m):null;const change=prev>0&&v!==null?(v/prev-1)*100:null;return `<article class="card"><div class="card-heading"><div class="card-title"><i class="swatch" style="background:${m.color}"></i>${m.name}</div><time class="card-date" ${i>=0?`datetime="${rows[i].date}"`:''}>${i>=0?rows[i].date:'—'}</time></div><div class="card-metrics"><div class="card-value">${fmt(v)}<small>조 원</small></div><span class="card-change ${change===null?'':change>=0?'positive':'negative'}" title="직전 거래일 대비" aria-label="직전 거래일 대비 ${change===null?'비교 없음':change.toFixed(1)+'%'}">${change===null?'—':`${change>=0?'+':''}${change.toFixed(1)}%`}</span></div></article>`;}).join('');draw();}
function indexToMs(idx){
const day=86400000,n=rows.length;
if(idx<=0)return Date.parse(rows[0].date+'T00:00:00Z')+idx*day;
if(idx>=n-1)return Date.parse(rows[n-1].date+'T00:00:00Z')+(idx-(n-1))*day;
const f=Math.floor(idx),c=Math.ceil(idx),t=idx-f;
const ms0=Date.parse(rows[f].date+'T00:00:00Z'),ms1=Date.parse(rows[c].date+'T00:00:00Z');
return ms0+(ms1-ms0)*t;
}
function draw(){
if(!rows||!width)return;
ctx.clearRect(0,0,width,height);
const left=48,right=15,top=22,bottom=35,w=width-left-right,h=height-top-bottom;
if(yAuto)[yMin,yMax]=autoYRange();
const ySpan=Math.max(1e-6,yMax-yMin),xSpan=Math.max(1e-6,viewEnd-viewStart);
geometry={left,right,top,bottom,w,h};
const x=i=>left+(i-viewStart)/xSpan*w,y=v=>top+h-(v-yMin)/ySpan*h;
ctx.font='10px "DM Sans",sans-serif';ctx.lineWidth=1;
const step=nice(ySpan/5),decimals=step<0.1?2:step<1?1:0;
const kStart=Math.ceil(yMin/step-1e-9),kEnd=Math.floor(yMax/step+1e-9);
for(let k=kStart;k<=kEnd;k++){
const v=k*step,yy=y(v);
if(yy<top-1||yy>top+h+1)continue;
ctx.strokeStyle=Math.abs(v)<1e-9&&yMin<0?'#4c556688':'#292d365f';
ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(width-right,yy);ctx.stroke();
ctx.fillStyle='#768095';ctx.textAlign='right';ctx.fillText(v.toFixed(decimals),left-11,yy+3);
}
const startMs=indexToMs(viewStart),endMs=indexToMs(viewEnd);
drawCalendarGuides(left,top,bottom,w,startMs,endMs);
const tickCount=Math.max(2,Math.min(5,Math.floor(w/100)));
for(let i=0;i<=tickCount;i++){
const ms=startMs+(endMs-startMs)*(i/tickCount),xx=left+w*(i/tickCount);
ctx.fillStyle='#768095';ctx.textAlign=i===0?'left':i===tickCount?'right':'center';
ctx.fillText(new Date(ms).toISOString().slice(2,10).replaceAll('-','.'),xx,height-12);
}
const sIdx=Math.max(0,Math.floor(viewStart)-1),eIdx=Math.min(rows.length-1,Math.ceil(viewEnd)+1);
const activeMarkets=active();
ctx.save();ctx.beginPath();ctx.rect(left,top,w,h);ctx.clip();
for(const m of activeMarkets){
ctx.beginPath();
if(chartStyle==='line'){
ctx.strokeStyle=m.color;ctx.lineWidth=1.7;ctx.lineJoin='round';let open=false;
for(let i=sIdx;i<=eIdx;i++){const raw=value(rows[i],m),v=raw===null?null:raw/1e12;if(v===null){open=false;continue;}if(open)ctx.lineTo(x(i),y(v));else ctx.moveTo(x(i),y(v));open=true;}
ctx.stroke();
}else{
ctx.fillStyle=m.color;const radius=2.3;
for(let i=sIdx;i<=eIdx;i++){const raw=value(rows[i],m);if(raw!==null){const px=x(i),py=y(raw/1e12);ctx.moveTo(px+radius,py);ctx.arc(px,py,radius,0,Math.PI*2);}}
ctx.fill();
}
}
if(hover!==null){
const xx=x(hover);
ctx.setLineDash([3,4]);ctx.strokeStyle='#8591a0';ctx.beginPath();ctx.moveTo(xx,top);ctx.lineTo(xx,height-bottom);
if(hoverY!==null){ctx.moveTo(left,hoverY);ctx.lineTo(width-right,hoverY);}
ctx.stroke();ctx.setLineDash([]);
if(hover>=0&&hover<rows.length){
for(const m of activeMarkets){const raw=value(rows[hover],m);if(raw!==null){ctx.fillStyle=m.color;ctx.beginPath();ctx.arc(xx,y(raw/1e12),3,0,Math.PI*2);ctx.fill();}}
}
}
ctx.restore();
}
function drawCalendarGuides(left,top,bottom,w,start,end){
const day=86400000,spanDays=(end-start)/day;
if(spanDays<=0)return;
const showMonths=w*30.436875/spanDays>=22,yearStep=Math.max(1,Math.ceil(28/(w*365.2425/spanDays)));
const first=new Date(start);let year=first.getUTCFullYear(),month=first.getUTCMonth()+1;
ctx.save();ctx.beginPath();ctx.rect(left,top,w,height-top-bottom);ctx.clip();ctx.lineWidth=1;ctx.setLineDash([]);
while(Date.UTC(year,month,1)<=end){
const boundary=Date.UTC(year,month,1),xx=left+(boundary-start)/(end-start)*w,isYear=month===0;
if(isYear&&(year-first.getUTCFullYear())%yearStep===0||!isYear&&showMonths){ctx.strokeStyle=isYear?'#77839645':'#46505f38';ctx.beginPath();ctx.moveTo(xx,top);ctx.lineTo(xx,height-bottom);ctx.stroke();}
month++;if(month===12){month=0;year++;}
}
ctx.restore();
}
function nice(v){const p=10**Math.floor(Math.log10(v));return [1,2,2.5,5,10].map(n=>n*p).find(n=>n>=v)||p*10;}
new ResizeObserver(entries=>{const rect=entries[0].contentRect;width=rect.width;height=rect.height;const dpr=window.devicePixelRatio||1;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();}).observe($('#plot'));
function zoomY(factor,yFrac){
if(yAuto)[yMin,yMax]=autoYRange();
const span=yMax-yMin,anchor=yMin+yFrac*span;
const nextSpan=Math.max(0.01,Math.min(1e6,span*factor));
yMin=anchor-yFrac*nextSpan;yMax=yMin+nextSpan;yAuto=false;
}
function zoomX(factor,xFrac){
const span=viewEnd-viewStart,anchor=viewStart+xFrac*span;
const nextSpan=Math.max(4,Math.min(rows.length*3,span*factor));
[viewStart,viewEnd]=clampViewX(anchor-xFrac*nextSpan,anchor+(1-xFrac)*nextSpan);
period='custom';
}
canvas.addEventListener('pointermove',e=>{
if(!rows||!geometry)return;
const rect=canvas.getBoundingClientRect(),px=e.clientX-rect.left,py=e.clientY-rect.top;
const {left,top,w,h}=geometry;
if(drag){
if(drag.mode==='pan'){
const dx=(drag.x-e.clientX)/w*(drag.viewEnd-drag.viewStart);
[viewStart,viewEnd]=clampViewX(drag.viewStart+dx,drag.viewEnd+dx);
const dy=(e.clientY-drag.y)/h*(drag.yMax-drag.yMin);
yMin=drag.yMin+dy;yMax=drag.yMax+dy;yAuto=false;period='custom';render();return;
}
if(drag.mode==='yscale'){
const factor=Math.exp((e.clientY-drag.y)*0.006);
const mid=(drag.yMin+drag.yMax)/2,nextSpan=Math.max(0.01,Math.min(1e6,(drag.yMax-drag.yMin)*factor));
yMin=mid-nextSpan/2;yMax=mid+nextSpan/2;yAuto=false;draw();return;
}
if(drag.mode==='xscale'){
const factor=Math.exp((drag.x-e.clientX)*0.005);
const mid=(drag.viewStart+drag.viewEnd)/2,nextSpan=Math.max(4,Math.min(rows.length*3,(drag.viewEnd-drag.viewStart)*factor));
[viewStart,viewEnd]=clampViewX(mid-nextSpan/2,mid+nextSpan/2);period='custom';render();return;
}
}
const inPlot=px>=left&&px<=left+w&&py>=top&&py<=top+h;
const inYAxis=px<left&&py>=top&&py<=top+h;
const inXAxis=py>top+h&&px>=left&&px<=left+w;
canvas.style.cursor=inYAxis?'ns-resize':inXAxis?'ew-resize':'crosshair';
if(!inPlot){$('#tooltip').hidden=true;hover=null;hoverY=null;draw();return;}
hoverY=py;
const idx=Math.round(viewStart+(px-left)/w*(viewEnd-viewStart));
hover=idx;
const tip=$('#tooltip');
if(idx>=0&&idx<rows.length){
tip.innerHTML=`<strong>${rows[idx].date}</strong>`+active().map(m=>{const v=value(rows[idx],m);return `<div class="tooltip-row"><span><i class="swatch" style="background:${m.color}"></i>${m.name}</span><span>${fmt(v)+(v===null?'':'조')}</span></div>`;}).join('');
tip.hidden=selected.size===0;
tip.style.left=Math.max(0,Math.min(width-tip.offsetWidth,px+17))+'px';
tip.style.top=Math.max(0,Math.min(height-tip.offsetHeight,py+12))+'px';
}else{tip.hidden=true;}
draw();
});
canvas.addEventListener('pointerleave',()=>{if(drag)return;hover=null;hoverY=null;canvas.style.cursor='crosshair';$('#tooltip').hidden=true;draw();});
canvas.addEventListener('pointerdown',e=>{
if(!rows||!geometry||e.pointerType==='touch')return;
const rect=canvas.getBoundingClientRect(),px=e.clientX-rect.left,py=e.clientY-rect.top;
const {left,top,w,h}=geometry;
if(yAuto)[yMin,yMax]=autoYRange();
if(px<left&&py>=top&&py<=top+h){drag={mode:'yscale',y:e.clientY,yMin,yMax};canvas.style.cursor='ns-resize';}
else if(py>top+h&&px>=left&&px<=left+w){drag={mode:'xscale',x:e.clientX,viewStart,viewEnd};canvas.style.cursor='ew-resize';}
else{drag={mode:'pan',x:e.clientX,y:e.clientY,viewStart,viewEnd,yMin,yMax};canvas.style.cursor='grabbing';}
canvas.setPointerCapture(e.pointerId);
});
const release=()=>{drag=null;canvas.style.cursor='crosshair';};
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
canvas.addEventListener('wheel',e=>{
if(!rows||!geometry)return;
e.preventDefault();
const rect=canvas.getBoundingClientRect(),px=e.clientX-rect.left,py=e.clientY-rect.top;
const {left,top,w,h}=geometry;
const xFrac=Math.max(0,Math.min(1,(px-left)/w));
const yFrac=1-Math.max(0,Math.min(1,(py-top)/h));
const factor=e.deltaY>0?1.18:1/1.18;
if(px<left||e.ctrlKey||e.shiftKey){zoomY(factor,yFrac);draw();}
else if(e.altKey){zoomX(factor,xFrac);zoomY(factor,yFrac);render();}
else{zoomX(factor,xFrac);render();}
},{passive:false});
canvas.ondblclick=e=>{
if(!rows||!geometry)return;
const rect=canvas.getBoundingClientRect(),px=e.clientX-rect.left,py=e.clientY-rect.top;
if(px<geometry.left&&py>=geometry.top&&py<=geometry.top+geometry.h){yAuto=true;draw();return;}
setPeriod('10y');
};
try{const response=await fetch(new URL('./data/market-daily.json',import.meta.url),{cache:'no-cache'});if(!response.ok)throw Error('데이터 요청 실패');data=validateMarketData(await response.json());rows=data.rows;
$('#sample-status').hidden=!data.isSample;$('#sample-note').hidden=!data.isSample;$('#info-sources').textContent=data.metadata.sources;$('#info-dates').textContent=data.isSample?data.metadata.dateBoundary:`${data.metadata.dateBoundary} 진행 중인 일봉은 공개하지 않습니다.`;$('#info-conversion').textContent=data.metadata.conversion;$('#latest-date').textContent=rows.at(-1).date;$('#latest-date').dateTime=rows.at(-1).date;$('#updated').textContent=`${new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(data.updatedAt))} KST`;$('#updated').dateTime=data.updatedAt;for(const id of ['start','end']){$('#'+id).min=rows[0].date;$('#'+id).max=rows.at(-1).date;}setPeriod('10y');}catch(error){$('#error').hidden=false;$('#error').textContent='데이터를 불러오지 못했습니다. '+error.message;$('#latest-date').textContent='—';$('#updated').textContent='데이터 연결 오류';$('#empty').hidden=false;$('#empty').textContent='데이터 연결을 확인해주세요.';}
