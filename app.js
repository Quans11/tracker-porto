// =====================================================================
//  Portfolio Tracker — logika frontend (Vercel + Supabase)
// =====================================================================
const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const TYPE_LABEL = {
  saham:'Saham', kripto:'Kripto', reksadana:'Reksa Dana',
  obligasi:'Obligasi', emas:'Emas', lainnya:'Lainnya'
};
const PALETTE = ['#2563eb','#16a34a','#f59e0b','#dc2626','#7c3aed','#0891b2'];

let currentUser = null;
let chart = null;

// ---------- util ----------
const $ = (sel) => document.querySelector(sel);
const show = (el) => el.classList.remove('hidden');
const hide = (el) => el.classList.add('hidden');

function money(amount, currency = 'IDR') {
  if (currency === 'IDR') return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
  return currency + ' ' + Number(amount).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
}
function fmtQty(q) {
  return parseFloat(Number(q).toFixed(8)).toLocaleString('id-ID', {maximumFractionDigits:8});
}
function flash(msg, type = 'success') {
  const f = $('#flash');
  f.textContent = msg;
  f.className = 'flash flash-' + type;
  show(f);
  setTimeout(() => hide(f), 4000);
}

// ---------- AUTH ----------
async function refreshAuthUI() {
  const { data: { session } } = await sb.auth.getSession();
  currentUser = session ? session.user : null;
  if (currentUser) {
    hide($('#authView')); show($('#appView')); show($('#navAuthed'));
    $('#navUser').textContent = currentUser.email;
    await loadInvestments();
  } else {
    show($('#authView')); hide($('#appView')); hide($('#navAuthed'));
  }
}

// tab switch
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const isLogin = tab.dataset.tab === 'login';
    $('#loginForm').classList.toggle('hidden', !isLogin);
    $('#registerForm').classList.toggle('hidden', isLogin);
  });
});

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const { error } = await sb.auth.signInWithPassword({
    email: f.email.value, password: f.password.value
  });
  if (error) return flash(error.message, 'error');
  await refreshAuthUI();
});

$('#registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const { data, error } = await sb.auth.signUp({
    email: f.email.value, password: f.password.value
  });
  if (error) return flash(error.message, 'error');
  if (data.session) {
    await refreshAuthUI();       // email confirmation dimatikan → langsung masuk
  } else {
    flash('Pendaftaran berhasil. Cek email Anda untuk konfirmasi, lalu masuk.', 'success');
  }
});

$('#btnLogout').addEventListener('click', async () => {
  await sb.auth.signOut();
  await refreshAuthUI();
});

// ---------- READ + ringkasan ----------
async function loadInvestments() {
  const { data, error } = await sb.from('investments')
    .select('*').order('created_at', { ascending: false });
  if (error) return flash(error.message, 'error');
  renderTable(data || []);
  renderSummary(data || []);
}

function renderSummary(rows) {
  let invested = 0, value = 0;
  const alloc = {};
  rows.forEach(r => {
    const inv = Number(r.quantity) * Number(r.buy_price);
    const val = Number(r.quantity) * Number(r.current_price);
    invested += inv; value += val;
    alloc[r.asset_type] = (alloc[r.asset_type] || 0) + val;
  });
  const gain = value - invested;
  const pct = invested > 0 ? (gain / invested) * 100 : 0;

  $('#sInvested').textContent = money(invested);
  $('#sValue').textContent = money(value);
  $('#sGain').textContent = (gain >= 0 ? '+' : '') + money(gain);
  $('#sGainPct').textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
  $('#sGainCard').className = 'stat-card ' + (gain >= 0 ? 'pos' : 'neg');
  $('#sCount').textContent = rows.length;

  renderChart(alloc);
}

function renderChart(alloc) {
  const labels = Object.keys(alloc).map(t => TYPE_LABEL[t] || t);
  const data = Object.values(alloc);
  const section = $('#chartSection');
  if (!data.length || data.every(v => v === 0)) { hide(section); return; }
  show(section);

  if (chart) chart.destroy();
  chart = new Chart($('#allocationChart'), {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: PALETTE, borderWidth: 2, borderColor: '#fff' }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' },
        tooltip: { callbacks: { label: (ctx) => {
          const total = ctx.dataset.data.reduce((a,b)=>a+b,0);
          const p = total ? (ctx.parsed/total*100).toFixed(1) : 0;
          return ctx.label + ': ' + money(ctx.parsed) + ' (' + p + '%)';
        }}}
      }
    }
  });
}

function renderTable(rows) {
  const body = $('#assetBody');
  body.innerHTML = '';
  $('#emptyState').classList.toggle('hidden', rows.length > 0);

  rows.forEach(r => {
    const cur = r.currency || 'IDR';
    const inv = Number(r.quantity) * Number(r.buy_price);
    const val = Number(r.quantity) * Number(r.current_price);
    const gain = val - inv;
    const pct = inv > 0 ? (gain / inv) * 100 : 0;
    const cls = gain >= 0 ? 'pos' : 'neg';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${esc(r.asset_name)}</strong>${r.symbol ? `<span class="ticker">${esc(r.symbol)}</span>` : ''}</td>
      <td><span class="badge badge-${esc(r.asset_type)}">${TYPE_LABEL[r.asset_type] || esc(r.asset_type)}</span></td>
      <td class="num">${fmtQty(r.quantity)}</td>
      <td class="num">${money(r.buy_price, cur)}</td>
      <td class="num">${money(r.current_price, cur)}</td>
      <td class="num">${money(inv, cur)}</td>
      <td class="num">${money(val, cur)}</td>
      <td class="num ${cls}">${(gain>=0?'+':'')+money(gain,cur)}<br><small>${(pct>=0?'+':'')+pct.toFixed(2)}%</small></td>
      <td class="actions">
        <button class="btn-sm" data-edit='${esc(JSON.stringify(r))}'>Edit</button>
        <button class="btn-sm btn-danger" data-del="${r.id}">Hapus</button>
      </td>`;
    body.appendChild(tr);
  });

  body.querySelectorAll('[data-edit]').forEach(b =>
    b.addEventListener('click', () => openModal(JSON.parse(b.dataset.edit))));
  body.querySelectorAll('[data-del]').forEach(b =>
    b.addEventListener('click', () => deleteInvestment(b.dataset.del)));
}

function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c => (
  {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ---------- CREATE / UPDATE (modal) ----------
function openModal(row = null) {
  const f = $('#assetForm');
  f.reset();
  $('#modalTitle').textContent = row ? 'Edit Aset' : 'Tambah Aset';
  f.id.value = row ? row.id : '';
  if (row) {
    f.asset_name.value = row.asset_name;
    f.asset_type.value = row.asset_type;
    f.symbol.value = row.symbol || '';
    f.currency.value = row.currency || 'IDR';
    f.quantity.value = row.quantity;
    f.purchase_date.value = row.purchase_date || '';
    f.buy_price.value = row.buy_price;
    f.current_price.value = row.current_price;
    f.notes.value = row.notes || '';
  }
  show($('#modal'));
}
function closeModal(){ hide($('#modal')); }

$('#btnAdd').addEventListener('click', () => openModal());
$('#modalCancel').addEventListener('click', closeModal);
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

$('#assetForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const payload = {
    user_id: currentUser.id,
    asset_name: f.asset_name.value.trim(),
    asset_type: f.asset_type.value,
    symbol: f.symbol.value.trim() || null,
    currency: f.currency.value,
    quantity: parseFloat(f.quantity.value),
    buy_price: parseFloat(f.buy_price.value),
    current_price: parseFloat(f.current_price.value),
    purchase_date: f.purchase_date.value || null,
    notes: f.notes.value.trim() || null,
  };
  let error;
  if (f.id.value) {
    ({ error } = await sb.from('investments').update(payload).eq('id', f.id.value));
  } else {
    ({ error } = await sb.from('investments').insert(payload));
  }
  if (error) return flash(error.message, 'error');
  closeModal();
  flash(f.id.value ? 'Aset diperbarui.' : 'Aset ditambahkan.');
  await loadInvestments();
});

// ---------- DELETE ----------
async function deleteInvestment(id) {
  if (!confirm('Hapus aset ini?')) return;
  const { error } = await sb.from('investments').delete().eq('id', id);
  if (error) return flash(error.message, 'error');
  flash('Aset dihapus.');
  await loadInvestments();
}

// ---------- init ----------
$('#year').textContent = new Date().getFullYear();
refreshAuthUI();
