(async function(){
  const grid=document.getElementById('unit-grid');
  try{
    const response=await fetch('data/unit-summary.json');
    if(!response.ok)throw new Error('Unable to load unit list');
    const units=await response.json();
    grid.innerHTML=units.map(u=>{
      const result=localStorage.getItem(`toefl-unit-${u.unit}-best`);
      const status=result?`<span class="progress-pill done">Best: ${result}%</span>`:'<span class="progress-pill">Not started</span>';
      return `<a class="unit-card" href="unit-${String(u.unit).padStart(2,'0')}.html"><div class="unit-number"><strong>Unit ${u.unit}</strong><span class="unit-count">${u.count} words</span></div><p class="unit-range">${escapeHtml(u.first)} → ${escapeHtml(u.last)}</p>${status}</a>`;
    }).join('');
  }catch(error){grid.innerHTML='<p>Unable to load the unit list. Please refresh the page.</p>';}
  function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
})();
