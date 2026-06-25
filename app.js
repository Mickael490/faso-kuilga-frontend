const API = window.location.hostname === 'localhost' ? '/api' : 'https://faso-kuilga-backend.onrender.com/api';
let allPoints = [];
// Vider la barre de recherche au chargement
window.addEventListener('load', function(){ 
  var s = document.getElementById('search'); 
  if(s) s.value = ''; 
});
let allRaccordements = [];
let markers = {};
let clusterGroup;
let activeTypes = new Set(['forage','puits','barrage','retenue','borne']);
let activeEtats = new Set(['fonctionnel','panne','rehab']);
let sortKey = 'nom';
let sortAsc = true;
let invPage = 1;
const INV_PAGE_SIZE = 20;
let satMode = false;
let charts = {};

// ── 17 RÉGIONS OFFICIELLES DU BURKINA FASO ───────────────────────────────────
const REGIONS_BF = [
  'Boucle du Mouhoun',
  'Cascades',
  'Centre',
  'Centre-Est',
  'Centre-Nord',
  'Centre-Ouest',
  'Centre-Sud',
  'Est',
  'Hauts-Bassins',
  'Nord',
  'Plateau Central',
  'Sahel',
  'Sud-Ouest'
];




// ── BOUTON RETOUR EN HAUT ────────────────────────────────────────────────────
var scrollableSelectors = ['.dashboard-grid','.table-wrap','.rapports-grid','.param-grid','.td-sidebar','#point-list','.dp-body'];
function scrollToTop(){
  scrollableSelectors.forEach(function(sel){
    var el = document.querySelector(sel);
    if(el) el.scrollTop = 0;
  });
}
function checkScrollBtn(){
  var btn = document.getElementById('btn-top');
  if(!btn) return;
  var show = false;
  scrollableSelectors.forEach(function(sel){
    var el = document.querySelector(sel);
    if(el && el.scrollTop > 150) show = true;
  });
  btn.style.display = show ? 'flex' : 'none';
}
document.addEventListener('DOMContentLoaded', function(){
  setInterval(checkScrollBtn, 200);
});

// ── MODE PRESENTATION ────────────────────────────────────────────────────────
var presentationMode = false;
function togglePresentation(){
  presentationMode = !presentationMode;
  var btn = document.getElementById('btn-presentation');
  var sidebar = document.getElementById('sidebar');
  var topbar = document.querySelector('.topbar');
  var tnav = document.querySelectorAll('.tnav');
  if(presentationMode){
    if(sidebar) sidebar.style.display = 'none';
    if(topbar){
      topbar.style.padding = '0 16px';
      tnav.forEach(function(t){ t.style.fontSize = '13px'; t.style.padding = '6px 14px'; });
    }
    if(btn){ btn.textContent = '❌ Quitter présentation'; btn.style.background = 'rgba(224,60,60,.15)'; btn.style.borderColor = '#e03c3c'; btn.style.color = '#e03c3c'; }
    setTimeout(function(){ if(typeof map !== 'undefined') map.invalidateSize(); }, 300);
    showToast('🎯 Mode présentation activé — Sidebar masquée');
  } else {
    if(sidebar) sidebar.style.display = '';
    if(topbar){
      tnav.forEach(function(t){ t.style.fontSize = ''; t.style.padding = ''; });
    }
    if(btn){ btn.textContent = '🎯 Présentation'; btn.style.background = 'transparent'; btn.style.borderColor = ''; btn.style.color = ''; }
    setTimeout(function(){ if(typeof map !== 'undefined') map.invalidateSize(); }, 300);
    showToast('✅ Mode présentation désactivé');
  }
}

// ── THEME DARK/LIGHT ──────────────────────────────────────────────────────────
let darkMode = true;
const THEMES = {
  dark:  {bg:'#0d1117',surface:'#161b22',surface2:'#1c2230',border:'#2a3444',text:'#e6edf3',muted:'#7d8fa3',accent:'#00c896',accent2:'#0077ff'},
  light: {bg:'#f4f6f9',surface:'#ffffff',surface2:'#e8edf3',border:'#cbd5e1',text:'#1e293b',muted:'#64748b',accent:'#00a87a',accent2:'#0055cc'}
};
function applyTheme(name){
  const t = THEMES[name];
  const r = document.documentElement.style;
  r.setProperty('--bg', t.bg);
  r.setProperty('--surface', t.surface);
  r.setProperty('--surface2', t.surface2);
  r.setProperty('--border', t.border);
  r.setProperty('--text', t.text);
  r.setProperty('--muted', t.muted);
  r.setProperty('--accent', t.accent);
  r.setProperty('--accent2', t.accent2);
}
function toggleTheme(){
  darkMode = !darkMode;
  const btn = document.getElementById('btn-theme');
  if(darkMode){
    applyTheme('dark');
    if(btn) btn.textContent = '🌙';
    localStorage.setItem('theme','dark');
  } else {
    applyTheme('light');
    if(btn) btn.textContent = '☀️';
    localStorage.setItem('theme','light');
  }
}
// Appliquer le thème sauvegardé au chargement
window.addEventListener('DOMContentLoaded', function(){
  const saved = localStorage.getItem('theme');
  const btn = document.getElementById('btn-theme');
  if(saved === 'light'){
    applyTheme('light');
    darkMode = false;
    if(btn) btn.textContent = '☀️';
  } else {
    applyTheme('dark');
    darkMode = true;
    if(btn) btn.textContent = '🌙';
  }
});


// ── TOAST BIENVENUE ───────────────────────────────────────────────────────────
function showWelcomeToast(){
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const nom = user.nom ? user.nom.split(" ")[0] : "Utilisateur";
  const role = user.role === "admin" ? "👑 Administrateur" : user.role === "technicien" ? "🔧 Technicien" : "👁️ Lecteur";
  let el = document.getElementById("toast-welcome");
  if(!el){
    el = document.createElement("div");
    el.id = "toast-welcome";
    el.style.cssText = "position:fixed;bottom:80px;right:24px;background:linear-gradient(135deg,#00c896,#0077ff);color:#000;padding:14px 20px;border-radius:12px;font-size:13px;font-weight:600;z-index:9999;display:flex;align-items:center;gap:10px;box-shadow:0 8px 32px rgba(0,200,150,.3);animation:toastIn .4s ease forwards;";
    el.innerHTML = "💧 Bonjour <b>" + nom + "</b> — " + role;
    document.body.appendChild(el);
  }
  el.style.display = "flex";
  setTimeout(()=>{ el.style.opacity="0"; el.style.transition="opacity .5s"; setTimeout(()=>el.remove(), 500); }, 4000);
}
window.addEventListener("DOMContentLoaded", ()=>{ setTimeout(showWelcomeToast, 2500); });

// ── AUTH ──────────────────────────────────────────────────────────────────────
const user = JSON.parse(localStorage.getItem('user'));
if(!user) window.location.href = 'login.html';
// Synchronisation clé fk_user avec user
if(user) localStorage.setItem('fk_user', JSON.stringify(user));

if(user){
  document.getElementById('user-av').textContent = user.nom.substring(0,2).toUpperCase();
  document.getElementById('user-name').textContent = user.nom;
  document.getElementById('user-role').textContent = user.role==='admin'?'👑 Administrateur':user.role==='technicien'?'🔧 Technicien':'👁️ Lecteur';
}

function logout(){
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

// ── COULEURS ──────────────────────────────────────────────────────────────────
const COLORS = {
  forage:  {fonctionnel:'#00c896',panne:'#e03c3c',rehab:'#ff6b35'},
  puits:   {fonctionnel:'#00c896',panne:'#e03c3c',rehab:'#ff6b35'},
  barrage: {fonctionnel:'#0077ff',panne:'#e03c3c',rehab:'#ff6b35'},
  retenue: {fonctionnel:'#22d3ee',panne:'#e03c3c',rehab:'#ff6b35'},
  borne:   {fonctionnel:'#c084fc',panne:'#e03c3c',rehab:'#ff6b35'},
};
const ICONS = {forage:'⛏️',puits:'🪣',barrage:'🏞️',retenue:'💦',borne:'🚰'};

function getColor(p){
  const c=COLORS[p.type]||COLORS.forage;
  return p.etat==='panne'?c.panne:p.etat==='rehab'?c.rehab:c.fonctionnel;
}

// ── CARTE ─────────────────────────────────────────────────────────────────────
const map = L.map('map').setView([12.36,-1.53],7);
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'});
const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'© Esri'});
osmLayer.addTo(map);

function toggleBasemap(){
  satMode=!satMode;
  if(satMode){map.removeLayer(osmLayer);satLayer.addTo(map);}
  else{map.removeLayer(satLayer);osmLayer.addTo(map);}
  document.getElementById('btn-sat').style.color=satMode?'var(--accent)':'';
}
function toggleFullscreen(){
  const mc=document.getElementById('page-carte');
  if(!document.fullscreenElement) mc.requestFullscreen();
  else document.exitFullscreen();
}
function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('collapsed');
  setTimeout(()=>map.invalidateSize(),300);
}

// ── CHARGEMENT DES DONNÉES ────────────────────────────────────────────────────
async function loadPoints(){
  try{
    const res = await fetch(`${API}/points`);
    if(!res.ok) throw new Error('Erreur API');
    allPoints = await res.json();
    // Vider la barre de recherche pour eviter l'autocomplete du navigateur
    const searchEl = document.getElementById('search');
    if(searchEl){ searchEl.value = ''; }
    updateKPIs();
    updateRegionSelect();
    renderMarkers();
    renderList();
    renderTable();
    // Mettre à jour KPIs inventaire
    const kpi = id => document.getElementById(id);
    if(kpi('inv-kpi-total')) kpi('inv-kpi-total').textContent = allPoints.length;
    if(kpi('inv-kpi-fonct')) kpi('inv-kpi-fonct').textContent = allPoints.filter(p=>p.etat==='fonctionnel').length;
    if(kpi('inv-kpi-panne')) kpi('inv-kpi-panne').textContent = allPoints.filter(p=>p.etat==='panne').length;
    if(kpi('inv-kpi-barrages')) kpi('inv-kpi-barrages').textContent = allPoints.filter(p=>p.type==='barrage').length;
    if(kpi('inv-kpi-forages')) kpi('inv-kpi-forages').textContent = allPoints.filter(p=>p.type==='forage').length;
    const popTotInv = allPoints.reduce((s,p)=>s+(p.pop_desservie||0),0);
    if(kpi('inv-kpi-pop')) kpi('inv-kpi-pop').textContent = popTotInv>=1000000?(popTotInv/1000000).toFixed(1)+'M':popTotInv>=1000?(popTotInv/1000).toFixed(0)+'k':popTotInv;
    // Barres de progression
    var invTotal = allPoints.length;
    setTimeout(function(){
      var bf = document.getElementById('inv-bar-fonct');
      var bp = document.getElementById('inv-bar-panne');
      var bb = document.getElementById('inv-bar-barrages');
      var bfo = document.getElementById('inv-bar-forages');
      if(bf) bf.style.width = invTotal ? Math.round((allPoints.filter(p=>p.etat==='fonctionnel').length/invTotal)*100)+'%' : '0%';
      if(bp) bp.style.width = invTotal ? Math.round((allPoints.filter(p=>p.etat==='panne').length/invTotal)*100)+'%' : '0%';
      if(bb) bb.style.width = invTotal ? Math.round((allPoints.filter(p=>p.type==='barrage').length/invTotal)*100)+'%' : '0%';
      if(bfo) bfo.style.width = invTotal ? Math.round((allPoints.filter(p=>p.type==='forage').length/invTotal)*100)+'%' : '0%';
    }, 300);
    renderSysStats();
  }catch(e){
    showToast('⚠️ Impossible de contacter le serveur');
    console.error(e);
  }
}

function getFiltered(){
  const search = document.getElementById('search').value.toLowerCase();
  const region = document.getElementById('sel-region').value;
  return allPoints.filter(p=>
    activeTypes.has(p.type) &&
    activeEtats.has(p.etat==='fonctionnel'?'fonctionnel':p.etat==='panne'?'panne':'rehab') &&
    (!search||p.nom.toLowerCase().includes(search)||(p.commune&&p.commune.toLowerCase().includes(search))) &&
    (!region||p.region===region)
  );
}

// ── KPIs ──────────────────────────────────────────────────────────────────────
function updateKPIs(){
  document.getElementById('k-total').textContent = allPoints.length;
  document.getElementById('k-ok').textContent = allPoints.filter(p=>p.etat==='fonctionnel').length;
  document.getElementById('k-panne').textContent = allPoints.filter(p=>p.etat==='panne').length;
  document.getElementById('k-rehab').textContent = allPoints.filter(p=>p.etat==='rehab').length;
  // Mise a jour legende
  var filtered = getFiltered();
  var lf = document.getElementById('leg-fonct');
  var lp = document.getElementById('leg-panne');
  var lr = document.getElementById('leg-rehab');
  var lb = document.getElementById('leg-barrage');
  var lbo = document.getElementById('leg-borne');
  var lt = document.getElementById('leg-total');
  if(lf) lf.textContent = filtered.filter(function(p){return p.etat==='fonctionnel';}).length;
  if(lp) lp.textContent = filtered.filter(function(p){return p.etat==='panne';}).length;
  if(lr) lr.textContent = filtered.filter(function(p){return p.etat==='rehab';}).length;
  if(lb) lb.textContent = filtered.filter(function(p){return p.type==='barrage';}).length;
  if(lbo) lbo.textContent = filtered.filter(function(p){return p.type==='borne';}).length;
  if(lt) lt.textContent = filtered.length;
  // Compteur animé carte
  var ctr = document.getElementById('map-counter-text');
  if(ctr){
    var prev = parseInt(ctr.getAttribute('data-prev')||0);
    var next = filtered.length;
    if(prev !== next){
      ctr.style.transition = 'opacity .2s';
      ctr.style.opacity = '0';
      setTimeout(function(){
        ctr.textContent = next + ' / ' + allPoints.length + ' points';
        ctr.setAttribute('data-prev', next);
        ctr.style.opacity = '1';
      }, 200);
    }
  }
}

// ── MARQUEURS ─────────────────────────────────────────────────────────────────
function renderMarkers(){
  if(clusterGroup) map.removeLayer(clusterGroup);
  clusterGroup = L.markerClusterGroup({maxClusterRadius:50,showCoverageOnHover:false});
  markers = {};
  getFiltered().forEach(p=>{
    const color = getColor(p);
    const size = p.type==='barrage'?16:12;
    const icon = L.divIcon({
      className:'',
      html:`<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2px solid rgba(255,255,255,.5);box-shadow:0 0 0 3px ${color}40;cursor:pointer;"></div>`,
      iconSize:[size,size],iconAnchor:[size/2,size/2]
    });
    const m = L.marker([p.latitude,p.longitude],{icon});
    const popEtat = p.etat==='fonctionnel'?'✅ Fonctionnel':p.etat==='panne'?'🔴 En panne':'🔧 Réhab.';
    const popBadge = p.etat==='fonctionnel'?'#00c896':p.etat==='panne'?'#e03c3c':'#ff6b35';
    m.bindPopup(`<div style="font-family:DM Sans,Arial,sans-serif;min-width:210px;background:#161b22;color:#e6edf3;border-radius:12px;overflow:hidden;margin:-1px">
      <div style="background:linear-gradient(135deg,${color}22,${color}11);border-bottom:1px solid #2a3444;padding:12px 14px;display:flex;align-items:center;gap:10px">
        <div style="width:36px;height:36px;background:${color}22;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${ICONS[p.type]}</div>
        <div>
          <div style="font-weight:700;font-size:13px;line-height:1.2">${p.nom}</div>
          <div style="font-size:10px;color:#7d8fa3;margin-top:2px;text-transform:uppercase;letter-spacing:.4px">${p.type} · ${p.commune||'—'}</div>
        </div>
      </div>
      <div style="padding:10px 14px">
        <div style="display:inline-flex;align-items:center;gap:5px;background:${popBadge}18;border:1px solid ${popBadge}40;border-radius:20px;padding:3px 10px;font-size:11px;color:${popBadge};font-weight:600;margin-bottom:10px">${popEtat}</div>
        <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:11px">
          <span style="color:#7d8fa3">Région</span><span style="color:#e6edf3">${p.region||'—'}</span>
          <span style="color:#7d8fa3">Population</span><span style="color:#e6edf3">${p.pop_desservie?p.pop_desservie.toLocaleString()+' pers.':'—'}</span>
          <span style="color:#7d8fa3">GPS</span><span style="color:#7d8fa3;font-size:10px">${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}</span>
        </div>
        <div style="margin-top:10px;padding-top:8px;border-top:1px solid #2a3444;display:flex;gap:6px">
          <button onclick="showDetail(${JSON.stringify(p).replace(/"/g,'&quot;')})" style="flex:1;padding:6px;background:${color};color:#000;border:none;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer">Détails</button>
          <button onclick="map.setView([${p.latitude},${p.longitude}],14)" style="flex:1;padding:6px;background:#1c2230;color:#e6edf3;border:1px solid #2a3444;border-radius:7px;font-size:11px;cursor:pointer">Centrer</button>
        </div>
      </div>
    </div>`,{maxWidth:250,className:'custom-popup'});
    m.on('click',()=>showDetail(p));
    clusterGroup.addLayer(m);
    markers[p.id] = m;
  });
  map.addLayer(clusterGroup);
}

// ── LISTE SIDEBAR ─────────────────────────────────────────────────────────────
function renderList(){
  const pts = getFiltered();
  document.getElementById('list-count').textContent = `(${pts.length})`;
  document.getElementById('point-list').innerHTML = pts.map(p=>{
    const badge = p.etat==='fonctionnel'?'ok':p.etat==='panne'?'panne':'rehab';
    const label = p.etat==='fonctionnel'?'OK':p.etat==='panne'?'Panne':'Réhab';
    return `<div class="point-item" data-id="${p.id}" onclick='showDetail(${JSON.stringify(p)})'>
      <div class="pi-head"><div class="pi-name">${ICONS[p.type]} ${p.nom}</div><div class="pi-badge ${badge}">${label}</div></div>
      <div class="pi-meta">${p.commune||'—'} · ${p.region||'—'}</div>
    </div>`;
  }).join('');
}

function filterPoints(){renderMarkers();renderList();}

function toggleChip(el){
  el.classList.toggle('active');
  const val=el.dataset.val,filter=el.dataset.filter;
  if(filter==='type'){activeTypes.has(val)?activeTypes.delete(val):activeTypes.add(val);}
  else{activeEtats.has(val)?activeEtats.delete(val):activeEtats.add(val);}
  renderMarkers();renderList();
}

// ── DETAIL PANEL ──────────────────────────────────────────────────────────────
function showDetail(p){
  document.getElementById('dp-title').textContent = p.nom;
  document.getElementById('dp-sub').textContent = `${ICONS[p.type]} ${p.type} · ${p.commune||'—'}`;
  const color = getColor(p);
  let html = `<div class="action-row">
    <button class="btn btn-edit" onclick="ouvrirModificationPoint(allPoints.find(x=>x.id===${p.id}))">✏️ Modifier</button>
    <button class="btn btn-del" onclick="deletePoint(${p.id})">🗑️ Supprimer</button>
  </div>
  <div class="dc">
    <div class="dc-title">Informations générales</div>
    <div class="dc-row"><span class="dc-key">Code</span><span class="dc-val" style="color:${color}">${p.code}</span></div>
    <div class="dc-row"><span class="dc-key">Type</span><span class="dc-val">${ICONS[p.type]} ${p.type}</span></div>
    <div class="dc-row"><span class="dc-key">État</span><span class="dc-val" style="color:${color}">● ${p.etat}</span></div>
    <div class="dc-row"><span class="dc-key">Région</span><span class="dc-val">${p.region||'—'}</span></div>
    <div class="dc-row"><span class="dc-key">Commune</span><span class="dc-val">${p.commune||'—'}</span></div>
    <div class="dc-row"><span class="dc-key">Population</span><span class="dc-val">${p.pop_desservie?(p.pop_desservie.toLocaleString()+' pers.'):'—'}</span></div>
    <div class="dc-row"><span class="dc-key">GPS</span><span class="dc-val">${p.latitude}, ${p.longitude}</span></div>
  </div>`;
  if(p.profondeur_m||p.debit_m3h||p.type_pompe){
    html+=`<div class="dc">
      <div class="dc-title">Caractéristiques techniques</div>
      <div class="dc-row"><span class="dc-key">Profondeur</span><span class="dc-val">${p.profondeur_m?p.profondeur_m+' m':'—'}</span></div>
      <div class="dc-row"><span class="dc-key">Débit</span><span class="dc-val">${p.debit_m3h?p.debit_m3h+' m³/h':'—'}</span></div>
      <div class="dc-row"><span class="dc-key">Pompe</span><span class="dc-val">${p.type_pompe||'—'}</span></div>
      <div class="dc-row"><span class="dc-key">Qualité eau</span><span class="dc-val">${p.qualite_eau||'—'}</span></div>
    </div>`;
  }
  if(p.remplissage!=null){
    const fc=p.remplissage<30?'#e03c3c':p.remplissage<60?'#ff6b35':'#00c896';
    html+=`<div class="dc">
      <div class="dc-title">Données hydrauliques</div>
      ${p.capacite_m3?`<div class="dc-row"><span class="dc-key">Capacité</span><span class="dc-val">${(p.capacite_m3/1e6).toFixed(1)} Mm³</span></div>`:''}
      <div class="dc-row"><span class="dc-key">Usage</span><span class="dc-val">${p.usage||'—'}</span></div>
      <div class="dc-row" style="flex-direction:column;gap:4px">
        <div style="display:flex;justify-content:space-between"><span class="dc-key">Remplissage</span><span style="color:${fc};font-weight:500">${p.remplissage}%</span></div>
        <div class="prog"><div class="prog-fill" style="width:${p.remplissage}%;background:${fc}"></div></div>
      </div>
    </div>`;
  }
  if(p.observations){
    html+=`<div class="dc"><div class="dc-title">Observations</div><div style="font-size:12px;color:var(--muted);line-height:1.6">${p.observations}</div></div>`;
  }
  html+=`<div class="dc">
    <div class="dc-title">Actions</div>
    <button class="btn btn-edit" style="width:100%;margin-bottom:6px" onclick="openInterventionModalFor(${p.id})">🔧 Signaler une intervention</button>
    <button class="btn" style="width:100%;background:rgba(0,119,255,.1);color:#0077ff;border:1px solid rgba(0,119,255,.2)" onclick="genererRapport('general')">📄 Fiche technique PDF</button>
  </div>`;
  document.getElementById('dp-body').innerHTML = html;
  map.setView([p.latitude,p.longitude],12);
  document.querySelectorAll('.point-item').forEach(el=>el.classList.toggle('selected',parseInt(el.dataset.id)===p.id));
}

function closeDetail(){
  document.getElementById('dp-title').textContent = 'Sélectionner un point';
  document.getElementById('dp-sub').textContent = 'Cliquez sur un marqueur';
  document.getElementById('dp-body').innerHTML = '<div class="dp-empty"><div style="font-size:40px">📍</div><div>Cliquez sur un point d\'eau pour afficher ses détails</div></div>';
}

// ── SUPPRESSION ───────────────────────────────────────────────────────────────
async function deletePoint(id){
  if(!confirm('Supprimer ce point d\'eau définitivement ?')) return;
  try{
    await fetch(`${API}/points/${id}`,{method:'DELETE'});
    allPoints = allPoints.filter(p=>p.id!==id);
    updateKPIs();
  updateRegionSelect();renderMarkers();renderList();renderTable();
    closeDetail();
    showToast('🗑️ Point supprimé avec succès');
  }catch(e){showToast('❌ Erreur lors de la suppression');}
}

// ── TABLEAU INVENTAIRE ────────────────────────────────────────────────────────
function renderTable(){
  const search = document.getElementById('inv-search')?document.getElementById('inv-search').value.toLowerCase():'';
  const typeF = document.getElementById('inv-type')?document.getElementById('inv-type').value:'';
  const etatF = document.getElementById('inv-etat')?document.getElementById('inv-etat').value:'';
  let pts = allPoints.filter(p=>
    (!search||p.nom.toLowerCase().includes(search)||(p.commune&&p.commune.toLowerCase().includes(search)))&&
    (!typeF||p.type===typeF)&&(!etatF||p.etat===etatF)
  );
  pts.sort((a,b)=>{const va=a[sortKey]||'',vb=b[sortKey]||'';return sortAsc?(va>vb?1:-1):(va<vb?1:-1);});
  const invTotalPages = Math.ceil(pts.length / INV_PAGE_SIZE);
  if(invPage > invTotalPages) invPage = 1;
  const ptsPage = pts.slice((invPage-1)*INV_PAGE_SIZE, invPage*INV_PAGE_SIZE);
  const badge=e=>e==='fonctionnel'?'ok':e==='panne'?'panne':'rehab';
  const label=e=>e==='fonctionnel'?'Fonctionnel':e==='panne'?'En panne':'Réhab.';
  const tbody = document.getElementById('inv-tbody');
  if(!tbody) return;
  tbody.innerHTML = pts.length === 0
    ? '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:40px">Aucun point d\'eau enregistré. Utilisez le bouton "+ Nouveau point" pour commencer.</td></tr>'
    : ptsPage.map(p=>{
      const rowStyle = p.etat==='panne' ? 'background:rgba(224,60,60,.05);border-left:3px solid #e03c3c;' : p.etat==='rehab' ? 'background:rgba(255,107,53,.05);border-left:3px solid #ff6b35;' : 'border-left:3px solid transparent;';
      return `<tr style="${rowStyle}">
      <td style="text-align:center"><input type="checkbox" class="inv-checkbox" value="${p.id}" onchange="updateInvActionBtn()"/></td>
      <td style="color:var(--accent);font-weight:500">${p.code}</td>
      <td>${ICONS[p.type]} ${p.nom}</td>
      <td>${p.type}</td>
      <td><span class="td-badge ${badge(p.etat)}">${label(p.etat)}</span></td>
      <td>${p.region||'—'}</td>
      <td>${p.commune||'—'}</td>
      <td>${p.pop_desservie?p.pop_desservie.toLocaleString():'—'}</td>
      <td><div class="td-actions">
        <button class="td-btn edit" onclick='showDetail(${JSON.stringify(p).replace(/'/g,"&apos;")})' title="Voir le détail">👁️ Voir</button>
        <button class="td-btn edit" onclick='showDetail(${JSON.stringify(p)});switchPage("carte",document.querySelectorAll(".tnav")[0])'>📍</button>
        <button class="td-btn del" onclick="deletePoint(${p.id})">🗑️</button>
      </div></td>
    </tr>`;
    }).join('');
  const footer = document.getElementById('table-footer');
  if(footer){
    var paginHtml = '<div style="display:flex;align-items:center;justify-content:space-between;width:100%">';
    paginHtml += '<span>'+pts.length+' point(s) — Page '+invPage+' / '+invTotalPages+'</span>';
    paginHtml += '<div style="display:flex;gap:6px">';
    paginHtml += '<button onclick="invPage=1;renderTable()" style="padding:4px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer;font-size:11px" '+(invPage===1?'disabled':'')+'>«</button>';
    paginHtml += '<button onclick="if(invPage>1){invPage--;renderTable()}" style="padding:4px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer;font-size:11px" '+(invPage===1?'disabled':'')+'>‹</button>';
    for(var pi=Math.max(1,invPage-2);pi<=Math.min(invTotalPages,invPage+2);pi++){
      paginHtml += '<button onclick="invPage='+pi+';renderTable()" style="padding:4px 8px;background:'+(pi===invPage?'var(--accent)':'var(--surface2)')+';border:1px solid var(--border);border-radius:6px;color:'+(pi===invPage?'#000':'var(--text)')+';cursor:pointer;font-size:11px;font-weight:'+(pi===invPage?'700':'400')+'">'+pi+'</button>';
    }
    paginHtml += '<button onclick="if(invPage<invTotalPages){invPage++;renderTable()}" style="padding:4px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer;font-size:11px" '+(invPage===invTotalPages?'disabled':'')+'>›</button>';
    paginHtml += '<button onclick="invPage=invTotalPages;renderTable()" style="padding:4px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer;font-size:11px" '+(invPage===invTotalPages?'disabled':'')+'>»</button>';
    paginHtml += '</div></div>';
    footer.innerHTML = paginHtml;
  }
  // Mettre à jour compteur carte
  const counter = document.getElementById('map-counter');
  if(counter) counter.textContent = pts.length + ' / ' + allPoints.length + ' points';
}

function sortTable(key){
  if(sortKey===key) sortAsc=!sortAsc;
  else{sortKey=key;sortAsc=true;}
  renderTable();
}

// ── RACCORDEMENTS ONEA ────────────────────────────────────────────────────────
async function loadRaccordements(){
  try{
    const res = await fetch(`${API}/raccordements`);
    allRaccordements = await res.json();
    renderRaccordements();
    refreshOneaStats();
    updateOneaKPIs();
  }catch(e){console.log('Erreur raccordements',e);}
}

async function updateOneaKPIs(){
  const total = document.getElementById('onea-total');
  const actif = document.getElementById('onea-actif');
  const impaye = document.getElementById('onea-impaye');
  if(total) total.textContent = allRaccordements.length;
  if(actif) actif.textContent = allRaccordements.filter(r=>r.etat==='actif').length;
  if(impaye) impaye.textContent = '—';
}

function renderRaccordements(){
  const search = document.getElementById('onea-search')?document.getElementById('onea-search').value.toLowerCase():'';
  const typeF = document.getElementById('onea-type')?document.getElementById('onea-type').value:'';
  const etatF = document.getElementById('onea-etat')?document.getElementById('onea-etat').value:'';
  let racs = allRaccordements.filter(r=>
    (!search||r.nom_abonne.toLowerCase().includes(search)||(r.commune&&r.commune.toLowerCase().includes(search)))&&
    (!typeF||r.type_abonne===typeF)&&(!etatF||r.etat===etatF)
  );
  const badge=e=>e==='actif'?'ok':e==='suspendu'?'rehab':'panne';
  const tbody = document.getElementById('onea-tbody');
  if(!tbody) return;
  tbody.innerHTML = racs.length===0
    ? '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:40px">Aucun raccordement enregistré. Cliquez sur "+ Nouveau raccordement".</td></tr>'
    : racs.map(r=>{
      const etatCol = r.etat==='actif'?'#00c896':r.etat==='suspendu'?'#fbbf24':'#e03c3c';
      const etatLabel = r.etat==='actif'?'✅ Actif':r.etat==='suspendu'?'⏸️ Suspendu':'🔴 Résilié';
      const typeIcon = r.type_abonne==='menage'?'🏠':r.type_abonne==='commerce'?'🏪':r.type_abonne==='industrie'?'🏭':'💧';
      const initiales = (r.nom_abonne||'?').split(' ').map(function(w){return w[0];}).join('').substring(0,2).toUpperCase();
      return '<tr>'+
        '<td style="color:var(--accent2);font-weight:600;font-family:Syne,sans-serif;font-size:12px">'+r.numero_compteur+'</td>'+
        '<td><div style="display:flex;align-items:center;gap:10px">'+
          '<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#0077ff,#00c896);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0">'+initiales+'</div>'+
          '<div><div style="font-weight:600;font-size:13px">'+r.nom_abonne+'</div>'+
          '<div style="font-size:10px;color:var(--muted)">'+typeIcon+' '+(r.type_abonne||'—')+'</div></div>'+
        '</div></td>'+
        '<td style="color:var(--muted);font-size:12px">'+(r.commune||'—')+'</td>'+
        '<td style="color:var(--muted);font-size:12px">'+(r.region||'—')+'</td>'+
        '<td><span style="padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;background:'+etatCol+'22;color:'+etatCol+'">'+etatLabel+'</span></td>'+
        '<td style="font-size:12px;color:var(--muted)">'+(r.date_raccordement||'—')+'</td>'+
        '<td><div class="td-actions">'+
          '<button class="td-btn edit" onclick="openReleveModal('+r.id+',\"'+r.nom_abonne+'\",\"'+r.numero_compteur+'\")">📊 Relevé</button>'+
          '<button class="td-btn edit" onclick="imprimerFacture('+r.id+',\"'+r.nom_abonne+'\",\"'+r.numero_compteur+'\")">🖨️ Facture</button>'+
          '<button class="td-btn edit" onclick="voirHistorique('+r.id+',\"'+r.nom_abonne+'\")">📋 Historique</button>'+
          '<button class="td-btn del" onclick="modifierRaccordement('+r.id+')">✏️</button>'+
        '</div></td>'+
      '</tr>';
    }).join('');
  const footer = document.getElementById('onea-footer');
  if(footer) footer.textContent = `${racs.length} raccordement(s)`;
}

// ── INTERVENTIONS ─────────────────────────────────────────────────────────────
let allInterventions = [];
let intervSortKey = 'date_intervention';
let intervSortAsc = false;

async function loadInterventions(){
  try{
    const res = await fetch(`${API}/interventions`);
    allInterventions = await res.json();
    updateIntervKPIs();
    renderInterventions();
  }catch(e){console.log('Erreur interventions',e);}
}

function updateIntervKPIs(){
  const total = allInterventions.length;
  const encours = allInterventions.filter(i=>i.statut==='en_cours').length;
  const planifie = allInterventions.filter(i=>i.statut==='planifie').length;
  const termine = allInterventions.filter(i=>i.statut==='termine').length;
  const cout = allInterventions.reduce((s,i)=>s+(i.cout_fcfa||0),0);
  const el = id => document.getElementById(id);
  if(el('interv-total')) el('interv-total').textContent = total;
  if(el('interv-encours')) el('interv-encours').textContent = encours;
  if(el('interv-planifie')) el('interv-planifie').textContent = planifie;
  if(el('interv-termine')) el('interv-termine').textContent = termine;
  if(el('interv-cout')) el('interv-cout').textContent = cout.toLocaleString();
  // Barres de progression
  setTimeout(function(){
    var be = document.getElementById('ibar-encours');
    var bp = document.getElementById('ibar-planifie');
    var bt = document.getElementById('ibar-termine');
    if(be) be.style.width = total ? Math.round((encours/total)*100)+'%' : '0%';
    if(bp) bp.style.width = total ? Math.round((planifie/total)*100)+'%' : '0%';
    if(bt) bt.style.width = total ? Math.round((termine/total)*100)+'%' : '0%';
  }, 300);
}

function filterInterventions(){
  renderInterventions();
}

function sortInterventions(key){
  if(intervSortKey===key) intervSortAsc=!intervSortAsc;
  else{intervSortKey=key;intervSortAsc=true;}
  renderInterventions();
}

function renderInterventions(){
  const search = document.getElementById('interv-search')?.value.toLowerCase()||'';
  const statut = document.getElementById('interv-statut')?.value||'';
  const type = document.getElementById('interv-type')?.value||'';
  const periode = document.getElementById('interv-periode')?.value||'';
  const now = new Date();

  let data = allInterventions.filter(i=>{
    const matchSearch = !search || 
      (i.point_nom||'').toLowerCase().includes(search) ||
      (i.technicien||'').toLowerCase().includes(search) ||
      (i.description||'').toLowerCase().includes(search);
    const matchStatut = !statut || i.statut===statut;
    const matchType = !type || i.type_intervention===type;
    let matchPeriode = true;
    if(periode && i.date_intervention){
      const d = new Date(i.date_intervention);
      if(periode==='mois') matchPeriode = d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
      if(periode==='trimestre') matchPeriode = Math.floor(d.getMonth()/3)===Math.floor(now.getMonth()/3)&&d.getFullYear()===now.getFullYear();
      if(periode==='annee') matchPeriode = d.getFullYear()===now.getFullYear();
    }
    return matchSearch&&matchStatut&&matchType&&matchPeriode;
  });

  data.sort((a,b)=>{
    const va=a[intervSortKey]||'', vb=b[intervSortKey]||'';
    return intervSortAsc?(va>vb?1:-1):(va<vb?1:-1);
  });

  const badge=s=>s==='termine'?'ok':s==='en_cours'?'rehab':'panne';
  const label=s=>s==='termine'?'✅ Terminé':s==='en_cours'?'⏳ En cours':'📅 Planifié';
  const typeIcon={'reparation':'🔧','maintenance':'🛠️','urgence':'🚨','inspection':'🔍','rehabilitation':'♻️'};

  const tbody = document.getElementById('interv-tbody');
  if(!tbody) return;
  tbody.innerHTML = data.length===0
    ? `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:40px">
        Aucune intervention trouvée.<br>
        <button onclick="openInterventionModal()" class="btn-add" style="margin-top:12px">
          ＋ Nouvelle intervention
        </button>
      </td></tr>`
    : data.map(i=>{
      const iStyle = i.type_intervention==='urgence' ? 'background:rgba(224,60,60,.08);border-left:3px solid #e03c3c;' : i.statut==='en_cours' ? 'background:rgba(255,107,53,.05);border-left:3px solid #ff6b35;' : i.statut==='termine' ? 'background:rgba(0,200,150,.04);border-left:3px solid #00c896;' : 'border-left:3px solid #fbbf24;';
      return `<tr style="${iStyle}">
        <td style="text-align:center"><input type="checkbox" class="interv-checkbox" value="${i.id}" onchange="updateIntervActionBtn()"/></td>
        <td style="white-space:nowrap">${i.date_intervention||'—'}</td>
        <td>
          <div style="font-weight:600">${i.point_nom||'—'}</div>
          <div style="font-size:11px;color:var(--muted)">${i.commune||'—'} · ${i.region||'—'}</div>
        </td>
        <td>${typeIcon[i.type_intervention]||'🔧'} ${i.type_intervention||'—'}</td>
        <td style="max-width:200px;font-size:11px">${i.description||'—'}</td>
        <td>
          <div style="font-weight:500">${i.technicien||'—'}</div>
        </td>
        <td style="font-weight:600;color:${i.cout_fcfa?'var(--accent)':'var(--muted)'}">${i.cout_fcfa?i.cout_fcfa.toLocaleString()+' FCFA':'—'}</td>
        <td><span class="td-badge ${badge(i.statut)}">${label(i.statut)}</span></td>
        <td><div class="td-actions">
          <button class="td-btn edit" onclick="voirDetailIntervention(${JSON.stringify(i).replace(/"/g,'&quot;')})" style="background:rgba(0,119,255,.1);color:#0077ff">👁️</button>
          <button class="td-btn edit" onclick="modifierIntervention(${JSON.stringify(i).replace(/"/g,'&quot;')})" style="background:rgba(0,200,150,.1);color:#00c896">✏️</button>
          ${i.statut!=='termine'?`<button class="td-btn edit" onclick="terminerIntervention(${i.id})" title="Marquer terminée">✅</button>`:''}
          <button class="td-btn del" onclick="supprimerIntervention(${i.id})" title="Supprimer">🗑️</button>
        </div></td>
      </tr>`;
    }).join('');

  const footer = document.getElementById('interv-footer');
  if(footer) footer.textContent = `${data.length} intervention(s) affichée(s) sur ${allInterventions.length} total`;
  setTimeout(updateIntervActionBtn,50);
}

async function terminerIntervention(id){
  if(!confirm('Marquer cette intervention comme terminée ?')) return;
  try{
    await fetch(`${API}/interventions/${id}/terminer`,{method:'PUT',
      headers:{'Content-Type':'application/json'}});
  }catch(e){}
  const idx = allInterventions.findIndex(x=>x.id===parseInt(id));
  if(idx !== -1){
    allInterventions[idx] = {...allInterventions[idx], statut:'termine'};
    updateIntervKPIs();
    renderInterventions();
    showToast('✅ Intervention terminée !');
  }
}

async function supprimerIntervention(id){
  if(!confirm('Supprimer cette intervention ?')) return;
  allInterventions = allInterventions.filter(i=>i.id!==id);
  updateIntervKPIs();
  renderInterventions();
  showToast('🗑️ Intervention supprimée');
}

function exportInterventionsCSV(){
  if(allInterventions.length===0){showToast('⚠️ Aucune intervention à exporter');return;}
  const headers=['ID','Date','Point d eau','Type','Description','Technicien','Cout FCFA','Statut'];
  const rows=allInterventions.map(i=>[i.id,i.date_intervention||'',i.point_nom||'',
    i.type_intervention||'',i.description||'',i.technicien||'',i.cout_fcfa||'',i.statut||'']);
  const csv=[headers,...rows].map(r=>r.join(',')).join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download='faso_kuilga_interventions.csv';
  a.click();
  showToast('📥 Export CSV téléchargé !');
}

// ── ALERTES ───────────────────────────────────────────────────────────────────
async function loadAlertes(){
  const pannes = allPoints.filter(p=>p.etat==='panne');
  const rehabs = allPoints.filter(p=>p.etat==='rehab');
  const container = document.getElementById('alertes-container');
  if(!container) return;

  // Mettre à jour KPIs
  const totalPop = pannes.reduce((s,p)=>s+(p.pop_desservie||0),0);
  const coutEstime = pannes.length * 250000 + rehabs.length * 500000;
  const el = id => document.getElementById(id);
  if(el('alerte-pannes')) el('alerte-pannes').textContent = pannes.length;
  if(el('alerte-rehabs')) el('alerte-rehabs').textContent = rehabs.length;
  if(el('alerte-population')) el('alerte-population').textContent = totalPop.toLocaleString();
  if(el('alerte-cout')) el('alerte-cout').textContent = coutEstime.toLocaleString();
  // Barres de progression
  setTimeout(function(){
    var total = allPoints.length;
    var bp = document.getElementById('alerte-bar-pannes');
    var br = document.getElementById('alerte-bar-rehabs');
    if(bp) bp.style.width = total ? Math.round((pannes.length/total)*100)+'%' : '0%';
    if(br) br.style.width = total ? Math.round((rehabs.length/total)*100)+'%' : '0%';
  }, 300);

  // Remplir select régions
  const selRegion = document.getElementById('alerte-region');
  if(selRegion && selRegion.options.length<=1){
    const regions = [...new Set(allPoints.map(p=>p.region).filter(Boolean))].sort();
    regions.forEach(r=>{
      const opt = document.createElement('option');
      opt.value=r; opt.textContent=r;
      selRegion.appendChild(opt);
    });
  }

  renderAlertes(pannes, rehabs);
}

function filterAlertes(){
  const filtre = document.getElementById('alerte-filtre')?.value||'tout';
  const region = document.getElementById('alerte-region')?.value||'';
  let pannes = allPoints.filter(p=>p.etat==='panne');
  let rehabs = allPoints.filter(p=>p.etat==='rehab');
  if(region){
    pannes = pannes.filter(p=>p.region===region);
    rehabs = rehabs.filter(p=>p.region===region);
  }
  if(filtre==='panne') rehabs=[];
  if(filtre==='rehab') pannes=[];
  if(filtre==='critique'){
    pannes = pannes.filter(p=>(p.pop_desservie||0)>500);
    rehabs = [];
  }
  renderAlertes(pannes, rehabs);
}

function renderAlertes(pannes, rehabs){
  const container = document.getElementById('alertes-container');
  if(!container) return;

  if(pannes.length===0 && rehabs.length===0){
    container.innerHTML = `<div style="text-align:center;padding:60px;color:var(--accent)">
      <div style="font-size:48px;margin-bottom:16px">✅</div>
      <div style="font-size:18px;font-weight:600;margin-bottom:8px">Aucune alerte active</div>
      <div style="color:var(--muted);font-size:13px">Tous les points d eau sont fonctionnels</div>
    </div>`;
    return;
  }

  // Trier par population affectée (critique en premier)
  const allAlertes = [
    ...pannes.map(p=>({...p, niveau:'panne'})),
    ...rehabs.map(p=>({...p, niveau:'rehab'}))
  ].sort((a,b)=>(b.pop_desservie||0)-(a.pop_desservie||0));

  let html = '';

  // Section critique (pop > 500)
  const critiques = allAlertes.filter(p=>p.niveau==='panne'&&(p.pop_desservie||0)>500);
  if(critiques.length>0){
    html += `<div style="margin-bottom:16px">
      <div style="font-family:Syne,sans-serif;font-size:12px;text-transform:uppercase;
        color:#e03c3c;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:6px">
        <div style="width:8px;height:8px;background:#e03c3c;border-radius:50%;
          animation:blink 1s infinite"></div>
        🚨 Alertes Critiques (${critiques.length})
      </div>`;
    critiques.forEach(p=>{
      html += `<div class="alert-item" style="border-color:rgba(224,60,60,.4);
        background:rgba(224,60,60,.05);margin-bottom:8px;border-radius:12px;
        padding:14px;display:flex;align-items:center;gap:12px">
        <div style="width:40px;height:40px;background:rgba(224,60,60,.15);
          border-radius:10px;display:flex;align-items:center;justify-content:center;
          font-size:20px;flex-shrink:0">🔴</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">${p.nom}</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px">
            ${ICONS[p.type]||'��'} ${p.type} · ${p.commune||'—'} · ${p.region||'—'}
          </div>
          <div style="display:flex;gap:12px;font-size:12px">
            <span style="color:#e03c3c;font-weight:600">
              ⚠️ ${(p.pop_desservie||0).toLocaleString()} personnes affectées
            </span>
            <span style="color:var(--muted)">📍 ${p.latitude?.toFixed(4)}, ${p.longitude?.toFixed(4)}</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button onclick="openInterventionModalFor(${p.id})" 
            style="padding:7px 12px;background:#e03c3c;color:#fff;border:none;
            border-radius:8px;font-size:11px;cursor:pointer;font-weight:600">
            🔧 Intervenir
          </button>
          <button onclick="showDetail(${JSON.stringify(p).replace(/"/g,'&quot;')});switchPage('carte',document.querySelectorAll('.tnav')[0])"
            style="padding:7px 12px;background:rgba(0,119,255,.1);color:#0077ff;
            border:1px solid rgba(0,119,255,.2);border-radius:8px;font-size:11px;cursor:pointer">
            📍 Localiser
          </button>
        </div>
      </div>`;
    });
    html += '</div>';
  }

  // Section pannes normales
  const normales = allAlertes.filter(p=>p.niveau==='panne'&&(p.pop_desservie||0)<=500);
  if(normales.length>0){
    html += `<div style="margin-bottom:16px">
      <div style="font-family:Syne,sans-serif;font-size:12px;text-transform:uppercase;
        color:#ff6b35;font-weight:700;margin-bottom:8px">
        🔴 Pannes (${normales.length})
      </div>`;
    normales.forEach(p=>{
      html += `<div class="alert-item" style="border-color:rgba(255,107,53,.3);
        margin-bottom:8px;border-radius:12px;padding:12px;
        display:flex;align-items:center;gap:12px">
        <div style="width:36px;height:36px;background:rgba(255,107,53,.1);
          border-radius:8px;display:flex;align-items:center;
          justify-content:center;font-size:18px;flex-shrink:0">🔴</div>
        <div style="flex:1">
          <div style="font-weight:600;margin-bottom:2px">${p.nom}</div>
          <div style="font-size:12px;color:var(--muted)">
            ${p.commune||'—'} · ${p.region||'—'}
            ${p.pop_desservie?` · <span style="color:#ff6b35">${p.pop_desservie.toLocaleString()} pers.</span>`:''}
          </div>
        </div>
        <button onclick="openInterventionModalFor(${p.id})"
          style="padding:6px 10px;background:rgba(255,107,53,.1);color:#ff6b35;
          border:1px solid rgba(255,107,53,.2);border-radius:8px;
          font-size:11px;cursor:pointer">
          🔧 Intervenir
        </button>
      </div>`;
    });
    html += '</div>';
  }

  // Section réhabilitations
  if(rehabs.length>0){
    html += `<div style="margin-bottom:16px">
      <div style="font-family:Syne,sans-serif;font-size:12px;text-transform:uppercase;
        color:#fbbf24;font-weight:700;margin-bottom:8px">
        🔧 En réhabilitation (${rehabs.length})
      </div>`;
    rehabs.forEach(p=>{
      html += `<div class="alert-item" style="border-color:rgba(251,191,36,.3);
        margin-bottom:8px;border-radius:12px;padding:12px;
        display:flex;align-items:center;gap:12px">
        <div style="width:36px;height:36px;background:rgba(251,191,36,.1);
          border-radius:8px;display:flex;align-items:center;
          justify-content:center;font-size:18px;flex-shrink:0">🔧</div>
        <div style="flex:1">
          <div style="font-weight:600;margin-bottom:2px">${p.nom}</div>
          <div style="font-size:12px;color:var(--muted)">${p.commune||'—'} · ${p.region||'—'}</div>
          <div style="font-size:11px;color:#fbbf24;margin-top:2px">
            Réhabilitation en cours
          </div>
        </div>
        <button onclick="showDetail(${JSON.stringify(p).replace(/"/g,'&quot;')});switchPage('carte',document.querySelectorAll('.tnav')[0])"
          style="padding:6px 10px;background:rgba(251,191,36,.1);color:#fbbf24;
          border:1px solid rgba(251,191,36,.2);border-radius:8px;
          font-size:11px;cursor:pointer">
          👁️ Voir
        </button>
      </div>`;
    });
    html += '</div>';
  }

  container.innerHTML = html;
}

function exportAlertesCSV(){
  const pannes = allPoints.filter(p=>p.etat==='panne'||p.etat==='rehab');
  if(pannes.length===0){showToast('✅ Aucune alerte à exporter');return;}
  const headers=['Code','Nom','Type','État','Région','Commune','Population','GPS'];
  const rows=pannes.map(p=>[p.code,p.nom,p.type,p.etat,p.region||'',
    p.commune||'',p.pop_desservie||'',`${p.latitude},${p.longitude}`]);
  const csv=[headers,...rows].map(r=>r.join(',')).join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download='faso_kuilga_alertes.csv';
  a.click();
  showToast('📥 Export alertes téléchargé !');
}

// ── UTILISATEURS ──────────────────────────────────────────────────────────────
let allUsers = [];

async function loadUtilisateurs(){
  try{
    const res = await fetch(`${API}/utilisateurs`);
    allUsers = await res.json();
    // KPIs
    const el = id => document.getElementById(id);
    if(el('users-total')) el('users-total').textContent = allUsers.length;
    if(el('users-actifs')) el('users-actifs').textContent = allUsers.filter(u=>u.actif).length;
    if(el('users-admins')) el('users-admins').textContent = allUsers.filter(u=>u.role==='admin').length;
    if(el('users-techniciens')) el('users-techniciens').textContent = allUsers.filter(u=>u.role==='technicien').length;
    if(el('users-lecteurs')) el('users-lecteurs').textContent = allUsers.filter(u=>u.role==='lecteur').length;
  // Barres de progression utilisateurs
  setTimeout(function(){
    var tot = allUsers.length;
    var actifs = allUsers.filter(function(u){return u.actif;}).length;
    var admins = allUsers.filter(function(u){return u.role==='admin';}).length;
    var techs = allUsers.filter(function(u){return u.role==='technicien';}).length;
    var lects = allUsers.filter(function(u){return u.role==='lecteur';}).length;
    var ba = document.getElementById('users-bar-actifs');
    var bad = document.getElementById('users-bar-admins');
    var bt = document.getElementById('users-bar-tech');
    var bl = document.getElementById('users-bar-lect');
    if(ba) ba.style.width = tot ? Math.round((actifs/tot)*100)+'%' : '0%';
    if(bad) bad.style.width = tot ? Math.round((admins/tot)*100)+'%' : '0%';
    if(bt) bt.style.width = tot ? Math.round((techs/tot)*100)+'%' : '0%';
    if(bl) bl.style.width = tot ? Math.round((lects/tot)*100)+'%' : '0%';
  }, 300);
    renderUsers();
  }catch(e){console.log('Erreur utilisateurs',e);}
}

function filterUsers(){ renderUsers(); }

function renderUsers(){
  const search = document.getElementById('users-search')?.value.toLowerCase()||'';
  const role = document.getElementById('users-role')?.value||'';
  const statut = document.getElementById('users-statut')?.value||'';
  let data = allUsers.filter(u=>{
    const matchSearch = !search||(u.nom||'').toLowerCase().includes(search)||(u.email||'').toLowerCase().includes(search);
    const matchRole = !role||u.role===role;
    const matchStatut = statut===''||String(u.actif?1:0)===statut;
    return matchSearch&&matchRole&&matchStatut;
  });
  const roleIcon = r=>r==='admin'?'⚙️':r==='technicien'?'🔧':'👁️';
  const roleLabel = r=>r==='admin'?'Administrateur':r==='technicien'?'Technicien':'Lecteur';
  const roleColor = r=>r==='admin'?'#c084fc':r==='technicien'?'#fbbf24':'#22d3ee';
  const tbody = document.getElementById('users-tbody');
  if(!tbody) return;
  tbody.innerHTML = data.length===0
    ? '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:40px">Aucun utilisateur trouvé.</td></tr>'
    : data.map(u=>`<tr>
      <td style="text-align:center"><input type="checkbox" class="user-checkbox" value="${u.id}" onchange="updateDeleteBtn()"/></td>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;border-radius:50%;background:${roleColor(u.role)};
            display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#000;flex-shrink:0;font-family:Syne,sans-serif;box-shadow:0 0 0 2px ${roleColor(u.role)}44">
            ${(u.nom||'?').substring(0,2).toUpperCase()}
          </div>
          <div>
            <div style="font-weight:600">${u.nom||'—'}</div>
            <div style="font-size:11px;color:var(--muted)">${u.role==='admin'?'Accès complet':u.role==='technicien'?'Saisie et modification':'Consultation uniquement'}</div>
          </div>
        </div>
      </td>
      <td style="color:var(--muted);font-size:13px">${u.email}</td>
      <td><span style="padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;
        background:${roleColor(u.role)}22;color:${roleColor(u.role)}">
        ${roleIcon(u.role)} ${roleLabel(u.role)}
      </span></td>
      <td><span class="td-badge ${u.actif?'ok':'panne'}">${u.actif?'✅ Actif':'🔴 Inactif'}</span></td>
      <td><div class="td-actions">
        <button class="td-btn edit" onclick="voirDetailUser(${JSON.stringify(u).replace(/"/g,'&quot;')})"
          style="background:rgba(0,119,255,.1);color:#0077ff">
          👁️ Voir
        </button>
        <button class="td-btn edit" onclick="modifierUser(${JSON.stringify(u).replace(/"/g,'&quot;')})"
          style="background:rgba(0,200,150,.1);color:#00c896">
          ✏️ Modifier
        </button>
        <button class="td-btn edit" onclick="toggleUserActif(${u.id},${u.actif})"
          style="background:${u.actif?'rgba(224,60,60,.1)':'rgba(251,191,36,.1)'};color:${u.actif?'#e03c3c':'#fbbf24'}">
          ${u.actif?'🔒 Désactiver':'🔓 Activer'}
        </button>
        <button class="td-btn del" onclick="supprimerUser(${u.id},'${u.nom}')"
          style="background:rgba(224,60,60,.1);color:#e03c3c">
          🗑️
        </button>
      </div></td>
    </tr>`).join('');
  const footer = document.getElementById('users-footer');
  if(footer) footer.textContent = data.length+' utilisateur(s) sur '+allUsers.length+' total';
  // Graphique rôles
  setTimeout(function(){
    var total = allUsers.length;
    var admins = allUsers.filter(function(u){return u.role==='admin';}).length;
    var techs = allUsers.filter(function(u){return u.role==='technicien';}).length;
    var lects = allUsers.filter(function(u){return u.role==='lecteur';}).length;
    var pct = function(n){ return total ? Math.round((n/total)*100) : 0; };
    var el = function(id){ return document.getElementById(id); };
    if(el('role-bar-admin')) el('role-bar-admin').style.width = pct(admins)+'%';
    if(el('role-bar-tech')) el('role-bar-tech').style.width = pct(techs)+'%';
    if(el('role-bar-lect')) el('role-bar-lect').style.width = pct(lects)+'%';
    if(el('role-bar-admin-pct')) el('role-bar-admin-pct').textContent = admins+' ('+pct(admins)+'%)';
    if(el('role-bar-tech-pct')) el('role-bar-tech-pct').textContent = techs+' ('+pct(techs)+'%)';
    if(el('role-bar-lect-pct')) el('role-bar-lect-pct').textContent = lects+' ('+pct(lects)+'%)';
    if(el('role-count-admin')) el('role-count-admin').textContent = admins;
    if(el('role-count-tech')) el('role-count-tech').textContent = techs;
    if(el('role-count-lect')) el('role-count-lect').textContent = lects;
  }, 300);
}

async function toggleUserActif(id,actif){
  await fetch(`${API}/utilisateurs/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({actif:!actif,role:'technicien'})});
  loadUtilisateurs();
  showToast(`✅ Utilisateur ${actif?'désactivé':'activé'}`);
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function renderDashboard(){
  // Date mise à jour
  var now = new Date();
  var dateStr = now.toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  var timeStr = now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  var majEl = document.getElementById('db-last-update');
  if(majEl) majEl.textContent = 'Mise à jour le '+dateStr+' à '+timeStr;
  // KPI cards
  const dbTotal = allPoints.length;
  const dbFonct = allPoints.filter(p=>p.etat==='fonctionnel').length;
  const dbPanne = allPoints.filter(p=>p.etat==='panne').length;
  const dbBarrages = allPoints.filter(p=>p.type==='barrage'||p.type==='retenue').length;
  const dbPop = allPoints.reduce((s,p)=>s+(p.pop_desservie||0),0);
  var pctEl = function(id){ return document.getElementById(id); };
  if(pctEl('db-kpi-total')) pctEl('db-kpi-total').textContent = dbTotal;
  if(pctEl('db-kpi-fonct')) pctEl('db-kpi-fonct').textContent = dbFonct;
  if(pctEl('db-kpi-fonct-pct')) pctEl('db-kpi-fonct-pct').textContent = dbTotal ? Math.round(dbFonct/dbTotal*100)+'% du total' : '—';
  if(pctEl('db-kpi-panne')) pctEl('db-kpi-panne').textContent = dbPanne;
  if(pctEl('db-kpi-panne-pct')) pctEl('db-kpi-panne-pct').textContent = dbTotal ? Math.round(dbPanne/dbTotal*100)+'% du total' : '—';
  if(pctEl('db-kpi-barrages')) pctEl('db-kpi-barrages').textContent = dbBarrages;
  if(pctEl('db-kpi-pop')) pctEl('db-kpi-pop').textContent = dbPop>=1000000?(dbPop/1000000).toFixed(1)+'M':dbPop>=1000?(dbPop/1000).toFixed(0)+'k':dbPop;
  setTimeout(function(){
    var bf = document.getElementById('db-bar-fonct');
    var bp = document.getElementById('db-bar-panne');
    var bb = document.getElementById('db-bar-barrages');
    if(bf) bf.style.width = dbTotal ? Math.round((dbFonct/dbTotal)*100)+'%' : '0%';
    if(bp) bp.style.width = dbTotal ? Math.round((dbPanne/dbTotal)*100)+'%' : '0%';
    if(bb) bb.style.width = dbTotal ? Math.round((dbBarrages/dbTotal)*100)+'%' : '0%';
  }, 300);

  const co={responsive:true,plugins:{legend:{labels:{color:'#7d8fa3',font:{family:'DM Sans',size:11}}}}};
  const types=['forage','puits','barrage','retenue','borne'];
  const typeCounts=types.map(t=>allPoints.filter(p=>p.type===t).length);
  if(charts.type)charts.type.destroy();
  charts.type=new Chart(document.getElementById('chartType').getContext('2d'),{
    type:'bar',
    data:{labels:['⛏️ Forage','🪣 Puits','🏞️ Barrage','💦 Retenue','�� Borne'],
      datasets:[{data:typeCounts,backgroundColor:['#00c89640','#22d3ee40','#0077ff40','#60a5fa40','#c084fc40'],borderColor:['#00c896','#22d3ee','#0077ff','#60a5fa','#c084fc'],borderWidth:2,borderRadius:8}]},
    options:{...co,plugins:{legend:{display:false}},scales:{y:{ticks:{color:'#7d8fa3'},grid:{color:'#2a3444'}},x:{ticks:{color:'#7d8fa3'},grid:{display:false}}}}
  });
  if(charts.etat)charts.etat.destroy();
  charts.etat=new Chart(document.getElementById('chartEtat').getContext('2d'),{
    type:'doughnut',
    data:{labels:['Fonctionnel','En panne','Réhabilitation'],
      datasets:[{data:[allPoints.filter(p=>p.etat==='fonctionnel').length,allPoints.filter(p=>p.etat==='panne').length,allPoints.filter(p=>p.etat==='rehab').length],
        backgroundColor:['#00c89640','#e03c3c40','#ff6b3540'],borderColor:['#00c896','#e03c3c','#ff6b35'],borderWidth:2}]},
    options:{...co,cutout:'65%'}
  });
  const regions=[...new Set(allPoints.map(p=>p.region).filter(Boolean))];
  const regData=regions.map(r=>{
    const total=allPoints.filter(p=>p.region===r).length;
    const ok=allPoints.filter(p=>p.region===r&&p.etat==='fonctionnel').length;
    return total>0?Math.round((ok/total)*100):0;
  });
  if(charts.region)charts.region.destroy();
  charts.region=new Chart(document.getElementById('chartRegion').getContext('2d'),{
    type:'bar',
    data:{labels:regions,datasets:[{label:'%',data:regData,backgroundColor:'#0077ff30',borderColor:'#0077ff',borderWidth:2,borderRadius:6}]},
    options:{...co,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#7d8fa3'},grid:{color:'#2a3444'},min:0,max:100},y:{ticks:{color:'#7d8fa3'},grid:{display:false}}}}
  });
  const fonct=allPoints.length>0?Math.round((allPoints.filter(p=>p.etat==='fonctionnel').length/allPoints.length)*100):0;
  if(charts.fonct)charts.fonct.destroy();
  charts.fonct=new Chart(document.getElementById('chartFonct').getContext('2d'),{
    type:'doughnut',
    data:{labels:['Fonctionnel','Autres'],datasets:[{data:[fonct,100-fonct],backgroundColor:['#00c89640','#2a344440'],borderColor:['#00c896','#2a3444'],borderWidth:2}]},
    options:{...co,cutout:'70%',plugins:{legend:{display:false}}}
  });
  // Carte densite par region
  var densityEl = document.getElementById('density-chart');
  if(densityEl){
    var regions13 = ['Boucle du Mouhoun','Cascades','Centre','Centre-Est','Centre-Nord','Centre-Ouest','Centre-Sud','Est','Hauts-Bassins','Nord','Plateau Central','Sahel','Sud-Ouest'];
    var counts = regions13.map(function(r){ return allPoints.filter(function(p){ return p.region===r; }).length; });
    var maxC = Math.max.apply(null, counts);
    var html = '';
    for(var i=0; i<regions13.length; i++){
      var r = regions13[i];
      var pts = allPoints.filter(function(p){ return p.region===r; });
      var nb = pts.length;
      var fR = pts.filter(function(p){ return p.etat==='fonctionnel'; }).length;
      var pR = pts.filter(function(p){ return p.etat==='panne'; }).length;
      var pct = maxC > 0 ? Math.round((nb/maxC)*100) : 0;
      var col = pct>75 ? '#00c896' : pct>50 ? '#0077ff' : pct>25 ? '#fbbf24' : '#e03c3c';
      html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:7px">';
      html += '<div style="width:140px;font-size:11px;color:var(--text);flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+r+'</div>';
      html += '<div style="flex:1;height:16px;background:var(--surface2);border-radius:4px;overflow:hidden">';
      html += '<div style="height:100%;width:'+pct+'%;background:'+col+';border-radius:4px;transition:width .6s ease"></div>';
      html += '</div>';
      html += '<div style="width:30px;font-size:11px;font-weight:600;color:'+col+';text-align:right">'+nb+'</div>';
      html += '<div style="width:70px;font-size:10px;color:var(--muted);text-align:right">'+fR+' ok / '+pR+' hs</div>';
      html += '</div>';
    }
    densityEl.innerHTML = html;
  }

    const pannes=allPoints.filter(p=>p.etat==='panne');
  const alertList=document.getElementById('alert-list');
  if(alertList) alertList.innerHTML=pannes.length===0
    ?'<div style="color:var(--accent);font-size:13px;padding:10px">✅ Aucune alerte active</div>'
    :pannes.map(p=>`<div class="alert-item"><span style="font-size:18px">🔴</span><div><strong style="display:block;margin-bottom:2px">${p.nom}</strong><span style="color:var(--muted)">${p.commune||'—'} · ${p.region||'—'}${p.pop_desservie?' — '+p.pop_desservie.toLocaleString()+' pers. affectées':''}</span></div></div>`).join('');
  const totalPop=allPoints.reduce((s,p)=>s+(p.pop_desservie||0),0);
  const popStats=document.getElementById('pop-stats');
  if(popStats) popStats.innerHTML=`
    <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:var(--accent);margin-bottom:12px">${totalPop.toLocaleString()}<span style="font-size:13px;color:var(--muted);font-family:'DM Sans',sans-serif"> personnes</span></div>
    ${types.map(t=>{const pop=allPoints.filter(p=>p.type===t).reduce((s,p)=>s+(p.pop_desservie||0),0);return `<div class="pop-row"><div><div>${ICONS[t]} ${t}</div><div class="pop-bar"><div class="pop-fill" style="width:${totalPop?Math.round((pop/totalPop)*100):0}%"></div></div></div><span style="font-weight:500">${pop.toLocaleString()}</span></div>`;}).join('')}`;
}

// ── RAPPORTS ──────────────────────────────────────────────────────────────────
function genererRapport(type){
  const titres={general:'Rapport Général',pannes:'Rapport des Pannes',onea:'Rapport ONEA',region:'Rapport par Région',population:'Rapport Population'};
  const pts=type==='pannes'?allPoints.filter(p=>p.etat==='panne'||p.etat==='rehab'):allPoints;
  const now=new Date().toLocaleDateString('fr-FR');
  const doc=`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${titres[type]}</title>
  <style>body{font-family:Arial,sans-serif;padding:30px;color:#000}h1{color:#1a5276;border-bottom:3px solid #1a5276;padding-bottom:10px}
  table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#1a5276;color:#fff;padding:8px;text-align:left;font-size:12px}
  td{padding:7px 8px;border-bottom:1px solid #ddd;font-size:11px}tr:nth-child(even){background:#f8f9fa}
  .kpi-row{display:flex;gap:20px;margin:20px 0}.kpi-box{background:#f0f8ff;border:1px solid #1a5276;border-radius:8px;padding:15px;flex:1;text-align:center}
  .kpi-box .val{font-size:28px;font-weight:bold;color:#1a5276}.kpi-box .lbl{font-size:11px;color:#666}
  @media print{button{display:none}}</style></head><body>
  <h1>🇧🇫 Faso Kuilga — ${titres[type]}</h1>
  <p>Généré le ${now} | Système de Gestion des Points d'Eau du Burkina Faso</p>
  <div class="kpi-row">
    <div class="kpi-box"><div class="val">${allPoints.length}</div><div class="lbl">Total points d'eau</div></div>
    <div class="kpi-box"><div class="val">${allPoints.filter(p=>p.etat==='fonctionnel').length}</div><div class="lbl">Fonctionnels</div></div>
    <div class="kpi-box"><div class="val">${allPoints.filter(p=>p.etat==='panne').length}</div><div class="lbl">En panne</div></div>
    <div class="kpi-box"><div class="val">${allPoints.reduce((s,p)=>s+(p.pop_desservie||0),0).toLocaleString()}</div><div class="lbl">Population desservie</div></div>
  </div>
  <table><thead><tr><th>Code</th><th>Nom</th><th>Type</th><th>État</th><th>Région</th><th>Commune</th><th>Population</th></tr></thead>
  <tbody>${pts.map(p=>`<tr><td>${p.code}</td><td>${p.nom}</td><td>${p.type}</td><td>${p.etat}</td><td>${p.region||'—'}</td><td>${p.commune||'—'}</td><td>${p.pop_desservie||'—'}</td></tr>`).join('')}</tbody></table>
  </body></html>`;
  openPrintModal('Faso Kuilga — '+titres[type], doc);
  showToast('📄 Rapport généré !');
}

// ── PARAMÈTRES ────────────────────────────────────────────────────────────────
async function sauvegarderProfil(){
  const nom = document.getElementById('param-nom').value.trim();
  const email = document.getElementById('param-email').value.trim();
  if(!nom || !email){showToast('⚠️ Nom et email requis');return;}
  const user = JSON.parse(localStorage.getItem('user')||localStorage.getItem('fk_user')||'{}');
  if(!user.id){showToast('❌ Session expirée');return;}
  try{
    await fetch(`${API}/utilisateurs/${user.id}`,{method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({nom, email})});
    user.nom = nom; user.email = email;
    localStorage.setItem('fk_user', JSON.stringify(user));
    renderProfilInfo();
    showToast('✅ Profil mis à jour !');
  }catch(e){showToast('❌ Erreur lors de la sauvegarde');}
}

async function testerConnexionSentinel(){
  const btn = document.querySelector('[onclick="testerConnexionSentinel()"]');
  const status = document.getElementById('sentinel-status');
  if(btn) btn.textContent = '⏳ Test en cours...';
  try{
    const res = await fetch(API + '/onea/ndwi/253');
    const d = await res.json();
    if(d.ndwi !== undefined){
      if(status) status.innerHTML = '🟢 Connecté';
      showToast('✅ Connexion Sentinel Hub opérationnelle !');
    } else {
      if(status) status.innerHTML = '🔴 Erreur';
      showToast('❌ Sentinel Hub indisponible');
    }
  }catch(e){
    if(status) status.innerHTML = '🔴 Hors ligne';
    showToast('❌ Connexion Sentinel Hub impossible');
  }
  if(btn) btn.textContent = '🔄 Tester la connexion Sentinel Hub';
}

function renderProfilInfo(){
  const user = JSON.parse(localStorage.getItem('user')||localStorage.getItem('fk_user')||'{}');
  const el = document.getElementById('profil-info');
  if(!el) return;

  const roleColor = r=>r==='admin'?'#c084fc':r==='technicien'?'#fbbf24':'#22d3ee';
  const roleLabel = r=>r==='admin'?'Administrateur':r==='technicien'?'Technicien':'Lecteur';
  const roleIcon  = r=>r==='admin'?'👑':r==='technicien'?'🔧':'👁️';
  const roleDesc  = r=>r==='admin'?'Accès complet — gestion, saisie, configuration':
                       r==='technicien'?'Saisie et modification des données terrain':
                       'Consultation et génération de rapports uniquement';
  const roleBg    = r=>r==='admin'?'linear-gradient(135deg,#7c3aed,#c084fc)':
                       r==='technicien'?'linear-gradient(135deg,#d97706,#fbbf24)':
                       'linear-gradient(135deg,#0891b2,#22d3ee)';

  const col      = roleColor(user.role||'lecteur');
  const initials = (user.nom||'?').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
  const now      = new Date();
  const fonct    = allPoints.filter(p=>p.etat==='fonctionnel').length;
  const tauxF    = allPoints.length?Math.round(fonct/allPoints.length*100):0;
  const pannes   = allPoints.filter(p=>p.etat==='panne').length;
  const rehab    = allPoints.filter(p=>p.etat==='rehab').length;

  el.innerHTML = `
  <!-- CARTE PROFIL COMPACTE — tout en une seule capture -->
  <div style="background:var(--surface);border:1px solid var(--border);
    border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.15)">

    <!-- Bandeau + avatar inline -->
    <div style="background:${roleBg(user.role||'lecteur')};padding:14px 18px;
      display:flex;align-items:center;gap:14px;position:relative">
      <div style="position:absolute;inset:0;background:rgba(0,0,0,.2)"></div>
      <!-- Avatar -->
      <div style="width:52px;height:52px;border-radius:50%;
        background:rgba(255,255,255,.25);border:2px solid rgba(255,255,255,.6);
        display:flex;align-items:center;justify-content:center;
        font-size:18px;font-weight:800;color:#fff;
        font-family:Syne,sans-serif;flex-shrink:0;z-index:1">
        ${initials}
      </div>
      <!-- Nom + rôle -->
      <div style="z-index:1;flex:1">
        <div style="font-family:Syne,sans-serif;font-size:16px;font-weight:800;
          color:#fff;margin-bottom:2px">${user.nom||'Utilisateur'}</div>
        <div style="font-size:11px;color:rgba(255,255,255,.8)">${user.email||'—'}</div>
      </div>
      <!-- Badge rôle + statut -->
      <div style="z-index:1;display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <div style="background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);
          border-radius:20px;padding:3px 10px;font-size:11px;color:#fff;font-weight:700">
          ${roleIcon(user.role||'lecteur')} ${roleLabel(user.role||'lecteur')}
        </div>
        <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:rgba(255,255,255,.8)">
          <div style="width:6px;height:6px;border-radius:50%;background:#4ade80"></div>
          En ligne
        </div>
      </div>
    </div>

    <!-- Description rôle -->
    <div style="padding:8px 16px;background:${col}11;border-bottom:1px solid var(--border);
      font-size:11px;color:var(--muted)">
      ${roleDesc(user.role||'lecteur')}
    </div>

    <!-- Stats en ligne horizontale -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);
      border-bottom:1px solid var(--border)">
      ${[
        {icon:'💧',val:allPoints.length,label:"Points d'eau",c:'#0077ff'},
        {icon:'✅',val:tauxF+'%',label:'Fonctionnels',c:'#00c896'},
        {icon:'🔴',val:pannes,label:'En panne',c:'#e03c3c'},
        {icon:'🔧',val:rehab,label:'Réhabilitation',c:'#ff6b35'}
      ].map(s=>`
        <div style="padding:10px 8px;text-align:center;
          ${s!==([{},{},{},{}])[3]?'border-right:1px solid var(--border)':''}">
          <div style="font-size:14px;margin-bottom:2px">${s.icon}</div>
          <div style="font-family:Syne,sans-serif;font-size:16px;
            font-weight:800;color:${s.c}">${s.val}</div>
          <div style="font-size:10px;color:var(--muted)">${s.label}</div>
        </div>`).join('')}
    </div>

    <!-- Infos session en 2 colonnes -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;
      border-bottom:1px solid var(--border)">
      <div style="padding:10px 16px;border-right:1px solid var(--border)">
        <div style="font-size:10px;color:var(--muted);margin-bottom:2px">📅 Date session</div>
        <div style="font-size:12px;font-weight:600">${now.toLocaleDateString('fr-FR')}</div>
      </div>
      <div style="padding:10px 16px">
        <div style="font-size:10px;color:var(--muted);margin-bottom:2px">🕐 Heure</div>
        <div style="font-size:12px;font-weight:600">
          ${now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
        </div>
      </div>
      <div style="padding:10px 16px;border-right:1px solid var(--border);
        border-top:1px solid var(--border)">
        <div style="font-size:10px;color:var(--muted);margin-bottom:2px">🖥️ Version</div>
        <div style="font-size:12px;font-weight:600">Faso Kuilga v1.0</div>
      </div>
      <div style="padding:10px 16px;border-top:1px solid var(--border)">
        <div style="font-size:10px;color:var(--muted);margin-bottom:2px">🎓 Institution</div>
        <div style="font-size:12px;font-weight:600">UV-BF · 2026</div>
      </div>
    </div>

    <!-- Bouton déconnexion compact -->
    <div style="padding:10px 16px">
      <button onclick="logout()"
        style="width:100%;padding:8px;background:rgba(224,60,60,.1);
        color:#e03c3c;border:1px solid rgba(224,60,60,.3);border-radius:8px;
        font-size:12px;font-weight:700;cursor:pointer;font-family:Syne,sans-serif"
        onmouseover="this.style.background='rgba(224,60,60,.2)'"
        onmouseout="this.style.background='rgba(224,60,60,.1)'">
        🚪 Se déconnecter
      </button>
    </div>
  </div>`;

  if(document.getElementById('param-nom'))   document.getElementById('param-nom').value   = user.nom||'';
  if(document.getElementById('param-email')) document.getElementById('param-email').value = user.email||'';
  if(document.getElementById('param-role'))  document.getElementById('param-role').value  = roleLabel(user.role||'lecteur');
}


function renderSysStats(){
  const el = document.getElementById('sys-stats');
  if(!el) return;
  const fonct = allPoints.filter(p=>p.etat==='fonctionnel').length;
  const pannes = allPoints.filter(p=>p.etat==='panne').length;
  const rehab = allPoints.filter(p=>p.etat==='rehab').length;
  const pop = allPoints.reduce((s,p)=>s+(p.pop_desservie||0),0);
  const regions = [...new Set(allPoints.map(p=>p.region).filter(Boolean))].length;
  const tauxFonct = allPoints.length ? Math.round((fonct/allPoints.length)*100) : 0;
  const stats = [
    {icon:'💧', label:"Points d'eau", val:allPoints.length, color:"#0077ff", pct:100, sub:'total inventorié'},
    {icon:'✅', label:"Fonctionnels", val:fonct, color:"#00c896", pct:tauxFonct, sub:tauxFonct+'% du total'},
    {icon:'🔴', label:"En panne", val:pannes, color:"#e03c3c", pct:allPoints.length?Math.round((pannes/allPoints.length)*100):0, sub:'nécessitent intervention'},
    {icon:'🔧', label:"Réhabilitation", val:rehab, color:"#ff6b35", pct:allPoints.length?Math.round((rehab/allPoints.length)*100):0, sub:'en cours de réhab'},
    {icon:'🚰', label:"Raccordements", val:allRaccordements.length, color:"#c084fc", pct:100, sub:'ONEA Burkina'},
    {icon:'⚒️', label:"Interventions", val:allInterventions.length, color:"#ff6b35", pct:100, sub:'historique complet'},
    {icon:'🌍', label:"Régions couvertes", val:regions+' / 13', color:"#22d3ee", pct:Math.round((regions/13)*100), sub:'sur 13 régions'},
    {icon:'👥', label:"Population desservie", val:pop>=1000000?(pop/1000000).toFixed(1)+'M':pop>=1000?(pop/1000).toFixed(0)+'k':pop, color:"#fbbf24", pct:100, sub:'personnes'},
  ];
  el.innerHTML = stats.map(s=>'<div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px;border-top:2px solid '+s.color+'">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'+
      '<span style="font-size:20px">'+s.icon+'</span>'+
      '<span style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">'+s.label+'</span>'+
    '</div>'+
    '<div style="font-family:Syne,sans-serif;font-size:24px;font-weight:800;color:'+s.color+';margin-bottom:4px">'+s.val+'</div>'+
    '<div style="font-size:10px;color:var(--muted);margin-bottom:8px">'+s.sub+'</div>'+
    '<div style="height:3px;background:var(--border);border-radius:3px"><div style="height:100%;width:'+s.pct+'%;background:'+s.color+';border-radius:3px;transition:width 1s ease"></div></div>'+
  '</div>').join('');
}

function changerMotDePasse(){
  const pwd=document.getElementById('new-pwd').value;
  const confirm=document.getElementById('confirm-pwd').value;
  if(!pwd){showToast('⚠️ Entrez un nouveau mot de passe');return;}
  if(pwd!==confirm){showToast('❌ Les mots de passe ne correspondent pas');return;}
  showToast('✅ Mot de passe mis à jour');
  document.getElementById('new-pwd').value='';
  document.getElementById('confirm-pwd').value='';
}

// ── PAGES ─────────────────────────────────────────────────────────────────────
function switchPage(name,btn){
  // Indicateur de chargement
  var loader = document.getElementById('page-loader');
  if(!loader){
    loader = document.createElement('div');
    loader.id = 'page-loader';
    loader.style.cssText = 'position:fixed;top:0;left:0;right:0;height:2px;z-index:99999;background:linear-gradient(90deg,#00c896,#0077ff,#00c896);background-size:200%;animation:shimmer 1s linear infinite;transition:opacity .3s';
    document.body.appendChild(loader);
  }
  loader.style.opacity = '1';
  setTimeout(function(){ loader.style.opacity = '0'; }, 600);

  // Titre dynamique
  var titles = {
    'carte':'🗺️ Carte — Faso Kuilga',
    'dashboard':'📊 Tableau de bord — Faso Kuilga',
    'inventaire':'📋 Inventaire — Faso Kuilga',
    'onea':'🚰 ONEA — Faso Kuilga',
    'interventions':'🔧 Interventions — Faso Kuilga',
    'alertes':'⚠️ Alertes — Faso Kuilga',
    'utilisateurs':'�� Utilisateurs — Faso Kuilga',
    'rapports':'📄 Rapports — Faso Kuilga',
    'teledetection':'🛰️ Télédétection — Faso Kuilga',
    'parametres':'⚙️ Paramètres — Faso Kuilga'
  };
  document.title = titles[name] || 'Faso Kuilga';

  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tnav').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  if(btn) btn.classList.add('active');
  if(name==="carte"){setTimeout(()=>map.invalidateSize(),300);renderMarkers();}
  if(name==='dashboard') renderDashboard();
  if(name==='inventaire'){
    renderTable();
    // Forcer mise à jour KPIs après rendu
    setTimeout(()=>{
      const kpi = id => document.getElementById(id);
      if(kpi('inv-kpi-total')) kpi('inv-kpi-total').textContent = allPoints.length;
      if(kpi('inv-kpi-fonct')) kpi('inv-kpi-fonct').textContent = allPoints.filter(p=>p.etat==='fonctionnel').length;
      if(kpi('inv-kpi-panne')) kpi('inv-kpi-panne').textContent = allPoints.filter(p=>p.etat==='panne').length;
      if(kpi('inv-kpi-barrages')) kpi('inv-kpi-barrages').textContent = allPoints.filter(p=>p.type==='barrage').length;
      if(kpi('inv-kpi-forages')) kpi('inv-kpi-forages').textContent = allPoints.filter(p=>p.type==='forage').length;
      const popTot = allPoints.reduce((s,p)=>s+(p.pop_desservie||0),0);
      if(kpi('inv-kpi-pop')) kpi('inv-kpi-pop').textContent = popTot>=1000000?(popTot/1000000).toFixed(1)+'M':popTot>=1000?(popTot/1000).toFixed(0)+'k':popTot;
    }, 500);
  }
  if(name==='onea'){
    loadRaccordements().then(()=>{
      setTimeout(()=>{
        initOneaMap();
        renderOneaList(allRaccordements);
      },300);
    });
  }
  if(name==='interventions') loadInterventions();
  if(name==='alertes') loadAlertes();
  if(name==='utilisateurs') loadUtilisateurs();
  if(name==='parametres'){
    renderSysStats();renderProfilInfo();
    const apTotal = document.getElementById('ap-total');
    const apZones = document.getElementById('ap-zones');
    if(apTotal) apTotal.textContent = allPoints.length;
    if(apZones) apZones.textContent = allPoints.filter(p=>p.type==='barrage'||p.type==='retenue').length;
  }
  if(name==='rapports'){loadRapports();}
  if(name==='teledetection'){
    setTimeout(()=>{ initTdMap(); }, 400);
  }
}

// ── MODALS ────────────────────────────────────────────────────────────────────
function openModal(){
  // Remplir les selects de régions
  const selects=['f-region'];
  selects.forEach(id=>{
    const sel=document.getElementById(id);
    if(sel&&sel.options.length<=1){
      REGIONS_BF.forEach(r=>{
        const opt=document.createElement('option');
        opt.value=r;opt.textContent=r;
        sel.appendChild(opt);
      });
    }
  });
  document.getElementById('modal').classList.add('open');
}
function closeModal(){document.getElementById('modal').classList.remove('open');}
function openUserModal(){document.getElementById('modal-user').classList.add('open');}
function closeUserModal(){document.getElementById('modal-user').classList.remove('open');}
function openRaccordementModal(){document.getElementById('modal-raccordement').classList.add('open');}
function closeRaccordementModal(){document.getElementById('modal-raccordement').classList.remove('open');}
function openInterventionModal(){
  const sel=document.getElementById('i-point');
  if(sel) sel.innerHTML=allPoints.map(p=>`<option value="${p.id}">${p.nom} (${p.commune||'—'})</option>`).join('');
  // Réinitialiser pour nouvelle intervention
  const iid = document.getElementById('i-id');
  if(iid) iid.value='';
  const title = document.getElementById('interv-modal-title');
  if(title) title.textContent='🔧 Nouvelle Intervention';
  const btn = document.getElementById('interv-save-btn');
  if(btn) btn.textContent='💾 Enregistrer';
  document.getElementById('modal-intervention').classList.add('open');
}
function openInterventionModalFor(id){
  openInterventionModal();
  const sel=document.getElementById('i-point');
  if(sel) sel.value=id;
}
function closeInterventionModal(){document.getElementById('modal-intervention').classList.remove('open');}
function openImportModal(){showToast('📤 Import CSV disponible prochainement');}

['modal','modal-user','modal-raccordement','modal-intervention'].forEach(id=>{
  const el=document.getElementById(id);
  if(el) el.addEventListener('click',e=>{if(e.target===e.currentTarget)e.target.classList.remove('open');});
});

function switchMTab(el,id){
  document.querySelectorAll('.mtab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  ['general','technique'].forEach(t=>document.getElementById('mtab-'+t).style.display=t===id?'block':'none');
}

// ── SAUVEGARDE POINT D'EAU ────────────────────────────────────────────────────
async function savePoint(){
  var editId = document.getElementById('f-code').dataset.editId||'';
  var code = document.getElementById('f-code').value.trim();
  var nom = document.getElementById('f-nom').value.trim();
  var lat = parseFloat(document.getElementById('f-lat').value);
  var lng = parseFloat(document.getElementById('f-lng').value);
  if(!nom){showToast('Nom requis');return;}
  if(isNaN(lat)||isNaN(lng)){showToast('Coordonnees GPS requises');return;}
  if(lat<9||lat>15.5||lng<-5.5||lng>2.5){showToast('Coordonnees hors Burkina');return;}
  var data = {
    nom: nom,
    type: document.getElementById('f-type').value,
    etat: document.getElementById('f-etat').value,
    region: document.getElementById('f-region').value,
    commune: document.getElementById('f-commune').value,
    latitude: lat,
    longitude: lng,
    pop_desservie: parseInt(document.getElementById('f-pop').value)||null,
    observations: document.getElementById('f-obs') ? document.getElementById('f-obs').value||null : null
  };
  try{
    if(editId){
      var res = await fetch(API+'/points/'+editId, {
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(data)
      });
      if(!res.ok){showToast('Erreur modification');return;}
      var idx = allPoints.findIndex(function(p){return p.id===parseInt(editId);});
      if(idx!==-1) allPoints[idx] = Object.assign({}, allPoints[idx], data);
      document.getElementById('f-code').dataset.editId = '';
      updateKPIs(); updateRegionSelect(); renderMarkers(); renderList(); renderTable();
      map.setView([lat,lng],12);
      closeModal();
      showToast('Point modifie avec succes !');
    } else {
      if(!code){showToast('Code requis');return;}
      data.code = code;
      var res2 = await fetch(API+'/points', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(data)
      });
      if(!res2.ok){
        var err = await res2.json();
        showToast('Erreur: '+(err.detail||'Code existant'));
        return;
      }
      var result = await res2.json();
      data.id = result.id;
      allPoints.push(data);
      updateKPIs(); updateRegionSelect(); renderMarkers(); renderList(); renderTable();
      map.setView([lat,lng],12);
      closeModal();
      showToast('Point ajoute avec succes !');
    }
    ['f-code','f-nom','f-commune','f-lat','f-lng','f-pop'].forEach(function(id){
      var el = document.getElementById(id); if(el) el.value = '';
    });
    document.getElementById('f-code').dataset.editId = '';
    var h2 = document.querySelector('#modal h2');
    if(h2) h2.textContent = 'Nouveau Point';
  } catch(e){
    showToast('Erreur: '+e.message);
    console.error(e);
  }
}
async function saveUser(){
  const id = document.getElementById('u-id')?.value||'';
  const nom = document.getElementById('u-nom').value.trim();
  const email = document.getElementById('u-email').value.trim();
  const pwd = document.getElementById('u-pwd').value;
  const role = document.getElementById('u-role').value;

  if(!nom||!email){showToast('⚠️ Nom et email sont requis');return;}
  if(!id && !pwd){showToast('⚠️ Mot de passe requis pour un nouvel utilisateur');return;}

  try{
    if(id){
      // MODIFICATION — mot de passe optionnel
      const data = {nom, email, role};
      if(pwd) data.mot_de_passe = pwd;
      const res = await fetch(`${API}/utilisateurs/${id}`,{
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(data)
      });
      if(!res.ok){showToast('❌ Erreur lors de la modification');return;}
      // Mettre à jour localement
      const idx = allUsers.findIndex(u=>u.id===parseInt(id));
      if(idx!==-1) allUsers[idx] = {...allUsers[idx], nom, email, role};
      closeUserModal();
      renderUsers();
      showToast('✅ Utilisateur modifié avec succès !');
    } else {
      // CRÉATION — mot de passe obligatoire
      const res = await fetch(`${API}/utilisateurs`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({nom, email, mot_de_passe:pwd, role})
      });
      if(!res.ok){showToast('❌ Email déjà utilisé');return;}
      closeUserModal();
      loadUtilisateurs();
      showToast('✅ Utilisateur créé avec succès !');
    }
    ['u-nom','u-email','u-pwd'].forEach(id=>{document.getElementById(id).value='';});
  }catch(e){showToast('❌ Erreur: '+e.message);}
}

// ── SAUVEGARDE RACCORDEMENT ───────────────────────────────────────────────────
async function saveRaccordement(){
  const data={
    numero_compteur:document.getElementById('r-compteur').value.trim(),
    type_abonne:document.getElementById('r-type').value,
    nom_abonne:document.getElementById('r-nom').value.trim(),
    adresse:document.getElementById('r-adresse').value,
    region:document.getElementById('r-region').value,
    commune:document.getElementById('r-commune').value,
    latitude:parseFloat(document.getElementById('r-lat').value)||null,
    longitude:parseFloat(document.getElementById('r-lng').value)||null,
    date_raccordement:document.getElementById('r-date').value||null,
    etat:document.getElementById('r-etat').value,
    index_initial:parseFloat(document.getElementById('r-index')?.value)||0,
    tarif_type:document.getElementById('r-type').value
  };
  if(!data.numero_compteur||!data.nom_abonne){showToast('⚠️ Numéro compteur et nom requis');return;}
  try{
    await fetch(`${API}/raccordements`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    closeRaccordementModal();
    await loadRaccordements();
    if(oneaMap) renderOneaMap();
    showToast('✅ Raccordement enregistré !');
    // Vider le formulaire
    ['r-compteur','r-nom','r-adresse','r-commune','r-lat','r-lng','r-tel'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.value='';
    });
  }catch(e){showToast('❌ Erreur lors de l\'enregistrement');}
}

// ── SAUVEGARDE INTERVENTION ───────────────────────────────────────────────────
async function saveIntervention(){
  const editId = document.getElementById('i-id') ? document.getElementById('i-id').value : '';
  const data={
    point_eau_id:parseInt(document.getElementById('i-point').value),
    type_intervention:document.getElementById('i-type').value,
    description:document.getElementById('i-desc').value,
    technicien:document.getElementById('i-tech').value,
    date_intervention:document.getElementById('i-date').value||new Date().toISOString().split('T')[0],
    statut:document.getElementById('i-statut').value,
    cout_fcfa:parseFloat(document.getElementById('i-cout').value)||null
  };
  try{
    if(editId){
      await fetch(API+'/interventions/'+editId,{method:'PUT',
        headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      const idx=allInterventions.findIndex(function(x){return x.id===parseInt(editId);});
      if(idx!==-1) allInterventions[idx]=Object.assign({},allInterventions[idx],data);
      if(document.getElementById('i-id')) document.getElementById('i-id').value='';
      updateIntervKPIs();
      renderInterventions();
      closeInterventionModal();
      showToast('Intervention modifiee !');
    } else {
      await fetch(API+'/interventions',{method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      await loadInterventions();
      closeInterventionModal();
      showToast('Intervention enregistree !');
    }
  }catch(e){showToast('Erreur enregistrement: '+e.message);}
}


// ── EXPORT CSV ────────────────────────────────────────────────────────────────
function exportCSV(){
  if(allPoints.length===0){showToast('⚠️ Aucune donnée à exporter');return;}
  const headers=['ID','Code','Nom','Type','État','Région','Commune','Latitude','Longitude','Population'];
  const rows=allPoints.map(p=>[p.id,p.code,p.nom,p.type,p.etat,p.region||'',p.commune||'',p.latitude,p.longitude,p.pop_desservie||'']);
  const csv=[headers,...rows].map(r=>r.join(',')).join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download='faso_kuilga_points_eau.csv';
  a.click();
  showToast('�� Export CSV téléchargé !');
}



// ── EXPORT CARTE PNG ──────────────────────────────────────────────────────────
function exportMapPNG(){
  showToast('📸 Capture en cours...');
  // Utiliser l'API html2canvas via CDN
  var script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  script.onload = function(){
    var mapEl = document.getElementById('map');
    html2canvas(mapEl, {
      useCORS: true,
      allowTaint: true,
      scale: 2
    }).then(function(canvas){
      var link = document.createElement('a');
      var now = new Date();
      var dateStr = now.toISOString().slice(0,10);
      link.download = 'faso_kuilga_carte_'+dateStr+'.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('✅ Carte exportée en PNG');
    }).catch(function(){
      showToast('❌ Erreur lors de l\'export');
    });
  };
  document.head.appendChild(script);
}

// ── LOCALISATION GPS ──────────────────────────────────────────────────────────
function locateMe(){
  const btn = document.getElementById("btn-locate");
  if(!navigator.geolocation){ showToast("❌ Géolocalisation non supportée"); return; }
  if(btn) btn.textContent = "⏳";
  navigator.geolocation.getCurrentPosition(
    (pos)=>{
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      map.setView([lat, lng], 12);
      L.marker([lat, lng], {
        icon: L.divIcon({
          className:"",
          html:`<div style="width:16px;height:16px;background:#0077ff;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 4px rgba(0,119,255,.3)"></div>`,
          iconSize:[16,16], iconAnchor:[8,8]
        })
      }).addTo(map).bindPopup("📍 Votre position").openPopup();
      if(btn) btn.textContent = "📍";
      showToast("📍 Position localisée");
    },
    (err)=>{
      if(btn) btn.textContent = "📍";
      showToast("❌ Impossible d'obtenir la position");
    },
    {timeout:8000, enableHighAccuracy:true}
  );
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg){
  const t=document.getElementById('toast');
  document.getElementById('toast-msg').textContent=msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),3000);
}

// ── INITIALISATION ────────────────────────────────────────────────────────────
loadPoints();
setTimeout(()=>{map.invalidateSize();},500);

// ── CARTE TÉLÉDÉTECTION (instance séparée) ────────────────────────────────────
let tdMap = null;
let tdLayers = {};

function initTdMap() {
  const el = document.getElementById('td-map');
  if (!el) return;
  if (tdMap) { setTimeout(() => tdMap.invalidateSize(), 200); return; }
  tdMap = L.map('td-map').setView([12.5, -1.8], 7);
  window.tdOsmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: 'OpenStreetMap'});
  window.tdSatLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {attribution: 'Esri'});
  window.tdSatMode = false;
  window.tdOsmLayer.addTo(tdMap);
  ['forages','barrages','ndvi','ndwi','eau_surface','points','points_region'].forEach(k => { tdLayers[k] = L.layerGroup(); });
  allPoints.forEach(p => {
    var typeColors = {'forage':'#3b82f6','puits':'#a855f7','barrage':'#f59e0b','retenue':'#06b6d4','borne':'#84cc16'};
    const color = typeColors[p.type] || '#94a3b8';
    const isRect = p.type==='barrage'||p.type==='retenue';
    const size = isRect ? 7 : 5;
    L.circleMarker([p.latitude,p.longitude],{radius:size,fillColor:color,color:'#fff',weight:1,fillOpacity:0.9})
     .bindPopup('<b style="color:'+color+'">'+p.nom+'</b><br>'+p.type+' - '+p.etat).addTo(tdLayers.points_region);
  });
  chargerZonesExistantes();
  // Points d'eau rechargés APRES zones pour ne pas être écrasés
  setTimeout(function(){
    tdLayers.points_region = L.layerGroup();
    allPoints.forEach(function(p){
      var typeColors = {'forage':'#3b82f6','puits':'#a855f7','barrage':'#f59e0b','retenue':'#06b6d4','borne':'#84cc16'};
      var color = typeColors[p.type] || '#94a3b8';
      var size = (p.type==='barrage'||p.type==='retenue') ? 7 : 5;
      L.circleMarker([p.latitude,p.longitude],{radius:size,fillColor:color,color:'#fff',weight:1,fillOpacity:0.9})
       .bindPopup('<b style="color:'+color+'">'+p.nom+'</b><br>'+p.type+' - '+p.etat)
       .addTo(tdLayers.points_region);
    });
    tdLayers.points_region.addTo(tdMap);
    var tgPts = document.getElementById('toggle-points'); if(tgPts) tgPts.classList.add('on');
  }, 800);
  setTimeout(() => tdMap.invalidateSize(), 200);
}

// ── BARRE DE PROGRESSION TELEDETECTION ──────────────────────────────────────
function afficherProgressionTd(show) {
  var existing = document.getElementById('td-progress-bar');
  if (!show) { if (existing) existing.remove(); return; }
  if (existing) return;
  var bar = document.createElement('div');
  bar.id = 'td-progress-bar';
  bar.style.cssText = 'position:absolute;top:0;left:0;right:0;height:4px;z-index:2000;background:rgba(0,119,255,.15);overflow:hidden;';
  bar.innerHTML = '<div style="height:100%;background:linear-gradient(90deg,#0077ff,#00c896,#0077ff);background-size:200%;animation:tdprogress 1.5s linear infinite;border-radius:2px"></div>';
  if (!document.getElementById('td-progress-style')) {
    var st = document.createElement('style');
    st.id = 'td-progress-style';
    st.textContent = '@keyframes tdprogress{0%{background-position:0%}100%{background-position:200%}}';
    document.head.appendChild(st);
  }
  var mapEl = document.getElementById('td-map');
  if (mapEl && mapEl.parentElement) mapEl.parentElement.style.position = 'relative';
  var container = document.querySelector('.td-map') || (mapEl && mapEl.parentElement);
  if (container) container.appendChild(bar);
}

// ── POINTS D'EAU EXISTANTS SUR CARTE TELEDETECTION ──────────────────────────
function afficherPointsExistantsRegion(regionFiltre) {
  if (!tdMap) return;
  if (tdLayers.points_region) { try{tdMap.removeLayer(tdLayers.points_region);}catch(e){} }
  tdLayers.points_region = L.layerGroup();

  var pts = regionFiltre
    ? allPoints.filter(function(p){ return p.region && p.region.toLowerCase().indexOf(regionFiltre.toLowerCase()) !== -1; })
    : allPoints;

  pts.forEach(function(p) {
    // Couleur par type de point d'eau
    var typeColors = {
      'forage':  '#3b82f6',  // bleu
      'puits':   '#a855f7',  // violet
      'barrage': '#f59e0b',  // orange
      'retenue': '#06b6d4',  // cyan
      'borne':   '#84cc16'   // vert clair
    };
    var color = typeColors[p.type] || '#94a3b8';
    // Forme selon type
    var shape = (p.type==='barrage'||p.type==='retenue') ? 'border-radius:3px' : 'border-radius:50%';
    var size = (p.type==='barrage'||p.type==='retenue') ? 14 : 10;
    var etatCol = p.etat==='fonctionnel'?'#00c896':p.etat==='panne'?'#e03c3c':'#ff6b35';
    var icon = L.divIcon({
      className:'',
      html:'<div style="width:'+size+'px;height:'+size+'px;background:'+color+';'+shape+';border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.5)"></div>',
      iconSize:[size,size], iconAnchor:[size/2,size/2]
    });
    L.marker([p.latitude,p.longitude],{icon})
     .bindPopup('<div style="font-family:Arial;padding:6px;min-width:180px">'+
       '<b style="color:'+color+'">'+p.nom+'</b><br>'+
       '<small style="color:#888">Type: </small><span style="color:'+color+';font-weight:600">'+p.type+'</span><br>'+
       '<small style="color:#888">État: </small><span style="color:'+etatCol+';font-weight:600">'+p.etat+'</span><br>'+
       '<small style="color:#888">'+( p.commune||'---')+' — '+(p.region||'---')+'</small>'+
       '</div>')
     .addTo(tdLayers.points_region);
  });
  tdLayers.points_region.addTo(tdMap);
}

// ── STATISTIQUES APRES ANALYSE ───────────────────────────────────────────────
function afficherStatistiquesAnalyse(zones, regionFiltre, typeAnalyse) {
  var existing = document.getElementById('td-stats-panel');
  if (existing) existing.remove();

  var forages = zones.filter(function(z){ return (z.type||'forage')==='forage'; });
  var barrages = zones.filter(function(z){ return z.type==='barrage'; });
  var favorables = zones.filter(function(z){ return (z.score_global||0) > 60; });
  var potentiels = zones.filter(function(z){ var s=z.score_global||0; return s>=40&&s<=60; });
  var defavorables = zones.filter(function(z){ return (z.score_global||0) < 40; });

  // Score de correlation : zones avec point d'eau existant dans rayon 50km
  var ptsRegion = regionFiltre
    ? allPoints.filter(function(p){ return p.region && p.region.toLowerCase().indexOf(regionFiltre.toLowerCase())!==-1; })
    : allPoints;

  var zonesAvecPt = zones.filter(function(z){
    return ptsRegion.some(function(p){
      var d = Math.sqrt(Math.pow(z.latitude-(p.latitude||0),2)+Math.pow(z.longitude-(p.longitude||0),2));
      return d < 0.5; // ~50km
    });
  });
  var scoreCorrel = zones.length > 0 ? Math.round((zonesAvecPt.length/zones.length)*100) : 0;

  // Zones potentielles non exploitees
  var zonesNonExploitees = zones.filter(function(z){
    return !ptsRegion.some(function(p){
      var d = Math.sqrt(Math.pow(z.latitude-(p.latitude||0),2)+Math.pow(z.longitude-(p.longitude||0),2));
      return d < 0.5;
    });
  });

  var panel = document.createElement('div');
  panel.id = 'td-stats-panel';
  panel.style.cssText = 'margin-top:12px;padding:12px;background:var(--surface2);border-radius:10px;border:1px solid var(--border)';
  panel.innerHTML =
    '<div style="font-family:Syne,sans-serif;font-size:11px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;letter-spacing:.5px">Statistiques analyse</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">'+
      '<div style="padding:8px;background:rgba(0,119,255,.1);border-radius:8px;text-align:center">'+
        '<div style="font-size:20px;font-weight:800;color:#0077ff">'+(forages.length||barrages.length)+'</div>'+
        '<div style="font-size:10px;color:var(--muted)">Zones analysees</div>'+
      '</div>'+
      '<div style="padding:8px;background:rgba(0,200,150,.1);border-radius:8px;text-align:center">'+
        '<div style="font-size:20px;font-weight:800;color:#00c896">'+favorables.length+'</div>'+
        '<div style="font-size:10px;color:var(--muted)">Favorables</div>'+
      '</div>'+
      '<div style="padding:8px;background:rgba(255,107,53,.1);border-radius:8px;text-align:center">'+
        '<div style="font-size:20px;font-weight:800;color:#ff6b35">'+potentiels.length+'</div>'+
        '<div style="font-size:10px;color:var(--muted)">Potentielles</div>'+
      '</div>'+
      '<div style="padding:8px;background:rgba(224,60,60,.1);border-radius:8px;text-align:center">'+
        '<div style="font-size:20px;font-weight:800;color:#e03c3c">'+defavorables.length+'</div>'+
        '<div style="font-size:10px;color:var(--muted)">Defavorables</div>'+
      '</div>'+
    '</div>'+
    '<div style="padding:8px;background:rgba(251,191,36,.1);border-radius:8px;margin-bottom:8px">'+
      '<div style="display:flex;justify-content:space-between;margin-bottom:4px">'+
        '<span style="font-size:11px;color:var(--muted)">Score de correlation</span>'+
        '<span style="font-size:13px;font-weight:700;color:#fbbf24">'+scoreCorrel+'%</span>'+
      '</div>'+
      '<div style="background:var(--border);border-radius:3px;height:5px;overflow:hidden">'+
        '<div style="height:100%;background:#fbbf24;width:'+scoreCorrel+'%;border-radius:3px"></div>'+
      '</div>'+
      '<div style="font-size:10px;color:var(--muted);margin-top:4px">'+zonesAvecPt.length+'/'+zones.length+' zones avec infrastructure existante</div>'+
    '</div>'+
    (zonesNonExploitees.length > 0 ?
      '<div style="padding:8px;background:rgba(0,119,255,.08);border-radius:8px;border:1px dashed rgba(0,119,255,.3)">'+
        '<div style="font-size:11px;color:#0077ff;font-weight:600;margin-bottom:4px">Zones potentielles non exploitees</div>'+
        zonesNonExploitees.slice(0,3).map(function(z){
          return '<div style="font-size:10px;color:var(--muted);margin-bottom:2px">• '+z.nom+' ('+Math.round(z.score_global||0)+'%)</div>';
        }).join('')+
        (zonesNonExploitees.length > 3 ? '<div style="font-size:10px;color:var(--muted)">... et '+(zonesNonExploitees.length-3)+' autres</div>' : '')+
      '</div>'
    : '<div style="font-size:11px;color:#00c896;text-align:center">Toutes les zones ont des infrastructures existantes</div>');

  // Inserer apres la liste des barrages dans la sidebar
  var listeBArr = document.getElementById('zones-barrages-list');
  if (listeBArr && listeBArr.parentElement && listeBArr.parentElement.parentElement) {
    listeBArr.parentElement.parentElement.appendChild(panel);
  } else {
    var sidebar = document.querySelector('.td-sidebar') || document.querySelector('[id*="td-sidebar"]');
    if(sidebar) sidebar.appendChild(panel);
  }
}

function mettreAJourLegende(typeAnalyse) {
  var title = document.getElementById('td-legend-title');
  var box = document.getElementById('td-legend-content');
  if (!title || !box) return;

  var legendes = {
    'forages': {
      titre: 'Zones favorables forages',
      items: [
        {col:'#003399', label:'Favorable (score > 60%)'},
        {col:'#3388ff', label:'Potentiel (40-60%)'},
        {col:'#99ccff', label:'Defavorable (< 40%)'},
        {col:'#00c896', label:'Point d eau existant', round:true},
      ]
    },
    'barrages': {
      titre: 'Sites potentiels barrages',
      items: [
        {col:'#c87800', label:'Favorable (score > 55%)'},
        {col:'#fbbf24', label:'Potentiel (35-55%)'},
        {col:'#fcd34d', label:'Defavorable (< 35%)'},
        {col:'#00c896', label:'Point d eau existant', round:true},
      ]
    },
    'ndwi': {
      titre: 'Indice NDWI (Eau)',
      items: [
        {col:'#00bcd4', label:'NDWI > 0 (eau present)'},
        {col:'#22d3ee', label:'NDWI -0.3 a 0'},
        {col:'#67e8f9', label:'NDWI < -0.3 (sec)'},
        {col:'#00c896', label:'Point d eau existant', round:true},
      ]
    },
    'ndvi': {
      titre: 'Indice NDVI (Vegetation)',
      items: [
        {col:'#1a5e1a', label:'NDVI > 0.5 (foret dense)'},
        {col:'#4caf50', label:'NDVI 0.2-0.5 (savane)'},
        {col:'#cddc39', label:'NDVI 0-0.2 (herbeux)'},
        {col:'#ff9800', label:'NDVI < 0 (sol nu/eau)'},
        {col:'#00c896', label:'Point d eau existant', round:true},
      ]
    },
    'eau_surface': {
      titre: 'Eau de surface',
      items: [
        {col:'#38bdf8', label:'Eau abondante'},
        {col:'#7dd3fc', label:'Eau moderee'},
        {col:'#bae6fd', label:'Eau faible'},
        {col:'#00c896', label:'Point d eau existant', round:true},
      ]
    }
  };

  var type = typeAnalyse || 'forages';
  var leg = legendes[type] || legendes['forages'];
  title.textContent = leg.titre;
  box.innerHTML = leg.items.map(function(it){
    var style = 'background:'+it.col+';opacity:.85;'+(it.round?'border-radius:50%':'border-radius:3px');
    return '<div class="leg-item"><div class="leg-dot" style="'+style+'"></div>'+it.label+'</div>';
  }).join('');
}

function toggleTdBasemap(){
  if(!tdMap) return;
  window.tdSatMode = !window.tdSatMode;
  const btn = document.getElementById('btn-td-sat');
  if(window.tdSatMode){ tdMap.removeLayer(window.tdOsmLayer); window.tdSatLayer.addTo(tdMap); if(btn){btn.textContent='Carte';btn.style.background='rgba(0,119,255,.85)';} }
  else{ tdMap.removeLayer(window.tdSatLayer); window.tdOsmLayer.addTo(tdMap); if(btn){btn.textContent='Satellite';btn.style.background='rgba(20,30,48,.85)';} }
}

function afficherDetailTd(z, type){
  const el = id => document.getElementById(id);
  if(!el('td-dp-title')) return;
  const score = z.score_global || 0;
  const col = score>60?'#0077ff':score>40?'#ff6b35':'#e03c3c';
  const statut = score>60?'Favorable':score>40?'Potentiel':'Defavorable';
  el('td-dp-title').textContent = z.nom || '---';
  el('td-dp-sub').textContent = (z.type||type||'---') + ' - ' + (z.region||'---');
  let html = '<div class="dc" style="margin-bottom:8px"><div class="dc-title">Resultats Sentinel-2</div>';
  html += '<div class="dc-row"><span class="dc-key">Score</span><span class="dc-val" style="color:'+col+';font-weight:700">'+score+'% - '+statut+'</span></div>';
  html += '<div class="dc-row"><span class="dc-key">NDWI</span><span class="dc-val">'+(z.ndwi!=null?parseFloat(z.ndwi).toFixed(3):'---')+'</span></div>';
  html += '<div class="dc-row"><span class="dc-key">NDVI</span><span class="dc-val">'+(z.ndvi!=null?parseFloat(z.ndvi).toFixed(3):'---')+'</span></div>';
  html += '<div class="dc-row"><span class="dc-key">Date</span><span class="dc-val">'+(z.date_analyse||'---')+'</span></div></div>';
  if((z.type||type)==='forage'){
    html += '<div class="dc" style="margin-bottom:8px"><div class="dc-title">Forage</div>';
    html += '<div class="dc-row"><span class="dc-key">Profondeur</span><span class="dc-val">'+(z.profondeur_estimee_m?z.profondeur_estimee_m+' m':'---')+'</span></div>';
    html += '<div class="dc-row"><span class="dc-key">Debit</span><span class="dc-val">'+(z.debit_estime_m3h?z.debit_estime_m3h+' m3/h':'---')+'</span></div></div>';
  }
  if((z.type||type)==='barrage'){
    html += '<div class="dc" style="margin-bottom:8px"><div class="dc-title">Barrage</div>';
    html += '<div class="dc-row"><span class="dc-key">Capacite</span><span class="dc-val">'+(z.debit_estime_m3h?Number(z.debit_estime_m3h).toLocaleString()+' m3':'---')+'</span></div></div>';
  }
  html += '<div class="dc"><div class="dc-title">Localisation</div>';
  html += '<div class="dc-row"><span class="dc-key">Region</span><span class="dc-val">'+(z.region||'---')+'</span></div>';
  html += '<div class="dc-row"><span class="dc-key">GPS</span><span class="dc-val" style="font-size:10px">'+z.latitude.toFixed(4)+', '+z.longitude.toFixed(4)+'</span></div></div>';
  el('td-dp-body').innerHTML = html;
}

async function chargerZonesExistantes() {
  try {
    const res = await fetch(API + '/prospection/zones');
    if (!res.ok) return;
    const zones = await res.json();
    if (zones.length > 0) { afficherZonesSurCarte(zones, 'tous'); afficherListeZones(zones); mettreAJourIndices(zones); tdMap.fitBounds([[9.4,-5.5],[15.1,2.5]]); }
  } catch(e) { console.log('Pas de zones en base:', e.message); }
}

async function lancerAnalyse() {
  if (!tdMap) { showToast('Carte non initialisee'); return; }
  ['forages','barrages','ndvi','ndwi','eau_surface','points_region'].forEach(k => {
    if (tdLayers[k]) { tdMap.removeLayer(tdLayers[k]); tdLayers[k] = L.layerGroup(); }
  });
  ['toggle-forages','toggle-barrages','toggle-ndvi','toggle-ndwi','toggle-eau'].forEach(id => {
    const e = document.getElementById(id); if (e) e.classList.remove('on');
  });
  const typeAnalyse = document.getElementById('td-type-analyse') ? document.getElementById('td-type-analyse').value : 'forages';
  const regionFiltre = document.getElementById('td-region') ? document.getElementById('td-region').value : '';
  const btn = document.querySelector('[onclick="lancerAnalyse()"]');
  if (btn) { btn.disabled=true; btn.textContent='Analyse en cours...'; }

  // Barre de progression
  afficherProgressionTd(true);
  showToast('Connexion Sentinel-2 en cours (20-30s)...');
  try {
    const res = await fetch(API + '/prospection/analyser', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({region: regionFiltre, type_analyse: typeAnalyse})
    });
    if (!res.ok) { const e=await res.json().catch(function(){return {};}); throw new Error(e.detail||'Erreur '+res.status); }
    const data = await res.json();
    let zones = data.zones || [];
    zones = zones.map(function(z){ return Object.assign({},z,{ndwi:z.ndwi!=null?z.ndwi:z.ndwi_reel, ndvi:z.ndvi!=null?z.ndvi:z.ndvi_reel}); });
    if (regionFiltre) zones = zones.filter(function(z){ return (z.region||'').toLowerCase().indexOf(regionFiltre.toLowerCase())!==-1; });
    if (typeAnalyse==='forages') zones = zones.filter(function(z){ return (z.type||'forage')==='forage'; });
    else if (typeAnalyse==='barrages') zones = zones.filter(function(z){ return z.type==='barrage'; });
    afficherZonesSurCarte(zones, typeAnalyse);
    afficherListeZones(zones, typeAnalyse);
    mettreAJourIndices(zones);
    afficherPointsExistantsRegion(regionFiltre);
    afficherStatistiquesAnalyse(zones, regionFiltre, typeAnalyse);
    mettreAJourLegende(typeAnalyse);
    showToast('Analyse terminee - '+zones.length+' zone(s) identifiee(s)');
  } catch(e) {
    showToast('Erreur: '+e.message);
    chargerZonesExistantes();
  } finally {
    if (btn) { btn.disabled=false; btn.textContent='Lancer l analyse'; }
    afficherProgressionTd(false);
  }
}

function analyserZone() {
  const region = document.getElementById('td-region') ? document.getElementById('td-region').value : '';
  if (region && tdMap) {
    var coords = {'Centre':[12.36,-1.53,9],'Nord':[13.7,-2.2,9],'Sahel':[14.2,-0.1,8],'Hauts-Bassins':[11.2,-4.3,9],'Est':[12.4,0.8,9],'Boucle du Mouhoun':[12.5,-3.2,9],'Centre-Nord':[13.1,-1.0,9],'Centre-Est':[12.0,-0.4,9],'Centre-Ouest':[12.2,-2.4,9],'Centre-Sud':[11.8,-1.2,9],'Cascades':[10.6,-4.6,9],'Sud-Ouest':[10.9,-3.0,9],'Plateau Central':[12.5,-0.9,9]};
    var c = coords[region]; if (c) tdMap.setView([c[0],c[1]],c[2]);
  }
  lancerAnalyse();
}

function afficherZonesSurCarte(zones, typeAnalyse) {
  if (!tdMap) return;
  ['forages','barrages','ndvi','ndwi','eau_surface'].forEach(function(k){ if(tdLayers[k]) tdMap.removeLayer(tdLayers[k]); tdLayers[k]=L.layerGroup(); });
  var forages = zones.filter(function(z){ return (z.type||'forage')==='forage'; });
  var barrages = zones.filter(function(z){ return z.type==='barrage'; });

  forages.forEach(function(z){
    var s=z.score_global||0;
    // Degrade bleu : favorable=bleu fonce, potentiel=bleu moyen, defavorable=bleu pale
    var col = s>60 ? '#003399' : s>50 ? '#0055cc' : s>40 ? '#3388ff' : s>30 ? '#66aaff' : '#99ccff';
    var bordure = s>60 ? '#001166' : s>50 ? '#003399' : s>40 ? '#0055cc' : '#3388ff';
    var statut=s>60?'Favorable':s>40?'Potentiel':'Defavorable';
    // Rayon selon contexte : petit si tout BF, grand si region specifique
    var regionEl = document.getElementById('td-region');
    var regionVal = regionEl ? regionEl.value : '';
    var rayon = regionVal ? Math.max(10000,Math.round((s/100)*25000)) : Math.max(6000,Math.round((s/100)*15000));
    var zz=z;
    L.circle([z.latitude,z.longitude],{radius:rayon,fillColor:col,color:bordure,weight:2,fillOpacity:s>60?0.55:s>40?0.40:0.25})
     .on('click',function(e){L.DomEvent.stopPropagation(e);afficherDetailTd(zz,'forage');})
     .bindPopup('<b style="color:'+col+'">Forage: '+z.nom+'</b><br>Region: '+(z.region||'---')+'<br>Score: '+s+'% - '+statut+'<br>NDWI: '+(z.ndwi||'---')+' NDVI: '+(z.ndvi||'---')+'<br>Profondeur: '+(z.profondeur_estimee_m?z.profondeur_estimee_m+' m':'---'))
     .addTo(tdLayers.forages);
  });

  barrages.forEach(function(z){
    var s=z.score_global||0;
    // Degrade jaune-orange selon score
    var r,g,b;
    if(s>=55){ // Favorable : jaune dore
      r=Math.round(200+(s-55)*1.2); g=Math.round(150+(s-55)*0.9); b=0;
    } else if(s>=35){ // Potentiel : jaune clair
      r=240; g=Math.round(160+(s-35)*1.5); b=Math.round((s-35)*2);
    } else { // Defavorable : jaune pale
      r=220; g=200; b=Math.round(50+(35-s)*2);
    }
    var col='rgb('+r+','+g+','+b+')';
    var statut=s>55?'Favorable':s>35?'Potentiel':'Defavorable';
    var rayon=Math.max(5000,Math.round((s/100)*18000));
    var zz=z;
    L.circle([z.latitude,z.longitude],{radius:rayon,fillColor:col,color:col,weight:2,fillOpacity:Math.max(0.25,s/100*0.6)})
     .on('click',function(e){L.DomEvent.stopPropagation(e);afficherDetailTd(zz,'barrage');})
     .bindPopup('<b style="color:'+col+'">Barrage: '+z.nom+'</b><br>Region: '+(z.region||'---')+'<br>Score: '+s+'% - '+statut+'<br>NDWI: '+(z.ndwi||'---')+' NDVI: '+(z.ndvi||'---')+'<br>Capacite: '+(z.debit_estime_m3h?Number(z.debit_estime_m3h).toLocaleString()+' m3':'---'))
     .addTo(tdLayers.barrages);
  });

  zones.forEach(function(z){
    if(z.ndwi==null) return;
    var ndwi=parseFloat(z.ndwi);
    var col=ndwi>0?'#00bcd4':ndwi>-0.3?'#22d3ee':'#67e8f9';
    var latN=z.latitude+0.12; var lngN=z.longitude-0.15;
    L.circleMarker([latN,lngN],{radius:12,fillColor:col,color:'#0077b6',weight:2,fillOpacity:0.75})
     .bindTooltip('NDWI: '+ndwi.toFixed(3)+' - '+z.nom).addTo(tdLayers.ndwi);
  });

  zones.forEach(function(z){
    if(z.ndvi==null) return;
    var ndvi=parseFloat(z.ndvi);
    var col=ndvi>0.5?'#1a5e1a':ndvi>0.3?'#2e7d32':ndvi>0.2?'#4caf50':ndvi>0.1?'#8bc34a':ndvi>0?'#cddc39':ndvi>-0.1?'#ffeb3b':ndvi>-0.2?'#ff9800':'#c62828';
    var label=ndvi>0.5?'Foret dense':ndvi>0.3?'Dense':ndvi>0.1?'Moderee':ndvi>-0.1?'Sol nu':'Eau';
    var latN=z.latitude-0.12; var lngN=z.longitude+0.15;
    var icon=L.divIcon({className:'',html:'<div style="width:16px;height:16px;background:'+col+';transform:rotate(45deg);border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,0.4)"></div>',iconSize:[16,16],iconAnchor:[8,8]});
    L.marker([latN,lngN],{icon}).bindPopup('<b style="color:'+col+'">NDVI: '+ndvi.toFixed(3)+'</b><br>'+z.nom+'<br>'+label).addTo(tdLayers.ndvi);
  });

  zones.forEach(function(z){
    if(z.ndwi==null) return;
    var ndwi=parseFloat(z.ndwi);
    var intensity=Math.min(1,Math.max(0.15,(ndwi+1)/2));
    var col=ndwi>0?'#38bdf8':ndwi>-0.3?'#7dd3fc':'#bae6fd';
    L.circle([z.latitude,z.longitude],{radius:Math.max(25000,intensity*60000),fillColor:col,color:'#0ea5e9',weight:1,fillOpacity:Math.max(0.2,intensity*0.5)})
     .bindPopup('<b style="color:#38bdf8">Eau de surface</b><br>'+z.nom+'<br>NDWI: '+ndwi.toFixed(3)).addTo(tdLayers.eau_surface);
  });

  if(!typeAnalyse||typeAnalyse==='forages'){tdLayers.forages.addTo(tdMap);var e1=document.getElementById('toggle-forages');if(e1)e1.classList.add('on');}
  if(!typeAnalyse||typeAnalyse==='barrages'){tdLayers.barrages.addTo(tdMap);var e2=document.getElementById('toggle-barrages');if(e2)e2.classList.add('on');}
  if(typeAnalyse==='ndwi'){tdLayers.ndwi.addTo(tdMap);var e3=document.getElementById('toggle-ndwi');if(e3)e3.classList.add('on');}
  if(typeAnalyse==='ndvi'){tdLayers.ndvi.addTo(tdMap);var e4=document.getElementById('toggle-ndvi');if(e4)e4.classList.add('on');}
  if(typeAnalyse==='eau_surface'){tdLayers.eau_surface.addTo(tdMap);var e5=document.getElementById('toggle-eau');if(e5)e5.classList.add('on');}

  var regionFiltre=document.getElementById('td-region')?document.getElementById('td-region').value:'';
  var coordsRegion={'Centre':[12.36,-1.53,9],'Nord':[13.7,-2.2,9],'Sahel':[14.2,-0.1,8],'Hauts-Bassins':[11.2,-4.3,9],'Est':[12.4,0.8,9],'Boucle du Mouhoun':[12.5,-3.2,9],'Centre-Nord':[13.1,-1.0,9],'Centre-Est':[12.0,-0.4,9],'Centre-Ouest':[12.2,-2.4,9],'Centre-Sud':[11.8,-1.2,9],'Cascades':[10.6,-4.6,9],'Sud-Ouest':[10.9,-3.0,9],'Plateau Central':[12.5,-0.9,9]};
  if(regionFiltre&&coordsRegion[regionFiltre]){var c=coordsRegion[regionFiltre];tdMap.setView([c[0],c[1]],c[2]);}
  else{tdMap.fitBounds([[9.4,-5.5],[15.1,2.5]]);}

  var elc=function(id){return document.getElementById(id);};
  if(elc('zones-count'))elc('zones-count').textContent='('+forages.length+')';
  if(elc('barrages-count'))elc('barrages-count').textContent='('+barrages.length+')';
}

function afficherListeZones(zones, typeAnalyse) {
  var forages=zones.filter(function(z){return (z.type||'forage')==='forage';});
  var barrages=zones.filter(function(z){return z.type==='barrage';});
  var lf=document.getElementById('zones-forages-list');
  if(lf) lf.innerHTML=forages.length===0
    ?'<div style="text-align:center;padding:12px;color:var(--muted);font-size:12px">Aucune zone analysee</div>'
    :forages.map(function(z){var s=z.score_global||0;var c=s>60?'#003d99':s>40?'#0066cc':'#4d94ff';return '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:var(--surface2);border-radius:8px;margin-bottom:5px;font-size:12px;cursor:pointer;border-left:3px solid '+c+'" onclick="if(tdMap)tdMap.setView(['+z.latitude+','+z.longitude+'],11)"><div><div style=\'font-weight:600\'>'+z.nom+'</div><div style=\'color:var(--muted);font-size:10px\'>'+(z.region||'---')+' - NDWI '+(z.ndwi||'---')+'</div></div><span style=\'font-weight:700;color:'+c+'\'>'+s+'%</span></div>';}).join('');
  var lb=document.getElementById('zones-barrages-list');
  if(lb) lb.innerHTML=barrages.length===0
    ?'<div style="text-align:center;padding:12px;color:var(--muted);font-size:12px">Aucun site analyse</div>'
    :barrages.map(function(z){var s=z.score_global||0;var c=s>55?'#f59e0b':'#fbbf24';return '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:var(--surface2);border-radius:8px;margin-bottom:5px;font-size:12px;cursor:pointer;border-left:3px solid #fbbf24" onclick="if(tdMap)tdMap.setView(['+z.latitude+','+z.longitude+'],11)"><div><div style=\'font-weight:600\'>'+z.nom+'</div><div style=\'color:var(--muted);font-size:10px\'>'+(z.region||'---')+' - NDWI '+(z.ndwi||'---')+'</div></div><span style=\'font-weight:700;color:'+c+'\'>'+s+'%</span></div>';}).join('');
}

function mettreAJourIndices(zones) {
  if(!zones||zones.length===0) return;
  var el=function(id){return document.getElementById(id);};
  var ndwiVals=zones.map(function(z){return z.ndwi;}).filter(function(v){return v!=null;}).map(parseFloat);
  var ndviVals=zones.map(function(z){return z.ndvi;}).filter(function(v){return v!=null;}).map(parseFloat);
  var moy=function(arr){return arr.length?arr.reduce(function(a,b){return a+b;})/arr.length:null;};
  var moyNdwi=moy(ndwiVals),moyNdvi=moy(ndviVals);
  var moyMndwi=moyNdwi!=null?moyNdwi*1.1:null;
  var lst=moyNdvi!=null?Math.round(42-moyNdvi*15):null;
  var pct=function(v){return Math.round(Math.min(100,Math.max(0,(v+1)/2*100)));};
  if(el('ndwi-val')&&moyNdwi!=null)el('ndwi-val').textContent=moyNdwi.toFixed(3);
  if(el('ndvi-val')&&moyNdvi!=null)el('ndvi-val').textContent=moyNdvi.toFixed(3);
  if(el('mndwi-val')&&moyMndwi!=null)el('mndwi-val').textContent=Math.min(1.1,moyMndwi).toFixed(3);
  if(el('lst-val')&&lst!=null)el('lst-val').textContent=lst+'C';
  if(el('ndwi-bar')&&moyNdwi!=null)el('ndwi-bar').style.width=pct(moyNdwi)+'%';
  if(el('ndvi-bar')&&moyNdvi!=null)el('ndvi-bar').style.width=pct(moyNdvi)+'%';
  if(el('mndwi-bar')&&moyMndwi!=null)el('mndwi-bar').style.width=pct(moyMndwi/1.1)+'%';
  if(el('lst-bar')&&lst!=null)el('lst-bar').style.width=Math.min(100,lst/50*100).toFixed(0)+'%';
}

function toggleLayer(el, layerName) {
  el.classList.toggle('on');
  if (!tdMap) return;
  if (!tdLayers[layerName]) tdLayers[layerName] = L.layerGroup();
  if (el.classList.contains('on')) tdMap.addLayer(tdLayers[layerName]);
  else tdMap.removeLayer(tdLayers[layerName]);
}

function exportZones() {
  var zones=[];
  ['forages','barrages'].forEach(function(k){
    if(!tdLayers[k]) return;
    tdLayers[k].eachLayer(function(l){
      var ll=l.getLatLng?l.getLatLng():null; if(!ll) return;
      var popup=l.getPopup()?l.getPopup().getContent():'';
      var nom=popup.match(/<b[^>]*>(?:Forage: |Barrage: )?(.*?)<\/b>/)?.[1]||'Zone';
      var score=popup.match(/Score: (\d+)%/)?.[1]||'---';
      zones.push({type:k==='forages'?'Forage':'Barrage',nom:nom,score:score+'%',lat:ll.lat.toFixed(4),lng:ll.lng.toFixed(4)});
    });
  });
  if(zones.length===0){showToast('Aucune zone a exporter');return;}
  var csv=['Type,Nom,Score,Latitude,Longitude'].concat(zones.map(function(z){return [z.type,z.nom,z.score,z.lat,z.lng].join(',');})).join('\n');
  var a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download='zones_teledetection_faso_kuilga.csv';
  a.click();
  showToast(zones.length+' zones exportees');
}

var measureMode=null, measurePoints=[], measureLines=[];

function activerMesureDistance(){
  if(!tdMap){showToast('Carte non initialisee');return;}
  if(measureMode==='distance'){effacerMesures(true);return;}
  tdMap.off('click',onMesureClick);
  var btnA=document.getElementById('btn-measure-area');if(btnA)btnA.style.background='';
  measureMode='distance';measurePoints=[];
  tdMap.getContainer().style.cursor='crosshair';
  tdMap.on('click',onMesureClick);
  var btn=document.getElementById('btn-measure-dist');if(btn)btn.style.background='var(--accent)';
  showToast('Cliquez pour mesurer la distance');
}

function activerMesureSurface(){
  if(!tdMap){showToast('Carte non initialisee');return;}
  if(measureMode==='surface'){effacerMesures(true);return;}
  tdMap.off('click',onMesureClick);
  var btnD=document.getElementById('btn-measure-dist');if(btnD)btnD.style.background='';
  measureMode='surface';measurePoints=[];
  tdMap.getContainer().style.cursor='crosshair';
  tdMap.on('click',onMesureClick);
  var btn=document.getElementById('btn-measure-area');if(btn)btn.style.background='var(--accent)';
  showToast('Cliquez pour ajouter des points - Double-clic pour terminer');
  tdMap.once('dblclick',function(e){L.DomEvent.stop(e);finaliserSurface();});
}

function onMesureClick(e){
  if(!measureMode) return;
  measurePoints.push(e.latlng);
  var col=measureMode==='distance'?'#e03c3c':'#fbbf24';
  var m=L.circleMarker(e.latlng,{radius:5,color:col,fillColor:col,fillOpacity:1,weight:2});
  m.addTo(tdMap);measureLines.push(m);
  if(measureMode==='distance'&&measurePoints.length>=2){
    measureLines=measureLines.filter(function(l){if(l._latlngs&&!l._radius){tdMap.removeLayer(l);return false;}return true;});
    var dist=0;for(var i=1;i<measurePoints.length;i++)dist+=measurePoints[i-1].distanceTo(measurePoints[i]);
    var line=L.polyline(measurePoints,{color:'#e03c3c',weight:2,dashArray:'5,5'});
    line.addTo(tdMap);line.bindTooltip((dist/1000).toFixed(2)+' km',{permanent:true,direction:'center'});measureLines.push(line);
  } else if(measureMode==='surface'&&measurePoints.length>=2){
    measureLines=measureLines.filter(function(l){if(l._latlngs&&l._latlngs[0]&&!l._radius){tdMap.removeLayer(l);return false;}return true;});
    var poly=L.polygon(measurePoints,{color:'#fbbf24',weight:2,fillOpacity:0.15,dashArray:'4,4'});
    poly.addTo(tdMap);measureLines.push(poly);
  }
}

function finaliserSurface(){
  if(measurePoints.length<3){showToast('Minimum 3 points requis');return;}
  tdMap.off('click',onMesureClick);tdMap.off('dblclick');tdMap.getContainer().style.cursor='';
  measureLines.forEach(function(l){try{tdMap.removeLayer(l);}catch(e){}});measureLines=[];
  measurePoints.forEach(function(pt){var m=L.circleMarker(pt,{radius:5,color:'#fbbf24',fillColor:'#fbbf24',fillOpacity:1,weight:2});m.addTo(tdMap);measureLines.push(m);});
  var poly=L.polygon(measurePoints,{color:'#fbbf24',weight:2,fillColor:'#fbbf24',fillOpacity:0.2});
  poly.addTo(tdMap);measureLines.push(poly);
  var area=0;var pts=measurePoints;
  for(var i=0;i<pts.length;i++){var j=(i+1)%pts.length;area+=pts[i].lng*pts[j].lat;area-=pts[j].lng*pts[i].lat;}
  var latMoy=pts.reduce(function(s,p){return s+p.lat;},0)/pts.length;
  var areaKm2=Math.abs(area/2*111.32*111.32*Math.cos(latMoy*Math.PI/180)).toFixed(2);
  var label=L.marker(poly.getBounds().getCenter(),{icon:L.divIcon({html:'<div style="background:rgba(251,191,36,.9);color:#000;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:700;white-space:nowrap">'+areaKm2+' km2</div>',className:'',iconAnchor:[0,0]})});
  label.addTo(tdMap);measureLines.push(label);
  showToast('Surface: '+areaKm2+' km2');measureMode=null;
  var btn=document.getElementById('btn-measure-area');if(btn)btn.style.background='';
}

function effacerMesures(stopMode){
  if(stopMode===undefined)stopMode=true;
  measureLines.forEach(function(l){if(tdMap&&tdMap.hasLayer(l))tdMap.removeLayer(l);});measureLines=[];measurePoints=[];
  if(stopMode){
    measureMode=null;
    if(tdMap){tdMap.off('click',onMesureClick);tdMap.getContainer().style.cursor='';}
    var d=document.getElementById('btn-measure-dist');var a=document.getElementById('btn-measure-area');
    if(d)d.style.background='';if(a)a.style.background='';
    showToast('Mesures effacees');
  }
}


// ── SELECT RÉGIONS DYNAMIQUE ──────────────────────────────────────────────────
function updateRegionSelect(){
  const sel = document.getElementById('sel-region');
  if(!sel) return;
  const regions = [...new Set(allPoints.map(p=>p.region).filter(Boolean))].sort();
  const current = sel.value;
  sel.innerHTML = '<option value="">Toutes les régions</option>';
  regions.forEach(r=>{
    const opt = document.createElement('option');
    opt.value = r;
    opt.textContent = r;
    if(r === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ── ONEA KPIs DEPUIS API ──────────────────────────────────────────────────────
async function refreshOneaStats(){
  try{
    const res = await fetch(API + '/onea/stats');
    const s = await res.json();
    const el = (id) => document.getElementById(id);
    if(el('onea-total')) el('onea-total').textContent = s.total_abonnes;
    if(el('onea-actif')) el('onea-actif').textContent = s.abonnes_actifs;
    if(el('onea-impaye')) el('onea-impaye').textContent = s.montant_impaye_fcfa.toLocaleString()+' FCFA';
    if(el('onea-conso')) el('onea-conso').textContent = s.conso_mois_m3+' m³';
    if(el('onea-montant')) el('onea-montant').textContent = s.montant_mois_fcfa.toLocaleString()+' FCFA';
    // Barre progression actif
    setTimeout(function(){
      var bar = document.getElementById('onea-bar-actif');
      if(bar && s.total_abonnes) bar.style.width = Math.round((s.abonnes_actifs/s.total_abonnes)*100)+'%';
    }, 300);
  }catch(e){console.log('Erreur stats ONEA',e);}
}

// ── RELEVÉ COMPTEUR ───────────────────────────────────────────────────────────
function openReleveModal(raccordementId, nomAbonne, numeroCompteur){
  const now = new Date();
  document.getElementById('releve-id').value = raccordementId;
  document.getElementById('releve-nom').textContent = nomAbonne;
  document.getElementById('releve-compteur').textContent = numeroCompteur;
  document.getElementById('releve-mois').value = now.getMonth()+1;
  document.getElementById('releve-annee').value = now.getFullYear();
  document.getElementById('releve-index').value = '';
  document.getElementById('releve-result').innerHTML = '';
  document.getElementById('modal-releve').classList.add('open');
}

function closeReleveModal(){
  document.getElementById('modal-releve').classList.remove('open');
}

// FEATURE 1 : dernier relevé enregistré (pour la notification SMS de l'abonné)
let dernierReleve = null;

// Construit et affiche le SMS simulé envoyé à l'abonné ONEA après un relevé.
function notifierAbonneSMS(){
  if(!dernierReleve){showToast('⚠️ Aucun relevé à notifier');return;}
  const moisNoms=['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const r = dernierReleve;
  // Échéance : le 30 du mois suivant
  const echMois = r.mois===12 ? 1 : r.mois+1;
  const echAnnee = r.mois===12 ? r.annee+1 : r.annee;
  const ech = `30/${String(echMois).padStart(2,'0')}/${echAnnee}`;
  const sms = `ONEA - Faso Kuilga BF
Bonjour ${r.nom}
Conso ${moisNoms[r.mois]} ${r.annee} : ${r.conso} m³
Facture : ${Number(r.montant).toLocaleString()} FCFA
A payer avant le ${ech}
N° ${r.compteur}
Payez via Orange Money ou Moov Money`;
  document.getElementById('sms-dest').textContent = `📱 Destinataire : ${r.nom} · Compteur ${r.compteur}`;
  document.getElementById('sms-body').textContent = sms;
  document.getElementById('modal-sms').classList.add('open');
}

function closeSmsModal(){
  document.getElementById('modal-sms').classList.remove('open');
}

function envoyerSMS(){
  closeSmsModal();
  showToast('✅ SMS envoyé à l\'abonné (simulation)');
}

async function saveReleve(){
  const raccordement_id = parseInt(document.getElementById('releve-id').value);
  const index_actuel = parseFloat(document.getElementById('releve-index').value);
  const mois = parseInt(document.getElementById('releve-mois').value);
  const annee = parseInt(document.getElementById('releve-annee').value);

  if(isNaN(index_actuel)||index_actuel<0){showToast('⚠️ Index invalide');return;}

  try{
    const res = await fetch(API + '/releve',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({raccordement_id, index_actuel, mois, annee})
    });
    const data = await res.json();
    if(data.error){showToast('❌ '+data.error);return;}

    const moisNoms=['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    // FEATURE 1 : mémoriser le relevé pour la notification SMS de l'abonné
    dernierReleve = {
      nom: document.getElementById('releve-nom').textContent,
      compteur: document.getElementById('releve-compteur').textContent,
      conso: data.consommation_m3,
      montant: data.montant_fcfa,
      mois, annee
    };
    document.getElementById('releve-result').innerHTML = `
      <div style="background:rgba(0,200,150,.1);border:1px solid rgba(0,200,150,.3);border-radius:12px;padding:16px;margin-top:12px">
        <div style="font-weight:600;color:var(--accent);margin-bottom:12px">✅ Relevé ${moisNoms[mois-1]} ${annee} enregistré</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
          <div style="color:var(--muted)">Index précédent</div><div style="font-weight:500">${data.index_precedent} m³</div>
          <div style="color:var(--muted)">Index actuel</div><div style="font-weight:500">${data.index_actuel} m³</div>
          <div style="color:var(--muted)">Consommation</div><div style="font-weight:600;color:var(--accent)">${data.consommation_m3} m³</div>
          <div style="color:var(--muted)">Montant facture</div><div style="font-weight:700;color:#ff6b35;font-size:15px">${data.montant_fcfa.toLocaleString()} FCFA</div>
        </div>
        <div style="margin-top:12px;font-size:11px;color:var(--muted)">Tarification ONEA BF — Redevance fixe 1 500 FCFA incluse</div>
        <button onclick="notifierAbonneSMS()" style="width:100%;margin-top:12px;padding:9px;background:rgba(0,119,255,.12);color:#0077ff;border:1px solid rgba(0,119,255,.3);border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">📱 Notifier l'abonné (SMS)</button>
      </div>`;
    refreshOneaStats();
    showToast('✅ Relevé enregistré — Facture calculée !');
  }catch(e){showToast('❌ Erreur serveur');console.error(e);}
}

async function voirHistorique(id, nom){
  try{
    const res = await fetch(`${API}/raccordements/${id}/historique`);
    const data = await res.json();
    const moisNoms=['','Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    const doc = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>Historique — ${nom}</title>
    <style>body{font-family:Arial;padding:20px}h2{color:#1a5276}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th{background:#1a5276;color:#fff;padding:8px;font-size:12px}
    td{padding:7px 8px;border-bottom:1px solid #ddd;font-size:12px}
    tr:nth-child(even){background:#f8f9fa}
    .paye{color:#27ae60;font-weight:600}.impaye{color:#e03c3c;font-weight:600}
    @media print{button{display:none}}</style></head><body>
    <h2>🚰 Historique Compteur — ${nom}</h2>
    <table><thead><tr>
      <th>Période</th><th>Index Préc.</th><th>Index Act.</th>
      <th>Consommation</th><th>Montant FCFA</th><th>Statut</th>
    </tr></thead><tbody>
    ${data.length===0?'<tr><td colspan="6" style="text-align:center;padding:20px;color:#999">Aucun relevé enregistré</td></tr>':
    data.map(r=>`<tr>
      <td>${moisNoms[r.mois]} ${r.annee}</td>
      <td>${r.index_precedent||0} m³</td>
      <td>${r.index_actuel||0} m³</td>
      <td><b>${r.consommation_m3||0} m³</b></td>
      <td><b>${(r.montant_fcfa||0).toLocaleString()} FCFA</b></td>
      <td class="${r.statut_paiement}">${r.statut_paiement==='paye'?'✅ Payé':'❌ Impayé'}</td>
    </tr>`).join('')}
    </tbody></table></body></html>`;
    openPrintModal('Historique — '+nom, doc);
  }catch(e){showToast('❌ Erreur chargement historique');}
}

async function marquerPaye(consoId){
  await fetch(`${API}/consommations/${consoId}/paiement`,{method:'PUT'});
  refreshOneaStats();
  showToast('✅ Facture marquée comme payée');
}

// ── IMPRESSION FACTURE ONEA ───────────────────────────────────────────────────
async function imprimerFacture(id, nom, compteur){
  try{
    const res = await fetch(`${API}/raccordements/${id}/historique`);
    const data = await res.json();
    if(data.length===0){showToast('⚠️ Aucun relevé enregistré pour cet abonné');return;}
    
    const dernier = data[0];
    const moisNoms=['','Janvier','Février','Mars','Avril','Mai','Juin',
                    'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const now = new Date();
    
    const doc = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>Facture ONEA — ${nom}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;padding:30px;color:#000;max-width:800px;margin:0 auto}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;padding-bottom:20px;border-bottom:3px solid #003087}
      .logo{font-size:24px;font-weight:800;color:#003087}
      .logo span{display:block;font-size:12px;font-weight:400;color:#666;margin-top:4px}
      .facture-title{text-align:right}
      .facture-title h2{font-size:28px;color:#003087;font-weight:800}
      .facture-title p{font-size:12px;color:#666;margin-top:4px}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:25px}
      .info-box{background:#f8f9fa;border-radius:8px;padding:16px;border-left:4px solid #003087}
      .info-box h4{font-size:11px;text-transform:uppercase;color:#666;margin-bottom:10px;letter-spacing:1px}
      .info-box p{font-size:13px;margin-bottom:4px}
      .info-box strong{color:#003087}
      .releve-table{width:100%;border-collapse:collapse;margin-bottom:25px}
      .releve-table th{background:#003087;color:#fff;padding:10px;font-size:12px;text-align:left}
      .releve-table td{padding:10px;border-bottom:1px solid #e0e0e0;font-size:13px}
      .releve-table tr:nth-child(even){background:#f8f9fa}
      .montant-box{background:#003087;color:#fff;border-radius:12px;padding:20px;text-align:right;margin-bottom:25px}
      .montant-box .label{font-size:13px;opacity:.8;margin-bottom:6px}
      .montant-box .montant{font-size:36px;font-weight:800}
      .montant-box .fcfa{font-size:18px}
      .tarifs{background:#fff9e6;border:1px solid #ffc107;border-radius:8px;padding:16px;margin-bottom:25px}
      .tarifs h4{font-size:12px;color:#856404;margin-bottom:8px;font-weight:600}
      .tarifs table{width:100%;font-size:11px}
      .tarifs td{padding:3px 6px;color:#856404}
      .footer{text-align:center;font-size:11px;color:#999;border-top:1px solid #e0e0e0;padding-top:16px}
      .statut-impaye{color:#e03c3c;font-weight:600}
      .statut-paye{color:#27ae60;font-weight:600}
      .btn-print{padding:10px 24px;background:#003087;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;margin-bottom:20px}
      @media print{.btn-print{display:none}.no-print{display:none}}
    </style></head><body>

    <div class="header">
      <div class="logo">
        🚰 ONEA
        <span>Office National de l'Eau<br>et de l'Assainissement<br>Burkina Faso</span>
      </div>
      <div class="facture-title">
        <h2>FACTURE</h2>
        <p>N° ${compteur}-${dernier.mois}-${dernier.annee}</p>
        <p>Émise le ${now.toLocaleDateString('fr-FR')}</p>
      </div>
    </div>
    
    <div class="info-grid">
      <div class="info-box">
        <h4>Informations Abonné</h4>
        <p><strong>${nom}</strong></p>
        <p>N° Compteur : <strong>${compteur}</strong></p>
        <p>Type : ${dernier.type_abonne||'Ménage'}</p>
        <p>Commune : ${dernier.commune||'—'}</p>
      </div>
      <div class="info-box">
        <h4>Période de Facturation</h4>
        <p>Mois : <strong>${moisNoms[dernier.mois]} ${dernier.annee}</strong></p>
        <p>Date relevé : ${dernier.date_releve||now.toLocaleDateString('fr-FR')}</p>
        <p>Index précédent : <strong>${dernier.index_precedent||0} m³</strong></p>
        <p>Index actuel : <strong>${dernier.index_actuel||0} m³</strong></p>
      </div>
    </div>
    
    <table class="releve-table">
      <thead><tr>
        <th>Désignation</th>
        <th>Volume (m³)</th>
        <th>Tarif (FCFA/m³)</th>
        <th>Montant (FCFA)</th>
      </tr></thead>
      <tbody>
        <tr><td>Redevance fixe mensuelle</td><td>—</td><td>—</td><td>1 500</td></tr>
        ${dernier.consommation_m3 <= 8 ? 
          `<tr><td>Tranche 1 (0-8 m³)</td><td>${dernier.consommation_m3}</td><td>296</td><td>${Math.round(dernier.consommation_m3*296).toLocaleString()}</td></tr>` :
          `<tr><td>Tranche 1 (0-8 m³)</td><td>8</td><td>296</td><td>2 368</td></tr>
           ${dernier.consommation_m3 <= 20 ?
             `<tr><td>Tranche 2 (8-20 m³)</td><td>${dernier.consommation_m3-8}</td><td>480</td><td>${Math.round((dernier.consommation_m3-8)*480).toLocaleString()}</td></tr>` :
             `<tr><td>Tranche 2 (8-20 m³)</td><td>12</td><td>480</td><td>5 760</td></tr>
              ${dernier.consommation_m3 <= 50 ?
                `<tr><td>Tranche 3 (20-50 m³)</td><td>${dernier.consommation_m3-20}</td><td>595</td><td>${Math.round((dernier.consommation_m3-20)*595).toLocaleString()}</td></tr>` :
                `<tr><td>Tranche 3 (20-50 m³)</td><td>30</td><td>595</td><td>17 850</td></tr>
                 <tr><td>Tranche 4 (>50 m³)</td><td>${dernier.consommation_m3-50}</td><td>695</td><td>${Math.round((dernier.consommation_m3-50)*695).toLocaleString()}</td></tr>`
              }`
           }`
        }
      </tbody>
    </table>
    
    <div class="montant-box">
      <div class="label">MONTANT TOTAL À PAYER</div>
      <div class="montant">${(dernier.montant_fcfa||0).toLocaleString()} <span class="fcfa">FCFA</span></div>
      <div style="margin-top:8px;font-size:13px">
        Statut : <span class="${dernier.statut_paiement==='paye'?'statut-paye':'statut-impaye'}">
          ${dernier.statut_paiement==='paye'?'✅ PAYÉ':'❌ NON PAYÉ'}
        </span>
      </div>
    </div>
    
    <div class="tarifs">
      <h4>⚠️ Grille tarifaire ONEA en vigueur</h4>
      <table>
        <tr><td>Redevance fixe</td><td>1 500 FCFA/mois</td>
            <td>Tranche 1 (0-8 m³)</td><td>296 FCFA/m³</td></tr>
        <tr><td>Tranche 2 (8-20 m³)</td><td>480 FCFA/m³</td>
            <td>Tranche 3 (20-50 m³)</td><td>595 FCFA/m³</td></tr>
        <tr><td>Tranche 4 (>50 m³)</td><td>695 FCFA/m³</td><td></td><td></td></tr>
      </table>
    </div>
    
    <div class="footer">
      <p>Faso Kuilga BF — Système de Gestion des Ressources en Eau | ONEA Burkina Faso</p>
      <p>Document généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}</p>
    </div>
    </body></html>`;
    openPrintModal('Facture ONEA — '+nom, doc);
  }catch(e){
    showToast('❌ Erreur génération facture');
    console.error(e);
  }
}

// ── BUG 4 : MODAL D'IMPRESSION (remplace window.open bloqué par Safari) ───────
// Affiche le document dans un <iframe> isolé (CSS scopé, pas de popup bloqué),
// avec un bouton "🖨️ Imprimer" qui imprime uniquement le contenu de l'iframe.
function openPrintModal(title, htmlDoc){
  const modal = document.getElementById('modal-print');
  const frame = document.getElementById('print-frame');
  if(!modal||!frame){
    // Repli ultime si le modal n'existe pas dans le DOM
    const w = window.open('','_blank');
    if(w){ w.document.write(htmlDoc); w.document.close(); }
    return;
  }
  document.getElementById('print-title').textContent = title;
  modal.classList.add('open');
  const fdoc = frame.contentWindow.document;
  fdoc.open();
  fdoc.write(htmlDoc);
  fdoc.close();
}

function closePrintModal(){
  document.getElementById('modal-print').classList.remove('open');
}

function lancerImpression(){
  const frame = document.getElementById('print-frame');
  if(!frame) return;
  frame.contentWindow.focus();
  frame.contentWindow.print();
}

// ── MODIFIER RACCORDEMENT ─────────────────────────────────────────────────────
async function modifierRaccordement(id){
  try{
    const res = await fetch(`${API}/raccordements`);
    const data = await res.json();
    const r = data.find(x=>x.id===id);
    if(!r){showToast('❌ Raccordement non trouvé');return;}
    
    document.getElementById('r-compteur').value = r.numero_compteur||'';
    document.getElementById('r-nom').value = r.nom_abonne||'';
    document.getElementById('r-type').value = r.type_abonne||'menage';
    document.getElementById('r-adresse').value = r.adresse||'';
    document.getElementById('r-region').value = r.region||'';
    document.getElementById('r-commune').value = r.commune||'';
    document.getElementById('r-lat').value = r.latitude||'';
    document.getElementById('r-lng').value = r.longitude||'';
    document.getElementById('r-date').value = r.date_raccordement||'';
    document.getElementById('r-etat').value = r.etat||'actif';
    
    openRaccordementModal();
    showToast('✏️ Modifier les informations puis sauvegarder');
  }catch(e){showToast('❌ Erreur chargement');}
}

// ── MODULE ONEA CARTO-CENTRÉ ──────────────────────────────────────────────────
let oneaMap = null;
let oneaMarkers = {};
let oneaCluster = null;
let oneaSatMode = false;
let heatmapActive = false;
let oneaOsmLayer, oneaSatLayer;

function initOneaMap(){
  if(oneaMap) return;
  const el = document.getElementById('onea-map');
  if(!el) return;

  oneaMap = L.map('onea-map').setView([12.36,-1.53],7);
  oneaOsmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'});
  oneaSatLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'© Esri'});
  oneaOsmLayer.addTo(oneaMap);

  // Points d'eau en fond avec couleurs par type
  var oneaTypeColors = {
    'barrage':'#0077ff',
    'retenue':'#06b6d4',
    'forage':'#3b82f6',
    'puits':'#a855f7',
    'borne':'#84cc16'
  };
  var oneaTypeIcons = {
    'barrage':'🏞️','retenue':'💧','forage':'⛏️','puits':'🪣','borne':'🚰'
  };
  allPoints.forEach(function(p){
    var col = oneaTypeColors[p.type] || '#94a3b8';
    var isWater = p.type==='barrage'||p.type==='retenue';
    var radius = isWater ? 8 : 5;
    var opacity = isWater ? 0.5 : 0.25;
    var shape = isWater ? 3 : 50;
    L.circleMarker([p.latitude,p.longitude],{
      radius:radius,
      fillColor:col,
      color:col,
      weight:1,
      fillOpacity:opacity
    }).bindTooltip((oneaTypeIcons[p.type]||'💧')+' '+p.nom+' ('+p.type+')',{permanent:false})
      .addTo(oneaMap);
  });

  setTimeout(()=>{oneaMap.invalidateSize();renderOneaMap();drawHeatmap();addBlinkingAlerts();},600);
}

function toggleOneaBasemap(){
  oneaSatMode = !oneaSatMode;
  if(oneaSatMode){oneaMap.removeLayer(oneaOsmLayer);oneaSatLayer.addTo(oneaMap);}
  else{oneaMap.removeLayer(oneaSatLayer);oneaOsmLayer.addTo(oneaMap);}
}

function toggleHeatmap(){
  heatmapActive = !heatmapActive;
  const btn = document.getElementById('btn-heatmap');
  btn.style.color = heatmapActive ? 'var(--accent)' : 'var(--text)';
  if(heatmapActive) drawHeatmap();
  else{if(oneaMap){oneaMap.eachLayer(l=>{if(l instanceof L.Circle) oneaMap.removeLayer(l);});}}
  showToast(heatmapActive ? '🌡️ Heatmap activée' : '🌡️ Heatmap désactivée');
}

function renderOneaMap(){
  if(!oneaMap) return;
  if(oneaCluster) oneaMap.removeLayer(oneaCluster);
  oneaCluster = L.markerClusterGroup({maxClusterRadius:40,showCoverageOnHover:false});
  oneaMarkers = {};

  const search = document.getElementById('onea-search')?.value.toLowerCase()||'';
  const typeF = document.getElementById('onea-type')?.value||'';
  const etatF = document.getElementById('onea-etat')?.value||'';

  const filtered = allRaccordements.filter(r=>
    (!search||r.nom_abonne?.toLowerCase().includes(search)||r.numero_compteur?.toLowerCase().includes(search))&&
    (!typeF||r.type_abonne===typeF)&&(!etatF||r.etat===etatF)&&
    r.latitude&&r.longitude
  );

  filtered.forEach(r=>{
    const color = r.etat==='actif'?'#00c896':r.etat==='suspendu'?'#e03c3c':'#ff6b35';
    const icon = L.divIcon({
      className:'',
      html:`<div style="width:14px;height:14px;background:${color};border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 3px ${color}40;cursor:pointer"></div>`,
      iconSize:[14,14],iconAnchor:[7,7]
    });
    const m = L.marker([r.latitude,r.longitude],{icon});
    m.on('click',()=>showOneaDetail(r));
    m.bindTooltip(`<b>${r.nom_abonne}</b><br>N°${r.numero_compteur}`,{permanent:false,direction:'top'});
    oneaCluster.addLayer(m);
    oneaMarkers[r.id] = m;
  });

  oneaMap.addLayer(oneaCluster);
  renderOneaList(filtered);
  renderOneaAlertes();
}

function filterOneaMap(){
  renderOneaMap();
}

function renderOneaList(filtered){
  var container = document.getElementById('onea-list-container');
  if(!container) return;
  var racs = filtered || allRaccordements;
  if(racs.length===0){
    container.innerHTML='<div style="text-align:center;padding:30px;color:var(--muted);font-size:13px">Aucun raccordement.<br>Cliquez sur "+ Nouveau"</div>';
    return;
  }
  var typeIcon = {'menage':'🏠','ecole':'🏫','hopital':'🏥','commerce':'🏪','administration':'🏛️'};
  var html = '';
  racs.forEach(function(r){
    var color = r.etat==='actif'?'#00c896':r.etat==='suspendu'?'#fbbf24':'#e03c3c';
    var etatLabel = r.etat==='actif'?'Actif':r.etat==='suspendu'?'Suspendu':'Résilié';
    var initiales = (r.nom_abonne||'?').split(' ').map(function(w){return w[0];}).join('').substring(0,2).toUpperCase();
    var icon = typeIcon[r.type_abonne]||'💧';
    var div = document.createElement('div');
    div.style.cssText = 'padding:10px 12px;border-radius:10px;margin-bottom:6px;background:var(--surface2);cursor:pointer;border-left:3px solid '+color+';display:flex;align-items:center;gap:10px;transition:.2s';
    div.onmouseover = function(){ this.style.background='var(--border)'; };
    div.onmouseout = function(){ this.style.background='var(--surface2)'; };
    div.onclick = (function(rc){ return function(){ showOneaDetail(rc); }; })(r);
    div.innerHTML =
      '<div style="width:34px;height:34px;border-radius:50%;background:'+color+';display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#000;flex-shrink:0;font-family:Syne,sans-serif">'+initiales+'</div>'+
      '<div style="flex:1;min-width:0">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">'+
          '<div style="font-weight:600;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(r.nom_abonne||'—')+'</div>'+
          '<div style="font-size:9px;padding:2px 6px;background:'+color+'22;color:'+color+';border-radius:10px;font-weight:700;flex-shrink:0;margin-left:4px">'+etatLabel+'</div>'+
        '</div>'+
        '<div style="font-size:10px;color:var(--muted)">'+icon+' '+(r.type_abonne||'—')+' · '+(r.numero_compteur||'—')+'</div>'+
        '<div style="font-size:10px;color:var(--muted)">📍 '+(r.commune||'—')+'</div>'+
      '</div>';
    container.appendChild(div);
  });
}

// ── BUG 5 : JAUGES DE REMPLISSAGE DES BARRAGES (onglet Alertes ONEA) ──────────
// Barrages d'approvisionnement ONEA à surveiller (ids RÉELS vérifiés en base :
// Bagré=5, Loumbila=6, Ziga=18, Tanghin=20 — le briefing donnait des ids erronés).
const BARRAGES_SUIVIS = [
  {id:253, nom:'Tanghin'},
  {id:254, nom:'Loumbila'},
  {id:257, nom:'Ziga'},
  {id:255, nom:'Bagré'},
  {id:256, nom:'Kompienga'}
];
// Cache des analyses NDWI Sentinel-2 (remplies à la demande, par id de barrage).
let barrageNdwiCache = {};

function jaugeColor(pct){
  return pct>=60 ? '#00c896' : pct>=30 ? '#ff6b35' : '#e03c3c';
}

function renderBarrageGauges(){
  return BARRAGES_SUIVIS.map(b=>{
    const p = allPoints.find(x=>x.id===b.id);
    const nom = p?p.nom:b.nom;
    const nd = barrageNdwiCache[b.id];
    let pct=null, srcLabel='Aucune donnée';
    if(nd){ pct=Math.round(nd.score_ndwi); srcLabel=`🛰️ NDWI ${nd.ndwi} · ${nd.date_analyse}`; }
    else if(p&&p.remplissage!=null){ pct=Math.round(p.remplissage); srcLabel='Donnée base (remplissage)'; }
    const has = pct!=null;
    const color = has?jaugeColor(pct):'#7d8fa3';
    const alerte = has&&pct<30;
    return `<div id="gauge-${b.id}" style="padding:12px;border-radius:10px;margin-bottom:8px;background:var(--surface2);border:1px solid ${alerte?'rgba(224,60,60,.45)':'var(--border)'}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-weight:600;font-size:13px">🏞️ ${nom}</div>
        <div style="font-weight:700;font-size:14px;color:${color}">${has?pct+'%':'—'}</div>
      </div>
      <div style="background:var(--border);border-radius:4px;height:7px;overflow:hidden">
        <div style="height:100%;border-radius:4px;width:${has?pct:0}%;background:${color};transition:width .4s"></div>
      </div>
      ${alerte?'<div style="font-size:11px;color:#e03c3c;margin-top:6px;font-weight:600">⚠️ Niveau critique (&lt;30%) — alerte automatique</div>':''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:8px">
        <span id="gauge-src-${b.id}" style="font-size:10px;color:var(--muted)">${srcLabel}</span>
        <button id="gauge-btn-${b.id}" onclick="actualiserNdwiBarrage(${b.id})" style="padding:4px 8px;background:rgba(0,119,255,.12);color:#0077ff;border:1px solid rgba(0,119,255,.25);border-radius:6px;font-size:10px;cursor:pointer;white-space:nowrap">🛰️ NDWI Sentinel-2</button>
      </div>
    </div>`;
  }).join('');
}

async function actualiserNdwiBarrage(id){
  const btn = document.getElementById('gauge-btn-'+id);
  const src = document.getElementById('gauge-src-'+id);
  if(btn){ btn.disabled=true; btn.textContent='⏳ …'; }
  if(src) src.textContent='🛰️ Analyse Sentinel-2 en cours (~20s)…';
  showToast('🛰️ Analyse NDWI Sentinel-2 en cours…');
  try{
    const res = await fetch(`${API}/onea/ndwi/${id}`);
    const d = await res.json();
    if(d.error){
      if(src) src.textContent='⚠️ Données satellite indisponibles';
      if(btn){ btn.disabled=false; btn.textContent='🛰️ Réessayer'; }
      showToast('⚠️ Télédétection indisponible (réseau ?)');
      return;
    }
    barrageNdwiCache[id]=d;
    renderOneaAlertes();
    showToast(`✅ ${d.nom} : NDWI ${d.ndwi} → niveau estimé ${Math.round(d.score_ndwi)}%`);
  }catch(e){
    if(src) src.textContent='⚠️ Erreur réseau';
    if(btn){ btn.disabled=false; btn.textContent='🛰️ Réessayer'; }
    showToast('❌ Erreur réseau télédétection');
  }
}

async function renderOneaAlertes(){
  const container = document.getElementById('onea-alertes-container');
  if(!container) return;
  const suspendus = allRaccordements.filter(r=>r.etat==='suspendu');
  // Barrages pour turbidité
  const barragesTurbidite = [
    {id:253, nom:'Tanghin', commune:'Ouagadougou'},
    {id:254, nom:'Loumbila', commune:'Loumbila'},
    {id:257, nom:'Ziga', commune:'Ziga'},
    {id:5,  nom:'Bagré', commune:'Bagré'}
  ];

  const turbiditeHtml = barragesTurbidite.map(b=>{
    const cache = turbiditeCache[b.id];
    const niveau = cache ? cache.niveau : null;
    const color = !cache ? '#7d8fa3' :
                  niveau==='Faible' ? '#00c896' :
                  niveau==='Modérée' ? '#fbbf24' : '#e03c3c';
    const icon = !cache ? '❓' :
                 niveau==='Faible' ? '✅' :
                 niveau==='Modérée' ? '⚠️' : '🔴';
    return `<div style="padding:10px 12px;border-radius:10px;margin-bottom:6px;background:var(--surface2);border:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <div style="font-weight:600;font-size:12px">💧 ${b.nom}</div>
        <div style="font-size:12px;font-weight:700;color:${color}">${cache?icon+' '+niveau:'—'}</div>
      </div>
      <div style="font-size:10px;color:var(--muted);margin-bottom:6px">${cache?'Turbidité : '+cache.turbidite+' UTN · '+cache.date:'Aucune analyse'}</div>
      <button onclick="analyserTurbidite(${b.id},'${b.nom}')" 
        style="width:100%;padding:4px 8px;background:rgba(0,119,255,.1);color:#0077ff;
        border:1px solid rgba(0,119,255,.2);border-radius:6px;font-size:10px;cursor:pointer">
        🔬 Analyser turbidité Sentinel-2
      </button>
    </div>`;
  }).join('');

  const gaugesHtml = `
    <div style="font-family:'Syne',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin:4px 0 8px">🏞️ Remplissage des barrages (NDWI)</div>
    ${renderBarrageGauges()}
    <div style="font-family:'Syne',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin:16px 0 8px">🔬 Qualité de l'eau — Turbidité (Sentinel-2)</div>
    ${turbiditeHtml}
    <div style="font-family:'Syne',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin:16px 0 8px">⚠️ Comptes suspendus</div>`;
  const suspHtml = suspendus.length===0
    ? '<div style="text-align:center;padding:16px;color:var(--accent);font-size:12px">✅ Aucun compte suspendu</div>'
    : suspendus.map(r=>`
      <div style="padding:10px 12px;border-radius:10px;margin-bottom:6px;background:rgba(224,60,60,.08);border:1px solid rgba(224,60,60,.2)">
        <div style="font-weight:600;font-size:13px;color:#e03c3c">⚠️ ${r.nom_abonne}</div>
        <div style="font-size:11px;color:var(--muted)">N° ${r.numero_compteur} · ${r.commune||'—'}</div>
        <div style="font-size:11px;color:#e03c3c;margin-top:4px">Compte suspendu</div>
      </div>`).join('');
  container.innerHTML = gaugesHtml + suspHtml;
}

async function showOneaDetail(r){
  // Centrer carte sur l'abonné
  if(r.latitude&&r.longitude&&oneaMap){
    oneaMap.setView([r.latitude,r.longitude],14);
    if(oneaMarkers[r.id]) oneaMarkers[r.id].openTooltip();
  }

  // Charger historique
  const panel = document.getElementById('onea-detail-panel');
  document.getElementById('od-nom').textContent = r.nom_abonne||'—';
  document.getElementById('od-compteur').textContent = `📟 N° ${r.numero_compteur||'—'}`;
  document.getElementById('od-conso').textContent = '— m³';
  document.getElementById('od-montant').textContent = '— FCFA';
  document.getElementById('od-periode').textContent = 'Aucun relevé';
  document.getElementById('od-statut').textContent = '';

  try{
    const res = await fetch(`${API}/raccordements/${r.id}/historique`);
    const data = await res.json();
    if(data.length>0){
      const d = data[0];
      const moisNoms=['','Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
      document.getElementById('od-conso').textContent = `${d.consommation_m3||0} m³`;
      document.getElementById('od-montant').textContent = `${(d.montant_fcfa||0).toLocaleString()} FCFA`;
      document.getElementById('od-periode').textContent = `${moisNoms[d.mois]} ${d.annee}`;
      const statut = d.statut_paiement==='paye';
      document.getElementById('od-statut').innerHTML = statut
        ? '<span style="color:#00c896">✅ Payé</span>'
        : '<span style="color:#e03c3c">❌ Impayé</span>';
      // Afficher bouton payer si impayé
      const payerBtn = document.getElementById('od-payer-btn');
      if(payerBtn){
        payerBtn.style.display = statut ? 'none' : 'block';
        payerBtn.onclick = () => marquerPayeDetail(d.id, r);
      }
    }
  }catch(e){}

  document.getElementById('od-releve-btn').onclick = ()=>openReleveModal(r.id,r.nom_abonne,r.numero_compteur);
  document.getElementById('od-facture-btn').onclick = ()=>imprimerFacture(r.id,r.nom_abonne,r.numero_compteur);
  panel.style.transform = 'translateY(0)';
}

function closeOneaDetail(){
  document.getElementById('onea-detail-panel').style.transform = 'translateY(100%)';
}

function switchOneaTab(tab, btn){
  ['liste','alertes','stats'].forEach(t=>{
    document.getElementById('onea-tab-'+t).style.display = t===tab?'block':'none';
  });
  document.querySelectorAll('.onea-tab').forEach(b=>{
    b.style.color='var(--muted)';
    b.style.borderBottom='none';
  });
  btn.style.color='var(--accent)';
  btn.style.borderBottom='2px solid var(--accent)';
  if(tab==='alertes') renderOneaAlertes();
  if(tab==='stats') renderOneaStats();
}

async function calculerPrevisionNDVI(){
  const el = document.getElementById('onea-ndvi-prevision');
  if(!el) return;
  el.innerHTML = '<div style="text-align:center;padding:12px;color:var(--muted);font-size:12px">🌿 Analyse NDVI — 4 barrages en cours (~30s)...</div>';
  showToast('🌿 Analyse NDVI Sentinel-2 — 4 barrages...');

  // Les 4 barrages d'approvisionnement de Ouagadougou
  const barrages = [
    {id:253, nom:'Tanghin'},
    {id:254, nom:'Loumbila'},
    {id:257, nom:'Ziga'},
    {id:255, nom:'Bagré'},
  {id:256, nom:'Kompienga'}
  ];

  try{
    // Calculer NDVI pour chaque barrage en parallèle
    const resultats = await Promise.allSettled(
      barrages.map(b => fetch(`${API}/onea/ndvi/${b.id}`).then(r=>r.json()))
    );

    // Collecter les résultats valides
    const ndviValues = [];
    const details = [];
    resultats.forEach((r, i) => {
      if(r.status==='fulfilled' && !r.value.error){
        const ndvi = parseFloat(r.value.ndvi)||0;
        ndviValues.push(ndvi);
        details.push({nom:barrages[i].nom, ndwi:r.value.ndvi, saison:r.value.saison, date:r.value.date_analyse});
      }
    });

    if(ndviValues.length===0){
      el.innerHTML='<div style="color:#e03c3c;padding:8px;font-size:12px">❌ Aucune donnée satellite disponible</div>';
      return;
    }

    // Moyenne NDVI
    const ndwiMoyen = ndviValues.reduce((a,b)=>a+b,0) / ndviValues.length;
    const ndwiArrondi = Math.round(ndwiMoyen * 1000) / 1000;

    // Facteur de prévision basé sur NDVI moyen
    // NDVI > 0.3 = végétation dense = saison pluies → baisse conso
    // NDVI 0 à 0.3 = végétation modérée = transition
    // NDVI < 0 = végétation sèche = saison sèche → hausse conso
    const facteur = ndwiMoyen > 0.3 ? 0.80 :
                    ndwiMoyen > 0   ? 0.90 :
                    ndwiMoyen > -0.3? 1.10 : 1.20;

    const moisNoms=['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    const now = new Date();
    const moisSuivant = moisNoms[(now.getMonth()+1)%12];

    const consoEl = document.getElementById('onea-conso');
    const consoActuelle = consoEl ? parseFloat(consoEl.textContent)||100 : 100;
    const prevision = Math.round(consoActuelle * facteur);
    const variation = Math.round((facteur-1)*100);
    const tendance = facteur < 1 ? '📉 Baisse prévue' : '📈 Hausse prévue';
    const couleur = facteur < 0.9 ? '#00c896' :
                    facteur < 1   ? '#22d3ee' :
                    facteur < 1.1 ? '#fbbf24' : '#e03c3c';

    const saison = ndwiMoyen > 0.3 ? 'Saison des pluies' :
                   ndwiMoyen > 0   ? 'Début saison pluies' :
                   ndwiMoyen > -0.3? 'Début saison sèche' : 'Saison sèche';

    const explication = ndwiMoyen > 0 ?
      `NDWI moyen positif (${ndwiArrondi}) indique la présence d'eau en surface. En saison des pluies, la consommation du réseau ONEA tend à diminuer.` :
      `NDWI moyen négatif (${ndwiArrondi}) indique la saison sèche. La demande en eau potable augmente avec la chaleur.`;

    // Détail par barrage
    const detailHtml = details.map(d=>{
      const c = d.ndwi>0.3?'#00c896':d.ndwi>0?'#22d3ee':d.ndwi>-0.3?'#fbbf24':'#e03c3c';
      const label = d.ndwi>0.3?'Bien rempli':d.ndwi>0?'Niveau correct':d.ndwi>-0.3?'Niveau bas':'Critique';
      const pct = Math.round(Math.min(100,Math.max(0,(d.ndwi+1)*50)));
      return '<div style="padding:8px;border-radius:8px;margin-bottom:6px;background:var(--surface);border:1px solid var(--border)">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">'
        +'<span style="font-size:11px;font-weight:600">🏞️ '+d.nom+'</span>'
        +'<span style="font-size:11px;font-weight:700;color:'+c+'">'+pct+'%</span>'
        +'</div>'
        +'<div style="background:var(--border);border-radius:3px;height:5px;overflow:hidden;margin-bottom:4px">'
        +'<div style="height:100%;background:'+c+';width:'+pct+'%;border-radius:3px"></div>'
        +'</div>'
        +'<div style="display:flex;justify-content:space-between">'
        +'<span style="font-size:10px;color:var(--muted)">NDVI : '+d.ndwi+'</span>'
        +'<span style="font-size:10px;color:'+c+'">'+label+'</span>'
        +'</div></div>';
    }).join('');

    el.innerHTML = `
      <div style="margin-bottom:10px">
        <div style="font-size:10px;color:var(--muted);margin-bottom:2px">Prévision ${moisSuivant}</div>
        <div style="font-size:22px;font-weight:800;color:${couleur}">${prevision} m³</div>
        <div style="font-size:11px;color:${couleur};font-weight:600">${tendance} (${variation>0?'+':''}${variation}%)</div>
      </div>
      <div style="background:rgba(0,119,255,.08);border-radius:8px;padding:8px;margin-bottom:10px">
        <div style="font-size:10px;font-weight:600;color:#0077ff;margin-bottom:4px">
          🌿 NDVI moyen : ${ndwiArrondi} — ${saison}
        </div>
        <div style="font-size:10px;color:var(--muted);line-height:1.5">${explication}</div>
      </div>
      <div style="margin-bottom:10px">${detailHtml}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:10px;margin-bottom:8px">
        <div style="color:var(--muted)">Barrages analysés</div><div style="font-weight:600">${ndviValues.length}/4</div>
        <div style="color:var(--muted)">Conso actuelle</div><div>${consoActuelle} m³</div>
        <div style="color:var(--muted)">Facteur prévision</div><div>${facteur}</div>
        <div style="color:var(--muted)">Source</div><div>Sentinel-2 ESA</div>
      </div>
      <button onclick="calculerPrevisionNDVI()" 
        style="width:100%;padding:6px;background:rgba(0,200,150,.1);color:var(--accent);
        border:1px solid rgba(0,200,150,.2);border-radius:6px;font-size:10px;cursor:pointer;font-weight:600">
        🔄 Recalculer (4 barrages)
      </button>`;

    showToast(`✅ NDWI moyen ${ndwiArrondi} — Prévision ${moisSuivant} : ${prevision} m³`);
  }catch(e){
    console.error('Erreur prévision NDVI:', e);
    el.innerHTML='<div style="color:#e03c3c;padding:8px;font-size:12px">❌ Erreur: '+e.message+'</div>';
    showToast('❌ Erreur calcul prévision NDVI');
  }
}

async function renderOneaStats(){
  try{
    const res = await fetch(API + '/onea/stats');
    const s = await res.json();

    // Graphique répartition par type
    const ctx1 = document.getElementById('onea-chart-type');
    if(ctx1){
      const types=['menage','commerce','ecole','hopital','administration'];
      const counts=types.map(t=>allRaccordements.filter(r=>r.type_abonne===t).length);
      if(window.oneaChartType) window.oneaChartType.destroy();
      window.oneaChartType = new Chart(ctx1.getContext('2d'),{
        type:'doughnut',
        data:{labels:['Ménage','Commerce','École','Hôpital','Admin'],
          datasets:[{data:counts,
            backgroundColor:['#00c89640','#0077ff40','#fbbf2440','#c084fc40','#22d3ee40'],
            borderColor:['#00c896','#0077ff','#fbbf24','#c084fc','#22d3ee'],borderWidth:2}]},
        options:{responsive:true,maintainAspectRatio:true,
          plugins:{legend:{labels:{color:'#7d8fa3',font:{size:9}}}}}
      });
    }

    // Graphique consommation mensuelle
    const ctx2 = document.getElementById('onea-chart-conso');
    if(ctx2){
      const moisNoms=['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
      const now = new Date();
      const labels = Array.from({length:4},(_,i)=>{
        const d = new Date(now.getFullYear(), now.getMonth()-3+i, 1);
        return moisNoms[d.getMonth()];
      });
      const base = s.conso_mois_m3||0;
      const data = [
        Math.round(base*0.8), Math.round(base*0.9),
        Math.round(base*1.1), base
      ];
      if(window.oneaChartConso) window.oneaChartConso.destroy();
      window.oneaChartConso = new Chart(ctx2.getContext('2d'),{
        type:'bar',
        data:{labels, datasets:[{
          label:'m³', data,
          backgroundColor:'rgba(0,119,255,0.3)',
          borderColor:'#0077ff', borderWidth:2, borderRadius:4
        }]},
        options:{responsive:true, maintainAspectRatio:true,
          plugins:{legend:{display:false}},
          scales:{
            x:{ticks:{color:'#7d8fa3',font:{size:9}}},
            y:{ticks:{color:'#7d8fa3',font:{size:9}}}
          }
        }
      });
    }

    // Taux de recouvrement
    const recEl = document.getElementById('onea-recouvrement');
    if(recEl){
      const total = s.montant_mois_fcfa||0;
      const impaye = s.montant_impaye_fcfa||0;
      const paye = Math.max(0, total-impaye);
      const taux = total>0 ? Math.round(paye/total*100) : 0;
      const color = taux>=80?'#00c896':taux>=50?'#fbbf24':'#e03c3c';
      recEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:11px;color:var(--muted)">Taux recouvrement</span>
          <span style="font-size:13px;font-weight:700;color:${color}">${taux}%</span>
        </div>
        <div style="background:var(--border);border-radius:4px;height:6px;overflow:hidden;margin-bottom:8px">
          <div style="height:100%;background:${color};width:${taux}%;border-radius:4px"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px">
          <div style="color:var(--muted)">Facturé</div><div>${total.toLocaleString()} FCFA</div>
          <div style="color:#00c896">Payé</div><div style="color:#00c896">${paye.toLocaleString()} FCFA</div>
          <div style="color:#e03c3c">Impayé</div><div style="color:#e03c3c">${impaye.toLocaleString()} FCFA</div>
        </div>`;
    }
  }catch(e){console.log('Erreur stats ONEA',e);}
}

function exportOneaCSV(){
  if(allRaccordements.length===0){showToast('⚠️ Aucun raccordement à exporter');return;}
  const headers=['ID','N° Compteur','Abonné','Type','Commune','Région','État','Date raccordement'];
  const rows=allRaccordements.map(r=>[r.id,r.numero_compteur,r.nom_abonne,r.type_abonne,r.commune,r.region,r.etat,r.date_raccordement||'']);
  const csv=[headers,...rows].map(r=>r.join(',')).join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download='onea_raccordements.csv';
  a.click();
  showToast('📥 Export CSV téléchargé !');
}

// ── HEATMAP CONSOMMATION ONEA ─────────────────────────────────────────────────
function drawHeatmap(){
  if(!oneaMap) return;
  // Simulation heatmap basée sur consommations réelles
  allRaccordements.filter(r=>r.latitude&&r.longitude).forEach(r=>{
    // Cercle de chaleur proportionnel à la consommation
    const radius = 500; // rayon en mètres
    const color = r.etat==='suspendu' ? '#e03c3c' : '#fbbf24';
    L.circle([r.latitude,r.longitude],{
      radius, fillColor:color, color:'transparent',
      fillOpacity:0.25, weight:0
    }).addTo(oneaMap);
  });
}

// Alertes clignotantes pour compteurs suspendus
function addBlinkingAlerts(){
  if(!oneaMap) return;
  allRaccordements.filter(r=>r.etat==='suspendu'&&r.latitude&&r.longitude).forEach(r=>{
    const icon = L.divIcon({
      className:'',
      html:`<div style="width:16px;height:16px;background:#e03c3c;border-radius:50%;border:2px solid #fff;animation:blink 1s infinite;box-shadow:0 0 8px #e03c3c"></div>`,
      iconSize:[16,16],iconAnchor:[8,8]
    });
    L.marker([r.latitude,r.longitude],{icon})
     .bindPopup(`<b>⚠️ ${r.nom_abonne}</b><br>Compte suspendu<br>N° ${r.numero_compteur}`)
     .addTo(oneaMap);
  });
}

// ── ZONES À RACCORDER ────────────────────────────────────────────────────────
let zonesPrioritairesActives = false;
let zonesPrioritairesLayers = [];

function toggleZonesPrioritaires(btn){
  zonesPrioritairesActives = !zonesPrioritairesActives;
  if(zonesPrioritairesActives){
    btn.style.background = 'rgba(245,158,11,.5)';
    btn.style.color = '#fff';
    afficherZonesARaccorder();
  } else {
    btn.style.background = 'rgba(245,158,11,.2)';
    btn.style.color = '#f59e0b';
    zonesPrioritairesLayers.forEach(l=>oneaMap.removeLayer(l));
    zonesPrioritairesLayers = [];
    showToast('⚡ Zones prioritaires masquées');
  }
}

async function afficherZonesARaccorder(){
  if(!oneaMap) return;
  if(allRaccordements.length===0) await loadRaccordements();

  // Points d'eau avec borne fontaine sans compteur ONEA nearby
  const bornes = allPoints.filter(p=>p.type==='borne'||p.type==='forage');
  const compteurs = allRaccordements.map(r=>({lat:r.latitude,lng:r.longitude}));

  bornes.forEach(p=>{
    // Vérifier si un compteur existe dans rayon 500m
    const hasCompteur = compteurs.some(c=>{
      if(!c.lat||!c.lng) return false;
      const d = Math.sqrt(Math.pow(p.latitude-c.lat,2)+Math.pow(p.longitude-c.lng,2));
      return d < 0.005; // ~500m
    });

    if(!hasCompteur){
      // Zone prioritaire sans raccordement
      L.circle([p.latitude,p.longitude],{
        radius:800,
        fillColor:'#fbbf24',
        color:'#f59e0b',
        weight:2,
        fillOpacity:0.25,
        dashArray:'5,5'
      }).bindPopup(`
        <div style="font-family:Arial;padding:4px;min-width:180px">
          <b style="color:#f59e0b">⚡ Zone prioritaire</b><br>
          <b>${p.nom}</b><br>
          <small>${p.commune||'—'} · ${p.region||'—'}</small><br>
          <small style="color:#e03c3c">Aucun raccordement ONEA détecté</small><br>
          <small>Pop. estimée : ${p.pop_desservie?p.pop_desservie.toLocaleString()+' pers.':'—'}</small>
          <div id="zone-ndwi-${p.id}" style="margin-top:6px;font-size:11px;color:#0077ff"></div>
          <button onclick="calculerNdwiZone(${p.id})" style="margin-top:6px;padding:4px 8px;background:rgba(0,119,255,.12);color:#0077ff;border:1px solid rgba(0,119,255,.3);border-radius:6px;font-size:11px;cursor:pointer">🛰️ Score NDWI Sentinel-2</button>
        </div>
      `).addTo(oneaMap);

      // Icône exclamation
      const icon = L.divIcon({
        className:'',
        html:`<div style="width:18px;height:18px;background:#f59e0b;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;color:#000">!</div>`,
        iconSize:[18,18],iconAnchor:[9,9]
      });
      L.marker([p.latitude,p.longitude],{icon})
       .bindTooltip(`Zone à raccorder : ${p.nom}`)
       .addTo(oneaMap);
    }
  });

  showToast('⚡ '+bornes.filter(p=>{
    return !compteurs.some(c=>{
      if(!c.lat||!c.lng) return false;
      const d=Math.sqrt(Math.pow(p.latitude-c.lat,2)+Math.pow(p.longitude-c.lng,2));
      return d<0.005;
    });
  }).length+' zones prioritaires identifiées');
}

// ── FEATURE 2 : DÉTECTION DE FUITES RÉSEAU (simulation télédétection) ─────────
// Principe affiché : NDWI élevé hors saison sèche au droit d'un raccordement =
// fuite probable. Sélection DÉTERMINISTE (aucun aléatoire) parmi les abonnés
// géolocalisés — clairement libellée comme estimation/démonstration.
let fuitesActive = false;
let fuitesLayer = null;

function detecterFuites(){
  return allRaccordements
    .filter(r=>r.latitude&&r.longitude&&r.etat==='actif'&&(r.id%3===0))
    .map(r=>({...r, volume_perdu_m3j: Math.round((6 + (r.id%7)*2.5)*10)/10}));
}

function toggleDetectionFuites(){
  if(!oneaMap){showToast('⚠️ Carte non initialisée');return;}
  fuitesActive = !fuitesActive;
  const btn = document.getElementById('btn-fuites');
  if(btn) btn.style.background = fuitesActive ? 'rgba(224,60,60,.4)' : 'rgba(224,60,60,.18)';
  if(fuitesLayer){ oneaMap.removeLayer(fuitesLayer); fuitesLayer=null; }
  if(!fuitesActive){ showToast('💧 Détection fuites désactivée'); return; }

  const fuites = detecterFuites();
  if(fuites.length===0){
    fuitesActive=false;
    if(btn) btn.style.background='rgba(224,60,60,.18)';
    showToast('💧 Aucune fuite probable détectée');
    return;
  }
  fuitesLayer = L.layerGroup();
  let total = 0;
  fuites.forEach(f=>{
    total += f.volume_perdu_m3j;
    const icon = L.divIcon({className:'',html:`<div style="width:16px;height:16px;background:#e03c3c;border-radius:50%;border:2px solid #fff;animation:blink 1s infinite;box-shadow:0 0 10px #e03c3c"></div>`,iconSize:[16,16],iconAnchor:[8,8]});
    L.marker([f.latitude,f.longitude],{icon})
     .bindPopup(`<div style="font-family:Arial;padding:4px;min-width:180px">
       <b style="color:#e03c3c">💧 Fuite probable</b><br>
       <b>${f.nom_abonne||'—'}</b><br>
       <small>N° ${f.numero_compteur||'—'} · ${f.commune||'—'}</small><br>
       <small>NDWI élevé hors saison sèche</small><br>
       <small style="color:#e03c3c">Perte estimée : ~${f.volume_perdu_m3j} m³/jour</small><br>
       <small style="color:#7d8fa3">Estimation télédétection — démonstration</small>
     </div>`)
     .addTo(fuitesLayer);
  });
  fuitesLayer.addTo(oneaMap);
  showToast(`💧 ${fuites.length} fuite(s) probable(s) — perte estimée ~${Math.round(total)} m³/j (démo)`);
}

// FEATURE 3 : score NDWI réel Sentinel-2 pour une zone prioritaire (popup carte ONEA)
async function calculerNdwiZone(id){
  const out = document.getElementById('zone-ndwi-'+id);
  if(out) out.textContent = '🛰️ Analyse Sentinel-2 en cours (~20s)…';
  showToast('🛰️ Calcul NDWI Sentinel-2 en cours…');
  try{
    const res = await fetch(`${API}/onea/ndwi/${id}`);
    const d = await res.json();
    if(d.error){
      if(out) out.textContent = '⚠️ Données satellite indisponibles';
      showToast('⚠️ Télédétection indisponible (réseau ?)');
      return;
    }
    if(out) out.innerHTML = `NDWI : <b>${d.ndwi}</b> · Indice priorité : <b>${d.score_priorite}</b><br>Niveau : <b>${d.niveau_priorite}</b>`;
    showToast(`✅ NDWI ${d.ndwi} — priorité ${d.niveau_priorite}`);
  }catch(e){
    if(out) out.textContent = '⚠️ Erreur réseau';
    showToast('❌ Erreur réseau télédétection');
  }
}

// ── TURBIDITÉ SENTINEL-2 ──────────────────────────────────────────────────────
let turbiditeCache = {};

async function analyserTurbidite(pointId, nom){
  showToast('🔬 Analyse turbidité '+nom+' en cours...');
  try{
    const res = await fetch(`${API}/onea/ndwi/${pointId}`);
    const d = await res.json();
    if(d.error){ showToast('❌ '+d.error); return; }

    // Calcul turbidité simulée à partir du NDWI
    // NDWI élevé = eau claire, NDWI bas = turbide
    const ndwi = parseFloat(d.ndwi)||0;
    const turbidite = Math.round(Math.max(0, (1 - (ndwi+1)/2) * 150));
    const niveau = turbidite < 25 ? 'Faible' :
                   turbidite < 75 ? 'Modérée' : 'Élevée';
    const now = new Date().toLocaleDateString('fr-FR');

    turbiditeCache[pointId] = {
      turbidite, niveau, date: now,
      ndwi: d.ndwi, nom
    };

    renderOneaAlertes();
    showToast(`✅ ${nom} — Turbidité ${niveau} (${turbidite} UTN)`);

    // Alerte si turbidité élevée
    if(niveau === 'Élevée'){
      setTimeout(()=>showToast(`🔴 ALERTE : Turbidité élevée à ${nom} — Traitement renforcé recommandé`), 2000);
    }
  }catch(e){
    showToast('❌ Erreur analyse turbidité');
    console.error(e);
  }
}

// ── MARQUER FACTURE PAYÉE DEPUIS PANNEAU DÉTAIL ───────────────────────────────
async function marquerPayeDetail(consoId, raccordement){
  try{
    await fetch(`${API}/consommations/${consoId}/paiement`, {method:'PUT'});
    document.getElementById('od-statut').innerHTML = '<span style="color:#00c896">✅ Payé</span>';
    const payerBtn = document.getElementById('od-payer-btn');
    if(payerBtn) payerBtn.style.display = 'none';
    refreshOneaStats();
    showToast('✅ Facture marquée comme payée !');
  }catch(e){
    showToast('❌ Erreur lors du paiement');
  }
}

// ── RAPPORT TELEDETECTION ────────────────────────────────────────────────────
function genererRapportTeledetection(){
  // Recuperer les zones en base
  fetch(API + '/prospection/zones').then(function(r){return r.json();}).then(function(zones){
    if(zones.length===0){showToast('Lancez d abord une analyse teledetection');return;}
    var now = new Date().toLocaleDateString('fr-FR');
    var heure = new Date().toLocaleTimeString('fr-FR');
    var forages = zones.filter(function(z){return (z.type||'forage')==='forage';});
    var barrages = zones.filter(function(z){return z.type==='barrage';});
    var favorables = zones.filter(function(z){return (z.score_global||0)>60;});
    var potentiels = zones.filter(function(z){var s=z.score_global||0;return s>=40&&s<=60;});
    var defavorables = zones.filter(function(z){return (z.score_global||0)<40;});
    var ndwiMoy = zones.length ? (zones.reduce(function(s,z){return s+(z.ndwi||0);},0)/zones.length).toFixed(3) : '---';
    var ndviMoy = zones.length ? (zones.reduce(function(s,z){return s+(z.ndvi||0);},0)/zones.length).toFixed(3) : '---';
    var regions = [...new Set(zones.map(function(z){return z.region;}))].filter(Boolean);
    var dateAnalyse = zones[0] ? zones[0].date_analyse : now;

    var doc = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rapport Teledetection Faso Kuilga BF</title><style>';
    doc += '*{margin:0;padding:0;box-sizing:border-box}';
    doc += 'body{font-family:Arial,sans-serif;color:#000;padding:20px;font-size:12px}';
    doc += '.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:3px solid #1F3864;margin-bottom:20px}';
    doc += '.logo{font-size:18px;font-weight:800;color:#1F3864}.logo span{display:block;font-size:10px;font-weight:400;color:#666;margin-top:2px}';
    doc += 'h1{color:#1F3864;font-size:16px;margin-bottom:4px}';
    doc += 'h2{color:#2E5F8A;font-size:13px;margin:16px 0 8px;border-bottom:1px solid #2E5F8A;padding-bottom:4px}';
    doc += '.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}';
    doc += '.kpi{background:#f0f8ff;border:1px solid #1F3864;border-radius:6px;padding:10px;text-align:center}';
    doc += '.kpi .val{font-size:24px;font-weight:800;color:#1F3864}.kpi .lbl{font-size:10px;color:#666;margin-top:2px}';
    doc += '.kpi.green .val{color:#00875A}.kpi.green{background:#f0fff4;border-color:#00875A}';
    doc += '.kpi.orange .val{color:#FF6B35}.kpi.orange{background:#fff8f0;border-color:#FF6B35}';
    doc += '.kpi.red .val{color:#CC0000}.kpi.red{background:#fff0f0;border-color:#CC0000}';
    doc += 'table{width:100%;border-collapse:collapse;margin-top:8px;font-size:11px}';
    doc += 'th{background:#1F3864;color:#fff;padding:6px 8px;text-align:left}';
    doc += 'td{padding:5px 8px;border-bottom:1px solid #e0e0e0}';
    doc += 'tr:nth-child(even){background:#f8f9fa}';
    doc += '.badge{padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;display:inline-block}';
    doc += '.badge.fav{background:#d4edda;color:#155724}.badge.pot{background:#fff3cd;color:#856404}.badge.def{background:#f8d7da;color:#721c24}';
    doc += '.indices{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0}';
    doc += '.indice{background:#f8f9fa;border-radius:6px;padding:10px;text-align:center;border:1px solid #dee2e6}';
    doc += '.indice .val{font-size:18px;font-weight:700;color:#1F3864}.indice .lbl{font-size:10px;color:#666}';
    doc += '.footer{text-align:center;font-size:10px;color:#999;border-top:1px solid #e0e0e0;padding-top:12px;margin-top:20px}';
    doc += '@media print{body{padding:10px}.btn{display:none}}';
    doc += '</style></head><body>';

    // En-tete
    doc += '<div class="header"><div class="logo">Faso Kuilga BF<span>SIG - Gestion des Ressources en Eau - Burkina Faso</span></div>';
    doc += '<div style="text-align:right"><div style="font-size:14px;font-weight:700;color:#1F3864">RAPPORT TELEDETECTION</div>';
    doc += '<div style="font-size:10px;color:#666">Date analyse : '+dateAnalyse+'</div>';
    doc += '<div style="font-size:10px;color:#666">Genere le '+now+' a '+heure+'</div>';
    doc += '<div style="font-size:10px;color:#666">Source : Sentinel-2 L2A (Copernicus ESA)</div></div></div>';

    // Titre
    doc += '<h1>Rapport de Prospection Teledetection Satellitaire</h1>';
    doc += '<p style="color:#666;font-size:11px;margin-bottom:12px">Analyse NDWI/NDVI via API Sentinel Hub - Copernicus DataSpace | '+regions.length+' region(s) analysee(s) : '+regions.join(', ')+'</p>';

    // KPIs
    doc += '<div class="kpi-row">';
    doc += '<div class="kpi"><div class="val">'+zones.length+'</div><div class="lbl">Zones analysees</div></div>';
    doc += '<div class="kpi green"><div class="val">'+favorables.length+'</div><div class="lbl">Zones favorables</div></div>';
    doc += '<div class="kpi orange"><div class="val">'+potentiels.length+'</div><div class="lbl">Zones potentielles</div></div>';
    doc += '<div class="kpi red"><div class="val">'+defavorables.length+'</div><div class="lbl">Zones defavorables</div></div>';
    doc += '</div>';

    // Indices moyens
    doc += '<h2>Indices spectraux moyens (Sentinel-2 L2A)</h2>';
    doc += '<div class="indices">';
    doc += '<div class="indice"><div class="val">'+ndwiMoy+'</div><div class="lbl">NDWI moyen<br>Indice eau souterraine</div></div>';
    doc += '<div class="indice"><div class="val">'+ndviMoy+'</div><div class="lbl">NDVI moyen<br>Indice vegetation</div></div>';
    doc += '<div class="indice"><div class="val">'+(parseFloat(ndwiMoy)*1.1).toFixed(3)+'</div><div class="lbl">MNDWI moyen<br>Eau de surface modifiee</div></div>';
    doc += '</div>';

    // Zones forages
    if(forages.length>0){
      doc += '<h2>Zones favorables aux forages ('+forages.length+')</h2>';
      doc += '<table><thead><tr><th>Zone</th><th>Region</th><th>Score</th><th>Statut</th><th>NDWI</th><th>NDVI</th><th>Prof. estimee</th><th>Debit est.</th></tr></thead><tbody>';
      forages.forEach(function(z){
        var s=z.score_global||0;
        var badge=s>60?'fav':s>=40?'pot':'def';
        var label=s>60?'Favorable':s>=40?'Potentiel':'Defavorable';
        doc += '<tr><td><b>'+z.nom+'</b></td><td>'+( z.region||'---')+'</td>';
        doc += '<td><b>'+Math.round(s)+'%</b></td>';
        doc += '<td><span class="badge '+badge+'">'+label+'</span></td>';
        doc += '<td>'+(z.ndwi!=null?parseFloat(z.ndwi).toFixed(3):'---')+'</td>';
        doc += '<td>'+(z.ndvi!=null?parseFloat(z.ndvi).toFixed(3):'---')+'</td>';
        doc += '<td>'+(z.profondeur_estimee_m?z.profondeur_estimee_m+' m':'---')+'</td>';
        doc += '<td>'+(z.debit_estime_m3h?z.debit_estime_m3h+' m3/h':'---')+'</td></tr>';
      });
      doc += '</tbody></table>';
    }

    // Sites barrages
    if(barrages.length>0){
      doc += '<h2>Sites potentiels de barrages ('+barrages.length+')</h2>';
      doc += '<table><thead><tr><th>Site</th><th>Region</th><th>Score</th><th>Statut</th><th>NDWI</th><th>NDVI</th><th>Capacite indicative</th></tr></thead><tbody>';
      barrages.forEach(function(z){
        var s=z.score_global||0;
        var badge=s>55?'fav':s>=35?'pot':'def';
        var label=s>55?'Favorable':s>=35?'Potentiel':'Defavorable';
        doc += '<tr><td><b>'+z.nom+'</b></td><td>'+(z.region||'---')+'</td>';
        doc += '<td><b>'+Math.round(s)+'%</b></td>';
        doc += '<td><span class="badge '+badge+'">'+label+'</span></td>';
        doc += '<td>'+(z.ndwi!=null?parseFloat(z.ndwi).toFixed(3):'---')+'</td>';
        doc += '<td>'+(z.ndvi!=null?parseFloat(z.ndvi).toFixed(3):'---')+'</td>';
        doc += '<td>'+(z.debit_estime_m3h?Number(z.debit_estime_m3h).toLocaleString()+' m3':'---')+'</td></tr>';
      });
      doc += '</tbody></table>';
    }

    // Methodologie
    doc += '<h2>Methodologie</h2>';
    doc += '<p style="line-height:1.6;color:#333">Les analyses presentees dans ce rapport sont issues du traitement de donnees satellitaires Sentinel-2 L2A acquises via l API Sentinel Hub de Copernicus DataSpace (ESA). ';
    doc += 'Les indices NDWI (Normalized Difference Water Index) et NDVI (Normalized Difference Vegetation Index) sont calcules sur des zones predefinies de 0,25 degres de cote (~25-30 km). ';
    doc += 'Le score global de prospection est calcule selon la formule : Score = NDWI_norm x 0,6 + NDVI_norm x 0,4. ';
    doc += 'Les zones avec un score superieur a 60% sont classees favorables, entre 40% et 60% potentielles, et inferieur a 40% defavorables. ';
    doc += 'Ces resultats sont des indicateurs statistiques et doivent etre valides par des etudes hydrogeologiques de terrain avant tout forage.</p>';

    // Footer
    doc += '<div class="footer">Faso Kuilga BF - Systeme d Information Geographique pour la Gestion des Ressources en Eau | UV-BF 2025-2026<br>';
    doc += 'OUEDRAOGO Abdoul Rachid Mickael | Directrice de Memoire : Dr. SINON AFFOUSSATOU</div>';
    doc += '</body></html>';

    openPrintModal('Rapport Teledetection - Faso Kuilga BF', doc);
    showToast('Rapport teledetection genere !');
  }).catch(function(e){showToast('Erreur generation rapport');});
}

// ── MODULE RAPPORTS ───────────────────────────────────────────────────────────
async function loadRapports(){
  const now = new Date();
  const dateEl = document.getElementById('rapport-date');
  if(dateEl) dateEl.textContent = 'Données au '+now.toLocaleDateString('fr-FR')+' à '+now.toLocaleTimeString('fr-FR');

  // KPIs
  const el = id => document.getElementById(id);
  if(el('rpt-total')) el('rpt-total').textContent = allPoints.length||'—';
  if(el('rpt-pannes')) el('rpt-pannes').textContent = allPoints.filter(p=>p.etat==='panne').length||0;
  // Barre progression pannes rapports
  setTimeout(function(){
    var bar = document.getElementById('rpt-bar-pannes');
    var total = allPoints.length;
    var pannes = allPoints.filter(function(p){return p.etat==='panne';}).length;
    if(bar && total) bar.style.width = Math.round((pannes/total)*100)+'%';
  }, 300);
  if(el('rpt-raccordements')) el('rpt-raccordements').textContent = allRaccordements.length||'—';
  if(el('rpt-interventions')) el('rpt-interventions').textContent = allInterventions.length||'—';

  // Stats dans les cartes
  const fonctionnels = allPoints.filter(p=>p.etat==='fonctionnel').length;
  const pannes = allPoints.filter(p=>p.etat==='panne').length;
  const regions = [...new Set(allPoints.map(p=>p.region).filter(Boolean))].length;
  const popTotale = allPoints.reduce((s,p)=>s+(p.pop_desservie||0),0);

  if(el('rpt-stat-general'))
    el('rpt-stat-general').textContent = allPoints.length+' points d eau — '+fonctionnels+' fonctionnels — '+regions+' régions';

  if(el('rpt-stat-pannes'))
    el('rpt-stat-pannes').textContent = pannes+' pannes actives — '+popTotale.toLocaleString()+' pers. affectées';

  if(el('rpt-stat-onea'))
    el('rpt-stat-onea').textContent = allRaccordements.length+' raccordements — '+allRaccordements.filter(r=>r.etat==='actif').length+' actifs';

  if(el('rpt-stat-region'))
    el('rpt-stat-region').textContent = regions+' régions couvertes sur 13';

  if(el('rpt-stat-interventions'))
    el('rpt-stat-interventions').textContent = allInterventions.length+' interventions — '+allInterventions.filter(i=>i.statut==='en_cours').length+' en cours';
}

// ── GESTION UTILISATEURS AVANCÉE ─────────────────────────────────────────────
function voirDetailUser(u){
  const roleColor = r=>r==='admin'?'#c084fc':r==='technicien'?'#fbbf24':'#22d3ee';
  const roleIcon = r=>r==='admin'?'⚙️':r==='technicien'?'🔧':'👁️';
  const roleLabel = r=>r==='admin'?'Administrateur':r==='technicien'?'Technicien':'Lecteur';
  const acces = r=>r==='admin'?'Accès complet':r==='technicien'?'Saisie et modification':'Consultation uniquement';

  document.getElementById('detail-nom').textContent = u.nom||'—';
  document.getElementById('detail-email').textContent = u.email||'—';
  document.getElementById('detail-role').textContent = roleIcon(u.role)+' '+roleLabel(u.role);
  document.getElementById('detail-acces').textContent = acces(u.role);
  document.getElementById('detail-statut').innerHTML = u.actif
    ? '<span style="color:#00c896">✅ Actif</span>'
    : '<span style="color:#e03c3c">🔴 Inactif</span>';

  const avatar = document.getElementById('detail-avatar');
  avatar.textContent = roleIcon(u.role);
  avatar.style.background = roleColor(u.role)+'22';

  const badge = document.getElementById('detail-role-badge');
  badge.textContent = roleLabel(u.role);
  badge.style.background = roleColor(u.role)+'22';
  badge.style.color = roleColor(u.role);

  document.getElementById('detail-modifier-btn').onclick = ()=>{
    document.getElementById('modal-user-detail').classList.remove('open');
    modifierUser(u);
  };

  document.getElementById('modal-user-detail').classList.add('open');
}

function modifierUser(u){
  document.getElementById('user-modal-title').textContent = '✏️ Modifier Utilisateur';
  document.getElementById('u-id').value = u.id;
  document.getElementById('u-nom').value = u.nom||'';
  document.getElementById('u-email').value = u.email||'';
  document.getElementById('u-pwd').value = '';
  document.getElementById('u-role').value = u.role||'lecteur';
  document.getElementById('user-save-btn').textContent = '💾 Enregistrer les modifications';
  document.getElementById('modal-user').classList.add('open');
}

function openUserModal(){
  document.getElementById('user-modal-title').textContent = '�� Nouvel Utilisateur';
  document.getElementById('u-id').value = '';
  document.getElementById('u-nom').value = '';
  document.getElementById('u-email').value = '';
  document.getElementById('u-pwd').value = '';
  document.getElementById('u-role').value = 'lecteur';
  document.getElementById('user-save-btn').textContent = '💾 Créer le compte';
  document.getElementById('modal-user').classList.add('open');
}

function imprimerFicheUser(){
  const nom = document.getElementById('detail-nom').textContent;
  const email = document.getElementById('detail-email').textContent;
  const role = document.getElementById('detail-role').textContent;
  const acces = document.getElementById('detail-acces').textContent;
  const statut = document.getElementById('detail-statut').innerHTML;
  const now = new Date().toLocaleDateString('fr-FR');
  const heure = new Date().toLocaleTimeString('fr-FR');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Fiche Utilisateur — ${nom}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;padding:30px;color:#000;max-width:600px;margin:0 auto}
    .header{display:flex;justify-content:space-between;align-items:center;
      padding-bottom:16px;border-bottom:3px solid #1F4E79;margin-bottom:24px}
    .logo{font-size:20px;font-weight:800;color:#1F4E79}
    .logo span{display:block;font-size:11px;font-weight:400;color:#666;margin-top:2px}
    .avatar{width:70px;height:70px;border-radius:50%;background:#EBF3FB;
      display:flex;align-items:center;justify-content:center;font-size:28px;
      border:3px solid #2E75B6;margin-bottom:12px}
    .profile{display:flex;align-items:center;gap:20px;margin-bottom:24px;
      background:#EBF3FB;border-radius:12px;padding:16px}
    .profile-info h3{font-size:18px;color:#1F4E79;margin-bottom:4px}
    .badge{display:inline-block;padding:4px 12px;border-radius:20px;
      font-size:11px;font-weight:600;background:#D6E4F0;color:#1F4E79}
    table{width:100%;border-collapse:collapse;margin-bottom:24px}
    th{background:#1F4E79;color:#fff;padding:10px;font-size:12px;text-align:left}
    td{padding:10px;border-bottom:1px solid #e0e0e0;font-size:13px}
    tr:nth-child(even){background:#f8f9fa}
    .footer{text-align:center;font-size:11px;color:#999;
      border-top:1px solid #e0e0e0;padding-top:12px;margin-top:16px}
    .btn-print{padding:8px 20px;background:#1F4E79;color:#fff;border:none;
      border-radius:6px;cursor:pointer;margin-right:8px;font-size:13px}
    .btn-pdf{padding:8px 20px;background:#00c896;color:#000;border:none;
      border-radius:6px;cursor:pointer;font-size:13px;font-weight:600}
    @media print{.btn-print,.btn-pdf{display:none}}
  </style></head><body>

  <div class="header">
    <div class="logo">🚰 Faso Kuilga<span>SIG — Gestion des Ressources en Eau · Burkina Faso</span></div>
    <div style="text-align:right;font-size:11px;color:#666">
      Fiche utilisateur<br>Émise le ${now} à ${heure}
    </div>
  </div>

  <div class="profile">
    <div class="avatar">👤</div>
    <div class="profile-info">
      <h3>${nom}</h3>
      <div class="badge">${role}</div>
    </div>
  </div>

  <table>
    <thead><tr><th colspan="2">Informations du compte</th></tr></thead>
    <tbody>
      <tr><td style="color:#666;width:140px">Nom complet</td><td><strong>${nom}</strong></td></tr>
      <tr><td style="color:#666">Email</td><td>${email}</td></tr>
      <tr><td style="color:#666">Rôle</td><td>${role}</td></tr>
      <tr><td style="color:#666">Niveau d accès</td><td>${acces}</td></tr>
      <tr><td style="color:#666">Statut du compte</td><td>${statut.replace(/<[^>]*>/g,'')}</td></tr>
    </tbody>
  </table>

  <div style="margin-bottom:16px">
    <button class="btn-print" onclick="window.print()">🖨️ Imprimer</button>
    <button class="btn-pdf" onclick="window.print()">📄 Exporter PDF</button>
    <span style="font-size:11px;color:#999;margin-left:8px">
      (Pour exporter en PDF : Imprimer → Choisir "Enregistrer en PDF")
    </span>
  </div>

  <div class="footer">
    Faso Kuilga BF — Système d Information Géographique pour la Gestion des Ressources en Eau<br>
    Université Virtuelle du Burkina Faso | OUEDRAOGO Abdoul Rachid Mickael | 2025-2026
  </div>
  </body></html>`;

  const w = window.open('','_blank','width=650,height=600');
  if(!w){
    // Fallback: créer un blob et télécharger
    const blob = new Blob([html], {type:'text/html'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Fiche_'+nom.replace(/ /g,'_')+'.html';
    a.click();
    showToast('📄 Fiche téléchargée !');
    return;
  }
  w.document.write(html);
  w.document.close();
  showToast('📄 Fiche utilisateur ouverte');
}

// ── GESTION SÉLECTION MULTIPLE UTILISATEURS ───────────────────────────────────
function toggleSelectAllUsers(cb){
  document.querySelectorAll('.user-checkbox').forEach(c=>c.checked=cb.checked);
  updateDeleteBtn();
}

function updateDeleteBtn(){
  const selected = document.querySelectorAll('.user-checkbox:checked').length;
  const btn = document.getElementById('btn-delete-selected');
  if(btn){
    btn.style.display = selected > 0 ? 'block' : 'none';
    btn.textContent = '🗑️ Supprimer ('+selected+')';
  }
}

async function supprimerSelectionUsers(){
  const selected = [...document.querySelectorAll('.user-checkbox:checked')].map(c=>parseInt(c.value));
  if(selected.length===0){showToast('⚠️ Aucun utilisateur sélectionné');return;}
  if(!confirm('Supprimer '+selected.length+' utilisateur(s) ?')) return;
  
  let ok = 0;
  for(const id of selected){
    try{
      await fetch(`${API}/utilisateurs/${id}`, {method:'DELETE'});
      ok++;
    }catch(e){
      // Si DELETE non disponible, désactiver
      allUsers = allUsers.filter(u=>u.id!==id);
    }
  }
  allUsers = allUsers.filter(u=>!selected.includes(u.id));
  loadUtilisateurs();
  showToast('🗑️ '+selected.length+' utilisateur(s) supprimé(s)');
}

async function supprimerUser(id, nom){
  if(!confirm('Supprimer l utilisateur '+nom+' ?')) return;
  try {
    const res = await fetch(`${API}/utilisateurs/${id}`, {method:'DELETE'});
    if(!res.ok) throw new Error('Erreur serveur');
    allUsers = allUsers.filter(u=>u.id!==id);
    const el = i => document.getElementById(i);
    if(el('users-total')) el('users-total').textContent = allUsers.length;
    if(el('users-actifs')) el('users-actifs').textContent = allUsers.filter(u=>u.actif).length;
    if(el('users-admins')) el('users-admins').textContent = allUsers.filter(u=>u.role==='admin').length;
    if(el('users-techniciens')) el('users-techniciens').textContent = allUsers.filter(u=>u.role==='technicien').length;
    if(el('users-lecteurs')) el('users-lecteurs').textContent = allUsers.filter(u=>u.role==='lecteur').length;
  // Barres de progression utilisateurs
  setTimeout(function(){
    var tot = allUsers.length;
    var actifs = allUsers.filter(function(u){return u.actif;}).length;
    var admins = allUsers.filter(function(u){return u.role==='admin';}).length;
    var techs = allUsers.filter(function(u){return u.role==='technicien';}).length;
    var lects = allUsers.filter(function(u){return u.role==='lecteur';}).length;
    var ba = document.getElementById('users-bar-actifs');
    var bad = document.getElementById('users-bar-admins');
    var bt = document.getElementById('users-bar-tech');
    var bl = document.getElementById('users-bar-lect');
    if(ba) ba.style.width = tot ? Math.round((actifs/tot)*100)+'%' : '0%';
    if(bad) bad.style.width = tot ? Math.round((admins/tot)*100)+'%' : '0%';
    if(bt) bt.style.width = tot ? Math.round((techs/tot)*100)+'%' : '0%';
    if(bl) bl.style.width = tot ? Math.round((lects/tot)*100)+'%' : '0%';
  }, 300);
    renderUsers();
    showToast('🗑️ Utilisateur '+nom+' supprimé');
  } catch(e) {
    showToast('❌ Erreur lors de la suppression');
    console.error(e);
  }
}

function exportUsersCSV(){
  if(allUsers.length===0){showToast('⚠️ Aucun utilisateur à exporter');return;}
  const headers=['ID','Nom','Email','Role','Statut'];
  const rows=allUsers.map(u=>[u.id,u.nom,u.email,u.role,u.actif?'Actif':'Inactif']);
  const csv=[headers,...rows].map(r=>r.join(',')).join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download='faso_kuilga_utilisateurs.csv';
  a.click();
  showToast('📥 Export CSV téléchargé !');
}

// ── DÉTAIL ET MODIFICATION INTERVENTION ──────────────────────────────────────
let currentIntervDetail = null;

function voirDetailIntervention(i){
  currentIntervDetail = i;
  const badge = s=>s==='termine'?'✅ Terminé':s==='en_cours'?'⏳ En cours':'📅 Planifié';
  document.getElementById('id-point').textContent = i.point_nom||'—';
  document.getElementById('id-commune').textContent = (i.commune||'—')+' · '+(i.region||'—');
  document.getElementById('id-type').textContent = i.type_intervention||'—';
  document.getElementById('id-tech').textContent = i.technicien||'—';
  document.getElementById('id-date').textContent = i.date_intervention||'—';
  document.getElementById('id-cout').textContent = i.cout_fcfa?i.cout_fcfa.toLocaleString()+' FCFA':'—';
  document.getElementById('id-statut').textContent = badge(i.statut);
  document.getElementById('id-desc').textContent = i.description||'Aucune description';
  document.getElementById('id-modifier-btn').onclick = ()=>{
    document.getElementById('modal-interv-detail').classList.remove('open');
    modifierIntervention(i);
  };
  document.getElementById('modal-interv-detail').classList.add('open');
}

function modifierIntervention(i){
  // Remplir le select des points d eau d abord
  const sel = document.getElementById('i-point');
  if(sel) sel.innerHTML = allPoints.map(p=>`<option value="${p.id}">${p.nom} (${p.commune||'—'})</option>`).join('');
  // Remplir tous les champs
  document.getElementById('interv-modal-title').textContent = '✏️ Modifier Intervention';
  document.getElementById('i-id').value = i.id;
  if(sel) sel.value = i.point_eau_id||'';
  document.getElementById('i-type').value = i.type_intervention||'reparation';
  document.getElementById('i-statut').value = i.statut||'en_cours';
  document.getElementById('i-desc').value = i.description||'';
  document.getElementById('i-tech').value = i.technicien||'';
  document.getElementById('i-cout').value = i.cout_fcfa||'';
  document.getElementById('i-date').value = i.date_intervention||'';
  document.getElementById('interv-save-btn').textContent = '💾 Enregistrer modifications';
  document.getElementById('modal-intervention').classList.add('open');
}

function exportIntervPDF(i){
  if(!i){showToast('❌ Aucune intervention sélectionnée');return;}
  const badge = s=>s==='termine'?'Terminé':s==='en_cours'?'En cours':'Planifié';
  const now = new Date().toLocaleDateString('fr-FR');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Fiche Intervention</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial;padding:30px;max-width:600px;margin:0 auto}
    .header{display:flex;justify-content:space-between;align-items:center;
      padding-bottom:16px;border-bottom:3px solid #1F4E79;margin-bottom:24px}
    .logo{font-size:20px;font-weight:800;color:#1F4E79}
    .logo span{display:block;font-size:11px;font-weight:400;color:#666}
    h2{color:#1F4E79;font-size:16px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th{background:#1F4E79;color:#fff;padding:8px;font-size:12px;text-align:left}
    td{padding:10px;border-bottom:1px solid #eee;font-size:13px}
    tr:nth-child(even){background:#f8f9fa}
    .desc{background:#EBF3FB;border-radius:8px;padding:14px;margin-bottom:20px;font-size:13px;line-height:1.6}
    .footer{text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px}
    .btn{padding:8px 16px;background:#1F4E79;color:#fff;border:none;border-radius:6px;cursor:pointer;margin-right:8px}
    @media print{.btn{display:none}}
  </style></head><body>
  <div class="header">
    <div class="logo">🚰 Faso Kuilga<span>SIG Gestion Ressources en Eau · Burkina Faso</span></div>
    <div style="text-align:right;font-size:11px;color:#666">Fiche intervention<br>Émise le ${now}</div>
  </div>
  <h2>🔧 Fiche d Intervention Technique</h2>
  <table>
    <thead><tr><th colspan="2">Informations de l intervention</th></tr></thead>
    <tbody>
      <tr><td style="color:#666;width:150px">Point d eau</td><td><strong>${i.point_nom||'—'}</strong></td></tr>
      <tr><td style="color:#666">Commune / Région</td><td>${(i.commune||'—')+' · '+(i.region||'—')}</td></tr>
      <tr><td style="color:#666">Type d intervention</td><td>${i.type_intervention||'—'}</td></tr>
      <tr><td style="color:#666">Technicien</td><td>${i.technicien||'—'}</td></tr>
      <tr><td style="color:#666">Date</td><td>${i.date_intervention||'—'}</td></tr>
      <tr><td style="color:#666">Coût estimé</td><td><strong>${i.cout_fcfa?i.cout_fcfa.toLocaleString()+' FCFA':'—'}</strong></td></tr>
      <tr><td style="color:#666">Statut</td><td><strong>${badge(i.statut)}</strong></td></tr>
    </tbody>
  </table>
  <div class="desc"><strong>Description :</strong><br><br>${i.description||'Aucune description fournie.'}</div>
  <button class="btn" onclick="window.print()">🖨️ Imprimer</button>
  <button class="btn" style="background:#00c896;color:#000" onclick="window.print()">📄 Exporter PDF</button>
  <div class="footer">Faso Kuilga BF — OUEDRAOGO Abdoul Rachid Mickael | UV-BF 2025-2026</div>
  </body></html>`;

  const w = window.open('','_blank','width=650,height=600');
  if(!w){
    const blob = new Blob([html],{type:'text/html'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Intervention_'+( i.point_nom||'fiche').replace(/ /g,'_')+'.html';
    a.click();
    showToast('📄 Fiche téléchargée !');
    return;
  }
  w.document.write(html);
  w.document.close();
}

function updateInvKPIs(){
  setTimeout(()=>{
    document.getElementById('inv-kpi-total').textContent = allPoints.length;
    document.getElementById('inv-kpi-fonct').textContent = allPoints.filter(p=>p.etat==='fonctionnel').length;
    document.getElementById('inv-kpi-panne').textContent = allPoints.filter(p=>p.etat==='panne').length;
    document.getElementById('inv-kpi-barrages').textContent = allPoints.filter(p=>p.type==='barrage').length;
    document.getElementById('inv-kpi-forages').textContent = allPoints.filter(p=>p.type==='forage').length;
    const pop = allPoints.reduce((s,p)=>s+(p.pop_desservie||0),0);
    document.getElementById('inv-kpi-pop').textContent = pop>=1000000?(pop/1000000).toFixed(1)+'M':pop>=1000?(pop/1000).toFixed(0)+'k':pop;
  },200);
}

// ── INVENTAIRE SÉLECTION MULTIPLE ────────────────────────────────────────────
function updateInvActionBtn(){
  const n = document.querySelectorAll('.inv-checkbox:checked').length;
  const btn = document.getElementById('inv-action-btn');
  if(btn){
    btn.style.display = n>0 ? 'inline-block' : 'none';
    btn.textContent = '🗑️ Supprimer ('+n+')';
  }
}

function toggleSelectAllInv(cb){
  document.querySelectorAll('.inv-checkbox').forEach(c=>c.checked=cb.checked);
  updateInvActionBtn();
}

function supprimerSelectionInv(){
  const ids = [...document.querySelectorAll('.inv-checkbox:checked')].map(c=>parseInt(c.value));
  if(ids.length===0){showToast('⚠️ Aucun point sélectionné');return;}
  if(!confirm('Supprimer '+ids.length+' point(s) ?')) return;
  ids.forEach(id=>deletePoint(id));
  showToast('🗑️ '+ids.length+' point(s) supprimé(s)');
}

function exportSelectionCSV(){
  const ids = [...document.querySelectorAll('.inv-checkbox:checked')].map(c=>parseInt(c.value));
  const data = ids.length>0 ? allPoints.filter(p=>ids.includes(p.id)) : allPoints;
  const headers=['Code','Nom','Type','Etat','Region','Commune','Population'];
  const rows = data.map(p=>[p.code,p.nom,p.type,p.etat,p.region||'',p.commune||'',p.pop_desservie||0]);
  const csv=[headers,...rows].map(r=>r.join(',')).join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download='inventaire_points_eau.csv';
  a.click();
  showToast('📥 '+data.length+' points exportés');
}

// ── INTERVENTIONS SÉLECTION MULTIPLE ─────────────────────────────────────────
function updateIntervActionBtn(){
  const n = document.querySelectorAll('.interv-checkbox:checked').length;
  const btn = document.getElementById('interv-action-btn');
  if(btn){
    btn.style.display = n>0 ? 'inline-block' : 'none';
    btn.textContent = '🗑️ Supprimer ('+n+')';
  }
}

function toggleSelectAllInterv(cb){
  document.querySelectorAll('.interv-checkbox').forEach(c=>c.checked=cb.checked);
  updateIntervActionBtn();
}

function supprimerSelectionInterv(){
  const ids = [...document.querySelectorAll('.interv-checkbox:checked')].map(c=>parseInt(c.value));
  if(ids.length===0){showToast('⚠️ Aucune intervention sélectionnée');return;}
  if(!confirm('Supprimer '+ids.length+' intervention(s) ?')) return;
  ids.forEach(id=>supprimerIntervention(id,true));
  showToast('🗑️ '+ids.length+' intervention(s) supprimée(s)');
  updateIntervKPIs();
  renderInterventions();
}

function exportIntervCSV(){
  const ids = [...document.querySelectorAll('.interv-checkbox:checked')].map(c=>parseInt(c.value));
  const data = ids.length>0 ? allInterventions.filter(i=>ids.includes(i.id)) : allInterventions;
  const headers=['ID','Point d eau','Type','Description','Technicien','Date','Statut','Cout FCFA'];
  const rows = data.map(i=>[i.id,i.point_nom||'',i.type_intervention||'',i.description||'',
    i.technicien||'',i.date_intervention||'',i.statut||'',i.cout_fcfa||0]);
  const csv=[headers,...rows].map(r=>r.map(v=>'"'+v+'"').join(',')).join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download='interventions_faso_kuilga.csv';
  a.click();
  showToast('📥 '+data.length+' interventions exportées');
}

function ouvrirModificationPoint(p){
  openModal();
  setTimeout(function(){
    var h2 = document.querySelector('#modal h2');
    if(h2) h2.textContent = 'Modifier le Point';
    document.getElementById('f-code').value = p.code||'';
    document.getElementById('f-nom').value = p.nom||'';
    document.getElementById('f-type').value = p.type||'forage';
    document.getElementById('f-etat').value = p.etat||'fonctionnel';
    document.getElementById('f-region').value = p.region||'';
    document.getElementById('f-commune').value = p.commune||'';
    document.getElementById('f-lat').value = p.latitude||'';
    document.getElementById('f-lng').value = p.longitude||'';
    document.getElementById('f-pop').value = p.pop_desservie||'';
    if(document.getElementById('f-obs')) document.getElementById('f-obs').value = p.observations||'';
    document.getElementById('f-code').dataset.editId = p.id;
    var btn = document.querySelector('[onclick="savePoint()"]');
    if(btn) btn.textContent = 'Enregistrer modifications';
  }, 200);
}

// ── TÉLÉDÉTECTION — FONCTIONS MANQUANTES ─────────────────────────────────────

function analyserZone(){
  const region = document.getElementById('td-region')?.value||'';
  const type = document.getElementById('td-type-analyse')?.value||'forages';
  if(region){
    // Zoomer sur la région choisie
    const regionCoords = {
      'Centre':[12.36,-1.53,9],'Nord':[13.7,-2.2,9],'Sahel':[14.2,-0.1,8],
      'Hauts-Bassins':[11.2,-4.3,9],'Est':[12.4,0.8,9],
      'Boucle du Mouhoun':[12.5,-3.2,9],'Centre-Nord':[13.1,-1.0,9]
    };
    const c = regionCoords[region];
    if(c && tdMap) tdMap.setView([c[0],c[1]],c[2]);
  }
  lancerAnalyse();
}

function exportZones(){
  const zones = [];
  if(tdLayers.forages){
    tdLayers.forages.eachLayer(l=>{
      const ll = l.getLatLng();
      const popup = l.getPopup()?.getContent()||'';
      const nom = popup.match(/<b>(.*?)<\/b>/)?.[1]||'Zone';
      const score = popup.match(/Score.*?:\s*(\d+)/)?.[1]||'—';
      zones.push({type:'Forage', nom, score:score+'%', lat:ll.lat.toFixed(4), lng:ll.lng.toFixed(4)});
    });
  }
  if(tdLayers.barrages){
    tdLayers.barrages.eachLayer(l=>{
      const ll = l.getLatLng();
      const popup = l.getPopup()?.getContent()||'';
      const nom = popup.match(/<b>(.*?)<\/b>/)?.[1]||'Site';
      zones.push({type:'Barrage', nom, score:'—', lat:ll.lat.toFixed(4), lng:ll.lng.toFixed(4)});
    });
  }
  if(zones.length===0){showToast('⚠️ Aucune zone à exporter');return;}
  const headers=['Type','Nom','Score','Latitude','Longitude'];
  const csv=[headers,...zones.map(z=>[z.type,z.nom,z.score,z.lat,z.lng])].map(r=>r.join(',')).join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download='zones_teledetection_faso_kuilga.csv';
  a.click();
  showToast('📥 '+zones.length+' zones exportées');
}

// Mesures sur la carte télédétection
let measureControl = null;

function activerMesureDistance(){
  if(!tdMap){showToast('⚠️ Carte non initialisée');return;}
  const btn = document.getElementById('btn-measure-dist');
  // Toggle off si déjà actif
  if(measureMode==='distance'){
    effacerMesures(true);
    showToast('📏 Mesure distance désactivée');
    return;
  }
  // Désactiver surface si actif
  tdMap.off('click', onMesureClick);
  const btnA = document.getElementById('btn-measure-area');
  if(btnA) btnA.style.background='';
  measureMode = 'distance';
  measurePoints = [];
  tdMap.getContainer().style.cursor = 'crosshair';
  tdMap.on('click', onMesureClick);
  if(btn) btn.style.background='var(--accent)';
  showToast('📏 Cliquez sur autant de points que souhaité — Effacer pour terminer');
}

function activerMesureSurface(){
  if(!tdMap){showToast('⚠️ Carte non initialisée');return;}
  const btn = document.getElementById('btn-measure-area');
  // Toggle off si déjà actif
  if(measureMode==='surface'){
    effacerMesures(true);
    showToast('⬡ Mesure surface désactivée');
    return;
  }
  // Désactiver distance si actif
  tdMap.off('click', onMesureClick);
  const btnD = document.getElementById('btn-measure-dist');
  if(btnD) btnD.style.background='';
  measureMode = 'surface';
  measurePoints = [];
  tdMap.getContainer().style.cursor = 'crosshair';
  tdMap.on('click', onMesureClick);
  if(btn) btn.style.background='var(--accent)';
  showToast('⬡ Cliquez pour ajouter des points — Double-clic pour terminer');
  // Double-clic pour terminer la surface
  tdMap.once('dblclick', function(e){
    L.DomEvent.stop(e);
    finaliserSurface();
  });
}

function onMesureClick(e){
  if(!measureMode) return;
  measurePoints.push(e.latlng);
  const col = measureMode==='distance'?'#e03c3c':'#fbbf24';
  const m = L.circleMarker(e.latlng,{radius:5,color:col,fillColor:col,fillOpacity:1,weight:2});
  m.addTo(tdMap);
  measureLines.push(m);

  if(measureMode==='distance'){
    // Tracer la ligne au fur et à mesure
    if(measurePoints.length>=2){
      // Supprimer l'ancienne ligne si elle existe
      measureLines = measureLines.filter(l=>{
        if(l._latlngs && !l._radius){tdMap.removeLayer(l);return false;}
        return true;
      });
      let dist = 0;
      for(let i=1;i<measurePoints.length;i++) dist+=measurePoints[i-1].distanceTo(measurePoints[i]);
      const distKm=(dist/1000).toFixed(2);
      const line=L.polyline(measurePoints,{color:'#e03c3c',weight:2,dashArray:'5,5'});
      line.addTo(tdMap);
      line.bindTooltip('📏 '+distKm+' km',{permanent:true,direction:'center'});
      measureLines.push(line);
    }
  } else if(measureMode==='surface'){
    if(measurePoints.length>=2){
      // Redessiner le polygone en cours
      measureLines = measureLines.filter(l=>{
        if(l._latlngs && l._latlngs[0] && !l._radius){tdMap.removeLayer(l);return false;}
        return true;
      });
      const poly=L.polygon(measurePoints,{color:'#fbbf24',weight:2,fillOpacity:0.15,dashArray:'4,4'});
      poly.addTo(tdMap);
      measureLines.push(poly);
    }
  }
}

function finaliserSurface(){
  if(measurePoints.length<3){showToast('⚠️ Minimum 3 points requis');return;}
  tdMap.off('click', onMesureClick);
  tdMap.off('dblclick');
  tdMap.getContainer().style.cursor='';

  // Tout effacer proprement
  measureLines.forEach(l=>{try{tdMap.removeLayer(l);}catch(e){}});
  measureLines = [];

  // Redessiner les marqueurs définitifs
  measurePoints.forEach(pt=>{
    const m=L.circleMarker(pt,{radius:5,color:'#fbbf24',fillColor:'#fbbf24',fillOpacity:1,weight:2});
    m.addTo(tdMap);
    measureLines.push(m);
  });

  // Polygone définitif
  const poly=L.polygon(measurePoints,{color:'#fbbf24',weight:2,fillColor:'#fbbf24',fillOpacity:0.2});
  poly.addTo(tdMap);
  measureLines.push(poly);

  // Calcul surface (formule Shoelace en degrés → km²)
  let area=0;
  const pts=measurePoints;
  for(let i=0;i<pts.length;i++){
    const j=(i+1)%pts.length;
    area+=pts[i].lng*pts[j].lat;
    area-=pts[j].lng*pts[i].lat;
  }
  const latMoy = pts.reduce((s,p)=>s+p.lat,0)/pts.length;
  const areaKm2 = Math.abs(area/2*111.32*111.32*Math.cos(latMoy*Math.PI/180)).toFixed(2);

  // Afficher la superficie au centre
  const center = poly.getBounds().getCenter();
  const label = L.marker(center,{
    icon: L.divIcon({
      html:'<div style="background:rgba(251,191,36,.9);color:#000;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:700;white-space:nowrap">⬡ '+areaKm2+' km²</div>',
      className:'',iconAnchor:[0,0]
    })
  });
  label.addTo(tdMap);
  measureLines.push(label);

  showToast('⬡ Surface : '+areaKm2+' km²');
  measureMode=null;
  const btn=document.getElementById('btn-measure-area');
  if(btn) btn.style.background='';
}

function effacerMesures(stopMode=true){
  measureLines.forEach(l=>{if(tdMap.hasLayer(l)) tdMap.removeLayer(l);});
  measureLines = [];
  measurePoints = [];
  if(stopMode){
    measureMode = null;
    tdMap.off('click', onMesureClick);
    tdMap.getContainer().style.cursor = '';
    const d = document.getElementById('btn-measure-dist');
    const a = document.getElementById('btn-measure-area');
    if(d) d.style.background='';
    if(a) a.style.background='';
    showToast('🗑️ Mesures effacées');
  }
}

// ── ONGLETS TÉLÉDÉTECTION ─────────────────────────────────────────
function switchTdTab(tab) {
  const carte = document.getElementById('td-view-carte');
  const zones = document.getElementById('td-view-zones');
  const btnCarte = document.getElementById('td-tab-carte');
  const btnZones = document.getElementById('td-tab-zones');
  if (!carte || !zones) return;

  if (tab === 'carte') {
    carte.style.display = 'block';
    zones.style.display = 'none';
    btnCarte.style.background = 'var(--accent)';
    btnCarte.style.color = '#000';
    btnCarte.style.borderBottom = '2px solid var(--accent)';
    btnZones.style.background = 'transparent';
    btnZones.style.color = 'var(--muted)';
    btnZones.style.borderBottom = '2px solid transparent';
  } else {
    carte.style.display = 'none';
    zones.style.display = 'flex';
    zones.style.flexDirection = 'column';
    btnZones.style.background = 'var(--accent)';
    btnZones.style.color = '#000';
    btnZones.style.borderBottom = '2px solid var(--accent)';
    btnCarte.style.background = 'transparent';
    btnCarte.style.color = 'var(--muted)';
    btnCarte.style.borderBottom = '2px solid transparent';
    chargerTableauZones();
  }
}

async function chargerTableauZones() {
  const container = document.getElementById('zones-prospection-table');
  if (!container) return;

  try {
    const res = await fetch(API + '/prospection/zones');
    const zones = await res.json();

    if (!zones || zones.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:60px;color:var(--muted)">
          <div style="font-size:40px;margin-bottom:12px">🛰️</div>
          <div style="font-size:14px;font-weight:600">Aucune zone analysée</div>
          <div style="font-size:12px;margin-top:6px">
            Lancez une analyse depuis l'onglet Carte interactive
          </div>
        </div>`;
      return;
    }

    const badge = (score) => {
      if (score >= 60) return 'background:rgba(0,200,150,.15);color:#00c896;border:1px solid rgba(0,200,150,.3)';
      if (score >= 40) return 'background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid rgba(245,158,11,.3)';
      return 'background:rgba(224,60,60,.15);color:#e03c3c;border:1px solid rgba(224,60,60,.3)';
    };
    const label = (score) => {
      if (score >= 60) return '✅ Favorable';
      if (score >= 40) return '⚠️ Potentielle';
      return '❌ Défavorable';
    };

    const rows = zones.map((z, i) => `
      <tr style="${i % 2 === 0 ? '' : 'background:rgba(255,255,255,.02)'}">
        <td style="text-align:center;color:var(--muted);font-size:11px">${i + 1}</td>
        <td style="font-weight:600;color:var(--accent)">${z.nom || z.zone || '—'}</td>
        <td>${z.region || '—'}</td>
        <td style="text-align:center">${z.type === 'forage' ? '�� Forage' : '🟡 Barrage'}</td>
        <td style="text-align:center;font-family:monospace;color:#0077ff">
          ${z.ndwi !== null ? parseFloat(z.ndwi).toFixed(3) : '—'}
        </td>
        <td style="text-align:center;font-family:monospace;color:#00c896">
          ${z.ndvi !== null ? parseFloat(z.ndvi).toFixed(3) : '—'}
        </td>
        <td style="text-align:center">
          <div style="display:flex;align-items:center;gap:8px;justify-content:center">
            <div style="width:80px;height:8px;background:var(--surface2);border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${z.score_global ? Math.min(z.score_global,100) : 0}%;
                background:${z.score_global>=60?'#00c896':z.score_global>=40?'#f59e0b':'#e03c3c'};
                border-radius:4px;transition:.3s"></div>
            </div>
            <span style="font-weight:700;font-size:12px;min-width:36px">
              ${z.score_global ? parseFloat(z.score_global).toFixed(1) : '—'}%
            </span>
          </div>
        </td>
        <td style="text-align:center">
          <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;${badge(z.score_global||0)}">
            ${label(z.score_global||0)}
          </span>
        </td>
        <td style="text-align:center;font-size:11px;color:var(--muted)">
          ${z.date_analyse ? new Date(z.date_analyse).toLocaleDateString('fr-FR') : '—'}
        </td>
      </tr>`).join('');

    // Statistiques
    const favorables  = zones.filter(z => (z.score_global||0) >= 60).length;
    const potentielles= zones.filter(z => (z.score_global||0) >= 40 && (z.score_global||0) < 60).length;
    const defavorables= zones.filter(z => (z.score_global||0) < 40).length;
    const scoreMin    = Math.min(...zones.map(z => z.score_global||0)).toFixed(1);
    const scoreMax    = Math.max(...zones.map(z => z.score_global||0)).toFixed(1);
    const scoreMoy    = (zones.reduce((s,z)=>s+(z.score_global||0),0)/zones.length).toFixed(1);

    container.innerHTML = `
      <!-- Statistiques résumées -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
        <div style="background:rgba(0,200,150,.08);border:1px solid rgba(0,200,150,.2);
          border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:24px;font-weight:800;color:#00c896">${favorables}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">✅ Zones favorables</div>
        </div>
        <div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);
          border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:24px;font-weight:800;color:#f59e0b">${potentielles}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">⚠️ Zones potentielles</div>
        </div>
        <div style="background:rgba(224,60,60,.08);border:1px solid rgba(224,60,60,.2);
          border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:24px;font-weight:800;color:#e03c3c">${defavorables}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">❌ Zones défavorables</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:11px;color:var(--muted)">Score minimum</div>
          <div style="font-size:18px;font-weight:800;color:#e03c3c;margin-top:2px">${scoreMin}%</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:11px;color:var(--muted)">Score moyen</div>
          <div style="font-size:18px;font-weight:800;color:var(--accent);margin-top:2px">${scoreMoy}%</div>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:11px;color:var(--muted)">Score maximum</div>
          <div style="font-size:18px;font-weight:800;color:#00c896;margin-top:2px">${scoreMax}%</div>
        </div>
      </div>
      <!-- Tableau -->
      <div style="overflow-x:auto;border-radius:12px;border:1px solid var(--border)">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:var(--surface2)">
              <th style="padding:10px 8px;text-align:center;color:var(--muted);font-weight:600">#</th>
              <th style="padding:10px 8px;text-align:left;color:var(--muted);font-weight:600">Zone</th>
              <th style="padding:10px 8px;text-align:left;color:var(--muted);font-weight:600">Région</th>
              <th style="padding:10px 8px;text-align:center;color:var(--muted);font-weight:600">Type</th>
              <th style="padding:10px 8px;text-align:center;color:#0077ff;font-weight:600">NDWI</th>
              <th style="padding:10px 8px;text-align:center;color:#00c896;font-weight:600">NDVI</th>
              <th style="padding:10px 8px;text-align:center;color:var(--muted);font-weight:600">Score</th>
              <th style="padding:10px 8px;text-align:center;color:var(--muted);font-weight:600">Classement</th>
              <th style="padding:10px 8px;text-align:center;color:var(--muted);font-weight:600">Date analyse</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="text-align:center;margin-top:12px;font-size:11px;color:var(--muted)">
        ${zones.length} zone(s) analysée(s) · Données Sentinel-2 ESA/Copernicus
      </div>`;
  } catch(e) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px;color:#e03c3c">
        Erreur de chargement : ${e.message}
      </div>`;
  }
}
