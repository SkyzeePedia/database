(async function(){
  const key = localStorage.getItem('db_key') || '';
  const role = localStorage.getItem('db_role') || '';

  const roleInfo = document.getElementById('roleInfo');
  const btnLogout = document.getElementById('btnLogout');
  const numberInput = document.getElementById('numberInput');
  const btnAdd = document.getElementById('btnAdd');
  const addMsg = document.getElementById('addMsg');
  const searchInput = document.getElementById('searchInput');
  const btnSearch = document.getElementById('btnSearch');
  const btnRefresh = document.getElementById('btnRefresh');
  const listArea = document.getElementById('listArea');
  const adminArea = document.getElementById('adminArea');
  const logsArea = document.getElementById('logsArea');

  if (!key) {
    if (location.pathname.endsWith('dashboard.html')) {
      location.href = '/login.html';
      return;
    }
  } else {
    if (roleInfo) roleInfo.textContent = `Role: ${role} • key: ${key}`;
    if (role === 'admin' && adminArea) adminArea.classList.remove('hidden');
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      localStorage.removeItem('db_key');
      localStorage.removeItem('db_role');
      location.href = '/login.html';
    });
  }

  if (btnAdd) {
    btnAdd.addEventListener('click', async () => {
      const number = numberInput.value.trim();
      if (!number) return showAddMsg('Masukkan nomor dulu', true);
      try {
        const res = await fetch('/api/add', {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ key, number })
        });
        const j = await res.json();
        if (!j.success) return showAddMsg(j.message||'Gagal tambah', true);
        showAddMsg('Berhasil tambah: ' + j.number, false);
        numberInput.value = '';
        loadList();
        if (role === 'admin') loadLogs();
      } catch (e) {
        showAddMsg('Kesalahan koneksi', true);
      }
    });
  }

  function showAddMsg(t, err=false) {
    if (!addMsg) return;
    addMsg.textContent = t;
    addMsg.style.color = err ? '#b91c1c' : '#064e3b';
  }

  if (btnSearch) btnSearch.addEventListener('click', () => loadList(searchInput.value.trim()));
  if (btnRefresh) btnRefresh.addEventListener('click', () => { searchInput.value=''; loadList(); });

  async function loadList(q='') {
    try {
      const url = q ? '/api/search?q=' + encodeURIComponent(q) : '/api/list';
      const res = await fetch(url);
      const j = await res.json();
      if (!j.success) { listArea.innerHTML = '<div class="muted">Gagal memuat</div>'; return; }
      if (!j.numbers || j.numbers.length === 0) { listArea.innerHTML = '<div class="muted">Belum ada nomor</div>'; return; }

      listArea.innerHTML = '';
      for (const num of j.numbers) {
        const div = document.createElement('div');
        div.className = 'list-item';
        const left = document.createElement('div');
        left.innerHTML = `<div class="num">${num}</div><div class="muted small">WhatsApp Number</div>`;
        const right = document.createElement('div');
        if (role === 'admin') {
          const btnDel = document.createElement('button');
          btnDel.className = 'btn'; btnDel.textContent = 'Hapus';
          btnDel.onclick = ()=> deleteNumber(num);
          right.appendChild(btnDel);
        } else {
          right.innerHTML = `<a class="btn ghost" href="https://wa.me/${num}" target="_blank">Chat</a>`;
        }
        div.appendChild(left); div.appendChild(right);
        listArea.appendChild(div);
      }
    } catch (e) {
      listArea.innerHTML = '<div class="muted">Kesalahan koneksi</div>';
    }
  }

  async function deleteNumber(number) {
    if (!confirm('Hapus nomor ' + number + ' ?')) return;
    try {
      const res = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ key, number })
      });
      const j = await res.json();
      if (!j.success) return alert('Gagal: ' + (j.message || 'Error'));
      alert('Nomor dihapus: ' + j.number);
      loadList();
      if (role === 'admin') loadLogs();
    } catch (e) {
      alert('Kesalahan koneksi');
    }
  }

  async function loadLogs() {
    if (role !== 'admin' || !logsArea) return;
    try {
      const res = await fetch('/api/logs?key=' + encodeURIComponent(key));
      const j = await res.json();
      if (!j.success) { logsArea.innerHTML = '<div class="muted">Gagal memuat logs</div>'; return; }
      if (!j.logs || j.logs.length === 0) { logsArea.innerHTML = '<div class="muted">Belum ada logs</div>'; return; }

      logsArea.innerHTML = '';
      for (const L of j.logs) {
        const d = document.createElement('div');
        d.className = 'list-item';
        d.innerHTML = `<div><strong>${L.action.toUpperCase()}</strong> ${L.number} <div class="muted small">by ${L.by} • ${new Date(L.ts).toLocaleString()}</div></div>`;
        logsArea.appendChild(d);
      }
    } catch (e) {
      logsArea.innerHTML = '<div class="muted">Kesalahan koneksi</div>';
    }
  }

  if (location.pathname.endsWith('dashboard.html')) {
    await loadList();
    if (role === 'admin') loadLogs();
  }

})();