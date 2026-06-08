const API_PRODUK = 'api/products.php';
const API_ORDER = 'api/orders.php';
const API_PAYMENT = 'api/payment.php';
const API_SHIPPING = 'api/shipping.php';
const API_DIGITAL = 'api/digital.php';
const produkList = document.getElementById('produk-list');
const orderModal = document.getElementById('orderModal');
const paymentModal = document.getElementById('paymentModal');
const formPesanan = document.getElementById('form-pesanan');
const toast = document.getElementById('toast');

let paymentConfig = null;
let lastOrder = null;
let allCities = [];
let kotaTimer = null;
let currentUser = null;

function getToken() { return localStorage.getItem('bcare_token'); }
function getSavedUser() {
  const raw = localStorage.getItem('bcare_user');
  return raw ? JSON.parse(raw) : null;
}

function formatRupiah(angka) {
  return 'Rp ' + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function tampilkanToast(pesan, tipe = 'sukses') {
  toast.textContent = pesan;
  toast.className = 'toast toast-' + tipe + ' toast-muncul';
  setTimeout(() => { toast.className = 'toast'; }, 3500);
}

async function loadPaymentConfig() {
  try {
    const res = await fetch(API_PAYMENT);
    paymentConfig = await res.json();
  } catch {}
}

async function loadCities() {
  try {
    const res = await fetch(API_SHIPPING + '?action=cities');
    allCities = await res.json();
  } catch { allCities = []; }
}

function cariKota(val) {
  clearTimeout(kotaTimer);
  document.getElementById('kota-id').value = '';
  const box = document.getElementById('kota-suggestions');
  if (val.length < 2) { box.innerHTML = ''; box.style.display = 'none'; return; }
  kotaTimer = setTimeout(() => {
    const q = val.toLowerCase();
    const match = allCities.filter(c => c.label.toLowerCase().includes(q)).slice(0, 8);
    if (match.length === 0) { box.style.display = 'none'; return; }
    box.innerHTML = match.map(c =>
      `<div class="suggestion-item" onclick="pilihKota(${c.id}, '${c.label.replace(/'/g, "\\'")}')">${c.label}</div>`
    ).join('');
    box.style.display = 'block';
  }, 300);
}

function pilihKota(id, label) {
  document.getElementById('kota-tujuan').value = label;
  document.getElementById('kota-id').value = id;
  document.getElementById('kota-suggestions').style.display = 'none';
  hitungTotal();
}

document.addEventListener('click', function (e) {
  const box = document.getElementById('kota-suggestions');
  if (e.target.id !== 'kota-tujuan') box.style.display = 'none';
});

async function hitungTotal() {
  const harga = parseInt(document.getElementById('produk-harga').value) || 0;
  const jumlah = parseInt(document.getElementById('jumlah').value) || 1;
  const kotaId = document.getElementById('kota-id').value;
  const subtotal = harga * jumlah;
  const statusEl = document.getElementById('ongkir-status');
  let ongkir = 0;

  // Digital product check
  if (kotaId === '0') {
    statusEl.innerHTML = '<span class="ongkir-static">Produk digital, tidak ada ongkos kirim</span>';
    document.getElementById('display-subtotal').textContent = formatRupiah(subtotal);
    document.getElementById('display-ongkir').textContent = 'Rp 0';
    document.getElementById('display-total').textContent = formatRupiah(subtotal);
    document.getElementById('displ-ongkir-realtime').value = '0';
    return;
  }

  ongkir = 15000;

  if (kotaId && paymentConfig && paymentConfig.rajaongkir_api_key) {
    statusEl.innerHTML = '<span class="ongkir-loading">Mengecek ongkir J&T...</span>';
    try {
      const res = await fetch(API_SHIPPING + '?action=cost&destination=' + kotaId + '&courier=J&T%20Reguler&weight=1');
      const data = await res.json();
      if (data.realtime) {
        ongkir = data.cost;
        const etd = data.etd ? ' (' + data.etd.replace(/[^0-9]/g, '') + ' hari)' : '';
        statusEl.innerHTML = '<span class="ongkir-realtime"><i class="fas fa-bolt"></i> J&T: ' + formatRupiah(ongkir) + etd + '</span>';
      } else if (data.error === 'no_api_key') {
        ongkir = 15000;
        statusEl.innerHTML = '<span class="ongkir-static">Tarif J&T: ' + formatRupiah(ongkir) + ' (default)</span>';
      } else {
        ongkir = data.cost || 15000;
        statusEl.innerHTML = '<span class="ongkir-static">Tarif J&T: ' + formatRupiah(ongkir) + '</span>';
      }
    } catch {
      statusEl.innerHTML = '<span class="ongkir-static">Tarif default: ' + formatRupiah(ongkir) + '</span>';
    }
  } else if (!kotaId) {
    statusEl.innerHTML = '<span class="ongkir-warning"><i class="fas fa-exclamation-triangle"></i> Masukkan kota tujuan untuk cek ongkir</span>';
  } else {
    statusEl.innerHTML = '';
  }

  const total = subtotal + ongkir;
  document.getElementById('display-subtotal').textContent = formatRupiah(subtotal);
  document.getElementById('display-ongkir').textContent = formatRupiah(ongkir);
  document.getElementById('display-total').textContent = formatRupiah(total);
  document.getElementById('displ-ongkir-realtime').value = ongkir;
}

async function loadProducts() {
  try {
    const res = await fetch(API_PRODUK);
    const products = await res.json();
    produkList.innerHTML = products.map(p => {
      const isDigital = p.tipe && p.tipe !== 'fisik';
      return `
      <li class="card">
        <img src="${p.gambar}" alt="${p.nama}" loading="lazy">
        <span class="card-kategori">${isDigital ? '<i class="fas fa-download" style="margin-right:4px"></i>Digital' : p.kategori}</span>
        <h1>${p.nama}</h1>
        <p>${p.deskripsi}</p>
        <div class="card-footer">
          <span class="card-harga">${formatRupiah(p.harga)}</span>
          <button class="btn-pesan" onclick="bukaModal(${p.id}, '${p.nama.replace(/'/g, "\\'")}', ${p.harga}, ${isDigital})">Pesan Sekarang</button>
        </div>
      </li>`;
    }).join('');
  } catch {
    produkList.innerHTML = '<li class="card" style="text-align:center;padding:40px"><p>Gagal memuat produk.</p></li>';
  }
}

function bukaModal(id, nama, harga, digital = false) {
  currentUser = getSavedUser();
  if (!currentUser) {
    tampilkanToast('Silakan login terlebih dahulu!', 'error');
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    return;
  }

  document.getElementById('user-id').value = currentUser.id;
  document.getElementById('produk-id').value = id;
  document.getElementById('produk-nama').value = nama;
  document.getElementById('produk-harga').value = harga;
  document.getElementById('modal-produk-nama').textContent = 'Pesan: ' + nama;
  document.getElementById('modal-produk-harga').textContent = formatRupiah(harga) + ' / item';
  document.getElementById('nama-pemesan').value = currentUser.nama || '';
  document.getElementById('no-hp').value = currentUser.no_hp || '';
  document.getElementById('jumlah').value = 1;

  // Hide shipping for digital products
  const shippingFields = document.getElementById('shipping-fields');
  if (shippingFields) {
    shippingFields.style.display = digital ? 'none' : 'block';
    document.getElementById('alamat').value = digital ? '-' : '';
    document.getElementById('kota-tujuan').value = digital ? '-' : '';
    document.getElementById('kota-id').value = digital ? '0' : '';
    document.getElementById('catatan').value = digital ? 'Produk Digital - Download setelah pembayaran' : '';
  }

  document.getElementById('kota-suggestions').style.display = 'none';
  document.getElementById('metode-pembayaran').value = '';
  document.getElementById('ongkir-status').innerHTML = digital ? '<span class="ongkir-static">Produk digital, tidak ada ongkos kirim</span>' : '';
  document.getElementById('displ-ongkir-realtime').value = '0';
  document.getElementById('display-subtotal').textContent = formatRupiah(harga);
  document.getElementById('display-ongkir').textContent = 'Rp 0';
  document.getElementById('display-total').textContent = formatRupiah(harga);
  orderModal.style.display = 'flex';
}

function tutupModal() { orderModal.style.display = 'none'; }
function tutupPayment() { paymentModal.style.display = 'none'; }

orderModal.addEventListener('click', function (e) { if (e.target === orderModal) tutupModal(); });
paymentModal.addEventListener('click', function (e) { if (e.target === paymentModal) tutupPayment(); });

formPesanan.addEventListener('submit', async function (e) {
  e.preventDefault();
  const harga = parseInt(document.getElementById('produk-harga').value);
  const jumlah = parseInt(document.getElementById('jumlah').value);
  const ongkir = parseInt(document.getElementById('displ-ongkir-realtime').value) || 0;
  const total = (harga * jumlah) + ongkir;
  const alamat = document.getElementById('alamat').value;
  const kotaTujuan = document.getElementById('kota-tujuan').value;
  const isDigital = alamat === '-' && kotaTujuan === '-';

  lastOrder = {
    user_id: parseInt(document.getElementById('user-id').value) || 0,
    produk_id: parseInt(document.getElementById('produk-id').value),
    produk: document.getElementById('produk-nama').value,
    harga, jumlah, total, ongkir,
    nama: document.getElementById('nama-pemesan').value,
    no_hp: document.getElementById('no-hp').value,
    alamat: alamat,
    kota_tujuan: kotaTujuan,
    kota_id: document.getElementById('kota-id').value,
    metode_pembayaran: document.getElementById('metode-pembayaran').value,
    kurir: isDigital ? '-' : 'J&T Reguler',
    catatan: document.getElementById('catatan').value
  };

  const btn = formPesanan.querySelector('.btn-order');
  btn.textContent = 'Mengirim...';
  btn.disabled = true;

  try {
    const res = await fetch(API_ORDER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lastOrder)
    });
    const result = await res.json();
    if (res.ok) {
      lastOrder.id = result.id;
      tutupModal();
      tampilkanToast('Pesanan berhasil! Silakan lanjutkan pembayaran.', 'sukses');
      setTimeout(() => tampilkanPayment(lastOrder), 500);
    } else {
      tampilkanToast('Error: ' + (result.error || 'Gagal mengirim'), 'error');
    }
  } catch {
    tampilkanToast('Gagal terhubung ke server. Pastikan XAMPP berjalan.', 'error');
  } finally {
    btn.textContent = 'Kirim Pesanan';
    btn.disabled = false;
  }
});

function tampilkanPayment(order) {
  document.getElementById('payment-order-info').textContent =
    'No. Pesanan #' + order.id + ' - ' + order.produk + ' x' + order.jumlah;
  document.getElementById('payment-total-amount').textContent = formatRupiah(order.total);

  // Show download link for digital products
  const digitalDownload = document.getElementById('digital-download-area');
  if (order.alamat === '-' || order.catatan?.includes('Produk Digital')) {
    if (digitalDownload) {
      const produkId = document.getElementById('produk-id').value;
      const btnView = document.getElementById('btn-digital-view');
      if (btnView) {
        btnView.href = API_DIGITAL + '?action=view&id=' + produkId + '&order_id=' + order.id + '&user_id=' + order.user_id;
      }
      digitalDownload.style.display = 'block';
    }
  } else {
    if (digitalDownload) digitalDownload.style.display = 'none';
  }

  const bankList = document.getElementById('bank-list');
  if (paymentConfig && paymentConfig.banks && paymentConfig.banks.length > 0) {
    bankList.innerHTML = paymentConfig.banks.map(b => `
      <div class="bank-item">
        <div class="bank-left"><strong>${b.nama}</strong></div>
        <div class="bank-right">
          <span class="bank-no-rek">${b.no_rek}</span>
          <span class="bank-atas-nama">a.n. ${b.atas_nama}</span>
        </div>
        <button class="btn-copy" onclick="copyRek('${b.no_rek}')" title="Salin nomor rekening"><i class="fas fa-copy"></i></button>
      </div>
    `).join('');
    document.getElementById('payment-banks').style.display = 'block';
  } else {
    document.getElementById('payment-banks').style.display = 'none';
  }

  const qrisArea = document.getElementById('payment-qris-area');
  if (paymentConfig && paymentConfig.qris && paymentConfig.qris.aktif) {
    const qrisImg = document.getElementById('qris-image');
    qrisImg.src = paymentConfig.qris.gambar;
    qrisImg.onerror = function () { this.style.display = 'none'; };
    document.getElementById('qris-atas-nama').textContent = 'a.n. ' + (paymentConfig.qris.atas_nama || '');
    qrisArea.style.display = 'block';
  } else {
    qrisArea.style.display = 'none';
  }

  const wa = paymentConfig && paymentConfig.wa_konfirmasi ? paymentConfig.wa_konfirmasi : '628123456789';
  const msg = encodeURIComponent(
    'Halo BeautyCare, saya sudah melakukan pembayaran.\n\n' +
    'No. Pesanan: #' + order.id + '\n' +
    'Produk: ' + order.produk + '\n' +
    'Jumlah: ' + order.jumlah + '\n' +
    'Total: ' + formatRupiah(order.total) + '\n' +
    'Metode: ' + order.metode_pembayaran + '\n' +
    'Kurir: J&T Reguler\n\n' +
    'Berikut bukti transfernya:'
  );
  document.getElementById('wa-konfirmasi-link').href = 'https://wa.me/' + wa + '?text=' + msg;
  paymentModal.style.display = 'flex';
}

function copyRek(noRek) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(noRek).then(() => tampilkanToast('Nomor rekening disalin!', 'sukses'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = noRek;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    tampilkanToast('Nomor rekening disalin!', 'sukses');
  }
}

function updateNavLogin() {
  const user = getSavedUser();
  const el = document.getElementById('nav-login');
  if (el && user) {
    el.textContent = 'Hi, ' + user.nama.split(' ')[0];
    el.href = 'account.html';
  }
}

updateNavLogin();
loadPaymentConfig();
loadCities();
loadProducts();
