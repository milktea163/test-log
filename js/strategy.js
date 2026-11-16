function updateTaskPeriodSelect(){
 const s=document.getElementById('task-test-period-select');s.innerHTML='<option value="default">通常のやることリスト</option>';
 db.testPeriods.forEach(t=>{const o=document.createElement('option');o.value=t.id;o.textContent=t.name;s.appendChild(o)});
 if([...s.options].some(o=>o.value===selectedTaskPeriodId))s.value=selectedTaskPeriodId;else selectedTaskPeriodId='default'
}
function getTaskSource(){if(selectedTaskPeriodId==='default')return db.tasks;db.periodTasks[selectedTaskPeriodId]??={};return db.periodTasks[selectedTaskPeriodId]}
function calcProgress(source,sid){const arr=source[sid]||[];let done=0,total=0;arr.forEach(t=>{for(let r=0;r<(db.globalRepGoal||3);r++){total++;if(t?.checks?.[r])done++}});return {done,total}}
function renderStrategy(){
 updateTaskPeriodSelect();const source=getTaskSource(),root=document.getElementById('task-container'),progress=document.getElementById('strategy-progress');root.innerHTML='';const strategyTest=db.testPeriods.find(t=>t.id===selectedTaskPeriodId);const visibleSubjects=strategyTest?subjectsForTest(strategyTest):db.subjects;
 if(!db.testPeriods.length){root.innerHTML='<div class="empty-action"><p><strong>まだテスト日程がありません。</strong><br>先にカレンダーでテスト日程を登録すると、そのテスト専用の範囲を管理できます。</p><button class="mini-action" onclick="goCalendarRegister()">📅 テスト日程を登録</button></div>';}
 let summary='';
 visibleSubjects.forEach(s=>{const p=calcProgress(source,s.id);if(p.total)summary+=`<div class="progress-row"><div class="progress-label"><span>${escapeHTML(s.icon)} ${escapeHTML(s.name)}</span><span>${p.done}/${p.total}</span></div><div class="bar"><i style="width:${p.total?Math.round(p.done/p.total*100):0}%"></i></div></div>`});
 progress.innerHTML=summary||'<p class="small">範囲を入力すると、ここに進捗が表示されます。</p>';
 visibleSubjects.forEach(s=>{
  const g=document.createElement('div');g.className='task-group';g.innerHTML=`<h3>${escapeHTML(s.icon)} ${escapeHTML(s.name)}</h3>`;
  for(let i=0;i<5;i++){
   const t=source[s.id]?.[i]||{name:'',checks:[]},row=document.createElement('div');row.className='task-row';
   const inp=document.createElement('input');inp.type='text';inp.placeholder='範囲を入力';inp.value=t.name||'';inp.onchange=e=>updateTaskName(s.id,i,e.target.value);row.appendChild(inp);
   const checks=document.createElement('div');checks.className='checks';
   for(let r=0;r<(db.globalRepGoal||3);r++){const b=document.createElement('button');b.className='check'+(t.checks?.[r]?' checked':'');b.onclick=()=>toggleCheck(s.id,i,r);checks.appendChild(b)}
   row.appendChild(checks);g.appendChild(row)
  }root.appendChild(g)
 })
}
function switchTaskPeriod(v){selectedTaskPeriodId=v;renderStrategy()}

function setGlobalRep(n){
 db.globalRepGoal=n;
 save();
 renderStrategy();
 renderHomeProgress();
}

function updateTaskName(sid,i,val){
 const src=getTaskSource();

 src[sid]??=[];
 src[sid][i]??={name:'',checks:[]};
 src[sid][i].name=val;

 save();
 renderStrategy();
 renderHomeProgress();
}

function toggleCheck(sid,i,r){
 const src=getTaskSource();

 src[sid]??=[];
 src[sid][i]??={name:'',checks:[]};
 src[sid][i].checks??=[];
 src[sid][i].checks[r]=!src[sid][i].checks[r];

 save();
 renderStrategy();
 renderHomeProgress();
}
function saveAndCloseTasks(){save();renderHomeStats();showScreen('home')}
