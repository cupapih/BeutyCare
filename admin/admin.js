const API_PRODUK = '../api/products.php';
const API_ORDER = '../api/orders.php';
const API_DIGITAL = 'api/digital.php';
const toast = document.getElementById('toast');

function formatRupiah(n) {
  return 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function tampilkanToast(pesan, tipe = 'sukses') {
  toast.textContent = pesan;
  toast.className = 'toast toast-' + tipe + ' toast-muncul';
  setTimeout(() => { toast.className = 'toast'; }, 3500);
}

/* ========== TAB ========== */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

let scannerActive = false;

/* ========== ORDERS ========== */
async function loadOrders() {
  try {
    const res = await fetch(API_ORDER);
    const orders = await res.json();
    const tbody = document.getElementById('orders-tbody');
    document.getElementById('order-badge').textContent = orders.filter(o => o.status === 'Menunggu').length;

    if (orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="15" style="text-align:center;padding:30px;color:#999">Belum ada pesanan.</td></tr>';
      return;
    }

    tbody.innerHTML = orders.map(o => {
      const statusClass = 'status-' + o.status.toLowerCase().replace(/ /g, '-');
      const bayarIcon = o.metode_pembayaran === 'QRIS' ? 'fa-qrcode' : 'fa-university';
      const isDigital = o.kurir === '-' || o.kota_tujuan === '-' || o.alamat === '-';
      return `<tr>
        <td><strong>#${o.id}</strong></td>
        <td style="white-space:nowrap;font-size:0.8rem">${o.tanggal || '-'}</td>
        <td><strong>${o.nama}</strong></td>
        <td>${o.produk} ${isDigital ? '<span style="background:#e3f2fd;color:#1565c0;padding:1px 8px;border-radius:999px;font-size:0.65rem">Digital</span>' : ''}</td>
        <td>${o.jumlah}</td>
        <td>${o.ongkir ? formatRupiah(o.ongkir) : '-'}</td>
        <td><strong>${formatRupiah(o.total || o.harga * o.jumlah)}</strong></td>
        <td><a href="https://wa.me/${o.no_hp.replace(/[^0-9]/g,'')}" target="_blank" style="color:deeppink">${o.no_hp}</a></td>
        <td style="white-space:nowrap"><i class="fas ${bayarIcon}" style="margin-right:4px;color:deeppink"></i>${o.metode_pembayaran || '-'}</td>
        <td style="white-space:nowrap">${isDigital ? '<span style="color:#1565c0">Digital</span>' : (o.kurir || 'J&T Reguler')}</td>
        <td style="white-space:nowrap">${isDigital ? '-' : (o.kota_tujuan || '-')}</td>
        <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${isDigital ? 'Produk Digital' : (o.alamat || '-')}">${isDigital ? '-' : (o.alamat || '-')}</td>
        <td style="white-space:nowrap">
          ${isDigital ? (o.status !== 'Menunggu' ? `<a href="../${API_DIGITAL}?action=view&id=${o.produk_id}&order_id=${o.id}&user_id=${o.user_id}" target="_blank" class="btn btn-sm btn-primary"><i class="fas fa-eye"></i> Lihat</a>` : '-') :
            (o.resi ? `<span class="resi-badge" title="Klik untuk lacak" onclick="window.open('https://www.jet.co.id/tracking/${o.resi}','_blank')"><i class="fas fa-box"></i> ${o.resi}</span>` :
            `<div class="resi-input-group">
              <input type="text" class="resi-input" id="resi-${o.id}" placeholder="No. Resi J&T" size="10">
              <button class="btn btn-success btn-sm" onclick="simpanResi(${o.id})" title="Simpan Resi"><i class="fas fa-check"></i></button>
              <button class="btn btn-primary btn-sm" onclick="scanResi(${o.id})" title="Scan Barcode"><i class="fas fa-camera"></i></button>
            </div>`)}
        </td>
        <td><span class="status-badge ${statusClass}">${o.status}</span></td>
        <td>
          <div class="btn-group">
            ${o.status === 'Menunggu' ? `<button class="btn btn-success btn-sm" onclick="ubahStatus(${o.id}, 'Diproses')" title="Konfirmasi Pembayaran">Bayar</button>` : ''}
            ${o.status === 'Diproses' && !isDigital ? `<button class="btn btn-primary btn-sm" onclick="ubahStatus(${o.id}, 'Dikirim')" title="Tandai Dikirim">Kirim</button>` : ''}
            ${o.status === 'Diproses' && isDigital ? `<button class="btn btn-success btn-sm" onclick="ubahStatus(${o.id}, 'Selesai')" title="Selesaikan Digital"><i class="fas fa-check"></i> Selesai</button>` : ''}
            ${o.status === 'Dikirim' ? `<button class="btn btn-warning btn-sm" onclick="ubahStatus(${o.id}, 'Selesai')" title="Selesai">Selesai</button>` : ''}
            <button class="btn btn-danger btn-sm" onclick="hapusOrder(${o.id})" title="Hapus"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  } catch (err) {
    console.error(err);
    document.getElementById('orders-tbody').innerHTML = '<tr><td colspan="15" style="text-align:center;padding:30px;color:#e74c3c">Gagal memuat pesanan.</td></tr>';
  }
}

async function simpanResi(id) {
  const input = document.getElementById('resi-' + id);
  const resi = input.value.trim();
  if (!resi) { tampilkanToast('Masukkan nomor resi', 'error'); return; }
  try {
    const res = await fetch(API_ORDER, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, resi, status: 'Dikirim' })
    });
    if (res.ok) {
      tampilkanToast('Resi #' + id + ' disimpan!');
      loadOrders();
    }
  } catch { tampilkanToast('Gagal menyimpan resi', 'error'); }
}

function scanResi(id) {
  const modal = document.getElementById('scanModal');
  modal.style.display = 'flex';
  document.getElementById('scan-order-id').value = id;
  document.getElementById('scan-result').value = '';
  document.getElementById('scan-status').textContent = 'Aktifkan kamera untuk scan barcode resi J&T...';

  if (scannerActive) { return; }
  scannerActive = true;

  const reader = document.getElementById('reader');
  reader.innerHTML = '';

  try {
    const html5QrCode = new Html5Qrcode("reader");
    
    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      (decodedText) => {
        document.getElementById('scan-result').value = decodedText;
        document.getElementById('scan-status').textContent = 'Barcode terdeteksi: ' + decodedText;
        html5QrCode.stop().catch(() => {});
        scannerActive = false;
      },
      () => {}
    ).then(() => {
      document.getElementById('scan-status').textContent = 'Arahkan kamera ke barcode resi J&T...';
    }).catch((err) => {
      document.getElementById('scan-status').textContent = 'Kamera tidak tersedia. Masukkan manual.';
      scannerActive = false;
    });
  } catch {
    document.getElementById('scan-status').textContent = 'Kamera tidak tersedia. Masukkan manual.';
    scannerActive = false;
  }
}

function konfirmasiScan() {
  const id = document.getElementById('scan-order-id').value;
  const resi = document.getElementById('scan-result').value.trim();
  if (!resi) { tampilkanToast('Tidak ada hasil scan', 'error'); return; }
  document.getElementById('scanModal').style.display = 'none';
  document.getElementById('resi-' + id).value = resi;
  simpanResi(id);
}

document.getElementById('scanModal').addEventListener('click', function(e) {
  if (e.target === this) { this.style.display = 'none'; scannerActive = false; }
});

function tutupScan() {
  document.getElementById('scanModal').style.display = 'none';
  scannerActive = false;
}

/* ========== TRACKING LOOKUP & MATCH ========== */
async function cariPesananDariResi() {
  const resi = document.getElementById('resi-search').value.trim();
  const resultDiv = document.getElementById('tracking-result');
  if (!resi) { resultDiv.innerHTML = '<div class="tracking-error">Masukkan nomor resi terlebih dahulu</div>'; return; }

  resultDiv.innerHTML = '<div class="tracking-loading"><i class="fas fa-spinner fa-spin"></i> Mencari data resi ' + resi + '...</div>';

  try {
    const res = await fetch('../api/tracking.php?action=lookup&resi=' + encodeURIComponent(resi));
    const data = await res.json();

    if (data.error && !data.matched_orders) {
      if (data.note) {
        resultDiv.innerHTML = '<div class="tracking-error"><i class="fas fa-info-circle"></i> ' + data.note + '</div>';
      } else {
        resultDiv.innerHTML = '<div class="tracking-error"><i class="fas fa-exclamation-circle"></i> ' + data.error + '</div>';
      }
      return;
    }

    let html = '<div class="tracking-info-card">';
    html += '<div class="tracking-header"><i class="fas fa-box"></i> <strong>' + data.courier + '</strong> - ' + data.resi + '</div>';
    html += '<div class="tracking-body">';
    html += '<div class="tracking-field"><span class="tracking-label">Penerima:</span><span class="tracking-value">' + (data.receiver_name || '-') + '</span></div>';
    html += '<div class="tracking-field"><span class="tracking-label">No. HP:</span><span class="tracking-value">' + (data.receiver_phone || '-') + '</span></div>';
    html += '<div class="tracking-field"><span class="tracking-label">Kota:</span><span class="tracking-value">' + (data.receiver_city || '-') + '</span></div>';
    html += '<div class="tracking-field"><span class="tracking-label">Alamat:</span><span class="tracking-value">' + (data.receiver_address || '-') + '</span></div>';
    html += '<div class="tracking-field"><span class="tracking-label">Status:</span><span class="tracking-value">' + (data.latest_status || data.status || '-') + '</span></div>';
    html += '<div class="tracking-field"><span class="tracking-label">Pengirim:</span><span class="tracking-value">' + (data.sender_name || '-') + '</span></div>';
    html += '</div></div>';

    if (data.matched_orders && data.matched_orders.length > 0) {
      html += '<div class="tracking-match-title"><i class="fas fa-check-circle" style="color:#25d366"></i> Ditemukan ' + data.match_count + ' pesanan yang cocok:</div>';
      html += '<div class="tracking-matches">';
      data.matched_orders.forEach(m => {
        const o = m.order;
        const stars = '⭐'.repeat(Math.min(m.match_score, 5));
        html += '<div class="match-card" onclick="pilihMatch(' + o.id + ', \'' + resi + '\')">';
        html += '<div class="match-info">';
        html += '<div class="match-score">' + stars + ' <span style="font-size:0.75rem;color:#999">skor: ' + m.match_score + '</span></div>';
        html += '<div class="match-detail"><strong>#' + o.id + '</strong> - ' + o.nama + '</div>';
        html += '<div class="match-detail">' + o.kota_tujuan + ' | ' + o.no_hp + '</div>';
        html += '<div class="match-detail" style="font-size:0.8rem;color:#888">' + o.produk + ' x' + o.jumlah + ' | ' + (o.alamat || '').substring(0, 50) + '</div>';
        html += '</div>';
        html += '<button class="btn btn-success btn-sm" onclick="event.stopPropagation();pilihMatch(' + o.id + ', \'' + resi + '\')"><i class="fas fa-check"></i> Assign</button>';
        html += '</div>';
      });
      html += '</div>';
      html += '<p style="font-size:0.8rem;color:#999;margin-top:8px">Klik pesanan yang cocok untuk assign resi ini.</p>';
    } else {
      html += '<div class="tracking-no-match"><i class="fas fa-exclamation-triangle"></i> Tidak ada pesanan yang cocok. Periksa data resi atau masukkan resi manual di tabel pesanan.</div>';
    }

    resultDiv.innerHTML = html;
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    resultDiv.innerHTML = '<div class="tracking-error"><i class="fas fa-exclamation-circle"></i> Gagal terhubung ke server.</div>';
    console.error(err);
  }
}

async function pilihMatch(orderId, resi) {
  try {
    const res = await fetch(API_ORDER, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, resi, status: 'Dikirim' })
    });
    if (res.ok) {
      tampilkanToast('Resi ' + resi + ' berhasil diassign ke pesanan #' + orderId + '!');
      document.getElementById('tracking-result').innerHTML = '<div class="tracking-success"><i class="fas fa-check-circle"></i> Resi terassign ke <strong>#' + orderId + '</strong></div>';
      document.getElementById('resi-search').value = '';
      loadOrders();
    } else {
      const err = await res.json();
      tampilkanToast(err.error || 'Gagal assign resi', 'error');
    }
  } catch {
    tampilkanToast('Gagal menyimpan resi', 'error');
  }
}

let searchScannerActive = false;

function scanResiSearch() {
  const modal = document.getElementById('scanModal');
  modal.style.display = 'flex';
  document.getElementById('scan-order-id').value = 'search';
  document.getElementById('scan-result').value = '';
  document.getElementById('scan-status').textContent = 'Aktifkan kamera untuk scan barcode resi J&T...';

  if (searchScannerActive) { return; }
  searchScannerActive = true;

  const reader = document.getElementById('reader');
  reader.innerHTML = '';

  try {
    const html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      (decodedText) => {
        document.getElementById('scan-result').value = decodedText;
        document.getElementById('scan-status').textContent = 'Barcode terdeteksi: ' + decodedText;
        html5QrCode.stop().catch(() => {});
        searchScannerActive = false;
      },
      () => {}
    ).then(() => {
      document.getElementById('scan-status').textContent = 'Arahkan kamera ke barcode resi...';
    }).catch(() => {
      document.getElementById('scan-status').textContent = 'Kamera tidak tersedia. Masukkan manual.';
      searchScannerActive = false;
    });
  } catch {
    document.getElementById('scan-status').textContent = 'Kamera tidak tersedia.';
    searchScannerActive = false;
  }
}

// Override konfirmasiScan for search mode
const originalKonfirmasiScan = konfirmasiScan;
konfirmasiScan = function() {
  const id = document.getElementById('scan-order-id').value;
  const resi = document.getElementById('scan-result').value.trim();
  if (!resi) { tampilkanToast('Tidak ada hasil scan', 'error'); return; }
  document.getElementById('scanModal').style.display = 'none';
  searchScannerActive = false;
  if (id === 'search') {
    document.getElementById('resi-search').value = resi;
    cariPesananDariResi();
  } else {
    document.getElementById('resi-' + id).value = resi;
    simpanResi(id);
  }
};

async function ubahStatus(id, status) {
  try {
    const res = await fetch(API_ORDER, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    if (res.ok) {
      tampilkanToast('Status pesanan #' + id + ' diubah ke ' + status);
      loadOrders();
    }
  } catch (err) {
    tampilkanToast('Gagal mengubah status', 'error');
  }
}

async function hapusOrder(id) {
  if (!confirm('Hapus pesanan #' + id + '?')) return;
  try {
    const res = await fetch(API_ORDER + '?id=' + id, { method: 'DELETE' });
    if (res.ok) {
      tampilkanToast('Pesanan #' + id + ' dihapus');
      loadOrders();
    }
  } catch (err) {
    tampilkanToast('Gagal menghapus', 'error');
  }
}

/* ========== PRODUCTS ========== */
async function loadProducts() {
  try {
    const res = await fetch(API_PRODUK);
    const products = await res.json();
    const tbody = document.getElementById('products-tbody');

    if (products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#999">Belum ada produk.</td></tr>';
      return;
    }

    tbody.innerHTML = products.map(p => {
      const isDigital = p.tipe && p.tipe !== 'fisik';
      return `<tr>
      <td>${p.id}</td>
      <td><img src="../${p.gambar}" alt="${p.nama}" onerror="this.src='../img/all%20variety.jpg'"></td>
      <td><strong>${p.nama}</strong></td>
      <td>${isDigital ? `<span style="background:#e3f2fd;color:#1565c0;padding:2px 10px;border-radius:999px;font-size:0.75rem">${p.tipe}</span>` : p.kategori || '-'}</td>
      <td>${formatRupiah(p.harga)}</td>
      <td>
        <div class="btn-group">
          <button class="btn btn-primary btn-sm" onclick="bukaModalProduk(${p.id})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-danger btn-sm" onclick="hapusProduk(${p.id})"><i class="fas fa-trash"></i></button>
          ${isDigital ? `<a href="../${p.file}" target="_blank" class="btn btn-sm btn-primary"><i class="fas fa-eye"></i></a>` : ''}
        </div>
      </td>
    </tr>`;
    }).join('');
  } catch (err) {
    console.error(err);
    document.getElementById('products-tbody').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#e74c3c">Gagal memuat produk.</td></tr>';
  }
}

function bukaModalProduk(id = null) {
  const modal = document.getElementById('produkModal');
  const title = document.getElementById('modal-produk-title');
  const form = document.getElementById('form-produk');

  if (id) {
    title.textContent = 'Edit Produk';
    fetch(API_PRODUK + '?id=' + id)
      .then(r => r.json())
      .then(p => {
        document.getElementById('edit-produk-id').value = p.id;
        document.getElementById('produk-nama').value = p.nama;
        document.getElementById('produk-kategori').value = p.kategori || '';
        document.getElementById('produk-harga').value = p.harga;
        document.getElementById('produk-deskripsi').value = p.deskripsi || '';
        document.getElementById('produk-gambar').value = p.gambar || '';
      });
  } else {
    title.textContent = 'Tambah Produk';
    form.reset();
    document.getElementById('edit-produk-id').value = '';
    document.getElementById('produk-gambar').value = 'img/all%20variety.jpg';
  }
  modal.style.display = 'flex';
}

function tutupModalProduk() {
  document.getElementById('produkModal').style.display = 'none';
}

document.getElementById('produkModal').addEventListener('click', function(e) {
  if (e.target === this) tutupModalProduk();
});

document.getElementById('form-produk').addEventListener('submit', async function(e) {
  e.preventDefault();
  const id = document.getElementById('edit-produk-id').value;
  const data = {
    nama: document.getElementById('produk-nama').value,
    kategori: document.getElementById('produk-kategori').value,
    harga: parseInt(document.getElementById('produk-harga').value),
    deskripsi: document.getElementById('produk-deskripsi').value,
    gambar: document.getElementById('produk-gambar').value
  };

  try {
    const res = await fetch(API_PRODUK, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(id ? { ...data, id: parseInt(id) } : data)
    });
    if (res.ok) {
      tampilkanToast(id ? 'Produk diperbarui' : 'Produk ditambahkan');
      tutupModalProduk();
      loadProducts();
    } else {
      const err = await res.json();
      tampilkanToast(err.error || 'Gagal', 'error');
    }
  } catch (err) {
    tampilkanToast('Gagal menyimpan produk', 'error');
  }
});

async function hapusProduk(id) {
  if (!confirm('Hapus produk ini?')) return;
  try {
    const res = await fetch(API_PRODUK + '?id=' + id, { method: 'DELETE' });
    if (res.ok) {
      tampilkanToast('Produk dihapus');
      loadProducts();
    }
  } catch (err) {
    tampilkanToast('Gagal menghapus', 'error');
  }
}

/* ========== PAYMENT SETTINGS ========== */
const API_PAYMENT = '../api/payment.php';

async function loadPayment() {
  try {
    const res = await fetch(API_PAYMENT);
    const data = await res.json();

    document.getElementById('qris-aktif').checked = data.qris && data.qris.aktif;
    document.getElementById('qris-gambar').value = (data.qris && data.qris.gambar) || '';
    document.getElementById('qris-atas-nama').value = (data.qris && data.qris.atas_nama) || '';
    document.getElementById('wa-konfirmasi').value = data.wa_konfirmasi || '';
    document.getElementById('rajaongkir-api-key').value = data.rajaongkir_api_key || '';
    document.getElementById('biteship-api-key').value = data.biteship_api_key || '';
    document.getElementById('origin-city-name').value = data.origin_city_name || 'Kabupaten Bogor';

    renderBankEditor(data.banks || []);
    renderOngkirEditor(data.ongkir || {});
  } catch (err) {
    console.error('Gagal load payment config:', err);
  }
}

function renderBankEditor(banks) {
  const container = document.getElementById('bank-editor');
  if (banks.length === 0) {
    container.innerHTML = '<p style="color:#999;font-size:0.85rem">Belum ada rekening.</p>';
    return;
  }
  container.innerHTML = banks.map((b, i) => `
    <div class="bank-edit-row" data-index="${i}">
      <input type="text" class="bank-edit-nama" value="${b.nama}" placeholder="Nama Bank">
      <input type="text" class="bank-edit-rek" value="${b.no_rek}" placeholder="No. Rekening">
      <input type="text" class="bank-edit-an" value="${b.atas_nama}" placeholder="Atas Nama">
      <button class="btn btn-danger btn-sm" onclick="hapusBank(${i})"><i class="fas fa-trash"></i></button>
    </div>
  `).join('');
}

function tambahBank() {
  const container = document.getElementById('bank-editor');
  const empty = container.querySelector('p');
  if (empty) empty.remove();
  const div = document.createElement('div');
  div.className = 'bank-edit-row';
  div.innerHTML = `
    <input type="text" class="bank-edit-nama" placeholder="Nama Bank">
    <input type="text" class="bank-edit-rek" placeholder="No. Rekening">
    <input type="text" class="bank-edit-an" placeholder="Atas Nama">
    <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>
  `;
  container.appendChild(div);
}

function hapusBank(index) {
  document.querySelector(`.bank-edit-row[data-index="${index}"]`).remove();
}

function renderOngkirEditor(ongkir) {
  const container = document.getElementById('ongkir-editor');
  container.innerHTML = Object.entries(ongkir).map(([kurir, harga]) => `
    <div class="ongkir-edit-row">
      <span class="ongkir-label">${kurir}</span>
      <input type="number" class="ongkir-input" value="${harga}" min="0" data-kurir="${kurir}">
    </div>
  `).join('');
}

async function simpanPayment() {
  const bankRows = document.querySelectorAll('.bank-edit-row');
  const banks = Array.from(bankRows).map(row => ({
    nama: row.querySelector('.bank-edit-nama').value.trim(),
    no_rek: row.querySelector('.bank-edit-rek').value.trim(),
    atas_nama: row.querySelector('.bank-edit-an').value.trim()
  })).filter(b => b.nama && b.no_rek);

  const ongkirRows = document.querySelectorAll('.ongkir-edit-row');
  const ongkir = {};
  ongkirRows.forEach(row => {
    const kurir = row.querySelector('.ongkir-input').dataset.kurir;
    const harga = parseInt(row.querySelector('.ongkir-input').value) || 0;
    if (harga > 0) ongkir[kurir] = harga;
  });

  const data = {
    banks: banks,
    qris: {
      aktif: document.getElementById('qris-aktif').checked,
      gambar: document.getElementById('qris-gambar').value.trim(),
      atas_nama: document.getElementById('qris-atas-nama').value.trim()
    },
    wa_konfirmasi: document.getElementById('wa-konfirmasi').value.trim(),
    rajaongkir_api_key: document.getElementById('rajaongkir-api-key').value.trim(),
    biteship_api_key: document.getElementById('biteship-api-key').value.trim(),
    origin_city_id: 79,
    origin_city_name: 'Kabupaten Bogor',
    origin_detail: 'Perumahan Inkopad, Kecamatan Tajurhalang, Kab. Bogor',
    ongkir: ongkir
  };

  try {
    const res = await fetch(API_PAYMENT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      tampilkanToast('Pengaturan pembayaran disimpan!');
      loadPayment();
    } else {
      const err = await res.json();
      tampilkanToast(err.error || 'Gagal menyimpan', 'error');
    }
  } catch (err) {
    tampilkanToast('Gagal menyimpan pengaturan', 'error');
  }
}

/* ========== DIGITAL PRODUCTS ========== */
function loadDigitalProducts() {
  fetch('../api/products.php')
    .then(r => r.json())
    .then(products => {
      const digital = products.filter(p => p.tipe && p.tipe !== 'fisik');
      const container = document.getElementById('digital-products-list');
      if (digital.length === 0) {
        container.innerHTML = '<p style="color:#999;font-size:0.85rem">Belum ada produk digital.</p>';
        return;
      }
      container.innerHTML = '<table><thead><tr><th>ID</th><th>Nama</th><th>Tipe</th><th>Harga</th><th>Aksi</th></tr></thead><tbody>' +
        digital.map(p => `<tr>
          <td>${p.id}</td>
          <td><strong>${p.nama}</strong></td>
          <td><span style="background:#e3f2fd;color:#1565c0;padding:2px 10px;border-radius:999px;font-size:0.75rem">${p.tipe}</span></td>
          <td>${formatRupiah(p.harga)}</td>
          <td><a href="../${p.file}" target="_blank" class="btn btn-primary btn-sm"><i class="fas fa-eye"></i> Lihat</a></td>
        </tr>`).join('') + '</tbody></table>';
    })
    .catch(() => {});
}

/* ========== VOUCHERS ========== */
async function muatSemuaVoucher() {
  document.getElementById('voucher-search').value = '';
  const resultDiv = document.getElementById('voucher-result');
  resultDiv.innerHTML = '<div class="tracking-loading"><i class="fas fa-spinner fa-spin"></i> Memuat voucher...</div>';
  try {
    const res = await fetch('../api/orders.php');
    const orders = await res.json();
    tampilkanVoucher(orders, null);
  } catch {
    resultDiv.innerHTML = '<div class="tracking-error">Gagal memuat data.</div>';
  }
}

function cariVoucher() {
  const query = document.getElementById('voucher-search').value.trim().toLowerCase();
  if (!query) { muatSemuaVoucher(); return; }
  const resultDiv = document.getElementById('voucher-result');
  resultDiv.innerHTML = '<div class="tracking-loading"><i class="fas fa-spinner fa-spin"></i> Mencari...</div>';
  fetch('../api/orders.php')
    .then(r => r.json())
    .then(orders => tampilkanVoucher(orders, query))
    .catch(() => { resultDiv.innerHTML = '<div class="tracking-error">Gagal memuat.</div>'; });
}

function tampilkanVoucher(orders, query) {
  const resultDiv = document.getElementById('voucher-result');
  const digitalOrders = orders.filter(o => {
    const isDigital = o.kurir === '-' || o.kota_tujuan === '-' || o.alamat === '-';
    if (!isDigital) return false;
    if (!query) return true;
    return o.nama.toLowerCase().includes(query) || o.produk.toLowerCase().includes(query);
  });

  if (digitalOrders.length === 0) {
    resultDiv.innerHTML = '<div class="tracking-no-match">Tidak ada produk digital ditemukan.</div>';
    return;
  }

  // Fetch vouchers
  let vouchers = [];
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '../data/vouchers.json', false);
    xhr.send();
    if (xhr.status === 200) vouchers = JSON.parse(xhr.responseText);
  } catch {}

  resultDiv.innerHTML = '<div style="margin-bottom:10px;font-size:0.85rem;color:#888">Ditemukan ' + digitalOrders.length + ' pesanan digital.</div>' +
    digitalOrders.map(o => {
      const voucher = vouchers.find(v => v.order_id === o.id);
      return `<div class="match-card" style="flex-direction:column;align-items:stretch">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <strong>#${o.id}</strong> - ${o.nama}
            <span style="font-size:0.8rem;color:#888;margin-left:8px">${o.tanggal || ''}</span>
          </div>
          <span class="status-badge status-${o.status.toLowerCase().replace(/ /g,'-')}">${o.status}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-top:8px">
          <div><span style="color:#888;font-size:0.85rem">${o.produk} x${o.jumlah} | ${formatRupiah(o.total)}</span></div>
          <div style="display:flex;gap:8px;align-items:center">
            ${voucher ? `<span style="background:#e3f2fd;color:#1565c0;padding:4px 12px;border-radius:6px;font-family:monospace;font-size:0.85rem"><i class="fas fa-ticket-alt"></i> ${voucher.kode} ${voucher.used ? '<span style="color:#e74c3c;font-size:0.7rem">(used)</span>' : '<span style="color:#4caf50;font-size:0.7rem">(active)</span>'}</span>` : ''}
            ${o.status !== 'Menunggu' ? `<a href="../${API_DIGITAL}?action=view&id=${o.produk_id}&order_id=${o.id}&user_id=${o.user_id}" target="_blank" class="btn btn-primary btn-sm"><i class="fas fa-eye"></i> Lihat</a>` : ''}
          </div>
        </div>
      </div>`;
    }).join('');
}

/* ========== INIT ========== */
loadOrders();
loadProducts();
loadPayment();
loadDigitalProducts();
