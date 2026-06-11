(function () {
  'use strict';

  var TOOLS = {
    dashboard: { name: '首页', path: null },
    exam:      { name: '公考助手',   path: '../公考助手/index.html' },
    essay:     { name: '申论方格纸', path: '../申论方格纸/index.html' },
    speed:     { name: '资料速算',   path: '../资料训练/index.html' },
    curve:     { name: '遗忘曲线', path: '../遗忘曲线/index.html' }
  };

  var currentView = 'dashboard';
  var els = {};
  var syncInfo = { hasConfig: false, syncKey: '' };

  var timerState = { mode: 'stopwatch', running: false, elapsed: 0, laps: [], startTime: 0, tickId: null };
  var cdState = { name: '', date: '', milestones: [] };
  var links = [];

  function init() {
    if (window.SyncStore) syncInfo = window.SyncStore.init();
    els.sidebar = document.querySelector('.sidebar');
    els.navItems = document.querySelectorAll('.nav-item');
    els.dashboard = document.getElementById('dashboard-view');
    els.toolContainer = document.getElementById('tool-container');
    els.toolFrame = document.getElementById('tool-frame');
    els.pageTitle = document.getElementById('page-title');
    els.mobileBtn = document.getElementById('mobile-menu-btn');
    els.sidebarOverlay = document.getElementById('sidebar-overlay');
    els.themeToggle = document.getElementById('theme-toggle');
    els.syncBtn = document.getElementById('sidebar-sync-btn');
    var savedTheme = localStorage.getItem('gk-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    els.navItems.forEach(function (item) {
      item.addEventListener('click', function () { navigateTo(item.dataset.view); closeMobileMenu(); });
    });
    els.mobileBtn.addEventListener('click', toggleMobileMenu);
    els.sidebarOverlay.addEventListener('click', closeMobileMenu);
    els.themeToggle.addEventListener('click', toggleTheme);
    if (els.syncBtn) els.syncBtn.addEventListener('click', openSyncConfig);
    document.querySelectorAll('.tool-card').forEach(function (card) {
      card.addEventListener('click', function () { var v = card.dataset.view; if (v) navigateTo(v); });
    });
    loadAllData();
    setGreeting();
    navigateTo('dashboard');
  }

  function loadAllData() {
    var savedTheme = localStorage.getItem('gk-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    if (window.SyncStore && syncInfo.hasConfig) {
      window.SyncStore.fetchAllKeys(function (rows) {
        if (rows && rows.length > 0) {
          rows.forEach(function (row) {
            if (row.data_value != null) { try { localStorage.setItem(row.data_key, JSON.stringify(row.data_value)); } catch(e) {} }
          });
        }
        loadFromLocal();
      });
    } else { loadFromLocal(); }
  }

  function loadFromLocal() {
    try {
      var td = JSON.parse(localStorage.getItem('gk-timer'));
      if (td) {
        timerState.elapsed = td.elapsed || 0;
        timerState.laps = td.laps || [];
        timerState.mode = td.mode || 'stopwatch';
        if (td.running && td.startTime) {
          var diff = Date.now() - td.startTime;
          if (diff < 60000) { timerState.running = true; timerState.startTime = td.startTime; }
          else { timerState.running = false; timerState.startTime = 0; timerState.elapsed = (td.elapsed || 0) + diff; }
        }
      }
    } catch(e) {}
    try { var cdd = JSON.parse(localStorage.getItem('gk-countdown')); if (cdd) { cdState.name = cdd.name || ''; cdState.date = cdd.date || ''; cdState.milestones = cdd.milestones || []; } } catch(e) {}
    try { var ld = JSON.parse(localStorage.getItem('gk-links')); if (ld && Array.isArray(ld)) links = ld; } catch(e) {}
    renderTimer(); renderCountdown(); renderLinks(); renderSyncStatus();
  }

  function navigateTo(view) {
    if (view === currentView) return;
    var tool = TOOLS[view];
    if (!tool) return;
    if (timerState.running) saveTimerState();
    els.navItems.forEach(function (el) { el.classList.remove('active'); });
    var activeNav = document.querySelector('.nav-item[data-view="' + view + '"]');
    if (activeNav) activeNav.classList.add('active');
    if (view === 'dashboard') {
      els.dashboard.style.display = '';
      els.toolContainer.classList.remove('active');
      els.pageTitle.textContent = '首页';
      if (timerState.running && !timerState.tickId) timerState.tickId = setInterval(tickTimer, 100);
    } else {
      els.dashboard.style.display = 'none';
      els.toolContainer.classList.add('active');
      els.toolFrame.src = tool.path;
      els.pageTitle.textContent = tool.name;
    }
    currentView = view;
  }

  function setGreeting() {
    var h = new Date().getHours();
    var greet;
    if (h < 6) greet = '夜深了，还在学习';
    else if (h < 9) greet = '早上好';
    else if (h < 12) greet = '上午好';
    else if (h < 14) greet = '中午好';
    else if (h < 18) greet = '下午好';
    else greet = '晚上好';
    var el = document.getElementById('greeting-text');
    if (el) el.textContent = greet;
    var dateEl = document.getElementById('greeting-date');
    if (dateEl) {
      var now = new Date();
      var y = now.getFullYear();
      var m = String(now.getMonth() + 1).padStart(2, '0');
      var d = String(now.getDate()).padStart(2, '0');
      var weekdays = ['日', '一', '二', '三', '四', '五', '六'];
      var wd = weekdays[now.getDay()];
      dateEl.textContent = y + '年' + m + '月' + d + '日 星期' + wd;
    }
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('gk-theme', next); } catch(e) {}
    if (window.SyncStore) window.SyncStore.writeData('gk-theme', next);
    updateThemeIcon(next);
  }

  function updateThemeIcon(theme) {
    var icon = els.themeToggle && els.themeToggle.querySelector('.theme-icon');
    var label = els.themeToggle && els.themeToggle.querySelector('.theme-label');
    if (!icon || !label) return;
    if (theme === 'dark') {
      icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
      label.textContent = '浅色模式';
    } else {
      icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
      label.textContent = '深色模式';
    }
  }

  function saveTimerState() {
    try {
      var data = { mode: timerState.mode, running: timerState.running, elapsed: timerState.elapsed, laps: timerState.laps, startTime: timerState.running ? Date.now() : 0 };
      localStorage.setItem('gk-timer', JSON.stringify(data));
      if (window.SyncStore && !timerState.running) window.SyncStore.writeData('gk-timer', data);
    } catch(e) {}
  }

  function formatMs(ms) {
    var ts = Math.floor(ms / 1000);
    return String(Math.floor(ts / 3600)).padStart(2,'0') + ':' + String(Math.floor((ts % 3600) / 60)).padStart(2,'0') + ':' + String(ts % 60).padStart(2,'0') + '.' + String(Math.floor((ms % 1000) / 10)).padStart(2,'0');
  }

  function formatSimple(ms) {
    var ts = Math.floor(Math.max(0, ms) / 1000);
    return String(Math.floor(ts / 3600)).padStart(2,'0') + ':' + String(Math.floor((ts % 3600) / 60)).padStart(2,'0') + ':' + String(ts % 60).padStart(2,'0');
  }

  function tickTimer() {
    if (!timerState.running) return;
    var elapsed = timerState.elapsed + (Date.now() - timerState.startTime);
    updateTimerDisplay(elapsed);
  }

  function updateTimerDisplay(elapsedMs) {
    var display = document.getElementById('timer-display');
    var lapList = document.getElementById('timer-laps');
    var lapTitle = document.getElementById('timer-laps-title');
    if (!display) return;
    if (timerState.mode === 'stopwatch') {
      display.textContent = formatMs(elapsedMs);
    } else {
      var cdRemaining = timerState.elapsed;
      if (timerState.running && timerState.startTime) cdRemaining = Math.max(0, timerState.elapsed - (Date.now() - timerState.startTime));
      display.textContent = formatSimple(cdRemaining);
      if (cdRemaining <= 0) {
        display.classList.add('countdown-warning');
        if (timerState.running) { timerState.running = false; clearInterval(timerState.tickId); timerState.tickId = null; saveTimerState(); playAlarm(); showSyncToast('倒计时结束！'); }
      } else if (cdRemaining < 60000) display.classList.add('countdown-warning');
      else display.classList.remove('countdown-warning');
    }
    if (lapList && timerState.mode === 'stopwatch') {
      if (timerState.laps.length > 0) {
        if (lapTitle) { lapTitle.classList.add('visible'); lapTitle.textContent = '分段记录'; }
        lapList.innerHTML = '';
        for (var i = timerState.laps.length - 1; i >= 0; i--) {
          var row = document.createElement('div'); row.className = 'timer-lap-row';
          row.innerHTML = '<span>第' + (i+1) + '段</span><span>' + formatMs(timerState.laps[i]) + '</span>';
          lapList.appendChild(row);
        }
      } else {
        if (lapTitle) lapTitle.classList.remove('visible');
        lapList.innerHTML = '<div class="timer-empty-laps">点击“记次”记录分段时间</div>';
      }
    }
  }

  function timerStartStop() {
    var btn = document.getElementById('timer-start-btn');
    if (timerState.mode === 'stopwatch') {
      if (timerState.running) {
        timerState.running = false; timerState.elapsed += Date.now() - timerState.startTime; timerState.startTime = 0;
        if (timerState.tickId) { clearInterval(timerState.tickId); timerState.tickId = null; }
        if (btn) btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
        saveTimerState();
      } else {
        timerState.running = true; timerState.startTime = Date.now();
        if (timerState.tickId) clearInterval(timerState.tickId);
        timerState.tickId = setInterval(tickTimer, 100);
        if (btn) btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
      }
    } else {
      if (timerState.running) {
        timerState.running = false; timerState.startTime = 0;
        if (timerState.tickId) { clearInterval(timerState.tickId); timerState.tickId = null; }
        if (btn) btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
        saveTimerState();
      } else {
        if (timerState.elapsed <= 0) {
          var hInp = document.getElementById('countdown-h'), mInp = document.getElementById('countdown-m'), sInp = document.getElementById('countdown-s');
          var hh = parseInt(hInp ? hInp.value : 0, 10) || 0, mm = parseInt(mInp ? mInp.value : 0, 10) || 0, ss = parseInt(sInp ? sInp.value : 0, 10) || 0;
          timerState.elapsed = ((hh * 3600) + (mm * 60) + ss) * 1000;
          if (timerState.elapsed <= 0) { showSyncToast('请设置倒计时时长'); return; }
        }
        timerState.running = true; timerState.startTime = Date.now();
        if (timerState.tickId) clearInterval(timerState.tickId);
        timerState.tickId = setInterval(tickTimer, 100);
        if (btn) btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
      }
    }
  }

  function timerReset() {
    timerState.running = false; timerState.elapsed = 0; timerState.laps = []; timerState.startTime = 0;
    if (timerState.tickId) { clearInterval(timerState.tickId); timerState.tickId = null; }
    var d = document.getElementById('timer-display'), b = document.getElementById('timer-start-btn');
    if (d) { d.textContent = timerState.mode === 'stopwatch' ? '00:00:00.00' : '00:00:00'; d.classList.remove('countdown-warning'); }
    if (b) b.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
    var lt = document.getElementById('timer-laps-title'), ll = document.getElementById('timer-laps');
    if (lt) lt.classList.remove('visible'); if (ll) ll.innerHTML = '';
    saveTimerState();
  }

  function timerLap() {
    if (!timerState.running || timerState.mode !== 'stopwatch') return;
    timerState.laps.push(timerState.elapsed + (Date.now() - timerState.startTime));
    updateTimerDisplay(timerState.elapsed + (Date.now() - timerState.startTime));
    saveTimerState();
  }

  function switchTimerMode(mode) {
    if (timerState.running) { timerState.running = false; if (timerState.tickId) { clearInterval(timerState.tickId); timerState.tickId = null; } }
    timerState.mode = mode; timerState.elapsed = 0; timerState.laps = []; timerState.startTime = 0;
    var display = document.getElementById('timer-display'), btn = document.getElementById('timer-start-btn');
    var lapBtn = document.getElementById('timer-lap-btn'), cdSetup = document.getElementById('countdown-setup');
    var swLaps = document.getElementById('sw-lap-area'), lapTitle = document.getElementById('timer-laps-title');
    if (display) { display.textContent = mode === 'stopwatch' ? '00:00:00.00' : '00:00:00'; display.classList.remove('countdown-warning'); }
    if (btn) btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
    if (lapBtn) lapBtn.style.display = mode === 'stopwatch' ? '' : 'none';
    if (cdSetup) cdSetup.style.display = mode === 'countdown' ? '' : 'none';
    if (swLaps) swLaps.style.display = mode === 'stopwatch' ? '' : 'none';
    if (lapTitle) lapTitle.classList.remove('visible');
    document.querySelectorAll('.timer-mode-tab').forEach(function(t){t.classList.remove('active');});
    var at = document.querySelector('.timer-mode-tab[data-mode="' + mode + '"]');
    if (at) at.classList.add('active');
    saveTimerState();
  }

  function playAlarm() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      var ctx = new AC();
      for (var i = 0; i < 4; i++) {
        (function(d) { setTimeout(function() {
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; o.type = 'sine';
          g.gain.setValueAtTime(0.4, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
          o.start(ctx.currentTime); o.stop(ctx.currentTime + 1);
        }, d); })(i * 700);
      }
    } catch(e) {}
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('考公工具箱', { body: '倒计时已结束！' });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }

  function renderTimer() {
    if (timerState.running && timerState.startTime && !timerState.tickId) timerState.tickId = setInterval(tickTimer, 100);
    var elapsed = timerState.elapsed + (timerState.running && timerState.startTime ? Date.now() - timerState.startTime : 0);
    var display = document.getElementById('timer-display');
    if (!display) return;
    if (timerState.mode === 'stopwatch') display.textContent = formatMs(elapsed);
    else {
      var r = timerState.elapsed - (timerState.running && timerState.startTime ? Date.now() - timerState.startTime : 0);
      display.textContent = formatSimple(Math.max(0, r));
    }
    var btn = document.getElementById('timer-start-btn');
    if (btn) btn.innerHTML = timerState.running
      ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
    var lapBtn = document.getElementById('timer-lap-btn'), cdSetup = document.getElementById('countdown-setup'), swLaps = document.getElementById('sw-lap-area');
    if (lapBtn) lapBtn.style.display = timerState.mode === 'stopwatch' ? '' : 'none';
    if (cdSetup) cdSetup.style.display = timerState.mode === 'countdown' ? '' : 'none';
    if (swLaps) swLaps.style.display = timerState.mode === 'stopwatch' ? '' : 'none';
    updateTimerDisplay(elapsed);
  }

  function renderCountdown() {
    var section = document.getElementById('countdown-section');
    if (!section) return;
    if (!cdState.name || !cdState.date) {
      section.innerHTML = '<div class="countdown-empty"><p>还没有设置考试目标</p><button onclick="window.openCountdownConfig()">设置考试</button></div>';
      return;
    }
    var targetDate = new Date(cdState.date + 'T00:00:00');
    var now = new Date(); now.setHours(0,0,0,0);
    var diffDays = Math.ceil((targetDate - now) / (1000*60*60*24));
    var firstMs = (cdState.milestones.length > 0 && cdState.milestones[0].date) ? new Date(cdState.milestones[0].date + 'T00:00:00').getTime() : targetDate.getTime();
    var totalDays = Math.max(1, Math.ceil((targetDate.getTime() - firstMs) / (1000*60*60*24)));
    var passedDays = Math.max(0, Math.ceil((now.getTime() - firstMs) / (1000*60*60*24)));
    var pct = Math.min(100, Math.round(passedDays / totalDays * 100));
    var done = 0;
    var mh = '';
    cdState.milestones.forEach(function(ms) {
      var md = new Date(ms.date + 'T00:00:00'), isDone = md <= now;
      if (isDone) done++;
      mh += '<div class="countdown-milestone ' + (isDone ? 'done' : 'upcoming') + '"><div class="ms-check">' + (isDone ? '✓' : '') + '</div><span class="ms-name">' + (ms.name||'') + '</span><span class="ms-date">' + (ms.date||'') + '</span></div>';
    });
    section.innerHTML = '<div class="countdown-header"><div class="countdown-title">' + cdState.name + '</div><button class="countdown-edit-btn" onclick="window.openCountdownConfig()">编辑</button></div>' +
      '<div class="countdown-big-number">' + (diffDays > 0 ? diffDays : 0) + '</div><div class="countdown-big-unit">' + (diffDays > 0 ? '天' : '已到期') + '</div>' +
      '<div class="countdown-progress"><div class="countdown-progress-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="countdown-milestones-title">里程碑 (' + done + '/' + cdState.milestones.length + ')</div><div class="countdown-milestones">' + mh + '</div>';
  }

  function saveCountdownConfig() { try { localStorage.setItem('gk-countdown', JSON.stringify(cdState)); if (window.SyncStore) window.SyncStore.writeData('gk-countdown', cdState); } catch(e) {} renderCountdown(); }

  function openCountdownConfig() {
    var overlay = document.getElementById('cd-config-overlay'); if (!overlay) return;
    var nameInp = document.getElementById('cd-config-name'), dateInp = document.getElementById('cd-config-date');
    if (nameInp) nameInp.value = cdState.name || '';
    if (dateInp) dateInp.value = cdState.date || '';
    var list = document.getElementById('cd-config-milestones');
    if (list) {
      var defMs = [{name:'报名截止',date:''},{name:'缴费截止',date:''},{name:'打印准考证',date:''},{name:'笔试',date:''},{name:'面试',date:''}];
      var msList = cdState.milestones.length > 0 ? cdState.milestones : defMs;
      list.innerHTML = '';
      msList.forEach(function(ms, idx) {
        var div = document.createElement('div'); div.className = 'countdown-config-milestone';
        div.innerHTML = '<label>' + (ms.name||'') + '</label><input type="date" class="cd-ms-date" data-idx="' + idx + '" value="' + (ms.date||'') + '">';
        list.appendChild(div);
      });
    }
    overlay.classList.add('open');
  }

  function saveCountdownConfigModal() {
    var nameInp = document.getElementById('cd-config-name'), dateInp = document.getElementById('cd-config-date');
    if (nameInp) cdState.name = nameInp.value;
    if (dateInp) cdState.date = dateInp.value;
    var list = document.getElementById('cd-config-milestones');
    if (list) {
      var defMs = [{name:'报名截止',date:''},{name:'缴费截止',date:''},{name:'打印准考证',date:''},{name:'笔试',date:''},{name:'面试',date:''}];
      cdState.milestones = cdState.milestones.length > 0 ? cdState.milestones : defMs;
      list.querySelectorAll('.cd-ms-date').forEach(function(inp) { var idx = parseInt(inp.dataset.idx, 10); if (cdState.milestones[idx]) cdState.milestones[idx].date = inp.value; });
    }
    saveCountdownConfig();
    closeCountdownConfigModal();
  }

  function closeCountdownConfigModal() { var o = document.getElementById('cd-config-overlay'); if (o) o.classList.remove('open'); }
  window.openCountdownConfig = openCountdownConfig;

  function renderLinks() {
    var c = document.getElementById('footer-links'), e = document.getElementById('footer-links-empty');
    if (!c) return;
    if (links.length === 0) { c.innerHTML = ''; if (e) e.style.display = ''; return; }
    if (e) e.style.display = 'none';
    c.innerHTML = '';
    links.forEach(function(l) {
      var a = document.createElement('a'); a.className = 'dashboard-footer-link'; a.href = l.url; a.target = '_blank'; a.rel = 'noopener';
      a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' + (l.name || l.url);
      c.appendChild(a);
    });
  }

  function saveLinks() { try { localStorage.setItem('gk-links', JSON.stringify(links)); if (window.SyncStore) window.SyncStore.writeData('gk-links', links); } catch(e) {} renderLinks(); }

  function openLinkManager() { var o = document.getElementById('link-manager-overlay'); if (!o) return; renderLinkManagerList(); o.classList.add('open'); }
  function closeLinkManager() { var o = document.getElementById('link-manager-overlay'); if (o) o.classList.remove('open'); }

  function addLink() {
    var n = document.getElementById('lm-new-name'), u = document.getElementById('lm-new-url');
    if (!n || !u) return;
    var name = n.value.trim(), url = u.value.trim();
    if (!name) { showSyncToast('请输入链接名称'); return; }
    if (!url) { showSyncToast('请输入链接网址'); return; }
    if (!url.match(/^https?:\/\//i)) url = 'https://' + url;
    links.push({name:name, url:url}); n.value = ''; u.value = '';
    saveLinks(); renderLinkManagerList(); n.focus();
  }

  function deleteLink(idx) { links.splice(idx, 1); saveLinks(); renderLinkManagerList(); }
  window.deleteLink = deleteLink;

  function renderLinkManagerList() {
    var list = document.getElementById('link-manager-list'), empty = document.getElementById('link-manager-empty');
    if (!list) return;
    if (links.length === 0) { list.innerHTML = ''; if (empty) empty.style.display = ''; return; }
    if (empty) empty.style.display = 'none';
    list.innerHTML = '';
    links.forEach(function(l, idx) {
      var div = document.createElement('div'); div.className = 'link-manager-item'; div.draggable = true; div.dataset.idx = idx;
      div.innerHTML = '<span class="drag-handle"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="19" r="2"/><circle cx="15" cy="19" r="2"/></svg></span><span class="lm-name">' + esc(l.name) + '</span><span class="lm-url">' + esc(l.url) + '</span><button class="lm-del-btn" onclick="window.deleteLink(' + idx + ')" title="删除">✕</button>';
      div.addEventListener('dragstart', function() { div.classList.add('dragging'); });
      div.addEventListener('dragend', function() { div.classList.remove('dragging'); });
      div.addEventListener('dragover', function(e) { e.preventDefault(); });
      div.addEventListener('drop', function(e) {
        e.preventDefault();
        var fi = parseInt(e.dataTransfer.getData('text/plain'), 10), ti = parseInt(div.dataset.idx, 10);
        if (fi !== ti && !isNaN(fi) && !isNaN(ti)) { var item = links.splice(fi, 1)[0]; links.splice(ti, 0, item); saveLinks(); renderLinkManagerList(); }
      });
      list.appendChild(div);
    });
  }

  function esc(s) { var d = document.createElement('div'); d.appendChild(document.createTextNode(s||'')); return d.innerHTML; }

  function renderSyncStatus() {
    var el = document.getElementById('sidebar-sync-status');
    if (!el) return;
    el.className = 'sidebar-sync-status ' + (syncInfo.hasConfig ? 'online' : 'offline');
    el.title = syncInfo.hasConfig ? '同步已配置' : '同步未配置';
  }

  function openSyncConfig() {
    var overlay = document.getElementById('sync-overlay'); if (!overlay) return;
    var dot = document.getElementById('sync-status-dot'), txt = document.getElementById('sync-status-text');
    if (syncInfo.hasConfig) { if (dot) dot.className = 'sync-status-dot online'; if (txt) txt.textContent = '已连接云端同步'; }
    else { if (dot) dot.className = 'sync-status-dot pending'; if (txt) txt.textContent = '未配置 - 仅本地使用'; }
    var keyEl = document.getElementById('sync-key-code'); if (keyEl) keyEl.textContent = syncInfo.syncKey || '------';
    var inputEl = document.getElementById('sync-key-input'); if (inputEl) inputEl.value = syncInfo.syncKey || '';
    overlay.classList.add('open');
  }

  function closeSyncConfig() { var o = document.getElementById('sync-overlay'); if (o) o.classList.remove('open'); }

  function applySyncKey() {
    var inputEl = document.getElementById('sync-key-input');
    if (!inputEl || !inputEl.value.trim()) return;
    var newKey = inputEl.value.trim().toUpperCase();
    if (window.SyncStore) {
      window.SyncStore.setSyncKey(newKey); syncInfo.syncKey = newKey;
      if (syncInfo.hasConfig) {
        window.SyncStore.fetchAllKeys(function(rows) {
          if (rows && rows.length > 0) rows.forEach(function(row) { if (row.data_value != null) { try { localStorage.setItem(row.data_key, JSON.stringify(row.data_value)); } catch(e) {} } });
          loadFromLocal(); showSyncToast('同步密钥已更新，数据已加载');
        });
      } else { loadFromLocal(); showSyncToast('同步密钥已更新'); }
      var keyEl = document.getElementById('sync-key-code'); if (keyEl) keyEl.textContent = newKey;
    }
  }

  function copySyncKey() {
    var key = syncInfo.syncKey || '';
    if (!key) return;
    navigator.clipboard.writeText(key).then(function() { showSyncToast('已复制同步密钥：' + key); }).catch(function() { showSyncToast('无法复制，请手动拷贝'); });
  }

  function showSyncToast(msg) {
    var t = document.getElementById('sync-toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._t); t._t = setTimeout(function() { t.classList.remove('show'); }, 2500);
  }

  function toggleMobileMenu() { els.sidebar.classList.toggle('open'); els.sidebarOverlay.classList.toggle('open'); }
  function closeMobileMenu() { els.sidebar.classList.remove('open'); els.sidebarOverlay.classList.remove('open'); }

  window.timerStartStop = timerStartStop; window.timerReset = timerReset; window.timerLap = timerLap;
  window.switchTimerMode = switchTimerMode; window.openLinkManager = openLinkManager;
  window.closeLinkManager = closeLinkManager; window.addLink = addLink;
  window.openSyncConfig = openSyncConfig; window.closeSyncConfig = closeSyncConfig;
  window.applySyncKey = applySyncKey; window.copySyncKey = copySyncKey;
  window.saveCountdownConfigModal = saveCountdownConfigModal; window.closeCountdownConfigModal = closeCountdownConfigModal;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();