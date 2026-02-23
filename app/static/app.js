let completedVariants = [];

function showTab(id){ document.querySelectorAll('.tab').forEach(s=>s.classList.remove('active')); document.getElementById(id).classList.add('active'); }

async function init(){
  const m = await (await fetch('/api/models')).json();
  const modelSel = document.getElementById('model');
  modelSel.innerHTML = m.models.map(x=>`<option value="${x.path}">${x.name} ${x.supported==='no'?'(unsupported)':''}</option>`).join('');

  const s = await (await fetch('/api/settings')).json();
  document.getElementById('settings_json').value = JSON.stringify(s.settings, null, 2);
  document.getElementById('tones_json').value = JSON.stringify(s.tones, null, 2);
  document.getElementById('font_name').innerHTML = s.fonts.map(f=>`<option>${f}</option>`).join('');
  renderTones(s.tones);

  const p = await (await fetch('/api/presets')).json();
  document.getElementById('presets_json').value = JSON.stringify(p.presets, null, 2);
}

function renderTones(t){
  const el = document.getElementById('tone_checks');
  el.innerHTML = Object.keys(t).map(k=>`<label><input type="checkbox" class="tone" value="${k}" checked /> ${k}</label>`).join(' ');
}

async function extractContent(){
  const fd = new FormData();
  fd.append('source_mode', document.getElementById('source_mode').value);
  fd.append('url', document.getElementById('url').value);
  fd.append('excerpt_chars', document.getElementById('excerpt_chars').value);
  fd.append('max_fetch_mb_override', document.getElementById('max_fetch_override').value || '0');
  for (const f of document.getElementById('files').files){ fd.append('files', f); }
  const res = await (await fetch('/api/extract', {method:'POST', body:fd})).json();
  document.getElementById('preview').value = res.text;
  document.getElementById('counts').innerText = `Chars: ${res.chars} Words: ${res.words}`;
  window.sourceRef = res.source_reference;
}

async function generateText(){
  completedVariants = [];
  document.getElementById('jobs').innerHTML = 'Generating...';
  const tones = [...document.querySelectorAll('.tone:checked')].map(x=>x.value);
  const payload = {
    content: document.getElementById('preview').value,
    model: document.getElementById('model').value,
    tones,
    word_count_target: Number(document.getElementById('word_count').value),
    line_count_target: Number(document.getElementById('line_count').value),
    variants_per_tone: Number(document.getElementById('variants').value),
    llm_parameters: JSON.parse(document.getElementById('settings_json').value).llm,
  };
  const data = await (await fetch('/api/generate_text',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)})).json();
  pollJobs(data.jobs);
}

async function pollJobs(jobs){
  let pending = true;
  while(pending){
    pending = false;
    let html = '';
    for (const j of jobs){
      const st = await (await fetch(`/api/jobs/${j.job_id}`)).json();
      html += `<div class="card"><b>${j.tone}</b> - ${st.status}<pre>${st.result||st.error||''}</pre></div>`;
      if(st.status === 'queued' || st.status === 'running') pending = true;
      if(st.status === 'done') completedVariants.push({tone:j.tone, text:st.result, prompt:j.prompt});
    }
    document.getElementById('jobs').innerHTML = html;
    if(pending) await new Promise(r=>setTimeout(r,1000));
  }
}

async function renderFromCompleted(){
  const bgFile = document.getElementById('bg_file').files[0];
  let results = [];
  for(const v of completedVariants){
    const fd = new FormData();
    const payload = {
      text_blocks: v.text.split('\n').filter(Boolean), tone: v.tone,
      source_type: document.getElementById('source_mode').value,
      source_reference: window.sourceRef || '',
      model_used: document.getElementById('model').value,
      prompt_used: v.prompt,
      size_preset: document.getElementById('size_preset').value,
      custom_width: Number(document.getElementById('custom_w').value)||null,
      custom_height: Number(document.getElementById('custom_h').value)||null,
      export_jpg: true,
      background_mode: document.getElementById('bg_mode').value,
      solid_color: document.getElementById('solid_color').value,
      template: document.getElementById('template').value,
      font_name: document.getElementById('font_name').value,
      font_size: Number(document.getElementById('font_size').value),
      bold: document.getElementById('bold').checked,
      letter_spacing: 0,
      line_spacing: Number(document.getElementById('line_spacing').value),
      alignment: 'center',
      outline: document.getElementById('outline').checked,
      outline_thickness: Number(document.getElementById('outline_thickness').value),
      shadow: document.getElementById('shadow').checked
    };
    fd.append('payload', JSON.stringify(payload));
    if(bgFile) fd.append('background_file', bgFile);
    const res = await (await fetch('/api/render_meme', {method:'POST', body:fd})).json();
    results.push(res.files.join(','));
  }
  document.getElementById('render_status').innerText = 'Rendered: '+results.join(' | ');
  loadGallery();
}

async function loadGallery(){
  const g = await (await fetch('/api/gallery')).json();
  document.getElementById('gallery_items').innerHTML = g.items.map(it=>`<div class='card'><img src="${('/outputs/'+it.image.split('/').pop())}" onerror="this.style.display='none'"/><pre>${JSON.stringify(it.meta,null,2)}</pre><a href="${'/outputs/'+it.image.split('/').pop()}">Download</a></div>`).join('');
}

async function saveSettings(){
  await fetch('/api/settings',{method:'POST', headers:{'Content-Type':'application/json'}, body:document.getElementById('settings_json').value});
  alert('Settings saved');
}
async function saveTones(){
  const v = document.getElementById('tones_json').value;
  await fetch('/api/tones',{method:'POST', headers:{'Content-Type':'application/json'}, body:v});
  renderTones(JSON.parse(v));
  alert('Tones saved');
}
async function savePresets(){
  await fetch('/api/presets',{method:'POST', headers:{'Content-Type':'application/json'}, body:document.getElementById('presets_json').value});
  alert('Presets saved');
}


async function rescanModels(){
  const m = await (await fetch('/api/models')).json();
  const modelSel = document.getElementById('model');
  modelSel.innerHTML = m.models.map(x=>`<option value="${x.path}">${x.name} ${x.supported==='no'?'(unsupported)':''}</option>`).join('');
}

init();
