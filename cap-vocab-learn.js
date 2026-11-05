(function(){
  const D=window.LEARN_DATA||[],$=s=>document.querySelector(s);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const learn=$('#learn'),select=$('#select'),quiz=$('#quiz'),result=$('#result'),tl=$('#tabLearn'),tq=$('#tabQuiz');
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  const canRec=!!(navigator.mediaDevices&&window.MediaRecorder);
  let showAns=false,recOn=false,active=null;

  // ---------- listening ----------
  function voice(){const v=speechSynthesis.getVoices();return v.find(x=>/en-US/i.test(x.lang)&&/Google|Samantha|Microsoft/i.test(x.name))||v.find(x=>/^en/i.test(x.lang))}
  function cleanTerm(t){return t.replace(/\(.*?\)/g,' ').replace(/\+\s*(N\/V-ing|N\/VR|N|V-ing|VR|人\/物|人|物|地方|時間|錢|子句|adj\.|adv\.)/g,' ').replace(/\b(sb|sth|A|B)\b\.?/g,' ').replace(/[+…]|\.\.\./g,' ').replace(/\//g,' or ').replace(/\s+/g,' ').trim()}
  function full(r){if(r.f)return r.f;const w=cleanTerm(r.t).split(' ');let i=0;return r.s.replace(/_{3,}/g,()=>w[i++]||'')}
  function say(text,btn){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=.88;const v=voice();if(v)u.voice=v;if(btn){btn.classList.add('playing');u.onend=u.onerror=()=>btn.classList.remove('playing')}speechSynthesis.speak(u)}catch(e){alert('此瀏覽器不支援朗讀。')}}

  // ---------- optional recording ----------
  function words(s){return s.toLowerCase().replace(/[’']/g,"'").match(/[a-z0-9']+/g)||[]}
  function score(target,heard){const a=words(target),b=words(heard);if(!a.length)return 0;const pool={};b.forEach(w=>pool[w]=(pool[w]||0)+1);let hit=0;a.forEach(w=>{if(pool[w]){hit++;pool[w]--}});return Math.round(hit/a.length*100)}
  async function record(i,btn){
    if(active){active.stop();return}
    const box=document.getElementById('rec'+i),target=full(D[i]);let stream,mr,chunks=[],rec,heard='';
    try{stream=await navigator.mediaDevices.getUserMedia({audio:true})}catch(e){box.innerHTML='<span class="bad">無法使用麥克風，請允許瀏覽器使用麥克風。</span>';return}
    mr=new MediaRecorder(stream);mr.ondataavailable=e=>chunks.push(e.data);
    if(SR){rec=new SR();rec.lang='en-US';rec.interimResults=false;rec.maxAlternatives=1;rec.onresult=e=>{heard=[...e.results].map(r=>r[0].transcript).join(' ')};rec.onerror=()=>{};try{rec.start()}catch(e){}}
    const stop=()=>{try{mr.state!=='inactive'&&mr.stop()}catch(e){}try{rec&&rec.stop()}catch(e){}};
    const timer=setTimeout(stop,15000);
    active={stop};btn.textContent='⏹ 停止錄音';btn.classList.add('recording');box.innerHTML='<span class="note">錄音中…請唸出完整例句（最長 15 秒）</span>';
    mr.onstop=()=>{clearTimeout(timer);stream.getTracks().forEach(t=>t.stop());active=null;btn.textContent='🎙️ 錄音';btn.classList.remove('recording');
      setTimeout(()=>{const url=URL.createObjectURL(new Blob(chunks,{type:mr.mimeType||'audio/webm'}));let h='<audio controls src="'+url+'"></audio>';
        if(SR){const s=score(target,heard);h+='<div class="'+(s>=80?'ok':'bad')+'">辨識結果：'+esc(heard||'（沒有辨識到聲音）')+'｜相符度 '+s+'%'+(s>=80?' 👍':'')+'</div>'}
        else h+='<div class="note">此瀏覽器不支援語音辨識，可重播自己的錄音比較。</div>';
        box.innerHTML=h},400)};
    mr.start();
  }

  // ---------- list ----------
  function render(){const k=$('#q').value.trim().toLowerCase();let last=null,n=0,h='';
    D.forEach((r,i)=>{if(k&&!(r.t+' '+r.e+' '+r.z+' '+r.s+' '+(r.f||'')+' '+r.c).toLowerCase().includes(k))return;
      if(r.g&&r.g!==last){h+='<div class="lg">'+esc(r.g)+'</div>';last=r.g}n++;
      h+='<div class="lw"><div class="lh"><span class="lt">'+esc(r.t)+'</span><span class="lp">'+esc(r.p)+'</span><span class="lz">'+esc(r.z)+'</span></div>'
        +'<div class="le">'+esc(r.e)+'</div><div class="ls">'+esc(showAns?full(r):r.s)+'</div><div class="lc">'+esc(r.c)+'</div>'
        +'<div class="lb"><button class="say" data-k="t" data-i="'+i+'" type="button">🔊 單字</button><button class="say" data-k="s" data-i="'+i+'" type="button">🔊 例句</button>'
        +(recOn?'<button class="rec" data-i="'+i+'" type="button">🎙️ 錄音</button>':'')+'</div><div id="rec'+i+'" class="recbox"></div></div>'});
    $('#ltable').innerHTML=h||'<p class="note">找不到符合的詞彙。</p>';$('#lcount').textContent='共 '+n+' 筆'}
  $('#ltable').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const i=+b.dataset.i,r=D[i];
    if(b.classList.contains('say'))say(b.dataset.k==='t'?cleanTerm(r.t):full(r),b);else if(b.classList.contains('rec'))record(i,b)});
  $('#q').addEventListener('input',render);
  $('#showZh').addEventListener('change',e=>learn.classList.toggle('nozh',!e.target.checked));
  $('#showAns').addEventListener('change',e=>{showAns=e.target.checked;render()});
  const recBox=$('#recOn');
  if(!canRec){recBox.disabled=true;recBox.parentElement.title='此瀏覽器不支援錄音'}
  recBox.addEventListener('change',e=>{recOn=e.target.checked;render()});

  function showLearn(){learn.classList.remove('hidden');select.classList.add('hidden');quiz.classList.add('hidden');result.classList.add('hidden');tl.classList.add('on');tq.classList.remove('on')}
  function showQuiz(){if(active)active.stop();speechSynthesis.cancel();learn.classList.add('hidden');if(quiz.classList.contains('hidden')&&result.classList.contains('hidden'))select.classList.remove('hidden');tq.classList.add('on');tl.classList.remove('on');window.scrollTo({top:0,behavior:'smooth'})}
  tl.onclick=showLearn;tq.onclick=showQuiz;$('#toQuiz').onclick=showQuiz;
  if(window.speechSynthesis)speechSynthesis.onvoiceschanged=()=>{};
  render();showLearn();
})();
