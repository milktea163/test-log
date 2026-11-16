function updateTestDate(v){
 // Legacy compatibility: the old single-date control is no longer the main schedule.
 db.testDate=v||'';save();updateCountdown();
}
function formatDateJP(key){
 if(!key)return '';
 const d=parseDateKey(key);
 const w=['日','月','火','水','木','金','土'][d.getDay()];
 return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${w}）`;
}
function updateCountdown(){
 const d=document.getElementById('countdownDisplay'),name=document.getElementById('nextTestName'),date=document.getElementById('nextTestDate');
 const today=dateKey();
 const candidates=(db.testPeriods||[])
   .filter(x=>x.start&&x.end&&x.end>=today)
   .sort((a,b)=>a.start.localeCompare(b.start));
 const next=candidates[0]||null;
 if(!next){
   name.innerText='テスト日程未登録';
   d.innerText='まずは登録しましょう';
   date.innerText='';
   return;
 }
 name.innerText=next.name;
 date.innerText=formatDateJP(next.start)+(next.end!==next.start?` ～ ${formatDateJP(next.end)}`:'');
 const diff=Math.floor((parseDateKey(next.start)-parseDateKey(today))/86400000);
 d.innerText=diff>0?`あと ${diff} 日！`:diff===0?'🎉 テスト期間スタート！':'テスト期間中';
}

function renderCalendar(){
 renderRecordTestSelect();renderTestSubjectSettings(document.getElementById('subject-test-select')?.value||db.activeRecordTestId);
 const grid=document.getElementById('cal-grid');grid.innerHTML='';const y=calViewDate.getFullYear(),m=calViewDate.getMonth();
 document.getElementById('cal-month-title').innerText=`${y}年 ${m+1}月`;
 const first=new Date(y,m,1).getDay(),last=new Date(y,m+1,0).getDate();for(let i=0;i<first;i++)grid.appendChild(document.createElement('div'));
 for(let d=1;d<=last;d++){
  const dt=new Date(y,m,d),key=dateKey(dt),el=document.createElement('button');el.className='cal-day';el.textContent=d;el.onclick=()=>openDayDetail(key);
  if(key===dateKey())el.classList.add('today');if(db.history[key]||Object.values(db.testHistory||{}).some(th=>th[key]))el.classList.add('has-data');
  let test=false,cls='';
  db.testPeriods.forEach(t=>{const s=parseDateKey(t.start),e=parseDateKey(t.end);s.setHours(0,0,0,0);e.setHours(23,59,59,999);const diff=Math.round((dt-s)/86400000);if(dt>=s&&dt<=e)test=true;else if(diff>=-7&&diff<=-1&&db.countdownDisplayPeriod>=1)cls='w1';else if(diff>=-14&&diff<=-8&&db.countdownDisplayPeriod>=2&&!cls)cls='w2';else if(diff>=-21&&diff<=-15&&db.countdownDisplayPeriod>=3&&!cls)cls='w3'});
  if(test)el.classList.add('test');else if(cls)el.classList.add(cls);grid.appendChild(el)
 }
}
function changeMonth(n){calViewDate.setMonth(calViewDate.getMonth()+n);renderCalendar()}
function openDayDetail(key){
 const logs={...(db.history[key]||{})},d=parseDateKey(key),total=Math.floor(totalForDate(key)/60);Object.values(db.testHistory||{}).forEach(th=>Object.entries(th[key]||{}).forEach(([sid,sec])=>logs[sid]=(Number(logs[sid])||0)+(Number(sec)||0)));
 let month=0;Object.keys(db.history).forEach(k=>{const x=parseDateKey(k);if(x.getFullYear()===d.getFullYear()&&x.getMonth()===d.getMonth())month+=totalForDate(k)});
 let h=`<div class="card"><div class="stat-big">${total}分</div><p>この日の勉強時間</p></div><div class="card"><h3>📚 教科別</h3>`;
 let has=false;db.subjects.forEach(s=>{if(logs[s.id]){has=true;h+=`<p><strong style="color:${escapeHTML(s.color)}">${escapeHTML(s.icon)} ${escapeHTML(s.name)}</strong>：${Math.floor(logs[s.id]/60)}分</p>`}});if(!has)h+='<p class="small">この日の勉強記録はありません。</p>';h+=`</div><div class="card"><h3>📅 ${d.getMonth()+1}月の累計</h3><div class="stat-big" style="color:var(--blue2)">${Math.floor(month/60)}分</div></div>`;
 document.getElementById('day-title').innerText=`${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日の記録`;document.getElementById('day-content').innerHTML=h;document.getElementById('dayModal').classList.add('open')
}

function addTestPeriod(){
 const n=document.getElementById('test-period-name').value.trim(),s=document.getElementById('test-start').value,e=document.getElementById('test-end').value;
 if(!n||!s||!e)return alert('テスト名・開始日・終了日を入力してください。');
 if(e<s)return alert('終了日は開始日以降にしてください。');
 const t={id:`test_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,name:n,start:s,end:e,subjectIds:db.subjects.map(x=>x.id),reflections:{}};
 db.testPeriods.push(t);db.testPeriods.sort((a,b)=>(a.start||'').localeCompare(b.start||''));if(!db.activeRecordTestId)db.activeRecordTestId=t.id;save();renderRecordTestSelect();renderTestSubjectSettings(t.id);renderSubjectButtons();document.getElementById('test-period-name').value='';document.getElementById('test-start').value='';document.getElementById('test-end').value='';renderCalendar();updateCountdown();renderReflectionList();alert('テスト日程を登録しました。')
}
function updateCountdownPeriod(v){db.countdownDisplayPeriod=Number(v);save();renderCalendar()}
function openReportModal(){renderReflectionList();document.getElementById('reportModal').classList.add('open')}
function renderReflectionList(){
 const root=document.getElementById('reflection-list'),modalRoot=document.getElementById('test-period-list');root.innerHTML='';modalRoot.innerHTML='';
 if(!db.testPeriods.length){root.innerHTML='<div class="empty">まだテスト期間が登録されていません。<br>「テスト日程を登録」から登録できます。</div>';modalRoot.innerHTML='<div class="empty">「テスト日程を登録」からテスト期間を登録すると、ここから振り返りができます。</div>';return}
 db.testPeriods.forEach(t=>{
  const wrap=document.createElement('div');wrap.className='test-item';
  const b=document.createElement('button');b.className='secondary open-test';b.innerHTML=`<strong>${escapeHTML(t.name)}</strong><br><span style="font-size:.75rem">${escapeHTML(t.start)} ～ ${escapeHTML(t.end)}</span>`;b.onclick=()=>openTestDetail(t.id);
  const del=document.createElement('button');del.className='danger';del.textContent='削除';del.onclick=()=>deleteTestPeriod(t.id);wrap.append(b,del);root.appendChild(wrap);
  modalRoot.appendChild(wrap.cloneNode(true));const last=modalRoot.lastChild;last.querySelector('.open-test').onclick=()=>openTestDetail(t.id);last.querySelector('.danger').onclick=()=>deleteTestPeriod(t.id);
 })
}
function deleteTestPeriod(id){
 const t=db.testPeriods.find(x=>x.id===id);if(!t)return;
 if(!confirm(`「${t.name}」を削除しますか？\nこのテストの攻略タスクと振り返りも関連付けが解除されます。`))return;
 db.testPeriods=db.testPeriods.filter(x=>x.id!==id);delete db.periodTasks[id];if(db.activeRecordTestId===id)db.activeRecordTestId=db.testPeriods[0]?.id||'';save();renderRecordTestSelect();renderSubjectButtons();renderCalendar();renderReflectionList();updateCountdown()
}
function openTestDetail(id){
 detailTestId=id;const t=db.testPeriods.find(x=>x.id===id);if(!t)return;
 document.getElementById('detail-test-title').innerText=t.name;if(!t.reflections)t.reflections={};
 const totals={};db.subjects.forEach(s=>totals[s.id]=0);let cur=parseDateKey(t.start);cur.setDate(cur.getDate()-14);const end=parseDateKey(t.end);
 while(cur<=end){const k=dateKey(cur),scoped=(db.testHistory[t.id]||{})[k]||{};db.subjects.forEach(s=>totals[s.id]+=(Object.keys(scoped).length?scoped[s.id]||0:db.history[k]?.[s.id]||0));cur.setDate(cur.getDate()+1)}
 let table='<table class="extended"><tr><th>教科</th>'+Array.from({length:120},(_,i)=>`<th>${(i+1)%5===0?i+1:''}</th>`).join('')+'<th>合計</th></tr>';
 let refs='';
 subjectsForTest(t).forEach(s=>{
  const sec=totals[s.id]||0,m=Math.floor(sec/60),blocks=Math.floor(sec/900);table+=`<tr><td><strong>${escapeHTML(s.name)}</strong></td>`;for(let j=1;j<=120;j++)table+=`<td><div class="fill" style="background:${j<=blocks?escapeHTML(s.color):'transparent'}"></div></td>`;table+=`<td><strong>${m}分</strong></td></tr>`;
  const reflectionText=escapeHTML(t.reflections?.[s.id]||'');
  refs+=`<div class="reflection"><h3 style="margin-top:0">${escapeHTML(s.icon||'📚')} ${escapeHTML(s.name)}</h3><p class="small">この期間の勉強時間：<strong>${m}分</strong></p><label style="display:block;font-weight:900;margin:10px 0 5px;text-align:left">振り返り</label><textarea data-ref="${escapeHTML(s.id)}" placeholder="できたこと・苦手だったこと・次に活かすことを入力">${reflectionText}</textarea></div>`
 });table+='</table>';
 document.getElementById('period-time-grid-root').innerHTML=table;document.getElementById('detail-subject-list').innerHTML=refs;
 document.querySelectorAll('#detail-subject-list textarea').forEach(a=>a.addEventListener('change',e=>saveReflection(detailTestId,e.target.dataset.ref,e.target.value)));
 document.getElementById('reportModal').classList.remove('open');document.getElementById('testDetailModal').classList.add('open')
}
function saveReflection(id,sid,v){const t=db.testPeriods.find(x=>x.id===id);if(!t)return;t.reflections??={};t.reflections[sid]=v;save()}
function closeTestDetail(){document.getElementById('testDetailModal').classList.remove('open');showScreen('reflection')}