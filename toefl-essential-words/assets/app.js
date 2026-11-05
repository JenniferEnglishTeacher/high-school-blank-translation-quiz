(async function(){
  const unit=Number(document.body.dataset.unit);
  const bank=document.getElementById('word-bank');
  const passagesEl=document.getElementById('passages');
  const nameInput=document.getElementById('student-name');
  const state={completed:new Set(),wrong:new Set(),correct:new Set(),total:20};

  try{
    const response=await fetch(`data/units/unit-${String(unit).padStart(2,'0')}.json`);
    if(!response.ok)throw new Error('Unit data could not be loaded.');
    const data=await response.json();
    renderBank(data.words);
    renderPassages(buildPassages(data.words));
  }catch(error){
    bank.innerHTML=`<p>${escapeHtml(error.message)} Please refresh the page.</p>`;
  }

  nameInput.value=localStorage.getItem('toefl-student-name')||'';
  nameInput.addEventListener('change',()=>localStorage.setItem('toefl-student-name',nameInput.value.trim()));
  document.getElementById('retry-button').addEventListener('click',()=>location.reload());

  function renderBank(words){
    bank.innerHTML=words.map((entry,index)=>`<article class="word-row"><div><div class="word-title">${escapeHtml(entry.word)} <span class="pos">${escapeHtml(entry.pos)}</span></div><span class="word-zh" lang="zh-Hant">${escapeHtml(entry.zh)}</span></div><p class="definition">${escapeHtml(entry.definition)}</p><p class="example">${highlightWord(entry.example,entry.word)}</p><button class="listen-button" type="button" data-speak="${index}">🔊 Listen</button></article>`).join('');
    bank.querySelectorAll('[data-speak]').forEach(button=>button.addEventListener('click',()=>speak(words[Number(button.dataset.speak)].example)));
  }

  function buildPassages(words){
    const first=words.slice(0,10);
    const second=words.slice(10);
    let repeat=0;
    while(second.length<10){second.push(words[repeat++]);}
    return [
      {id:1,title:'Academic Context Notes',entries:first},
      {id:2,title:'Research and Campus Contexts',entries:second}
    ];
  }

  function renderPassages(passages){
    passagesEl.innerHTML=passages.map(p=>`<article class="passage-card" data-passage="${p.id}" data-attempt="0"><div class="passage-top"><div><h3>Passage ${p.id}: ${p.title}</h3><span class="passage-meta">10 incomplete words • first sentence intact</span></div></div><div class="passage-text"><span>A university reading group examined several academic examples to understand vocabulary in context.</span> ${p.entries.map((entry,index)=>sentenceWithBlank(entry,`${p.id}-${index}`)).join(' ')}</div><div class="passage-actions"><button class="button check-button" type="button">Check answers</button><p class="feedback" role="status">Complete every blank, then check your work.</p></div></article>`).join('');
    passagesEl.querySelectorAll('.passage-card').forEach(card=>card.querySelector('.check-button').addEventListener('click',()=>checkPassage(card)));
  }

  function sentenceWithBlank(entry,id){
    const sentence=ensureTargetSentence(entry);
    const pattern=new RegExp(escapeRegExp(entry.word),'i');
    const match=sentence.match(pattern);
    if(!match)return escapeHtml(sentence);
    const before=sentence.slice(0,match.index);
    const after=sentence.slice(match.index+match[0].length);
    return `${escapeHtml(before)}${blankMarkup(entry.word,id)}${escapeHtml(after)}`;
  }

  function ensureTargetSentence(entry){
    if(new RegExp(escapeRegExp(entry.word),'i').test(entry.example))return entry.example;
    const definition=entry.definition.replace(/^to\s+/i,'');
    if(entry.pos.startsWith('adj'))return `The class described the situation as ${entry.word}, meaning it was ${definition}.`;
    if(entry.pos.startsWith('adv'))return `The team acted ${entry.word}, showing a manner that was ${definition}.`;
    if(entry.pos.startsWith('v'))return `The students had to ${entry.word} the issue, or ${definition}.`;
    if(entry.pos.startsWith('n'))return `The report explained ${entry.word} as ${definition}.`;
    return `The phrase ${entry.word} signals the idea of ${definition}.`;
  }

  function blankMarkup(phrase,id){
    const tokens=phrase.split(/(\s+)/);
    const wordIndexes=tokens.map((t,i)=>({i,t})).filter(x=>/^[A-Za-z-]+$/.test(x.t));
    const chosen=wordIndexes.sort((a,b)=>b.t.length-a.t.length)[0];
    const cleanWord=chosen.t;
    const cut=Math.max(1,Math.floor(cleanWord.length/2));
    const prefix=cleanWord.slice(0,cut);
    const suffix=cleanWord.slice(cut);
    tokens[chosen.i]=`<span class="blank" data-word="${escapeAttr(phrase)}" data-id="${id}"><span class="blank-prefix">${escapeHtml(prefix)}</span><input aria-label="Missing letters for ${escapeAttr(phrase)}" data-answer="${escapeAttr(suffix)}" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="${suffix.length}" style="--blank-width:${Math.max(42,suffix.length*13)}px"></span>`;
    return tokens.map((token,index)=>index===chosen.i?token:escapeHtml(token)).join('');
  }

  function checkPassage(card){
    if(!nameInput.value.trim()){
      nameInput.focus();
      nameInput.setCustomValidity('Please enter your name before checking answers.');
      nameInput.reportValidity();
      nameInput.addEventListener('input',()=>nameInput.setCustomValidity(''),{once:true});
      return;
    }
    localStorage.setItem('toefl-student-name',nameInput.value.trim());
    const active=[...card.querySelectorAll('.blank:not(.correct):not(.revealed)')];
    if(active.some(blank=>!blank.querySelector('input').value.trim())){
      card.querySelector('.feedback').textContent='Please fill in every remaining blank first.';
      card.querySelector('.feedback').className='feedback try';
      return;
    }
    const attempt=Number(card.dataset.attempt)+1;
    card.dataset.attempt=String(attempt);
    let wrongNow=0;
    active.forEach(blank=>{
      const input=blank.querySelector('input');
      const correct=normalize(input.value)===normalize(input.dataset.answer);
      if(correct){
        blank.classList.remove('incorrect');blank.classList.add('correct');input.disabled=true;
        state.correct.add(blank.dataset.id);
      }else{
        wrongNow++;
        if(attempt>=2){
          blank.classList.remove('incorrect');blank.classList.add('revealed');
          input.replaceWith(reveal(input.dataset.answer));
          state.wrong.add(blank.dataset.word);
        }else{
          blank.classList.add('incorrect');input.value='';
        }
      }
    });
    const feedback=card.querySelector('.feedback');
    if(wrongNow===0||attempt>=2){
      state.completed.add(Number(card.dataset.passage));
      card.querySelector('.check-button').disabled=true;
      feedback.textContent=wrongNow===0?'Excellent — all 10 words are correct.':`${wrongNow} answer${wrongNow===1?' was':'s were'} revealed. Review the amber words.`;
      feedback.className=wrongNow===0?'feedback good':'feedback try';
      if(state.completed.size===2)finishUnit();
    }else{
      feedback.textContent=`${wrongNow} answer${wrongNow===1?' needs':'s need'} another try. Incorrect boxes have been cleared.`;
      feedback.className='feedback try';
    }
  }

  function reveal(answer){const span=document.createElement('span');span.className='answer-reveal';span.textContent=answer;return span;}

  async function finishUnit(){
    const panel=document.getElementById('final-panel');
    const score=state.total-state.wrong.size;
    const percent=Math.round(score/state.total*100);
    const prior=Number(localStorage.getItem(`toefl-unit-${unit}-best`)||0);
    if(percent>prior)localStorage.setItem(`toefl-unit-${unit}-best`,String(percent));
    document.getElementById('final-score').textContent=`Score: ${score} / ${state.total} (${percent}%)`;
    document.getElementById('final-message').textContent=state.wrong.size?`Review: ${[...state.wrong].join(', ')}`:'Perfect work — no review words this time.';
    panel.hidden=false;panel.scrollIntoView({behavior:'smooth',block:'center'});
    await submitResult([...state.wrong]);
  }

  async function submitResult(wrongWords){
    const status=document.getElementById('submit-status');
    const endpoint=window.QUIZ_CONFIG&&window.QUIZ_CONFIG.resultsEndpoint;
    if(!endpoint){status.textContent='Result collection has not been connected yet.';status.className='submit-status warning';return;}
    status.textContent='Saving your result…';status.className='submit-status';
    try{
      await fetch(endpoint,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({studentName:nameInput.value.trim(),unitTested:`Unit ${unit}`,wrongWords:wrongWords.length?wrongWords.join(', '):'None'})});
      status.textContent='✓ Result saved to your teacher’s spreadsheet.';status.className='submit-status success';
    }catch(error){status.textContent='The result could not be saved. Please show this score to your teacher.';status.className='submit-status warning';}
  }

  function highlightWord(sentence,word){
    const safe=escapeHtml(sentence);const pattern=new RegExp(`(${escapeRegExp(escapeHtml(word))})`,'i');return safe.replace(pattern,'<mark>$1</mark>');
  }
  function speak(text){
    if(!('speechSynthesis' in window))return;
    speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-US';utterance.rate=.88;
    const voices=speechSynthesis.getVoices();utterance.voice=voices.find(v=>v.lang.startsWith('en-US')&&/female|samantha|zira|aria|jenny|ava/i.test(v.name))||voices.find(v=>v.lang.startsWith('en-US'))||null;speechSynthesis.speak(utterance);
  }
  function normalize(value){return String(value).trim().toLowerCase().replace(/[^a-z]/g,'');}
  function escapeRegExp(value){return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
  function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function escapeAttr(value){return escapeHtml(value);}
})();
