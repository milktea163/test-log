
function initTimer(min){
 if(isRunning)return;

 const minutes=Number(min);
 if(!Number.isFinite(minutes)||minutes<=0)return;

 presetSeconds=Math.floor(minutes*60);
 timerSeconds=presetSeconds;
 sessionRecordedSeconds=0;
 timerStartedAt=null;
 timerCompletedCycles=0;

 updateTimerDisplay();

 const status=document.getElementById('timer-status');
 if(status)status.innerText='停止中';
}

function updateTimerDisplay(){
 const safe=Math.max(0,Number(timerSeconds)||0);
 const m=Math.floor(safe/60);
 const s=safe%60;

 const el=document.getElementById('timer-display');
 if(el)el.innerText=`00:${pad(m)}:${pad(s)}`;
}

function setTimerRunningUI(){
 const btn=document.getElementById('start-btn');
 const status=document.getElementById('timer-status');

 if(btn)btn.innerText='■ STOP';

 if(status){
  status.innerText=
   `測定中：${db.subjects.find(s=>s.id===currentSubject)?.name||''}`;
 }
}

function setTimerStoppedUI(){
 const btn=document.getElementById('start-btn');
 const status=document.getElementById('timer-status');

 if(btn)btn.innerText='▶ START';
 if(status)status.innerText='停止中';
}

function persistSessionProgress(){

  if(!isRunning||timerStartedAt===null)return;

  const elapsed=Math.max(
    0,
    Math.floor((Date.now()-timerStartedAt)/1000)
  );

  const delta=Math.max(
    0,
    elapsed-sessionRecordedSeconds
  );

  if(delta>0){

    // 保存の成否にかかわらず、計測時間はDBに反映する
    // 保存失敗時も次の保存機会にまとめて保存できる
    sessionRecordedSeconds=elapsed;

    recordTime(delta);
  }
}

// 実際の時刻を基準にタイマーを更新する
function updateTimerFromClock(){
 if(!isRunning||timerStartedAt===null||presetSeconds<=0)return;

 const elapsed=Math.max(
  0,
  Math.floor((Date.now()-timerStartedAt)/1000)
 );

 const completedCycles=Math.floor(elapsed/presetSeconds);
 const withinCycle=elapsed%presetSeconds;

 if(completedCycles>timerCompletedCycles){
  try{playAlertSound()}catch(e){}

  timerCompletedCycles=completedCycles;
  setTimerRunningUI();
 }

 timerSeconds=presetSeconds-withinCycle;

 persistSessionProgress();

 updateTimerDisplay();
 updateLiveSessionStatus();
}

function startTimerInterval(){
 clearInterval(timerInterval);

 timerInterval=setInterval(()=>{
  if(!isRunning)return;

  updateTimerFromClock();
 },1000);
}

function toggleTimer(){
 initAudio();

 if(!isRunning){
  if(presetSeconds<=0)return;

  if(timerSeconds<=0)timerSeconds=presetSeconds;

  sessionRecordedSeconds=0;
  timerCompletedCycles=0;
  timerStartedAt=Date.now();
  isRunning=true;

  setTimerRunningUI();
  updateTimerDisplay();
  updateLiveSessionStatus();

  startTimerInterval();

 }else{
  // STOP直前までの時間を確実に記録
  updateTimerFromClock();

  clearInterval(timerInterval);
  timerInterval=null;

  isRunning=false;
  timerStartedAt=null;

  timerSeconds=presetSeconds;
  sessionRecordedSeconds=0;
  timerCompletedCycles=0;

  updateTimerDisplay();
  setTimerStoppedUI();
  updateLiveSessionStatus();

  // STOP後に一度だけ関連画面を更新
  refreshRecordViews();
 }
}

function resetTimer(){
 if(isRunning)return;

 timerSeconds=presetSeconds;
 sessionRecordedSeconds=0;
 timerStartedAt=null;
 timerCompletedCycles=0;

 updateTimerDisplay();
 setTimerStoppedUI();
 updateLiveSessionStatus();
}

function updateLiveSessionStatus(){
 const el=document.getElementById('timer-status');
 if(!el)return;

 if(isRunning){
  const live=Math.max(0,Math.floor(sessionRecordedSeconds));
  const m=Math.floor(live/60);
  const s=live%60;

  el.innerText=
   `測定中：${db.subjects.find(sub=>sub.id===currentSubject)?.name||''}（記録 ${m}分${s?` ${s}秒`:''}）`;
 }
}
