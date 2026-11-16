let currentSubject=db.subjects[0]?.id||'';
let timerSeconds=900,presetSeconds=900,timerInterval=null,isRunning=false;
let calViewDate=new Date(),selectedTaskPeriodId='default',audioCtx=null,radarChart=null,pieChart=null,detailTestId=null,balanceRange='today';
let sessionRecordedSeconds=0;
let timerStartedAt=null;
let timerCompletedCycles=0;

function enterApp(){
  try{initAudio()}catch(e){}
  if(window.enterAppSafe) return window.enterAppSafe();
  document.getElementById('guideModal')?.classList.add('open');
}
function closeGuide(){
  if(window.closeGuideSafe) return window.closeGuideSafe();
  document.getElementById('guideModal')?.classList.remove('open');
  document.getElementById('welcome')?.classList.add('hide');
}
function closeModal(id){document.getElementById(id).classList.remove('open')}
function scrollToId(id){document.getElementById(id)?.scrollIntoView({behavior:'smooth'})}

function showScreen(id){
 document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));
 document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.screen===id));
 if(id==='strategy')renderStrategy();
 if(id==='calendar')renderCalendar();
 if(id==='reflection')renderReflectionList();
 if(id==='settings'){renderSubjectSettings();document.getElementById('countdown-period-select').value=db.countdownDisplayPeriod}
 window.scrollTo({top:0,behavior:'smooth'});
}

function goCalendarRegister(){showScreen('calendar');setTimeout(()=>scrollToId('testScheduleCard'),80)}
function dismissFirstGuide(){
 const el=document.getElementById('firstGuide');if(el)el.classList.add('hidden');
 localStorage.setItem('studyLogV28_firstGuideDismissed','1');
}
function showFirstGuide(){
 const el=document.getElementById('firstGuide');if(!el)return;
 const dismissed=localStorage.getItem('studyLogV28_firstGuideDismissed')==='1';
 el.classList.toggle('hidden',dismissed);
}
function goHomeAndScroll(id){showScreen('home');setTimeout(()=>scrollToId(id),80)}

function boot(){
    // 保存データが破損している場合は通常起動を停止
  if(dataLoadBlocked){
    alert(
      '保存データを正常に読み込めませんでした。\n\n' +
      '元のデータは保護されています。\n' +
      'データの上書きを防ぐため、通常起動を停止しました。\n\n' +
      'バックアップからの復旧が必要です。'
    );

    return;
  }
 const snd=localStorage.getItem('studyLogSound');
 if(snd===null){
   document.getElementById('sound-toggle-settings').checked=true;
   localStorage.setItem('studyLogSound','1');
 }else{
   document.getElementById('sound-toggle-settings').checked=snd==='1';
 }
 document.getElementById('countdown-period-select').value=db.countdownDisplayPeriod;
 renderRecordTestSelect();renderTestSubjectSettings();renderSubjectButtons();renderSubjectSettings();renderHomeStats();renderTimeGrid();renderCalendar();renderStrategy();renderReflectionList();updateCountdown();showFirstGuide();save();
 if(window.Chart){
  const pieEl=document.getElementById('pieChart');
  if(pieEl){
   pieChart=new Chart(pieEl,{type:'pie',data:{labels:[],datasets:[{data:[],backgroundColor:[]}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{font:{size:11}}}}}});
  }
 }
 updateChart();
 document.querySelector('.nav button[data-screen="home"]').classList.add('active');
}
window.addEventListener('load',boot);


document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='visible'&&isRunning){
  try{
   // バックグラウンド中の経過時間も正確に記録
   updateTimerFromClock();

   // 関連画面をまとめて更新
   refreshRecordViews();

  }catch(e){
   console.error('バックグラウンド復帰時の更新エラー',e);
  }
 }
});
