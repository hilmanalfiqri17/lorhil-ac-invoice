(() => {
  "use strict";

  const cfg = window.LORHIL_CONFIG || {};
  const configured =
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_KEY &&
    !cfg.SUPABASE_URL.includes("PASTE_") &&
    !cfg.SUPABASE_KEY.includes("PASTE_");

  const $ = id => document.getElementById(id);
  const money = value => new Intl.NumberFormat("id-ID", {
    style:"currency", currency:"IDR", maximumFractionDigits:0
  }).format(Number(value)||0);

  const localDate = (d = new Date()) => {
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  };
  const localTime = () => {
    const d=new Date(); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  };
  const yesterday = () => { const d=new Date(); d.setDate(d.getDate()-1); return localDate(d); };
  const formatDate = value => {
    if(!value) return "-";
    const [y,m,d]=value.split("-").map(Number);
    return new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(y,m-1,d));
  };
  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const uid = () => state.session?.user?.id;
  const statusFrom = (total,paid) => {
    total=Number(total)||0; paid=Number(paid)||0;
    if(total>0 && paid>=total) return "Lunas";
    if(paid>0) return "DP";
    return "Belum Lunas";
  };
  const badge = status => `<span class="badge ${status==="Lunas"?"paid":status==="DP"?"partial":"unpaid"}">${esc(status)}</span>`;

  let db = null;
  const state = {
    session:null, invoices:[], settings:null, page:"dashboard",
    dashboardPeriod:"today", realtime:null
  };

  function show(id){ $(id).classList.remove("hidden"); }
  function hide(id){ $(id).classList.add("hidden"); }
  function loading(on){ on ? show("loading") : hide("loading"); }
  function toast(message){
    $("toast").textContent=message; show("toast");
    clearTimeout(toast.timer); toast.timer=setTimeout(()=>hide("toast"),2600);
  }
  function errorMessage(error){ return error?.message || "Terjadi kesalahan."; }

  async function init(){
    if(!configured){
      show("setupScreen"); hide("loginScreen"); hide("app"); return;
    }
    db = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);

    const { data } = await db.auth.getSession();
    state.session = data.session;

    db.auth.onAuthStateChange((_event, session) => {
      state.session=session;
      session ? enterApp() : showLogin();
    });

    if(state.session) await enterApp(); else showLogin();

    if("serviceWorker" in navigator){
      window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js").catch(()=>{}));
    }
  }

  function showLogin(){
    hide("setupScreen"); hide("app"); show("loginScreen");
    $("loginError").textContent="";
  }

  async function enterApp(){
    hide("setupScreen"); hide("loginScreen"); show("app");
    $("todayText").textContent=new Intl.DateTimeFormat("id-ID",{
      weekday:"long",day:"numeric",month:"long",year:"numeric"
    }).format(new Date());
    resetInvoice();
    await refreshAll();
    subscribeRealtime();
    showPage("dashboard");
  }

  $("loginForm").addEventListener("submit",async e=>{
    e.preventDefault(); $("loginError").textContent=""; loading(true);
    const { error } = await db.auth.signInWithPassword({
      email:$("loginEmail").value.trim(),
      password:$("loginPassword").value
    });
    loading(false);
    if(error) $("loginError").textContent="Email atau password salah.";
  });
  $("togglePassword").addEventListener("click",()=>{
    $("loginPassword").type=$("loginPassword").type==="password"?"text":"password";
  });
  $("logoutBtn").addEventListener("click",async()=>{ loading(true); await db.auth.signOut(); loading(false); });
  $("menuBtn").addEventListener("click",()=> $("sidebar").classList.toggle("open"));
  $("refreshBtn").addEventListener("click",async()=>{ await refreshAll(); toast("Data berhasil disegarkan."); });

  const titles={dashboard:"Dashboard",invoice:"Buat Nota",history:"Riwayat Nota",customers:"Pelanggan",settings:"Pengaturan",backup:"Backup"};
  document.querySelectorAll(".nav-btn[data-page]").forEach(btn=>btn.addEventListener("click",()=>showPage(btn.dataset.page)));
  document.querySelectorAll(".go-invoice").forEach(btn=>btn.addEventListener("click",()=>{resetInvoice();showPage("invoice");}));

  function showPage(page){
    state.page=page;
    document.querySelectorAll(".page").forEach(el=>el.classList.remove("active"));
    $(`page-${page}`).classList.add("active");
    document.querySelectorAll(".nav-btn[data-page]").forEach(el=>el.classList.toggle("active",el.dataset.page===page));
    $("pageTitle").textContent=titles[page]||"LORHIL AC";
    $("sidebar").classList.remove("open");
    if(page==="dashboard") renderDashboard();
    if(page==="history") renderHistory();
    if(page==="customers") renderCustomers();
    if(page==="settings") renderSettings();
    if(page==="invoice") refreshCustomerList();
  }

  async function refreshAll(){
    if(!uid()) return;
    loading(true);
    try{
      const [invoiceResult,settingsResult]=await Promise.all([
        db.from("invoices").select("*, invoice_items(*)").order("work_date",{ascending:false}).order("work_time",{ascending:false}),
        db.from("store_settings").select("*").maybeSingle()
      ]);
      if(invoiceResult.error) throw invoiceResult.error;
      if(settingsResult.error) throw settingsResult.error;
      state.invoices=invoiceResult.data||[];
      state.settings=settingsResult.data || await createDefaultSettings();
      applyBrand();
      renderDashboard(); renderHistory(); renderCustomers(); refreshCustomerList();
    }catch(error){
      alert(errorMessage(error));
    }finally{ loading(false); }
  }

  async function createDefaultSettings(){
    const defaults={
      user_id:uid(),store_name:"LORHIL AC",phone:"08xxxxxxxxxx",address:"Alamat LORHIL AC",
      payment_info:"Tunai / Transfer",footer_note:"Terima kasih telah menggunakan layanan LORHIL AC.",
      signer_name:"Hendri",signer_role:"Pemilik LORHIL AC"
    };
    const {data,error}=await db.from("store_settings").upsert(defaults).select().single();
    if(error) throw error;
    return data;
  }

  function applyBrand(){
    $("brandName").textContent=state.settings?.store_name||"LORHIL AC";
    document.title=`${state.settings?.store_name||"LORHIL AC"} Online`;
  }

  function invoiceText(inv){
    return (inv.invoice_items||[]).map(x=>x.description).join(", ");
  }
  function filterPeriod(data,period,custom=""){
    if(custom) return data.filter(x=>x.work_date===custom);
    if(period==="today") return data.filter(x=>x.work_date===localDate());
    if(period==="yesterday") return data.filter(x=>x.work_date===yesterday());
    if(period==="7days"){
      const start=new Date(); start.setHours(0,0,0,0); start.setDate(start.getDate()-6);
      return data.filter(x=>{const [y,m,d]=x.work_date.split("-").map(Number);return new Date(y,m-1,d)>=start;});
    }
    return data;
  }
  function filterStatus(data,status){
    if(status==="paid") return data.filter(x=>x.status==="Lunas");
    if(status==="unpaid") return data.filter(x=>x.status!=="Lunas");
    return data;
  }
  function filterSearch(data,query){
    const q=(query||"").trim().toLowerCase(); if(!q) return data;
    return data.filter(x=>
      x.invoice_number.toLowerCase().includes(q) ||
      x.customer_name.toLowerCase().includes(q) ||
      (x.customer_phone||"").toLowerCase().includes(q) ||
      invoiceText(x).toLowerCase().includes(q)
    );
  }

  document.querySelectorAll(".dashboard-period").forEach(btn=>btn.addEventListener("click",()=>{
    state.dashboardPeriod=btn.dataset.period;
    document.querySelectorAll(".dashboard-period").forEach(x=>x.classList.toggle("active",x===btn));
    renderDashboard();
  }));
  ["dashboardStatus","dashboardSearch"].forEach(id=>$(id).addEventListener(id==="dashboardSearch"?"input":"change",renderDashboard));
  ["historyPeriod","historyDate","historyStatus"].forEach(id=>$(id).addEventListener("change",renderHistory));
  $("historySearch").addEventListener("input",renderHistory);
  $("customerSearch").addEventListener("input",renderCustomers);

  function renderDashboard(){
    const todayData=state.invoices.filter(x=>x.work_date===localDate());
    $("statToday").textContent=todayData.length;
    $("statYesterday").textContent=state.invoices.filter(x=>x.work_date===yesterday()).length;
    $("statRevenue").textContent=money(todayData.reduce((s,x)=>s+Number(x.paid||0),0));
    $("statUnpaid").textContent=state.invoices.filter(x=>x.status!=="Lunas").length;

    let data=filterPeriod(state.invoices,state.dashboardPeriod);
    data=filterStatus(data,$("dashboardStatus").value);
    data=filterSearch(data,$("dashboardSearch").value);
    renderInvoiceRows($("dashboardBody"),data,false);
  }

  function renderHistory(){
    let data=filterPeriod(state.invoices,$("historyPeriod").value,$("historyDate").value);
    data=filterStatus(data,$("historyStatus").value);
    data=filterSearch(data,$("historySearch").value);
    renderInvoiceRows($("historyBody"),data,true);
  }

  function renderInvoiceRows(body,data,showTime){
    if(!data.length){
      body.innerHTML=`<tr><td colspan="${showTime?8:7}" class="empty">Belum ada data pada filter ini.</td></tr>`;return;
    }
    body.innerHTML=data.map(inv=>`
      <tr>
        <td>${formatDate(inv.work_date)}</td>
        ${showTime?`<td>${esc((inv.work_time||"").slice(0,5))}</td>`:""}
        <td><strong>${esc(inv.invoice_number)}</strong></td>
        <td>${esc(inv.customer_name)}</td>
        <td class="truncate" title="${esc(invoiceText(inv))}">${esc(invoiceText(inv)||"-")}</td>
        <td><strong>${money(inv.total)}</strong></td>
        <td>${badge(inv.status)}</td>
        <td><button class="btn primary detail-btn" data-id="${inv.id}">Lihat Detail</button></td>
      </tr>`).join("");
    body.querySelectorAll(".detail-btn").forEach(btn=>btn.addEventListener("click",()=>openDetail(btn.dataset.id)));
  }

  function customerGroups(){
    const map=new Map();
    state.invoices.forEach(inv=>{
      const key=(inv.customer_phone||inv.customer_name).trim().toLowerCase();
      const c=map.get(key)||{name:inv.customer_name,phone:inv.customer_phone||"-",address:inv.customer_address||"-",jobs:0,last:inv.work_date,total:0};
      c.jobs++; c.total+=Number(inv.total||0);
      if(inv.work_date>=c.last){c.name=inv.customer_name;c.phone=inv.customer_phone||c.phone;c.address=inv.customer_address||c.address;c.last=inv.work_date;}
      map.set(key,c);
    });
    return [...map.values()].sort((a,b)=>b.last.localeCompare(a.last));
  }
  function renderCustomers(){
    const q=$("customerSearch").value.trim().toLowerCase();
    const data=customerGroups().filter(c=>!q||`${c.name} ${c.phone} ${c.address}`.toLowerCase().includes(q));
    $("customersBody").innerHTML=data.length?data.map(c=>`
      <tr><td><strong>${esc(c.name)}</strong></td><td>${esc(c.phone)}</td><td class="truncate">${esc(c.address)}</td>
      <td>${c.jobs}</td><td>${formatDate(c.last)}</td><td><strong>${money(c.total)}</strong></td></tr>`).join(""):
      `<tr><td colspan="6" class="empty">Data pelanggan akan muncul dari invoice.</td></tr>`;
  }
  function refreshCustomerList(){
    $("customerList").innerHTML=customerGroups().map(c=>`<option value="${esc(c.name)}">${esc(c.phone)}</option>`).join("");
  }
  $("customerName").addEventListener("change",()=>{
    const c=customerGroups().find(x=>x.name.toLowerCase()===$("customerName").value.trim().toLowerCase());
    if(c){$("customerPhone").value=c.phone==="-"?"":c.phone;$("customerAddress").value=c.address==="-"?"":c.address;}
  });

  $("addItemBtn").addEventListener("click",()=>addItem());
  $("discount").addEventListener("input",calculate);
  $("paid").addEventListener("input",calculate);
  $("resetInvoiceBtn").addEventListener("click",resetInvoice);

  function addItem(item={}){
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td class="index"></td>
      <td><input class="desc" required placeholder="Contoh: Cuci AC 1 PK" value="${esc(item.description||"")}"></td>
      <td><input class="qty" type="number" min="1" step="1" value="${Number(item.quantity)||1}" required></td>
      <td><input class="price" type="number" min="0" step="1000" value="${Number(item.unit_price)||0}" required></td>
      <td class="line-total money">Rp0</td>
      <td><button type="button" class="btn danger remove">Hapus</button></td>`;
    $("itemsBody").appendChild(tr);
    tr.querySelectorAll("input").forEach(x=>x.addEventListener("input",calculate));
    tr.querySelector(".remove").addEventListener("click",()=>{
      if($("itemsBody").children.length===1){toast("Minimal satu baris pekerjaan.");return;}
      tr.remove();renumber();calculate();
    });
    renumber();calculate();
  }
  function renumber(){[...$("itemsBody").children].forEach((tr,i)=>tr.querySelector(".index").textContent=i+1);}
  function calculate(){
    let subtotal=0;
    [...$("itemsBody").children].forEach(tr=>{
      const line=(Number(tr.querySelector(".qty").value)||0)*(Number(tr.querySelector(".price").value)||0);
      subtotal+=line;tr.querySelector(".line-total").textContent=money(line);
    });
    const discount=Math.max(0,Number($("discount").value)||0);
    const total=Math.max(0,subtotal-discount);
    const paid=Math.min(total,Math.max(0,Number($("paid").value)||0));
    const balance=Math.max(0,total-paid);
    $("subtotalText").textContent=money(subtotal);$("totalText").textContent=money(total);$("balanceText").textContent=money(balance);
    $("formStatus").textContent=statusFrom(total,paid);
    return{subtotal,discount,total,paid,balance,status:statusFrom(total,paid)};
  }
  function resetInvoice(){
    $("invoiceForm").reset();$("invoiceId").value="";$("invoiceNumber").value="";
    $("numberPreview").textContent="Otomatis setelah disimpan";$("invoiceHeading").textContent="Buat Nota Baru";
    $("workDate").value=localDate();$("workTime").value=localTime();$("discount").value=0;$("paid").value=0;
    $("itemsBody").innerHTML="";addItem();calculate();
  }
  function formData(){
    const items=[...$("itemsBody").children].map(tr=>({
      description:tr.querySelector(".desc").value.trim(),
      quantity:Number(tr.querySelector(".qty").value)||0,
      unit_price:Number(tr.querySelector(".price").value)||0
    }));
    if(items.some(x=>!x.description||x.quantity<=0)) throw new Error("Lengkapi rincian pekerjaan.");
    if(!$("customerName").value.trim()) throw new Error("Nama pelanggan wajib diisi.");
    return{
      p_invoice_id:$("invoiceId").value||null,
      p_work_date:$("workDate").value,p_work_time:$("workTime").value,
      p_customer_name:$("customerName").value.trim(),
      p_customer_phone:$("customerPhone").value.trim()||null,
      p_customer_address:$("customerAddress").value.trim()||null,
      p_discount:Math.max(0,Number($("discount").value)||0),
      p_paid:Math.max(0,Number($("paid").value)||0),
      p_notes:$("notes").value.trim()||null,p_items:items
    };
  }

  $("invoiceForm").addEventListener("submit",async e=>{e.preventDefault();await saveInvoice({});});
  $("savePrintBtn").addEventListener("click",()=>saveInvoice({printAfter:true}));
  $("saveDownloadBtn").addEventListener("click",()=>saveInvoice({downloadAfter:true}));
  $("saveWhatsappBtn").addEventListener("click",()=>saveInvoice({whatsappAfter:true}));

  async function saveInvoice({printAfter=false, downloadAfter=false, whatsappAfter=false}={}){
    let pendingWindow=null;

    if(printAfter || downloadAfter || whatsappAfter){
      pendingWindow=window.open("","_blank");
      if(pendingWindow){
        pendingWindow.document.write(
          '<!doctype html><html><head><meta charset="utf-8"><title>Memproses Nota</title></head>' +
          '<body style="font-family:Arial,sans-serif;padding:30px;text-align:center">' +
          '<h2>Memproses nota...</h2><p>Mohon tunggu sebentar.</p></body></html>'
        );
        pendingWindow.document.close();
      }
    }

    try{
      const params=formData();loading(true);
      const {data,error}=await db.rpc("save_invoice",params);
      if(error) throw error;
      await refreshAll();
      const saved=state.invoices.find(x=>x.id===data.id)||data;

      if(printAfter) printInvoice(saved,pendingWindow);
      if(downloadAfter) downloadInvoice(saved,pendingWindow);
      if(whatsappAfter) shareInvoicePdf(saved,pendingWindow);

      resetInvoice();showPage("dashboard");

      if(downloadAfter) toast("Nota disimpan dan PDF sedang diunduh.");
      else if(whatsappAfter) toast("Nota disimpan. PDF sedang disiapkan untuk dibagikan.");
      else toast("Nota berhasil disimpan.");
    }catch(error){
      if(pendingWindow && !pendingWindow.closed) pendingWindow.close();
      alert(errorMessage(error));
    }finally{
      loading(false);
    }
  }

  function editInvoice(id){
    const inv=state.invoices.find(x=>x.id===id);if(!inv)return;
    closeModal();showPage("invoice");
    $("invoiceHeading").textContent=`Edit ${inv.invoice_number}`;
    $("invoiceId").value=inv.id;$("invoiceNumber").value=inv.invoice_number;$("numberPreview").textContent=inv.invoice_number;
    $("workDate").value=inv.work_date;$("workTime").value=(inv.work_time||"").slice(0,5);
    $("customerName").value=inv.customer_name;$("customerPhone").value=inv.customer_phone||"";$("customerAddress").value=inv.customer_address||"";
    $("discount").value=inv.discount||0;$("paid").value=inv.paid||0;$("notes").value=inv.notes||"";
    $("itemsBody").innerHTML="";(inv.invoice_items||[]).sort((a,b)=>a.sort_order-b.sort_order).forEach(addItem);calculate();
  }

  $("closeModalBtn").addEventListener("click",closeModal);
  $("detailModal").addEventListener("click",e=>{if(e.target===$("detailModal"))closeModal();});
  function closeModal(){hide("detailModal");}

  function openDetail(id){
    const inv=state.invoices.find(x=>x.id===id);if(!inv)return;
    $("detailContent").innerHTML=`
      <div class="detail-grid">
        <div class="detail-box"><h4>Informasi Nota</h4>
          <div class="detail-row"><span>Nomor</span><strong>${esc(inv.invoice_number)}</strong></div>
          <div class="detail-row"><span>Tanggal</span><strong>${formatDate(inv.work_date)} ${esc((inv.work_time||"").slice(0,5))}</strong></div>
          <div class="detail-row"><span>Status</span><div>${badge(inv.status)}</div></div>
        </div>
        <div class="detail-box"><h4>Pelanggan</h4>
          <div class="detail-row"><span>Nama</span><strong>${esc(inv.customer_name)}</strong></div>
          <div class="detail-row"><span>WhatsApp</span><strong>${esc(inv.customer_phone||"-")}</strong></div>
          <div class="detail-row"><span>Alamat</span><strong>${esc(inv.customer_address||"-")}</strong></div>
        </div>
      </div>
      <div class="table-wrap"><table><thead><tr><th>No.</th><th>Keterangan</th><th>Qty</th><th>Harga</th><th>Total</th></tr></thead>
      <tbody>${(inv.invoice_items||[]).sort((a,b)=>a.sort_order-b.sort_order).map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.description)}</td><td>${x.quantity}</td><td>${money(x.unit_price)}</td><td><strong>${money(x.line_total)}</strong></td></tr>`).join("")}</tbody></table></div>
      <div class="summary-grid">
        <div class="detail-box"><h4>Catatan</h4><div style="white-space:pre-wrap">${esc(inv.notes||"-")}</div></div>
        <div class="totals">
          <div><span>Subtotal</span><strong>${money(inv.subtotal)}</strong></div><div><span>Diskon</span><strong>${money(inv.discount)}</strong></div>
          <div class="grand"><span>Total</span><strong>${money(inv.total)}</strong></div><div><span>Dibayar</span><strong>${money(inv.paid)}</strong></div>
          <div><span>Sisa</span><strong>${money(inv.balance)}</strong></div>
        </div>
      </div>
      <div class="detail-box" style="margin-top:16px"><h4>Perbarui Pembayaran</h4>
        <div class="form-grid"><div class="field"><label>Jumlah yang Sudah Dibayar</label><input id="detailPaid" type="number" min="0" max="${inv.total}" value="${inv.paid}"></div>
        <div class="field"><label>Status Otomatis</label><div id="detailStatus" class="readonly">${esc(inv.status)}</div></div></div>
        <div class="actions"><button id="savePaymentBtn" class="btn outline">Simpan Pembayaran</button><button id="savePaymentPrintBtn" class="btn success">Simpan & Cetak Ulang</button></div>
      </div>
      <div class="actions"><button id="editBtn" class="btn secondary">Edit</button><button id="printBtn" class="btn primary">Cetak Nota</button><button id="downloadBtn" class="btn outline">Download PDF</button><button id="whatsappBtn" class="btn success">Bagikan PDF + Pesan</button><button id="deleteBtn" class="btn danger">Hapus</button><button id="closeBtn" class="btn secondary">Tutup</button></div>`;
    const paidInput=$("detailPaid");
    paidInput.addEventListener("input",()=>{$("detailStatus").textContent=statusFrom(inv.total,Math.min(inv.total,Math.max(0,Number(paidInput.value)||0)));});
    $("savePaymentBtn").addEventListener("click",()=>updatePayment(inv.id,false));
    $("savePaymentPrintBtn").addEventListener("click",()=>updatePayment(inv.id,true));
    $("editBtn").addEventListener("click",()=>editInvoice(inv.id));
    $("printBtn").addEventListener("click",()=>printInvoice(inv));
    $("downloadBtn").addEventListener("click",()=>downloadInvoice(inv));
    $("whatsappBtn").addEventListener("click",()=>shareInvoicePdf(inv));
    $("deleteBtn").addEventListener("click",()=>deleteInvoice(inv.id,inv.invoice_number));
    $("closeBtn").addEventListener("click",closeModal);
    show("detailModal");
  }

  async function updatePayment(id,printAfter){
    try{
      loading(true);const paid=Math.max(0,Number($("detailPaid").value)||0);
      const {data,error}=await db.rpc("update_invoice_payment",{p_invoice_id:id,p_paid:paid});
      if(error)throw error;await refreshAll();const inv=state.invoices.find(x=>x.id===id)||data;
      closeModal();if(printAfter)printInvoice(inv);toast("Pembayaran berhasil diperbarui.");
    }catch(error){alert(errorMessage(error));}finally{loading(false);}
  }
  async function deleteInvoice(id,number){
    if(!confirm(`Hapus nota ${number}?`))return;
    loading(true);const {error}=await db.from("invoices").delete().eq("id",id);loading(false);
    if(error){alert(errorMessage(error));return;}closeModal();await refreshAll();toast("Nota dihapus.");
  }

  function renderSettings(){
    const s=state.settings||{};
    $("storeName").value=s.store_name||"LORHIL AC";$("storePhone").value=s.phone||"";$("storeAddress").value=s.address||"";
    $("paymentInfo").value=s.payment_info||"";$("footerNote").value=s.footer_note||"";$("signerName").value=s.signer_name||"Hendri";$("signerRole").value=s.signer_role||"Pemilik LORHIL AC";
  }
  $("settingsForm").addEventListener("submit",async e=>{
    e.preventDefault();loading(true);
    const payload={user_id:uid(),store_name:$("storeName").value.trim(),phone:$("storePhone").value.trim(),address:$("storeAddress").value.trim(),
      payment_info:$("paymentInfo").value.trim(),footer_note:$("footerNote").value.trim(),signer_name:$("signerName").value.trim(),signer_role:$("signerRole").value.trim()};
    const {data,error}=await db.from("store_settings").upsert(payload).select().single();loading(false);
    if(error){alert(errorMessage(error));return;}state.settings=data;applyBrand();toast("Pengaturan berhasil disimpan.");
  });

  $("downloadBackupBtn").addEventListener("click",()=>{
    const backup={app:"LORHIL AC Online",version:8,exported_at:new Date().toISOString(),invoices:state.invoices,settings:state.settings};
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`backup-lorhil-online-${localDate()}.json`;a.click();URL.revokeObjectURL(url);
  });

  function subscribeRealtime(){
    if(state.realtime) db.removeChannel(state.realtime);
    state.realtime=db.channel(`lorhil-${uid()}`)
      .on("postgres_changes",{event:"*",schema:"public",table:"invoices",filter:`user_id=eq.${uid()}`},async()=>{await refreshAll();})
      .subscribe();
  }

  function normalizeWhatsAppNumber(value){
    let number=String(value||"").replace(/\D/g,"");

    if(number.startsWith("00")) number=number.slice(2);
    if(number.startsWith("0")) number="62"+number.slice(1);
    else if(number.startsWith("8")) number="62"+number;
    else if(number.startsWith("620")) number="62"+number.slice(3);

    return number;
  }

  function buildWhatsAppMessage(inv){
    const s=state.settings||{};
    const items=(inv.invoice_items||[]).sort((a,b)=>a.sort_order-b.sort_order);

    const lines=[
      `*${s.store_name||"LORHIL AC"}*`,
      `*NOTA / INVOICE*`,
      "",
      `No. Nota: *${inv.invoice_number}*`,
      `Tanggal: ${formatDate(inv.work_date)} ${(inv.work_time||"").slice(0,5)}`,
      `Pelanggan: ${inv.customer_name}`,
      ""
    ];

    if(inv.customer_address) lines.push(`Alamat: ${inv.customer_address}`,"");

    lines.push("*Rincian Pekerjaan:*");
    items.forEach((item,index)=>{
      const lineTotal=Number(item.line_total ?? (Number(item.quantity)*Number(item.unit_price)))||0;
      lines.push(
        `${index+1}. ${item.description}`,
        `   ${item.quantity} × ${money(item.unit_price)} = *${money(lineTotal)}*`
      );
    });

    lines.push(
      "",
      `Subtotal: ${money(inv.subtotal)}`,
      `Diskon: ${money(inv.discount)}`,
      `*Total: ${money(inv.total)}*`,
      `Sudah Dibayar: ${money(inv.paid)}`,
      `*Sisa Tagihan: ${money(inv.balance)}*`,
      `Status: *${inv.status}*`
    );

    if(inv.notes) lines.push("","Catatan:",inv.notes);
    if(s.payment_info) lines.push("","Metode Pembayaran:",s.payment_info);

    lines.push("","Terima kasih telah menggunakan layanan LORHIL AC.");

    return lines.join("\n");
  }

  function sendInvoiceToWhatsApp(inv,targetWindow=null){
    let phone=normalizeWhatsAppNumber(inv.customer_phone);

    if(!phone){
      const manual=prompt(
        "Nomor WhatsApp pelanggan belum diisi. Masukkan nomor WhatsApp:",
        ""
      );
      if(!manual){
        if(targetWindow && !targetWindow.closed) targetWindow.close();
        return;
      }
      phone=normalizeWhatsAppNumber(manual);
    }

    if(phone.length<10){
      if(targetWindow && !targetWindow.closed) targetWindow.close();
      alert("Nomor WhatsApp tidak valid. Gunakan contoh 081234567890.");
      return;
    }

    const message=buildWhatsAppMessage(inv);
    const url=`https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    if(targetWindow && !targetWindow.closed){
      targetWindow.location.href=url;
      return;
    }

    const opened=window.open(url,"_blank","noopener,noreferrer");
    if(!opened) location.href=url;
  }

  function invoicePdfFilename(inv){
    const number=String(inv.invoice_number||"nota").replace(/[^a-zA-Z0-9_-]+/g,"-");
    const customer=String(inv.customer_name||"pelanggan")
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g,"-")
      .replace(/-+/g,"-")
      .replace(/^-|-$/g,"");
    return `${number}-${customer||"pelanggan"}.pdf`;
  }

  function buildInvoiceDocument(inv,mode="print"){
    const s=state.settings||{};
    const items=(inv.invoice_items||[]).sort((a,b)=>a.sort_order-b.sort_order);
    const sig=new URL("assets/signature.png",location.href).href;
    const stamp=new URL("assets/stamp.png",location.href).href;
    const pdfLibrary="https://cdn.jsdelivr.net/npm/html2pdf.js@0.14.0/dist/html2pdf.bundle.min.js";
    const due=Number(inv.balance)||0;
    const amountTitle=due>0?"SISA YANG HARUS DIBAYAR":"TOTAL NOTA";
    const amount=due>0?due:inv.total;
    const filename=invoicePdfFilename(inv);
    const shareMessage=buildWhatsAppMessage(inv);
    const shareTitle=`Nota ${inv.invoice_number} - ${s.store_name||"LORHIL AC"}`;
    const customerPhone=normalizeWhatsAppNumber(inv.customer_phone);

    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${esc(inv.invoice_number)}</title>
    <style>
      @page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;background:#e8edf2;font-family:Arial,sans-serif;color:#292e3a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      body{display:flex;justify-content:center}.sheet{width:210mm;height:296mm;background:#fff;overflow:hidden;position:relative}.fit{width:100%;min-height:296mm;transform-origin:top left}
      .accent{height:4mm;background:#acd8e2}.head{min-height:64mm;padding:9mm 12mm 7mm;background:#465f88;color:#fff;border-bottom:4mm solid #acd8e2;display:grid;grid-template-columns:1.15fr .85fr;gap:10mm}
      .brandline{display:flex;gap:4mm;align-items:center}.logo{width:20mm;height:20mm;object-fit:contain;background:#fff;border-radius:50%}.head h1{margin:0;font-size:20pt}.tag{font-size:8pt;font-weight:bold}
      .contact{margin-top:7mm;font-size:7.3pt;line-height:1.45}.title{text-align:right}.title h2{margin:0;font-size:37pt}.title strong{font-size:10pt}.meta{margin-top:8mm;font-size:8pt;line-height:1.8}
      .customer{padding:6mm 12mm 5mm;display:grid;grid-template-columns:1.15fr .85fr;gap:10mm}.customer h3{margin:0 0 2mm;font-size:9pt}.name{font-size:13pt;font-weight:bold}.details{font-size:7.5pt;line-height:1.5;margin-top:2mm}
      .amount{text-align:right}.amount strong{display:block;color:#465f88;font-size:22pt}.amount span{font-size:8pt;font-weight:bold}
      table{width:100%;border-collapse:collapse}thead{display:table-header-group}th{background:#465f88;color:#fff;padding:3mm;font-size:8pt;text-align:left}th:last-child{background:#acd8e2;color:#292e3a}
      td{padding:3.2mm;font-size:8pt}tbody tr:nth-child(even){background:#f0f2f6}.right{text-align:right}.center{text-align:center}.desc small{display:block;color:#677080;margin-top:1mm}
      .lower{padding:4mm 12mm 0;display:grid;grid-template-columns:1fr 57mm;gap:8mm;font-size:7.4pt}.pay{white-space:pre-wrap;line-height:1.45}.notes{margin-top:3mm;border-top:1px solid #ddd;padding-top:2mm;white-space:pre-wrap}
      .totals{background:#465f88;color:#fff}.row{display:flex;justify-content:space-between;padding:2.4mm 3.5mm;border-bottom:1px solid rgba(255,255,255,.45)}.row.grand{font-size:10pt;font-weight:bold}
      .sign{height:45mm;padding:2mm 12mm 7mm;display:grid;grid-template-columns:1fr 1fr;align-items:end}.signbox{position:relative;height:37mm}.sig{position:absolute;left:0;bottom:9mm;width:48mm;max-height:23mm;object-fit:contain}.stamp{position:absolute;left:37mm;bottom:2mm;width:31mm;height:31mm;object-fit:contain;opacity:.82;transform:rotate(-7deg)}
      .line{position:absolute;left:0;bottom:0;width:52mm;border-top:1px solid #333;padding-top:1.5mm;font-size:8pt}.thanks{text-align:right;font-weight:bold;font-size:12pt}.footer{position:absolute;bottom:0;left:0;right:0;height:7mm;background:#465f88}
      .buttons{position:fixed;right:15px;top:15px;z-index:5;display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.buttons button{border:0;border-radius:8px;background:#354c72;color:#fff;padding:10px;font-weight:bold;cursor:pointer}
      .buttons .download{background:#0b78a5}.buttons .share{background:#198754}.buttons button:disabled{opacity:.55;cursor:not-allowed}
      .download-status{position:fixed;left:15px;top:15px;z-index:5;background:#fff;border-radius:8px;padding:10px 13px;font-size:13px;box-shadow:0 4px 15px rgba(0,0,0,.15);max-width:310px;line-height:1.4}
      @media print{html,body{background:#fff}.buttons,.download-status{display:none}.sheet{box-shadow:none}}
    </style>
    <script src="${pdfLibrary}"><\/script></head><body>
    <div id="downloadStatus" class="download-status" style="display:none">Membuat file PDF...</div>
    <div class="buttons">
      <button onclick="window.print()">Cetak / PDF</button>
      <button class="download" onclick="downloadPdf()">Download PDF</button>
      <button id="sharePdfBtn" class="share" onclick="sharePdf()" disabled>Bagikan PDF + Pesan</button>
      <button onclick="copyShareMessage()">Salin Pesan</button>
      <button onclick="window.close()">Tutup</button>
    </div>
    <article class="sheet"><div class="fit"><div class="accent"></div><header class="head"><div><div class="brandline"><img class="logo" src="${stamp}"><div><h1>${esc(s.store_name||"LORHIL AC")}</h1><div class="tag">SPECIALIST AIR CONDITIONER</div></div></div>
    <div class="contact"><strong>RINCIAN KONTAK</strong><br>WhatsApp: ${esc(s.phone||"-")}<br>Alamat: ${esc(s.address||"-")}<br>Layanan: AC Baru, AC Second & Jasa Servis</div></div>
    <div class="title"><h2>INVOICE</h2><strong>NO: ${esc(inv.invoice_number)}</strong><div class="meta">Tanggal: ${formatDate(inv.work_date)} • ${esc((inv.work_time||"").slice(0,5))}<br>Status: <strong>${esc(inv.status)}</strong></div></div></header>
    <section class="customer"><div><h3>KEPADA:</h3><div class="name">${esc(inv.customer_name)}</div><div class="details">${esc(inv.customer_address||"-")}<br>${esc(inv.customer_phone||"-")}</div></div>
    <div class="amount"><span>${amountTitle}</span><strong>${money(amount)}</strong><div class="details">Total ${money(inv.total)} • Dibayar ${money(inv.paid)}</div></div></section>
    <table><thead><tr><th style="width:10mm">No.</th><th>Keterangan</th><th class="right">Harga Unit</th><th class="center">Qty</th><th class="right">Total</th></tr></thead><tbody>
    ${items.map((x,i)=>`<tr><td class="center">${i+1}</td><td class="desc"><strong>${esc(x.description)}</strong><small>Pekerjaan / produk LORHIL AC</small></td><td class="right">${money(x.unit_price)}</td><td class="center">${x.quantity}</td><td class="right"><strong>${money(x.line_total)}</strong></td></tr>`).join("")}
    </tbody></table><section class="lower"><div><strong>Metode Pembayaran</strong><div class="pay">${esc(s.payment_info||"Tunai / Transfer")}</div><div class="notes"><strong>Catatan</strong><br>${esc(inv.notes||s.footer_note||"-")}</div></div>
    <div class="totals"><div class="row"><span>Subtotal</span><strong>${money(inv.subtotal)}</strong></div><div class="row"><span>Diskon</span><strong>${money(inv.discount)}</strong></div><div class="row"><span>Dibayar</span><strong>${money(inv.paid)}</strong></div><div class="row"><span>Sisa</span><strong>${money(inv.balance)}</strong></div><div class="row grand"><span>Total</span><strong>${money(inv.total)}</strong></div></div></section>
    <section class="sign"><div class="signbox"><span style="font-size:8pt">Hormat kami,</span><img class="sig" src="${sig}"><img class="stamp" src="${stamp}"><div class="line"><strong>${esc(s.signer_name||"Hendri")}</strong><br>${esc(s.signer_role||"Pemilik LORHIL AC")}</div></div>
    <div><div class="thanks">TERIMA KASIH</div><div style="text-align:right;font-size:7.5pt;font-style:italic">${esc(s.footer_note||"Terima kasih telah menggunakan layanan LORHIL AC.")}</div></div></section><div class="footer"></div></div></article>
    <script>
      const START_MODE=${JSON.stringify(mode)};
      const PDF_FILENAME=${JSON.stringify(filename)};
      const SHARE_TITLE=${JSON.stringify(shareTitle)};
      const SHARE_MESSAGE=${JSON.stringify(shareMessage)};
      const CUSTOMER_PHONE=${JSON.stringify(customerPhone)};
      let preparedPdfFile=null;

      function fit(){
        const page=document.querySelector(".sheet");
        const content=document.querySelector(".fit");
        content.style.transform="none";
        content.style.width="100%";
        const scale=Math.min(1,page.clientHeight/content.scrollHeight);
        if(scale<1){
          content.style.transform="scale("+scale+")";
          content.style.width=(100/scale)+"%";
        }
      }

      async function waitForImages(){
        try{
          await Promise.all([...document.images].map(img=>
            img.decode ? img.decode().catch(()=>{}) : Promise.resolve()
          ));
        }catch(error){}
      }

      function pdfOptions(){
        return {
          margin:0,
          filename:PDF_FILENAME,
          image:{type:"jpeg",quality:0.98},
          html2canvas:{
            scale:2,
            useCORS:true,
            allowTaint:false,
            backgroundColor:"#ffffff",
            logging:false
          },
          jsPDF:{
            unit:"mm",
            format:"a4",
            orientation:"portrait",
            compress:true
          },
          pagebreak:{mode:[]}
        };
      }

      async function createPdfBlob(){
        if(typeof html2pdf!=="function"){
          throw new Error("Komponen PDF belum selesai dimuat.");
        }

        fit();
        return html2pdf()
          .set(pdfOptions())
          .from(document.querySelector(".sheet"))
          .toPdf()
          .outputPdf("blob");
      }

      async function prepareShareFile(){
        const status=document.getElementById("downloadStatus");
        const shareButton=document.getElementById("sharePdfBtn");

        status.style.display="block";
        status.textContent="Mempersiapkan PDF. Setelah siap, tekan Bagikan PDF + Pesan.";

        try{
          const blob=await createPdfBlob();
          preparedPdfFile=new File([blob],PDF_FILENAME,{type:"application/pdf"});
          shareButton.disabled=false;
          status.textContent="PDF siap. Tekan Bagikan PDF + Pesan, pilih WhatsApp, lalu pilih chat pelanggan.";
        }catch(error){
          console.error(error);
          status.textContent="PDF belum berhasil disiapkan. Gunakan Download PDF sebagai alternatif.";
        }
      }

      async function downloadPdf(){
        const status=document.getElementById("downloadStatus");
        status.style.display="block";
        status.textContent="Membuat file PDF...";

        try{
          await html2pdf()
            .set(pdfOptions())
            .from(document.querySelector(".sheet"))
            .save();
        }catch(error){
          console.error(error);
          alert("PDF belum berhasil dibuat. Silakan gunakan tombol Cetak / PDF sebagai alternatif.");
        }finally{
          if(START_MODE!=="share") status.style.display="none";
        }
      }

      async function copyShareMessage(){
        try{
          await navigator.clipboard.writeText(SHARE_MESSAGE);
          alert("Pesan nota berhasil disalin.");
        }catch(error){
          window.prompt("Salin pesan berikut:",SHARE_MESSAGE);
        }
      }

      async function sharePdf(){
        if(!preparedPdfFile){
          alert("PDF masih dipersiapkan. Tunggu sampai tombol aktif.");
          return;
        }

        const shareData={
          title:SHARE_TITLE,
          text:SHARE_MESSAGE,
          files:[preparedPdfFile]
        };

        try{
          if(!navigator.share || (navigator.canShare && !navigator.canShare({files:[preparedPdfFile]}))){
            throw new Error("Perangkat tidak mendukung berbagi file dari browser.");
          }

          await navigator.share(shareData);
        }catch(error){
          if(error && error.name==="AbortError") return;

          alert(
            "Browser ini belum mendukung berbagi PDF langsung. " +
            "PDF akan diunduh dan pesan akan disalin. Setelah itu buka WhatsApp dan lampirkan PDF."
          );

          await downloadPdf();
          await copyShareMessage();

          if(CUSTOMER_PHONE){
            window.open(
              "https://wa.me/"+CUSTOMER_PHONE+"?text="+encodeURIComponent(SHARE_MESSAGE),
              "_blank"
            );
          }
        }
      }

      window.onload=async()=>{
        await waitForImages();
        fit();

        setTimeout(async()=>{
          fit();
          if(START_MODE==="download") await downloadPdf();
          else if(START_MODE==="print") window.print();
          else if(START_MODE==="share") await prepareShareFile();
        },750);
      };
    <\/script></body></html>`;
  }

  function openInvoiceDocument(inv,mode="print",targetWindow=null){
    const popup=(targetWindow && !targetWindow.closed)
      ? targetWindow
      : window.open("","_blank","width=1000,height=800");

    if(!popup){
      alert(mode==="download"
        ? "Izinkan popup agar nota dapat diunduh."
        : "Izinkan popup untuk mencetak nota.");
      return;
    }

    popup.document.open();
    popup.document.write(buildInvoiceDocument(inv,mode));
    popup.document.close();
  }

  function printInvoice(inv,targetWindow=null){
    openInvoiceDocument(inv,"print",targetWindow);
  }

  function downloadInvoice(inv,targetWindow=null){
    openInvoiceDocument(inv,"download",targetWindow);
  }

  function shareInvoicePdf(inv,targetWindow=null){
    openInvoiceDocument(inv,"share",targetWindow);
  }

  init();
})();

