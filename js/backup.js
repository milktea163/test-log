/* =========================
   StudyLog backup
========================= */
async function createBackup(){
  try{
    const keys=[
      'studyLogStable',
      'studyLogStable_V28_backup',
      'studyLogStable_V28_migrated',
      'studyLogV28_testDate',
      'studyLogV28_testPeriods',
      'studyLogSound',
      'studyLogV28_firstGuideDismissed'
    ];

    const storage={};
    keys.forEach(key=>{
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