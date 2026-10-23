import { validateMarketData } from './data-contract.js';
const $=s=>document.querySelector(s);
const markets=[{id:'stock',name:'주식 합계',color:'#edf2fa',parts:['kospi','kosdaq']},{id:'kospi',name:'코스피',color:'#ffd54a'},{id:'kosdaq',name:'코스닥',color:'#ff7755'},{id:'domestic',name:'국내코인 합계',color:'#ab91ff',parts:['upbit','bithumb']},{id:'upbit',name:'업비트',color:'#35c8ff'},{id:'bithumb',name:'빗썸',color:'#f074d4'},{id:'binance',name:'바이낸스',color:'#72e572'}];
const summaryMarkets=['kospi','kosdaq','upbit','bithumb','binance'].map(id=>markets.find(m=>m.id===id));
const defaults=['stock','domestic'];let selected=new Set(defaults),data,rows,lo=0,hi=0,chartStyle='dots',period='10y',hover=null,hoverY=null,drag=null;
const canvas=$('#chart'),ctx=canvas.getContext('2d');let width=0,height=0,geometry;
const fmt=v=>v===null?'—':(v/1e12).toLocaleString('ko-KR',{maximumFractionDigits:2,minimumFractionDigits:2});
function option(id){const m=markets.find(m=>m.id===id);return `<label class="market-option"><input type="checkbox" value="${id}" ${selected.has(id)?'checked':''}><span>${m.name}</span><i class="swatch" style="background:${m.color}"></i></label>`;}
$('#tree').innerHTML=`<details class="group" open><summary>주식</summary>${['stock','kospi','kosdaq'].map(option).join('')}</details><details class="group" open><summary>국내코인</summary>${['domestic','upbit','bithumb'].map(option).join('')}</details><div>${option('binance')}</div>`;
$('#tree').addEventListener('change',e=>{const id=e.target.value;if(!id)return;e.target.checked?selected.add(id):selected.delete(id);render();});
$('#reset').onclick=()=>{selected=new Set(defaults);document.querySelectorAll('#tree input').forEach(el=>el.checked=selected.has(el.value));chartStyle='dots';updateChartStyleControls();setPeriod('10y');};
function value(row,m){if(!m.parts)return row[m.id];return m.parts.every(k=>row[k]!==null)?m.parts.reduce((s,k)=>s+row[k],0):null;}
const active=()=>markets.filter(m=>selected.has(m.id));
function points(m){return rows.slice(lo,hi+1).map(r=>{const v=value(r,m);return v===null?null:v/1e12;});}
function updateChartStyleControls(){document.querySelectorAll('[data-style]').forEach(button=>{const selected=button.dataset.style===chartStyle;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});}
function setPeriod(p){if(!rows)return;period=p;hi=rows.length-1;lo=0;if(p==='10y'){const end=new Date(rows[hi].date+'T00:00:00Z'),year=end.getUTCFullYear()-10,month=end.getUTCMonth(),day=Math.min(end.getUTCDate(),new Date(Date.UTC(year,month+1,0)).getUTCDate()),start=new Date(Date.UTC(year,month,day)).toISOString().slice(0,10);lo=Math.max(0,rows.findIndex(r=>r.date>=start));}else if(p!=='all'){const end=new Date(rows[hi].date+'T00:00:00Z');end.setUTCDate(end.getUTCDate()-Number(p)+1);lo=Math.max(0,rows.findIndex(r=>r.date>=end.toISOString().slice(0,10)));}render();}
document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>setPeriod(b.dataset.period));document.querySelectorAll('[data-style]').forEach(button=>button.onclick=()=>{chartStyle=button.dataset.style;updateChartStyleControls();render();});
function datesChanged(){const start=$('#start').value,end=$('#end').value;if(!start||!end||start>end){$('#end').setCustomValidity('종료일은 시작일 이후여야 합니다.');$('#end').reportValidity();return;}$('#end').setCustomValidity('');lo=rows.findIndex(r=>r.date>=start);hi=rows.findLastIndex(r=>r.date<=end);if(lo<0||hi<lo){setPeriod('10y');return;}period='custom';render();}
$('#start').onchange=datesChanged;$('#end').onchange=datesChanged;
function render(){if(!rows)return;hover=null;hoverY=null;$('#tooltip').hidden=true;$('#start').value=rows[lo].date;$('#end').value=rows[hi].date;document.querySelectorAll('[data-period]').forEach(b=>b.classList.toggle('active',b.dataset.period===period));
$('#legend').innerHTML=active().map(m=>`<span><i class="swatch" style="background:${m.color}"></i>${m.name}</span>`).join('');$('#empty').hidden=selected.size>0;
$('#cards').innerHTML=summaryMarkets.map(m=>{let i=hi;while(i>=0&&value(rows[i],m)===null)i--;const v=i>=0?value(rows[i],m):null;let j=i-1;while(j>=0&&value(rows[j],m)===null)j--;const prev=j>=0?value(rows[j],m):null;const change=prev>0&&v!==null?(v/prev-1)*100:null;return `<article class="card"><div class="card-heading"><div class="card-title"><i class="swatch" style="background:${m.color}"></i>${m.name}</div><time class="card-date" ${i>=0?`datetime="${rows[i].date}"`:''}>${i>=0?rows[i].date:'—'}</time></div><div class="card-metrics"><div class="card-value">${fmt(v)}<small>조 원</small></div><span class="card-change ${change===null?'':change>=0?'positive':'negative'}" title="직전 거래일 대비" aria-label="직전 거래일 대비 ${change===null?'비교 없음':change.toFixed(1)+'%'}">${change===null?'—':`${change>=0?'+':''}${change.toFixed(1)}%`}</span></div></article>`;}).join('');draw();}
function draw(){if(!rows||!width)return;ctx.clearRect(0,0,width,height);const left=48,right=15,top=22,bottom=35,w=width-left-right,h=height-top-bottom;const series=active().map(m=>({m,ys:points(m)}));let max=1;for(const s of series)for(const v of s.ys)if(v!==null)max=Math.max(max,v);const step=nice(max/5),ceiling=Math.ceil(max*1.06/step)*step;geometry={left,right,top,bottom,w,h};const x=i=>left+i/Math.max(1,hi-lo)*w,y=v=>top+h-v/ceiling*h;ctx.font='10px "DM Sans",sans-serif';ctx.lineWidth=1;
for(let i=0;i<=5;i++){const v=ceiling*i/5,yy=y(v);ctx.strokeStyle='#292d365f';ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(width-right,yy);ctx.stroke();ctx.fillStyle='#768095';ctx.textAlign='right';ctx.fillText(v.toFixed(v<10?1:0),left-11,yy+3);}
drawCalendarGuides(left,top,bottom,w);
const tickCount=Math.max(2,Math.min(5,Math.floor(w/100)));for(let i=0;i<=tickCount;i++){const ix=Math.round((hi-lo)*i/tickCount),xx=x(ix);ctx.fillStyle='#768095';ctx.textAlign=i===0?'left':i===tickCount?'right':'center';ctx.fillText(rows[lo+ix].date.slice(2).replaceAll('-','.'),xx,height-12);}
for(const {m,ys} of series){
ctx.beginPath();
if(chartStyle==='line'){
ctx.strokeStyle=m.color;ctx.lineWidth=1.7;ctx.lineJoin='round';let open=false;
ys.forEach((v,i)=>{if(v===null){open=false;return;}if(open)ctx.lineTo(x(i),y(v));else ctx.moveTo(x(i),y(v));open=true;});ctx.stroke();
}else{
ctx.fillStyle=m.color;const radius=2.3;
ys.forEach((v,i)=>{if(v!==null){const px=x(i),py=y(v);ctx.moveTo(px+radius,py);ctx.arc(px,py,radius,0,Math.PI*2);}});ctx.fill();
}}
if(hover!==null){const xx=x(hover-lo);ctx.setLineDash([3,4]);ctx.strokeStyle='#8591a0';ctx.beginPath();ctx.moveTo(xx,top);ctx.lineTo(xx,height-bottom);if(hoverY!==null){ctx.moveTo(left,hoverY);ctx.lineTo(width-right,hoverY);}ctx.stroke();ctx.setLineDash([]);for(const s of series){const v=s.ys[hover-lo];if(v!==null){ctx.fillStyle=s.m.color;ctx.beginPath();ctx.arc(xx,y(v),3,0,Math.PI*2);ctx.fill();}}}}
function drawCalendarGuides(left,top,bottom,w){
const start=Date.parse(rows[lo].date+'T00:00:00Z'),end=Date.parse(rows[hi].date+'T00:00:00Z'),day=86400000,spanDays=(end-start)/day;
if(spanDays<=0)return;
const showMonths=w*30.436875/spanDays>=22,yearStep=Math.max(1,Math.ceil(28/(w*365.2425/spanDays)));
const first=new Date(rows[lo].date+'T00:00:00Z');let year=first.getUTCFullYear(),month=first.getUTCMonth()+1;
ctx.save();ctx.lineWidth=1;ctx.setLineDash([]);
while(Date.UTC(year,month,1)<=end){
const boundary=Date.UTC(year,month,1),x=left+(boundary-start)/(end-start)*w,isYear=month===0;
if(isYear&&(year-first.getUTCFullYear())%yearStep===0||!isYear&&showMonths){ctx.strokeStyle=isYear?'#77839645':'#46505f38';ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,height-bottom);ctx.stroke();}
month++;if(month===12){month=0;year++;}
}
ctx.restore();
}
function nice(v){const p=10**Math.floor(Math.log10(v));return [1,2,2.5,5,10].map(n=>n*p).find(n=>n>=v)||p*10;}
new ResizeObserver(entries=>{const rect=entries[0].contentRect;width=rect.width;height=rect.height;const dpr=window.devicePixelRatio||1;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();}).observe($('#plot'));
canvas.addEventListener('pointermove',e=>{if(!rows||!geometry)return;const rect=canvas.getBoundingClientRect(),px=e.clientX-rect.left,py=e.clientY-rect.top;const {left,w}=geometry;if(drag){const span=drag.hi-drag.lo,delta=Math.round((drag.x-e.clientX)/w*span);lo=Math.max(0,Math.min(rows.length-1-span,drag.lo+delta));hi=lo+span;period='custom';render();return;}if(px<left||px>left+w||py<geometry.top||py>geometry.top+geometry.h){$('#tooltip').hidden=true;hover=null;hoverY=null;draw();return;}hoverY=py;hover=lo+Math.max(0,Math.min(hi-lo,Math.round((px-left)/w*(hi-lo))));const tip=$('#tooltip');tip.innerHTML=`<strong>${rows[hover].date}</strong>`+active().map(m=>{const v=value(rows[hover],m);return `<div class="tooltip-row"><span><i class="swatch" style="background:${m.color}"></i>${m.name}</span><span>${fmt(v)+(v===null?'':'조')}</span></div>`;}).join('');tip.hidden=selected.size===0;tip.style.left=Math.max(0,Math.min(width-tip.offsetWidth,px+17))+'px';tip.style.top=Math.max(0,Math.min(height-tip.offsetHeight,py+12))+'px';draw();});
canvas.addEventListener('pointerleave',()=>{if(drag)return;hover=null;hoverY=null;$('#tooltip').hidden=true;draw();});canvas.addEventListener('pointerdown',e=>{if(!rows||e.pointerType==='touch')return;drag={x:e.clientX,lo,hi};canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';});const release=()=>{drag=null;canvas.style.cursor='crosshair';};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
canvas.addEventListener('wheel',e=>{if(!rows||!geometry)return;e.preventDefault();const span=hi-lo+1,next=Math.min(rows.length,Math.max(7,Math.round(span*(e.deltaY>0?1.2:.8))));const fraction=Math.max(0,Math.min(1,(e.clientX-canvas.getBoundingClientRect().left-geometry.left)/geometry.w));const anchor=lo+fraction*(span-1);lo=Math.max(0,Math.min(rows.length-next,Math.round(anchor-fraction*(next-1))));hi=lo+next-1;period='custom';render();},{passive:false});canvas.ondblclick=()=>setPeriod('10y');
try{const response=await fetch(new URL('./data/market-daily.json',import.meta.url),{cache:'no-cache'});if(!response.ok)throw Error('데이터 요청 실패');data=validateMarketData(await response.json());rows=data.rows;
$('.sample-pill').textContent=data.isSample?'샘플 데이터':'현물 · 일별';$('.demo-notice').hidden=!data.isSample;$('.method div').textContent=data.isSample?'현재 데이터는 가상 샘플입니다. 실제 시장 수치가 아닙니다. 주식 합계 = 코스피 + 코스닥, 국내코인 합계 = 업비트 + 빗썸. 주식 휴장일·누락은 빈 값으로 표시하며, 합계는 구성 시장이 모두 존재할 때만 계산합니다. 거래대금은 자금 순유입액을 의미하지 않습니다.':`출처: ${data.metadata.sources} / 날짜 기준: ${data.metadata.dateBoundary} / 환산: ${data.metadata.conversion} / 수집 범위: ${data.metadata.coverage || "출처 안내 참조"}. 주식 합계 = 코스피 + 코스닥, 국내코인 합계 = 업비트 + 빗썸. 거래대금은 자금 순유입액이 아닙니다.`;
$('#updated').textContent=`최신 기록 ${rows.at(-1).date}\n갱신 ${new Date(data.updatedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})} KST`;for(const id of ['start','end']){$('#'+id).min=rows[0].date;$('#'+id).max=rows.at(-1).date;}setPeriod('10y');}catch(error){$('#error').hidden=false;$('#error').textContent='데이터를 불러오지 못했습니다. '+error.message;$('#updated').textContent='데이터 연결 오류';$('#empty').hidden=false;$('#empty').textContent='데이터 연결을 확인해주세요.';}
