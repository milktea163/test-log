function initAudio(){try{if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume()}catch(e){}}
function playAlertSound(force=false){
 if(!force && !document.getElementById('sound-toggle-settings')?.checked)return;
 try{
   initAudio();
   if(!audioCtx)return;
   const schedule=()=>{
     const now=audioCtx.currentTime+0.03;
     // 高いラ（A6）を「ララ・ララ」の2まとまりで再生
     const starts=[0,0.18,0.58,0.76];
     starts.forEach(t=>{
       const o=audioCtx.createOscillator(),g=audioCtx.createGain();
       o.type='sine';
       o.frequency.setValueAtTime(1760,now+t);
       g.gain.setValueAtTime(0.0001,now+t);
       g.gain.exponentialRampToValueAtTime(0.36,now+t+0.012);
       g.gain.exponentialRampToValueAtTime(0.0001,now+t+0.15);
       o.connect(g);g.connect(audioCtx.destination);
       o.start(now+t);o.stop(now+t+0.17);
     });
   };
   if(audioCtx.state==='suspended') audioCtx.resume().then(schedule).catch(()=>{});
   else schedule();
 }catch(e){}
}
function testAlertSound(){
 initAudio();
 setTimeout(()=>{try{playAlertSound(true)}catch(e){}},40);
}
function syncSound(v){const settings=document.getElementById('sound-toggle-settings');if(settings)settings.checked=!!v;localStorage.setItem('studyLogSound',v?'1':'0')}
function saveSound(){const settings=document.getElementById('sound-toggle-settings');syncSound(settings?settings.checked:true)}
