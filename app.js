
/* ===== Wide-screen mobile-only notice ===== */
(function(){
  if (window.self !== window.top || window.innerWidth < 1024) return;
  try { if (sessionStorage.getItem('9jt-wide-screen-continued') === '1') return; } catch(_) {}
  const showNotice = ()=>{
    let overlay = document.getElementById('desktopNotice');
    if(!overlay){
      overlay = document.createElement('div');
      overlay.id = 'desktopNotice';
      overlay.className = 'desktop-notice';
      overlay.setAttribute('role','dialog');
      overlay.setAttribute('aria-modal','true');
      overlay.setAttribute('aria-labelledby','desktopNoticeTitle');
      overlay.innerHTML = '<div class="desktop-notice-panel"><div class="desktop-notice-mark"><i class="ph-fill ph-device-mobile"></i></div><h1 id="desktopNoticeTitle">Made for your phone</h1><p>9jaTalk is designed for mobile screens. You can continue here, but the app will keep its phone-sized layout.</p><button type="button" id="desktopContinue">Continue to 9jaTalk</button></div>';
      document.body.appendChild(overlay);
    }
    overlay.classList.add('show');
    overlay.querySelector('#desktopContinue').addEventListener('click',()=>{
      try { sessionStorage.setItem('9jt-wide-screen-continued','1'); } catch(_) {}
      overlay.remove();
    });
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',showNotice,{once:true});
  else showNotice();
})();

/* ===== profile.js ===== */
if (document.body && document.body.dataset.page === 'profile') {
/* ===== Merged view router (WhatsApp-style tabs) ===== */
(function(){
  function show(v){
    document.querySelectorAll('[data-view]').forEach(el=>{
      el.hidden = (el.getAttribute('data-view') !== v);
    });
    document.querySelectorAll('.tabbar [data-view-target]').forEach(b=>{
      b.classList.toggle('active', b.getAttribute('data-view-target') === v);
    });
    try { history.replaceState(null, '', v === 'profile' ? location.pathname + location.search : '#'+v); } catch(e){}
    window.scrollTo(0,0);
  }
  window.switchView = show;
  window.addEventListener('message', function(e){
    if(e.origin===location.origin && e.data && e.data.type==='9jatalk:view' && (e.data.view==='profile'||e.data.view==='discover')) show(e.data.view);
  });
  document.addEventListener('click', function(e){
    var t = e.target.closest && e.target.closest('[data-view-target]');
    if(t){ e.preventDefault(); show(t.getAttribute('data-view-target')); }
  });
  document.addEventListener('DOMContentLoaded', function(){
    var initial = location.hash === '#discover' ? 'discover' : 'profile';
    show(initial);
  });
  /* ===== Pull-to-refresh (WhatsApp-style, works on both views) ===== */
  function currentView(){
    var v = document.querySelector('[data-view]:not([hidden])');
    return v ? v.getAttribute('data-view') : 'profile';
  }
  var ptr = null;
  var startY = 0, lastY = 0, pulling = false, refreshing = false;
  var THRESHOLD = 70, MAX = 120;
  function getIndicator(){
    if(!ptr) ptr = document.getElementById('ptrIndicator');
    return ptr;
  }
  function setIndicator(dy){
    var ind = getIndicator(); if(!ind) return;
    if(dy <= 0){ ind.classList.remove('visible'); ind.style.transform=''; return; }
    var pct = Math.min(1, dy / THRESHOLD);
    var y = Math.min(dy * 0.5, MAX * 0.6) - 60;
    ind.classList.add('visible');
    ind.style.transform = 'translateX(-50%) translateY(' + y + 'px) scale(' + (0.8 + 0.2*pct) + ') rotate(' + (pct*180) + 'deg)';
  }
  function resetIndicator(){
    var ind = getIndicator(); if(!ind) return;
    ind.classList.remove('visible','refreshing');
    ind.style.transform = '';
  }
  document.addEventListener('touchstart', function(e){
    if(refreshing) return;
    if(window.scrollY > 0) { pulling = false; return; }
    if(e.touches.length !== 1) return;
    // ignore touches inside scrollable sheets/modals
    var t = e.target;
    if(t.closest && t.closest('.sheet, .onb-overlay, .social-sheet, textarea, input, .sheet-scroll')) { pulling = false; return; }
    startY = e.touches[0].clientY;
    lastY = startY;
    pulling = true;
  }, {passive:true});
  document.addEventListener('touchmove', function(e){
    if(!pulling || refreshing) return;
    lastY = e.touches[0].clientY;
    var dy = lastY - startY;
    if(dy > 0 && window.scrollY <= 0){
      setIndicator(dy);
    } else if(dy <= 0){
      resetIndicator();
    }
  }, {passive:true});
  document.addEventListener('touchend', async function(){
    if(!pulling || refreshing){ pulling=false; return; }
    pulling = false;
    var dy = lastY - startY;
    if(dy >= THRESHOLD){
      refreshing = true;
      var ind = getIndicator();
      if(ind){ ind.classList.add('visible','refreshing'); }
      try {
        var v = currentView();
        var fn = (window.__refresh||{})[v];
        if(typeof fn === 'function') await fn();
      } catch(_) {}
      finally {
        setTimeout(function(){ refreshing = false; resetIndicator(); }, 450);
      }
    } else {
      resetIndicator();
    }
  }, {passive:true});
})();


/* ===== Profile page script (scoped) ===== */
(function(){

const SUPABASE_URL = "https://yjfxoximfczrtfgnnqyc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqZnhveGltZmN6cnRmZ25ucXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MzAwMTksImV4cCI6MjA5NDEwNjAxOX0.rGIpoYFYZ6q6Dz_7etlEqnjKp55BeYp1Iqay-__kfjA";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ============ OAuth / magic-link / recovery callback ============
   If Supabase redirects here with a token in the hash,
   exchange it immediately so getSession() works below.
   If it's a recovery token, show the reset-password modal.   */
let isRecoveryFlow = false;
(async () => {
  const hash = window.location.hash;
  if (hash && hash.includes("access_token")) {
    if (hash.includes("type=recovery")) isRecoveryFlow = true;
    await sb.auth.getSession();
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
})();

/* ============ State ============ */
let currentUser = null;
let profile = null;
let editMode = false;
let heartbeatInt = null;
let saving = false;
let reachedFull = false;

const SOCIAL_PLATFORMS = {
  instagram:{ icon:"ph-instagram-logo",  placeholder:"https://instagram.com/yourhandle", domain:"instagram.com" },
  x:        { icon:"ph-x-logo",          placeholder:"https://x.com/yourhandle",         domain:["x.com","twitter.com"] },
  linkedin: { icon:"ph-linkedin-logo",   placeholder:"https://linkedin.com/in/yourname", domain:"linkedin.com" },
  tiktok:   { icon:"ph-tiktok-logo",     placeholder:"https://tiktok.com/@yourhandle",   domain:"tiktok.com" },
  github:   { icon:"ph-github-logo",     placeholder:"https://github.com/yourhandle",    domain:"github.com" }
};

/* ============ Helpers ============ */
const $ = sel => document.querySelector(sel);
function vibrate(ms){ navigator.vibrate && navigator.vibrate(ms); }
function initialsOf(name){
  if(!name) return "N";
  return name.trim().split(/\s+/).slice(0,2).map(s=>s[0].toUpperCase()).join("");
}
function shake(el){ el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); }

/* ============ Card Popup Notification ============ */
const NOTIF_CONFIGS = {
  success:{ icon:"ph-check-circle",   title:"Success",           cardClass:"success" },
  error:  { icon:"ph-x-circle",       title:"Something went wrong", cardClass:"error" },
  warning:{ icon:"ph-warning",        title:"Warning",           cardClass:"warning" },
  info:   { icon:"ph-info",           title:"Notice",            cardClass:"info"    },
  // backward-compat aliases
  good:   { icon:"ph-check-circle",   title:"Done",              cardClass:"success" },
  bad:    { icon:"ph-x-circle",       title:"Something went wrong", cardClass:"error" },
  default:{ icon:"ph-info",           title:"Notice",            cardClass:"info"    },
};
function toast(msg, kind="default"){
  const popup = $("#notifPopup");
  const card = $("#notifCard");
  const icon = $("#notifIcon");
  const title = $("#notifTitle");
  const notifMsg = $("#notifMsg");
  const cfg = NOTIF_CONFIGS[kind] || NOTIF_CONFIGS.default;
  card.className = "notif-card " + cfg.cardClass;
  icon.className = "ph " + cfg.icon;
  title.textContent = cfg.title;
  notifMsg.textContent = msg;
  popup.classList.add("show");
  clearTimeout(window.__notifT);
  window.__notifT = setTimeout(()=> popup.classList.remove("show"), 3000);
}

/* ============ Auth & init ============ */
(async function init(){
  // offline listener
  const updateOffline = ()=> $("#offline").classList.toggle("show", !navigator.onLine);
  window.addEventListener("online", updateOffline);
  window.addEventListener("offline", updateOffline);
  updateOffline();

  // If we just arrived from a magic link, the hash carries the token —
  // give supabase-js a tick to parse it into a session.
  if ((window.location.hash || "").includes("access_token")) {
    await new Promise(r => setTimeout(r, 80));
    // Clean the URL so the token isn't visible / re-processed on refresh
    history.replaceState(null, "", window.location.pathname);
  }

  const { data } = await sb.auth.getSession();
  if(!data.session){ window.location.href = "index.html"; return; }
  currentUser = data.session.user;

  // If this is a password-reset flow, show the modal immediately
  if (isRecoveryFlow) {
    document.getElementById("recoveryOverlay").classList.add("show");
  }

  await loadProfile();
  await setOnline(true);
  loadStats();
  loadBlockedUsers();
  startHeartbeat();
  document.addEventListener("visibilitychange", onVisibility);


  /* Wire up listeners that need DOM + auth to be ready */
  $("#notifClose").addEventListener("click", ()=> $("#notifPopup").classList.remove("show"));

  /* Refresh action (button removed — triggered via pull-to-refresh) */
  window.__refresh = window.__refresh || {};
  window.__refresh.profile = async ()=>{
    try{
      await loadProfile();
      await renderProviderSection();
      toast("Profile refreshed","good");
      vibrate(40);
    }catch(e){
      // loadProfile already showed the error toast
    }
  };
  $("#editBtn").addEventListener("click", ()=> openEditSection());
  $("#doneBtn").addEventListener("click", ()=> { /* legacy no-op */ });
  // ----- NEW: collapsible Edit Profile section wiring -----
  let __efUserTimer = null;
  function populateEditForm(){
    window.__refreshEfAvatar = ()=>{
      const efAv = document.getElementById("efAvatar");
      if(!efAv) return;
      if(profile.avatar_url) efAv.innerHTML = `<img src="${profile.avatar_url}" alt="avatar" />`;
      else efAv.innerHTML = `<span>${initialsOf(profile.full_name || currentUser.email)}</span>`;
    };
    $("#efName").value     = profile.full_name || "";
    $("#efUsername").value = profile.username || "";
    $("#efBio").value      = profile.bio || "";
    $("#efLocation").value = profile.location || "";
    // avatar preview
    const efAv = $("#efAvatar");
    if(profile.avatar_url){
      efAv.innerHTML = `<img src="${profile.avatar_url}" alt="avatar" />`;
    } else {
      efAv.innerHTML = `<span>${initialsOf(profile.full_name || currentUser.email)}</span>`;
    }
    updateEfBioCounter();
    const pill = $("#efUsernamePill");
    pill.className = "username-status-pill";
    if(profile.username){
      pill.className = "username-status-pill show ok";
      pill.innerHTML = `<i class="ph ph-check"></i> @${profile.username} is yours`;
    }
    $("#efError").classList.remove("show");
  }
  function openEditSection(){
    populateEditForm();
    document.body.classList.add("edit-view-open");
    // No auto-focus per spec — user opens edit view without any field focused.
    if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
    __efSnapshot = __efCurrentValues();
    setDirty(false);
    // reset sticky-compact state
    const _h = document.querySelector('.edit-view-header');
    if(_h) _h.classList.remove('compact');
  }
  function closeEditSection(){
    if(window.__efIsDirty){
      const b = document.getElementById("unsavedBanner");
      if(b) b.classList.add("show");
      return;
    }
    document.body.classList.remove("edit-view-open");
    if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  // ---- Unsaved-changes tracking, live preview, sticky header, long-press ----
  let __efSnapshot = null;
  window.__efIsDirty = false;
  function __efCurrentValues(){
    return {
      name: ($("#efName")||{}).value || "",
      username: ($("#efUsername")||{}).value || "",
      bio: ($("#efBio")||{}).value || "",
      location: ($("#efLocation")||{}).value || "",
    };
  }
  function __efCheckDirty(){
    if(!__efSnapshot) return;
    const cur = __efCurrentValues();
    const dirty = Object.keys(cur).some(k => cur[k] !== __efSnapshot[k]);
    setDirty(dirty);
  }
  // Live-preview: name → initials in header avatar
  document.addEventListener("input", (e)=>{
    if(!e.target) return;
    if(e.target.id === "efName"){
      const efAv = document.getElementById("efAvatar");
      if(efAv && !profile.avatar_url){
        const v = e.target.value.trim() || (currentUser && currentUser.email) || "?";
        efAv.innerHTML = `<span>${initialsOf(v)}</span>`;
      }
    }
    if(["efName","efUsername","efBio","efLocation"].includes(e.target.id)){
      __efCheckDirty();
    }
  });
  // Sticky-compact header on scroll
  (function(){
    const body = document.querySelector(".edit-view-body");
    const header = document.querySelector(".edit-view-header");
    if(!body || !header) return;
    body.addEventListener("scroll", ()=>{
      header.classList.toggle("compact", body.scrollTop > 24);
    }, {passive:true});
  })();
  // Long-press avatar → action menu
  (function(){
    const av = document.getElementById("efAvatar");
    if(!av) return;
    let t=null;
    const start = (e)=>{
      clearTimeout(t);
      t = setTimeout(()=>{
        vibrate(30);
        const hasPhoto = !!profile.avatar_url;
        const choice = window.confirm(hasPhoto ? "Remove current photo?" : "Choose a new photo?");
        if(!choice) return;
        if(hasPhoto){
          (async ()=>{
            try{
              await sb.from("profiles").update({avatar_url:null}).eq("id", currentUser.id);
              profile.avatar_url = null;
              if(window.__refreshEfAvatar) window.__refreshEfAvatar();
              toast("Photo removed","good");
            }catch{ toast("Couldn't remove photo","bad"); }
          })();
        } else {
          document.getElementById("efCamBtn").click();
        }
      }, 550);
    };
    const cancel = ()=> clearTimeout(t);
    av.addEventListener("touchstart", start, {passive:true});
    av.addEventListener("touchend", cancel);
    av.addEventListener("touchmove", cancel);
    av.addEventListener("mousedown", start);
    av.addEventListener("mouseup", cancel);
    av.addEventListener("mouseleave", cancel);
  })();
  // Unsaved banner buttons
  (function(){
    const b = document.getElementById("unsavedBanner");
    if(!b) return;
    document.getElementById("unsavedSaveBtn").addEventListener("click", ()=>{
      b.classList.remove("show");
      document.getElementById("saveChangesBtn").click();
    });
    document.getElementById("unsavedDiscardBtn").addEventListener("click", ()=>{
      b.classList.remove("show");
      window.__efIsDirty = false;
      setDirty(false);
      closeEditSection();
    });
  })();
  function updateEfBioCounter(){
    const v = $("#efBio").value;
    const c = $("#efBioCounter");
    c.textContent = `${v.length} / 160`;
    c.classList.toggle("warn", v.length >= 130 && v.length < 160);
    c.classList.toggle("bad",  v.length >= 160);
  }
  $("#cancelEditBtn").addEventListener("click", ()=>{ closeEditSection(); vibrate(20); });
  const __editBackdrop = document.getElementById("editBackdrop");
  if(__editBackdrop) __editBackdrop.addEventListener("click", ()=>{ closeEditSection(); vibrate(15); });
  // Drag the handle/header down to dismiss the bottom sheet
  (function(){
    const sheet = document.getElementById("editSection");
    const handle = document.getElementById("editHandle");
    if(!sheet || !handle) return;
    let startY = 0, curY = 0, dragging = false;
    const onStart = (e)=>{ dragging = true; startY = (e.touches?e.touches[0].clientY:e.clientY); curY = startY; sheet.style.transition = "none"; };
    const onMove = (e)=>{
      if(!dragging) return;
      curY = (e.touches?e.touches[0].clientY:e.clientY);
      const dy = Math.max(0, curY - startY);
      sheet.style.transform = `translateX(-50%) translateY(${dy}px)`;
    };
    const onEnd = ()=>{
      if(!dragging) return;
      dragging = false;
      sheet.style.transition = "";
      sheet.style.transform = "";
      if(curY - startY > 110){ closeEditSection(); vibrate(15); }
    };
    const header = sheet.querySelector('.edit-view-header');
    if(header){
      header.addEventListener('touchstart', (e)=>{ if(e.target.closest('button')) return; onStart(e); }, {passive:true});
      header.addEventListener('mousedown', (e)=>{ if(e.target.closest('button')) return; onStart(e); });
    }
    handle.addEventListener("touchstart", onStart, {passive:true});
    window.addEventListener("touchmove", onMove, {passive:true});
    window.addEventListener("touchend", onEnd);
    handle.addEventListener("mousedown", onStart);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
  })();
  $("#efBio").addEventListener("input", updateEfBioCounter);
  $("#efCamBtn").addEventListener("click", ()=> { if(typeof openCamActionSheet==="function") openCamActionSheet(); else $("#avatarInput").click(); });
  $("#efUsername").addEventListener("input", ()=>{
    const input = $("#efUsername");
    input.value = input.value.toLowerCase().replace(/[^a-z0-9_]/g,"");
    const v = input.value;
    const pill = $("#efUsernamePill");
    if(!v){ pill.className = "username-status-pill"; return; }
    if(v === (profile.username||"")){
      pill.className = "username-status-pill show ok";
      pill.innerHTML = `<i class="ph ph-check"></i> @${v} is yours`;
      return;
    }
    pill.className = "username-status-pill show";
    pill.innerHTML = `<i class="ph ph-circle-notch"></i> Checking…`;
    clearTimeout(__efUserTimer);
    __efUserTimer = setTimeout(async ()=>{
      if(v.length < 3 || v.length > 20){
        pill.className = "username-status-pill show bad";
        pill.innerHTML = `<i class="ph ph-x"></i> 3–20 characters`;
        return;
      }
      try{
        const { data } = await sb.from("profiles").select("id").eq("username", v).neq("id", currentUser.id);
        if(data && data.length){
          pill.className = "username-status-pill show bad";
          pill.innerHTML = `<i class="ph ph-x"></i> Taken`;
        } else {
          pill.className = "username-status-pill show ok";
          pill.innerHTML = `<i class="ph ph-check"></i> Available`;
        }
      }catch{ pill.className = "username-status-pill"; }
    }, 500);
  });
  $("#saveChangesBtn").addEventListener("click", async ()=>{
    const btn = $("#saveChangesBtn");
    const err = $("#efError");
    if(btn.classList.contains("loading")) return;
    err.classList.remove("show");
    const name = $("#efName").value.trim();
    const uname = $("#efUsername").value.trim().toLowerCase().replace(/[^a-z0-9_]/g,"");
    const bio = $("#efBio").value.trim();
    const loc = $("#efLocation").value.trim();
    if(!name){ err.textContent = "Full name can't be empty."; err.classList.add("show"); return; }
    if(name.length > 60){ err.textContent = "Name must be 60 characters or less."; err.classList.add("show"); return; }
    if(uname && (uname.length < 3 || uname.length > 20)){
      err.textContent = "Username must be 3–20 characters."; err.classList.add("show"); return;
    }
    const updates = {};
    if(name !== (profile.full_name||"")) updates.full_name = name;
    if(uname !== (profile.username||"")) updates.username = uname || null;
    if(bio !== (profile.bio||""))        updates.bio = bio || null;
    if(loc !== (profile.location||""))   updates.location = loc || null;

    btn.classList.add("loading");
    try{
      if(Object.keys(updates).length){
        const { error } = await sb.from("profiles").update(updates).eq("id", currentUser.id);
        if(error) throw error;
        Object.assign(profile, updates);
      }
      vibrate(80);
      toast("Profile updated","good");
      renderAll();
      closeEditSection();
    }catch(e){
      err.textContent = e.message || "Save failed — please try again.";
      err.classList.add("show");
    }finally{
      btn.classList.remove("loading");
    }
  });
  // Mirror avatar upload progress ring inside the edit form
  (function mirrorUploadRing(){
    const src = document.getElementById("uploadRing");
    const dst = document.getElementById("uploadRing2");
    if(!src || !dst) return;
    const obs = new MutationObserver(()=>{
      dst.classList.toggle("show", src.classList.contains("show"));
      const sc = src.querySelector("circle"); const dc = dst.querySelector("circle");
      if(sc && dc){
        const pct = 1 - (parseFloat(sc.style.strokeDashoffset||"276.5") / 276.5);
        dc.style.strokeDashoffset = 301.6 * (1 - pct);
      }
    });
    obs.observe(src, { attributes:true, attributeFilter:["class","style"], subtree:true });
  })();

  document.getElementById("shareBtn").addEventListener("click", ()=> openShareSheet());
  // Global save listeners removed — each info-row saves independently via its own button

  async function doSave(){
    if(saving) return;
    const btn = $("#saveBtn"); btn.classList.add("loading");
    saving = true;
    try{
      const updates = {};

      // Collect bio
      const bio = $("#bioEdit").value.trim();
      if(bio !== (profile.bio||"")) updates.bio = bio || null;

      // Collect all info-row fields (name, username, location, phone)
      const rowKeys = ["full_name","username","location","phone_number"];
      document.querySelectorAll(".info-row").forEach(row => {
        const input = row.querySelector("input");
        if(!input) return;
        const head = row.querySelector(".row-label");
        if(!head) return;
        const labelText = head.textContent.trim().toLowerCase();
        let key = null;
        if(labelText.includes("name"))     key = "full_name";
        else if(labelText.includes("username")) key = "username";
        else if(labelText.includes("location")) key = "location";
        else if(labelText.includes("phone"))    key = "phone_number";
        if(!key) return;
        let v = input.value.trim();
        if(key === "username") v = v.toLowerCase().replace(/[^a-z0-9_]/g,"");
        const current = profile[key] || "";
        if(v !== current) updates[key] = v || null;
      });

      if(Object.keys(updates).length > 0){
        // Username length validation
        if(updates.username !== undefined && updates.username !== null){
          if(updates.username.length < 3 || updates.username.length > 20){
            toast("Username must be 3–20 characters","bad");
            shake(btn);
            return;
          }
        }
        const { error } = await sb.from("profiles").update(updates).eq("id", currentUser.id);
        if(error) throw error;
        Object.assign(profile, updates);
      }

      vibrate(80);
      toast("Profile saved successfully","good");
      renderAll();
      setEdit(false);
      setDirty(false);
    }catch(e){ toast("Save failed — try again","bad"); shake(btn); }
    finally{ btn.classList.remove("loading"); saving=false; }
  }
  $("#copyHandleBtn").addEventListener("click", (e)=>{
    e.stopPropagation();
    if(!profile || !profile.username) return;
    navigator.clipboard.writeText("@" + profile.username).then(()=>{
      toast("Username copied to clipboard","good");
      vibrate(30);
    }).catch(()=> toast("Copy failed","bad"));
  });
  $("#bioEdit").addEventListener("input", ()=>{ updateBioCounter(); });

  /* Dedicated Bio save button */
  $("#bioSaveBtn").addEventListener("click", async ()=>{
    const btn = $("#bioSaveBtn");
    if(btn.classList.contains("loading")) return;
    const newBio = $("#bioEdit").value.trim();
    if(newBio === (profile.bio||"")){
      toast("No changes to bio","good");
      return;
    }
    btn.classList.add("loading");
    try{
      const { error } = await sb.from("profiles").update({ bio: newBio || null }).eq("id", currentUser.id);
      if(error) throw error;
      profile.bio = newBio || null;
      const bioEl = $("#bio");
      if(newBio){ bioEl.textContent = newBio; bioEl.classList.remove("empty"); }
      else { bioEl.textContent = "Add a short bio"; bioEl.classList.add("empty"); }
      vibrate(60);
      toast("Bio saved","good");
    }catch(e){
      toast("Couldn't save bio","bad");
      shake(btn);
    }finally{
      btn.classList.remove("loading");
    }
  });
  $("#camBtn").addEventListener("click", ()=> openCamActionSheet());
  // See more / see less toggle
  document.getElementById("bioSeeMore").addEventListener("click", ()=>{
    const bio = $("#bio");
    const btn = $("#bioSeeMore");
    const expanded = bio.classList.toggle("expanded");
    btn.textContent = expanded ? "See less" : "See more";
  });
  $("#handle").addEventListener("click", ()=>{
    if($("#handle").classList.contains("empty")){ $("#editBtn").click(); }
  });
  $("#msgChip").addEventListener("click", ()=>{
    const order=["everyone","friends"];
    const cur = profile.privacy_settings.messages;
    const next = order[(order.indexOf(cur)+1)%order.length];
    savePrivacy({ messages: next });
  });
  $("#lastSeenChip").addEventListener("click", ()=>{
    const order=["everyone","friends","nobody"];
    const cur = profile.privacy_settings.show_last_seen;
    const next = order[(order.indexOf(cur)+1)%order.length];
    savePrivacy({ show_last_seen: next });
  });
  $("#phoneSwitch").addEventListener("click", ()=>{
    savePrivacy({ show_phone: !profile.privacy_settings.show_phone });
  });
  $("#signoutBtn").addEventListener("click", ()=>{
    document.getElementById("signoutOverlay").classList.add("show");
  });
  document.getElementById("signoutCancel").addEventListener("click", ()=>{
    document.getElementById("signoutOverlay").classList.remove("show");
  });
  document.getElementById("signoutConfirm").addEventListener("click", async ()=>{
    const btn = document.getElementById("signoutConfirm");
    btn.classList.add("loading"); btn.disabled = true;
    try{ await sb.from("profiles").update({ is_online:false, last_seen:new Date().toISOString() }).eq("id", currentUser.id); }catch{}
    await sb.auth.signOut();
    window.location.href = "index.html";
  });
  $("#avatarInput").addEventListener("change", async (e)=>{
    // Feature 14B: Max 3 uploads per session
    const uploadCount = parseInt(sessionStorage.getItem("avatarUploads")||"0");
    if(uploadCount >= 3){
      toast("Maximum 3 avatar uploads per session reached","bad");
      e.target.value=""; return;
    }
    const file = e.target.files[0]; if(!file) return;
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)){ toast("Use JPEG, PNG or WebP","bad"); return; }
    if(file.size > 2*1024*1024){ toast("Max 2MB","bad"); return; }
    const ring = $("#uploadRing"); ring.classList.add("show");
    const c = ring.querySelector("circle"); const total = 276.5;
    c.style.strokeDashoffset = total;
    let p=0; const tick = setInterval(()=>{ p=Math.min(p+8,90); c.style.strokeDashoffset = total*(1-p/100); }, 80);
    try{
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width=300; canvas.height=300;
      const ctx = canvas.getContext("2d");
      const size = Math.min(bitmap.width, bitmap.height);
      const sx=(bitmap.width-size)/2, sy=(bitmap.height-size)/2;
      ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, 300, 300);
      const blob = await new Promise(res=>canvas.toBlob(res,"image/jpeg",0.82));
      const path = `${currentUser.id}.jpg`;
      const { error } = await sb.storage.from("avatars").upload(path, blob, { upsert:true, contentType:"image/jpeg" });
      if(error) throw error;
      const { data: pub } = sb.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl + "?t=" + Date.now();
      await sb.from("profiles").update({ avatar_url: url }).eq("id", currentUser.id);
      profile.avatar_url = url;
      c.style.strokeDashoffset = 0;
      vibrate(80); toast("Avatar updated","good");
      // Feature 14B: track uploads
      const newCount = parseInt(sessionStorage.getItem("avatarUploads")||"0") + 1;
      sessionStorage.setItem("avatarUploads", newCount);
      if(newCount >= 3){ $("#camBtn").classList.add("limit-reached"); toast("Avatar limit reached (3/session)","warning"); }
      renderAll();
    }catch(err){ console.error(err); toast(err.message || "Upload failed","bad"); }
    finally{ clearInterval(tick); setTimeout(()=>ring.classList.remove("show"), 400); e.target.value=""; }
  });
})();

async function loadProfile(){
  try{
    const { data, error } = await sb.from("profiles").select("*").eq("id", currentUser.id).maybeSingle();
    if(error) throw error;

    if(!data){
      // No profile row — auto-create for Google/social logins
      const meta = currentUser.user_metadata || {};
      const identities = currentUser.identities || [];
      const hasGoogle = identities.some(i => i.provider === "google");
      const hasEmail  = identities.some(i => i.provider === "email");
      const newProfile = {
        id: currentUser.id,
        email: currentUser.email,
        full_name: meta.full_name || meta.name || currentUser.email.split("@")[0],
        avatar_url: meta.avatar_url || meta.picture || null,
        phone_number: null,
        is_online: true,
        last_seen: new Date().toISOString(),
        privacy_settings: { messages:"everyone", show_last_seen:"everyone", show_phone:false },
        social_links: {},
        provider: hasGoogle && hasEmail ? "both" : hasGoogle ? "google" : "email",
        google_linked: hasGoogle,
        email_linked: hasEmail,
        has_password: hasEmail
      };
      const { error: insertErr } = await sb.from("profiles").insert([newProfile]);
      if(insertErr) throw insertErr;
      profile = newProfile;
      // Seed default friend for all brand-new accounts
      seedDefaultFriend(currentUser.id).catch(e => console.warn("Seed failed:", e));
    } else {
      profile = data;
    }

    profile.social_links = profile.social_links || {};
    profile.privacy_settings = profile.privacy_settings || { messages:"everyone", show_last_seen:"everyone", show_phone:false };
    renderAll();
    await renderProviderSection();
  }catch(e){
    console.error(e);
    toast("Failed to load profile", "bad");
    throw e;
  }
}

/* ============ Provider Detection + Google Link/Unlink ============ */
async function renderProviderSection() {
  // Always re-fetch fresh identity data from Supabase auth
  const { data: { user: freshUser } } = await sb.auth.getUser();
  if (freshUser) currentUser = freshUser;

  const identities = currentUser.identities || [];
  const hasGoogle  = identities.some(i => i.provider === "google");
  const hasEmail   = identities.some(i => i.provider === "email");

  const providerBtn    = document.getElementById("googleProviderBtn");
  const providerSub    = document.getElementById("googleProviderSub");
  const managedNotice  = document.getElementById("googleManagedNotice");
  const changePassSect = document.getElementById("changePasswordSection");

  if (hasGoogle && hasEmail) {
    // Merged user — Google connected, password also exists
    providerSub.textContent = "Connected";
    providerBtn.textContent = "Unlink";
    providerBtn.className = "provider-badge connected";
    managedNotice.style.display = "none";
    changePassSect.style.display = "";
    document.getElementById("googleProviderRow").style.display = "";
    document.getElementById("providerDivider").style.display = "";
  } else if (hasGoogle && !hasEmail) {
    // Pure Google — no password
    providerSub.textContent = "Connected";
    providerBtn.textContent = "Connected";
    providerBtn.className = "provider-badge managed";
    managedNotice.style.display = "flex";
    changePassSect.style.display = "none";
    document.getElementById("googleProviderRow").style.display = "";
    document.getElementById("providerDivider").style.display = "";
  } else {
    // Pure email — hide the Google row entirely, no cross-method confusion
    document.getElementById("googleProviderRow").style.display = "none";
    document.getElementById("providerDivider").style.display = "none";
    managedNotice.style.display = "none";
    changePassSect.style.display = "";
  }

  // Replace onclick every render to keep closure fresh
  providerBtn.onclick = async () => {
    if (hasGoogle && !hasEmail) {
      // "Connected" / managed state — clicking does nothing
      toast("Password is managed by Google. Set a 9jaTalk password to change this.", "info", "Managed by Google");
      return;
    }

    if (hasGoogle && hasEmail) {
      // Unlink Google — guard: must not be last identity
      if (identities.length <= 1) {
        toast("Can't remove your only sign-in method", "bad", "Blocked");
        return;
      }
      if (!confirm("Unlink Google? You can still sign in with your password.")) return;
      try {
        const googleIdentity = identities.find(i => i.provider === "google");
        await sb.auth.unlinkIdentity(googleIdentity);
        await sb.from("profiles").update({ google_linked: false, provider: "email" }).eq("id", currentUser.id);
        toast("Google unlinked", "good", "Done");
        await renderProviderSection();
      } catch(e) {
        toast(e.message || "Failed to unlink Google", "bad", "Error");
      }
      return;
    }

    // Link Google to existing email account
    try {
      const { error } = await sb.auth.linkIdentity({ provider: "google" });
      if (error) throw error;
      // OAuth redirect will happen automatically
    } catch(e) {
      toast(e.message || "Failed to link Google", "bad", "Error");
    }
  };
}

/* ============ Render ============ */
function renderAll(){
  // avatar
  const av = $("#avatar"), init = $("#avatarInitials");
  if(profile.avatar_url){
    av.innerHTML = `<img src="${profile.avatar_url}" alt="avatar" />`;
  }else{
    av.innerHTML = `<span id="avatarInitials">${initialsOf(profile.full_name || currentUser.email)}</span>`;
  }
  if(typeof window.__refreshEfAvatar === "function") window.__refreshEfAvatar();
  // online
  $("#onlineDot").classList.toggle("show", !!profile.is_online);
  const onlineLbl = document.getElementById("onlineLabel");
  if(onlineLbl) onlineLbl.classList.toggle("show", !!profile.is_online);
  // verified
  const verified = !!(currentUser.email_confirmed_at || currentUser.confirmed_at);
  $("#verifiedBadge").classList.toggle("show", verified);
  // name & handle
  $("#displayName").textContent = profile.full_name || "Set your name";
  const handleText = $("#handleText");
  const copyBtn = $("#copyHandleBtn");
  if(profile.username){
    handleText.textContent = "@" + profile.username;
    copyBtn.style.display = "inline-grid";
    $("#handle").classList.remove("empty");
  } else {
    handleText.textContent = "Add a username";
    copyBtn.style.display = "none";
    $("#handle").classList.add("empty");
  }
  // joined date
  const joinedEl = $("#joinedDate");
  if(joinedEl && currentUser.created_at){
    const d = new Date(currentUser.created_at);
    const month = d.toLocaleString("default",{month:"long"});
    joinedEl.textContent = `Member since ${month} ${d.getFullYear()}`;
  }
  // bio
  const bio = $("#bio");
  if(profile.bio){ bio.textContent = profile.bio; bio.classList.remove("empty"); }
  else { bio.textContent = "Add a short bio"; bio.classList.add("empty"); }
  $("#bioEdit").value = profile.bio || "";
  updateBioCounter();

  // see-more: only show button if bio is long enough to be clamped
  const seeMoreBtn = $("#bioSeeMore");
  bio.classList.remove("expanded");
  seeMoreBtn.textContent = "See more";
  if(profile.bio && profile.bio.length > 80){
    seeMoreBtn.classList.add("show");
  } else {
    seeMoreBtn.classList.remove("show");
  }

  renderSocial();
  renderInfoRows();
  renderPrivacy();
  renderCompletion(false);
}

/* ============ Social Bottom Sheet ============ */
let sheetCurrentKey = null;
const socialSheetOverlay = document.getElementById("socialSheetOverlay");
const sheetInput   = document.getElementById("sheetInput");
const sheetError   = document.getElementById("sheetError");
const sheetErrMsg  = document.getElementById("sheetErrorMsg");
const sheetSaveBtn = document.getElementById("sheetSave");
const sheetRemBtn  = document.getElementById("sheetRemove");

function openSocialSheet(key){
  const cfg = SOCIAL_PLATFORMS[key];
  const linked = !!profile.social_links[key];
  const PLATFORM_NAMES = { instagram:"Instagram", x:"X (Twitter)", linkedin:"LinkedIn", tiktok:"TikTok", github:"GitHub" };
  sheetCurrentKey = key;
  // header
  const iconEl = document.getElementById("sheetIcon");
  iconEl.className = "social-sheet-platform-icon" + (linked?" linked":"");
  iconEl.innerHTML = `<i class="ph ${cfg.icon}"></i>`;
  document.getElementById("sheetTitle").textContent = PLATFORM_NAMES[key]||key;
  document.getElementById("sheetSub").textContent = linked ? "Edit or remove your link" : "Add your profile link";
  // input
  sheetInput.value = profile.social_links[key] || "";
  sheetInput.placeholder = cfg.placeholder;
  sheetError.classList.remove("show");
  // remove button visibility
  sheetRemBtn.style.display = linked ? "grid" : "none";
  socialSheetOverlay.classList.add("show");
  setTimeout(()=>sheetInput.focus(), 400);
}

function closeSocialSheet(){
  socialSheetOverlay.classList.remove("show");
  sheetCurrentKey = null;
}

socialSheetOverlay.addEventListener("click", e=>{
  if(e.target === socialSheetOverlay) closeSocialSheet();
});

document.getElementById("sheetClose").addEventListener("click", ()=>closeSocialSheet());

sheetSaveBtn.addEventListener("click", async ()=>{
  const key = sheetCurrentKey; if(!key) return;
  const v = sheetInput.value.trim();
  sheetError.classList.remove("show");
  if(!v){ sheetErrMsg.textContent="Please enter a URL"; sheetError.classList.add("show"); return; }
  try{
    const u = new URL(v);
    const cfg = SOCIAL_PLATFORMS[key];
    const domains = Array.isArray(cfg.domain)?cfg.domain:[cfg.domain];
    const ok = domains.some(d => u.hostname===d || u.hostname.endsWith("."+d));
    if(!ok) throw new Error("bad");
  }catch{ sheetErrMsg.textContent="Invalid URL for this platform"; sheetError.classList.add("show"); return; }
  sheetSaveBtn.classList.add("loading"); sheetSaveBtn.disabled=true;
  await saveSocial(key, v);
  sheetSaveBtn.classList.remove("loading"); sheetSaveBtn.disabled=false;
  closeSocialSheet();
});

sheetRemBtn.addEventListener("click", async ()=>{
  const key = sheetCurrentKey; if(!key) return;
  sheetRemBtn.disabled=true;
  await saveSocial(key, null);
  sheetRemBtn.disabled=false;
  closeSocialSheet();
});

document.getElementById("sheetPaste").addEventListener("click", ()=>{
  navigator.clipboard.readText().then(text => {
    document.getElementById("sheetInput").value = text.trim();
  }).catch(()=>{ /* silently ignore */ });
});

function renderInfoRows(){
  const rows = [
    { key:"full_name",    icon:"ph-user",    label:"Name",     value:profile.full_name },
    { key:"username",     icon:"ph-at",      label:"Username", value:profile.username },
    { key:"location",     icon:"ph-map-pin", label:"Location", value:profile.location },
    { key:"phone_number", icon:"ph-phone",   label:"Phone",    value:profile.phone_number }
  ];
  const wrap = $("#infoRows"); wrap.innerHTML = "";
  rows.forEach(r=>{
    const el = document.createElement("div");
    el.className = "info-row";
    el.innerHTML = `
      <div class="row-head">
        <div class="row-label"><i class="ph ${r.icon}"></i>${r.label}</div>
        <div class="row-value ${r.value?"":"empty"}">${r.value || "Not set"}</div>
      </div>
      <div class="expand">
        <div class="expand-inner">
          <input type="text" value="${r.value||""}" placeholder="${r.label}" />
          <button class="row-save"><i class="ph ph-check"></i> Save</button>
        </div>
        ${r.key==="username"?'<div class="username-status" id="userStatus"></div>':''}
      </div>
    `;
    el.querySelector(".row-head").addEventListener("click", ()=>{
      document.querySelectorAll(".info-row.open").forEach(x=>{ if(x!==el) x.classList.remove("open"); });
      el.classList.toggle("open");
    });
    const input = el.querySelector("input");
    if(r.key==="username"){
      // Feature 8B: inject status pill for username row
      const pill = document.createElement("div");
      pill.className = "username-status-pill";
      pill.id = "usernamePill";
      el.querySelector(".expand-inner").after(pill);
      // show current username as "yours" when edit mode is active
      setTimeout(()=>{
        if(!editMode || !profile.username) return;
        pill.className = "username-status-pill show ok";
        pill.innerHTML = `<i class="ph ph-check"></i> @${profile.username} is yours`;
      }, 300);

      let t=null;
      input.addEventListener("input", ()=>{
        input.value = input.value.toLowerCase().replace(/[^a-z0-9_]/g,"");
        setDirty(true);
        const status = el.querySelector("#userStatus");
        const v = input.value;
        if(!v){ status.classList.remove("show"); return; }
        status.className = "username-status show checking";
        status.innerHTML = `<i class="ph ph-circle-notch"></i> Checking…`;
        clearTimeout(t);
        t = setTimeout(async ()=>{
          if(v.length<3 || v.length>20){ status.className="username-status show bad"; status.innerHTML=`<i class="ph ph-x"></i> 3–20 chars`; return; }
          try{
            const { data } = await sb.from("profiles").select("id").eq("username", v).neq("id", currentUser.id);
            if(data && data.length){ status.className="username-status show bad"; status.innerHTML=`<i class="ph ph-x"></i> Taken`; }
            else{ status.className="username-status show ok"; status.innerHTML=`<i class="ph ph-check"></i> Available`; }
          }catch{ status.classList.remove("show"); }
        }, 400);
      });
    }
    el.querySelector(".row-save").addEventListener("click", async ()=>{
      let v = input.value.trim();
      if(r.key==="username"){
        v = v.toLowerCase().replace(/[^a-z0-9_]/g,"");
        if(v && (v.length<3||v.length>20)){ shake(el); toast("Username must be 3–20 chars","bad"); return; }
      }
      if(r.key==="bio" && v.length>160){ shake(el); return; }
      setDirty(true);
      await saveField(r.key, v||null);
      el.classList.remove("open");
    });
    wrap.appendChild(el);
  });
}

function renderPrivacy(){
  const ps = profile.privacy_settings;
  $("#msgChip").textContent = ps.messages==="friends"?"Friends only":"Everyone";
  const ls = {everyone:"Everyone",friends:"Friends",nobody:"Nobody"}[ps.show_last_seen] || "Everyone";
  $("#lastSeenChip").textContent = ls;
  const sw = $("#phoneSwitch"); sw.textContent = ps.show_phone ? "Visible" : "Hidden";
  $("#phoneSub").textContent = ps.show_phone?"Visible to others":"Hidden from others";
}

function calcCompletion(p){
  const fields = [
    p.avatar_url, p.username, p.bio, p.location,
    p.social_links && Object.values(p.social_links).some(v=>v)
  ];
  return Math.round((fields.filter(Boolean).length/5)*100);
}
function renderCompletion(animate){
  const pct = calcCompletion(profile);
  $("#compPct").textContent = pct;
  $("#compFill").style.width = pct+"%";
  if(pct===100 && !reachedFull){ reachedFull = true; confetti(); }
}
function confetti(){
  const wrap = document.createElement("div"); wrap.className="confetti";
  const colors = ["#1d4ed8","#3b82f6","#60a5fa","#22c55e","#f59e0b","#ef4444"];
  for(let i=0;i<20;i++){
    const s = document.createElement("span");
    s.style.background = colors[i%colors.length];
    s.style.left = (Math.random()*100)+"%";
    s.style.top = "20%";
    s.style.animationDelay = (Math.random()*.3)+"s";
    s.style.transform = `translateX(${(Math.random()-.5)*200}px)`;
    wrap.appendChild(s);
  }
  document.body.appendChild(wrap);
  setTimeout(()=>wrap.remove(), 1500);
}

/* ============ Bio counter (Feature 11C — arc removed, text counter only) ============ */
function updateBioCounter(){
  const v = $("#bioEdit").value;
  const c = $("#bioCounter");
  c.textContent = `${v.length} / 160`;
  c.classList.remove("warn","bad");
  if(v.length>=155) c.classList.add("bad");
  else if(v.length>=140) c.classList.add("warn");
}

/* ============ Save ops ============ */
async function saveField(field, value){
  if(!navigator.onLine){ toast("You're offline","bad"); return; }
  try{
    const { error } = await sb.from("profiles").update({ [field]:value }).eq("id", currentUser.id);
    if(error) throw error;
    profile[field] = value;
    vibrate(40);
    const labels = { full_name:"Name", username:"Username", location:"Location", phone_number:"Phone number" };
    toast((labels[field]||"Field") + " updated successfully","good");
    renderAll();
  }catch(e){ console.error(e); toast("Save failed — try again","bad"); }
}
async function saveSocial(key, url){
  const next = { ...(profile.social_links||{}), [key]: url };
  try{
    const { error } = await sb.from("profiles").update({ social_links: next }).eq("id", currentUser.id);
    if(error) throw error;
    profile.social_links = next;
    vibrate(40);
    toast(url?"Link saved":"Link removed","good");
    renderSocial();
    renderCompletion(true);
  }catch{ toast("Failed to save link","bad"); }
}
async function savePrivacy(patch){
  const next = { ...profile.privacy_settings, ...patch };
  try{
    const { error } = await sb.from("profiles").update({ privacy_settings: next }).eq("id", currentUser.id);
    if(error) throw error;
    profile.privacy_settings = next;
    vibrate(40);
    toast("Privacy setting updated","good");
    renderPrivacy();
  }catch{ toast("Privacy update failed","bad"); renderPrivacy(); }
}

/* ============ Edit mode ============ */
function setEdit(on){
  editMode = on;
  document.body.classList.toggle("edit-mode", on);
  if(!on){
    document.querySelectorAll(".info-row.open,.social-edit-panel.open").forEach(x=>x.classList.remove("open"));
    setDirty(false);
  }
}

/* Dirty state banner removed — kept as no-op so existing callers don't break */
function setDirty(isDirty){
  window.__efIsDirty = !!isDirty;
  const btn = document.getElementById("saveChangesBtn");
  if(btn) btn.classList.toggle("dirty", window.__efIsDirty);
  if(!window.__efIsDirty){
    const b = document.getElementById("unsavedBanner");
    if(b) b.classList.remove("show");
  }
}

/* ============ Change Password ============ */
(function(){
  const row    = document.getElementById("chpassRow");
  const panel  = document.getElementById("chpassPanel");
  const caret  = document.getElementById("chpassCaret");
  const cpBtn  = document.getElementById("cpBtn");
  const cpErr  = document.getElementById("cpError");
  const cpNew  = document.getElementById("cp_new");
  const strFill= document.getElementById("cpStrFill");
  const strLbl = document.getElementById("cpStrLabel");

  // Toggle panel
  row.addEventListener("click", ()=>{
    const open = panel.classList.toggle("open");
    caret.classList.toggle("open", open);
  });

  // Password strength
  function strength(pwd){
    let s=0;
    if(pwd.length>=8) s++;
    if(/[A-Z]/.test(pwd)) s++;
    if(/[0-9]/.test(pwd)) s++;
    if(/[^A-Za-z0-9]/.test(pwd)) s++;
    if(pwd.length>=12) s++;
    return s;
  }
  cpNew.addEventListener("input", ()=>{
    const s = strength(cpNew.value);
    const pct    = [0,20,40,60,80,100][s];
    const colors = ["#eef2fa","#ef4444","#f59e0b","#eab308","#22c55e","#16a34a"];
    const labels = ["","Too weak","Weak","Fair","Strong","Very strong"];
    strFill.style.width = pct+"%";
    strFill.style.background = colors[s];
    strLbl.textContent = labels[s];
    strLbl.style.color = colors[s];
  });

  // Peek toggles
  panel.querySelectorAll(".chpass-peek").forEach(btn=>{
    btn.addEventListener("pointerdown", ()=>{
      const inp = document.getElementById(btn.dataset.peek);
      if(inp) inp.type="text";
    });
    btn.addEventListener("pointerup", ()=>{
      const inp = document.getElementById(btn.dataset.peek);
      if(inp) inp.type="password";
    });
  });

  // Submit
  cpBtn.addEventListener("click", async ()=>{
    const current = document.getElementById("cp_current").value;
    const newPass = cpNew.value;
    const confirm = document.getElementById("cp_confirm").value;

    cpErr.classList.remove("show");

    if(!current){ cpErr.textContent="Enter your current password"; cpErr.classList.add("show"); return; }
    if(newPass.length < 8){ cpErr.textContent="New password must be at least 8 characters"; cpErr.classList.add("show"); return; }
    if(newPass !== confirm){ cpErr.textContent="Passwords do not match"; cpErr.classList.add("show"); return; }

    cpBtn.classList.add("loading"); cpBtn.disabled=true;

    try{
      // Re-authenticate with current password first
      const { error: signInErr } = await sb.auth.signInWithPassword({
        email: currentUser.email,
        password: current
      });
      if(signInErr) throw new Error("Current password is incorrect");

      // Now update to new password
      const { error: updateErr } = await sb.auth.updateUser({ password: newPass });
      if(updateErr) throw updateErr;

      toast("Password updated successfully", "good");
      // Clear fields and close panel
      document.getElementById("cp_current").value="";
      cpNew.value=""; document.getElementById("cp_confirm").value="";
      strFill.style.width="0%"; strLbl.textContent="";
      panel.classList.remove("open"); caret.classList.remove("open");
    }catch(e){
      cpErr.textContent = e.message || "Failed to update password";
      cpErr.classList.add("show");
    }finally{
      cpBtn.classList.remove("loading"); cpBtn.disabled=false;
    }
  });
})();


/* ============ Recovery Modal Logic ============ */
(function(){
  const overlay   = document.getElementById("recoveryOverlay");
  const recNew    = document.getElementById("rec_new");
  const recConf   = document.getElementById("rec_confirm");
  const recBtn    = document.getElementById("recBtn");
  const recErr    = document.getElementById("recError");
  const recErrMsg = document.getElementById("recErrorMsg");
  const strFill   = document.getElementById("recStrFill");
  const strLbl    = document.getElementById("recStrLabel");
  const formEl    = document.getElementById("recoveryForm");
  const successEl = document.getElementById("recoverySuccess");

  function strength(pwd){
    let s=0;
    if(pwd.length>=8) s++;
    if(/[A-Z]/.test(pwd)) s++;
    if(/[0-9]/.test(pwd)) s++;
    if(/[^A-Za-z0-9]/.test(pwd)) s++;
    if(pwd.length>=12) s++;
    return s;
  }

  recNew.addEventListener("input", ()=>{
    const s = strength(recNew.value);
    const pct    = [0,20,40,60,80,100][s];
    const colors = ["#eef2fa","#ef4444","#f59e0b","#eab308","#22c55e","#16a34a"];
    const labels = ["","Too weak","Weak","Fair","Strong","Very strong"];
    strFill.style.width   = pct+"%";
    strFill.style.background = colors[s];
    strLbl.textContent    = labels[s];
    strLbl.style.color    = colors[s];
  });

  // Peek toggles
  overlay.querySelectorAll(".recovery-peek").forEach(btn=>{
    btn.addEventListener("pointerdown", ()=>{
      const inp = document.getElementById(btn.dataset.peek);
      if(inp) inp.type = "text";
    });
    btn.addEventListener("pointerup", ()=>{
      const inp = document.getElementById(btn.dataset.peek);
      if(inp) inp.type = "password";
    });
  });

  function showError(msg){
    recErrMsg.textContent = msg;
    recErr.classList.add("show");
  }
  function clearError(){ recErr.classList.remove("show"); }

  recBtn.addEventListener("click", async ()=>{
    clearError();
    const newPass = recNew.value;
    const confirm = recConf.value;

    if(newPass.length < 8)     { showError("Password must be at least 8 characters"); return; }
    if(strength(newPass) < 2)  { showError("Password is too weak — add numbers or symbols"); return; }
    if(newPass !== confirm)    { showError("Passwords do not match"); return; }

    recBtn.classList.add("loading"); recBtn.disabled = true;

    try{
      const { error } = await sb.auth.updateUser({ password: newPass });
      if(error) throw error;

      // Show success state
      formEl.style.display = "none";
      successEl.classList.add("show");
      vibrate(60);

      // Auto-dismiss after 2.5s
      setTimeout(()=>{
        overlay.classList.remove("show");
        isRecoveryFlow = false;
      }, 2500);

    }catch(e){
      showError(e.message || "Failed to update password — try again");
    }finally{
      recBtn.classList.remove("loading"); recBtn.disabled = false;
    }
  });
})();

async function setOnline(on){
  try{ await sb.from("profiles").update({ is_online:on, last_seen:new Date().toISOString() }).eq("id", currentUser.id); }catch{}
}
function startHeartbeat(){
  clearInterval(heartbeatInt);
  heartbeatInt = setInterval(async ()=>{
    const { data } = await sb.auth.getSession();
    if(!data.session) return;
    setOnline(true);
  }, 30000);
}
async function onVisibility(){
  if(document.hidden){ clearInterval(heartbeatInt); await setOnline(false); }
  else{ await setOnline(true); startHeartbeat(); }
}

/* ============ FEATURE 3: Stats (Followers / Following / Mutuals) ============ */
async function loadStats(){
  if(!currentUser) return;
  try{
    const { count: followers } = await sb.from("follows")
      .select("*", { count:"exact", head:true })
      .eq("following_id", currentUser.id);
    const { count: following } = await sb.from("follows")
      .select("*", { count:"exact", head:true })
      .eq("follower_id", currentUser.id);
    // Mutuals = people I follow who also follow me
    const { count: mutuals } = await sb.from("follows").select("*", { count:"exact", head:true })
      .eq("follower_id", currentUser.id).eq("is_mutual", true);

    document.getElementById("statFollowers").textContent = followers || 0;
    document.getElementById("statFollowing").textContent = following || 0;
    document.getElementById("statMutuals").textContent   = mutuals  || 0;
  }catch{
    // Table may not exist yet — silently leave zeroes
  }
}

/* ============ FEATURE 1: Blocked Users ============ */
let blockedUsers = [];

async function loadBlockedUsers(){
  try{
    const { data, error } = await sb.from("blocked_users")
      .select("blocked_id, profiles:blocked_id(full_name, username, avatar_url)")
      .eq("blocker_id", currentUser.id);
    if(error) throw error;
    blockedUsers = data || [];
  }catch(e){
    // Fallback: fetch blocked_ids only, then fetch profiles separately
    try{
      const { data: ids } = await sb.from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", currentUser.id);
      if(ids && ids.length){
        const { data: profiles } = await sb.from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", ids.map(r=>r.blocked_id));
        blockedUsers = (ids||[]).map(r=>({
          blocked_id: r.blocked_id,
          profiles: (profiles||[]).find(p=>p.id===r.blocked_id)||{}
        }));
      } else {
        blockedUsers = [];
      }
    }catch{ blockedUsers = []; }
  }

  const label = document.getElementById("blockedCountLabel");
  const list  = document.getElementById("blockedList");
  const n = blockedUsers.length;
  label.textContent = n === 0 ? "No blocked users" : `${n} blocked user${n>1?"s":""}`;

  if(n === 0){
    list.innerHTML = `<div class="blocked-empty"><i class="ph ph-prohibit"></i><p>You haven't blocked anyone.</p></div>`;
    return;
  }
  list.innerHTML = blockedUsers.map(b => {
    const p = b.profiles || {};
    const name = p.full_name || "Unknown";
    const handle = p.username ? "@"+p.username : "";
    const initials = name.trim().split(/\s+/).slice(0,2).map(s=>s[0].toUpperCase()).join("");
    const avatarHtml = p.avatar_url
      ? `<img src="${p.avatar_url}" alt="${name}">`
      : initials;
    return `<div class="blocked-user-row">
      <div class="blocked-avatar">${avatarHtml}</div>
      <div class="blocked-user-info">
        <div class="blocked-user-name">${name}</div>
        ${handle ? `<div class="blocked-user-handle">${handle}</div>` : ""}
      </div>
      <button class="unblock-btn" data-id="${b.blocked_id}">Unblock</button>
    </div>`;
  }).join("");

  list.querySelectorAll(".unblock-btn").forEach(btn => {
    btn.addEventListener("click", async ()=>{
      const id = btn.dataset.id;
      btn.textContent = "…"; btn.disabled = true;
      try{
        await sb.from("blocked_users")
          .delete().eq("blocker_id", currentUser.id).eq("blocked_id", id);
        await loadBlockedUsers();
        vibrate(40);
      }catch{
        btn.textContent = "Unblock"; btn.disabled = false;
      }
    });
  });
}

// Blocked sheet open/close
document.getElementById("blockedUsersRow").addEventListener("click", async ()=>{
  await loadBlockedUsers();
  document.getElementById("blockedSheetOverlay").classList.add("show");
});
document.getElementById("blockedSheetClose").addEventListener("click", ()=>{
  document.getElementById("blockedSheetOverlay").classList.remove("show");
});
document.getElementById("blockedSheetOverlay").addEventListener("click", e=>{
  if(e.target === e.currentTarget) e.currentTarget.classList.remove("show");
});

/* ============ Delete Account (reason → Formspree → 24h notice) ============ */
(function(){
  const FORMSPREE_URL = "https://formspree.io/f/mblnekvp";
  const overlay    = document.getElementById("deleteOverlay");
  const sheet      = document.getElementById("deleteReasonSheet");
  const confirmBtn = document.getElementById("deleteConfirmBtn");
  const cancelBtn  = document.getElementById("deleteCancelBtn");
  const closeBtn   = document.getElementById("deleteCloseBtn");
  const note       = document.getElementById("deleteReasonNote");
  const reasonList = document.getElementById("deleteReasonList");
  const validation = document.getElementById("deleteRequestValidation");
  const submitLabel = confirmBtn.querySelector(".delete-submit-label");
  const defaultSubmitLabel = "Send deletion request";
  let selectedReason = null;
  let returnFocusTo = null;

  function reset(){
    selectedReason = null;
    note.value = "";
    confirmBtn.disabled = true;
    confirmBtn.classList.remove("loading");
    submitLabel.textContent = defaultSubmitLabel;
    reasonList.querySelectorAll(".delete-reason-option").forEach(button=>{
      button.classList.remove("selected");
      button.setAttribute("aria-pressed","false");
    });
  }
  function refreshState(){
    const hasReason = !!selectedReason;
    const hasNote = note.value.trim().length >= 4;
    confirmBtn.disabled = !hasReason && !hasNote;
    validation.textContent = hasReason
      ? "Reason selected. Your account stays active while the request is reviewed."
      : hasNote
        ? "Your note is ready to send as the deletion reason."
        : "Select a reason or add at least 4 characters in the optional note to continue.";
  }
  function closeDialog(){
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden","true");
    document.body.classList.remove("delete-request-open");
    reset();
    if(returnFocusTo && returnFocusTo.isConnected) returnFocusTo.focus();
  }

  document.getElementById("deleteAccountBtn")
    .addEventListener("click", event => {
      returnFocusTo = event.currentTarget;
      reset();
      overlay.setAttribute("aria-hidden","false");
      overlay.classList.add("show");
      document.body.classList.add("delete-request-open");
      requestAnimationFrame(()=>sheet.focus());
    });

  reasonList.addEventListener("click", e => {
    const btn = e.target.closest(".delete-reason-option");
    if(!btn) return;
    reasonList.querySelectorAll(".delete-reason-option").forEach(button=>{
      button.classList.remove("selected");
      button.setAttribute("aria-pressed","false");
    });
    btn.classList.add("selected");
    btn.setAttribute("aria-pressed","true");
    selectedReason = btn.dataset.reason;
    refreshState();
  });

  note.addEventListener("input", refreshState);
  cancelBtn.addEventListener("click", closeDialog);
  closeBtn.addEventListener("click", closeDialog);
  overlay.addEventListener("click", e => {
    if(e.target === e.currentTarget) closeDialog();
  });
  document.addEventListener("keydown",e=>{
    if(!overlay.classList.contains("show")) return;
    if(e.key==="Escape"){
      e.preventDefault();
      closeDialog();
      return;
    }
    if(e.key==="Tab"){
      const focusable = [...sheet.querySelectorAll('button:not(:disabled),textarea')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if(e.shiftKey && (document.activeElement===first || document.activeElement===sheet)){
        e.preventDefault();
        last.focus();
      }else if(!e.shiftKey && document.activeElement===last){
        e.preventDefault();
        first.focus();
      }
    }
  });

  confirmBtn.addEventListener("click", async () => {
    if(confirmBtn.disabled) return;
    confirmBtn.classList.add("loading");
    confirmBtn.disabled = true;
    submitLabel.textContent = "Sending request…";
    try {
      const u = (typeof currentUser !== "undefined" && currentUser)
        ? currentUser : {};
      const p = (typeof myProfile !== "undefined" && myProfile)
        ? myProfile : {};
      const payload = {
        _subject: "🚨 9jaTalk — Account Deletion Request",
        request_type: "account_deletion",
        user_id:      u.id || "",
        email:        u.email || p.email || "",
        username:     p.username || "",
        display_name: p.display_name || p.full_name || "",
        phone:        p.phone || u.phone || "",
        created_at:   u.created_at || "",
        reason:       selectedReason || "(not selected)",
        clarification: note.value.trim() || "",
        submitted_at: new Date().toISOString(),
        user_agent:   navigator.userAgent,
      };
      const res = await fetch(FORMSPREE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
      });
      if(!res.ok) throw new Error("formspree " + res.status);
      closeDialog();
      if(typeof showToast === "function"){
        showToast(
          "Request received",
          "Your account will be deleted within 24 hours. " +
          "You can keep using it until then.",
          "good"
        );
      } else if(typeof toast === "function"){
        toast("Your account will be deleted within 24 hours");
      }
    } catch(e) {
      console.error("delete request", e);
      confirmBtn.classList.remove("loading");
      submitLabel.textContent = defaultSubmitLabel;
      refreshState();
      if(typeof showToast === "function")
        showToast("Couldn't submit",
          "Please try again or contact support.", "bad");
      else if(typeof toast === "function")
        toast("Couldn't submit request", "bad");
    }
  });
})();

/* ============ Theme Toggle ============ */
(function(){
  const btn  = document.getElementById("themeToggle");
  const icon = document.getElementById("themeIcon");
  const html = document.documentElement;

  function applyTheme(dark){
    if(dark){
      html.setAttribute("data-theme","dark");
      icon.className = "ph ph-sun";
    } else {
      html.removeAttribute("data-theme");
      icon.className = "ph ph-moon";
    }
  }

  const saved = localStorage.getItem("nova-theme");
  applyTheme(saved === "dark");

  btn.addEventListener("click", ()=>{
    const isDark = html.getAttribute("data-theme") === "dark";
    applyTheme(!isDark);
    localStorage.setItem("nova-theme", !isDark ? "dark" : "light");
    btn.classList.remove("shaking");
    void btn.offsetWidth;
    btn.classList.add("shaking");
    setTimeout(()=> btn.classList.remove("shaking"), 400);
  });
})();

/* ============================================================
   NEW FEATURES JS
   ============================================================ */

/* ---- Feature 3A: QR Code Share Sheet ---- */
let qrGenerated = false;
function openShareSheet(){
  document.getElementById("shareSheetOverlay").classList.add("show");
  if(!qrGenerated){
    const box = document.getElementById("shareQrBox");
    box.innerHTML = ""; // clear any leftover canvas/img from prior attempts
    const url = profile && profile.username
      ? `${window.location.origin}/profile.html?u=${profile.username}`
      : window.location.href;
    try{
      new QRCode(box, {
        text: url,
        width: 156,
        height: 156,
        colorDark: "#0b1b3a",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
      qrGenerated = true;
    }catch(e){ console.error("QR gen failed", e); }
  }
}
document.getElementById("shareSheetClose").addEventListener("click", ()=>{
  document.getElementById("shareSheetOverlay").classList.remove("show");
});
document.getElementById("shareSheetOverlay").addEventListener("click", e=>{
  if(e.target === e.currentTarget) e.currentTarget.classList.remove("show");
});
document.getElementById("shareCopyLink").addEventListener("click", ()=>{
  navigator.clipboard.writeText(window.location.href)
    .then(()=>{ toast("Profile link copied!","good"); vibrate(30); })
    .catch(()=> toast("Could not copy link","bad"));
});
document.getElementById("shareDownloadQr").addEventListener("click", ()=>{
  const box = document.getElementById("shareQrBox");
  const img = box.querySelector("img") || box.querySelector("canvas");
  if(!img){ toast("QR not ready","bad"); return; }
  const a = document.createElement("a");
  if(img.tagName === "CANVAS"){
    a.href = img.toDataURL("image/png");
  } else {
    a.href = img.src;
  }
  a.download = "9jatalk-profile-qr.png";
  a.click();
  toast("QR downloaded!","good");
});

/* ---- Feature 5B: Avatar Frames ---- */
let currentFrame = localStorage.getItem("nova-avatar-frame") || "none";
function applyFrame(frame){
  const el = document.getElementById("avatarFrame");
  el.className = "avatar-frame frame-" + frame;
  currentFrame = frame;
  localStorage.setItem("nova-avatar-frame", frame);
  // update selected state in picker
  document.querySelectorAll(".frame-option").forEach(o=>{
    o.classList.toggle("selected", o.dataset.frame === frame);
  });
}
// Apply saved frame on load
document.addEventListener("DOMContentLoaded", ()=> applyFrame(currentFrame));
setTimeout(()=> applyFrame(currentFrame), 500);

function openCamActionSheet(){
  const overlay = document.getElementById("camActionOverlay");
  document.getElementById("framePickerWrap").style.display = "none";
  // Mark current frame as selected
  document.querySelectorAll(".frame-option").forEach(o=>{
    o.classList.toggle("selected", o.dataset.frame === currentFrame);
  });
  overlay.classList.add("show");
}
document.getElementById("camActionCancel").addEventListener("click", ()=>{
  document.getElementById("camActionOverlay").classList.remove("show");
});
document.getElementById("camActionOverlay").addEventListener("click", e=>{
  if(e.target === e.currentTarget) e.currentTarget.classList.remove("show");
});
document.getElementById("camChangePhoto").addEventListener("click", ()=>{
  document.getElementById("camActionOverlay").classList.remove("show");
  setTimeout(()=> document.getElementById("avatarInput").click(), 200);
});
document.getElementById("camChangeFrame").addEventListener("click", ()=>{
  const wrap = document.getElementById("framePickerWrap");
  wrap.style.display = wrap.style.display === "none" ? "block" : "none";
});
document.querySelectorAll(".frame-option").forEach(opt=>{
  opt.addEventListener("click", ()=>{
    applyFrame(opt.dataset.frame);
    vibrate(30);
    setTimeout(()=> document.getElementById("camActionOverlay").classList.remove("show"), 300);
  });
});

/* ---- Feature 7B: Completion Tooltip ---- */
(function(){
  const strip = document.getElementById("completionStrip");
  const TIPS = {
    avatar_url:   "📷 Add a profile photo",
    username:     "🏷️ Set a username",
    bio:          "✍️ Write a bio",
    location:     "📍 Add your location",
    social_links: "🔗 Link a social account"
  };
  strip.addEventListener("click", ()=>{
    if(!profile) return;
    let existing = strip.querySelector(".completion-tooltip");
    if(existing){ existing.classList.toggle("show"); return; }

    const missing = [];
    if(!profile.avatar_url) missing.push(TIPS.avatar_url);
    if(!profile.username)   missing.push(TIPS.username);
    if(!profile.bio)        missing.push(TIPS.bio);
    if(!profile.location)   missing.push(TIPS.location);
    if(!profile.social_links || !Object.values(profile.social_links).some(v=>v)) missing.push(TIPS.social_links);

    const tip = document.createElement("div");
    tip.className = "completion-tooltip";
    tip.textContent = missing.length ? missing[0] : "🎉 Profile complete!";
    strip.appendChild(tip);
    requestAnimationFrame(()=> tip.classList.add("show"));
    setTimeout(()=>{ tip.classList.remove("show"); setTimeout(()=>tip.remove(),250); }, 3000);
  });
})();

/* ---- Feature 8B: Username status pill — injected directly in renderInfoRows above ---- */
// (pill logic has been merged into renderInfoRows to avoid JS hoisting conflicts)

/* ---- Feature 9B: Social link tap action ---- */
function renderSocial(){
  if(!profile) return;
  profile.social_links = profile.social_links || {};
  const PLATFORM_NAMES = { instagram:"Instagram", x:"X", linkedin:"LinkedIn", tiktok:"TikTok", github:"GitHub" };
  const containers = ["socialPills","efSocialPills"].map(id=>document.getElementById(id)).filter(Boolean);
  let linkedCount = 0;
  containers.forEach((c,ci)=>{
    c.innerHTML = "";
    Object.entries(SOCIAL_PLATFORMS).forEach(([key,cfg])=>{
      const linked = !!profile.social_links[key];
      if(linked && ci===0) linkedCount++;
      const pill = document.createElement("div");
      pill.className = "social-pill" + (linked?" linked":"");
      pill.innerHTML = `
        <div class="social-pill-icon"><i class="ph ${cfg.icon}"></i></div>
        <span class="social-pill-label">${PLATFORM_NAMES[key]||key}</span>
      `;
      pill.addEventListener("click", ()=>{
        const inEditSheet = document.body.classList.contains("edit-view-open");
        const isEditPill = (ci === 1);
        if(inEditSheet || isEditPill){
          if(linked){ showSocialActionSheet(key, profile.social_links[key]); }
          else { openSocialSheet(key); }
          return;
        }
        if(linked){
          const url = profile.social_links[key];
          try{ window.open(url, "_blank", "noopener,noreferrer"); }
          catch{ toast("Couldn't open link","bad"); }
        } else {
          toast("Tap Edit Profile to add this link","bad");
          vibrate(40);
        }
      });
      c.appendChild(pill);
    });
  });
  const cnt = document.getElementById("socialLinkedCount");
  if(cnt) cnt.textContent = linkedCount;
}

// Social link action sheet (Feature 9B)
let _socialActionKey = null;
let _socialActionUrl = null;
(function(){
  // Create action sheet on the fly
  const overlay = document.createElement("div");
  overlay.id = "socialActionOverlay";
  overlay.style.cssText = `position:fixed;inset:0;z-index:450;background:rgba(11,27,58,.45);backdrop-filter:blur(8px);opacity:0;pointer-events:none;transition:opacity .25s ease;`;
  const sheet = document.createElement("div");
  sheet.id = "socialActionSheet";
  sheet.style.cssText = `position:fixed;bottom:0;left:50%;transform:translateX(-50%) translateY(100%);width:min(100vw,480px);background:var(--card);border-radius:24px 24px 0 0;padding:0 16px calc(24px + env(safe-area-inset-bottom,0px));box-shadow:0 -8px 40px rgba(0,0,0,.15);transition:transform .38s cubic-bezier(.34,1.4,.64,1);z-index:451;`;
  sheet.innerHTML = `
    <div style="width:36px;height:4px;border-radius:999px;background:var(--line);margin:12px auto 16px;"></div>
    <div id="socialActionTitle" style="font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;padding:0 4px;"></div>
    <button id="socialActionOpen" style="width:100%;height:52px;border-radius:16px;display:flex;align-items:center;gap:14px;padding:0 16px;font-size:15px;font-weight:600;color:var(--ink);background:transparent;transition:background .2s;margin-bottom:4px;font-family:'Poppins',sans-serif;border:none;cursor:pointer;">
      <i class="ph ph-arrow-square-out" style="font-size:22px;color:var(--brand);width:26px;text-align:center;"></i> Open Link
    </button>
    <button id="socialActionEdit" style="width:100%;height:52px;border-radius:16px;display:flex;align-items:center;gap:14px;padding:0 16px;font-size:15px;font-weight:600;color:var(--ink);background:transparent;transition:background .2s;margin-bottom:4px;font-family:'Poppins',sans-serif;border:none;cursor:pointer;">
      <i class="ph ph-pencil-simple" style="font-size:22px;color:var(--brand);width:26px;text-align:center;"></i> Edit Link
    </button>
    <button id="socialActionCancel" style="width:100%;height:50px;border-radius:16px;margin-top:6px;background:var(--surface);border:1.5px solid var(--line);color:var(--ink-soft);font-size:15px;font-weight:700;font-family:'Poppins',sans-serif;cursor:pointer;transition:background .2s;">Cancel</button>
  `;
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", e=>{ if(e.target===overlay) closeSocialAction(); });
  document.getElementById("socialActionCancel").addEventListener("click", closeSocialAction);
  document.getElementById("socialActionOpen").addEventListener("click", ()=>{
    if(_socialActionUrl) window.open(_socialActionUrl,"_blank","noopener");
    closeSocialAction();
  });
  document.getElementById("socialActionEdit").addEventListener("click", ()=>{
    closeSocialAction();
    setTimeout(()=> openSocialSheet(_socialActionKey), 200);
  });
})();

function showSocialActionSheet(key, url){
  _socialActionKey = key; _socialActionUrl = url;
  const PLATFORM_NAMES = { instagram:"Instagram", x:"X (Twitter)", linkedin:"LinkedIn", tiktok:"TikTok", github:"GitHub" };
  document.getElementById("socialActionTitle").textContent = PLATFORM_NAMES[key] || key;
  const overlay = document.getElementById("socialActionOverlay");
  const sheet   = document.getElementById("socialActionSheet");
  overlay.style.opacity = "0"; overlay.style.pointerEvents = "none";
  sheet.style.transform = "translateX(-50%) translateY(100%)";
  overlay.style.display = "block";
  requestAnimationFrame(()=>{
    overlay.style.opacity = "1"; overlay.style.pointerEvents = "auto";
    sheet.style.transform = "translateX(-50%) translateY(0)";
  });
}
function closeSocialAction(){
  const overlay = document.getElementById("socialActionOverlay");
  const sheet   = document.getElementById("socialActionSheet");
  overlay.style.opacity = "0"; overlay.style.pointerEvents = "none";
  sheet.style.transform = "translateX(-50%) translateY(100%)";
}

/* ============================================================
   ONBOARDING — Default Friend Seeder
   Runs exactly once per new account (guarded by localStorage).
   1. Looks up Mujahid's account by email
   2. Creates mutual follows (new user ↔ Mujahid)
   3. Sends two warm welcome messages after a short delay
   ============================================================ */
async function seedDefaultFriend(newUserId) {
  const SEED_KEY = "nova_seeded_v1";

  // Guard: only run once, ever
  if (localStorage.getItem(SEED_KEY)) return;
  localStorage.setItem(SEED_KEY, "1");

  const ADMIN_EMAIL = "mujaheedd777@gmail.com";
  const WELCOME_MESSAGES = [
    "👋 Hey! Welcome to 9jaTalk! I'm Mujahid, the founder. So glad you're here!",
    "Feel free to explore, discover people, and start chatting. If you ever need anything just message me anytime 😊🚀"
  ];

  try {
    // Step 1 — find admin account by email via profiles table
    const { data: adminProfile, error: findErr } = await sb
      .from("profiles")
      .select("id")
      .eq("email", ADMIN_EMAIL)
      .maybeSingle();

    if (findErr || !adminProfile) {
      console.warn("seedDefaultFriend: admin profile not found", findErr);
      return;
    }

    const adminId = adminProfile.id;

    // Don't seed if new user IS the admin
    if (adminId === newUserId) return;

    // Step 2 — mutual follows (ignore conflicts if already exists)
    await sb.from("follows").upsert(
      { follower_id: newUserId, following_id: adminId },
      { onConflict: "follower_id,following_id" }
    );
    await sb.from("follows").upsert(
      { follower_id: adminId, following_id: newUserId },
      { onConflict: "follower_id,following_id" }
    );

    // Step 3 — send first welcome message after 3 seconds
    setTimeout(async () => {
      try {
        await sb.from("messages").insert({
          sender_id: adminId,
          receiver_id: newUserId,
          content: WELCOME_MESSAGES[0],
          type: "text",
          is_read: false,
        });
      } catch(e) { console.warn("seedDefaultFriend: msg1 failed", e); }
    }, 3000);

    // Step 4 — send second message after 7 seconds (feels like real typing)
    setTimeout(async () => {
      try {
        await sb.from("messages").insert({
          sender_id: adminId,
          receiver_id: newUserId,
          content: WELCOME_MESSAGES[1],
          type: "text",
          is_read: false,
        });
      } catch(e) { console.warn("seedDefaultFriend: msg2 failed", e); }
    }, 7000);

  } catch(e) {
    console.warn("seedDefaultFriend: unexpected error", e);
  }
}


/* ============ Collapsible Tip Cards ============ */
(function initTipCards(){
  document.querySelectorAll(".tip-card .tip-card-head").forEach(head => {
    head.addEventListener("click", () => {
      head.parentElement.classList.toggle("open");
    });
  });
})();

/* ============ First-time Onboarding Flashcards ============ */
const ONB_KEY = "novachat_onboarded_v1";
const ONB_STEPS = [
  { icon:"ph-hand-waving",    title:"Welcome to 9jaTalk", desc:"Quick tour to help you get the most out of your profile." },
  { icon:"ph-user-circle",    title:"Complete Your Profile", desc:"Tap Edit Profile to add your name, username, photo, and bio." },
  { icon:"ph-share-network",  title:"Link Your Socials",  desc:"Connect Instagram, GitHub and more so friends can find you." },
  { icon:"ph-shield-check",   title:"Control Your Privacy", desc:"Choose who can message you and what others can see." },
  { icon:"ph-palette",        title:"Make It Yours",      desc:"Switch theme and language anytime from the top bar." }
];
let onbIndex = 0;

function renderOnbStep(){
  const s = ONB_STEPS[onbIndex];
  const icon = document.getElementById("onbIcon");
  icon.className = "ph " + s.icon;
  document.getElementById("onbTitle").textContent = s.title;
  document.getElementById("onbDesc").textContent  = s.desc;
  const dotsWrap = document.getElementById("onbDots");
  dotsWrap.innerHTML = ONB_STEPS.map((_,i)=>`<span class="onb-dot${i===onbIndex?' active':''}"></span>`).join("");
  document.getElementById("onbPrev").disabled = onbIndex === 0;
  const nextBtn = document.getElementById("onbNext");
  if(onbIndex === ONB_STEPS.length - 1){
    nextBtn.innerHTML = `Finish <i class="ph ph-check"></i>`;
  } else {
    nextBtn.innerHTML = `Next <i class="ph ph-arrow-right"></i>`;
  }
}
function closeOnb(){
  document.getElementById("onbOverlay").classList.remove("show");
  try{ localStorage.setItem(ONB_KEY, "1"); }catch(e){}
}
function openOnb(){
  onbIndex = 0;
  renderOnbStep();
  document.getElementById("onbOverlay").classList.add("show");
}
document.getElementById("onbPrev").addEventListener("click", ()=>{
  if(onbIndex > 0){ onbIndex--; renderOnbStep(); }
});
document.getElementById("onbNext").addEventListener("click", ()=>{
  if(onbIndex < ONB_STEPS.length - 1){ onbIndex++; renderOnbStep(); }
  else { closeOnb(); }
});
document.getElementById("onbEnd").addEventListener("click", closeOnb);

function maybeShowOnboarding(){
  try{
    if(localStorage.getItem(ONB_KEY)) return;
  }catch(e){ return; }
  // Only for genuinely new accounts (created in the last 10 minutes)
  if(!currentUser || !currentUser.created_at) return;
  const ageMs = Date.now() - new Date(currentUser.created_at).getTime();
  if(ageMs > 10 * 60 * 1000) {
    // Still mark seen so older accounts don't get prompted later
    try{ localStorage.setItem(ONB_KEY, "1"); }catch(e){}
    return;
  }
  setTimeout(openOnb, 600);
}
// Attempt to show shortly after profile boot completes
setTimeout(maybeShowOnboarding, 1200);


})();


/* ===== Discover page script (scoped) ===== */
(function(){

/* ============ Supabase ============ */
const SUPABASE_URL = "https://yjfxoximfczrtfgnnqyc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqZnhveGltZmN6cnRmZ25ucXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MzAwMTksImV4cCI6MjA5NDEwNjAxOX0.rGIpoYFYZ6q6Dz_7etlEqnjKp55BeYp1Iqay-__kfjA";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ============ Helpers ============ */
const $ = s => document.querySelector(s);
function vibrate(ms){ navigator.vibrate && navigator.vibrate(ms); }
function initialsOf(name){
  if(!name) return "?";
  return name.trim().split(/\s+/).slice(0,2).map(s=>s[0].toUpperCase()).join("");
}

/* Avatar gradient palette */
const AVATAR_COLORS = [
  ["#a8c4f0","#1d4ed8"], ["#c4b5fd","#7c3aed"], ["#86efac","#16a34a"],
  ["#fca5a5","#dc2626"], ["#fde68a","#d97706"], ["#a5f3fc","#0891b2"],
  ["#f9a8d4","#db2777"], ["#bfdbfe","#2563eb"],
];
function avatarColor(str){
  let hash = 0;
  for(let c of (str||"")) hash = (hash*31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function fmtSeen(ts, isOnline, privacySettings){
  if(isOnline) return "Online now";
  const showLastSeen = (privacySettings && privacySettings.show_last_seen) || "everyone";
  if(showLastSeen === "nobody") return "Last seen hidden";
  if(!ts) return "Seen recently";
  const d = new Date(ts), now = new Date();
  const diff = (now - d) / 1000;
  if(diff < 3600) return `Last seen ${Math.floor(diff/60)}m ago`;
  if(diff < 86400) return `Last seen ${Math.floor(diff/3600)}h ago`;
  if(diff < 172800) return "Last seen yesterday";
  return "Last seen " + d.toLocaleDateString("en", {month:"short", day:"numeric"});
}

function fmtJoined(ts){
  if(!ts) return "—";
  return new Date(ts).toLocaleDateString("en", {month:"short", year:"2-digit"});
}

/* Notif popup — matched to profile.html */
const NOTIF_CFG = {
  success:{icon:"ph-check-circle",title:"Done!",cls:"success"},
  error:  {icon:"ph-warning-circle",title:"Error",cls:"error"},
  warning:{icon:"ph-warning",title:"Warning",cls:"warning"},
  info:   {icon:"ph-info",title:"Notice",cls:"info"},
  /* legacy aliases */
  good:   {icon:"ph-check-circle",title:"Done!",cls:"good"},
  bad:    {icon:"ph-warning-circle",title:"Error",cls:"bad"},
  default:{icon:"ph-info",title:"Notice",cls:"info"},
};
function toast(msg, kind="default"){
  const cfg = NOTIF_CFG[kind]||NOTIF_CFG.default;
  $("#notifCard_d").className = "notif-card " + cfg.cls;
  $("#notifIcon_d").className = "ph " + cfg.icon;
  $("#notifTitle_d").textContent = cfg.title;
  $("#notifMsg_d").textContent = msg;
  $("#notifPopup_d").classList.add("show");
  clearTimeout(window.__nt);
  window.__nt = setTimeout(()=> $("#notifPopup_d").classList.remove("show"), 3000);
}

/* ============ State ============ */
let currentUser = null;
let allUsers = [];
let followSet = new Set();
let activeFilter = "all";
let searchQ = "";
let sheetUser = null;

/* ============ Render list ============ */
function filtered(){
  return allUsers.filter(u => {
    if(activeFilter === "online" && !u.is_online) return false;
    if(activeFilter === "following" && !followSet.has(u.id)) return false;
    if(searchQ){
      const q = searchQ.toLowerCase();
      const name = (u.full_name||"").toLowerCase();
      const uname = (u.username||"").toLowerCase();
      if(!name.includes(q) && !uname.includes(q)) return false;
    }
    return true;
  });
}

function renderList(){
  const list = filtered();
  const el = $("#userList");
  const countEl = $("#peopleCount");
  countEl.textContent = list.length + " people";

  if(list.length === 0){
    el.innerHTML = `
      <div class="empty-state">
        <i class="ph ph-users-three"></i>
        <p>${activeFilter==="online" ? "No one online right now" : activeFilter==="following" ? "You're not following anyone yet" : "No users found"}</p>
      </div>`;
    return;
  }

  /* Build rows with stylish dividers between them */
  const rowsHTML = list.map((u, idx) => {
    const initials = initialsOf(u.full_name || u.username);
    const [bg, fg] = avatarColor(u.id);
    const isFollowing = followSet.has(u.id);
    const isMutual = isFollowing && followSet.has(u.id) && (u._followsMe === true);
    const seenText = fmtSeen(u.last_seen, u.is_online, u.privacy_settings);
    const bio = u.bio ? u.bio.slice(0,40) + (u.bio.length>40?"…":"") : "";
    const divider = idx < list.length - 1 ? `<div class="user-divider"></div>` : "";
    const mutualTag = isMutual ? `<div class="u-mutual-tag"><i class="ph ph-arrows-left-right"></i> Mutual</div>` : "";
    const followClass = isMutual ? "follow-btn mutual" : (isFollowing ? "follow-btn following" : "follow-btn");
    const followIcon = isMutual ? "ph-arrows-left-right" : (isFollowing ? "ph-user-check" : "ph-user-plus");
    const followLabel = isMutual ? "Mutual" : (isFollowing ? "Following" : "Follow");

    return `
    <div class="user-row" data-uid="${u.id}">
      <div class="u-avatar" style="background:linear-gradient(135deg,${bg},${fg});">
        ${u.avatar_url ? `<img src="${u.avatar_url}" alt="" onerror="this.style.display='none'" />` : initials}
        <div class="u-dot ${u.is_online?'show':''}"></div>
      </div>
      <div class="u-info">
        <div class="u-name">
          <span class="u-name-text">${u.full_name || u.username || "NovaUser"}</span>
        </div>
        <div class="u-meta">@${u.username||"user"} · ${seenText}</div>
        ${bio ? `<div class="u-bio-preview">${bio}</div>` : ""}
        ${mutualTag}
      </div>
      <button class="${followClass}" data-uid="${u.id}" data-following="${isFollowing}">
        <i class="ph ${followIcon}"></i>
        ${followLabel}
      </button>
    </div>
    ${divider}`;
  }).join("");

  el.innerHTML = rowsHTML;

  /* Row click → open sheet */
  el.querySelectorAll(".user-row").forEach(row => {
    row.addEventListener("click", e => {
      if(e.target.closest(".follow-btn")) return;
      const uid = row.dataset.uid;
      const u = allUsers.find(x=>x.id===uid);
      if(u) openSheet(u);
    });
  });

  /* Inline follow button */
  el.querySelectorAll(".follow-btn").forEach(btn => {
    btn.addEventListener("click", async e => {
      e.stopPropagation();
      const uid = btn.dataset.uid;
      await toggleFollow(uid, btn.dataset.following==="true", btn);
    });
  });
}

/* ============ Follow / Unfollow ============ */
async function toggleFollow(uid, isFollowing, btnEl){
  vibrate(30);
  if(isFollowing){
    await sb.from("follows").delete()
      .eq("follower_id", currentUser.id).eq("following_id", uid);
    followSet.delete(uid);
  } else {
    await sb.from("follows").insert({ follower_id:currentUser.id, following_id:uid });
    followSet.add(uid);
  }
  if(btnEl){
    const nowFollowing = followSet.has(uid);
    btnEl.dataset.following = nowFollowing;
    btnEl.className = "follow-btn" + (nowFollowing?" following":"");
    btnEl.innerHTML = `<i class="ph ${nowFollowing?'ph-user-check':'ph-user-plus'}"></i>${nowFollowing?"Following":"Follow"}`;
  }
  if(sheetUser && sheetUser.id === uid) updateSheetFollowBtn();
  if(activeFilter==="following") renderList();
}

/* ============ Sheet ============ */
function updateSheetFollowBtn(){
  const isF = followSet.has(sheetUser.id);
  // Check if they also follow us back (mutual)
  const isMutual = isF && (sheetUser._followsMe === true);
  const btn = $("#sheetFollowBtn");
  const icon = $("#sheetFollowIcon");
  const label = $("#sheetFollowLabel");
  if(isMutual){
    btn.className = "sheet-follow-btn mutual";
    icon.className = "ph ph-arrows-left-right mutual-icon";
    label.textContent = "Mutual";
  } else {
    btn.className = "sheet-follow-btn" + (isF?" following":"");
    icon.className = "ph " + (isF?"ph-user-check":"ph-user-plus");
    label.textContent = isF ? "Following" : "Follow";
  }
}

async function openSheet(u){
  sheetUser = u;
  vibrate(20);

  const initials = initialsOf(u.full_name || u.username);
  const [bg, fg] = avatarColor(u.id);

  /* Avatar */
  const avatarEl = $("#sheetAvatar");
  avatarEl.style.background = `linear-gradient(135deg,${bg},${fg})`;
  avatarEl.style.color = "#fff";
  if(u.avatar_url){
    avatarEl.innerHTML = `<img src="${u.avatar_url}" onerror="this.style.display='none'" />` + initials;
  } else {
    avatarEl.textContent = initials;
  }

  const displayName = u.full_name || u.username || "NovaUser";
  $("#sheetNameText").textContent = displayName;
  $("#sheetVerified").style.display = "none";
  $("#sheetUsername").textContent = "@" + (u.username||"user");
  /* Update block/report button labels */
  $("#sheetBlockBtn").innerHTML = `<i class="ph ph-prohibit"></i> Block ${(u.full_name||u.username||"").split(" ")[0]}`;
  $("#sheetReportBtn").innerHTML = `<i class="ph ph-flag"></i> Report`;

  const statusEl = $("#sheetStatus");
  if(u.is_online){
    statusEl.innerHTML = `<span class="sheet-online-dot"></span> Online now`;
  } else {
    statusEl.textContent = fmtSeen(u.last_seen, false, u.privacy_settings);
  }

  /* Bio */
  const bioEl = $("#sheetBio");
  if(u.bio){ bioEl.textContent = u.bio; bioEl.className="sheet-bio"; }
  else { bioEl.textContent = "No bio yet"; bioEl.className="sheet-bio no-bio"; }

  /* Stats */
  $("#sheetFollowers").textContent = "…";
  $("#sheetFollowing").textContent = "…";
  $("#sheetJoined").textContent = fmtJoined(u.created_at);
  sb.from("follows").select("*",{count:"exact",head:true}).eq("following_id", u.id)
    .then(({count})=> $("#sheetFollowers").textContent = count||0);
  sb.from("follows").select("*",{count:"exact",head:true}).eq("follower_id", u.id)
    .then(({count})=> $("#sheetFollowing").textContent = count||0);

  /* Check mutual (does this user follow me back?) */
  sheetUser._followsMe = false;
  sb.from("follows").select("follower_id",{count:"exact",head:true})
    .eq("follower_id", u.id).eq("following_id", currentUser.id)
    .then(({count})=>{
      sheetUser._followsMe = (count||0) > 0;
      updateSheetFollowBtn();
    });

  updateSheetFollowBtn();

  /* Details */
  const isFollowing = followSet.has(u.id);
  const emailRow = $("#sheetEmailRow");
  const locationRow = $("#sheetLocationRow");
  if(u.email && isFollowing){ emailRow.style.display="flex"; $("#sheetEmail").textContent = u.email; }
  else { emailRow.style.display="none"; }
  if(u.location){ locationRow.style.display="flex"; $("#sheetLocation").textContent = u.location; }
  else { locationRow.style.display="none"; }

  const privacyMap = {everyone:"Last seen shown to everyone",followers:"Last seen shown to followers only",nobody:"Last seen hidden"};
  const showLastSeen = (u.privacy_settings && u.privacy_settings.show_last_seen) || "everyone";
  $("#sheetPrivacyLabel").textContent = privacyMap[showLastSeen] || privacyMap["everyone"];

  /* Open sheet */
  const sheet = $("#profileSheet");
  sheet.classList.add("open");
  $("#sheetOverlay").classList.add("show");
  $("#sheetScroll").scrollTop = 0;

  /* Animate stat islands */
  ["statIsland1","statIsland2","statIsland3"].forEach(id => {
    const el = $("#"+id); if(el) el.classList.remove("in");
  });
  ["statIsland1","statIsland2","statIsland3"].forEach((id, i) => {
    const el = $("#"+id);
    if(el) setTimeout(()=> el.classList.add("in"), 120 + i * 80);
  });
}

function closeSheet(){
  const sheet = $("#profileSheet");
  sheet.classList.remove("open");
  $("#sheetOverlay").classList.remove("show");
  sheetUser = null;
}

/* ============ Block / Report ============ */
(function(){
  /* ---- BLOCK ---- */
  $("#sheetBlockBtn").addEventListener("click", ()=>{
    if(!sheetUser) return;
    const name = sheetUser.full_name || sheetUser.username || "this person";
    $("#blockTitle").textContent = `Block ${name}?`;
    $("#blockOverlay").classList.add("show");
  });
  $("#blockCancel").addEventListener("click", ()=> $("#blockOverlay").classList.remove("show"));
  $("#blockOverlay").addEventListener("click", e=>{ if(e.target===e.currentTarget) $("#blockOverlay").classList.remove("show"); });
  $("#blockConfirm").addEventListener("click", async ()=>{
    if(!sheetUser) return;
    const btn = $("#blockConfirm");
    btn.disabled = true; btn.textContent = "Blocking…";
    try{
      await sb.from("blocked_users").upsert({
        blocker_id: currentUser.id,
        blocked_id: sheetUser.id
      },{ onConflict: "blocker_id,blocked_id" });
      /* Remove from list */
      allUsers = allUsers.filter(u=> u.id !== sheetUser.id);
      renderList();
      closeSheet();
      $("#blockOverlay").classList.remove("show");
      toast(`${sheetUser.full_name || "User"} blocked`, "success");
      vibrate(40);
    }catch(e){
      toast("Failed to block — try again", "error");
    }finally{
      btn.disabled = false; btn.textContent = "Block";
    }
  });

  /* ---- REPORT ---- */
  let selectedReason = "";
  document.querySelectorAll(".report-reason-btn").forEach(btn => {
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".report-reason-btn").forEach(b=> b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedReason = btn.dataset.reason;
      $("#reportConfirm").disabled = false;
    });
  });

  $("#sheetReportBtn").addEventListener("click", ()=>{
    if(!sheetUser) return;
    selectedReason = "";
    document.querySelectorAll(".report-reason-btn").forEach(b=> b.classList.remove("selected"));
    $("#reportNote").value = "";
    $("#reportConfirm").disabled = true;
    const name = sheetUser.full_name || sheetUser.username || "this person";
    $("#reportTitle").textContent = `Report ${name}`;
    $("#reportOverlay").classList.add("show");
  });
  $("#reportCancel").addEventListener("click", ()=> $("#reportOverlay").classList.remove("show"));
  $("#reportOverlay").addEventListener("click", e=>{ if(e.target===e.currentTarget) $("#reportOverlay").classList.remove("show"); });
  $("#reportConfirm").addEventListener("click", async ()=>{
    if(!sheetUser || !selectedReason) return;
    const btn = $("#reportConfirm");
    btn.disabled = true; btn.textContent = "Submitting…";
    try{
      await sb.from("reports").insert({
        reporter_id: currentUser.id,
        reported_id: sheetUser.id,
        reason: selectedReason,
        note: $("#reportNote").value.trim() || null
      });
      $("#reportOverlay").classList.remove("show");
      toast("Report submitted — thank you", "success");
      vibrate(40);
      /* Ask if they also want to block */
      setTimeout(()=>{
        if(sheetUser){
          const name = sheetUser.full_name || sheetUser.username || "this person";
          $("#blockTitle").textContent = `Also block ${name}?`;
          $("#blockOverlay").classList.add("show");
        }
      }, 800);
    }catch(e){
      toast("Failed to submit — try again", "error");
    }finally{
      btn.disabled = false; btn.textContent = "Submit Report";
    }
  });
})();

/* ============ Drag-to-close gesture ============ */
(function(){
  const sheet = $("#profileSheet");
  const overlay = $("#sheetOverlay");
  let startY = 0, startScrollTop = 0, dragging = false, currentDY = 0;

  overlay.addEventListener("click", closeSheet);

  function onStart(y){
    startY = y;
    startScrollTop = $("#sheetScroll").scrollTop;
    dragging = true;
    currentDY = 0;
    sheet.style.transition = "none";
  }
  function onMove(y){
    if(!dragging) return;
    const dy = y - startY;
    currentDY = dy;
    /* Only allow dragging down when scroll is at top */
    if(dy > 0 && startScrollTop <= 0){
      /* Natural rubber-band feel — resistance increases */
      const drag = Math.min(dy, 400);
      sheet.style.transform = `translateX(-50%) translateY(${drag}px)`;
      /* Fade overlay proportionally */
      const progress = Math.min(drag / 300, 1);
      overlay.style.opacity = 1 - progress * 0.8;
    } else if(dy < 0){
      /* Slight resistance upward */
      sheet.style.transform = `translateX(-50%) translateY(${Math.max(dy * 0.08, -10)}px)`;
    }
  }
  function onEnd(y){
    if(!dragging) return;
    dragging = false;
    sheet.style.transition = "";
    overlay.style.opacity = "";
    const dy = y - startY;
    if(dy > 90 && startScrollTop <= 0){
      /* Close: animate sheet off screen */
      sheet.style.transition = "transform .35s cubic-bezier(.4,0,.2,1)";
      sheet.style.transform = "translateX(-50%) translateY(100%)";
      setTimeout(()=>{
        sheet.style.transform = "";
        closeSheet();
      }, 350);
    } else {
      /* Snap back */
      sheet.style.transform = "";
    }
  }

  /* Touch */
  sheet.addEventListener("touchstart", e => onStart(e.touches[0].clientY), {passive:true});
  sheet.addEventListener("touchmove", e => onMove(e.touches[0].clientY), {passive:true});
  sheet.addEventListener("touchend", e => onEnd(e.changedTouches[0].clientY));

  /* Mouse (desktop) */
  sheet.addEventListener("mousedown", e => onStart(e.clientY));
  window.addEventListener("mousemove", e => { if(dragging) onMove(e.clientY); });
  window.addEventListener("mouseup", e => { if(dragging) onEnd(e.clientY); });
})();

/* ============ Sheet action buttons ============ */
document.addEventListener("DOMContentLoaded", ()=>{
  function addRipple(btn, e){
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = (e.clientX || rect.left + rect.width/2) - rect.left - size/2;
    const y = (e.clientY || rect.top + rect.height/2) - rect.top - size/2;
    const ripple = document.createElement("span");
    ripple.className = "btn-ripple";
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    btn.appendChild(ripple);
    ripple.addEventListener("animationend", ()=> ripple.remove());
  }

  const msgBtn = $("#sheetMsgBtn");
  const followBtn = $("#sheetFollowBtn");
  msgBtn.addEventListener("click", e => addRipple(msgBtn, e));
  followBtn.addEventListener("click", e => addRipple(followBtn, e));

  $("#sheetCloseBtn").addEventListener("click", closeSheet);
  $("#sheetFollowBtn").addEventListener("click", async ()=>{
    if(!sheetUser) return;
    await toggleFollow(sheetUser.id, followSet.has(sheetUser.id), null);
    updateSheetFollowBtn();
    renderList();
    vibrate(40);
  });
  $("#sheetMsgBtn").addEventListener("click", ()=>{
    if(!sheetUser) return;
    if(window.parent!==window && new URLSearchParams(location.search).has('embedded')){
      window.parent.postMessage({type:'9jatalk:navigate',view:'chats',userId:sheetUser.id},location.origin);
    } else {
      window.location.href = `chats.html?user=${sheetUser.id}`;
    }
  });
  $("#notifClose_d").addEventListener("click", ()=> $("#notifPopup_d").classList.remove("show"));

  /* Refresh action (button removed — triggered via pull-to-refresh) */
  window.__refresh = window.__refresh || {};
  window.__refresh.discover = async ()=>{
    try{
      const { data: users, error } = await sb.from("profiles")
        .select("id,full_name,username,bio,avatar_url,is_online,last_seen,created_at,location,privacy_settings")
        .neq("id", currentUser.id)
        .order("is_online", {ascending:false})
        .order("full_name");
      if(!error){ allUsers = users || []; }
      const { data: follows } = await sb.from("follows")
        .select("following_id").eq("follower_id", currentUser.id);
      followSet = new Set((follows||[]).map(f=>f.following_id));
      renderList();
      toast("List refreshed","good");
      vibrate(40);
    }catch(e){
      toast("Refresh failed","bad");
    }
  };
});

/* ============ Filters & Search ============ */
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".filter-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    renderList();
  });
});
$("#searchInput").addEventListener("input", e=>{
  searchQ = e.target.value.trim();
  const wrap = $("#searchWrap");
  if(searchQ){ wrap.classList.add("has-text"); }
  else { wrap.classList.remove("has-text"); }
  renderList();
});
$("#searchClear").addEventListener("click", ()=>{
  $("#searchInput").value = "";
  searchQ = "";
  $("#searchWrap").classList.remove("has-text");
  renderList();
  $("#searchInput").focus();
});

/* ============ Theme ============ */
(function(){
  const btn = $("#themeToggle_d");
  const icon = $("#themeIcon_d");
  const html = document.documentElement;
  function applyTheme(dark){
    if(dark){ html.setAttribute("data-theme","dark"); icon.className="ph ph-sun"; }
    else { html.removeAttribute("data-theme"); icon.className="ph ph-moon"; }
  }
  applyTheme(localStorage.getItem("nova-theme")==="dark");
  btn.addEventListener("click", ()=>{
    const isDark = html.getAttribute("data-theme")==="dark";
    applyTheme(!isDark);
    localStorage.setItem("nova-theme", !isDark?"dark":"light");
    btn.classList.remove("shaking"); void btn.offsetWidth; btn.classList.add("shaking");
    setTimeout(()=>btn.classList.remove("shaking"),400);
  });
})();

/* ============ Auth & Load ============ */
(async function init(){
  const updateOffline = ()=> $("#offline_d").classList.toggle("show", !navigator.onLine);
  window.addEventListener("online", updateOffline);
  window.addEventListener("offline", updateOffline);
  updateOffline();

  if((window.location.hash||"").includes("access_token")){
    await new Promise(r=>setTimeout(r,80));
    history.replaceState(null,"",window.location.pathname);
  }

  const { data } = await sb.auth.getSession();
  if(!data.session){ window.location.href="index.html"; return; }
  currentUser = data.session.user;

  const { data: users, error } = await sb.from("profiles")
    .select("id,full_name,username,bio,avatar_url,is_online,last_seen,created_at,location,privacy_settings")
    .neq("id", currentUser.id)
    .order("is_online", {ascending:false})
    .order("full_name");

  if(error){ toast("Failed to load users","bad"); }
  else { allUsers = users || []; }

  const { data: follows } = await sb.from("follows")
    .select("following_id")
    .eq("follower_id", currentUser.id);
  followSet = new Set((follows||[]).map(f=>f.following_id));

  renderList();


  /* Realtime online status */
  sb.channel("profiles-online")
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"profiles"}, payload=>{
      const updated = payload.new;
      const idx = allUsers.findIndex(u=>u.id===updated.id);
      if(idx>-1){
        allUsers[idx] = {...allUsers[idx], is_online:updated.is_online, last_seen:updated.last_seen};
        renderList();
      }
    })
    .subscribe();
})();

})();

/* ============ Notification Toggle ============ */
function initProfileNotifToggle() {
  if (!('Notification' in window)) return;
  const sw = document.getElementById('notifSwitch');
  const sub = document.getElementById('notifToggleSub');
  const denied = document.getElementById('notifDeniedMsg');
  if (!sw || sw.dataset.bound) return;
  sw.dataset.bound = 'true';

  function updateUI() {
    const enabled = Notification.permission === 'granted'
      && localStorage.getItem('nova_notif_enabled') === 'true';
    sw.classList.toggle('on', enabled);
    sw.setAttribute('aria-checked', enabled);
    sub.textContent = enabled
      ? 'Enabled — messages & daily nudges'
      : 'Tap to enable notifications';
    denied.classList.toggle(
      'show',
      Notification.permission === 'denied'
    );
  }

  updateUI();

  sw.addEventListener('click', async () => {
    const enabled = sw.classList.contains('on');
    if (enabled) {
      // Turn off
      localStorage.setItem('nova_notif_enabled', 'false');
      updateUI();
      return;
    }
    // Turn on
    if (Notification.permission === 'denied') {
      denied.classList.add('show');
      return;
    }
    if (Notification.permission === 'granted') {
      localStorage.setItem('nova_notif_enabled', 'true');
      if (window.scheduleNudges) window.scheduleNudges();
      updateUI();
      return;
    }
    // Not yet asked — trigger browser prompt
    const result = await Notification.requestPermission();
    localStorage.setItem('nova_notif_asked', 'true');
    if (result === 'granted') {
      localStorage.setItem('nova_notif_enabled', 'true');
      if (window.scheduleFirstNudge) window.scheduleFirstNudge();
    }
    updateUI();
  });
}

document.addEventListener('DOMContentLoaded', initProfileNotifToggle);


(function(){
  /* ---------- 1) Toast: bounce + drag-to-dismiss (any direction) ---------- */
  function wireToast(popup){
    if(!popup || popup.dataset.novaDragWired) return;
    popup.dataset.novaDragWired = "1";
    let sx=0, sy=0, dx=0, dy=0, dragging=false, startTime=0;

    function reset(){
      popup.style.transform = "";
      popup.style.opacity = "";
      popup.classList.remove("np-dragging","np-dismissing");
    }
    function dismiss(dirX, dirY){
      popup.classList.add("np-dismissing");
      const tx = Math.sign(dirX||0) * 480;
      const ty = Math.sign(dirY||0) * 320;
      popup.style.transform = `translateX(calc(-50% + ${tx}px)) translateY(${ty}px) scale(.9)`;
      popup.style.opacity = "0";
      setTimeout(()=>{
        popup.classList.remove("show");
        reset();
      }, 240);
    }
    popup.addEventListener("pointerdown",(e)=>{
      if(e.target.closest(".notif-close")) return;
      dragging=true; sx=e.clientX; sy=e.clientY; dx=0; dy=0; startTime=Date.now();
      popup.setPointerCapture(e.pointerId);
      popup.classList.add("np-dragging");
    });
    popup.addEventListener("pointermove",(e)=>{
      if(!dragging) return;
      dx = e.clientX - sx;
      dy = e.clientY - sy;
      const dist = Math.hypot(dx,dy);
      const opacity = Math.max(.25, 1 - dist/240);
      popup.style.transform = `translateX(calc(-50% + ${dx}px)) translateY(${dy}px)`;
      popup.style.opacity = opacity;
    });
    function end(e){
      if(!dragging) return;
      dragging=false;
      try{ popup.releasePointerCapture(e.pointerId); }catch(_){}
      const dist = Math.hypot(dx,dy);
      const dt = Date.now()-startTime;
      const velocity = dist / Math.max(dt,1);
      if(dist > 70 || velocity > 0.45){ dismiss(dx, dy); }
      else {
        popup.style.transition = "transform .25s cubic-bezier(.34,1.4,.64,1), opacity .25s ease";
        popup.style.transform = "translateX(-50%) translateY(0)";
        popup.style.opacity = "1";
        setTimeout(()=>{ popup.style.transition=""; reset(); }, 260);
      }
    }
    popup.addEventListener("pointerup", end);
    popup.addEventListener("pointercancel", end);
  }
  document.querySelectorAll('.notif-popup').forEach(wireToast);

  /* ---------- 2) Offline -> reddish toast ---------- */
  function findShowToast(){
    // chats.html exposes showToast(title,msg,type); profile.html uses toast(msg,type)
    if(typeof window.showToast === "function") return (t,m)=>window.showToast(t,m,"bad");
    if(typeof window.toast === "function") return (t,m)=>window.toast(m||t, "bad");
    return (t,m)=>{
      const p = document.querySelector('.notif-popup');
      const card = p && p.querySelector('.notif-card');
      const ti = p && p.querySelector('.notif-title, [id^=notifTitle]');
      const ms = p && p.querySelector('.notif-msg, [id^=notifMsg]');
      if(!p) return;
      if(card){ card.className = "notif-card bad"; }
      if(ti) ti.textContent = t;
      if(ms) ms.textContent = m;
      p.classList.add("show");
      setTimeout(()=>p.classList.remove("show"), 3500);
    };
  }
  function offlineToast(){
    const fn = findShowToast();
    fn("Offline", "You're offline — check your connection");
  }
  function onlineToast(){
    // optional: silent or quick success — keep it brief & matching toast system
    if(typeof window.showToast === "function") window.showToast("Back online","Connection restored","good");
    else if(typeof window.toast === "function") window.toast("Back online","good");
  }
  // Hide any existing offline banners
  document.querySelectorAll('.offline').forEach(el=>{ el.classList.remove('show'); el.style.display='none'; });
  let wasOffline = !navigator.onLine;
  if(wasOffline) setTimeout(offlineToast, 600);
  window.addEventListener('offline', ()=>{ wasOffline=true; offlineToast(); });
  window.addEventListener('online', ()=>{ if(wasOffline){ wasOffline=false; onlineToast(); } });

  /* ---------- 3) Universal drag-down-to-close on all sheets ---------- */
  const SHEET_SELECTORS = [
    '.bsheet', '.psheet', '.menu-sheet', '.row-action-sheet', '.report-sheet',
    '.confirm-sheet', '.msg-action-sheet', '.del-choice-sheet', '.fwd-sheet',
    '.post-menu-sheet', '.share-sheet'
  ];
  // Map sheet => overlay element (by convention: sibling overlay or id pattern)
  function findOverlayFor(sheet){
    // try common patterns
    const id = sheet.id || "";
    const overlayIdGuesses = [
      id+"Overlay", id.replace(/Sheet$/,"Overlay"), id.replace(/-sheet/,"-overlay"),
    ].filter(Boolean);
    for(const oid of overlayIdGuesses){
      const el = document.getElementById(oid); if(el) return el;
    }
    // search prev/next siblings within same parent for an .*-overlay or .bsheet-overlay
    const parent = sheet.parentElement;
    if(parent){
      const ovs = parent.querySelectorAll('.bsheet-overlay,.psheet-overlay,.menu-overlay,.sheet-overlay,[class*="overlay"]');
      for(const ov of ovs){ if(ov.classList.contains('show')) return ov; }
      if(ovs.length===1) return ovs[0];
    }
    return null;
  }
  function closeSheet(sheet){
    sheet.classList.remove('show','open','visible');
    sheet.style.transform = "";
    sheet.style.opacity = "";
    sheet.classList.remove('nova-sheet-dragging');
    const ov = findOverlayFor(sheet);
    if(ov) ov.classList.remove('show','open');
    // Also remove any open overlay anywhere if no sheets remain open
    setTimeout(()=>{
      const stillOpen = document.querySelector(SHEET_SELECTORS.map(s=>s+'.show, '+s+'.open').join(','));
      if(!stillOpen){
        document.querySelectorAll('.bsheet-overlay,.psheet-overlay,.menu-overlay').forEach(o=>o.classList.remove('show','open'));
      }
    }, 50);
  }
  function wireSheet(sheet){
    if(sheet.dataset.novaSheetDrag) return;
    sheet.dataset.novaSheetDrag = "1";
    let sx=0, sy=0, dy=0, dragging=false, baseTransform="", startTime=0;
    sheet.addEventListener('pointerdown',(e)=>{
      // ignore drag if interacting with form fields or scrolling content
      const tag = (e.target.tagName||"").toLowerCase();
      if(['input','textarea','select','button','a'].includes(tag) && !e.target.closest('.psheet-handle,.post-menu-handle,.sheet-handle')) {
        // allow drag from handles even on buttons
      }
      const scrollable = e.target.closest('.psheet-scroll, .sheet-scroll, [data-scrollable]');
      if(scrollable && scrollable.scrollTop > 0) return;
      dragging=true; sx=e.clientX; sy=e.clientY; dy=0; startTime=Date.now();
      try{ sheet.setPointerCapture(e.pointerId);}catch(_){}
      sheet.classList.add('nova-sheet-dragging');
    });
    sheet.addEventListener('pointermove',(e)=>{
      if(!dragging) return;
      dy = e.clientY - sy;
      if(dy < 0) dy = dy * 0.15; // resistance upward
      // preserve any centering (translateX(-50%))
      const isCentered = getComputedStyle(sheet).left === '50%' || sheet.classList.contains('menu-sheet') || sheet.classList.contains('row-action-sheet') || sheet.classList.contains('report-sheet') || sheet.classList.contains('confirm-sheet') || sheet.classList.contains('msg-action-sheet') || sheet.classList.contains('del-choice-sheet');
      sheet.style.transform = isCentered
        ? `translateX(-50%) translateY(${Math.max(0,dy)}px)`
        : `translateY(${Math.max(0,dy)}px)`;
    });
    function end(e){
      if(!dragging) return;
      dragging=false;
      try{ sheet.releasePointerCapture(e.pointerId);}catch(_){}
      const dt = Date.now()-startTime;
      const velocity = dy / Math.max(dt,1);
      sheet.classList.remove('nova-sheet-dragging');
      if(dy > 110 || velocity > 0.6){
        closeSheet(sheet);
      } else {
        sheet.style.transition = "transform .3s cubic-bezier(.34,1.4,.64,1)";
        sheet.style.transform = "";
        setTimeout(()=>{ sheet.style.transition=""; }, 320);
      }
    }
    sheet.addEventListener('pointerup', end);
    sheet.addEventListener('pointercancel', end);
  }
  function rewireAll(){
    SHEET_SELECTORS.forEach(sel=>{
      document.querySelectorAll(sel).forEach(wireSheet);
    });
    document.querySelectorAll('.notif-popup').forEach(wireToast);
  }
  rewireAll();
  // re-wire when new sheets are added dynamically
  const mo = new MutationObserver(()=>{ rewireAll(); });
  mo.observe(document.body,{childList:true,subtree:true});
})();

}


/* ===== chats.js ===== */
if (document.body && document.body.dataset.page === 'chats') {
/* ============ Supabase ============ */
const SUPABASE_URL = "https://yjfxoximfczrtfgnnqyc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqZnhveGltZmN6cnRmZ25ucXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MzAwMTksImV4cCI6MjA5NDEwNjAxOX0.rGIpoYFYZ6q6Dz_7etlEqnjKp55BeYp1Iqay-__kfjA";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ============ Helpers ============ */
const $ = s => document.querySelector(s);
function vibrate(ms){ navigator.vibrate && navigator.vibrate(ms); }

/* Generic drag-to-dismiss for bottom sheets. Drag the handle down past
   ~30% of the sheet's height to close it with a smooth animation. */
function makeSheetDraggable(sheet, handle, closeFn, opts){
  if(!sheet || !handle) return;
  const baseX = (opts && opts.baseTransform) || "";
  let sy=0, dy=0, dragging=false;
  const pointY = e => (e.touches ? e.touches[0].clientY : e.clientY);
  function onDown(e){
    dragging=true; dy=0; sy=pointY(e);
    sheet.style.transition="none";
    if(e.pointerId !== undefined && handle.setPointerCapture){
      try { handle.setPointerCapture(e.pointerId); } catch(_){}
    }
  }
  function onMove(e){
    if(!dragging) return;
    dy = Math.max(0, pointY(e) - sy);
    sheet.style.transform = `${baseX}translateY(${dy}px)`;
  }
  function onUp(){
    if(!dragging) return;
    dragging=false;
    sheet.style.transition = "";
    const h = sheet.getBoundingClientRect().height || 1;
    if(dy > h * 0.3){
      sheet.style.transform = `${baseX}translateY(100%)`;
      setTimeout(()=>{
        closeFn();
        sheet.style.transform = "";
      }, 280);
    } else {
      sheet.style.transform = "";
    }
    dy = 0;
  }
  handle.addEventListener("pointerdown", onDown);
  handle.addEventListener("pointermove", onMove);
  handle.addEventListener("pointerup", onUp);
  handle.addEventListener("pointercancel", onUp);
}

function initialsOf(name){
  if(!name) return "?";
  return name.trim().split(/\s+/).slice(0,2).map(s=>s[0].toUpperCase()).join("");
}

const AVATAR_COLORS = [
  ["#a8c4f0","#1d4ed8"],["#c4b5fd","#7c3aed"],["#86efac","#16a34a"],
  ["#fca5a5","#dc2626"],["#fde68a","#d97706"],["#a5f3fc","#0891b2"],
  ["#f9a8d4","#db2777"],["#bfdbfe","#2563eb"],
];
function avatarColor(str){
  let hash=0;
  for(let c of (str||"")) hash=(hash*31+c.charCodeAt(0))&0xffffffff;
  return AVATAR_COLORS[Math.abs(hash)%AVATAR_COLORS.length];
}

function fmtTime(ts){
  if(!ts) return "";
  const d=new Date(ts);
  const now=new Date();
  const diff=(now-d)/1000;
  if(diff<60) return "now";
  if(diff<3600){
    const h=d.getHours(),m=d.getMinutes();
    const ampm=h>=12?"pm":"am";
    return `${h%12||12}:${String(m).padStart(2,"0")} ${ampm}`;
  }
  const today=new Date(); today.setHours(0,0,0,0);
  const msgDay=new Date(d); msgDay.setHours(0,0,0,0);
  const dayDiff=Math.round((today-msgDay)/86400000);
  if(dayDiff===0){
    const h=d.getHours(),m=d.getMinutes();
    const ampm=h>=12?"pm":"am";
    return `${h%12||12}:${String(m).padStart(2,"0")} ${ampm}`;
  }
  if(dayDiff===1) return "Yesterday";
  if(dayDiff<7) return d.toLocaleDateString("en",{weekday:"short"});
  return d.toLocaleDateString("en",{month:"short",day:"numeric"});
}

function fmtDateChip(ts){
  const d=new Date(ts);
  const today=new Date(); today.setHours(0,0,0,0);
  const msgDay=new Date(d); msgDay.setHours(0,0,0,0);
  const diff=Math.round((today-msgDay)/86400000);
  if(diff===0) return "Today";
  if(diff===1) return "Yesterday";
  if(diff<7) return d.toLocaleDateString("en",{weekday:"long"});
  return d.toLocaleDateString("en",{month:"long",day:"numeric",year:"numeric"});
}

function sameDay(a,b){
  const da=new Date(a),db=new Date(b);
  return da.getFullYear()===db.getFullYear()&&da.getMonth()===db.getMonth()&&da.getDate()===db.getDate();
}

function previewText(msg){
  if(!msg) return "";
  if(msg.type==="image") return "📷 Photo";
  if(msg.type==="voice") return "🎤 Voice message";
  return msg.content||"";
}

function escHtml(str){
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>");
}

function fmtLastSeen(ts){
  const d=new Date(ts),now=new Date();
  const diff=(now-d)/1000;
  if(diff<3600) return `${Math.floor(diff/60)}m ago`;
  if(diff<86400) return `${Math.floor(diff/3600)}h ago`;
  if(diff<172800) return "yesterday";
  return d.toLocaleDateString("en",{month:"short",day:"numeric"});
}

/* ============ Global State ============ */
let currentUser = null;
let myProfile   = null;
let conversations = [];
let searchQ = "";

// Muted chats state (persisted in localStorage)
const _mutedChats = new Set(JSON.parse(localStorage.getItem("nova-muted-chats")||"[]"));
function _saveMuted(){ localStorage.setItem("nova-muted-chats",JSON.stringify([..._mutedChats])); }

/* ========================================================
   CHATS LIST
   ======================================================== */
function updateNotifDot(){
  const totalUnread=conversations.reduce((sum,c)=>sum+c.unread,0);
  const dot=document.getElementById("chatsNotifDot");
  if(dot) dot.classList.toggle("show",totalUnread>0);
}

function renderList(){
  const list = searchQ
    ? conversations.filter(c=>{
        const q=searchQ.toLowerCase();
        const name=(c.partner.full_name||"").toLowerCase();
        const uname=(c.partner.username||"").toLowerCase();
        const preview=previewText(c.lastMsg).toLowerCase();
        return name.includes(q)||uname.includes(q)||preview.includes(q);
      })
    : conversations;

  const el=$("#chatList");
  const countEl=$("#chatsCount");
  if(countEl) countEl.textContent=list.length+(list.length===1?" chat":" chats");

  updateNotifDot();

  if(list.length===0){
    el.innerHTML = searchQ
      ? `<div class="empty-state">
           <i class="ph ph-magnifying-glass"></i>
           <p>No results found</p>
           <small>Try a different name</small>
         </div>`
      : `<div class="empty-state">
           <i class="ph ph-chat-circle-dots"></i>
           <p>No conversations yet</p>
           <small>Find someone new and start chatting!</small>
           <a class="empty-state-discover-btn" href="profile.html#discover">
             <i class="ph ph-compass"></i> Go to Discover
           </a>
         </div>`;
    return;
  }

  el.innerHTML=list.map(c=>{
    const p=c.partner;
    const [bg,fg]=avatarColor(p.id);
    const initials=initialsOf(p.full_name||p.username);
    const preview=previewText(c.lastMsg);
    const time=fmtTime(c.lastMsg?.created_at);
    const hasUnread=c.unread>0;
    const isMutual=c.is_mutual||false;
    const isMuted=_mutedChats&&_mutedChats.has(p.id);

    const avatarInner=p.avatar_url
      ?`<img src="${p.avatar_url}" alt="${initials}" loading="lazy" />`
      :initials;

    return `
      <div class="chat-row${isMuted?" muted":""}" id="ci-${p.id}" onclick="handleChatRowClick(event,'${p.id}')">
        <div class="c-avatar" style="background:linear-gradient(135deg,${bg},${fg})">
          ${avatarInner}
          <div class="sel-check"><i class="ph ph-check-bold"></i></div>
        </div>
        <div class="c-info">
          <div class="c-top">
            <span class="c-name">${p.full_name||p.username||"Unknown"}${p.is_online?` <span class="c-online-text">online</span>`:""}</span>
            <span class="c-time">${time}</span>
          </div>
          <div class="c-bottom">
            <div style="display:flex;flex-direction:column;gap:1px;flex:1;min-width:0;">
              <span class="c-preview${hasUnread?" unread":""}">${preview}</span>
              ${isMutual?`<span class="c-mutual-tag"><i class="ph ph-check-circle-fill"></i> Mutual</span>`:""}
            </div>
            <span class="c-badge${hasUnread?" show":""}">${c.unread>99?"99+":c.unread||1}</span>
          </div>
        </div>
        <button class="c-dots-btn" onclick="openRowActionSheet(event,'${p.id}','${(p.full_name||p.username||"Unknown").replace(/'/g,"\\'")}')">
          <i class="ph ph-dots-three-vertical"></i>
        </button>
      </div>`;
  }).join("");
}

async function loadConversations(){
  // Fetch blocked user IDs first so we can filter them out
  const {data:blockedRows}=await sb
    .from("blocked_users")
    .select("blocked_id")
    .eq("blocker_id",currentUser.id);
  const blockedIds=new Set((blockedRows||[]).map(r=>r.blocked_id));

  const {data:msgs,error}=await sb
    .from("messages")
    .select("id,sender_id,receiver_id,content,type,is_read,created_at")
    .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
    .order("created_at",{ascending:false});
  if(error){console.error(error);return;}

  const convMap=new Map();
  for(const msg of (msgs||[])){
    const partnerId=msg.sender_id===currentUser.id?msg.receiver_id:msg.sender_id;
    // Skip conversations with blocked users
    if(blockedIds.has(partnerId)) continue;
    if(!convMap.has(partnerId)) convMap.set(partnerId,{lastMsg:msg,unread:0});
    if(msg.receiver_id===currentUser.id&&!msg.is_read) convMap.get(partnerId).unread++;
  }

  if(convMap.size===0){conversations=[];renderList();return;}

  const partnerIds=[...convMap.keys()];
  const {data:profiles}=await sb
    .from("profiles")
    .select("id,full_name,username,avatar_url,is_online")
    .in("id",partnerIds);

  const profileMap=new Map((profiles||[]).map(p=>[p.id,p]));

  conversations=partnerIds
    .map(id=>({
      partner:profileMap.get(id)||{id,full_name:"Unknown"},
      lastMsg:convMap.get(id).lastMsg,
      unread:convMap.get(id).unread,
    }))
    .sort((a,b)=>new Date(b.lastMsg.created_at)-new Date(a.lastMsg.created_at));

  renderList();
}

/* ========================================================
   TOPBAR — load current user profile
   ======================================================== */
async function loadMyProfile(){
  const {data}=await sb
    .from("profiles")
    .select("id,full_name,username,avatar_url,is_online")
    .eq("id",currentUser.id)
    .single();
  if(!data) return;
  myProfile=data;
}

/* ========================================================
   INLINE CHAT VIEW
   ======================================================== */
let cvPartnerId=null;
let cvPartner=null;
let cvMessages=[];
let cvChannel=null;
let cvStatusChannel=null;

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function openChat(userId){
  if(!userId||typeof userId!=="string"||!UUID_RE.test(userId)){
    console.warn("openChat: invalid userId",userId);
    return;
  }
  if(cvPartnerId===userId&&$("#chatView")?.classList.contains("open")) return; // already open
  vibrate(30);
  cvPartnerId=userId;
  cvMessages=[];
  cvPartner=null;

  // Reset UI
  $("#cvMessages").innerHTML="";
  $("#cvName").textContent="…";
  $("#cvStatus").textContent="Loading…";
  $("#cvStatus").className="cv-status";
  const av=$("#cvAvatar");
  av.style.background="linear-gradient(135deg,#a8c4f0,#1d4ed8)";
  av.innerHTML="";
  $("#cvInput").value="";
  toggleCvSend();

  // Slide in
  const view=$("#chatView");
  view.classList.add("open");
  document.body.style.overflow="hidden";

  // Push history state so Android back closes chat, not the tab
  pushChatHistory();

  // Load partner + messages
  loadCvPartner();
  loadCvMessages();

  // Realtime channel for this conversation.
  // Scope at the Postgres level to the partner's INSERTs only (Realtime
  // postgres_changes filter supports a single column). Own sends are handled
  // optimistically in cvSendText/cvSendImage, so we deliberately skip their
  // echo to avoid duplicate-render races (bug #6).
  if(cvChannel) sb.removeChannel(cvChannel);
  cvChannel=sb.channel("cv-"+[currentUser.id,userId].sort().join("-"))
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`sender_id=eq.${userId}`},async payload=>{
      const msg=payload.new;
      if(msg.receiver_id!==currentUser.id) return;
      if(cvMessages.some(m=>m.id===msg.id)) return;
      cvMessages.push(msg);
      renderCvMessages(false);
      const rows=$("#cvMessages").querySelectorAll(`.bubble-row.in`);
      const last=rows[rows.length-1];
      if(last) last.classList.add("animate");
      cvScrollToBottom(true);
      vibrate(30);
      await cvMarkRead();
    })
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"messages",filter:`sender_id=eq.${currentUser.id}`},payload=>{
      const updated=payload.new;
      if(updated.receiver_id!==cvPartnerId) return;
      const idx=cvMessages.findIndex(m=>m.id===updated.id);
      if(idx>-1){
        cvMessages[idx]=updated;
        const sl=$("#cvSeenLabel");
        if(sl&&updated.is_read) sl.classList.add("show");
      }
    })
    .subscribe();

  // Realtime: partner online status
  if(cvStatusChannel) sb.removeChannel(cvStatusChannel);
  cvStatusChannel=sb.channel("cv-status-"+userId)
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"profiles",filter:`id=eq.${userId}`},payload=>{
      if(cvPartner){
        cvPartner.is_online=payload.new.is_online;
        cvPartner.last_seen=payload.new.last_seen;
        updateCvStatus();
      }
    })
    .subscribe();
}

function closeChat(){
  vibrate(20);
  const view=$("#chatView");
  view.classList.remove("open");
  document.body.style.overflow="";
  if(cvChannel){sb.removeChannel(cvChannel);cvChannel=null;}
  if(cvStatusChannel){sb.removeChannel(cvStatusChannel);cvStatusChannel=null;}
  // refresh conversation list
  loadConversations();
}

$("#cvBack").addEventListener("click",closeChat);

async function loadCvPartner(){
  const {data}=await sb
    .from("profiles")
    .select("id,full_name,username,avatar_url,is_online,last_seen")
    .eq("id",cvPartnerId)
    .single();
  if(!data) return;
  cvPartner=data;

  const [bg,fg]=avatarColor(data.id);
  const initials=initialsOf(data.full_name||data.username);
  const av=$("#cvAvatar");
  av.style.background=`linear-gradient(135deg,${bg},${fg})`;
  if(data.avatar_url){
    av.innerHTML=`<img src="${data.avatar_url}" alt="${initials}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
  } else {
    av.innerHTML=`${initials}`;
  }

  $("#cvName").textContent=data.full_name||data.username||"Unknown";
  updateCvStatus();
}

function updateCvStatus(){
  if(!cvPartner) return;
  const el=$("#cvStatus");
  if(cvPartner.is_online){
    el.textContent="Online";el.className="cv-status online";
  } else {
    el.textContent=cvPartner.last_seen?"Last seen "+fmtLastSeen(cvPartner.last_seen):"Offline";
    el.className="cv-status";
  }
}

async function loadCvMessages(){
  // Fetch messages in either direction between the two users, then enforce
  // the scope in JS as a safety net against any PostgREST filter quirks.
  const {data,error}=await sb.from("messages")
    .select("*")
    .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${cvPartnerId}),and(sender_id.eq.${cvPartnerId},receiver_id.eq.${currentUser.id})`)
    .order("created_at",{ascending:true});
  if(error){console.error(error);return;}
  const me=currentUser.id, them=cvPartnerId;
  cvMessages=(data||[])
    .filter(m=>(m.sender_id===me&&m.receiver_id===them)||(m.sender_id===them&&m.receiver_id===me))
    .filter(m=>!m.deleted_for||!m.deleted_for.includes(me));
  renderCvMessages(true);
  await cvMarkRead();
}

async function cvMarkRead(){
  await sb.from("messages")
    .update({is_read:true})
    .eq("sender_id",cvPartnerId)
    .eq("receiver_id",currentUser.id)
    .eq("is_read",false);
  // Update local state in-place so the Seen indicator reflects the change
  // immediately, without waiting for the realtime UPDATE echo.
  for(const m of cvMessages){
    if(m.sender_id===cvPartnerId&&m.receiver_id===currentUser.id&&!m.is_read){
      m.is_read=true;
    }
  }
  const conv=conversations.find(c=>c.partner.id===cvPartnerId);
  if(conv) conv.unread=0;
  updateNotifDot();
}

function renderCvMessages(animate=false){
  const area=$("#cvMessages");
  if(cvMessages.length===0){
    area.innerHTML=`
      <div class="empty-msgs">
        <i class="ph ph-chat-circle-dots"></i>
        <p>No messages yet</p>
        <small>Say hello! 👋</small>
      </div>`;
    return;
  }

  const [bg,fg]=avatarColor(cvPartnerId);
  const initials=cvPartner?initialsOf(cvPartner.full_name||cvPartner.username):"?";
  const partnerAvatar=cvPartner?.avatar_url
    ?`<img src="${cvPartner.avatar_url}" alt="${initials}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
    :initials;

  // My avatar for outgoing bubbles
  const myInitials=myProfile?initialsOf(myProfile.full_name||myProfile.username):"Me";
  const [myBg,myFg]=myProfile?avatarColor(myProfile.id):["#a8c4f0","#1d4ed8"];
  const myAvatar=myProfile?.avatar_url
    ?`<img src="${myProfile.avatar_url}" alt="${myInitials}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
    :myInitials;

  let html="";
  let lastDate=null;
  let lastSenderId=null;

  cvMessages.forEach((msg,i)=>{
    const isOut=msg.sender_id===currentUser.id;
    const isNewDay=!lastDate||!sameDay(lastDate,msg.created_at);
    const isFirstInGroup=msg.sender_id!==lastSenderId;
    const animClass=animate?" animate":"";
    const groupClass=isFirstInGroup?" group-start":"";

    if(isNewDay){
      html+=`<div class="date-chip">${fmtDateChip(msg.created_at)}</div>`;
      lastDate=msg.created_at;
    }

    const showAvatar=isFirstInGroup;
    const avatarHtml=isOut
      ?`<div class="bubble-mini-avatar${showAvatar?" show":""}" style="background:linear-gradient(135deg,${myBg},${myFg})">${showAvatar?myAvatar:""}</div>`
      :`<div class="bubble-mini-avatar${showAvatar?" show":""}" style="background:linear-gradient(135deg,${bg},${fg})">${showAvatar?partnerAvatar:""}</div>`;

    let bubbleContent="";
    if(msg.type==="image"&&msg.media_url){
      const tickHtml=isOut
        ?`<i class="ph ${msg.is_read?"ph-checks img-tick read":"ph-check img-tick"}"></i>`
        :"";
      bubbleContent=`
        <div class="bubble-img-wrap">
          <img class="bubble-img" src="${msg.media_url}" alt="Photo"
            onload="this.classList.add('loaded')"
            onclick="cvOpenImg('${msg.media_url}')" />
          <div class="bubble-img-meta">
            <span class="bubble-time">${fmtTime(msg.created_at)}</span>
            ${tickHtml}
          </div>
        </div>`;
    } else if(msg.type==="voice"&&msg.media_url){
      const vid="vp-"+msg.id.replace(/[^a-z0-9]/gi,"");
      bubbleContent=`
        <div class="voice-bubble" id="${vid}">
          <button class="voice-play-btn" onclick="voiceBubbleToggle('${msg.media_url}','${vid}',this)">
            <i class="ph ph-play"></i>
          </button>
          <div class="voice-waveform">
            <input type="range" class="voice-scrubber" min="0" max="100" value="0"
              oninput="voiceBubbleScrub('${vid}',this.value)" />
            <span class="voice-duration" id="${vid}-dur">🎤 Voice</span>
          </div>
        </div>
        <div class="bubble-meta"><span class="bubble-time">${fmtTime(msg.created_at)}</span></div>`;
    } else {
      bubbleContent=`
        ${escHtml(msg.content||"")}
        <div class="bubble-meta"><span class="bubble-time">${fmtTime(msg.created_at)}</span></div>`;
    }

    html+=`
      <div class="bubble-row ${isOut?"out":"in"}${animClass}${groupClass}" data-id="${msg.id}" style="animation-delay:${animate?i*18:0}ms">
        ${avatarHtml}
        <div class="bubble${msg.type==="image"?" bubble-image":""}">
          ${bubbleContent}
        </div>
      </div>`;

    if(isOut&&i===cvMessages.length-1){
      const isRead=msg.is_read;
      html+=`<div class="seen-wrap"><span class="seen-label${isRead?" show":""}" id="cvSeenLabel">Seen</span></div>`;
    }

    lastSenderId=msg.sender_id;
  });

  area.innerHTML=html;
  cvScrollToBottom();
}

function cvScrollToBottom(smooth=false){
  const area=$("#cvMessages");
  area.scrollTo({top:area.scrollHeight,behavior:smooth?"smooth":"instant"});
}

/* ── Send message ── */
async function cvSendMessage(){
  const input=$("#cvInput");
  const text=input.value.trim();
  if(!text) return;

  input.value="";
  input.style.height="auto";
  input.blur();
  toggleCvSend();
  vibrate(25);

  const tempMsg={
    id:"temp-"+Date.now(),
    sender_id:currentUser.id,
    receiver_id:cvPartnerId,
    content:text,type:"text",
    media_url:null,is_read:false,
    created_at:new Date().toISOString(),
  };
  cvMessages.push(tempMsg);
  renderCvMessages(false);

  const rows=$("#cvMessages").querySelectorAll(".bubble-row.out");
  const last=rows[rows.length-1];
  if(last) last.classList.add("animate");
  cvScrollToBottom(true);

  const {data,error}=await sb.from("messages").insert({
    sender_id:currentUser.id,
    receiver_id:cvPartnerId,
    content:text,type:"text",
  }).select().single();

  if(error){cvMessages=cvMessages.filter(m=>m.id!==tempMsg.id);renderCvMessages(false);return;}
  const idx=cvMessages.findIndex(m=>m.id===tempMsg.id);
  if(idx>-1) cvMessages[idx]=data;
}

/* ── Send image (optional caption — WhatsApp style) ── */
async function cvSendImage(file, caption){
  if(!file) return;
  caption = (caption || "").trim() || null;
  vibrate(20);

  const ext=file.name.split(".").pop()||"jpg";
  const path=`chat-images/${currentUser.id}/${Date.now()}.${ext}`;
  const localUrl=URL.createObjectURL(file);

  const tempMsg={
    id:"temp-img-"+Date.now(),
    sender_id:currentUser.id,receiver_id:cvPartnerId,
    content:caption,type:"image",media_url:localUrl,
    is_read:false,created_at:new Date().toISOString(),
  };
  cvMessages.push(tempMsg);
  renderCvMessages(false);
  cvScrollToBottom(true);

  const rows=$("#cvMessages").querySelectorAll(".bubble-row.out");
  const last=rows[rows.length-1];
  if(last) last.classList.add("animate");

  const {error:upErr}=await sb.storage.from("chat-images").upload(path,file,{cacheControl:"3600",upsert:false});
  if(upErr){cvMessages=cvMessages.filter(m=>m.id!==tempMsg.id);renderCvMessages(false);return;}

  const {data:urlData}=sb.storage.from("chat-images").getPublicUrl(path);
  const {data,error}=await sb.from("messages").insert({
    sender_id:currentUser.id,receiver_id:cvPartnerId,
    content:caption,type:"image",media_url:urlData.publicUrl,
  }).select().single();

  if(error){cvMessages=cvMessages.filter(m=>m.id!==tempMsg.id);renderCvMessages(false);return;}
  const idx=cvMessages.findIndex(m=>m.id===tempMsg.id);
  if(idx>-1) cvMessages[idx]={ ...data, media_url: data.media_url || urlData.publicUrl };
  requestAnimationFrame(()=>setTimeout(()=>URL.revokeObjectURL(localUrl),500));
}
function toggleCvSend(){
  const hasText=$("#cvInput").value.trim().length>0;
  const sendBtn=$("#cvSend");
  const micBtn=$("#cvMic");
  if(hasText){
    sendBtn.classList.add("show");
    micBtn.style.opacity="0";
    micBtn.style.transform="scale(.5) rotate(15deg)";
    micBtn.style.pointerEvents="none";
  } else {
    sendBtn.classList.remove("show");
    micBtn.style.opacity="1";
    micBtn.style.transform="scale(1) rotate(0deg)";
    micBtn.style.pointerEvents="auto";
  }
}

function cvAutoGrow(){
  const t=$("#cvInput");
  t.style.height="auto";
  t.style.height=Math.min(t.scrollHeight,130)+"px";
}

$("#cvInput").addEventListener("input",()=>{cvAutoGrow();toggleCvSend();});
$("#cvInput").addEventListener("keydown",e=>{
  if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();cvSendMessage();}
});
$("#cvSend").addEventListener("click",cvSendMessage);
$("#cvAttach").addEventListener("click",()=>{$("#cvFileInput").click();vibrate(15);});
$("#cvFileInput").addEventListener("change",e=>{
  const file=e.target.files?.[0];
  if(file) openImageCaptionModal(file);
  e.target.value="";
});

/* ── WhatsApp-style image caption modal ── */
let _icFile = null, _icUrl = null;
function openImageCaptionModal(file){
  _icFile = file;
  if(_icUrl) URL.revokeObjectURL(_icUrl);
  _icUrl = URL.createObjectURL(file);
  document.getElementById("icImg").src = _icUrl;
  document.getElementById("icCap").value = "";
  document.getElementById("icOverlay").classList.add("show");
  setTimeout(()=>document.getElementById("icCap").focus(), 200);
}
function closeImageCaptionModal(){
  document.getElementById("icOverlay").classList.remove("show");
  if(_icUrl){ URL.revokeObjectURL(_icUrl); _icUrl=null; }
  _icFile = null;
}
document.getElementById("icClose").addEventListener("click", closeImageCaptionModal);
document.getElementById("icCap").addEventListener("input", function(){
  this.style.height="auto"; this.style.height=Math.min(this.scrollHeight,130)+"px";
});
document.getElementById("icSend").addEventListener("click", async ()=>{
  if(!_icFile) return;
  const cap = document.getElementById("icCap").value.trim();
  const file = _icFile;
  closeImageCaptionModal();
  await cvSendImage(file, cap);
});


/* ══════════════════════════════════════════════════
   VOICE RECORDING ENGINE (tap-to-record, orbit UI)
   ══════════════════════════════════════════════════ */
let _recState='idle'; // 'idle' | 'recording' | 'preview'
let _voiceRecorder=null;
let _voiceChunks=[];
let _voiceBlob=null;
let _voiceStartTime=0;
let _voiceTimerInterval=null;
let _voiceDuration=0;
let _previewAudio=null;
let _previewPlaying=false;

function _fmtDur(s){
  s=Math.floor(s);
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
}

function _setOrbitUI(active){
  const ring=$("#cvOrbitRing");
  const ind=$("#cvRecIndicator");
  if(active){
    ring.classList.add("active");
    ind.classList.add("show");
    $("#cvInput").style.visibility="hidden";
    $("#cvAttach").style.visibility="hidden";
    $("#cvInputBar").classList.add("recording-active");
  } else {
    ring.classList.remove("active");
    ind.classList.remove("show");
    $("#cvInput").style.visibility="";
    $("#cvAttach").style.visibility="";
    $("#cvInputBar").classList.remove("recording-active");
  }
}

async function voiceStartRecording(){
  if(_recState!=='idle') return;
  try {
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    _voiceChunks=[];
    _voiceBlob=null;
    _voiceStartTime=Date.now();
    _recState='recording';

    _voiceRecorder=new MediaRecorder(stream,{
      mimeType:MediaRecorder.isTypeSupported("audio/webm")?"audio/webm":"audio/ogg"
    });
    _voiceRecorder.ondataavailable=e=>{if(e.data.size>0) _voiceChunks.push(e.data);};
    _voiceRecorder.onstop=()=>{
      stream.getTracks().forEach(t=>t.stop());
      _voiceBlob=new Blob(_voiceChunks,{type:_voiceRecorder.mimeType});
      _voiceDuration=(Date.now()-_voiceStartTime)/1000;
    };
    _voiceRecorder.start(100);

    $("#cvMic").classList.add("recording");
    _setOrbitUI(true);
    $("#cvRecTimer").textContent="0:00";

    _voiceTimerInterval=setInterval(()=>{
      const s=(Date.now()-_voiceStartTime)/1000;
      $("#cvRecTimer").textContent=_fmtDur(s);
    },300);

    vibrate(35);
  } catch(err){
    showToast("Mic Error","Microphone permission denied","bad");
  }
}

function _stopRecorder(cb){
  if(!_voiceRecorder){cb();return;}
  clearInterval(_voiceTimerInterval);
  _voiceTimerInterval=null;
  const orig=_voiceRecorder.onstop;
  _voiceRecorder.onstop=()=>{orig();cb();};
  _voiceRecorder.stop();
  _voiceRecorder=null;
}

function voiceDiscard(){
  _stopRecorder(()=>{
    voiceReset();
    vibrate(20);
  });
}

function voiceStopToPreview(){
  _stopRecorder(()=>{
    if(!_voiceBlob||_voiceDuration<0.5){
      voiceReset();
      showToast("Too short","Record a bit longer","");
      return;
    }
    _recState='preview';
    $("#cvMic").classList.remove("recording");
    // build audio
    if(_previewAudio){_previewAudio.pause();_previewAudio=null;}
    _previewAudio=new Audio(URL.createObjectURL(_voiceBlob));
    _previewAudio.onended=()=>{
      _previewPlaying=false;
      $("#cvOrbitPlayIcon").className="ph ph-play";
      $("#cvOrbitPlay").classList.remove("playing");
    };
    // auto-play on preview
    _previewAudio.play().catch(()=>{});
    _previewPlaying=true;
    $("#cvOrbitPlayIcon").className="ph ph-pause";
    $("#cvOrbitPlay").classList.add("playing");
  });
}

function voiceTogglePlay(){
  if(_recState==='recording'){
    voiceStopToPreview();
    return;
  }
  if(_recState!=='preview'||!_previewAudio) return;
  if(_previewPlaying){
    _previewAudio.pause();
    _previewPlaying=false;
    $("#cvOrbitPlayIcon").className="ph ph-play";
    $("#cvOrbitPlay").classList.remove("playing");
  } else {
    _previewAudio.play().catch(()=>{});
    _previewPlaying=true;
    $("#cvOrbitPlayIcon").className="ph ph-pause";
    $("#cvOrbitPlay").classList.add("playing");
  }
}

function voiceReset(){
  _recState='idle';
  _voiceBlob=null;_voiceChunks=[];_voiceDuration=0;
  if(_previewAudio){_previewAudio.pause();URL.revokeObjectURL(_previewAudio.src);_previewAudio=null;}
  _previewPlaying=false;
  $("#cvMic").classList.remove("recording");
  $("#cvOrbitPlay").classList.remove("playing");
  $("#cvOrbitPlayIcon").className="ph ph-play";
  _setOrbitUI(false);
}

async function voiceSendCurrent(){
  if(_recState==='recording'){
    _stopRecorder(async()=>{
      if(!_voiceBlob||_voiceDuration<0.5){
        voiceReset();
        showToast("Too short","Record a bit longer","");
        return;
      }
      const blob=_voiceBlob; const dur=_voiceDuration;
      _voiceBlob=null; _recState='idle';
      _setOrbitUI(false);
      $("#cvMic").classList.remove("recording");
      await _doSendVoice(blob,dur);
    });
  } else if(_recState==='preview'){
    const blob=_voiceBlob; const dur=_voiceDuration;
    voiceReset();
    await _doSendVoice(blob,dur);
  }
}

async function _doSendVoice(blob,dur){
  if(!blob) return;
  vibrate(25);
  const ext=blob.type.includes("webm")?"webm":"ogg";
  const path=`voice-messages/${currentUser.id}/${Date.now()}.${ext}`;
  const localUrl=URL.createObjectURL(blob);

  const tempMsg={
    id:"temp-voice-"+Date.now(),
    sender_id:currentUser.id,receiver_id:cvPartnerId,
    content:null,type:"voice",media_url:localUrl,
    duration:dur,is_read:false,created_at:new Date().toISOString(),
  };
  cvMessages.push(tempMsg);
  renderCvMessages(false);
  cvScrollToBottom(true);

  const rows=$("#cvMessages").querySelectorAll(".bubble-row.out");
  const last=rows[rows.length-1];
  if(last) last.classList.add("animate");

  const {error:upErr}=await sb.storage.from("voice-messages").upload(path,blob,{
    cacheControl:"3600",upsert:false,contentType:blob.type
  });
  if(upErr){
    cvMessages=cvMessages.filter(m=>m.id!==tempMsg.id);
    renderCvMessages(false);
    showToast("Error","Failed to upload voice message","bad");
    return;
  }

  const {data:urlData}=sb.storage.from("voice-messages").getPublicUrl(path);
  const {data,error}=await sb.from("messages").insert({
    sender_id:currentUser.id,receiver_id:cvPartnerId,
    content:null,type:"voice",media_url:urlData.publicUrl,
  }).select().single();

  if(error){cvMessages=cvMessages.filter(m=>m.id!==tempMsg.id);renderCvMessages(false);return;}
  const idx=cvMessages.findIndex(m=>m.id===tempMsg.id);
  if(idx>-1) cvMessages[idx]=data;
  requestAnimationFrame(()=>setTimeout(()=>URL.revokeObjectURL(localUrl),500));
}

/* ── Mic tap: coming soon ── */
$("#cvMic").addEventListener("click",()=>{
  vibrate(15);
  showToast("Coming Soon","Voice messages are coming soon","");
});

/* ── Orbit button handlers ── */
$("#cvOrbitDelete").addEventListener("click",()=>voiceDiscard());
$("#cvOrbitPlay").addEventListener("click",()=>voiceTogglePlay());
$("#cvOrbitSend").addEventListener("click",()=>voiceSendCurrent());

/* ── Voice bubble playback ── */
const _bubbleAudios={};

function voiceBubbleToggle(url,vid,btn){
  // stop any other playing audio
  Object.entries(_bubbleAudios).forEach(([k,a])=>{
    if(k!==vid&&!a.paused){
      a.pause();
      const otherBtn=document.querySelector(`#${k} .voice-play-btn i`);
      if(otherBtn) otherBtn.className="ph ph-play";
    }
  });

  if(!_bubbleAudios[vid]){
    const a=new Audio(url);
    _bubbleAudios[vid]=a;

    a.onloadedmetadata=()=>{
      const dur=document.getElementById(vid+"-dur");
      if(dur) dur.textContent=_fmtDur(a.duration);
    };
    a.ontimeupdate=()=>{
      if(!a.duration) return;
      const scrubber=document.querySelector(`#${vid} .voice-scrubber`);
      if(scrubber) scrubber.value=(a.currentTime/a.duration)*100;
      const dur=document.getElementById(vid+"-dur");
      if(dur) dur.textContent=_fmtDur(a.duration-a.currentTime);
    };
    a.onended=()=>{
      const i=btn.querySelector("i");
      if(i) i.className="ph ph-play";
      const scrubber=document.querySelector(`#${vid} .voice-scrubber`);
      if(scrubber) scrubber.value=0;
      const dur=document.getElementById(vid+"-dur");
      if(dur && a.duration) dur.textContent=_fmtDur(a.duration);
    };
  }

  const audio=_bubbleAudios[vid];
  const icon=btn.querySelector("i");
  if(audio.paused){
    audio.play();
    if(icon) icon.className="ph ph-pause";
  } else {
    audio.pause();
    if(icon) icon.className="ph ph-play";
  }
}

function voiceBubbleScrub(vid,pct){
  const audio=_bubbleAudios[vid];
  if(audio&&audio.duration) audio.currentTime=audio.duration*(pct/100);
}

function cvNotReady(){ vibrate(20); }

/* ── Full image viewer ── */
function cvOpenImg(url){
  $("#imgOverlayImg").src=url;
  $("#imgOverlay").classList.add("show");
  vibrate(20);
}
$("#imgOverlayClose").addEventListener("click",()=>{
  $("#imgOverlay").classList.remove("show");
  setTimeout(()=>{$("#imgOverlayImg").src="";},300);
});
$("#imgOverlay").addEventListener("click",e=>{
  if(e.target===$("#imgOverlay")) $("#imgOverlayClose").click();
});

/* ========================================================
   MENU SHEET
   ======================================================== */
function openMenu(){$("#menuOverlay").classList.add("show");$("#menuSheet").classList.add("show");}
function closeMenu(){$("#menuOverlay").classList.remove("show");$("#menuSheet").classList.remove("show");}
$("#menuOverlay").addEventListener("click",closeMenu);
makeSheetDraggable($("#menuSheet"), $("#menuSheet").querySelector(".menu-handle"), closeMenu, {baseTransform:"translateX(-50%) "});

/* ========================================================
   CHAT ROW CLICK — handles selection mode vs open chat
   ======================================================== */
function handleChatRowClick(e, userId){
  if(selectionMode){
    e.stopPropagation();
    toggleSelectChat(userId);
  } else {
    openChat(userId);
  }
}

/* ========================================================
   BULK SELECTION MODE
   ======================================================== */
let selectionMode=false;
let selectedChats=new Set();

function enterSelectionMode(userId){
  selectionMode=true;
  selectedChats.clear();
  selectedChats.add(userId);
  updateSelectionUI();
  $("#selTopbar").classList.add("show");
  vibrate(35);
}

function exitSelectionMode(){
  selectionMode=false;
  selectedChats.clear();
  document.querySelectorAll(".chat-row.selected").forEach(el=>el.classList.remove("selected"));
  $("#selTopbar").classList.remove("show");
}

function toggleSelectChat(userId){
  const el=document.getElementById("ci-"+userId);
  if(!el) return;
  if(selectedChats.has(userId)){
    selectedChats.delete(userId);
    el.classList.remove("selected");
  } else {
    selectedChats.add(userId);
    el.classList.add("selected");
  }
  if(selectedChats.size===0) exitSelectionMode();
  else updateSelectionUI();
}

function updateSelectionUI(){
  const n=selectedChats.size;
  $("#selCount").textContent=n+(n===1?" selected":" selected");
  document.querySelectorAll(".chat-row[id^='ci-']").forEach(el=>{
    const id=el.id.replace("ci-","");
    el.classList.toggle("selected",selectedChats.has(id));
  });
}

$("#selBack").addEventListener("click",exitSelectionMode);

// Long-press on chat rows to open the row action sheet (works inside list)
(function setupChatRowLongPress(){
  let _lt=null;
  let _startX=0,_startY=0;
  const list=document.getElementById("chatList");

  list.addEventListener("touchstart",e=>{
    const row=e.target.closest(".chat-row[id^='ci-']");
    if(!row||selectionMode) return;
    // Don't trigger if the dots button was tapped
    if(e.target.closest(".c-dots-btn")) return;
    _startX=e.touches[0].clientX;
    _startY=e.touches[0].clientY;
    const userId=row.id.replace("ci-","");
    const conv=conversations.find(c=>c.partner.id===userId);
    const name=(conv?.partner.full_name||conv?.partner.username||"Unknown");
    _lt=setTimeout(()=>{
      _lt=null;
      vibrate(35);
      openRowActionSheet({stopPropagation:()=>{}},userId,name);
    },480);
  },{passive:true});
  list.addEventListener("touchmove",e=>{
    if(!_lt) return;
    const dx=Math.abs(e.touches[0].clientX-_startX);
    const dy=Math.abs(e.touches[0].clientY-_startY);
    if(dx>8||dy>8){clearTimeout(_lt);_lt=null;}
  },{passive:true});
  list.addEventListener("touchend",()=>{if(_lt){clearTimeout(_lt);_lt=null;}},{passive:true});
  list.addEventListener("touchcancel",()=>{if(_lt){clearTimeout(_lt);_lt=null;}},{passive:true});
})();

/* ── 3-dot (More) button inside chat view opens context sheet ── */
(function(){
  const btn=document.getElementById("cvMoreBtn");
  if(!btn) return;
  btn.addEventListener("click",()=>{
    if(!cvPartnerId) return;
    const conv=conversations.find(c=>c.partner.id===cvPartnerId);
    const name=cvPartner?.full_name||cvPartner?.username||conv?.partner?.full_name||"User";
    openCvContextSheet(cvPartnerId,name);
    vibrate(20);
  });
})();

/* ── Chat-view context sheet (3-dot inside chat) ── */
let _cvCtxPartnerId=null;
let _cvCtxPartnerName=null;

function openCvContextSheet(userId,name){
  _cvCtxPartnerId=userId;
  _cvCtxPartnerName=name;
  // Update mute label
  const isMuted=_mutedChats&&_mutedChats.has(userId);
  const muteLabel=document.getElementById("cvCtxMuteLabel");
  if(muteLabel) muteLabel.textContent=isMuted?"Unmute":"Mute";
  document.getElementById("cvContextOverlay").classList.add("show");
  document.getElementById("cvContextSheet").classList.add("show");
}
function closeCvContextSheet(){
  document.getElementById("cvContextOverlay").classList.remove("show");
  document.getElementById("cvContextSheet").classList.remove("show");
}
document.getElementById("cvContextOverlay").addEventListener("click",closeCvContextSheet);
makeSheetDraggable(document.getElementById("cvContextSheet"), document.querySelector("#cvContextSheet .menu-handle"), closeCvContextSheet, {baseTransform:"translateX(-50%) "});

document.getElementById("cvCtxViewProfile").addEventListener("click",()=>{
  closeCvContextSheet();
  if(_cvCtxPartnerId&&cvPartner) openPartnerProfileSheetForUser(cvPartner);
  else if(_cvCtxPartnerId){
    const conv=conversations.find(c=>c.partner.id===_cvCtxPartnerId);
    if(conv) openPartnerProfileSheetForUser(conv.partner);
  }
});

document.getElementById("cvCtxMute").addEventListener("click",()=>{
  closeCvContextSheet();
  if(!_cvCtxPartnerId) return;
  const isMuted=_mutedChats.has(_cvCtxPartnerId);
  if(isMuted){
    _mutedChats.delete(_cvCtxPartnerId);
    _saveMuted();
    showToast("Unmuted",`${_cvCtxPartnerName} unmuted`,"good");
  } else {
    _mutedChats.add(_cvCtxPartnerId);
    _saveMuted();
    showToast("Muted",`${_cvCtxPartnerName} muted`,"good");
  }
  renderList();
});

document.getElementById("cvCtxDelete").addEventListener("click",async()=>{
  closeCvContextSheet();
  if(!_cvCtxPartnerId) return;
  closeChat();
  // Remove from list
  conversations=conversations.filter(c=>c.partner.id!==_cvCtxPartnerId);
  renderList();
  showToast("Deleted","Conversation deleted","good");
  // Delete from DB
  try{
    await sb.from("messages").delete()
      .eq("sender_id", currentUser.id).eq("receiver_id", _cvCtxPartnerId);
    await sb.from("messages").delete()
      .eq("sender_id", _cvCtxPartnerId).eq("receiver_id", currentUser.id);
  }catch(e){ console.error("Delete chat error",e); }
});

document.getElementById("cvCtxBlock").addEventListener("click",()=>{
  closeCvContextSheet();
  if(!_cvCtxPartnerId) return;
  _raPartnerId=_cvCtxPartnerId;
  _raPartnerName=_cvCtxPartnerName;
  setTimeout(()=>openBlockSheet(_raPartnerName,_raPartnerId),250);
});

// Bulk action buttons (UI only — toast for now)
$("#selMuteBtn").addEventListener("click",()=>{
  showToast("Muted",`${selectedChats.size} chat(s) muted`,"good");
  exitSelectionMode();
});
$("#selPinBtn").addEventListener("click",()=>{
  if(selectedChats.size>3){showToast("Limit","Max 3 pinned chats","warning");return;}
  showToast("Pinned",`${selectedChats.size} chat(s) pinned`,"good");
  exitSelectionMode();
});
$("#selDeleteBtn").addEventListener("click",()=>{
  showToast("Deleted",`${selectedChats.size} chat(s) deleted`,"good");
  exitSelectionMode();
});

/* ========================================================
   CHAT ROW ACTION SHEET (··· menu)
   ======================================================== */
let _raPartnerId=null;
let _raPartnerName=null;

function openRowActionSheet(e, userId, userName){
  e.stopPropagation();
  if(selectionMode) return;
  _raPartnerId=userId;
  _raPartnerName=userName;
  $("#raBtnBlockLabel").textContent=`Block ${userName}`;
  $("#raBtnReportLabel").textContent=`Report ${userName}`;
  // Update mute label
  const isMuted=_mutedChats.has(userId);
  const muteBtn=document.getElementById("raBtnMute");
  if(muteBtn) muteBtn.innerHTML=`<i class="ph ph-bell-${isMuted?"":"slash"}"></i> ${isMuted?"Unmute":"Mute"}`;
  // Update mark-unread label
  const mrBtn=document.getElementById("raBtnMarkUnread");
  const conv=conversations.find(c=>c.partner.id===userId);
  if(mrBtn) mrBtn.innerHTML=`<i class="ph ph-chat-circle-dots"></i> ${(conv&&conv.unread>0)?"Mark as Read":"Mark as Unread"}`;
  $("#rowActionOverlay").classList.add("show");
  $("#rowActionSheet").classList.add("show");
  vibrate(20);
}

function closeRowActionSheet(){
  $("#rowActionOverlay").classList.remove("show");
  $("#rowActionSheet").classList.remove("show");
}

$("#rowActionOverlay").addEventListener("click",closeRowActionSheet);
makeSheetDraggable($("#rowActionSheet"), $("#rowActionSheet").querySelector(".menu-handle"), closeRowActionSheet, {baseTransform:"translateX(-50%) "});

$("#raBtnViewProfile").addEventListener("click",()=>{
  closeRowActionSheet();
  if(_raPartnerId){
    const conv=conversations.find(c=>c.partner.id===_raPartnerId);
    const partner=conv?conv.partner:{id:_raPartnerId,full_name:_raPartnerName};
    openPartnerProfileSheetForUser(partner);
  }
});
$("#raBtnMute").addEventListener("click",()=>{
  closeRowActionSheet();
  if(!_raPartnerId) return;
  const isMuted=_mutedChats.has(_raPartnerId);
  if(isMuted){
    _mutedChats.delete(_raPartnerId);
    _saveMuted();
    const row=document.getElementById("ci-"+_raPartnerId);
    if(row) row.classList.remove("muted");
    showToast("Unmuted",`${_raPartnerName} unmuted`,"good");
  } else {
    _mutedChats.add(_raPartnerId);
    _saveMuted();
    const row=document.getElementById("ci-"+_raPartnerId);
    if(row) row.classList.add("muted");
    showToast("Muted",`${_raPartnerName} muted`,"good");
  }
});
$("#raBtnMarkUnread").addEventListener("click",async()=>{
  closeRowActionSheet();
  if(!_raPartnerId) return;
  const conv=conversations.find(c=>c.partner.id===_raPartnerId);
  if(conv){
    if(conv.unread>0){
      // Mark as read
      conv.unread=0;
      renderList();
      updateNotifDot();
      await sb.from("messages").update({is_read:true})
        .eq("sender_id",_raPartnerId).eq("receiver_id",currentUser.id).eq("is_read",false);
      showToast("Marked","Marked as read","good");
    } else {
      // Mark as unread: flip is_read=false on the latest incoming message so
      // the next loadConversations() (or a realtime UPDATE) doesn't reset us.
      const {data:latest}=await sb.from("messages")
        .select("id")
        .eq("sender_id",_raPartnerId)
        .eq("receiver_id",currentUser.id)
        .order("created_at",{ascending:false})
        .limit(1)
        .maybeSingle();
      if(latest?.id){
        await sb.from("messages").update({is_read:false}).eq("id",latest.id);
      }
      conv.unread=Math.max(1,conv.unread||0)+(latest?0:1);
      renderList();
      updateNotifDot();
      showToast("Marked","Marked as unread","good");
    }
  }
});
$("#raBtnPin").addEventListener("click",()=>{
  closeRowActionSheet();
  showToast("Pinned","Chat pinned to top","good");
});
$("#raBtnDelete").addEventListener("click",async()=>{
  closeRowActionSheet();
  if(!_raPartnerId) return;
  // If the chat being deleted is currently open, close it first so we tear
  // down its realtime subscription and don't render stale messages.
  if(cvPartnerId===_raPartnerId) closeChat();
  // Optimistic UI: remove from list immediately
  const el=document.getElementById("ci-"+_raPartnerId);
  if(el) el.remove();
  conversations=conversations.filter(c=>c.partner.id!==_raPartnerId);
  const countEl=$("#chatsCount");
  if(countEl) countEl.textContent=conversations.length+(conversations.length===1?" chat":" chats");
  updateNotifDot();
  showToast("Deleted","Conversation deleted","good");
  // Delete all messages between current user and partner
  try{
    await sb.from("messages").delete()
      .eq("sender_id", currentUser.id).eq("receiver_id", _raPartnerId);
    await sb.from("messages").delete()
      .eq("sender_id", _raPartnerId).eq("receiver_id", currentUser.id);
  }catch(e){ console.error("Delete chat error",e); }
});

/* ========================================================
   BLOCK USER
   ======================================================== */
function openBlockSheet(name, userId){
  _raPartnerId=userId||_raPartnerId;
  _raPartnerName=name||_raPartnerName;
  $("#blockSheetTitle").textContent=`Block ${_raPartnerName}?`;
  $("#blockOverlay").classList.add("show");
  $("#blockSheet").classList.add("show");
}
function closeBlockSheet(){
  $("#blockOverlay").classList.remove("show");
  $("#blockSheet").classList.remove("show");
}
$("#raBtnBlock").addEventListener("click",()=>{
  closeRowActionSheet();
  setTimeout(()=>openBlockSheet(_raPartnerName,_raPartnerId),250);
});
$("#blockOverlay").addEventListener("click",closeBlockSheet);
makeSheetDraggable($("#blockSheet"), $("#blockSheet").querySelector(".menu-handle"), closeBlockSheet, {baseTransform:"translateX(-50%) "});
$("#blockCancelBtn").addEventListener("click",closeBlockSheet);
$("#blockConfirmBtn").addEventListener("click", async ()=>{
  closeBlockSheet();
  // Always show success immediately (optimistic)
  showToast("Blocked",`${_raPartnerName} has been blocked`,"good");
  // Remove from list visually
  const el=document.getElementById("ci-"+_raPartnerId);
  if(el) el.remove();
  conversations=conversations.filter(c=>c.partner.id!==_raPartnerId);
  const countEl=$("#chatsCount");
  if(countEl) countEl.textContent=conversations.length+(conversations.length===1?" chat":" chats");
  updateNotifDot();
  // Write to Supabase in background — failure is silent
  try{
    await sb.from("blocked_users").upsert({
      blocker_id: currentUser.id,
      blocked_id: _raPartnerId
    }, { onConflict: "blocker_id,blocked_id" });
  }catch(e){ console.error("Block write failed", e); }
});

/* ========================================================
   REPORT USER
   ======================================================== */
let _reportReason=null;

function openReportSheet(){
  _reportReason=null;
  $("#reportSheetTitle").textContent=`Report ${_raPartnerName}`;
  $("#reportNote").value="";
  $("#reportSubmitBtn").disabled=true;
  document.querySelectorAll(".report-reason-item").forEach(el=>el.classList.remove("selected"));
  $("#reportOverlay").classList.add("show");
  $("#reportSheet").classList.add("show");
}
function closeReportSheet(){
  $("#reportOverlay").classList.remove("show");
  $("#reportSheet").classList.remove("show");
}
$("#raBtnReport").addEventListener("click",()=>{
  closeRowActionSheet();
  setTimeout(openReportSheet,250);
});
$("#reportOverlay").addEventListener("click",closeReportSheet);
makeSheetDraggable($("#reportSheet"), $("#reportSheet").querySelector(".menu-handle"), closeReportSheet, {baseTransform:"translateX(-50%) "});

document.querySelectorAll(".report-reason-item").forEach(el=>{
  el.addEventListener("click",()=>{
    document.querySelectorAll(".report-reason-item").forEach(r=>r.classList.remove("selected"));
    el.classList.add("selected");
    _reportReason=el.dataset.reason;
    $("#reportSubmitBtn").disabled=false;
  });
});

function closeAlsoBlockSheet(){
  $("#alsoBlockOverlay").classList.remove("show");
  $("#alsoBlockSheet").classList.remove("show");
}
$("#reportSubmitBtn").addEventListener("click",()=>{
  closeReportSheet();
  showToast("Reported","Report submitted. Thank you.","good");
  // Ask if also block
  setTimeout(()=>{
    $("#alsoBlockOverlay").classList.add("show");
    $("#alsoBlockSheet").classList.add("show");
  },400);
});
$("#alsoBlockOverlay").addEventListener("click",closeAlsoBlockSheet);
makeSheetDraggable($("#alsoBlockSheet"), $("#alsoBlockSheet").querySelector(".menu-handle"), closeAlsoBlockSheet, {baseTransform:"translateX(-50%) "});
$("#alsoBlockNoBtn").addEventListener("click",closeAlsoBlockSheet);
$("#alsoBlockYesBtn").addEventListener("click", async ()=>{
  closeAlsoBlockSheet();
  // Always show success immediately
  showToast("Blocked",`${_raPartnerName} has been blocked`,"good");
  const el=document.getElementById("ci-"+_raPartnerId);
  if(el) el.remove();
  conversations=conversations.filter(c=>c.partner.id!==_raPartnerId);
  updateNotifDot();
  try{
    await sb.from("blocked_users").upsert({
      blocker_id: currentUser.id,
      blocked_id: _raPartnerId
    }, { onConflict: "blocker_id,blocked_id" });
  }catch(e){ console.error("Block write failed", e); }
});

/* ========================================================
   MESSAGE SELECTION MODE (inside chat)
   ======================================================== */
let msgSelMode=false;
let selectedMsgs=new Set();

function enterMsgSelMode(msgId){
  msgSelMode=true;
  selectedMsgs.clear();
  selectedMsgs.add(msgId);
  updateMsgSelUI();
  vibrate(35);
}

function hideBubbleQuickBar(){/* no-op placeholder */}
function exitMsgSelMode(){
  msgSelMode=false;
  selectedMsgs.clear();
  document.querySelectorAll(".bubble-row.msg-selected").forEach(el=>el.classList.remove("msg-selected"));
  $("#cvHeaderSel").classList.remove("show");
  $("#cvHeader").style.opacity="1";
  $("#cvHeader").style.pointerEvents="auto";
  hideBubbleQuickBar();
}

function toggleMsgSel(msgId){
  const el=document.querySelector(`.bubble-row[data-id="${msgId}"]`);
  if(!el) return;
  if(selectedMsgs.has(msgId)){
    selectedMsgs.delete(msgId);
    el.classList.remove("msg-selected");
  } else {
    selectedMsgs.add(msgId);
    el.classList.add("msg-selected");
  }
  if(selectedMsgs.size===0) exitMsgSelMode();
  else updateMsgSelUI();
}

function copySelectedMsgs(){
  const texts=[];
  selectedMsgs.forEach(id=>{
    const msg=cvMessages.find(m=>m.id===id);
    if(msg?.content) texts.push(msg.content);
  });
  if(texts.length) navigator.clipboard?.writeText(texts.join("\n")).catch(()=>{});
  exitMsgSelMode();
  showToast("Copied","Message(s) copied","good");
}

function updateMsgSelUI(){
  const n=selectedMsgs.size;
  const selEl=document.getElementById("cvHeaderSel");
  if(!selEl) return;
  selEl.querySelector(".msg-sel-count").textContent=n+(n===1?" selected":" selected");
  selEl.classList.add("show");
  $("#cvHeader").style.opacity="0";
  $("#cvHeader").style.pointerEvents="none";
  document.querySelectorAll(".bubble-row").forEach(el=>{
    el.classList.toggle("msg-selected",selectedMsgs.has(el.dataset.id));
  });
}

/* ========================================================
   FORWARD MESSAGE
   Lists everyone the user follows or is followed by, lets them
   pick one, then jumps to that chat. Text gets pasted into the
   compose box (ready to review/send); photos get re-sent right
   away since there's nothing meaningful to "paste" for an image.
   ======================================================== */
let _fwdMsgIds=[];
let _fwdContactsCache=null;

async function loadFwdContacts(){
  if(_fwdContactsCache) return _fwdContactsCache;
  try{
    const [{data:following},{data:followers}]=await Promise.all([
      sb.from("follows").select("following_id").eq("follower_id",currentUser.id),
      sb.from("follows").select("follower_id").eq("following_id",currentUser.id)
    ]);
    const ids=new Set();
    (following||[]).forEach(r=>ids.add(r.following_id));
    (followers||[]).forEach(r=>ids.add(r.follower_id));
    ids.delete(currentUser.id);
    if(ids.size===0){ _fwdContactsCache=[]; return _fwdContactsCache; }
    const {data:profiles}=await sb.from("profiles")
      .select("id,full_name,username,avatar_url")
      .in("id",[...ids]);
    _fwdContactsCache=profiles||[];
  }catch(e){
    console.error("loadFwdContacts failed",e);
    _fwdContactsCache=[];
  }
  return _fwdContactsCache;
}

function renderFwdContacts(list){
  const wrap=document.getElementById("fwdContactList");
  if(!list||list.length===0){
    wrap.innerHTML=`<div class="fwd-empty">No contacts yet — follow someone (or get a follower) to forward messages.</div>`;
    return;
  }
  wrap.innerHTML=list.map(p=>{
    const initials=initialsOf(p.full_name||p.username);
    const [bg,fg]=avatarColor(p.id);
    const avatarHtml=p.avatar_url?`<img src="${p.avatar_url}" alt="" />`:initials;
    return `<div class="fwd-contact-row" data-id="${p.id}">
      <div class="fwd-contact-avatar" style="background:linear-gradient(135deg,${bg},${fg});">${avatarHtml}</div>
      <div>
        <div class="fwd-contact-name">${p.full_name||p.username||"NovaUser"}</div>
        <div class="fwd-contact-sub">@${p.username||"user"}</div>
      </div>
    </div>`;
  }).join("");
  wrap.querySelectorAll(".fwd-contact-row").forEach(row=>{
    row.addEventListener("click",()=>forwardMessagesToUser(row.dataset.id,_fwdMsgIds));
  });
}

async function openForwardSheet(msgIds){
  _fwdMsgIds=msgIds;
  document.getElementById("fwdContactList").innerHTML=`<div class="fwd-empty">Loading…</div>`;
  document.getElementById("fwdOverlay").classList.add("show");
  document.getElementById("fwdSheet").classList.add("show");
  vibrate(30);
  const contacts=await loadFwdContacts();
  renderFwdContacts(contacts);
}
function closeForwardSheet(){
  document.getElementById("fwdOverlay").classList.remove("show");
  document.getElementById("fwdSheet").classList.remove("show");
}
document.getElementById("fwdOverlay").addEventListener("click",closeForwardSheet);
makeSheetDraggable(document.getElementById("fwdSheet"), document.querySelector("#fwdSheet .menu-handle"), closeForwardSheet, {baseTransform:"translateX(-50%) "});

/* Re-send an image to a (possibly different) chat — reuses the existing
   public media_url instead of re-uploading the file. */
async function cvForwardImage(targetUserId,mediaUrl){
  const tempMsg={
    id:"temp-fwd-"+Date.now()+Math.random().toString(36).slice(2,6),
    sender_id:currentUser.id,receiver_id:targetUserId,
    content:null,type:"image",media_url:mediaUrl,
    is_read:false,created_at:new Date().toISOString(),
  };
  cvMessages.push(tempMsg);
  if(cvPartnerId===targetUserId) renderCvMessages(false);

  const {data,error}=await sb.from("messages").insert({
    sender_id:currentUser.id,receiver_id:targetUserId,
    content:null,type:"image",media_url:mediaUrl,
  }).select().single();

  if(error){
    cvMessages=cvMessages.filter(m=>m.id!==tempMsg.id);
    if(cvPartnerId===targetUserId) renderCvMessages(false);
    return;
  }
  const idx=cvMessages.findIndex(m=>m.id===tempMsg.id);
  if(idx>-1) cvMessages[idx]=data;
  if(cvPartnerId===targetUserId){ renderCvMessages(false); cvScrollToBottom(true); }
}

function forwardMessagesToUser(userId,msgIds){
  const msgs=msgIds.map(id=>cvMessages.find(m=>m.id===id)).filter(Boolean);
  const texts=msgs.filter(m=>m.type!=="image"&&m.content).map(m=>m.content);
  const images=msgs.filter(m=>m.type==="image"&&m.media_url);

  closeForwardSheet();
  if(msgSelMode) exitMsgSelMode();
  closeMsgActionSheet();

  openChat(userId);

  images.forEach(img=>cvForwardImage(userId,img.media_url));

  if(texts.length){
    setTimeout(()=>{
      const input=document.getElementById("cvInput");
      if(!input) return;
      input.value=texts.join("\n");
      cvAutoGrow();
      toggleCvSend();
      input.focus();
    },280);
  }

  vibrate(40);
  if(images.length&&!texts.length) showToast("Forwarded","Photo forwarded","good");
  else if(texts.length) showToast("Forward","Message pasted — tap send to forward","good");
}

/* ── Message action bottom sheet ── */
let _activeMsgId=null;

function openMsgActionSheet(msgId){
  _activeMsgId=msgId;
  const msg=cvMessages.find(m=>m.id===msgId);
  // Show a preview of the message text as the label
  const preview=msg?.content ? msg.content.slice(0,40)+(msg.content.length>40?"…":"") : msg?.type==="image"?"📷 Photo":"Message";
  $("#msgActionLabel").textContent=preview;
  // Only show copy for text messages
  $("#msgActionCopy").style.display=(msg?.content)?"flex":"none";
  $("#msgActionOverlay").classList.add("show");
  $("#msgActionSheet").classList.add("show");
  vibrate(35);
}

function closeMsgActionSheet(){
  $("#msgActionOverlay").classList.remove("show");
  $("#msgActionSheet").classList.remove("show");
  _activeMsgId=null;
}

$("#msgActionOverlay").addEventListener("click",closeMsgActionSheet);
makeSheetDraggable($("#msgActionSheet"), $("#msgActionSheet").querySelector(".menu-handle"), closeMsgActionSheet, {baseTransform:"translateX(-50%) "});

$("#msgActionCopy").addEventListener("click",()=>{
  const msg=cvMessages.find(m=>m.id===_activeMsgId);
  if(msg?.content) navigator.clipboard?.writeText(msg.content).catch(()=>{});
  closeMsgActionSheet();
  showToast("Copied","Message copied","good");
});

$("#msgActionDelete").addEventListener("click",()=>{
  const id=_activeMsgId;
  closeMsgActionSheet();
  openDelChoiceSheet([id]);
});

$("#msgActionForward").addEventListener("click",()=>{
  const id=_activeMsgId;
  closeMsgActionSheet();
  openForwardSheet([id]);
});

/* ── Long-press on bubbles ── */
(function setupMsgLongPress(){
  let _lt=null;
  let _startX=0,_startY=0;
  const area=document.getElementById("cvMessages");
  area.addEventListener("touchstart",e=>{
    const row=e.target.closest(".bubble-row[data-id]");
    if(!row) return;
    _startX=e.touches[0].clientX;
    _startY=e.touches[0].clientY;
    const msgId=row.dataset.id;
    _lt=setTimeout(()=>{
      _lt=null;
      openMsgActionSheet(msgId);
      vibrate(35);
    },430);
  },{passive:true});
  area.addEventListener("touchend",()=>{if(_lt){clearTimeout(_lt);_lt=null;}},{passive:true});
  area.addEventListener("touchmove",e=>{
    if(!_lt) return;
    const dx=Math.abs(e.touches[0].clientX-_startX);
    const dy=Math.abs(e.touches[0].clientY-_startY);
    if(dx>10||dy>10){clearTimeout(_lt);_lt=null;}
  },{passive:true});
  area.addEventListener("touchcancel",()=>{if(_lt){clearTimeout(_lt);_lt=null;}},{passive:true});
})();

/* ── Delete choice sheet ── */
function openDelChoiceSheet(msgIds){
  // Only show "Delete for everyone" if ALL selected messages were sent by current user
  const allOwned = msgIds.every(id=>{
    const msg = cvMessages.find(m=>m.id===id);
    return msg && msg.sender_id === currentUser.id;
  });
  $("#delForEveryoneBtn").style.display = allOwned ? "" : "none";

  $("#delChoiceOverlay").classList.add("show");
  $("#delChoiceSheet").classList.add("show");

  $("#delForMeBtn").onclick=async()=>{
    closeDelChoiceSheet();
    // Remove from UI immediately
    msgIds.forEach(id=>{
      cvMessages=cvMessages.filter(m=>m.id!==id);
      document.querySelector(`.bubble-row[data-id="${id}"]`)?.remove();
    });
    exitMsgSelMode();
    showToast("Deleted","Message hidden for you","good");
    // Persist to DB — append current user ID to deleted_for array
    try{
      for(const id of msgIds){
        await sb.rpc("append_deleted_for",{msg_id: id, user_id: currentUser.id});
      }
    }catch(e){ console.error("Delete for me error",e); }
  };

  $("#delForEveryoneBtn").onclick=async()=>{
    closeDelChoiceSheet();
    exitMsgSelMode();
    // Optimistic UI
    msgIds.forEach(id=>{
      cvMessages=cvMessages.filter(m=>m.id!==id);
      document.querySelector(`.bubble-row[data-id="${id}"]`)?.remove();
    });
    // Real Supabase delete
    const {error}=await sb.from("messages").delete().in("id",msgIds);
    if(error){
      showToast("Error","Could not delete message","bad");
      // Reload messages to restore state
      if(cvPartnerId) loadCvMessages();
    } else {
      showToast("Deleted","Message deleted for everyone","good");
    }
  };
}

function closeDelChoiceSheet(){
  $("#delChoiceOverlay").classList.remove("show");
  $("#delChoiceSheet").classList.remove("show");
}
$("#delChoiceOverlay").addEventListener("click",closeDelChoiceSheet);
makeSheetDraggable($("#delChoiceSheet"), $("#delChoiceSheet").querySelector(".menu-handle"), closeDelChoiceSheet, {baseTransform:"translateX(-50%) "});

/* ========================================================
   PARTNER PROFILE SHEET (discover-style)
   ======================================================== */
let _psheetUser=null;

function fmtPSheetSeen(ts,isOnline){
  if(isOnline) return "Online now";
  if(!ts) return "Seen recently";
  const d=new Date(ts),now=new Date();
  const diff=(now-d)/1000;
  if(diff<3600) return `Last seen ${Math.floor(diff/60)}m ago`;
  if(diff<86400) return `Last seen ${Math.floor(diff/3600)}h ago`;
  if(diff<172800) return "Last seen yesterday";
  return "Last seen "+d.toLocaleDateString("en",{month:"short",day:"numeric"});
}

async function openPartnerProfileSheetForUser(partner){
  _psheetUser=partner;
  const initials=initialsOf(partner.full_name||partner.username);
  const [bg,fg]=avatarColor(partner.id);

  // Avatar
  const avEl=document.getElementById("psheetAvatar");
  avEl.style.background=`linear-gradient(135deg,${bg},${fg})`;
  if(partner.avatar_url){
    avEl.innerHTML=`<img src="${partner.avatar_url}" onerror="this.style.display='none'" />${initials}`;
  } else {
    avEl.textContent=initials;
  }

  document.getElementById("psheetName").textContent=partner.full_name||partner.username||"User";
  document.getElementById("psheetUsername").textContent="@"+(partner.username||"user");
  const statusEl=document.getElementById("psheetStatus");
  if(partner.is_online){
    statusEl.innerHTML=`<span class="psheet-online-dot"></span> Online now`;
  } else {
    statusEl.textContent=fmtPSheetSeen(partner.last_seen,false);
  }

  // Reset stats
  document.getElementById("psheetFollowers").textContent="…";
  document.getElementById("psheetFollowing").textContent="…";

  // Bio & joined — fetch full profile if needed
  const bioEl=document.getElementById("psheetBio");
  bioEl.textContent="";

  // Location
  document.getElementById("psheetLocationRow").style.display="none";

  // Joined
  document.getElementById("psheetJoined").textContent="…";

  // Privacy
  document.getElementById("psheetPrivacyLabel").textContent="Last seen shown to everyone";

  // Animate stat islands in
  ["psheetStatFollowers","psheetStatFollowing","psheetStatJoined"].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.classList.remove("in");
  });

  // Open sheet
  document.getElementById("partnerProfileSheet").classList.add("open");
  document.getElementById("psheetOverlay").classList.add("show");
  const sc=document.querySelector("#partnerProfileSheet .psheet-scroll");
  if(sc) sc.scrollTop=0;

  // Animate stat islands
  ["psheetStatFollowers","psheetStatFollowing","psheetStatJoined"].forEach((id,i)=>{
    setTimeout(()=>{const el=document.getElementById(id);if(el) el.classList.add("in");},120+i*80);
  });

  vibrate(20);

  // Fetch full profile from Supabase
  try{
    const {data}=await sb.from("profiles")
      .select("id,full_name,username,bio,avatar_url,is_online,last_seen,created_at,location,privacy_settings")
      .eq("id",partner.id).single();
    if(data){
      _psheetUser=data;
      // Bio
      if(data.bio){ bioEl.textContent=data.bio; bioEl.className="psheet-bio"; }
      else { bioEl.textContent="No bio yet"; bioEl.className="psheet-bio no-bio"; }
      // Joined
      if(data.created_at){
        document.getElementById("psheetJoined").textContent=new Date(data.created_at).toLocaleDateString("en",{month:"short",year:"2-digit"});
      }
      // Location
      if(data.location){
        document.getElementById("psheetLocationRow").style.display="flex";
        document.getElementById("psheetLocation").textContent=data.location;
      }
      // Privacy
      const privacyMap={everyone:"Last seen shown to everyone",followers:"Last seen shown to followers only",nobody:"Last seen hidden"};
      const showLastSeen=(data.privacy_settings&&data.privacy_settings.show_last_seen)||"everyone";
      document.getElementById("psheetPrivacyLabel").textContent=privacyMap[showLastSeen]||privacyMap.everyone;
      // Status
      if(data.is_online){
        statusEl.innerHTML=`<span class="psheet-online-dot"></span> Online now`;
      } else {
        statusEl.textContent=fmtPSheetSeen(data.last_seen,false);
      }
    }
  }catch(e){ console.error("psheet profile fetch",e); }

  // Fetch follower/following counts
  try{
    sb.from("follows").select("*",{count:"exact",head:true}).eq("following_id",partner.id)
      .then(({count})=>{ document.getElementById("psheetFollowers").textContent=count||0; });
    sb.from("follows").select("*",{count:"exact",head:true}).eq("follower_id",partner.id)
      .then(({count})=>{ document.getElementById("psheetFollowing").textContent=count||0; });
  }catch(e){}
}

function openPartnerProfileSheet(){
  if(!cvPartnerId) return;
  if(cvPartner) openPartnerProfileSheetForUser(cvPartner);
  else {
    const conv=conversations.find(c=>c.partner.id===cvPartnerId);
    if(conv) openPartnerProfileSheetForUser(conv.partner);
  }
}

function closePSheet(){
  document.getElementById("partnerProfileSheet").classList.remove("open");
  document.getElementById("psheetOverlay").classList.remove("show");
  _psheetUser=null;
}

document.getElementById("psheetOverlay").addEventListener("click",closePSheet);
document.getElementById("psheetCloseBtn").addEventListener("click",closePSheet);
document.getElementById("psheetMsgBtn").addEventListener("click",()=>{
  closePSheet();
  // Already inside the chat with this user, just close the sheet
});

// Drag-to-close for partner profile sheet
(function(){
  const sheet=document.getElementById("partnerProfileSheet");
  const overlay=document.getElementById("psheetOverlay");
  let startY=0,startScrollTop=0,dragging=false;
  function onStart(y){
    startY=y;
    startScrollTop=sheet.querySelector(".psheet-scroll")?.scrollTop||0;
    dragging=true;
    sheet.style.transition="none";
  }
  function onMove(y){
    if(!dragging) return;
    const dy=y-startY;
    if(dy>0&&startScrollTop<=0){
      const drag=Math.min(dy,400);
      sheet.style.transform=`translateX(-50%) translateY(${drag}px)`;
      overlay.style.opacity=1-Math.min(drag/300,1)*0.8;
    }
  }
  function onEnd(y){
    if(!dragging) return;
    dragging=false;
    sheet.style.transition="";
    overlay.style.opacity="";
    const dy=y-startY;
    const threshold=sheet.getBoundingClientRect().height*0.3;
    if(dy>threshold&&startScrollTop<=0){
      sheet.style.transition="transform .35s cubic-bezier(.4,0,.2,1)";
      sheet.style.transform="translateX(-50%) translateY(100%)";
      setTimeout(()=>{sheet.style.transform="";closePSheet();},350);
    } else {
      sheet.style.transform="";
    }
  }
  sheet.addEventListener("touchstart",e=>onStart(e.touches[0].clientY),{passive:true});
  sheet.addEventListener("touchmove",e=>onMove(e.touches[0].clientY),{passive:true});
  sheet.addEventListener("touchend",e=>onEnd(e.changedTouches[0].clientY));
  sheet.addEventListener("mousedown",e=>onStart(e.clientY));
  window.addEventListener("mousemove",e=>{if(dragging)onMove(e.clientY);});
  window.addEventListener("mouseup",e=>{if(dragging)onEnd(e.clientY);});
})();
const TOAST_ICONS={
  good:"ph-check-circle", success:"ph-check-circle",
  bad:"ph-x-circle",      error:"ph-x-circle",
  warning:"ph-warning",
  info:"ph-info",
};
let _toastTimer=null;
function showToast(title,msg,type="info"){
  const popup=$("#notifPopup");
  const card=$("#notifCard");
  const icon=$("#notifIcon");
  const t=$("#notifTitle");
  const m=$("#notifMsg");
  card.className="notif-card "+(type||"info");
  icon.className="ph "+(TOAST_ICONS[type]||"ph-info");
  t.textContent=title;
  m.textContent=msg;
  popup.classList.add("show");
  if(_toastTimer) clearTimeout(_toastTimer);
  _toastTimer=setTimeout(()=>popup.classList.remove("show"),3500);
}
$("#notifClose").addEventListener("click",()=>{
  $("#notifPopup").classList.remove("show");
  if(_toastTimer) clearTimeout(_toastTimer);
});

/* ========================================================
   REFRESH BUTTON
   ======================================================== */
(function(){
  const btn=$("#refreshBtn");
  if(!btn) return;
  btn.addEventListener("click",async()=>{
    if(btn.classList.contains("spinning")) return;
    btn.classList.add("spinning");
    vibrate(15);
    await loadConversations();
    showToast("Refreshed","Conversations updated","good");
    setTimeout(()=>btn.classList.remove("spinning"),500);
  });
})();

async function markAllRead(){
  const {error}=await sb.from("messages").update({is_read:true}).eq("receiver_id",currentUser.id).eq("is_read",false);
  conversations.forEach(c=>c.unread=0);
  renderList();closeMenu();vibrate(30);
  updateNotifDot();
  if(error) showToast("Error","Could not mark all as read","bad");
  else showToast("Done","All messages marked as read","good");
}
$("#markAllReadBtn").addEventListener("click",markAllRead);
$("#signOutBtn").addEventListener("click",async()=>{
  await sb.auth.signOut();
  window.location.href="index.html";
});

/* ========================================================
   THEME
   ======================================================== */
(function(){
  const btn=$("#themeToggle");
  const icon=$("#themeIcon");
  const html=document.documentElement;
  function applyTheme(dark){
    if(dark){html.setAttribute("data-theme","dark");icon.className="ph ph-sun";}
    else{html.removeAttribute("data-theme");icon.className="ph ph-moon";}
  }
  applyTheme(localStorage.getItem("nova-theme")==="dark");
  btn.addEventListener("click",()=>{
    const isDark=html.getAttribute("data-theme")==="dark";
    applyTheme(!isDark);
    localStorage.setItem("nova-theme",!isDark?"dark":"light");
    btn.classList.remove("shaking");void btn.offsetWidth;btn.classList.add("shaking");
    setTimeout(()=>btn.classList.remove("shaking"),400);
  });
})();

/* ========================================================
   OFFLINE
   ======================================================== */
const updateOffline=()=>$("#offline").classList.toggle("show",!navigator.onLine);
window.addEventListener("online",updateOffline);
window.addEventListener("offline",updateOffline);
updateOffline();

/* ========================================================
   BACK GESTURE — swipe right to close chat view
   ======================================================== */
let swipeStartX=0;
let swipeStartY=0;
document.getElementById("chatView").addEventListener("touchstart",e=>{
  swipeStartX=e.touches[0].clientX;
  swipeStartY=e.touches[0].clientY;
},{passive:true});
document.getElementById("chatView").addEventListener("touchend",e=>{
  const dx=e.changedTouches[0].clientX-swipeStartX;
  const dy=Math.abs(e.changedTouches[0].clientY-swipeStartY);
  /* Only close if horizontal swipe from left edge, not a vertical scroll or bubble tap */
  if(dx>80 && dy<40 && swipeStartX<60) closeChat();
},{passive:true});

/* ── History API: intercept Android back button ── */
function pushChatHistory(){
  history.pushState({chatOpen:true},"","");
}
window.addEventListener("popstate",e=>{
  if(document.getElementById("chatView").classList.contains("open")){
    closeChat();
  }
});

/* ========================================================
   AUTH & INIT
   ======================================================== */
(async function init(){
  const {data,error}=await sb.auth.getUser();
  if(error||!data?.user){window.location.href="index.html";return;}
  currentUser=data.user;

  await Promise.all([loadMyProfile(),loadConversations()]);

  // Auto-open chat if redirected from discover.html with ?user=<id>
  const _params=new URLSearchParams(window.location.search);
  const _targetUser=_params.get("user");
  if(_targetUser){
    history.replaceState(null,"","chats.html");
    openChat(_targetUser);
  }

  $("#loader").classList.add("hide");
  setTimeout(()=>{const l=$("#loader");if(l) l.remove();},400);

  // Realtime: new messages → update local list (no full DB reload on every
  // event — that overwrote optimistic unread counts and made the badge
  // flicker). We only fall back to loadConversations() when we see a message
  // from a partner we don't yet have in the list.
  let _reloadTimer=null;
  const _scheduleReload=()=>{ if(_reloadTimer) return; _reloadTimer=setTimeout(()=>{_reloadTimer=null;loadConversations();},400); };

  sb.channel("chats-realtime-in")
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`receiver_id=eq.${currentUser.id}`},payload=>{
      const msg=payload.new;
      const conv=conversations.find(c=>c.partner.id===msg.sender_id);
      if(conv){
        conv.lastMsg=msg;
        if(msg.sender_id!==cvPartnerId) conv.unread=(conv.unread||0)+1;
        conversations.sort((a,b)=>new Date(b.lastMsg.created_at)-new Date(a.lastMsg.created_at));
        renderList();
        updateNotifDot();
      } else {
        // New partner: need profile data, fall back to a (debounced) reload.
        _scheduleReload();
      }
      // Notify if chat is not currently open
      if (payload.new.sender_id !== cvPartnerId && typeof window.showMessageNotification === 'function') {
        const c = conversations.find(x => x.partner.id === payload.new.sender_id);
        const senderName = c?.partner?.full_name || c?.partner?.display_name || c?.partner?.username || 'Someone';
        const preview = payload.new.content
          ? String(payload.new.content).slice(0, 60)
          : (payload.new.type ? '📎 Attachment' : 'New message');
        window.showMessageNotification(senderName, preview);
      }
    })
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`sender_id=eq.${currentUser.id}`},payload=>{
      const msg=payload.new;
      const conv=conversations.find(c=>c.partner.id===msg.receiver_id);
      if(conv){
        conv.lastMsg=msg;
        conversations.sort((a,b)=>new Date(b.lastMsg.created_at)-new Date(a.lastMsg.created_at));
        renderList();
      } else {
        _scheduleReload();
      }
    })
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"messages",filter:`sender_id=eq.${currentUser.id}`},()=>{
      // Own message read-state changed — refresh notif dot only.
      updateNotifDot();
    })
    .subscribe();

  // Realtime: online status in list. Postgres filter doesn't support IN()
  // here, so we still receive every profile UPDATE — but we short-circuit
  // immediately for ids we don't display, and only re-render if something
  // actually changed.
  sb.channel("chats-profiles-online")
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"profiles"},payload=>{
      const updated=payload.new;
      const conv=conversations.find(c=>c.partner.id===updated.id);
      if(!conv) return;
      if(conv.partner.is_online===updated.is_online) return;
      conv.partner.is_online=updated.is_online;
      renderList();
    })
    .subscribe();

  // Fix #14: sign-out in another tab / token refresh failure → redirect.
  sb.auth.onAuthStateChange((event)=>{
    if(event==="SIGNED_OUT"){ window.location.href="index.html"; }
  });
})();


/* ============================================================
   NOVACHAT — FEED + STORIES MODULE
   ============================================================ */
(function(){
  // Wait until main script's `sb` client is on the window/global
  function ready(){ return typeof sb !== "undefined" && sb; }
  function later(fn){ if(ready()) fn(); else setTimeout(()=>later(fn),60); }
  later(init);

  /* ---- State ---- */
  let me = null;
  let myProfile = null;
  let activeTab = "chats";        // "feed" | "chats" | "discover" | "profile"
  let feedFilter = "foryou";      // "foryou" | "following"
  let posts = [];
  let stories = [];               // grouped by user
  let following = new Set();
  let realtimeChan = null;
  let openPostId = null;
  let postMenuPostId = null;
  let currentComments = [];
  let openStoryGroup = null;
  let storyIdx = 0;
  let storyTimer = null;
  let storyStart = 0;
  let storyPaused = false;
  let cpImageFile = null;
  let cpPreviewUrl = null;
  let csImageFile = null;

  const STORY_GRADS = [
    "linear-gradient(135deg,#1d4ed8,#3b82f6)",
    "linear-gradient(135deg,#7c3aed,#db2777)",
    "linear-gradient(135deg,#f97316,#fbbf24)",
    "linear-gradient(135deg,#16a34a,#22d3ee)",
    "linear-gradient(135deg,#dc2626,#f97316)",
    "linear-gradient(135deg,#0f172a,#475569)",
    "linear-gradient(135deg,#ec4899,#8b5cf6)",
    "linear-gradient(135deg,#0891b2,#1d4ed8)",
  ];
  let csGrad = STORY_GRADS[0];

  /* ---- Helpers ---- */
  const $$ = s => document.querySelector(s);
  function timeAgo(ts){
    if(!ts) return "";
    const d=Date.now()-new Date(ts).getTime(), s=Math.floor(d/1000);
    if(s<60) return s+"s";
    const m=Math.floor(s/60); if(m<60) return m+"m";
    const h=Math.floor(m/60); if(h<24) return h+"h";
    const dd=Math.floor(h/24); return dd+"d";
  }
  function esc(s){ return (s||"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function avatarBG(p){
    if(p && p.avatar_url) return `background-image:url('${esc(p.avatar_url)}');`;
    const name = (p && (p.display_name || p.full_name || p.username))||"?";
    const [a,b] = (window.avatarColor ? window.avatarColor(name) : ["#a8c4f0","#1d4ed8"]);
    return `background:linear-gradient(135deg,${a},${b});`;
  }
  function avatarInitials(p){
    if(p && p.avatar_url) return "";
    const name = (p && (p.display_name || p.full_name || p.username))||"?";
    return (window.initialsOf ? window.initialsOf(name) : name.slice(0,1).toUpperCase());
  }

  /* ============================================================
     INIT
     ============================================================ */
  async function init(){
    const { data:{ user } } = await sb.auth.getUser();
    if(!user) return; // main script will redirect
    me = user;
    const { data:prof } = await sb.from("profiles").select("*").eq("id", me.id).maybeSingle();
    myProfile = prof || { id: me.id, display_name: me.email, username: me.email };

    // Follows
    try {
      const { data:fws } = await sb.from("follows").select("following_id").eq("follower_id", me.id);
      (fws||[]).forEach(r=>following.add(r.following_id));
    } catch(e){}

    bindUI();
    buildGradPicker();
    try { initNotifications(); } catch(e) { console.error(e); }

    // If we arrived here with #feed in URL (e.g. from profile.html), open Feed tab
    if(window.location.hash === '#feed'){
      try { switchTab('feed'); } catch(e){ console.error(e); }
    }
  }

  function bindUI(){
    // Tab switching
    document.querySelectorAll(".tab-btn[data-tab]").forEach(btn=>{
      btn.addEventListener("click", e=>{
        e.preventDefault();
        switchTab(btn.dataset.tab);
      });
    });

    const profileFrame = document.getElementById('profileFrame');
    if(profileFrame){
      profileFrame.addEventListener('load',()=>{
        profileFrame.contentWindow.postMessage({type:'9jatalk:view',view:activeTab==='discover'?'discover':'profile'},location.origin);
      });
    }
    window.addEventListener('message',e=>{
      if(e.origin!==location.origin || e.source!==profileFrame?.contentWindow || e.data?.type!=='9jatalk:navigate') return;
      switchTab('chats');
      if(e.data.userId) openChat(e.data.userId);
    });
    document.addEventListener('click',e=>{
      const link=e.target.closest('a[href="#discover"]');
      if(link){e.preventDefault();switchTab('discover');}
    });

    // Feed segmented
    document.querySelectorAll(".feed-seg").forEach(b=>{
      b.addEventListener("click", ()=>{
        document.querySelectorAll(".feed-seg").forEach(x=>x.classList.remove("active"));
        b.classList.add("active");
        feedFilter = b.dataset.feed;
        renderFeed();
      });
    });

    // FAB
    $$("#newPostFab").addEventListener("click", openCreatePost);

    // Create post sheet
    $$("#cpClose").addEventListener("click", closeCreatePost);
    $$("#cpOverlay").addEventListener("click", closeCreatePost);
    initSheetDrag($$("#cpSheet"), $$("#cpSheet").querySelector(".bsheet-handle"), closeCreatePost);
    $$("#cpCaption").addEventListener("input", updateCpBtn);
    $$("#cpImgBtn").addEventListener("click", ()=>$$("#cpFile").click());
    $$("#cpFile").addEventListener("change", onCpFile);
    $$("#cpPreviewX").addEventListener("click", clearCpPreview);
    $$("#cpPostBtn").addEventListener("click", ()=>submitPost());
    buildCpBgPicker();
    $$("#cpBgText").addEventListener("input", updateCpBtn);

    // Comments sheet
    $$("#cmtClose").addEventListener("click", closeComments);
    $$("#cmtOverlay").addEventListener("click", closeComments);
    document.getElementById('postMenuOverlay').addEventListener('click', closePostMenu);
    initSheetDrag($$("#postMenuSheet"), $$("#postMenuSheet").querySelector(".post-menu-handle"), closePostMenu);

    // Delete post confirmation
    document.getElementById('deletePostOverlay').addEventListener('click', closeDeletePostConfirm);
    document.getElementById('deletePostCancelBtn').addEventListener('click', closeDeletePostConfirm);
    document.getElementById('deletePostConfirmBtn').addEventListener('click', () => {
      const p = _deletePostTarget;
      closeDeletePostConfirm();
      if (p) deletePost(p);
    });
    initSheetDrag($$("#deletePostSheet"), $$("#deletePostSheet").querySelector(".menu-handle"), closeDeletePostConfirm, {baseTransform:"translateX(-50%) "});
    $$("#cmtInput").addEventListener("input", e=>{ $$("#cmtSend").disabled = !e.target.value.trim(); });
    $$("#cmtSend").addEventListener("click", submitComment);
    $$("#cmtInput").addEventListener("keydown", e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); submitComment(); }});

    // Comments draggable handle
    initSheetDrag($$("#cmtSheet"), $$("#cmtHandle"), closeComments);

    // Create story sheet
    $$("#csClose").addEventListener("click", closeCreateStory);
    $$("#csOverlay").addEventListener("click", closeCreateStory);
    initSheetDrag($$("#csSheet"), $$("#csSheet").querySelector(".bsheet-handle"), closeCreateStory);
    $$("#csImgBtn").addEventListener("click", ()=>$$("#csFile").click());
    $$("#csFile").addEventListener("change", onCsFile);
    $$("#csPreviewX").addEventListener("click", clearCsPreview);
    $$("#csPostBtn").addEventListener("click", submitStory);

    // Story viewer
    $$("#svClose").addEventListener("click", closeStoryViewer);
    $$("#svNavL").addEventListener("click", ()=>navStory(-1));
    $$("#svNavR").addEventListener("click", ()=>navStory(1));

    let holdT;
    $$("#svStage").addEventListener("pointerdown", ()=>{ holdT=setTimeout(()=>{storyPaused=true;},250); });
    $$("#svStage").addEventListener("pointerup", ()=>{ clearTimeout(holdT); if(storyPaused){storyPaused=false; storyStart=Date.now()-(storyStart?0:0);} });
    $$("#svStage").addEventListener("pointerleave", ()=>{ clearTimeout(holdT); storyPaused=false; });

    // Swipe down on viewer to close
    let ty0=0;
    $$("#storyViewer").addEventListener("touchstart", e=>{ ty0=e.touches[0].clientY; });
    $$("#storyViewer").addEventListener("touchend", e=>{
      const dy=(e.changedTouches[0].clientY-ty0);
      if(dy>80) closeStoryViewer();
    });
  }

  /* ============================================================
     TAB SWITCHING
     ============================================================ */
  function switchTab(tab){
    if(tab===activeTab) return;
    activeTab = tab;
    document.querySelectorAll(".tab-btn[data-tab]").forEach(b=>b.classList.toggle("active", b.dataset.tab===tab));
    const t = $$("#topbarTitle");
    t.classList.add("swap");
    setTimeout(()=>{
      t.innerHTML = tab==="chats" ? '<span class="g">9ja</span><span class="t">Talk</span>' : tab==="feed" ? "Feed" : tab==="discover" ? "Discover" : "Profile";
      t.classList.remove("swap");
    }, 180);

    $$("#chatsView").style.display = tab==="chats" ? "" : "none";
    $$("#feedView").style.display  = tab==="feed"  ? "" : "none";
    const profileHost=$$("#profileHost");
    if(profileHost) profileHost.hidden = tab!=="discover" && tab!=="profile";
    const profileFrame=$$("#profileFrame");
    if(profileFrame && (tab==="discover" || tab==="profile")){
      profileFrame.contentWindow.postMessage({type:'9jatalk:view',view:tab},location.origin);
    }
    $$("#newPostFab").style.display = tab==="feed" ? "" : "none";

    if(tab==="feed"){
      loadFeed();
      subscribeRealtime();
    } else {
      unsubscribeRealtime();
    }
  }

  /* ============================================================
     STORIES
     ============================================================ */
  async function loadStories(){
    const strip = $$("#storiesStrip");
    try {
      const { data, error } = await sb.from("stories")
        .select("id,user_id,media_url,text,bg_color,created_at,expires_at")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending:false });
      if(error) throw error;
      // group by user
      const byUser = {};
      (data||[]).forEach(s=>{ (byUser[s.user_id] ||= []).push(s); });
      const userIds = Object.keys(byUser);
      // fetch profiles
      let profs = {};
      if(userIds.length){
        const { data:pp } = await sb.from("profiles").select("id,display_name,username,avatar_url").in("id", userIds);
        (pp||[]).forEach(p=>profs[p.id]=p);
      }
      // fetch my views
      let seenSet = new Set();
      try {
        const { data:views } = await sb.from("story_views").select("story_id").eq("viewer_id", me.id);
        (views||[]).forEach(v=>seenSet.add(v.story_id));
      } catch(e){}

      stories = userIds.map(uid=>{
        const items = byUser[uid].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
        const unseen = items.some(s=>!seenSet.has(s.id));
        return { user: profs[uid] || { id:uid, display_name:"User", username:"user" }, items, unseen };
      }).sort((a,b)=>{
        // unseen first, then most recent
        if(a.unseen!==b.unseen) return a.unseen ? -1 : 1;
        return new Date(b.items.at(-1).created_at) - new Date(a.items.at(-1).created_at);
      });
      renderStories();
    } catch(e){
      console.warn("stories load failed", e);
      renderStories();
    }
  }

  function renderStories(){
    const strip = $$("#storiesStrip");
    let html = "";
    // "Your Story" first
    html += `<div class="story-item" id="myStoryItem" title="Add to your story">
      <div class="story-ring">
        <div class="story-avatar" style="${avatarBG(myProfile)}">${avatarInitials(myProfile)}</div>
        <div class="story-add-badge"><i class="ph-bold ph-plus"></i></div>
      </div>
      <div class="story-label">Your Story</div>
    </div>`;
    stories.forEach((g,i)=>{
      html += `<div class="story-item" data-idx="${i}">
        <div class="story-ring ${g.unseen?"unseen":""}">
          <div class="story-avatar" style="${avatarBG(g.user)}">${avatarInitials(g.user)}</div>
        </div>
        <div class="story-label">${esc(g.user.display_name || g.user.username || "User")}</div>
      </div>`;
    });
    strip.innerHTML = html;
    $$("#myStoryItem").addEventListener("click", openCreateStory);
    strip.querySelectorAll(".story-item[data-idx]").forEach(el=>{
      el.addEventListener("click", ()=>openStoryViewer(parseInt(el.dataset.idx,10)));
    });
  }

  /* ---- Story Viewer ---- */
  function openStoryViewer(groupIdx){
    openStoryGroup = stories[groupIdx];
    storyIdx = 0;
    $$("#storyViewer").classList.add("show");
    document.body.style.overflow = "hidden";
    showStoryFrame();
  }
  function closeStoryViewer(){
    $$("#storyViewer").classList.remove("show");
    document.body.style.overflow = "";
    clearTimeout(storyTimer);
    openStoryGroup = null;
  }
  function navStory(dir){
    if(!openStoryGroup) return;
    const next = storyIdx + dir;
    if(next < 0){ // prev group
      const i = stories.indexOf(openStoryGroup);
      if(i>0){ openStoryGroup = stories[i-1]; storyIdx = openStoryGroup.items.length-1; showStoryFrame(); }
      return;
    }
    if(next >= openStoryGroup.items.length){
      const i = stories.indexOf(openStoryGroup);
      if(i < stories.length-1){ openStoryGroup = stories[i+1]; storyIdx = 0; showStoryFrame(); }
      else closeStoryViewer();
      return;
    }
    storyIdx = next;
    showStoryFrame();
  }
  function showStoryFrame(){
    const g = openStoryGroup; if(!g) return;
    const s = g.items[storyIdx];
    // Progress bars
    const prog = $$("#svProgress");
    prog.innerHTML = g.items.map((_,i)=>`<div class="sv-bar"><div class="sv-bar-fill" style="width:${i<storyIdx?100:0}%"></div></div>`).join("");
    // Header
    $$("#svAvatar").style.cssText = avatarBG(g.user);
    $$("#svAvatar").textContent = avatarInitials(g.user);
    $$("#svName").textContent = g.user.display_name || g.user.username || "User";
    $$("#svTime").textContent = timeAgo(s.created_at);
    // Stage
    const stage = $$("#svStage");
    // wipe except nav layers
    [...stage.querySelectorAll(".sv-media,.sv-text-wrap")].forEach(n=>n.remove());
    stage.classList.remove("text-bg");
    stage.style.background = "#000";
    if(s.media_url){
      const isVid = /\.(mp4|mov|webm)$/i.test(s.media_url);
      let m;
      if(isVid){ m=document.createElement("video"); m.src=s.media_url; m.autoplay=true; m.playsInline=true; m.muted=true; }
      else { m=document.createElement("img"); m.src=s.media_url; }
      m.className="sv-media";
      stage.insertBefore(m, $$("#svNavL"));
    } else {
      stage.classList.add("text-bg");
      stage.style.background = s.bg_color || STORY_GRADS[0];
      const wrap = document.createElement("div");
      wrap.className="sv-text-wrap";
      wrap.innerHTML = `<div class="sv-text">${esc(s.text||"")}</div>`;
      stage.insertBefore(wrap, $$("#svNavL"));
    }
    // Mark seen
    sb.from("story_views").upsert({ story_id: s.id, viewer_id: me.id }, { onConflict:"story_id,viewer_id" }).then(()=>{});
    // Tick progress
    clearTimeout(storyTimer);
    const dur = 5000;
    storyStart = Date.now();
    const fill = prog.children[storyIdx].firstElementChild;
    function tick(){
      if(!openStoryGroup) return;
      if(storyPaused){ requestAnimationFrame(tick); return; }
      const pct = Math.min(100, ((Date.now()-storyStart)/dur)*100);
      fill.style.width = pct+"%";
      if(pct>=100){ navStory(1); return; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---- Create story ---- */
  function buildGradPicker(){
    const p = $$("#csGradPicker");
    p.innerHTML = STORY_GRADS.map((g,i)=>`<div class="cs-grad ${i===0?"active":""}" data-i="${i}" style="background:${g}"></div>`).join("");
    p.querySelectorAll(".cs-grad").forEach(el=>{
      el.addEventListener("click", ()=>{
        p.querySelectorAll(".cs-grad").forEach(x=>x.classList.remove("active"));
        el.classList.add("active");
        csGrad = STORY_GRADS[parseInt(el.dataset.i,10)];
        $$("#csBg").style.background = csGrad;
      });
    });
  }
  function openCreateStory(){
    csImageFile=null; $$("#csText").value=""; $$("#csPreview").style.display="none";
    $$("#csOverlay").classList.add("show");
    $$("#csSheet").classList.add("show");
  }
  function closeCreateStory(){
    $$("#csOverlay").classList.remove("show");
    $$("#csSheet").classList.remove("show");
  }
  function onCsFile(e){
    const f = e.target.files[0]; if(!f) return;
    csImageFile = f;
    const url = URL.createObjectURL(f);
    $$("#csPreviewImg").src = url;
    $$("#csPreview").style.display = "block";
  }
  function clearCsPreview(){ csImageFile=null; $$("#csPreview").style.display="none"; $$("#csFile").value=""; }
  async function submitStory(){
    const text = $$("#csText").value.trim();
    if(!csImageFile && !text){ toast("Add a photo or text bro"); return; }
    $$("#csPostBtn").disabled = true; $$("#csPostBtn").textContent = "Posting…";
    try {
      let media_url = null;
      if(csImageFile){
        const path = `${me.id}/${Date.now()}_${csImageFile.name.replace(/\s+/g,"_")}`;
        const { error:upErr } = await sb.storage.from("stories").upload(path, csImageFile, { upsert:false });
        if(upErr) throw upErr;
        const { data:pub } = sb.storage.from("stories").getPublicUrl(path);
        media_url = pub.publicUrl;
      }
      const expires = new Date(Date.now()+24*60*60*1000).toISOString();
      const { error } = await sb.from("stories").insert({
        user_id: me.id, media_url, text: text||null, bg_color: media_url?null:csGrad, expires_at: expires
      });
      if(error) throw error;
      toast("Story shared 🚀");
      closeCreateStory();
      // loadStories disabled
    } catch(e){
      console.error(e); toast("Couldn't post story");
    } finally {
      $$("#csPostBtn").disabled = false; $$("#csPostBtn").textContent = "Share Story";
    }
  }

  /* ============================================================
     FEED
     ============================================================ */
  async function loadFeed(){
    try {
      const { data, error } = await sb.from("posts")
        .select("id,user_id,caption,image_url,created_at,author_name,author_username,author_avatar")
        .order("created_at",{ascending:false})
        .limit(50);
      if(error) throw error;
      const rows = data||[];

      // Only look up profiles for old posts that don't have baked-in author info
      const oldRows = rows.filter(r => !r.author_name && !r.author_username);
      const uids = [...new Set(oldRows.map(r=>r.user_id))];
      let profs = {};
      if(uids.length){
        const { data:pp } = await sb.from("profiles").select("id,full_name,username,avatar_url").in("id", uids);
        (pp||[]).forEach(p=>profs[p.id]=p);
      }
      // likes + counts (best effort)
      const ids = rows.map(r=>r.id);
      let likesByPost = {}, myLikes = new Set(), commentsByPost = {};
      if(ids.length){
        const { data:lk } = await sb.from("post_likes").select("post_id,user_id").in("post_id", ids);
        (lk||[]).forEach(l=>{ likesByPost[l.post_id]=(likesByPost[l.post_id]||0)+1; if(l.user_id===me.id) myLikes.add(l.post_id); });
        const { data:cm } = await sb.from("post_comments").select("post_id").in("post_id", ids);
        (cm||[]).forEach(c=>{ commentsByPost[c.post_id]=(commentsByPost[c.post_id]||0)+1; });
      }
      posts = rows.map(r=>{
        // Use baked-in author info first; fall back to profile lookup for old posts
        const prof = profs[r.user_id];
        const author = {
          full_name:    r.author_name     || prof?.full_name    || null,
          username:     r.author_username || prof?.username     || null,
          avatar_url:   r.author_avatar   || prof?.avatar_url   || null,
        };
        return {
          ...r,
          author,
          likes: likesByPost[r.id]||0,
          liked: myLikes.has(r.id),
          comments: commentsByPost[r.id]||0,
        };
      });
      renderFeed();
    } catch(e){
      console.error("feed load", e);
      renderFeed();
    }
  }

  function renderFeed(){
    const list = $$("#feedList"); const empty = $$("#feedEmpty");
    let view = posts;
    if(feedFilter==="following"){
      view = posts.filter(p=>following.has(p.user_id) || p.user_id===me.id);
    }
    if(!view.length){ list.innerHTML=""; empty.style.display=""; return; }
    empty.style.display="none";
    list.innerHTML = view.map(renderPost).join("");
    // bind handlers
    view.forEach(p => {
      const card = list.querySelector(`[data-post="${p.id}"]`);
      if (!card) return;
      card.querySelector('.fp-like').addEventListener('click', () => toggleLike(p));
      card.querySelector('.fp-cmt').addEventListener('click', () => openComments(p));
      card.querySelector('.fp-share').addEventListener('click', () => openPostShareSheet(p, card));
      card.querySelector('[data-more]').addEventListener('click', () => openPostMenu(p));
      const img = card.querySelector('.fp-image');
      if (img) {
        let lastTap = 0;
        img.addEventListener('click', () => {
          const now = Date.now();
          if (now - lastTap < 300) { doubleTapLike(p, card); lastTap = 0; }
          else lastTap = now;
        });
      }
    });
  }

  function renderPost(p) {
    const a = p.author || {};
    const fallbackName = a.full_name || a.username || ('User_' + String(p.user_id||'').slice(0,6));
    const fallbackUser = a.username || a.full_name || ('user_' + String(p.user_id||'').slice(0,6));
    // Detect text-post background marker:  ~bg=<index>~  at the start of caption
    let bgIdx = -1, captionText = p.caption || '';
    const m = captionText.match(/^~bg=(\d+)~/);
    if (m) { bgIdx = parseInt(m[1], 10); captionText = captionText.slice(m[0].length); }
    const isFbText = !p.image_url && bgIdx >= 0 && STORY_GRADS[bgIdx];
    // Plain text post (no image, no gradient) — show with white card background
    const isPlainText = !p.image_url && bgIdx < 0 && captionText;
    return `<article class="feed-post" data-post="${p.id}">
      <div class="fp-head">
        <div class="fp-avatar" style="${avatarBG(a)}">${avatarInitials(a)}</div>
        <div class="fp-meta">
          <div class="fp-name">${esc(fallbackName)}</div>
          <div class="fp-time">@${esc(fallbackUser)} · ${timeAgo(p.created_at)}</div>
        </div>
        <button class="fp-more" data-more="${p.id}" aria-label="More">
          <i class="ph ph-dots-three"></i>
        </button>
      </div>
      ${p.image_url ? `<div class="fp-image" style="background-image:url('${esc(p.image_url)}')">
        <div class="fp-heart-burst">❤</div>
      </div>` : ''}
      ${isFbText ? `<div class="fp-textpost ${captionText.length>80?'compact':''}" style="background:${STORY_GRADS[bgIdx]}">${esc(captionText)}</div>` : ''}
      ${isPlainText ? `<div class="fp-textpost ${captionText.length>80?'compact':''}" style="background:#ffffff;color:#0b1b3a;">${esc(captionText)}</div>` : ''}
      <div class="fp-actions">
        <button class="fp-act fp-like ${p.liked ? 'liked' : ''}">
          <i class="${p.liked ? 'ph-fill' : 'ph'} ph-heart"></i>
          <span>${p.likes || 0}</span>
        </button>
        <button class="fp-act fp-cmt">
          <i class="ph ph-chat-circle"></i>
          <span>${p.comments || 0}</span>
        </button>
        <button class="fp-act fp-share"><i class="ph ph-share-network"></i><span>Share</span></button>
      </div>
      ${(!isFbText && !isPlainText && captionText) ? `<div class="fp-caption"><b>${esc(fallbackUser)}</b> ${esc(captionText)}</div>` : ''}
    </article>`;
  }

  async function toggleLike(p){
    p.liked = !p.liked;
    p.likes += p.liked ? 1 : -1;
    renderFeed();
    try {
      if(p.liked){
        const { error } = await sb.from("post_likes").insert({ post_id:p.id, user_id:me.id });
        if(error && error.code!=="23505") throw error;
      } else {
        await sb.from("post_likes").delete().eq("post_id",p.id).eq("user_id",me.id);
      }
    } catch(e){
      console.error(e);
      p.liked=!p.liked; p.likes += p.liked?1:-1; renderFeed();
    }
  }
  function doubleTapLike(p, card){
    if(!p.liked) toggleLike(p);
    const burst = card.querySelector(".fp-heart-burst");
    if(burst){ burst.classList.remove("go"); void burst.offsetWidth; burst.classList.add("go"); }
    if(navigator.vibrate) navigator.vibrate(15);
  }

  /* ---- Post Share Sheet ---- */
  let _sharePost = null;
  let _shareCard = null;

  function openPostShareSheet(p, card){
    _sharePost = p;
    _shareCard = card;
    $('#postShareOverlay').classList.add('show');
    $('#postShareSheet').classList.add('show');
  }

  function closePostShareSheet(){
    $('#postShareOverlay').classList.remove('show');
    $('#postShareSheet').classList.remove('show');
  }

  $('#postShareCancel').addEventListener('click', closePostShareSheet);
  $('#postShareOverlay').addEventListener('click', closePostShareSheet);

  document.querySelectorAll('.post-share-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const platform = btn.dataset.platform;
      closePostShareSheet();
      if(!_sharePost || !_shareCard) return;
      vibrate(20);
      showToast ? showToast('Preparing','Creating image…','info') : toast('Preparing image…');
      try {
        const p    = _sharePost;
        const card = _shareCard;
        const clone = card.cloneNode(true);
        clone.style.cssText = `
          width:${card.offsetWidth}px;
          font-family:'Poppins',sans-serif;
          background:var(--card,#f0f6ff);
          border-radius:18px;overflow:hidden;
          position:fixed;left:-9999px;top:0;
        `;
        const act = clone.querySelector('.fp-actions');
        if(act) act.style.display = 'none';
        const wm = document.createElement('div');
        wm.style.cssText = `
          text-align:center;padding:10px 16px 14px;
          font-size:12px;font-weight:700;color:#1d4ed8;
          letter-spacing:.5px;opacity:.7;
        `;
        wm.textContent = '✦ Shared via 9jaTalk';
        clone.appendChild(wm);
        document.body.appendChild(clone);
        const canvas = await html2canvas(clone, {
          useCORS:true,allowTaint:true,scale:2,backgroundColor:null,logging:false,
        });
        document.body.removeChild(clone);
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        const filename = `9jatalk-post-${Date.now()}.png`;
        const file = new File([blob], filename, { type:'image/png' });
        const objectUrl = URL.createObjectURL(blob);

        if(platform === 'copy'){
          try {
            await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]);
            showToast ? showToast('Copied','Image copied to clipboard','good') : toast('Image copied!');
          } catch(e){
            const a = document.createElement('a');
            a.href = objectUrl; a.download = filename;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            showToast ? showToast('Saved','Image saved to device','good') : toast('Image saved');
          }
          setTimeout(()=> URL.revokeObjectURL(objectUrl), 2000);
          return;
        }

        // Try native share first (works great on mobile)
        if(navigator.canShare && navigator.canShare({ files:[file] })){
          await navigator.share({ files:[file], title:'Check this out on 9jaTalk' });
          setTimeout(()=> URL.revokeObjectURL(objectUrl), 2000);
          return;
        }

        // Fallback: download image then open platform link
        const a = document.createElement('a');
        a.href = objectUrl; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(()=> URL.revokeObjectURL(objectUrl), 2000);

        setTimeout(()=>{
          const text = encodeURIComponent('Check this out on 9jaTalk!');
          const urls = {
            whatsapp:  `https://wa.me/?text=${text}`,
            instagram: `https://www.instagram.com/`,
            x:         `https://x.com/intent/tweet?text=${text}`,
            facebook:  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}`,
            telegram:  `https://t.me/share/url?url=${encodeURIComponent(location.href)}&text=${text}`,
            tiktok:    `https://www.tiktok.com/`,
            snapchat:  `https://www.snapchat.com/`,
          };
          if(urls[platform]) window.open(urls[platform], '_blank');
          showToast ? showToast('Image saved','Open the app and attach it','info')
                    : toast('Image saved — attach it in the app');
        }, 600);

      } catch(e){
        console.error('post share', e);
        showToast ? showToast('Oops',"Couldn't share post",'bad') : toast("Couldn't share");
      }
    });
  });

  makeSheetDraggable(
    $('#postShareSheet'),
    $('#postShareSheet').querySelector('.menu-handle'),
    closePostShareSheet,
    { baseTransform: 'translateX(-50%) ' }
  );

  /* ---- Share Post as Image (kept for reuse) ---- */
  async function sharePostAsImage(p, card) {
    vibrate(20);
    toast("Preparing image…");
    try {
      // Clone the card so we can add a watermark and hide the action bar
      const clone = card.cloneNode(true);
      clone.style.cssText = `
        width: ${card.offsetWidth}px;
        font-family: 'Poppins', sans-serif;
        background: var(--card, #f0f6ff);
        border-radius: 18px;
        overflow: hidden;
        position: fixed;
        left: -9999px;
        top: 0;
      `;
      // Remove action bar from clone (likes, comments, share buttons)
      const actionsClone = clone.querySelector('.fp-actions');
      if (actionsClone) actionsClone.style.display = 'none';
      // Add NovaChat watermark
      const watermark = document.createElement('div');
      watermark.style.cssText = `
        text-align: center;
        padding: 10px 16px 14px;
        font-size: 12px;
        font-weight: 700;
        color: #00a651;
        letter-spacing: 0.5px;
        opacity: 0.7;
      `;
      watermark.textContent = '✦ Shared via 9jaTalk';
      clone.appendChild(watermark);
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: null,
        logging: false,
      });
      document.body.removeChild(clone);

      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      const filename = `9jatalk-post-${Date.now()}.png`;

      // Try native share API (mobile) first, fall back to download
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'image/png' })] })) {
        const file = new File([blob], filename, { type: 'image/png' });
        await navigator.share({ files: [file], title: '9jaTalk post' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast("Saved", "Post saved as image", "good");
      }
    } catch(e) {
      console.error('share post image', e);
      showToast("Oops", "Couldn't export post image", "bad");
    }
  }

  function openPostMenu(p) {
    postMenuPostId = p.id;
    const isOwn = p.user_id === me.id;
    const items = document.getElementById('postMenuItems');
    items.innerHTML = isOwn ? `
      <button class="post-menu-item danger" id="pmDelete">
        <i class="ph ph-trash"></i> Delete Post
      </button>
      <div class="post-menu-divider"></div>
      <button class="post-menu-item" id="pmCopy">
        <i class="ph ph-copy"></i> Copy Caption
      </button>
      <div class="post-menu-divider"></div>
      <button class="post-menu-item" id="pmCancel">
        <i class="ph ph-x"></i> Cancel
      </button>` : `
      <button class="post-menu-item danger" id="pmReport">
        <i class="ph ph-flag"></i> Report Post
      </button>
      <div class="post-menu-divider"></div>
      <button class="post-menu-item" id="pmCancel">
        <i class="ph ph-x"></i> Cancel
      </button>`;
    document.getElementById('postMenuOverlay').classList.add('show');
    document.getElementById('postMenuSheet').classList.add('show');
    if (isOwn) {
      document.getElementById('pmDelete').addEventListener('click', () => {
        closePostMenu();
        setTimeout(()=>openDeletePostConfirm(p), 250);
      });
      document.getElementById('pmCopy').addEventListener('click', () => {
        navigator.clipboard && navigator.clipboard.writeText(p.caption || '');
        closePostMenu(); toast('Caption copied');
      });
    } else {
      document.getElementById('pmReport').addEventListener('click', () => {
        closePostMenu(); toast('Post reported');
      });
    }
    document.getElementById('pmCancel').addEventListener('click', closePostMenu);
  }

  function closePostMenu() {
    document.getElementById('postMenuOverlay').classList.remove('show');
    document.getElementById('postMenuSheet').classList.remove('show');
    postMenuPostId = null;
  }

  async function deletePost(p) {
    posts = posts.filter(x => x.id !== p.id);
    renderFeed();
    try {
      if (p.image_url) {
        const path = p.image_url.split('/posts/')[1];
        if (path) await sb.storage.from('posts').remove([path]);
      }
      await sb.from('post_likes').delete().eq('post_id', p.id);
      await sb.from('post_comments').delete().eq('post_id', p.id);
      const { error } = await sb.from('posts').delete().eq('id', p.id);
      if (error) throw error;
      toast('Post deleted');
    } catch (e) {
      console.error(e);
      posts.unshift(p);
      renderFeed();
      toast('Could not delete post — try again');
    }
  }

  let _deletePostTarget = null;
  function openDeletePostConfirm(p) {
    _deletePostTarget = p;
    document.getElementById('deletePostOverlay').classList.add('show');
    document.getElementById('deletePostSheet').classList.add('show');
  }
  function closeDeletePostConfirm() {
    document.getElementById('deletePostOverlay').classList.remove('show');
    document.getElementById('deletePostSheet').classList.remove('show');
    _deletePostTarget = null;
  }


  /* ---- Create Post ---- */
  function openCreatePost(){
    const av = document.getElementById('cpAuthorAvatar');
    const nm = document.getElementById('cpAuthorName');
    if (av && myProfile) {
      av.style.cssText = avatarBG(myProfile);
      av.textContent = avatarInitials(myProfile);
    }
    if (nm && myProfile) {
      nm.textContent = myProfile.display_name || myProfile.username || 'You';
    }
    if(cpPreviewUrl){ URL.revokeObjectURL(cpPreviewUrl); cpPreviewUrl=null; }
    cpImageFile=null; $$("#cpCaption").value=""; $$("#cpPreview").style.display="none"; $$("#cpPreviewImg").src=""; $$("#cpFile").value="";
    $$("#cpBgText").value=""; cpBgIdx = -1;
    document.querySelectorAll("#cpBgPicker .cp-bg-pill").forEach((x,i)=>x.classList.toggle("active", i===0));
    applyCpBgMode();
    updateCpBtn();
    $$("#cpOverlay").classList.add("show");
    $$("#cpSheet").classList.add("show");
    setTimeout(()=>$$("#cpCaption").focus(), 200);
  }
  function closeCreatePost(){
    $$("#cpOverlay").classList.remove("show");
    $$("#cpSheet").classList.remove("show");
  }
  function updateCpBtn(){
    const bgActive = cpBgIdx >= 0 && !cpImageFile;
    const text = bgActive ? $$("#cpBgText").value.trim() : $$("#cpCaption").value.trim();
    const has = text || cpImageFile;
    $$("#cpPostBtn").disabled = !has;
  }
  function onCpFile(e){
    const f = e.target.files[0]; if(!f) return;
    if(f.size > 5*1024*1024){ toast("Image too big (max 5MB)"); e.target.value=""; return; }
    cpImageFile = f;
    if(cpPreviewUrl) URL.revokeObjectURL(cpPreviewUrl);
    cpPreviewUrl = URL.createObjectURL(f);
    $$("#cpPreviewImg").src = cpPreviewUrl;
    $$("#cpPreview").style.display = "block";
    // An image post and the colored-background text mode are mutually exclusive
    if(cpBgIdx >= 0){
      cpBgIdx = -1;
      document.querySelectorAll("#cpBgPicker .cp-bg-pill").forEach((x,i)=>x.classList.toggle("active", i===0));
      applyCpBgMode();
    }
    updateCpBtn();
  }
  function clearCpPreview(){
    cpImageFile = null;
    if(cpPreviewUrl){ URL.revokeObjectURL(cpPreviewUrl); cpPreviewUrl = null; }
    $$("#cpPreview").style.display = "none";
    $$("#cpPreviewImg").src = "";
    $$("#cpFile").value = "";
    updateCpBtn();
  }
  async function submitPost(overrideCaption, overrideFile){
    const bgActive = cpBgIdx >= 0 && !cpImageFile && !overrideFile;
    let caption = overrideCaption !== undefined ? overrideCaption
      : (bgActive ? $$("#cpBgText").value.trim() : $$("#cpCaption").value.trim());
    if(bgActive && caption) caption = `~bg=${cpBgIdx}~` + caption;
    const fileToUpload = overrideFile || cpImageFile;
    if(!caption && !fileToUpload) return;
    $$("#cpPostBtn").disabled = true; $$("#cpPostBtn").textContent = "Posting…";
    $$("#cpCaption").disabled = true;
    $$("#cpBgText").disabled = true;
    try {
      let image_url = null;
      if(fileToUpload){
        const path = `${me.id}/${Date.now()}_${fileToUpload.name.replace(/\s+/g,"_")}`;
        const { error:upErr } = await sb.storage.from("posts").upload(path, fileToUpload);
        if(upErr) throw upErr;
        const { data:pub } = sb.storage.from("posts").getPublicUrl(path);
        image_url = pub.publicUrl;
      }
      const { data, error } = await sb.from("posts").insert({
        user_id: me.id,
        caption: caption||null,
        image_url,
        author_name: myProfile?.full_name || myProfile?.username || null,
        author_username: myProfile?.username || null,
        author_avatar: myProfile?.avatar_url || null,
      }).select().single();
      if(error) throw error;
      posts.unshift({ ...data, author: myProfile, likes:0, liked:false, comments:0 });
      renderFeed();
      closeCreatePost();
      toast("Posted 🎉");
    } catch(e){
      console.error(e);
      const msg = e?.message || e?.error_description || JSON.stringify(e) || "Unknown error";
      toast("Post failed: " + msg);
    } finally {
      $$("#cpPostBtn").textContent = "Post";
      $$("#cpCaption").disabled = false;
      $$("#cpBgText").disabled = false;
      updateCpBtn();
    }
  }


  /* ---- Create-post background picker (text mode like FB) ---- */
  let cpBgIdx = -1;
  function buildCpBgPicker(){
    const wrap = $$("#cpBgPicker");
    let html = `<div class="cp-bg-pill none active" data-bg="-1"><i class="ph ph-text-aa"></i></div>`;
    STORY_GRADS.forEach((g,i)=>{
      html += `<div class="cp-bg-pill" data-bg="${i}" style="background:${g}"></div>`;
    });
    wrap.innerHTML = html;
    wrap.querySelectorAll(".cp-bg-pill").forEach(el=>{
      el.addEventListener("click", ()=>{
        wrap.querySelectorAll(".cp-bg-pill").forEach(x=>x.classList.remove("active"));
        el.classList.add("active");
        cpBgIdx = parseInt(el.dataset.bg, 10);
        applyCpBgMode();
      });
    });
  }
  function applyCpBgMode(){
    const cap = $$("#cpCaption");
    const stage = $$("#cpBgStage");
    const bgText = $$("#cpBgText");
    if(cpBgIdx >= 0 && !cpImageFile){
      stage.classList.add("show");
      stage.style.background = STORY_GRADS[cpBgIdx];
      cap.style.display = "none";
      if(bgText.value === "" && cap.value) bgText.value = cap.value;
      setTimeout(()=>bgText.focus(), 50);
    } else {
      stage.classList.remove("show");
      cap.style.display = "";
    }
    updateCpBtn();
  }

  /* ---- Comments ---- */
  async function openComments(p) {
    openPostId = p.id;
    const header = document.getElementById('cmtPostHeader');
    if (header) {
      const a = p.author || {};
      // Use best available name; prefer display_name → full_name → username
      const authorName = a.display_name || a.full_name || a.username || 'User';
      const authorHandle = a.username || a.full_name || 'user';
      // Strip the ~bg=N~ marker from caption if present
      let captionDisplay = (p.caption || '').replace(/^~bg=\d+~/, '');
      header.innerHTML = `
        <div class="cmt-post-author">
          <div class="cmt-post-avatar" style="${avatarBG(a)}">${avatarInitials(a)}</div>
          <div>
            <div class="cmt-post-name">${esc(authorName)} <span style="font-weight:500;color:var(--ink-soft);font-size:12px;">@${esc(authorHandle)}</span></div>
            ${captionDisplay ? `<div class="cmt-post-caption">${esc(captionDisplay)}</div>` : ''}
          </div>
        </div>`;
    }
    document.getElementById('cmtList').innerHTML = `<div class="cmt-empty">Loading…</div>`;
    document.getElementById('cmtOverlay').classList.add('show');
    document.getElementById('cmtSheet').classList.add('show');
    document.getElementById('cmtInput').value = '';
    document.getElementById('cmtSend').disabled = true;
    try {
      const { data, error } = await sb.from('post_comments')
        .select('id,user_id,text,created_at,author_name,author_username,author_avatar')
        .eq('post_id', p.id).order('created_at', { ascending: true });
      if (error) throw error;
      const validComments = (data || []).filter(c => c.text && c.text.trim() !== '');
      // Only look up profiles for old comments without baked-in author info
      const oldComments = validComments.filter(c => !c.author_name && !c.author_username);
      const uids = [...new Set(oldComments.map(c => c.user_id))];
      let profs = {};
      if (uids.length) {
        const { data: pp } = await sb.from('profiles')
          .select('id,full_name,username,avatar_url').in('id', uids);
        (pp || []).forEach(x => profs[x.id] = x);
      }
      currentComments = validComments.map(c => {
        const prof = profs[c.user_id];
        return {
          ...c,
          author: {
            full_name:  c.author_name     || prof?.full_name  || null,
            username:   c.author_username || prof?.username   || null,
            avatar_url: c.author_avatar   || prof?.avatar_url || null,
          }
        };
      });
      renderComments(currentComments);
    } catch (e) {
      console.error(e);
      document.getElementById('cmtList').innerHTML =
        `<div class="cmt-empty">Couldn't load comments</div>`;
    }
  }
  function renderComments(items) {
    const list = document.getElementById('cmtList');
    if (!items.length) {
      list.innerHTML = `<div class="cmt-empty">No comments yet — start the convo 👇</div>`;
      return;
    }
    list.innerHTML = items.map(c => `
      <div class="cmt-item" data-cmt="${c.id}">
        <div class="cmt-avatar" style="${avatarBG(c.author)}">${avatarInitials(c.author)}</div>
        <div class="cmt-body">
          <div class="cmt-name">${esc(c.author.full_name || c.author.username || ('User_' + String(c.user_id||'').slice(0,6)))}</div>
          <div class="cmt-text">${esc(c.text)}</div>
          <div class="cmt-time">${timeAgo(c.created_at)}</div>
        </div>
        ${c.user_id === me.id ? `<button class="cmt-delete-btn" data-cmt-del="${c.id}">
          <i class="ph ph-trash"></i>
        </button>` : ''}
      </div>`).join('');
    list.querySelectorAll('.cmt-item').forEach(el => {
      let pressTimer;
      el.addEventListener('pointerdown', () => {
        pressTimer = setTimeout(() => el.classList.toggle('show-delete'), 500);
      });
      el.addEventListener('pointerup', () => clearTimeout(pressTimer));
      el.addEventListener('pointercancel', () => clearTimeout(pressTimer));
    });
    list.querySelectorAll('[data-cmt-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.cmtDel;
        btn.closest('.cmt-item').remove();
        const p = posts.find(x => x.id === openPostId);
        if (p) { p.comments = Math.max(0, p.comments - 1); renderFeed(); }
        await sb.from('post_comments').delete().eq('id', id).eq('user_id', me.id);
      });
    });
  }
  function closeComments(){
    $$("#cmtOverlay").classList.remove("show");
    $$("#cmtSheet").classList.remove("show");
    $$("#cmtSheet").classList.remove("snap-half");
    openPostId = null;
  }
  async function submitComment() {
    const t = document.getElementById('cmtInput').value.trim();
    if (!t || !openPostId) return;
    document.getElementById('cmtSend').disabled = true;
    const optimisticAuthor = {
      full_name:  myProfile?.full_name  || null,
      username:   myProfile?.username   || null,
      avatar_url: myProfile?.avatar_url || null,
    };
    const optimistic = {
      id: 'temp_' + Date.now(),
      user_id: me.id,
      text: t,
      created_at: new Date().toISOString(),
      author: optimisticAuthor,
    };
    currentComments.push(optimistic);
    renderComments(currentComments);
    document.getElementById('cmtInput').value = '';
    const p = posts.find(x => x.id === openPostId);
    if (p) { p.comments++; renderFeed(); }
    try {
      const { data, error } = await sb.from('post_comments')
        .insert({
          post_id: openPostId,
          user_id: me.id,
          text: t,
          author_name:     myProfile?.full_name  || myProfile?.username || null,
          author_username: myProfile?.username   || null,
          author_avatar:   myProfile?.avatar_url || null,
        })
        .select().single();
      if (error) throw error;
      const idx = currentComments.findIndex(c => c.id === optimistic.id);
      if (idx !== -1) currentComments[idx] = { ...data, author: optimisticAuthor };
    } catch (e) {
      console.error(e);
      toast("Couldn't send comment");
      currentComments = currentComments.filter(c => c.id !== optimistic.id);
      renderComments(currentComments);
      if (p) { p.comments--; renderFeed(); }
    } finally {
      document.getElementById('cmtSend').disabled = false;
    }
  }

  /* ---- Sheet drag (basic) ---- */
  function initSheetDrag(sheet, handle, onClose, opts){
    if(!sheet || !handle) return;
    const baseX = (opts && opts.baseTransform) || "";
    let sy=0, dy=0, dragging=false;
    const pointY = e => (e.touches ? e.touches[0].clientY : e.clientY);
    function onDown(e){
      dragging=true; dy=0; sy=pointY(e);
      sheet.style.transition="none";
      if(e.pointerId !== undefined && handle.setPointerCapture){
        try { handle.setPointerCapture(e.pointerId); } catch(_){}
      }
    }
    function onMove(e){
      if(!dragging) return;
      dy = Math.max(0, pointY(e) - sy);
      sheet.style.transform = `${baseX}translateY(${dy}px)`;
    }
    function onUp(){
      if(!dragging) return;
      dragging=false;
      sheet.style.transition = "";
      const h = sheet.getBoundingClientRect().height || 1;
      if(dy > h * 0.3){
        // Dragged past ~30% of sheet height — animate the rest of the way closed
        sheet.style.transform = `${baseX}translateY(100%)`;
        setTimeout(()=>{
          onClose();
          sheet.style.transform = "";
        }, 280);
      } else {
        sheet.style.transform = "";
      }
      dy = 0;
    }
    handle.addEventListener("pointerdown", onDown);
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  }

  /* ---- Realtime ---- */
  function subscribeRealtime(){
    if(realtimeChan) return;
    realtimeChan = sb.channel("feed-live")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"posts"}, async payload=>{
        const r = payload.new;
        if(posts.find(p=>p.id===r.id)) return;
        const { data:pp } = await sb.from("profiles").select("id,display_name,full_name,username,avatar_url").eq("id", r.user_id).maybeSingle();
        posts.unshift({ ...r, author: pp || { display_name:null, full_name:null, username:null }, likes:0, liked:false, comments:0 });
        renderFeed();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, payload => {
        posts = posts.filter(p => p.id !== payload.old.id);
        renderFeed();
      })
      .subscribe();
  }
  function unsubscribeRealtime(){
    if(realtimeChan){ sb.removeChannel(realtimeChan); realtimeChan=null; }
  }

  /* ---- Toast (uses existing notif card) ---- */
  function toast(msg){
    const popup = document.getElementById("notifPopup");
    const t = document.getElementById("notifTitle");
    const m = document.getElementById("notifMsg");
    if(!popup){ console.log(msg); return; }
    if(t) t.textContent = "9jaTalk";
    if(m) m.textContent = msg;
    popup.classList.add("show");
    setTimeout(()=>popup.classList.remove("show"), 2200);
  }

  /* ============================================================
     NOTIFICATIONS
     ============================================================ */
  const NOVA_NUDGES = [
    "👀 Someone might be thinking about you…",
    "🔥 Your chats are getting cold bro",
    "💬 You've got people waiting to hear from you",
    "🌟 Come check what's new on 9jaTalk",
    "😎 Your squad is online — don't leave them hanging",
    "📲 New vibes on the feed, come see",
    "🚀 9jaTalk misses you already",
    "💡 Got something on your mind? Post it",
    "🎯 Check in — someone might have replied",
    "🤙 Your chats won't read themselves bro",
    "⚡ Quick check-in never hurt nobody",
    "🧠 Big brain idea? Share it on the feed",
    "🌙 Evening check — anyone slide into your DMs?",
    "☀️ Morning! Start the day with your squad",
    "🏆 Be the friend who actually replies",
    "👋 Hey, just checking you're still alive out there",
    "💭 What's on your mind today?",
    "🔔 Tap in — your people are active",
    "🌊 Good vibes only — come see the feed",
    "😂 Someone probably sent something funny",
    "📸 New posts on your feed — worth a look",
    "✨ Your profile won't build itself",
    "🎉 Don't miss out on what's happening",
    "🤔 Wonder what your friends are up to?",
    "💪 Stay connected — tap in real quick",
    "🎶 New mood on 9jaTalk, come vibe",
    "📬 Inbox check — you good?",
    "🛸 The feed is popping rn just saying",
    "🌍 Your world is one tap away",
    "😴 Don't sleep on your notifications",
    "🔑 Log in and see what you've been missing",
    "🎤 Got something to say? The feed is waiting",
    "🧩 Something's missing… oh it's you",
    "🌈 Good things happen to those who check 9jaTalk",
    "🏄 Ride the wave — your squad needs you"
  ];

  function novaNotifEnabled() {
    return localStorage.getItem('nova_notif_enabled') === 'true'
      && Notification.permission === 'granted';
  }

  function showNudgeNotification() {
    if (!novaNotifEnabled()) return;
    const msg = NOVA_NUDGES[Math.floor(Math.random() * NOVA_NUDGES.length)];
    new Notification('9jaTalk', {
      body: msg,
      tag: 'nova-nudge'
    });
  }

  function showWelcomeNudge() {
    if (!novaNotifEnabled()) return;
    new Notification('9jaTalk', {
      body: "Notifications enabled 🔔 You're all set!",
      tag: 'nova-welcome'
    });
  }

  function scheduleFirstNudge() {
    // One-time fixed confirmation, 10 seconds after permission is granted
    setTimeout(() => {
      showWelcomeNudge();
      // Hand off to the regular 9am/6pm schedule
      scheduleNudges();
    }, 10000);
  }

  function scheduleNudges() {
    const now = new Date();
    const targets = [9, 18].map(h => {
      const d = new Date();
      d.setHours(h, 0, 0, 0);
      if (d <= now) d.setDate(d.getDate() + 1);
      return d - now;
    });
    targets.forEach(ms => {
      setTimeout(() => {
        showNudgeNotification();
        setTimeout(scheduleNudges, 1000);
      }, ms);
    });
  }

  function showMessageNotification(senderName, preview) {
    if (!novaNotifEnabled()) return;
    new Notification(senderName || 'New message', {
      body: preview || 'You have a new message on 9jaTalk',
      tag: 'nova-msg-' + Date.now()
    });
  }

  window.showMessageNotification = showMessageNotification;
  window.novaNotifEnabled = novaNotifEnabled;
  window.scheduleNudges = scheduleNudges;
  window.scheduleFirstNudge = scheduleFirstNudge;

  async function requestNotifPermission() {
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        localStorage.setItem('nova_notif_enabled', 'true');
        scheduleFirstNudge();
        toast('Notifications enabled 🔔');
        return true;
      }
    } catch(e) { console.error(e); }
    return false;
  }

  function initNotifications() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted'
        && localStorage.getItem('nova_notif_enabled') === 'true') {
      scheduleNudges();
      return;
    }
    if (!localStorage.getItem('nova_notif_asked')) {
      setTimeout(() => {
        document.getElementById('notifPermModal').classList.add('show');
      }, 2000);
    }
    const allowBtn = document.getElementById('notifModalAllow');
    const laterBtn = document.getElementById('notifModalLater');
    if (allowBtn) allowBtn.addEventListener('click', async () => {
      document.getElementById('notifPermModal').classList.remove('show');
      localStorage.setItem('nova_notif_asked', 'true');
      await requestNotifPermission();
    });
    if (laterBtn) laterBtn.addEventListener('click', () => {
      document.getElementById('notifPermModal').classList.remove('show');
      localStorage.setItem('nova_notif_asked', 'true');
    });
  }

})();


(function(){
  /* ---------- 1) Toast: bounce + drag-to-dismiss (any direction) ---------- */
  function wireToast(popup){
    if(!popup || popup.dataset.novaDragWired) return;
    popup.dataset.novaDragWired = "1";
    let sx=0, sy=0, dx=0, dy=0, dragging=false, startTime=0;

    function reset(){
      popup.style.transform = "";
      popup.style.opacity = "";
      popup.classList.remove("np-dragging","np-dismissing");
    }
    function dismiss(dirX, dirY){
      popup.classList.add("np-dismissing");
      const tx = Math.sign(dirX||0) * 480;
      const ty = Math.sign(dirY||0) * 320;
      popup.style.transform = `translateX(calc(-50% + ${tx}px)) translateY(${ty}px) scale(.9)`;
      popup.style.opacity = "0";
      setTimeout(()=>{
        popup.classList.remove("show");
        reset();
      }, 240);
    }
    popup.addEventListener("pointerdown",(e)=>{
      if(e.target.closest(".notif-close")) return;
      dragging=true; sx=e.clientX; sy=e.clientY; dx=0; dy=0; startTime=Date.now();
      popup.setPointerCapture(e.pointerId);
      popup.classList.add("np-dragging");
    });
    popup.addEventListener("pointermove",(e)=>{
      if(!dragging) return;
      dx = e.clientX - sx;
      dy = e.clientY - sy;
      const dist = Math.hypot(dx,dy);
      const opacity = Math.max(.25, 1 - dist/240);
      popup.style.transform = `translateX(calc(-50% + ${dx}px)) translateY(${dy}px)`;
      popup.style.opacity = opacity;
    });
    function end(e){
      if(!dragging) return;
      dragging=false;
      try{ popup.releasePointerCapture(e.pointerId); }catch(_){}
      const dist = Math.hypot(dx,dy);
      const dt = Date.now()-startTime;
      const velocity = dist / Math.max(dt,1);
      if(dist > 70 || velocity > 0.45){ dismiss(dx, dy); }
      else {
        popup.style.transition = "transform .25s cubic-bezier(.34,1.4,.64,1), opacity .25s ease";
        popup.style.transform = "translateX(-50%) translateY(0)";
        popup.style.opacity = "1";
        setTimeout(()=>{ popup.style.transition=""; reset(); }, 260);
      }
    }
    popup.addEventListener("pointerup", end);
    popup.addEventListener("pointercancel", end);
  }
  document.querySelectorAll('.notif-popup').forEach(wireToast);

  /* ---------- 2) Offline -> reddish toast ---------- */
  function findShowToast(){
    // chats.html exposes showToast(title,msg,type); profile.html uses toast(msg,type)
    if(typeof window.showToast === "function") return (t,m)=>window.showToast(t,m,"bad");
    if(typeof window.toast === "function") return (t,m)=>window.toast(m||t, "bad");
    return (t,m)=>{
      const p = document.querySelector('.notif-popup');
      const card = p && p.querySelector('.notif-card');
      const ti = p && p.querySelector('.notif-title, [id^=notifTitle]');
      const ms = p && p.querySelector('.notif-msg, [id^=notifMsg]');
      if(!p) return;
      if(card){ card.className = "notif-card bad"; }
      if(ti) ti.textContent = t;
      if(ms) ms.textContent = m;
      p.classList.add("show");
      setTimeout(()=>p.classList.remove("show"), 3500);
    };
  }
  function offlineToast(){
    const fn = findShowToast();
    fn("Offline", "You're offline — check your connection");
  }
  function onlineToast(){
    // optional: silent or quick success — keep it brief & matching toast system
    if(typeof window.showToast === "function") window.showToast("Back online","Connection restored","good");
    else if(typeof window.toast === "function") window.toast("Back online","good");
  }
  // Hide any existing offline banners
  document.querySelectorAll('.offline').forEach(el=>{ el.classList.remove('show'); el.style.display='none'; });
  let wasOffline = !navigator.onLine;
  if(wasOffline) setTimeout(offlineToast, 600);
  window.addEventListener('offline', ()=>{ wasOffline=true; offlineToast(); });
  window.addEventListener('online', ()=>{ if(wasOffline){ wasOffline=false; onlineToast(); } });

  /* ---------- 3) Universal drag-down-to-close on all sheets ---------- */
  const SHEET_SELECTORS = [
    '.bsheet', '.psheet', '.menu-sheet', '.row-action-sheet', '.report-sheet',
    '.confirm-sheet', '.msg-action-sheet', '.del-choice-sheet', '.fwd-sheet',
    '.post-menu-sheet', '.share-sheet'
  ];
  // Map sheet => overlay element (by convention: sibling overlay or id pattern)
  function findOverlayFor(sheet){
    // try common patterns
    const id = sheet.id || "";
    const overlayIdGuesses = [
      id+"Overlay", id.replace(/Sheet$/,"Overlay"), id.replace(/-sheet/,"-overlay"),
    ].filter(Boolean);
    for(const oid of overlayIdGuesses){
      const el = document.getElementById(oid); if(el) return el;
    }
    // search prev/next siblings within same parent for an .*-overlay or .bsheet-overlay
    const parent = sheet.parentElement;
    if(parent){
      const ovs = parent.querySelectorAll('.bsheet-overlay,.psheet-overlay,.menu-overlay,.sheet-overlay,[class*="overlay"]');
      for(const ov of ovs){ if(ov.classList.contains('show')) return ov; }
      if(ovs.length===1) return ovs[0];
    }
    return null;
  }
  function closeSheet(sheet){
    sheet.classList.remove('show','open','visible');
    sheet.style.transform = "";
    sheet.style.opacity = "";
    sheet.classList.remove('nova-sheet-dragging');
    const ov = findOverlayFor(sheet);
    if(ov) ov.classList.remove('show','open');
    // Also remove any open overlay anywhere if no sheets remain open
    setTimeout(()=>{
      const stillOpen = document.querySelector(SHEET_SELECTORS.map(s=>s+'.show, '+s+'.open').join(','));
      if(!stillOpen){
        document.querySelectorAll('.bsheet-overlay,.psheet-overlay,.menu-overlay').forEach(o=>o.classList.remove('show','open'));
      }
    }, 50);
  }
  function wireSheet(sheet){
    if(sheet.dataset.novaSheetDrag) return;
    sheet.dataset.novaSheetDrag = "1";
    let sx=0, sy=0, dy=0, dragging=false, baseTransform="", startTime=0;
    sheet.addEventListener('pointerdown',(e)=>{
      // ignore drag if interacting with form fields or scrolling content
      const tag = (e.target.tagName||"").toLowerCase();
      if(['input','textarea','select','button','a'].includes(tag) && !e.target.closest('.psheet-handle,.post-menu-handle,.sheet-handle')) {
        // allow drag from handles even on buttons
      }
      const scrollable = e.target.closest('.psheet-scroll, .sheet-scroll, [data-scrollable]');
      if(scrollable && scrollable.scrollTop > 0) return;
      dragging=true; sx=e.clientX; sy=e.clientY; dy=0; startTime=Date.now();
      try{ sheet.setPointerCapture(e.pointerId);}catch(_){}
      sheet.classList.add('nova-sheet-dragging');
    });
    sheet.addEventListener('pointermove',(e)=>{
      if(!dragging) return;
      dy = e.clientY - sy;
      if(dy < 0) dy = dy * 0.15; // resistance upward
      // preserve any centering (translateX(-50%))
      const isCentered = getComputedStyle(sheet).left === '50%' || sheet.classList.contains('menu-sheet') || sheet.classList.contains('row-action-sheet') || sheet.classList.contains('report-sheet') || sheet.classList.contains('confirm-sheet') || sheet.classList.contains('msg-action-sheet') || sheet.classList.contains('del-choice-sheet');
      sheet.style.transform = isCentered
        ? `translateX(-50%) translateY(${Math.max(0,dy)}px)`
        : `translateY(${Math.max(0,dy)}px)`;
    });
    function end(e){
      if(!dragging) return;
      dragging=false;
      try{ sheet.releasePointerCapture(e.pointerId);}catch(_){}
      const dt = Date.now()-startTime;
      const velocity = dy / Math.max(dt,1);
      sheet.classList.remove('nova-sheet-dragging');
      if(dy > 110 || velocity > 0.6){
        closeSheet(sheet);
      } else {
        sheet.style.transition = "transform .3s cubic-bezier(.34,1.4,.64,1)";
        sheet.style.transform = "";
        setTimeout(()=>{ sheet.style.transition=""; }, 320);
      }
    }
    sheet.addEventListener('pointerup', end);
    sheet.addEventListener('pointercancel', end);
  }
  function rewireAll(){
    SHEET_SELECTORS.forEach(sel=>{
      document.querySelectorAll(sel).forEach(wireSheet);
    });
    document.querySelectorAll('.notif-popup').forEach(wireToast);
  }
  rewireAll();
  // re-wire when new sheets are added dynamically
  const mo = new MutationObserver(()=>{ rewireAll(); });
  mo.observe(document.body,{childList:true,subtree:true});
})();

}
