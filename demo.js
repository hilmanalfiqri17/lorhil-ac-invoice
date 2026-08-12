(() => {
'use strict';
const $=id=>document.getElementById(id);
const money=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(v)||0).replace(',00','');
const pad=n=>String(n).padStart(2,'0');
const dateKey=(d=new Date())=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const plusDays=n=>{const d=new Date();d.setDate(d.getDate()+n);return dateKey(d)};
const fmtDate=v=>new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric'}).format(new Date(`${v}T00:00:00`));
const fmtLong=v=>new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(`${v}T00:00:00`));
const initials=name=>(name||'').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();
const esc=s=>String(s??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[m]));
const STORE='ac_service_management_demo_original_v2';

const SEED={
  technicians:[
    {id:'t1',name:'Yonda Saputra',email:'yonda.demo@acservice.id'},
    {id:'t2',name:'Bima Ramadhan',email:'bima.demo@acservice.id'},
    {id:'t3',name:'Rizky Pratama',email:'rizky.demo@acservice.id'}
  ],
  customers:[
    {id:'c1',name:'Andi Pratama',phone:'0812-3456-7890',address:'Jl. Merdeka No. 45, Bandung'},
    {id:'c2',name:'Siti Nurhaliza',phone:'0813-2222-4411',address:'Jl. Cipaganti No. 12, Bandung'},
    {id:'c3',name:'Dewi Lestari',phone:'0852-9000-1122',address:'Jl. Setiabudi No. 88, Bandung'},
    {id:'c4',name:'Rudi Hartono',phone:'0817-5544-9911',address:'Jl. Ahmad Yani No. 101, Bandung'},
    {id:'c5',name:'Anton Wijaya',phone:'0819-2233-0044',address:'Jl. Sukajadi No. 20, Bandung'}
  ],
  schedules:[
    {id:'s0',date:plusDays(-1),time:'14:30',customer:'Anton Wijaya',phone:'0819-2233-0044',address:'Jl. Sukajadi No. 20, Bandung',job:'Cuci AC 1 Unit',technicianId:'t3',status:'done',notes:'Selesai normal.'},
    {id:'s1',date:dateKey(),time:'08:57',customer:'Andi Pratama',phone:'0812-3456-7890',address:'Jl. Merdeka No. 45, Bandung',job:'Cuci AC 1 Unit',technicianId:'t1',status:'scheduled',notes:'Cuci bersih dan cek tekanan.'},
    {id:'s2',date:dateKey(),time:'10:30',customer:'Siti Nurhaliza',phone:'0813-2222-4411',address:'Jl. Cipaganti No. 12, Bandung',job:'Pasang AC 1,5 PK',technicianId:'t2',status:'travel',notes:'Unit baru sudah tersedia.'},
    {id:'s3',date:dateKey(),time:'13:00',customer:'Dewi Lestari',phone:'0852-9000-1122',address:'Jl. Setiabudi No. 88, Bandung',job:'Perbaikan AC',technicianId:'t3',status:'working',notes:'AC tidak dingin.'},
    {id:'s4',date:plusDays(1),time:'09:00',customer:'Rudi Hartono',phone:'0817-5544-9911',address:'Jl. Ahmad Yani No. 101, Bandung',job:'Cuci AC 2 Unit',technicianId:'t1',status:'scheduled',notes:'Hubungi admin setelah selesai.'},
    {id:'s5',date:plusDays(1),time:'11:30',customer:'Anton Wijaya',phone:'0819-2233-0044',address:'Jl. Sukajadi No. 20, Bandung',job:'Service AC Split',technicianId:'t2',status:'scheduled',notes:'Cek kapasitor dan freon.'},
    {id:'s6',date:plusDays(2),time:'15:00',customer:'Andi Pratama',phone:'0812-3456-7890',address:'Jl. Merdeka No. 45, Bandung',job:'Maintenance Berkala',technicianId:'t1',status:'scheduled',notes:'Maintenance 3 bulanan.'}
  ],
  invoices:[
    {id:'i1',number:'INV-DEMO-001',date:plusDays(-3),customer:'Anton Wijaya',phone:'0819-2233-0044',address:'Jl. Sukajadi No. 20, Bandung',job:'Cuci AC 1 Unit',total:150000,payment:'Lunas',technicianId:'t3',notes:'Garansi layanan 7 hari.'},
    {id:'i2',number:'INV-DEMO-002',date:plusDays(-1),customer:'Rudi Hartono',phone:'0817-5544-9911',address:'Jl. Ahmad Yani No. 101, Bandung',job:'Service + Cuci AC',total:275000,payment:'Belum Lunas',technicianId:'t2',notes:'Menunggu pelunasan.'},
    {id:'i3',number:'INV-DEMO-003',date:dateKey(),customer:'Dewi Lestari',phone:'0852-9000-1122',address:'Jl. Setiabudi No. 88, Bandung',job:'Perbaikan AC',total:350000,payment:'Lunas',technicianId:'t3',notes:'Selesai.'},
    {id:'i4',number:'INV-DEMO-004',date:dateKey(),customer:'Siti Nurhaliza',phone:'0813-2222-4411',address:'Jl. Cipaganti No. 12, Bandung',job:'Pasang AC 1,5 PK',total:2750000,payment:'DP',technicianId:'t2',notes:'DP 50%.'}
  ],
  activity:[
    {id:'a1',time:'08:10',type:'schedule',title:'Jadwal dibuat',detail:'Andi Pratama • Cuci AC 1 Unit • Yonda Saputra'},
    {id:'a2',time:'09:20',type:'schedule',title:'Teknisi berangkat',detail:'Bima Ramadhan menuju lokasi Siti Nurhaliza'},
    {id:'a3',time:'10:45',type:'invoice',title:'Nota lunas',detail:'INV-DEMO-003 • Dewi Lestari • Rp350.000'},
    {id:'a4',time:'11:05',type:'schedule',title:'Pekerjaan dimulai',detail:'Rizky Pratama • Perbaikan AC'}
  ]
};

let state=JSON.parse(JSON.stringify(SEED));
let role='admin';
let activeTechId='t1';
let scheduleFilter='today';
let techFilter='today';

function load(){try{const raw=localStorage.getItem(STORE);if(raw) state=JSON.parse(raw)}catch(_){state=JSON.parse(JSON.stringify(SEED))}}
function save(){localStorage.setItem(STORE,JSON.stringify(state))}
load();

function statusLabel(s){return({scheduled:'Terjadwal',travel:'Dalam Perjalanan',working:'Dikerjakan',done:'Selesai',cancelled:'Dibatalkan'})[s]||s}
function workBadge(s){const cls=s==='scheduled'?'work-scheduled':s==='travel'?'work-travel':s==='working'?'work-progress':s==='done'?'work-done':'work-cancelled';return `<span class="work-badge ${cls}">${statusLabel(s)}</span>`}
function scheduleBadge(s){const cls=s==='scheduled'?'scheduled':s==='travel'?'on-the-way':s==='working'?'working':s==='done'?'completed':'cancelled';return `<span class="schedule-badge ${cls}">${statusLabel(s)}</span>`}
function monitorStatus(s){const cls=s==='scheduled'?'scheduled':s==='travel'?'onway':s==='working'?'working':s==='done'?'done':'idle';return `<span class="monitor-status ${cls}">${s?statusLabel(s):'Standby'}</span>`}
function techById(id){return state.technicians.find(t=>t.id===id)||{name:'-',email:'-'}}
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),2200)}
function closeModal(){$('detailModal').classList.add('hidden')}
function closeScheduleModal(){$('scheduleModal').classList.add('hidden')}

function pageMeta(page){return({dashboard:['Dashboard','Ringkasan data usaha hari ini.'],invoice:['Buat Nota','Buat nota digital contoh.'],history:['Riwayat Nota','Semua transaksi demo.'],schedules:['Jadwal Pekerjaan','Atur tugas teknisi.'],customers:['Pelanggan','Database pelanggan contoh.'],technicians:['Teknisi','Akun teknisi demo.'],monitoring:['Monitoring Teknisi','Pantau status pekerjaan lapangan.'],activity:['Aktivitas Tim','Log aktivitas demo.'],settings:['Pengaturan','Pengaturan sistem.'],backup:['Backup Data','Cadangkan data demo.'],'tech-dashboard':['Dashboard Teknisi',fmtLong(dateKey())],'tech-jobs':['Pekerjaan Saya','Daftar pekerjaan akun teknisi.'],'tech-history':['Riwayat Pekerjaan','Pekerjaan yang selesai.'],'tech-profile':['Profil Teknisi','Informasi akun teknisi.']})[page]||['Demo','']}
function showPage(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===`page-${page}`));
  document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  const [title,sub]=pageMeta(page);$('pageTitle').textContent=title;$('todayText').textContent=sub;
  $('sidebar').classList.remove('open');
  if(['monitoring'].includes(page)) renderMonitoring();
  if(page==='activity') renderActivity();
}
function setRole(next){
  role=next;
  $('adminNav').classList.toggle('hidden',role!=='admin');
  $('technicianNav').classList.toggle('hidden',role!=='technician');
  $('techBottomNav').classList.toggle('hidden',role!=='technician');
  $('globalSearchWrap').classList.toggle('hidden',role!=='admin');
  $('newInvoiceTopBtn').classList.toggle('hidden',role!=='admin');
  $('userAvatarText').textContent=role==='admin'?'AD':initials(techById(activeTechId).name);
  if(role==='admin') showPage('dashboard'); else showPage('tech-dashboard');
  renderAll();
}
function enterDemo(asRole){$('loginScreen').classList.add('hidden');$('app').classList.remove('hidden');setRole(asRole)}
function exitDemo(){$('app').classList.add('hidden');$('techBottomNav').classList.add('hidden');$('loginScreen').classList.remove('hidden')}

function renderDashboard(){
  const today=dateKey(),yesterday=plusDays(-1),tomorrow=plusDays(1);
  const todayJobs=state.schedules.filter(s=>s.date===today&&s.status!=='cancelled');
  $('statToday').textContent=todayJobs.length;
  $('statYesterday').textContent=state.schedules.filter(s=>s.date===yesterday&&s.status!=='cancelled').length;
  $('statRevenue').textContent=money(state.invoices.filter(i=>i.date===today&&i.payment==='Lunas').reduce((a,b)=>a+b.total,0));
  $('statUnpaid').textContent=state.invoices.filter(i=>i.payment!=='Lunas').length;

  const tomorrowJobs=state.schedules.filter(s=>s.date===tomorrow&&s.status!=='cancelled');
  $('dashboardTomorrowCount').textContent=tomorrowJobs.length;
  $('dashboardTomorrowLabel').textContent=fmtLong(tomorrow);
  $('dashboardTomorrowSchedules').innerHTML=tomorrowJobs.length?tomorrowJobs.map(s=>`<article class="schedule-mini-card"><div class="schedule-mini-top"><span class="schedule-mini-time">${esc(s.time)}</span>${scheduleBadge(s.status)}</div><h4>${esc(s.customer)}</h4><p>${esc(s.job)}<br>${esc(s.address)}</p><div class="schedule-mini-tech">Teknisi: ${esc(techById(s.technicianId).name)}</div></article>`).join(''):`<div class="schedule-mini-empty">Belum ada jadwal besok.</div>`;

  const total=state.invoices.length,paid=state.invoices.filter(i=>i.payment==='Lunas').length,open=total-paid,paidPct=total?Math.round(paid/total*100):0;
  $('paymentTotalCount').textContent=total;$('paymentPaidPercent').textContent=`${paidPct}%`;$('paymentPaidCount').textContent=`${paid} nota`;$('paymentOpenPercent').textContent=`${100-paidPct}%`;$('paymentOpenCount').textContent=`${open} nota`;$('paymentDonut').style.background=`conic-gradient(var(--green) 0 ${paidPct}%,var(--orange) ${paidPct}% 100%)`;
  $('revenueTotal').textContent=money(state.invoices.reduce((a,b)=>a+b.total,0));$('trendTotal').textContent=state.invoices.length;

  $('techRanking').innerHTML=state.technicians.map((t,idx)=>{const count=state.schedules.filter(s=>s.technicianId===t.id).length;const pct=Math.min(100,40+count*12);return `<div class="tech-rank-row"><span class="tech-avatar">${initials(t.name)}</span><div class="tech-rank-copy"><strong>${esc(t.name)}</strong><small>${count} pekerjaan</small></div><div class="tech-progress"><i style="width:${pct}%"></i></div><span class="tech-percent">${pct}%</span></div>`}).join('');

  renderHistoryTable('dashboardHistory',true);
  drawRevenueChart();drawTrendChart();
}

function drawRevenueChart(){
  const c=$('revenueChart');if(!c)return;const dpr=window.devicePixelRatio||1;const w=c.clientWidth||560,h=c.clientHeight||190;c.width=w*dpr;c.height=h*dpr;const x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);
  const vals=[1.6,2.1,1.8,3.2,2.4,4.8,2.5,3.0,5.2,3.7];const max=6; x.strokeStyle='#e7edf6';x.lineWidth=1;for(let i=1;i<5;i++){const y=h*i/5;x.beginPath();x.moveTo(34,y);x.lineTo(w-12,y);x.stroke()}
  x.strokeStyle='#1769e0';x.lineWidth=2.3;x.beginPath();vals.forEach((v,i)=>{const px=40+i*(w-62)/(vals.length-1),py=h-24-(v/max)*(h-42);i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke();x.fillStyle='#1769e0';vals.forEach((v,i)=>{const px=40+i*(w-62)/(vals.length-1),py=h-24-(v/max)*(h-42);x.beginPath();x.arc(px,py,2.8,0,Math.PI*2);x.fill()});x.fillStyle='#7b879a';x.font='10px Arial';for(let i=0;i<10;i+=2)x.fillText(`${i+1} Agu`,35+i*(w-62)/(vals.length-1),h-7);
}
function drawTrendChart(){
  const c=$('trendChart');if(!c)return;const dpr=window.devicePixelRatio||1,w=c.clientWidth||420,h=c.clientHeight||190;c.width=w*dpr;c.height=h*dpr;const x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);const done=[2,4,3,5,6,7],open=[1,1,2,1,2,1],labels=['Mar','Apr','Mei','Jun','Jul','Agu'];const max=8;const group=(w-50)/6;labels.forEach((l,i)=>{const base=30+i*group,bw=group*.24;const dh=done[i]/max*(h-45),oh=open[i]/max*(h-45);x.fillStyle='#1769e0';x.fillRect(base,h-23-dh,bw,dh);x.fillStyle='#ff8a24';x.fillRect(base+bw+3,h-23-oh,bw,oh);x.fillStyle='#7b879a';x.font='10px Arial';x.fillText(l,base-1,h-7)})
}

function renderHistoryTable(target='historyTable',compact=false){
  const rows=state.invoices.slice().sort((a,b)=>`${b.date}${b.number}`.localeCompare(`${a.date}${a.number}`));
  $(target).innerHTML=`<table class="${compact?'dashboard-table':''}"><thead><tr><th>No Nota</th><th>Pelanggan</th><th>Tanggal</th><th>Status</th><th>Total</th><th>Aksi</th></tr></thead><tbody>${rows.map(i=>`<tr><td><strong>${esc(i.number)}</strong></td><td>${esc(i.customer)}</td><td>${fmtDate(i.date)}</td><td><span class="badge ${i.payment==='Lunas'?'paid':i.payment==='DP'?'partial':'unpaid'}">${esc(i.payment)}</span></td><td class="money">${money(i.total)}</td><td><div class="history-actions"><button class="btn outline demo-invoice-detail" data-id="${i.id}">Detail</button>${compact?'':`<button class="btn secondary demo-invoice-download" data-id="${i.id}">Download PDF</button>`}</div></td></tr>`).join('')}</tbody></table>`;
  document.querySelectorAll('.demo-invoice-detail').forEach(b=>b.onclick=()=>openInvoiceDetail(b.dataset.id));
  document.querySelectorAll('.demo-invoice-download').forEach(b=>b.onclick=()=>{const inv=state.invoices.find(x=>x.id===b.dataset.id);if(inv)downloadInvoicePdf(inv)});
}

function invoiceStatusClass(payment){return payment==='Lunas'?'paid':payment==='DP'?'partial':'unpaid'}
function pdfSafe(value){return String(value??'').normalize('NFKD').replace(/[^\x20-\x7E]/g,' ').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function pdfMoney(value){return 'Rp '+new Intl.NumberFormat('id-ID',{maximumFractionDigits:0}).format(Number(value)||0)}
function pdfDate(value){return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(value+'T00:00:00')).replace(/[^\x20-\x7E]/g,' ')}
function pdfText(text,x,y,size=10,bold=false,color='0.10 0.17 0.30'){
  return `${color} rg BT /${bold?'F2':'F1'} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfSafe(text)}) Tj ET\n`;
}
function pdfLine(x1,y1,x2,y2,color='0.86 0.89 0.94',width=.8){return `${color} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S\n`}
function pdfRect(x,y,w,h,fill){return `${fill} rg ${x} ${y} ${w} ${h} re f\n`}
function wrapPdfText(text,maxChars=68){
  const words=String(text||'').split(/\s+/).filter(Boolean),lines=[];let line='';
  words.forEach(word=>{const next=line?`${line} ${word}`:word;if(next.length>maxChars&&line){lines.push(line);line=word}else line=next});if(line)lines.push(line);return lines;
}
function buildInvoicePdf(invoice){
  const tech=techById(invoice.technicianId).name||'-';
  const statusColor=invoice.payment==='Lunas'?'0.08 0.55 0.29':invoice.payment==='DP'?'0.85 0.50 0.04':'0.76 0.20 0.18';
  let content='';
  content+=pdfRect(0,750,595,92,'0.04 0.15 0.36');
  content+=pdfText('COOLOPS AC',40,806,20,true,'1 1 1');
  content+=pdfText('SERVICE & MAINTENANCE',40,787,9,false,'0.78 0.86 1');
  content+=pdfText('INVOICE',462,806,17,true,'1 1 1');
  content+=pdfText(invoice.number,433,786,9,false,'0.78 0.86 1');
  content+=pdfText('Demo document - sample data only',40,735,8,false,'0.38 0.45 0.57');

  content+=pdfText('DITAGIHKAN KEPADA',40,698,9,true,'0.13 0.37 0.85');
  content+=pdfText(invoice.customer||'-',40,678,13,true);
  wrapPdfText(invoice.address||'-',58).slice(0,2).forEach((line,idx)=>content+=pdfText(line,40,661-(idx*14),9,false,'0.36 0.43 0.55'));
  content+=pdfText(invoice.phone||'-',40,628,9,false,'0.36 0.43 0.55');

  content+=pdfText('DETAIL INVOICE',350,698,9,true,'0.13 0.37 0.85');
  content+=pdfText('Tanggal',350,678,9,false,'0.36 0.43 0.55');
  content+=pdfText(pdfDate(invoice.date),430,678,9,true);
  content+=pdfText('Status',350,660,9,false,'0.36 0.43 0.55');
  content+=pdfText(invoice.payment||'-',430,660,9,true,statusColor);
  content+=pdfText('Teknisi',350,642,9,false,'0.36 0.43 0.55');
  content+=pdfText(tech,430,642,9,true);

  content+=pdfLine(40,604,555,604);
  content+=pdfRect(40,568,515,30,'0.95 0.97 1');
  content+=pdfText('DESKRIPSI PEKERJAAN',52,579,9,true,'0.20 0.29 0.45');
  content+=pdfText('QTY',395,579,9,true,'0.20 0.29 0.45');
  content+=pdfText('HARGA',445,579,9,true,'0.20 0.29 0.45');
  content+=pdfText('TOTAL',510,579,9,true,'0.20 0.29 0.45');

  const jobLines=wrapPdfText(invoice.job||'Pekerjaan servis AC',52).slice(0,2);
  jobLines.forEach((line,idx)=>content+=pdfText(line,52,542-(idx*14),10,idx===0));
  content+=pdfText('1',400,542,10,false);
  content+=pdfText(pdfMoney(invoice.total),442,542,9,false);
  content+=pdfText(pdfMoney(invoice.total),505,542,9,true);
  content+=pdfLine(40,508,555,508);

  content+=pdfText('Subtotal',380,476,10,false,'0.36 0.43 0.55');
  content+=pdfText(pdfMoney(invoice.total),478,476,10,true);
  content+=pdfText('Pembayaran',380,454,10,false,'0.36 0.43 0.55');
  content+=pdfText(invoice.payment||'-',478,454,10,true,statusColor);
  content+=pdfRect(370,406,185,34,'0.08 0.37 0.86');
  content+=pdfText('TOTAL',384,418,11,true,'1 1 1');
  content+=pdfText(pdfMoney(invoice.total),458,418,12,true,'1 1 1');

  content+=pdfText('Catatan',40,472,10,true,'0.13 0.37 0.85');
  const notes=wrapPdfText(invoice.notes||'Terima kasih telah menggunakan layanan kami.',70).slice(0,4);
  notes.forEach((line,idx)=>content+=pdfText(line,40,452-(idx*15),9,false,'0.36 0.43 0.55'));

  content+=pdfLine(40,330,555,330);
  content+=pdfText('Dokumen ini dibuat dari AC Service Management Demo.',40,306,8,false,'0.45 0.51 0.62');
  content+=pdfText('Bukan invoice transaksi sungguhan.',40,292,8,false,'0.45 0.51 0.62');
  content+=pdfText('COOLOPS AC',440,306,9,true,'0.04 0.15 0.36');
  content+=pdfText('Demo System',456,292,8,false,'0.45 0.51 0.62');

  const objects=[];
  objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
  objects[2]='<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
  objects[3]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>';
  objects[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[5]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
  objects[6]=`<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}endstream`;
  let pdf='%PDF-1.4\n',offsets=[0];
  for(let i=1;i<=6;i++){offsets[i]=new TextEncoder().encode(pdf).length;pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`}
  const xrefOffset=new TextEncoder().encode(pdf).length;
  pdf+='xref\n0 7\n0000000000 65535 f \n';
  for(let i=1;i<=6;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
  pdf+=`trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([new TextEncoder().encode(pdf)],{type:'application/pdf'});
}
function previewInvoicePdf(invoice){
  const url=URL.createObjectURL(buildInvoicePdf(invoice));
  window.open(url,'_blank','noopener');
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function downloadInvoicePdf(invoice){
  const url=URL.createObjectURL(buildInvoicePdf(invoice));
  const a=document.createElement('a');a.href=url;a.download=`${invoice.number||'invoice-demo'}.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  toast('PDF invoice demo berhasil diunduh.');
}
function invoicePreviewMarkup(i){
  return `<div class="invoice-preview-shell"><div class="invoice-paper">
    <div class="invoice-preview-head"><div><strong>COOLOPS AC</strong><small>Service & Maintenance</small></div><div class="invoice-preview-number"><b>INVOICE</b><span>${esc(i.number)}</span></div></div>
    <div class="invoice-preview-meta"><div><small>DITAGIHKAN KEPADA</small><strong>${esc(i.customer)}</strong><span>${esc(i.address||'-')}</span><span>${esc(i.phone||'-')}</span></div><div><small>DETAIL INVOICE</small><p><span>Tanggal</span><b>${fmtDate(i.date)}</b></p><p><span>Status</span><b class="badge ${invoiceStatusClass(i.payment)}">${esc(i.payment)}</b></p><p><span>Teknisi</span><b>${esc(techById(i.technicianId).name)}</b></p></div></div>
    <div class="invoice-preview-table"><div class="invoice-preview-th"><span>Deskripsi Pekerjaan</span><span>Qty</span><span>Harga</span><span>Total</span></div><div class="invoice-preview-tr"><span><b>${esc(i.job)}</b></span><span>1</span><span>${money(i.total)}</span><span><b>${money(i.total)}</b></span></div></div>
    <div class="invoice-preview-bottom"><div><small>Catatan</small><p>${esc(i.notes||'Terima kasih telah menggunakan layanan kami.')}</p></div><div class="invoice-preview-total"><span>Total</span><strong>${money(i.total)}</strong></div></div>
    <div class="invoice-preview-footer">Dokumen demo • bukan transaksi sungguhan</div>
  </div></div>`;
}
function openInvoiceDetail(id){
  const i=state.invoices.find(x=>x.id===id);if(!i)return;
  const modalTitle=document.querySelector('#detailModal .modal-head h3');if(modalTitle)modalTitle.textContent='Preview Invoice & PDF';
  $('detailContent').innerHTML=`${invoicePreviewMarkup(i)}<div class="detail-grid invoice-detail-extra"><div class="detail-box"><h4>Informasi Nota</h4><div class="detail-row"><span>No Nota</span><strong>${esc(i.number)}</strong></div><div class="detail-row"><span>Status</span><strong>${esc(i.payment)}</strong></div><div class="detail-row"><span>Total</span><strong>${money(i.total)}</strong></div></div><div class="detail-box"><h4>Kontak</h4><div class="detail-row"><span>WhatsApp</span><strong>${esc(i.phone||'-')}</strong></div><div class="detail-row"><span>Teknisi</span><strong>${esc(techById(i.technicianId).name)}</strong></div></div></div><div class="actions invoice-pdf-actions"><button class="btn secondary demo-wa-preview">Simulasi WhatsApp</button><button class="btn outline preview-pdf-btn">Lihat PDF</button><button class="btn primary download-pdf-btn">Download PDF</button></div>`;
  $('detailModal').classList.remove('hidden');
  document.querySelectorAll('.demo-wa-preview').forEach(b=>b.onclick=()=>toast('Demo: WhatsApp tidak dikirim sungguhan.'));
  document.querySelectorAll('.preview-pdf-btn').forEach(b=>b.onclick=()=>previewInvoicePdf(i));
  document.querySelectorAll('.download-pdf-btn').forEach(b=>b.onclick=()=>downloadInvoicePdf(i));
}

function renderSchedules(){
  let rows=state.schedules.slice();if(scheduleFilter==='today')rows=rows.filter(s=>s.date===dateKey());else if(scheduleFilter==='tomorrow')rows=rows.filter(s=>s.date===plusDays(1));rows.sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  $('scheduleTable').innerHTML=`<table><thead><tr><th>Waktu</th><th>Pelanggan</th><th>Pekerjaan</th><th>Teknisi</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows.length?rows.map(s=>`<tr><td><b>${fmtDate(s.date)}</b><br><small>${s.time} WIB</small></td><td><b>${esc(s.customer)}</b><br><small>${esc(s.address)}</small></td><td>${esc(s.job)}</td><td>${esc(techById(s.technicianId).name)}</td><td>${scheduleBadge(s.status)}</td><td><button class="btn outline schedule-detail-btn" data-id="${s.id}">Detail</button></td></tr>`).join(''):`<tr><td colspan="6" class="empty">Belum ada jadwal.</td></tr>`}</tbody></table>`;
  document.querySelectorAll('.schedule-detail-btn').forEach(b=>b.onclick=()=>openJobDetail(b.dataset.id));
}
function openScheduleModal(){$('scheduleDate').value=dateKey();$('scheduleTechnician').innerHTML=state.technicians.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('');$('scheduleModal').classList.remove('hidden')}

function renderCustomers(){$('customerTable').innerHTML=`<table><thead><tr><th>Nama</th><th>WhatsApp</th><th>Alamat</th><th>Total Pekerjaan</th></tr></thead><tbody>${state.customers.map(c=>`<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.phone)}</td><td>${esc(c.address)}</td><td>${state.schedules.filter(s=>s.customer===c.name).length}</td></tr>`).join('')}</tbody></table>`}
function renderTechnicians(){$('technicianCards').innerHTML=state.technicians.map(t=>{const jobs=state.schedules.filter(s=>s.technicianId===t.id),done=jobs.filter(s=>s.status==='done').length;return `<article class="demo-tech-card"><div class="demo-tech-card-head"><span class="monitor-avatar">${initials(t.name)}</span><span class="monitor-account-state active">Aktif</span></div><h3>${esc(t.name)}</h3><p>${esc(t.email)}<br>${jobs.length} tugas • ${done} selesai</p><button class="btn outline demo-switch-tech" data-id="${t.id}">Coba Akun Teknisi</button></article>`}).join('');document.querySelectorAll('.demo-switch-tech').forEach(b=>b.onclick=()=>{activeTechId=b.dataset.id;setRole('technician');toast(`Masuk sebagai ${techById(activeTechId).name}`)})}

function renderMonitoring(){
  const today=dateKey();const techs=state.technicians.map(t=>({t,jobs:state.schedules.filter(s=>s.technicianId===t.id&&s.date===today&&s.status!=='cancelled')}));
  $('monitorActiveCount').textContent=state.technicians.length;$('monitorTravelCount').textContent=techs.reduce((a,x)=>a+x.jobs.filter(j=>j.status==='travel').length,0);$('monitorWorkingCount').textContent=techs.reduce((a,x)=>a+x.jobs.filter(j=>j.status==='working').length,0);$('monitorDoneCount').textContent=techs.reduce((a,x)=>a+x.jobs.filter(j=>j.status==='done').length,0);
  $('monitorTechnicianList').innerHTML=techs.map(({t,jobs})=>{const current=jobs.find(j=>['travel','working'].includes(j.status))||jobs.find(j=>j.status==='scheduled')||null;const next=state.schedules.find(s=>s.technicianId===t.id&&s.date>today&&s.status==='scheduled')||null;const done=jobs.filter(j=>j.status==='done').length;const pct=jobs.length?Math.round(done/jobs.length*100):0;return `<article class="monitor-tech-card"><div class="monitor-tech-main"><div class="monitor-tech-identity"><span class="monitor-avatar">${initials(t.name)}</span><div><h4>${esc(t.name)}</h4><p>${esc(t.email)}</p><span class="monitor-account-state active">Aktif</span></div></div><div class="monitor-current"><small>PEKERJAAN SAAT INI</small>${monitorStatus(current?.status)}<strong>${current?esc(current.customer):'Belum ada pekerjaan'}</strong><p>${current?esc(current.job):'-'}</p></div><div class="monitor-period-stats"><div><strong>${jobs.length}</strong><span>Hari ini</span></div><div><strong>${done}</strong><span>Selesai</span></div><div><strong>${state.schedules.filter(s=>s.technicianId===t.id).length}</strong><span>Total</span></div></div><div class="monitor-next"><small>JADWAL BERIKUTNYA</small><strong>${next?`${fmtDate(next.date)} • ${next.time}`:'Belum ada jadwal'}</strong><p>${next?esc(next.customer):'-'}</p></div></div><div class="monitor-progress"><div><span>Penyelesaian hari ini</span><strong>${pct}%</strong></div><div class="monitor-progress-track"><i style="width:${pct}%"></i></div></div><div class="monitor-tech-actions"><button class="btn outline demo-switch-tech" data-id="${t.id}">Lihat Akun Teknisi</button></div></article>`}).join('');document.querySelectorAll('.demo-switch-tech').forEach(b=>b.onclick=()=>{activeTechId=b.dataset.id;setRole('technician')})
}
function renderActivity(){$('activityList').innerHTML=state.activity.slice().reverse().map(a=>`<article class="demo-activity-item"><span class="demo-activity-icon">${a.type==='invoice'?'▤':'◷'}</span><div><strong>${esc(a.title)}</strong><small>${esc(a.detail)}</small></div><time>${esc(a.time)}</time></article>`).join('')}

function techJobs(){return state.schedules.filter(s=>s.technicianId===activeTechId).sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))}
function nextAction(s){if(s==='scheduled')return['Berangkat','travel'];if(s==='travel')return['Mulai','working'];if(s==='working')return['Selesaikan','done'];return null}
function dateParts(v){const d=new Date(`${v}T00:00:00`);return{weekday:new Intl.DateTimeFormat('id-ID',{weekday:'short'}).format(d).toUpperCase().replace('.',''),date:new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short'}).format(d).toUpperCase().replace('.','')}}
function techJobCard(job,variant='work'){const time=esc(job.time),day=dateParts(job.date),action=nextAction(job.status);const main=`<div class="tech-job-main"><div class="tech-job-main-title"><strong>${esc(job.customer)}</strong></div><span class="tech-job-service">${esc(job.job)}</span><div class="tech-job-location"><span>⌖</span><span>${esc(job.address)}</span></div><span class="tech-job-source">Jadwal</span></div>`;const status=`<div class="tech-job-status-area">${workBadge(job.status)}<small>${job.status==='travel'?'Menuju lokasi':job.status==='working'?'Pekerjaan sedang berlangsung':job.status==='done'?'Pekerjaan selesai':'Sesuai jadwal'}</small><strong>${time} WIB</strong></div>`;const detail=`<button class="btn outline tech-detail-btn" data-id="${job.id}">Detail</button>`;const map=`<button class="btn outline demo-map-btn" data-id="${job.id}">Buka Maps</button>`;const actionBtn=action?`<button class="btn primary tech-quick-status" data-id="${job.id}" data-next="${action[1]}">${action[0]}</button>`:'';if(variant==='upcoming')return `<article class="tech-job-card status-scheduled"><div class="tech-upcoming-day"><strong>${day.weekday}</strong><span>${day.date}</span></div><div class="tech-upcoming-time">${time}<small>WIB</small></div>${main}<div class="tech-job-status-area tech-upcoming-status">${workBadge(job.status)}</div><div class="tech-job-row-actions tech-upcoming-actions">${detail}</div></article>`;return `<article class="tech-job-card"><div class="tech-job-time-block"><strong class="tech-job-time">${time}</strong><small>WIB</small></div>${main}${status}<div class="tech-job-row-actions">${detail}${map}${actionBtn}</div></article>`}
function bindTechJobButtons(){document.querySelectorAll('.tech-detail-btn').forEach(b=>b.onclick=()=>openJobDetail(b.dataset.id));document.querySelectorAll('.demo-map-btn').forEach(b=>b.onclick=()=>toast('Demo: lokasi akan dibuka di Google Maps.'));document.querySelectorAll('.tech-quick-status').forEach(b=>b.onclick=()=>{const s=state.schedules.find(x=>x.id===b.dataset.id);if(!s)return;s.status=b.dataset.next;state.activity.push({id:'a'+Date.now(),time:new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}),type:'schedule',title:`Status: ${statusLabel(s.status)}`,detail:`${s.customer} • ${techById(s.technicianId).name}`});save();renderAll();toast(`Status diubah menjadi ${statusLabel(s.status)}`)})}
function renderTech(){
  const all=techJobs(),today=dateKey(),todayJobs=all.filter(j=>j.date===today&&j.status!=='cancelled'),active=todayJobs.filter(j=>['travel','working'].includes(j.status)),done=todayJobs.filter(j=>j.status==='done'),upcoming=all.filter(j=>j.date>today&&j.status!=='done'&&j.status!=='cancelled'),next=upcoming[0]||null;
  const tech=techById(activeTechId);$('techWelcomeName').textContent=tech.name.split(' ')[0];$('techTodayCount').textContent=todayJobs.length;$('techActiveCount').textContent=active.length;$('techDoneCount').textContent=done.length;$('techNextTime').textContent=next?next.time:'-';$('techNextDate').textContent=next?fmtDate(next.date):'Belum ada jadwal';$('techTodayBadge').textContent=todayJobs.length;$('techUpcomingBadge').textContent=upcoming.length;$('techTodayLabel').textContent=fmtLong(today);$('techTodayJobs').innerHTML=todayJobs.length?todayJobs.map(j=>techJobCard(j,'dashboard')).join(''):`<div class="tech-job-empty">Belum ada pekerjaan hari ini.</div>`;$('techUpcomingJobs').innerHTML=upcoming.length?upcoming.slice(0,4).map(j=>techJobCard(j,'upcoming')).join(''):`<div class="tech-job-empty">Belum ada pekerjaan berikutnya.</div>`;
  $('techJobsTotalCount').textContent=all.length;$('techTravelCount').textContent=all.filter(j=>j.status==='travel').length;$('techWorkingCount').textContent=all.filter(j=>j.status==='working').length;$('techJobsDoneCount').textContent=done.length;$('techJobsPageDate').textContent=fmtLong(today);
  let primary=[],up2=[];if(techFilter==='today'){primary=all.filter(j=>j.date===today&&j.status!=='done'&&j.status!=='cancelled');up2=all.filter(j=>j.date>today&&j.status!=='done'&&j.status!=='cancelled');$('techJobsPrimaryTitle').childNodes[0].nodeValue='Pekerjaan Aktif Hari Ini '}else if(techFilter==='tomorrow'){primary=all.filter(j=>j.date===plusDays(1)&&j.status!=='cancelled');up2=all.filter(j=>j.date>plusDays(1)&&j.status!=='done'&&j.status!=='cancelled');$('techJobsPrimaryTitle').childNodes[0].nodeValue='Pekerjaan Besok '}else if(techFilter==='active'){primary=all.filter(j=>j.status!=='done'&&j.status!=='cancelled');$('techJobsPrimaryTitle').childNodes[0].nodeValue='Semua Pekerjaan Aktif '}else{primary=all.filter(j=>j.status!=='cancelled');$('techJobsPrimaryTitle').childNodes[0].nodeValue='Semua Pekerjaan '} $('techJobsPrimaryBadge').textContent=primary.length;$('techJobsUpcomingBadge').textContent=up2.length;$('techJobsList').innerHTML=primary.length?primary.map(j=>techJobCard(j,'work')).join(''):`<div class="tech-job-empty">Tidak ada pekerjaan.</div>`;$('techJobsUpcomingList').innerHTML=up2.length?up2.map(j=>techJobCard(j,'upcoming')).join(''):`<div class="tech-job-empty">Belum ada pekerjaan mendatang.</div>`;
  const hist=all.filter(j=>j.status==='done');$('techHistoryList').innerHTML=hist.length?hist.map(j=>techJobCard(j,'work')).join(''):`<div class="tech-job-empty">Riwayat pekerjaan masih kosong.</div>`;$('techProfileAvatar').textContent=initials(tech.name);$('techProfileName').textContent=tech.name;$('techProfileEmail').textContent=tech.email;
  bindTechJobButtons();
}
function openJobDetail(id){const s=state.schedules.find(x=>x.id===id);if(!s)return;const modalTitle=document.querySelector('#detailModal .modal-head h3');if(modalTitle)modalTitle.textContent='Detail Pekerjaan';const action=role==='technician'?nextAction(s.status):null;$('detailContent').innerHTML=`<div class="tech-detail-header"><div><div class="tech-detail-number">Jadwal Pekerjaan</div><div class="tech-detail-customer">${esc(s.customer)}</div></div>${workBadge(s.status)}</div><div class="detail-box"><div class="detail-row"><span>Waktu</span><strong>${fmtDate(s.date)} • ${esc(s.time)}</strong></div><div class="detail-row"><span>Pekerjaan</span><strong>${esc(s.job)}</strong></div><div class="detail-row"><span>Lokasi</span><strong>${esc(s.address)}</strong></div>${role==='admin'?`<div class="detail-row"><span>WhatsApp</span><strong>${esc(s.phone)}</strong></div>`:''}<div class="detail-row"><span>Teknisi</span><strong>${esc(techById(s.technicianId).name)}</strong></div><div class="detail-row"><span>Catatan</span><strong>${esc(s.notes||'-')}</strong></div></div><div class="tech-detail-actions"><button class="btn outline demo-map-detail">⌖ Buka Maps</button></div>${action?`<div class="tech-status-panel"><h4>Status Pekerjaan</h4><div class="tech-status-buttons"><button class="btn secondary demo-status-set" data-next="travel">Dalam Perjalanan</button><button class="btn secondary demo-status-set" data-next="working">Mulai Dikerjakan</button><button class="btn success demo-status-set" data-next="done">Tandai Selesai</button></div><p class="tech-status-note">Perubahan status langsung terlihat di Dashboard Admin demo.</p></div>`:''}`;$('detailModal').classList.remove('hidden');document.querySelector('.demo-map-detail').onclick=()=>toast('Demo: lokasi akan dibuka di Google Maps.');document.querySelectorAll('.demo-status-set').forEach(b=>b.onclick=()=>{s.status=b.dataset.next;save();closeModal();renderAll();toast(`Status diubah menjadi ${statusLabel(s.status)}`)})}

function renderAll(){renderDashboard();renderHistoryTable();renderSchedules();renderCustomers();renderTechnicians();renderMonitoring();renderActivity();renderTech()}

$('demoAdminBtn').onclick=()=>enterDemo('admin');$('demoTechBtn').onclick=()=>enterDemo('technician');$('logoutBtn').onclick=exitDemo;$('switchRoleBtn').onclick=()=>setRole(role==='admin'?'technician':'admin');$('techProfileSwitchBtn').onclick=()=>setRole('admin');$('refreshBtn').onclick=()=>{renderAll();toast('Data demo disegarkan.')};$('menuBtn').onclick=()=>$('sidebar').classList.toggle('open');$('newInvoiceTopBtn').onclick=()=>showPage('invoice');$('dashboardScheduleSeeAll').onclick=()=>showPage('schedules');$('closeModalBtn').onclick=closeModal;$('closeScheduleModalBtn').onclick=closeScheduleModal;$('cancelScheduleBtn').onclick=closeScheduleModal;$('openScheduleModalBtn').onclick=openScheduleModal;
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));document.querySelectorAll('[data-page-jump]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.pageJump)));document.querySelectorAll('.tech-summary-link,.tech-text-link').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
document.querySelectorAll('.demo-schedule-filter').forEach(b=>b.onclick=()=>{scheduleFilter=b.dataset.filter;document.querySelectorAll('.demo-schedule-filter').forEach(x=>x.classList.toggle('active',x===b));renderSchedules()});document.querySelectorAll('.tech-job-filter').forEach(b=>b.onclick=()=>{techFilter=b.dataset.techFilter;document.querySelectorAll('.tech-job-filter').forEach(x=>x.classList.toggle('active',x===b));renderTech()});
$('resetDemoBtn').onclick=()=>{if(confirm('Reset semua data demo ke kondisi awal?')){state=JSON.parse(JSON.stringify(SEED));save();renderAll();toast('Data demo berhasil di-reset.')}};
$('invoiceForm').onsubmit=e=>{e.preventDefault();const id='i'+Date.now();state.invoices.push({id,number:`INV-DEMO-${String(state.invoices.length+1).padStart(3,'0')}`,date:dateKey(),customer:$('invoiceCustomer').value.trim(),phone:$('invoicePhone').value.trim(),address:$('invoiceAddress').value.trim(),job:$('invoiceJob').value.trim(),total:Number($('invoiceTotal').value)||0,payment:$('invoicePayment').value,technicianId:$('invoiceTechnician').value,notes:$('invoiceNotes').value.trim()});state.activity.push({id:'a'+Date.now(),time:new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}),type:'invoice',title:'Nota demo dibuat',detail:$('invoiceCustomer').value.trim()});save();e.target.reset();renderAll();showPage('history');toast('Nota demo berhasil dibuat.')};
$('scheduleForm').onsubmit=e=>{e.preventDefault();const customer=$('scheduleCustomer').value.trim(),address=$('scheduleAddress').value.trim();const existing=state.customers.find(c=>c.name.toLowerCase()===customer.toLowerCase());const phone=existing?.phone||'0812-0000-0000';state.schedules.push({id:'s'+Date.now(),date:$('scheduleDate').value,time:$('scheduleTime').value,customer,phone,address,job:$('scheduleJob').value.trim(),technicianId:$('scheduleTechnician').value,status:'scheduled',notes:$('scheduleNotes').value.trim()});if(!existing)state.customers.push({id:'c'+Date.now(),name:customer,phone,address});state.activity.push({id:'a'+Date.now(),time:new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}),type:'schedule',title:'Jadwal demo dibuat',detail:`${customer} • ${techById($('scheduleTechnician').value).name}`});save();e.target.reset();closeScheduleModal();renderAll();toast('Jadwal demo berhasil dibuat.')};
$('downloadDemoBackupBtn').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ac-service-demo-backup.json';a.click();URL.revokeObjectURL(url)};
$('globalSearch').addEventListener('input',e=>{const q=e.target.value.toLowerCase().trim();if(!q)return;const inv=state.invoices.find(i=>`${i.number} ${i.customer}`.toLowerCase().includes(q));const cus=state.customers.find(c=>`${c.name} ${c.phone}`.toLowerCase().includes(q));if(inv){showPage('history');setTimeout(()=>toast(`Ditemukan: ${inv.number}`),80)}else if(cus){showPage('customers');setTimeout(()=>toast(`Ditemukan pelanggan: ${cus.name}`),80)}});
document.querySelectorAll('.demo-wa-preview').forEach(b=>b.onclick=()=>toast('Demo: WhatsApp tidak dikirim sungguhan.'));
window.addEventListener('resize',()=>{if(!$('app').classList.contains('hidden')){drawRevenueChart();drawTrendChart()}});

$('todayText').textContent=fmtLong(dateKey());$('invoiceTechnician').innerHTML=state.technicians.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('');renderAll();
})();
