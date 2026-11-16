function recordTime(sec){

  sec=Number(sec)||0;

  if(sec<=0)return true;

  if(
    !currentSubject||
    !db.subjects.some(s=>s.id===currentSubject)
  ){
    console.warn('記録対象の教科が見つかりません。');
    return false;
  }

  const today=dateKey();
  const test=getRecordTest();

  if(test){

    db.testHistory[test.id]??={};
    db.testHistory[test.id][today]??={};

    db.testHistory[test.id][today][currentSubject]=
      (Number(db.testHistory[test.id][today][currentSubject])||0)+sec;

  }else{

    db.history[today]??={};

    db.history[today][currentSubject]=
      (Number(db.history[today][currentSubject])||0)+sec;
  }

  // 保存失敗時もアプリ内の記録は保持する
  return save();
}

// 学習記録に関係する画面をまとめて更新する
function refreshRecordViews(){
 try{renderCalendar()}catch(e){console.error('カレンダー更新エラー',e)}
 try{renderTimeGrid()}catch(e){console.error('記録一覧更新エラー',e)}
 try{updateChart()}catch(e){console.error('グラフ更新エラー',e)}
 try{renderHomeStats()}catch(e){console.error('ホーム更新エラー',e)}
 try{renderStrategy()}catch(e){console.error('攻略画面更新エラー',e)}
}

function renderHomeProgress(){
 const root=document.getElementById('homeProgress');
 const hint=document.getElementById('homeProgressHint');

 if(!root||!hint)return;

 const today=dateKey();

 const next=(db.testPeriods||[])
  .filter(t=>t.start&&t.end&&t.end>=today)
  .sort((a,b)=>a.start.localeCompare(b.start))[0];

 if(!next){
  hint.innerText='まずは設定';
  root.innerHTML='<div class="empty-action"><p>まずはテスト日程を登録しましょう。</p><button class="mini-action" onclick="goCalendarRegister()">📅 テスト日程を登録</button></div>';
  return;
 }

 const source=db.periodTasks?.[next.id]||{};
 const goal=Math.max(1,Math.floor(Number(db.globalRepGoal)||3));

 let total=0;
 let done=0;

 // そのテストで対象になっている教科だけを集計
 const targetSubjects=subjectsForTest(next);

 targetSubjects.forEach(subject=>{
  const tasks=Array.isArray(source[subject.id])
   ?source[subject.id]
   :[];

  tasks.forEach(task=>{
   // 名前が入力されている課題だけを集計
   if(!task||typeof task.name!=='string'||!task.name.trim()){
    return;
   }

   const checks=Array.isArray(task.checks)
    ?task.checks
    :[];

   for(let r=0;r<goal;r++){
    total++;

    if(checks[r]){
     done++;
    }
   }
  });
 });

 const pct=total
  ?Math.round(done/total*100)
  :0;

 hint.innerText=total
  ?`${done}/${total}完了`
  :'範囲を設定';

 root.innerHTML=`
  <div class="progress-summary">
   <div class="progress-label">
    <span>${escapeHTML(next.name)}</span>
    <span>${pct}%</span>
   </div>
   <div class="bar">
    <i style="width:${pct}%"></i>
   </div>
   <p class="small" style="margin:8px 0 0">
    ${total
     ?`攻略進捗 ${done}/${total}`
     :'「攻略」からテスト範囲を入力できます。'}
   </p>
  </div>`;
}

function totalForDate(key){const legacy=Object.values(db.history[key]||{}).reduce((a,b)=>a+(Number(b)||0),0);const scoped=Object.values(db.testHistory||{}).reduce((sum,th)=>sum+Object.values(th[key]||{}).reduce((a,b)=>a+(Number(b)||0),0),0);return legacy+scoped}
function renderHomeStats(){
 const today=dateKey(),logs=(getRecordTest()?.id?((db.testHistory[getRecordTest().id]||{})[today]||{}):(db.history[today]||{})),total=Math.floor(Object.values(logs).reduce((a,b)=>a+(Number(b)||0),0)/60);
 document.getElementById('todayTotal').innerText=`${total}分`;
 const root=document.getElementById('todayBreakdown');root.innerHTML='';
 const active=db.subjects.filter(s=>(logs[s.id]||0)>0).sort((a,b)=>(logs[b.id]||0)-(logs[a.id]||0));
 active.slice(0,3).forEach(s=>{const d=document.createElement('div');d.className='badge';d.innerHTML=`${escapeHTML(s.icon)} ${escapeHTML(s.name)}<br><strong>${Math.floor(logs[s.id]/60)}分</strong>`;root.appendChild(d)});
 if(!active.length)root.innerHTML='<div class="badge" style="grid-column:1/-1">まだ記録がありません</div>';
 const more=document.getElementById('todayBreakdownMore');
 if(more)more.innerText=active.length>3?`ほか${active.length-3}教科の記録があります。「今日の記録を見る」から確認できます。`:'';
 renderHomeProgress()
}
function renderTimeGrid(){
 const key=dateKey(),logs=(getRecordTest()?.id?((db.testHistory[getRecordTest().id]||{})[key]||{}):(db.history[key]||{})),root=document.getElementById('time-grid-root'),c=document.getElementById('live-counters');
 let counter='';
 db.subjects.forEach(s=>{counter+=`<div class="badge">${escapeHTML(s.icon)} ${escapeHTML(s.name)}<br><strong style="color:${escapeHTML(s.color)}">${Math.floor((logs[s.id]||0)/60)}分</strong></div>`});
 c.innerHTML=counter||'<div class="badge">記録なし</div>';
 let h='<table class="time-table"><tr><th>教科</th>'+Array.from({length:15},(_,i)=>`<th>${(i+1)*15}</th>`).join('')+'<th>合計</th></tr>';
 db.subjects.forEach(s=>{const sec=logs[s.id]||0,blocks=Math.floor(sec/900);h+=`<tr><td><strong>${escapeHTML(s.name)}</strong></td>`;for(let j=1;j<=15;j++)h+=`<td><div class="fill" style="background:${j<=blocks?escapeHTML(s.color):'transparent'}"></div></td>`;h+=`<td><strong>${Math.floor(sec/60)}分</strong></td></tr>`});
 root.innerHTML=h+'</table>'
}