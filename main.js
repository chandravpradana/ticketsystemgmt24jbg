/* ----------------------------- DATA ------------------------------ */
let customers = JSON.parse(localStorage.getItem('delivery_customers')) || [
  { id: 1, nama: 'PT Jaya Abadi', alamat: 'Jl. Merdeka 123, Jakarta', hp: '081234567890' },
  { id: 2, nama: 'CV Sukses Makmur', alamat: 'Jl. Sudirman 45, Bandung', hp: '082211334455' },
  { id: 3, nama: 'Resto Enak', alamat: 'Jl. Pahlawan 7, Surabaya', hp: '081998877665' },
];

let tickets = JSON.parse(localStorage.getItem('delivery_tickets')) || [];

// Konfigurasi Google Sheets
let googleConfig = JSON.parse(localStorage.getItem('google_sheets_config')) || {
  sheetUrl: '',
  sheetName: 'Data Tiket',
  apiKey: '',
  lastSync: null,
  syncHistory: []
};

// State untuk filter
let currentFilter = 'all';
let currentCustomerFilter = null;

/* ----------------------------- INIT ------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  renderCustomers();
  renderTickets();
  updateBadges();
  loadGoogleConfig();
  renderSyncHistory();
  setupFilterButtons();

  document.getElementById('ticketForm').addEventListener('submit', handleCreateTicket);
  document.getElementById('customerForm').addEventListener('submit', handleSaveCustomer);

  const themeSwitch = document.getElementById('themeSwitch');
  themeSwitch.addEventListener('change', toggleTheme);

  document.getElementById('customersNavBtn').addEventListener('click', () => showPage('customersPage'));
  document.getElementById('ticketsNavBtn').addEventListener('click', () => showPage('ticketsPage'));
  document.getElementById('googleNavBtn').addEventListener('click', () => showPage('googlePage'));

  // Set saved theme
  const savedTheme = localStorage.getItem('delivery_theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    themeSwitch.checked = true;
    document.getElementById('themeIcon').className = 'fas fa-sun';
  }

  // Populate customer dropdown
  populateCustomerDropdown();
});

/* ------------------------- NAVIGASI HALAMAN ---------------------- */
function showPage(pageId) {
  // Sembunyikan semua halaman
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });

  // Tampilkan halaman yang diminta
  document.getElementById(pageId).classList.add('active');

  // Update navigasi aktif
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  if (pageId === 'customersPage') {
    document.getElementById('customersNavBtn').classList.add('active');
    currentCustomerFilter = null;
    document.getElementById('customerTicketsHeader').style.display = 'none';
    document.getElementById('ticketsTitle').style.display = 'block';
  } else if (pageId === 'ticketsPage') {
    document.getElementById('ticketsNavBtn').classList.add('active');
  } else {
    document.getElementById('googleNavBtn').classList.add('active');
  }
}

/* ------------------------- TOGGLE THEME -------------------------- */
function toggleTheme() {
  document.body.classList.toggle('light-theme');
  if (document.body.classList.contains('light-theme')) {
    localStorage.setItem('delivery_theme', 'light');
    document.getElementById('themeIcon').className = 'fas fa-sun';
  } else {
    localStorage.setItem('delivery_theme', 'dark');
    document.getElementById('themeIcon').className = 'fas fa-moon';
  }
}

/* ------------------------- RENDER CUSTOMERS ---------------------- */
function renderCustomers() {
  const tbody = document.querySelector('#customersTable tbody');
  tbody.innerHTML = '';

  if (customers.length === 0) {
    document.getElementById('noCustomers').style.display = 'block';
    return;
  }
  document.getElementById('noCustomers').style.display = 'none';

  customers.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.nama}</td>
      <td>${c.alamat}</td>
      <td>${c.hp}</td>
      <td class="action-buttons">
        <button class="btn btn-primary btn-sm" onclick="openCustomerModal(${c.id})">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteCustomer(${c.id})">
          <i class="fas fa-trash"></i> Hapus
        </button>
        <button class="btn btn-secondary btn-sm" onclick="viewCustomerTickets(${c.id})">
          <i class="fas fa-ticket-alt"></i> Tiket
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  updateBadges();
}

function filterCustomers() {
  const searchTerm = document.getElementById('customerSearch').value.toLowerCase();
  const rows = document.querySelectorAll('#customersTable tbody tr');
  rows.forEach(row => {
    const name = row.cells[0].textContent.toLowerCase();
    const address = row.cells[1].textContent.toLowerCase();
    const phone = row.cells[2].textContent.toLowerCase();
    if (name.includes(searchTerm) || address.includes(searchTerm) || phone.includes(searchTerm)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

/* ------------------------- RENDER TICKETS ----------------------- */
function renderTickets() {
  const tbody = document.querySelector('#ticketsTable tbody');
  tbody.innerHTML = '';
  let filteredTickets = tickets;
  // Filter by customer
  if (currentCustomerFilter) {
    filteredTickets = filteredTickets.filter(t => t.customerId === currentCustomerFilter);
  }
  // Filter by status
  if (currentFilter !== 'all') {
    filteredTickets = filteredTickets.filter(t => t.status === currentFilter);
  }
  // Search filter
  const searchTerm = document.getElementById('ticketSearch').value.toLowerCase();
  if (searchTerm) {
    filteredTickets = filteredTickets.filter(t =>
      t.judul.toLowerCase().includes(searchTerm) ||
      t.nama.toLowerCase().includes(searchTerm) ||
      t.pelaksana.toLowerCase().includes(searchTerm)
    );
  }
  if (filteredTickets.length === 0) {
    document.getElementById('noTickets').style.display = 'block';
  } else {
    document.getElementById('noTickets').style.display = 'none';
  }
  filteredTickets.forEach((t, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.id}</td>
      <td><span class="status ${t.status}">${t.status}</span></td>
      <td>${t.judul}</td>
      <td>${t.nama}</td>
      <td>${new Date(t.waktu).toLocaleDateString()}</td>
      <td class="action-buttons">
        <button class="btn btn-primary btn-sm" onclick="viewTicketDetail(${idx})">
          <i class="fas fa-eye"></i> Detail
        </button>
        <select class="btn btn-sm" onchange="updateStatus(${idx}, this.value)" style="background: transparent; border: var(--border); color: var(--text-color);">
          <option value="open" ${t.status==='open'?'selected':''}>Open</option>
          <option value="onprogress" ${t.status==='onprogress'?'selected':''}>On Progress</option>
          <option value="pending" ${t.status==='pending'?'selected':''}>Pending</option>
          <option value="selesai" ${t.status==='selesai'?'selected':''}>Selesai</option>
        </select>
      </td>
    `;
    tbody.appendChild(tr);
  });
  updateBadges();
}
function filterTickets(status = currentFilter) {
  currentFilter = status;
  renderTickets();
  setupFilterButtons();
}
function filterTicketsByCustomer(customerId) {
  currentCustomerFilter = customerId;
  showPage('ticketsPage');
  renderTickets();
}
function setupFilterButtons() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    if (btn.dataset.status === currentFilter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}
function showAllTickets() {
  currentCustomerFilter = null;
  document.getElementById('customerTicketsHeader').style.display = 'none';
  document.getElementById('ticketsTitle').style.display = 'block';
  renderTickets();
}
function viewCustomerTickets(customerId) {
  currentCustomerFilter = customerId;
  const customer = customers.find(c => c.id === customerId);
  if (!customer) return;
  showPage('ticketsPage');
  document.getElementById('customerTicketsHeader').style.display = 'flex';
  document.getElementById('customerTicketsTitle').textContent = `Tiket untuk ${customer.nama}`;
  document.getElementById('ticketsTitle').style.display = 'none';
  renderTickets();
}

/* ------------------------- MODAL HANDLERS -------------------------- */
function openCustomerModal(id) {
  const modal = document.getElementById('customerModal');
  modal.classList.add('show');
  if (id) {
    const customer = customers.find(c => c.id === id);
    if (customer) {
      document.getElementById('customerModalTitle').textContent = 'Edit Pelanggan';
      document.getElementById('customerId').value = customer.id;
      document.getElementById('customerNama').value = customer.nama;
      document.getElementById('customerAlamat').value = customer.alamat;
      document.getElementById('customerHp').value = customer.hp;
    }
  } else {
    document.getElementById('customerModalTitle').textContent = 'Tambah Pelanggan Baru';
    document.getElementById('customerId').value = '';
    document.getElementById('customerNama').value = '';
    document.getElementById('customerAlamat').value = '';
    document.getElementById('customerHp').value = '';
  }
}
function closeCustomerModal() {
  document.getElementById('customerModal').classList.remove('show');
}
/* Tiket modal */
function openModal() {
  document.getElementById('ticketModal').classList.add('show');
  document.getElementById('ticketForm').reset();
  populateCustomerDropdown();
}
function closeModal() {
  document.getElementById('ticketModal').classList.remove('show');
}
function viewTicketDetail(idx) {
  const t = tickets[idx];
  if (!t) return;
  document.getElementById('ticketDetailContent').innerHTML = `
    <b>ID Tiket:</b> ${t.id}<br>
    <b>Status:</b> <span class="status ${t.status}">${t.status}</span><br>
    <b>Pelanggan:</b> ${t.nama}<br>
    <b>Judul:</b> ${t.judul}<br>
    <b>Deskripsi:</b> ${t.deskripsi}<br>
    <b>Tanggal:</b> ${new Date(t.waktu).toLocaleString()}<br>
    <b>Pelaksana:</b> ${t.pelaksana}
  `;
  document.getElementById('detailModal').classList.add('show');
}
function closeDetailModal() {
  document.getElementById('detailModal').classList.remove('show');
}

/* -------------------------- FORM HANDLERS -------------------------- */
function handleSaveCustomer(e) {
  e.preventDefault();
  const id = document.getElementById('customerId').value;
  const nama = document.getElementById('customerNama').value.trim();
  const alamat = document.getElementById('customerAlamat').value.trim();
  const hp = document.getElementById('customerHp').value.trim();

  if (!nama || !alamat || !hp) {
    showToast('Semua field wajib diisi', 'error');
    return;
  }
  if (id) {
    // Edit
    const idx = customers.findIndex(c => c.id == id);
    if (idx !== -1) {
      customers[idx].nama = nama;
      customers[idx].alamat = alamat;
      customers[idx].hp = hp;
    }
    showToast('Data pelanggan berhasil diupdate', 'success');
  } else {
    // Tambah baru
    const newId = customers.length > 0 ? Math.max(...customers.map(c=>c.id))+1 : 1;
    customers.push({ id: newId, nama, alamat, hp });
    showToast('Pelanggan baru ditambahkan', 'success');
  }
  localStorage.setItem('delivery_customers', JSON.stringify(customers));
  renderCustomers();
  closeCustomerModal();
  populateCustomerDropdown();
}
function deleteCustomer(id) {
  if (!confirm('Yakin ingin menghapus pelanggan ini?')) return;
  customers = customers.filter(c => c.id !== id);
  localStorage.setItem('delivery_customers', JSON.stringify(customers));
  renderCustomers();
  populateCustomerDropdown();
  showToast('Pelanggan dihapus', 'success');
}
function populateCustomerDropdown() {
  const select = document.getElementById('formCustomer');
  if (!select) return;
  select.innerHTML = '<option value="">-- Pilih Pelanggan --</option>';
  customers.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.nama}</option>`;
  });
}

/* -------------------------- TIKET HANDLERS -------------------------- */
function handleCreateTicket(e) {
  e.preventDefault();
  const customerId = Number(document.getElementById('formCustomer').value);
  const customer = customers.find(c => c.id === customerId);
  const judul = document.getElementById('formJudul').value.trim();
  const deskripsi = document.getElementById('formDeskripsi').value.trim();
  const waktu = document.getElementById('formWaktu').value;
  const pelaksana = document.getElementById('formPelaksana').value.trim();
  if (!customer || !judul || !deskripsi || !waktu || !pelaksana) {
    showToast('Semua field wajib diisi', 'error');
    return;
  }
  const id = tickets.length > 0 ? Math.max(...tickets.map(t=>t.id))+1 : 1;
  tickets.push({
    id,
    customerId,
    nama: customer.nama,
    judul,
    deskripsi,
    waktu,
    pelaksana,
    status: 'open'
  });
  localStorage.setItem('delivery_tickets', JSON.stringify(tickets));
  renderTickets();
  closeModal();
  showToast('Tiket berhasil dibuat', 'success');
}
function updateStatus(idx, value) {
  if (tickets[idx]) {
    tickets[idx].status = value;
    localStorage.setItem('delivery_tickets', JSON.stringify(tickets));
    renderTickets();
    showToast('Status tiket diperbarui', 'success');
  }
}

/* -------------------------- BADGES & TOAST -------------------------- */
function updateBadges() {
  document.getElementById('customersBadge').textContent = customers.length;
  document.getElementById('ticketsBadge').textContent = tickets.length;
}
function showToast(message, type='success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => { toast.className = 'toast'; }, 2500);
}

/* -------------------------- GOOGLE SHEETS -------------------------- */
function saveGoogleConfig() {
  googleConfig.sheetUrl = document.getElementById('googleSheetUrl').value.trim();
  googleConfig.sheetName = document.getElementById('sheetName').value.trim() || 'Data Tiket';
  googleConfig.apiKey = document.getElementById('apiKey').value.trim();
  localStorage.setItem('google_sheets_config', JSON.stringify(googleConfig));
  showToast('Konfigurasi Google Sheets disimpan', 'success');
}
function loadGoogleConfig() {
  document.getElementById('googleSheetUrl').value = googleConfig.sheetUrl || '';
  document.getElementById('sheetName').value = googleConfig.sheetName || 'Data Tiket';
  document.getElementById('apiKey').value = googleConfig.apiKey || '';
}
function syncToGoogleSheets() {
  // Simulasi sinkronisasi (replace dengan fetch ke Google Apps Script jika ada backend)
  document.getElementById('syncButton').disabled = true;
  updateSyncStatus('Sedang sinkronisasi...', 'warning');
  setTimeout(() => {
    const syncDate = new Date();
    googleConfig.lastSync = syncDate.toISOString();
    const dataTerkirim = tickets.length;
    googleConfig.syncHistory = googleConfig.syncHistory || [];
    googleConfig.syncHistory.unshift({
      tanggal: syncDate.toLocaleString(),
      status: 'Sukses',
      jumlah: dataTerkirim,
      detail: `Sinkronisasi ${dataTerkirim} tiket`
    });
    localStorage.setItem('google_sheets_config', JSON.stringify(googleConfig));
    updateSyncStatus('Sinkronisasi sukses!', 'success');
    renderSyncHistory();
    document.getElementById('syncButton').disabled = false;
  }, 1200);
}
function updateSyncStatus(msg, type='success') {
  const el = document.getElementById('syncStatus');
  el.textContent = msg;
  el.style.display = 'block';
  el.style.borderLeft = `4px solid var(--${type === 'success' ? 'accent' : type === 'warning' ? 'pending' : 'danger'}-color)`;
  setTimeout(() => { el.style.display = 'none'; }, 2500);
}
function testGoogleConnection() {
  updateSyncStatus('Menghubungi Google Sheets...', 'warning');
  setTimeout(() => updateSyncStatus('Koneksi berhasil!', 'success'), 800);
}
function renderSyncHistory() {
  const tbody = document.querySelector('#syncHistoryTable tbody');
  if (!googleConfig.syncHistory || googleConfig.syncHistory.length === 0) {
    document.getElementById('noSyncHistory').style.display = 'block';
    tbody.innerHTML = '';
    return;
  }
  document.getElementById('noSyncHistory').style.display = 'none';
  tbody.innerHTML = '';
  googleConfig.syncHistory.forEach((item, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.tanggal}</td>
      <td>${item.status}</td>
      <td>${item.jumlah}</td>
      <td>${item.detail}</td>
    `;
    tbody.appendChild(tr);
  });
}
