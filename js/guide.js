(function(){
  function hideWelcome(){
    var welcome=document.getElementById('welcome');
    if(welcome){
      welcome.classList.add('hide');
      welcome.setAttribute('aria-hidden','true');
    }
    document.body.classList.add('app-started');
    if(typeof showScreen==='function') showScreen('home');
  }
  function openGuideNow(){
    var auto=document.getElementById('autoLockModal');
    var welcome=document.getElementById('welcome');
    // 「はじめる」を押すたびに、必ず「はじめに」→「はじめての方へ」を表示します。
    if(auto) auto.classList.add('open');
    if(welcome) welcome.classList.add('behind-guide');
  }
  function openFirstGuide(){
    var auto=document.getElementById('autoLockModal');
    var guide=document.getElementById('guideModal');
    if(auto) auto.classList.remove('open');
    if(guide) guide.classList.add('open');
  }
  function finishStartNow(){
    var guide=document.getElementById('guideModal');
    var auto=document.getElementById('autoLockModal');
    if(guide) guide.classList.remove('open');
    if(auto) auto.classList.remove('open');
    hideWelcome();
  }
  window.enterAppSafe=openGuideNow;
  window.closeGuideSafe=finishStartNow;

  document.addEventListener('DOMContentLoaded',function(){
    var enter=document.getElementById('enter-app-button');
    var autoOk=document.getElementById('auto-lock-ok-button');
    var ok=document.getElementById('guide-ok-button');
    var home=document.getElementById('guide-home-button');
    if(enter) enter.addEventListener('click',openGuideNow);
    if(autoOk) autoOk.addEventListener('click',openFirstGuide);
    if(ok) ok.addEventListener('click',finishStartNow);
    if(home) home.addEventListener('click',finishStartNow);
  });
})();