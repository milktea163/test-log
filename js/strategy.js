
/* =========================
   テスト攻略画面
========================= */

let selectedStrategySubjectId = null;


// テスト選択欄を更新
function updateTaskPeriodSelect(){

  const s = document.getElementById('task-test-period-select');

  if(!s) return;

  s.innerHTML = '<option value="default">通常のやることリスト</option>';

  db.testPeriods.forEach(t=>{

    const o = document.createElement('option');

    o.value = t.id;
    o.textContent = t.name;

    s.appendChild(o);

  });

  if([...s.options].some(o=>o.value===selectedTaskPeriodId)){
    s.value = selectedTaskPeriodId;
  }else{
    selectedTaskPeriodId = 'default';
  }

}


// 現在選択されているタスクデータ
function getTaskSource(){

  if(selectedTaskPeriodId==='default'){
    return db.tasks;
  }

  db.periodTasks[selectedTaskPeriodId] ??= {};

  return db.periodTasks[selectedTaskPeriodId];

}


// タスクの進捗を計算
// 範囲名が入力されているタスクだけを対象にする
function calcProgress(source,sid){

  const arr = Array.isArray(source[sid])
    ? source[sid]
    : [];

  const goal = Math.max(
    1,
    Math.floor(Number(db.globalRepGoal)||3)
  );

  let done = 0;
  let total = 0;

  arr.forEach(t=>{

    if(!t || typeof t.name!=='string' || !t.name.trim()){
      return;
    }

    for(let r=0;r<goal;r++){

      total++;

      if(t.checks?.[r]){
        done++;
      }

    }

  });

  return {
    done,
    total,
    percent: total ? Math.round(done/total*100) : 0
  };

}


// 教科を選択
function selectStrategySubject(sid){

  selectedStrategySubjectId = sid;

  renderStrategy();

}


// テスト攻略画面を描画
function renderStrategy(){

  updateTaskPeriodSelect();

  const source = getTaskSource();

  const root = document.getElementById('task-container');

  const progress = document.getElementById('strategy-progress');

  if(!root || !progress) return;

  const strategyTest = db.testPeriods.find(
    t=>t.id===selectedTaskPeriodId
  );

  const visibleSubjects = strategyTest
    ? subjectsForTest(strategyTest)
    : db.subjects;

  // 選択中の教科が対象外になった場合は最初の教科を選択
  if(
    !visibleSubjects.some(s=>s.id===selectedStrategySubjectId)
  ){

    selectedStrategySubjectId =
      visibleSubjects[0]?.id ?? null;

  }

  // 全体進捗
  let totalDone = 0;
  let totalTasks = 0;

  visibleSubjects.forEach(s=>{

    const p = calcProgress(source,s.id);

    totalDone += p.done;
    totalTasks += p.total;

  });

  const totalPercent = totalTasks
    ? Math.round(totalDone/totalTasks*100)
    : 0;

  progress.innerHTML = `
    <div class="strategy-total-head">
      <strong>全体の攻略進捗</strong>
      <strong>${totalPercent}%</strong>
    </div>

    <div class="bar">
      <i style="width:${totalPercent}%"></i>
    </div>

    <p class="small">
      ${totalTasks
        ? `${totalDone}/${totalTasks} 回完了`
        : '範囲を入力すると進捗が表示されます。'}
    </p>
  `;


  // 教科一覧と選択教科の表示領域
  root.innerHTML = '';

  const layout = document.createElement('div');
  layout.className = 'strategy-layout';


  // 左側：全教科の進捗一覧
  const subjectPanel = document.createElement('div');
  subjectPanel.className = 'strategy-subject-panel';

  const subjectTitle = document.createElement('h3');
  subjectTitle.className = 'strategy-panel-title';
  subjectTitle.textContent = '📚 教科別の進捗';

  subjectPanel.appendChild(subjectTitle);


  const subjectGrid = document.createElement('div');
  subjectGrid.className = 'strategy-subject-grid';

  visibleSubjects.forEach(s=>{

    const p = calcProgress(source,s.id);

    const button = document.createElement('button');

    button.type = 'button';

    button.className =
      'strategy-subject-card' +
      (s.id===selectedStrategySubjectId ? ' active' : '');

    button.setAttribute(
      'aria-pressed',
      String(s.id===selectedStrategySubjectId)
    );

    button.innerHTML = `
      <span class="strategy-subject-name">
        ${escapeHTML(s.icon)} ${escapeHTML(s.name)}
      </span>

      <strong class="strategy-subject-percent">
        ${p.total ? `${p.percent}%` : '未設定'}
      </strong>

      <span class="strategy-subject-count">
        ${p.total ? `${p.done}/${p.total} 回` : '範囲なし'}
      </span>

      <span class="strategy-mini-bar">
        <i style="width:${p.percent}%"></i>
      </span>
    `;

    button.onclick = ()=>selectStrategySubject(s.id);

    subjectGrid.appendChild(button);

  });

  subjectPanel.appendChild(subjectGrid);


  // 右側：選択中の教科のタスク
  const workspace = document.createElement('div');
  workspace.className = 'strategy-workspace';

  const selectedSubject = visibleSubjects.find(
    s=>s.id===selectedStrategySubjectId
  );

  if(selectedSubject){

    const p = calcProgress(source,selectedSubject.id);

    const heading = document.createElement('div');
    heading.className = 'strategy-workspace-head';

    heading.innerHTML = `
      <div>
        <h3>
          ${escapeHTML(selectedSubject.icon)}
          ${escapeHTML(selectedSubject.name)}
        </h3>
        <p class="small">
          ${p.total
            ? `進捗 ${p.percent}%（${p.done}/${p.total} 回）`
            : '学習範囲を登録しましょう。'}
        </p>
      </div>
    `;

    workspace.appendChild(heading);


    // 選択教科のタスク一覧
    const taskList = document.createElement('div');
    taskList.className = 'strategy-task-list';

    for(let i=0;i<5;i++){

      const t = source[selectedSubject.id]?.[i] || {
        name:'',
        checks:[]
      };

      const row = document.createElement('div');
      row.className = 'strategy-task-item';

      const number = document.createElement('span');
      number.className = 'strategy-task-number';
      number.textContent = String(i+1).padStart(2,'0');

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = '学習範囲を入力';
      input.value = t.name || '';
      input.setAttribute('aria-label',`${i+1}番目の学習範囲`);

      input.onchange = e=>{
        updateTaskName(
          selectedSubject.id,
          i,
          e.target.value
        );
      };

      const checks = document.createElement('div');
      checks.className = 'checks';

      const goal = Math.max(
        1,
        Math.floor(Number(db.globalRepGoal)||3)
      );

      for(let r=0;r<goal;r++){

        const b = document.createElement('button');

        b.type = 'button';

        b.className =
          'check' + (t.checks?.[r] ? ' checked' : '');

        b.setAttribute(
          'aria-label',
          `${i+1}番目の範囲 ${r+1}回目`
        );

        b.title = `${r+1}回目`;

        b.onclick = ()=>{
          toggleCheck(selectedSubject.id,i,r);
        };

        checks.appendChild(b);

      }

      row.appendChild(number);
      row.appendChild(input);
      row.appendChild(checks);

      taskList.appendChild(row);

    }

    workspace.appendChild(taskList);

  }else{

    workspace.innerHTML = `
      <div class="empty">
        <p>このテストの対象教科がありません。</p>
      </div>
    `;

  }


  // テスト日程がない場合の案内
  if(!db.testPeriods.length){

    const notice = document.createElement('div');

    notice.className = 'empty-action';

    notice.innerHTML = `
      <p>
        <strong>テスト日程がまだ登録されていません。</strong><br>
        通常のやることリストは利用できます。
        テスト専用の範囲を管理するには日程を登録してください。
      </p>
      <button class="mini-action" onclick="goCalendarRegister()">
        📅 テスト日程を登録
      </button>
    `;

    workspace.prepend(notice);

  }

  layout.appendChild(subjectPanel);
  layout.appendChild(workspace);

  root.appendChild(layout);

}


// テスト期間を切り替え
function switchTaskPeriod(v){

  selectedTaskPeriodId = v;

  selectedStrategySubjectId = null;

  renderStrategy();

}


// 周回数を変更
function setGlobalRep(n){

  const previousDb = cloneDb();

  db.globalRepGoal = n;

  if(!saveDbMutation(previousDb)){

    renderStrategy();
    renderHomeProgress();

    return;

  }

  renderStrategy();
  renderHomeProgress();

}


// タスク名を更新
function updateTaskName(sid,i,val){

  const previousDb = cloneDb();

  const src = getTaskSource();

  src[sid] ??= [];

  src[sid][i] ??= {
    name:'',
    checks:[]
  };

  src[sid][i].name = val;

  if(!saveDbMutation(previousDb)){

    renderStrategy();
    renderHomeProgress();

    return;

  }

  renderStrategy();
  renderHomeProgress();

}


// チェック状態を更新
function toggleCheck(sid,i,r){

  const previousDb = cloneDb();

  const src = getTaskSource();

  src[sid] ??= [];

  src[sid][i] ??= {
    name:'',
    checks:[]
  };

  src[sid][i].checks ??= [];

  src[sid][i].checks[r] = !src[sid][i].checks[r];

  if(!saveDbMutation(previousDb)){

    renderStrategy();
    renderHomeProgress();

    return;

  }

  renderStrategy();
  renderHomeProgress();

}


// 保存してホームへ戻る
function saveAndCloseTasks(){

  if(!save()){
    return;
  }

  renderHomeStats();

  showScreen('home');

}
