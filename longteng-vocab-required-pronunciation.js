(()=>{
  'use strict';
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  const PASS_SCORE=80;
  let recognition=null,activeKey='',lastSpokenKey='',passed=false,required=false;
  const byId=id=>document.getElementById(id);
  const normalize=text=>String(text||'').toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9']+/g,' ').trim().split(/\s+/).filter(Boolean);
  const editDistance=(a,b)=>{const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let diagonal=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,diagonal+(a[i-1]===b[j-1]?0:1));diagonal=old}}return row[b.length]};
  const accuracy=(target,spoken)=>{const a=normalize(target),b=normalize(spoken),size=Math.max(a.length,b.length);return size?Math.max(0,Math.round((1-editDistance(a,b)/size)*100)):0};
  function completedSentence(){
    let prompt=byId('question')?.textContent?.trim()||'';
    if(!prompt)return '';
    const checked=document.querySelector('#answerArea input[type="radio"]:checked');
    if(checked){
      const answer=(checked.closest('label')?.textContent||'').trim().replace(/^[A-D]\s*[.．、:]\s*/i,'').trim();
      return prompt.replace(/_{3,}/,answer).replace(/\s+([,.!?;:])/g,'$1');
    }
    const entries=[...document.querySelectorAll('#answerArea .spell')].map(input=>input.value.trim());
    entries.forEach(answer=>{prompt=prompt.replace(/_{3,}/,answer)});
    return prompt.replace(/\s*\([A-Za-z][^)]*\)/g,'').replace(/\s+([,.!?;:])/g,'$1');
  }
  function speak(text){
    if(!('speechSynthesis'in window)||!text)return;
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-US';utterance.rate=.86;
    window.speechSynthesis.speak(utterance);
  }
  function lockNext(){passed=false;required=true;const next=byId('next');if(next){next.classList.add('hidden');next.disabled=true}}
  function unlockNext(){passed=true;required=false;const next=byId('next');if(next){next.disabled=false;next.classList.remove('hidden')}}
  function buildBox(){
    if(byId('ltPronounce'))return byId('ltPronounce');
    const box=document.createElement('section');box.id='ltPronounce';box.className='lt-pronounce';box.hidden=true;box.setAttribute('aria-live','polite');
    box.innerHTML='<h3>🎙️ 英文整句朗讀 Pronunciation Check</h3><p class="lt-pronounce-note">答對後先聽完整句，再朗讀。STT 達 <strong>'+PASS_SCORE+'%</strong> 才能前往下一題。</p><p>朗讀目標：<span id="ltTarget" class="lt-pronounce-target"></span></p><div class="lt-pronounce-actions"><button id="ltListen" type="button">🔊 聽完整句子</button><button id="ltRecord" class="lt-record" type="button">🎤 開始朗讀評分</button></div><div id="ltStatus" class="lt-pronounce-status">請聽完句子後，按下麥克風朗讀。</div>';
    byId('feedback')?.insertAdjacentElement('afterend',box);
    byId('ltListen').addEventListener('click',()=>speak(byId('ltTarget').textContent));
    const record=byId('ltRecord');
    if(!Recognition){record.disabled=true;record.textContent='此瀏覽器不支援 STT';byId('ltStatus').textContent='本練習需要語音辨識，請改用最新版 Chrome 或 Edge。'}
    else record.addEventListener('click',startRecognition);
    return box;
  }
  function reset(){
    activeKey='';passed=false;required=false;
    if(recognition){try{recognition.abort()}catch(_){}recognition=null}
    const box=byId('ltPronounce');if(box)box.hidden=true;
    window.speechSynthesis?.cancel();
  }
  function reveal(){
    const feedback=byId('feedback');
    if(!feedback||feedback.classList.contains('hidden')||!feedback.classList.contains('ok'))return;
    const sentence=completedSentence();if(!sentence)return;
    const key=(byId('meta')?.textContent||'')+'|'+sentence;
    activeKey=key;lockNext();
    const box=buildBox();box.hidden=false;byId('ltTarget').textContent=sentence;
    byId('ltStatus').textContent=Recognition?'請聽完句子後，按下麥克風朗讀。':'本練習需要語音辨識，請改用最新版 Chrome 或 Edge。';
    if(key!==lastSpokenKey){lastSpokenKey=key;speak(sentence)}
  }
  function startRecognition(){
    if(!Recognition||!activeKey)return;
    if(recognition){try{recognition.abort()}catch(_){}}
    window.speechSynthesis?.cancel();
    recognition=new Recognition();recognition.lang='en-US';recognition.interimResults=false;recognition.continuous=false;recognition.maxAlternatives=1;
    const button=byId('ltRecord'),status=byId('ltStatus');button.disabled=true;button.textContent='🎤 正在聽…';status.textContent='請清楚朗讀上方完整句子。';
    recognition.onresult=event=>{
      const transcript=event.results[0][0].transcript.trim(),percent=accuracy(byId('ltTarget').textContent,transcript),ok=percent>=PASS_SCORE;
      status.replaceChildren();
      const heard=document.createElement('div');heard.append('辨識結果：');const strong=document.createElement('strong');strong.textContent=transcript;heard.append(strong);status.append(heard);
      const score=document.createElement('div');score.className='lt-pronounce-score'+(ok?' good':'');score.textContent='正確率 '+percent+'%';status.append(score);
      const message=document.createElement('div');message.className=ok?'lt-pronounce-pass':'';message.textContent=ok?'✅ 朗讀通過，已解鎖下一題。':'尚未達 '+PASS_SCORE+'%，請再聽一次並重新朗讀。';status.append(message);
      if(ok)unlockNext();
    };
    recognition.onerror=event=>{const messages={'not-allowed':'請允許網站使用麥克風後再試一次。','no-speech':'沒有聽到聲音，請靠近麥克風再試一次。','audio-capture':'找不到可用的麥克風。','network':'語音辨識服務暫時無法連線，請稍後再試。'};status.textContent=messages[event.error]||'朗讀辨識未完成，請再試一次。'};
    recognition.onend=()=>{button.disabled=false;button.textContent='🎤 再次朗讀評分';recognition=null};
    try{recognition.start()}catch(_){button.disabled=false;button.textContent='🎤 開始朗讀評分';status.textContent='麥克風尚未準備好，請再試一次。'}
  }
  function init(){
    buildBox();
    const feedback=byId('feedback'),question=byId('question'),next=byId('next');
    if(feedback)new MutationObserver(reveal).observe(feedback,{attributes:true,childList:true,subtree:true});
    if(question)new MutationObserver(reset).observe(question,{childList:true,subtree:true,characterData:true});
    next?.addEventListener('click',event=>{if(required&&!passed){event.preventDefault();event.stopImmediatePropagation();byId('ltStatus').textContent='請先完成朗讀並達到 '+PASS_SCORE+'%，才能前往下一題。'}},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
