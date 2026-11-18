function getBalanceSeconds(range){
 const out={};db.subjects.forEach(x=>out[x.id]=0);
 const today=dateKey();
 if(range==='today'){
   const t=getRecordTest(),h=t?((db.testHistory[t.id]||{})[today]||{}):(db.history[today]||{});
   db.subjects.forEach(x=>out[x.id]=Number(h[x.id]||0));
 }else if(range==='week'){
   for(let i=0;i<7;i++){
     const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);
     const t=getRecordTest(),h=t?((db.testHistory[t.id]||{})[dateKey(d)]||{}):(db.history[dateKey(d)]||{});
     db.subjects.forEach(x=>out[x.id]+=Number(h[x.id]||0));
   }
 }else{
   const ps=(db.testPeriods||[]).filter(x=>x.start&&x.end&&x.end>=today).sort((a,b)=>a.start.localeCompare(b.start));
   const p=getRecordTest()||ps[0]||null;
   if(p){
     const start=parseDateKey(p.start);start.setDate(start.getDate()-14); // 14日前を含める
     const end=parseDateKey(p.end);
     for(let d=start;d<=end;d.setDate(d.getDate()+1)){
       const k=dateKey(d),scoped=(db.testHistory[p.id]||{})[k]||{};
       db.subjects.forEach(x=>out[x.id]+=Number(scoped[x.id]||0));
       if(!Object.keys(scoped).length){const legacy=db.history[k]||{};db.subjects.forEach(x=>out[x.id]+=Number(legacy[x.id]||0));}
     }
   }
 }
 return out;
}
function setBalanceRange(r){
 balanceRange=r;
 document.querySelectorAll('[data-balance-range]').forEach(b=>b.classList.toggle('active',b.dataset.balanceRange===r));
 updateChart();
}
function showChartDetail(id){
 const v=getBalanceSeconds(balanceRange),s=db.subjects.find(x=>x.id===id);if(!s)return;
 const total=Object.values(v).reduce((a,b)=>a+b,0),sec=Number(v[id]||0),pct=total?Math.round(sec/total*100):0;
 document.getElementById('chartDetailTitle').innerText=(s.icon||'📚')+' '+s.name;
 document.getElementById('chartDetailBody').innerHTML='<div class="detail-stat"><span>勉強時間</span><strong>'+formatStudyTime(sec)+'</strong></div><div class="detail-stat"><span>全体に占める割合</span><strong>'+pct+'%</strong></div><div class="detail-stat"><span>期間</span><strong>'+(balanceRange==='today'?'今日':balanceRange==='week'?'今週':'次のテスト期間')+'</strong></div>';
 document.getElementById('chartDetailModal').classList.add('open');
}
function closeChartDetail(){document.getElementById('chartDetailModal').classList.remove('open')}
function formatStudyTime(sec){
 sec=Math.max(0,Math.floor(Number(sec)||0));
 const m=Math.floor(sec/60),s=sec%60;
 return s?`${m}分${s}秒`:`${m}分`;
}
function updateChart(){
 const v=getBalanceSeconds(balanceRange);
 const active=db.subjects.filter(s=>(v[s.id]||0)>0);
 const max=Math.max(1,...db.subjects.map(s=>Number(v[s.id]||0)));
 const root=document.getElementById('subjectBalanceBars');
 if(root){
   root.innerHTML=db.subjects.map(s=>{
     const sec=Number(v[s.id]||0),pct=sec?Math.max(2,Math.round(sec/max*100)):0;
     return `<div class="subject-balance-row" onclick="showChartDetail('${escapeHTML(s.id)}')"><div class="subject-balance-label">${escapeHTML(s.icon||'📚')} ${escapeHTML(s.name)}</div><div class="subject-balance-track"><i style="width:${pct}%;background:${escapeHTML(s.color||'#ffafcc')}"></i></div><div class="subject-balance-min">${formatStudyTime(sec)}</div></div>`;
   }).join('');
 }
 if(pieChart){
   const labels=active.map(s=>s.name),data=active.map(s=>Math.max(0.01,Number(v[s.id]||0)));
   pieChart.data.labels=labels.length?labels:['まだ記録がありません'];
   pieChart.data.datasets[0].data=labels.length?data:[1];
   pieChart.data.datasets[0].backgroundColor=labels.length?active.map(s=>s.color||'#ffafcc'):['#eee'];
   pieChart.update('none');
 }
 const n=document.getElementById('balanceNumbers');
 if(n){
   const total=Object.values(v).reduce((a,b)=>a+b,0);
   n.innerHTML=active.length?active.map(s=>{const sec=Number(v[s.id]||0),p=total?Math.round(sec/total*100):0;return `<button type="button" class="balance-number" onclick="showChartDetail('${escapeHTML(s.id)}')"><span>${escapeHTML(s.icon||'📚')} ${escapeHTML(s.name)}</span><strong>${formatStudyTime(sec)} · ${p}%</strong></button>`}).join(''):'<div class="balance-empty" style="grid-column:1/-1">この期間の勉強記録はまだありません。</div>';
 }
}

/* =========================
   今日の詳細記録：タブ切り替え
========================= */

function switchTodayDetailTab(tab){

  const timePanel = document.getElementById('today-time-panel');
  const chartPanel = document.getElementById('today-chart-panel');

  const timeTab = document.getElementById('today-time-tab');
  const chartTab = document.getElementById('today-chart-tab');

  if(!timePanel || !chartPanel || !timeTab || !chartTab){
    return;
  }

  const showTime = tab === 'time';

  timePanel.classList.toggle('active', showTime);
  chartPanel.classList.toggle('active', !showTime);

  timePanel.hidden = !showTime;
  chartPanel.hidden = showTime;

  timeTab.classList.toggle('active', showTime);
  chartTab.classList.toggle('active', !showTime);

  timeTab.setAttribute('aria-selected', String(showTime));
  chartTab.setAttribute('aria-selected', String(!showTime));

  // グラフを表示したときにサイズを再調整する
  if(!showTime){
    updateChart();

    if(pieChart){
      requestAnimationFrame(() => {
        pieChart.resize();
      });
    }
  }
}