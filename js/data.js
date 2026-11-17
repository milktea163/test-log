/* =========================
   V28 data / migration
========================= */
const STORAGE_KEY='studyLogStable';
const BACKUP_KEY='studyLogStable_V28_backup';
const LEGACY_PREFIX='__v27';
let db={};

// 読み込みに失敗したデータを保護するための情報
let rawStoredData=null;
let dataLoadBlocked=false;
let dataLoadError=null;
// 保存失敗状態の管理
let storageSaveFailed=false;
let saveFailureNotified=false;

try{
  rawStoredData=localStorage.getItem(STORAGE_KEY);

  if(rawStoredData!==null){
    const parsed=JSON.parse(rawStoredData);

    if(!parsed || typeof parsed!=='object' || Array.isArray(parsed)){
      throw new Error('保存データの形式が正しくありません。');
    }

    db=parsed;
  }else{
    db={};
  }

}catch(e){
  // 元の保存データは削除しない
  db={};
  dataLoadBlocked=true;
  dataLoadError=e;

  console.error(
    'StudyLog: 保存データを読み込めませんでした。元データを保護しています。',
    e
  );
}

if(!db.subjects) db.subjects=[
 {id:'kokugo',name:'文学国語',color:'#e83e8c',icon:'📖'},
 {id:'sugaku',name:'数学探究',color:'#00bcd4',icon:'📐'},
 {id:'kagaku',name:'科学',color:'#8bc34a',icon:'🔬'},
 {id:'seikei',name:'政治経済',color:'#ff5722',icon:'⚖️'},
 {id:'nihonshi',name:'日本史探究',color:'#ff9800',icon:'🏯'},
 {id:'eikomi',name:'英コミ',color:'#9c27b0',icon:'💬'},
 {id:'kateika',name:'家庭科',color:'#2196f3',icon:'🍳'},
 {id:'chiri',name:'地理',color:'#4caf50',icon:'🗺️'},
 {id:'hoken',name:'保健体育',color:'#795548',icon:'🏃'}
];
if(!db.history)db.history={};
if(!db.tasks)db.tasks={};
if(!db.periodTasks)db.periodTasks={};
if(!db.testPeriods)db.testPeriods=[];
if(!db.testHistory)db.testHistory={};
if(!db.activeRecordTestId)db.activeRecordTestId='';
if(db.countdownDisplayPeriod===undefined)db.countdownDisplayPeriod=1;
if(db.testDate===undefined)db.testDate='';
if(db.globalRepGoal===undefined)db.globalRepGoal=3;

/* =========================
   V28 data validation
========================= */


// 各データ項目の形式を確認する

// 科目データが配列でなければ初期科目を設定する
if(!Array.isArray(db.subjects) || db.subjects.length===0) db.subjects=[
 {id:'kokugo',name:'文学国語',color:'#e83e8c',icon:'📖'},
 {id:'sugaku',name:'数学探究',color:'#00bcd4',icon:'📐'},
 {id:'kagaku',name:'科学',color:'#8bc34a',icon:'🔬'},
 {id:'seikei',name:'政治経済',color:'#ff5722',icon:'⚖️'},
 {id:'nihonshi',name:'日本史探究',color:'#ff9800',icon:'🏯'},
 {id:'eikomi',name:'英コミ',color:'#9c27b0',icon:'💬'},
 {id:'kateika',name:'家庭科',color:'#2196f3',icon:'🍳'},
 {id:'chiri',name:'地理',color:'#4caf50',icon:'🗺️'},
 {id:'hoken',name:'保健体育',color:'#795548',icon:'🏃'}
];

// 科目データの中に不正な要素があれば除外する
db.subjects=db.subjects.filter(s=>
  s &&
  typeof s==='object' &&
  !Array.isArray(s) &&
  typeof s.id==='string' &&
  typeof s.name==='string'
);

// 有効な科目が1つも残らなかった場合は初期科目に戻す
if(db.subjects.length===0) db.subjects=[
 {id:'kokugo',name:'文学国語',color:'#e83e8c',icon:'📖'},
 {id:'sugaku',name:'数学探究',color:'#00bcd4',icon:'📐'},
 {id:'kagaku',name:'科学',color:'#8bc34a',icon:'🔬'},
 {id:'seikei',name:'政治経済',color:'#ff5722',icon:'⚖️'},
 {id:'nihonshi',name:'日本史探究',color:'#ff9800',icon:'🏯'},
 {id:'eikomi',name:'英コミ',color:'#9c27b0',icon:'💬'},
 {id:'kateika',name:'家庭科',color:'#2196f3',icon:'🍳'},
 {id:'chiri',name:'地理',color:'#4caf50',icon:'🗺️'},
 {id:'hoken',name:'保健体育',color:'#795548',icon:'🏃'}
];

if(!db.history || typeof db.history!=='object' || Array.isArray(db.history)) db.history={};
if(!db.tasks || typeof db.tasks!=='object' || Array.isArray(db.tasks)) db.tasks={};
if(!db.periodTasks || typeof db.periodTasks!=='object' || Array.isArray(db.periodTasks)) db.periodTasks={};
if(!Array.isArray(db.testPeriods)) db.testPeriods=[];
if(!db.testHistory || typeof db.testHistory!=='object' || Array.isArray(db.testHistory)) db.testHistory={};

if(typeof db.activeRecordTestId!=='string') db.activeRecordTestId='';
if(typeof db.testDate!=='string') db.testDate='';
if(!Number.isFinite(Number(db.countdownDisplayPeriod))) db.countdownDisplayPeriod=1;
if(!Number.isFinite(Number(db.globalRepGoal)) || Number(db.globalRepGoal)<1) db.globalRepGoal=3;


function pad(n){return String(n).padStart(2,'0')}
function dateKey(d=new Date()){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function parseDateKey(k){const a=k.split('-').map(Number);return new Date(a[0],a[1]-1,a[2])}
function escapeHTML(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function migrate(){
  const migrated=localStorage.getItem('studyLogStable_V28_migrated');
  if(!migrated){
    try{localStorage.setItem(BACKUP_KEY,JSON.stringify(db));}catch(e){}
    // V27's locale date keys are converted to stable YYYY-MM-DD keys.
    const h={};
    Object.entries(db.history||{}).forEach(([k,v])=>{
      let key=k;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(k)){
        const d=new Date(k);
        if(!isNaN(d.getTime())) key=dateKey(d);
      }
      h[key]=Object.assign(h[key]||{},v);
    });
    db.history=h;
    // Give every test period a stable ID while retaining all original properties.
    db.testPeriods=(db.testPeriods||[]).map((t,i)=>({...t,id:t.id||`test_${Date.now()}_${i}_${Math.random().toString(36).slice(2,7)}`,subjectIds:Array.isArray(t.subjectIds)?t.subjectIds:(db.subjects||[]).map(s=>s.id)}));
    // Move legacy periodTasks from numeric indices to stable IDs where possible.
    const pt={};
    Object.entries(db.periodTasks||{}).forEach(([k,v])=>{
      const idx=Number(k); const t=db.testPeriods[idx];
      if(t) pt[t.id]=v;
    });
    if(Object.keys(pt).length)db.periodTasks=pt;
    
    // 移行後のデータを先に保存する
    localStorage.setItem(STORAGE_KEY,JSON.stringify(db));

    // 保存できた場合にのみ移行済みとする
    localStorage.setItem('studyLogStable_V28_migrated','1');

  }else{
    // Safety normalization for later loads.
    db.testPeriods=(db.testPeriods||[]).map((t,i)=>({...t,id:t.id||`test_legacy_${i}`,subjectIds:Array.isArray(t.subjectIds)?t.subjectIds:(db.subjects||[]).map(s=>s.id)}));
  }
}
if(!dataLoadBlocked){
  migrate();
}

// Restore the test schedule from its dedicated copies when the main DB was reset/overwritten.
try{
 const savedTestDate=localStorage.getItem('studyLogV28_testDate');
 const savedPeriods=localStorage.getItem('studyLogV28_testPeriods');
 if((!db.testDate) && savedTestDate) db.testDate=savedTestDate;
 if((!db.testPeriods || !db.testPeriods.length) && savedPeriods){
   const parsed=JSON.parse(savedPeriods);
   if(Array.isArray(parsed)) db.testPeriods=parsed;
 }
}catch(e){}
if(db.testDate===undefined)db.testDate='';
if(!Array.isArray(db.testPeriods))db.testPeriods=[];
// 不正なテスト期間データを除外する
db.testPeriods=db.testPeriods.filter(t=>
  t &&
  typeof t==='object' &&
  !Array.isArray(t)
);
if(!db.testHistory||typeof db.testHistory!=='object')db.testHistory={};
db.testPeriods=db.testPeriods.map(t=>({...t,subjectIds:Array.isArray(t.subjectIds)?t.subjectIds:db.subjects.map(s=>s.id)}));
if(!db.activeRecordTestId && db.testPeriods.length)db.activeRecordTestId=db.testPeriods.filter(t=>t.start&&t.end&&t.end>=dateKey()).sort((a,b)=>a.start.localeCompare(b.start))[0]?.id||db.testPeriods[0].id;
if(!dataLoadBlocked){
  try{
    localStorage.setItem(STORAGE_KEY,JSON.stringify(db));
  }catch(e){
    console.error('StudyLog: 起動時の保存に失敗しました。',e);
  }
}


/* =========================
   安全なデータ変更・保存
========================= */

// 変更前のデータを複製する
function cloneDb(){
  return JSON.parse(JSON.stringify(db));
}

// 保存に失敗した場合は変更前の状態に戻す
function saveDbMutation(previousDb){

  if(save()){
    return true;
  }

  db=previousDb;
  return false;
}

// データを保存する
function save(){

  // 読み込みに失敗したデータは上書きしない
  if(dataLoadBlocked){

    console.error(
      'StudyLog: データが保護されているため保存を停止しました。',
      dataLoadError
    );

    if(!saveFailureNotified){
      alert(
        '保存データを正常に読み込めなかったため、保存を停止しています。\n\n' +
        '元のデータは削除・上書きしていません。\n' +
        'バックアップからの復旧が必要です。'
      );

      saveFailureNotified=true;
    }

    storageSaveFailed=true;
    return false;
  }

  // メインデータを保存
  try{

    const payload=JSON.stringify(db);
    localStorage.setItem(STORAGE_KEY,payload);

  }catch(e){

    console.error(
      'StudyLog: データ保存に失敗しました。',
      e
    );

    storageSaveFailed=true;

    if(!saveFailureNotified){
      alert(
        'データを保存できませんでした。\n\n' +
        'ブラウザの保存容量が不足している可能性があります。\n\n' +
        'アプリを閉じたり再読み込みしたりせず、' +
        '保存容量を確認してください。'
      );

      saveFailureNotified=true;
    }

    return false;
  }

  // テスト日程の予備データを保存
  try{

    localStorage.setItem(
      'studyLogV28_testDate',
      db.testDate||''
    );

    localStorage.setItem(
      'studyLogV28_testPeriods',
      JSON.stringify(db.testPeriods||[])
    );

  }catch(e){

    console.warn(
      'StudyLog: テスト日程の予備保存に失敗しました。',
      e
    );
  }

  // 保存成功
  storageSaveFailed=false;
  saveFailureNotified=false;

  return true;
}


// 未保存データがある状態で画面を離れる際に警告する
window.addEventListener('beforeunload',function(e){

  if(storageSaveFailed){

    e.preventDefault();
    e.returnValue='';
  }

});


/* =========================
   アプリ共通通知機能
========================= */

function showToast(message,type='success'){

  // 通知要素を取得
  let toast=document.getElementById('app-toast');

  // 通知要素がなければ新しく作成
  if(!toast){

    toast=document.createElement('div');

    toast.id='app-toast';
    toast.setAttribute('role','status');
    toast.setAttribute('aria-live','polite');

    document.body.appendChild(toast);
  }

  // 通知内容と種類を設定
  toast.textContent=message;

  toast.className='app-toast';

  if(type==='error'){
    toast.classList.add('is-error');
  }else{
    toast.classList.add('is-success');
  }

  // 表示状態にする
  toast.classList.add('is-visible');

  // 以前の通知タイマーを解除
  clearTimeout(window.studyLogToastTimer);

  // 約2.5秒後に非表示にする
  window.studyLogToastTimer=setTimeout(function(){

    toast.classList.remove('is-visible');

  },2500);
}
