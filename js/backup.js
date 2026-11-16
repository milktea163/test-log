
/* =========================
   StudyLog backup / restore
========================= */

const BACKUP_STORAGE_KEYS = [
  'studyLogStable',
  'studyLogStable_V28_backup',
  'studyLogStable_V28_migrated',
  'studyLogV28_testDate',
  'studyLogV28_testPeriods',
  'studyLogSound',
  'studyLogV28_firstGuideDismissed'
];

let pendingBackupRestore = null;

// 通常のオブジェクトか確認
function isBackupObject(value){
  return value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value);
}

/* =========================
   バックアップ作成
========================= */

async function createBackup(){
  try{
    const storage={};

    BACKUP_STORAGE_KEYS.forEach(key=>{
      storage[key]=localStorage.getItem(key);
    });

    const now=new Date();
    const date=[
      now.getFullYear(),
      String(now.getMonth()+1).padStart(2,'0'),
      String(now.getDate()).padStart(2,'0')
    ].join('-');

    const backup={
      appName:'StudyLog',
      appVersion:'V28.13',
      exportedAt:now.toISOString(),
      storage:storage
    };

    const json=JSON.stringify(backup,null,2);
    const fileName=`StudyLog_Backup_${date}.json`;
    const file=new File([json],fileName,{
      type:'application/json'
    });

    if(
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({files:[file]})
    ){
      try{
        await navigator.share({
          files:[file],
          title:'StudyLogバックアップ'
        });
      }catch(err){
        if(err && err.name==='AbortError') return;
        downloadBackup(json,fileName);
      }
    }else{
      downloadBackup(json,fileName);
    }

  }catch(e){
    alert('バックアップを作成できませんでした。');
    console.error(e);
  }
}

function downloadBackup(json,fileName){
  const blob=new Blob([json],{
    type:'application/json'
  });

  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');

  a.href=url;
  a.download=fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(()=>{
    URL.revokeObjectURL(url);
  },1000);

  alert('バックアップファイルを作成しました。保存先を確認してください。');
}

/* =========================
   バックアップファイルの検証
========================= */

async function selectBackupFile(file){
  if(!file) return;

  pendingBackupRestore=null;
  renderBackupRestorePreview();

  try{
    const text=await file.text();
    const backup=JSON.parse(text);

    if(!isBackupObject(backup)){
      throw new Error('ファイルの形式が正しくありません。');
    }

    if(backup.appName!=='StudyLog'){
      throw new Error('StudyLogのバックアップファイルではありません。');
    }

    if(!isBackupObject(backup.storage)){
      throw new Error('保存データが見つかりません。');
    }

    const storage=backup.storage;

    // 必要な保存項目がすべて含まれているか確認
    for(const key of BACKUP_STORAGE_KEYS){
      if(!Object.prototype.hasOwnProperty.call(storage,key)){
        throw new Error('バックアップに必要な保存項目がありません。');
      }

      if(storage[key]!==null && typeof storage[key]!=='string'){
        throw new Error('保存データの形式が正しくありません。');
      }
    }

    // メインデータを検証
    if(typeof storage[STORAGE_KEY]!=='string'){
      throw new Error('勉強記録データが見つかりません。');
    }

    const dbData=JSON.parse(storage[STORAGE_KEY]);

    if(
      !isBackupObject(dbData) ||
      !Array.isArray(dbData.subjects) ||
      !isBackupObject(dbData.history) ||
      !isBackupObject(dbData.tasks) ||
      !isBackupObject(dbData.periodTasks) ||
      !Array.isArray(dbData.testPeriods) ||
      !isBackupObject(dbData.testHistory)
    ){
      throw new Error('勉強記録の内部データが正しくありません。');
    }

    if(dbData.subjects.some(subject=>
      !isBackupObject(subject) ||
      typeof subject.id!=='string' ||
      typeof subject.name!=='string'
    )){
      throw new Error('教科データに不正な項目があります。');
    }

    pendingBackupRestore={
      backup:backup,
      storage:storage,
      subjectCount:dbData.subjects.length,
      testCount:dbData.testPeriods.length,
      historyCount:Object.keys(dbData.history).length
    };

    renderBackupRestorePreview();

  }catch(e){
    pendingBackupRestore=null;
    renderBackupRestorePreview();

    console.error('StudyLog: バックアップ検証エラー',e);

    alert(
      'このバックアップは読み込めませんでした。\n\n' +
      (e.message||'ファイルの内容を確認してください。') +
      '\n\n現在のデータは変更していません。'
    );
  }
}

/* =========================
   復元内容の確認表示
========================= */

function renderBackupRestorePreview(){
  document.querySelectorAll('.backup-restore-preview').forEach(el=>{
    if(!pendingBackupRestore){
      el.innerHTML='';
      return;
    }

    const p=pendingBackupRestore;
    const version=escapeHTML(p.backup.appVersion||'不明');
    const exported=escapeHTML(p.backup.exportedAt||'不明');

    el.innerHTML=`
      <div style="
        margin-top:12px;
        padding:14px;
        border:1px solid #e5a4c5;
        border-radius:12px;
        background:#fff8fc;
        text-align:left;
      ">
        <strong>📋 復元するデータ</strong>
        <p class="small">アプリ：StudyLog</p>
        <p class="small">バージョン：${version}</p>
        <p class="small">作成日時：${exported}</p>
        <p class="small">登録教科：${p.subjectCount}件</p>
        <p class="small">テスト日程：${p.testCount}件</p>
        <p class="small">勉強記録の日付：${p.historyCount}日分</p>
        <p style="font-size:.85rem;color:#b42318;font-weight:bold">
          復元すると、現在のデータはバックアップの内容に置き換わります。
        </p>
        <button type="button" class="primary full"
          onclick="confirmBackupRestore()">
          この内容で復元する
        </button>
        <button type="button" class="secondary full"
          style="margin-top:8px"
          onclick="cancelBackupRestore()">
          キャンセル
        </button>
      </div>
    `;
  });
}

function cancelBackupRestore(){
  pendingBackupRestore=null;
  renderBackupRestorePreview();
}

/* =========================
   復元前データの保護
========================= */

function savePreRestoreSnapshot(){
  const currentStorage={};

  BACKUP_STORAGE_KEYS.forEach(key=>{
    currentStorage[key]=localStorage.getItem(key);
  });

  const snapshot={
    appName:'StudyLog_PreRestoreSnapshot',
    createdAt:new Date().toISOString(),
    storage:currentStorage
  };

  const snapshotKey=
    'studyLogStable_preRestoreSnapshot_'+
    Date.now()+'_'+
    Math.random().toString(36).slice(2,7);

  // 退避に失敗した場合は復元を開始しない
  localStorage.setItem(snapshotKey,JSON.stringify(snapshot));

  return snapshotKey;
}

function restoreStorageValues(storage){
  let success=true;

  BACKUP_STORAGE_KEYS.forEach(key=>{
    try{
      const value=storage[key];

      if(value===null){
        localStorage.removeItem(key);
      }else{
        localStorage.setItem(key,value);
      }
    }catch(e){
      success=false;
      console.error('StudyLog: 保存データの復旧に失敗しました。',key,e);
    }
  });

  return success;
}

/* =========================
   バックアップ復元
========================= */

function confirmBackupRestore(){
  if(!pendingBackupRestore) return;

  const ok=confirm(
    'バックアップからデータを復元します。\n\n' +
    '現在の勉強記録・教科設定・テスト日程などは、' +
    'バックアップの内容に置き換わります。\n\n' +
    '復元を実行してよろしいですか？'
  );

  if(!ok) return;

  let snapshotKey=null;

  try{
    // まず現在のデータを別の保存領域に退避
    snapshotKey=savePreRestoreSnapshot();

  }catch(e){
    console.error('StudyLog: 復元前の退避に失敗しました。',e);

    alert(
      '復元前のデータを保護できませんでした。\n\n' +
      '保存容量が不足している可能性があります。\n' +
      '安全のため、復元は実行していません。'
    );

    return;
  }

  try{
    // 検証済みのバックアップを反映
    BACKUP_STORAGE_KEYS.forEach(key=>{
      const value=pendingBackupRestore.storage[key];

      if(value===null){
        localStorage.removeItem(key);
      }else{
        localStorage.setItem(key,value);
      }
    });

    alert(
      'データを復元しました。\n\n' +
      'アプリを再読み込みします。'
    );

    location.reload();

  }catch(e){
    console.error('StudyLog: 復元に失敗しました。',e);

    // 復元前のデータに戻す
    let snapshot=null;

    try{
      snapshot=JSON.parse(localStorage.getItem(snapshotKey));
    }catch(ignore){}

    const rollbackSuccess=
      snapshot &&
      isBackupObject(snapshot.storage) &&
      restoreStorageValues(snapshot.storage);

    if(rollbackSuccess){
      alert(
        '復元中にエラーが発生しました。\n\n' +
        '復元前のデータに戻しました。\n' +
        'アプリを再読み込みしてください。'
      );

      location.reload();

    }else{
      alert(
        '復元中にエラーが発生し、' +
        '自動で元に戻せなかった可能性があります。\n\n' +
        '復元前のデータの退避ファイルは保存されています。\n' +
        'これ以上操作せず、状況を確認してください。'
      );
    }
  }
}

/* =========================
   破損した元データの書き出し
========================= */

function downloadRawStoredData(){
  if(rawStoredData===null){
    alert('保護された元データはありません。');
    return;
  }

  try{
    const blob=new Blob([rawStoredData],{
      type:'text/plain;charset=utf-8'
    });

    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');

    a.href=url;
    a.download='StudyLog_保護データ.txt';

    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(()=>{
      URL.revokeObjectURL(url);
    },1000);

    alert(
      '保護された元データを書き出しました。\n\n' +
      'このファイルは削除せず、安全な場所に保管してください。'
    );

  }catch(e){
    console.error(e);
    alert('元データを書き出せませんでした。');
  }
}

/* =========================
   起動できない場合の復旧画面
========================= */

function showRecoveryPanel(){
  const panel=document.getElementById('recoveryPanel');

  if(!panel) return;

  panel.style.display='block';

  const welcome=document.getElementById('welcome');
  if(welcome) welcome.style.display='none';

  const header=document.querySelector('.app-header');
  if(header) header.style.display='none';

  const main=document.querySelector('main');
  if(main) main.style.display='none';

  const nav=document.querySelector('.nav');
  if(nav) nav.style.display='none';
}
