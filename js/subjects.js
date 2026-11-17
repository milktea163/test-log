
function getRecordTest(){
 return db.testPeriods.find(t=>t.id===db.activeRecordTestId)||null;
}

function subjectsForTest(t){
 return t?db.subjects.filter(s=>(t.subjectIds||[]).includes(s.id)):db.subjects;
}

function renderRecordTestSelect(){
 const sel=document.getElementById('record-test-select');
 if(!sel)return;

 const prior=db.activeRecordTestId;
 sel.innerHTML='';

 const none=document.createElement('option');
 none.value='';
 none.textContent=db.testPeriods.length
  ?'テストを選択（未選択は通常記録）'
  :'テスト日程を先に登録';
 sel.appendChild(none);

 db.testPeriods.forEach(t=>{
  const o=document.createElement('option');
  o.value=t.id;
  o.textContent=t.name;
  sel.appendChild(o);
 });

 sel.value=db.testPeriods.some(t=>t.id===prior)?prior:'';
}
// タイマーで勉強する教科ボタンを表示する
function renderSubjectButtons(){
  const root=document.getElementById('subject-buttons');
  if(!root)return;

  root.innerHTML='';

  subjectsForTest(getRecordTest()).forEach(s=>{
    const b=document.createElement('button');

    b.className='subject-btn'+
      (s.id===currentSubject?' active':'');

    b.style.borderColor=s.color;

    b.innerHTML=
      `${s.id===currentSubject?'✓ ':''}`+
      `<span>${escapeHTML(s.icon||'📚')}</span>`+
      `${escapeHTML(s.name)}`;

    b.onclick=()=>{
      if(isRunning)return;

      currentSubject=s.id;
      renderSubjectButtons();
      updateSelectedSubjectNote();
    };

    root.appendChild(b);
  });

  updateSelectedSubjectNote();
}

function changeRecordTest(id){

  const sel=document.getElementById('record-test-select');

  if(isRunning){
    if(sel)sel.value=db.activeRecordTestId||'';

    alert(
      'タイマー動作中は記録先を変更できません。STOPしてから変更してください。'
    );

    return;
  }

  const previousDb=cloneDb();
  const previousSubject=currentSubject;

  db.activeRecordTestId=id||'';

  const allowed=subjectsForTest(getRecordTest());

  if(!allowed.some(s=>s.id===currentSubject)){
    currentSubject=allowed[0]?.id||'';
  }

  if(!saveDbMutation(previousDb)){
    currentSubject=previousSubject;
    renderRecordTestSelect();
    renderSubjectButtons();
    return;
  }

  renderSubjectButtons();
  renderHomeStats();
  renderTimeGrid();
  updateChart();
}

function renderTestSubjectSettings(testId){
 const sel=document.getElementById('subject-test-select');
 if(!sel)return;

 if(testId===undefined)testId=sel.value;

 const previous=testId;
 sel.innerHTML='';

 db.testPeriods.forEach(t=>{
  const o=document.createElement('option');
  o.value=t.id;
  o.textContent=t.name;
  sel.appendChild(o);
 });

 if(!db.testPeriods.some(t=>t.id===previous)){
  testId=db.testPeriods[0]?.id||'';
 }

 sel.value=testId;

 const root=document.getElementById('test-subject-settings');
 if(!root)return;

 root.innerHTML='';

 const t=db.testPeriods.find(x=>x.id===testId);

 if(!t){
  root.innerHTML='<p class="small">まずテスト日程を登録してください。</p>';
  return;
 }

 db.subjects.forEach(sub=>{
  const lab=document.createElement('label');
  lab.className='help-card';
  lab.style.display='flex';
  lab.style.alignItems='center';
  lab.style.gap='10px';

  const cb=document.createElement('input');
  cb.type='checkbox';
  cb.checked=(t.subjectIds||[]).includes(sub.id);
  cb.dataset.subjectId=sub.id;

  const span=document.createElement('span');
  span.textContent=`${sub.icon||'📚'} ${sub.name}`;

  lab.append(cb,span);
  root.appendChild(lab);
 });
}

function saveTestSubjectSettings(){

  const id=document.getElementById('subject-test-select')?.value;
  const t=db.testPeriods.find(x=>x.id===id);

  if(!t){
    return alert('先にテスト日程を登録してください。');
  }

  const selectedIds=[
    ...document.querySelectorAll(
      '#test-subject-settings input[type=checkbox]:checked'
    )
  ].map(x=>x.dataset.subjectId)
   .filter(id=>db.subjects.some(s=>s.id===id));

  if(!selectedIds.length){
    return alert('少なくとも1教科は選択してください。');
  }

  if(
    isRunning&&
    db.activeRecordTestId===id&&
    !selectedIds.includes(currentSubject)
  ){
    return alert(
      'タイマー動作中の教科は対象外にできません。STOPしてから変更してください。'
    );
  }

  const previousDb=cloneDb();
  const previousSubject=currentSubject;

  t.subjectIds=selectedIds;

  if(
    db.activeRecordTestId===id&&
    !selectedIds.includes(currentSubject)
  ){
    currentSubject=selectedIds[0];
  }

  if(!saveDbMutation(previousDb)){
    currentSubject=previousSubject;
    renderTestSubjectSettings(id);
    return;
  }

  renderRecordTestSelect();
  renderSubjectButtons();
  renderHomeStats();
  renderTimeGrid();
  updateChart();
  renderStrategy();

  alert('このテストの教科を保存しました。');
}

function updateSelectedSubjectNote(){
 const el=document.getElementById('selected-subject-note');
 if(!el)return;

 const s=db.subjects.find(x=>x.id===currentSubject);

 el.innerText=s
  ?`選択中：${s.icon||'📚'} ${s.name}`
  :'';
}

function renderSubjectSettings(){
 const root=document.getElementById('setting-list');
 if(!root)return;

 root.innerHTML='';

 db.subjects.forEach((s,i)=>{
  const d=document.createElement('div');
  d.className='setting-item';
  d.style.borderColor=s.color;

  d.innerHTML=
   `<input class="color" type="color" value="${escapeHTML(s.color)}">`+
   `<input type="text" value="${escapeHTML(s.name)}">`+
   `<button class="danger">削除</button>`;

  d.querySelector('.color').onchange=e=>{
   updateSub(i,'color',e.target.value);
  };

  d.querySelector('input[type=text]').onchange=e=>{
   updateSub(i,'name',e.target.value);
  };

  d.querySelector('.danger').onclick=()=>{
   removeSub(i);
  };

  root.appendChild(d);
 });
}

function updateSub(i,f,v){

  if(!db.subjects[i])return;

  if(f==='name'){
    v=v.trim();

    if(!v){
      alert('教科名を入力してください。');
      renderSubjectSettings();
      return;
    }
  }

  const previousDb=cloneDb();

  db.subjects[i][f]=v;

  if(!saveDbMutation(previousDb)){
    renderSubjectSettings();
    return;
  }

  renderSubjectButtons();
  renderSubjectSettings();
  renderTimeGrid();
  updateChart();
  renderStrategy();
  updateSelectedSubjectNote();
}

function addSub(){

  const previousDb=cloneDb();

  db.subjects.push({
    id:'sub_'+Date.now(),
    name:'新しい教科',
    color:'#ffc8dd',
    icon:'✏️'
  });

  if(!saveDbMutation(previousDb)){
    renderSubjectSettings();
    return;
  }

  renderSubjectButtons();
  renderSubjectSettings();
  renderTimeGrid();
  updateChart();
  renderStrategy();
}

function removeSub(i){

  const s=db.subjects[i];
  if(!s)return;

  if(db.subjects.length<=1){
    return alert('教科は1つ以上必要です。');
  }

  if(isRunning&&currentSubject===s.id){
    return alert(
      'タイマーで記録中の教科は削除できません。STOPしてから削除してください。'
    );
  }

  if(!confirm(
    `「${s.name}」を削除しますか？\n既存の学習記録は残りますが、教科一覧から非表示になります。`
  )){
    return;
  }

  const previousDb=cloneDb();
  const previousSubject=currentSubject;

  if(currentSubject===s.id){
    currentSubject=db.subjects[i===0?1:0].id;
  }

  db.subjects.splice(i,1);

  if(!saveDbMutation(previousDb)){
    currentSubject=previousSubject;
    renderSubjectSettings();
    renderSubjectButtons();
    return;
  }

  renderSubjectButtons();
  renderSubjectSettings();
  renderTimeGrid();
  updateChart();
  renderStrategy();
  updateSelectedSubjectNote();
}
