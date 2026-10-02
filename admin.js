const esc=(value)=>String(value??'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const fmtDate=(value)=>value?new Date(value).toLocaleString('ar-SA',{dateStyle:'medium',timeStyle:'short'}):'—';
const contractStatuses=['جديد','قيد المراجعة','قيد التنفيذ','مكتمل','ملغى'];
const digitalStatuses=['pending_payment','paid','قيد التنفيذ','مكتمل','ملغى'];
const digitalLabels={pending_payment:'بانتظار الدفع',paid:'تم الدفع','قيد التنفيذ':'قيد التنفيذ','مكتمل':'مكتمل','ملغى':'ملغى'};
const state={customers:[],leads:[],siteOrders:[],contracts:[],digitalOrders:[],notifications:[],whatsappEvents:[],health:{}};
let adminToken=sessionStorage.getItem('intlaqahAdminToken')||'';

const login=document.getElementById('adminLogin');
const dashboard=document.getElementById('dashboard');
const loginForm=document.getElementById('adminLoginForm');
const tokenInput=document.getElementById('adminTokenInput');
const loginMessage=document.getElementById('loginMessage');

function headers(json=false){return {...(json?{'Content-Type':'application/json'}:{}),'x-admin-token':adminToken};}
async function fetchJson(url,options={}){
  const response=await fetch(url,{...options,headers:{...headers(Boolean(options.body)),...(options.headers||{})}});
  const data=await response.json().catch(()=>({}));
  if(response.status===401) throw new Error('unauthorized');
  if(!response.ok) throw new Error(data.message||'تعذر تنفيذ الطلب');
  return data;
}
function setLoginMessage(message,error=true){loginMessage.textContent=message;loginMessage.className=error?'admin-error':'admin-success';}
async function validateAndEnter(){
  await fetchJson('/api/customers');
  sessionStorage.setItem('intlaqahAdminToken',adminToken);
  login.hidden=true; dashboard.hidden=false;
  await loadDashboard();
}
loginForm.addEventListener('submit',async(event)=>{
  event.preventDefault(); adminToken=tokenInput.value.trim();
  if(!adminToken) return;
  setLoginMessage('جارٍ التحقق...',false);
  try{await validateAndEnter();setLoginMessage('',false);}
  catch(error){setLoginMessage(error.message==='unauthorized'?'رمز الإدارة غير صحيح.':'تعذر الاتصال بالخادم.');}
});
document.getElementById('logoutAdmin').addEventListener('click',()=>{
  sessionStorage.removeItem('intlaqahAdminToken');adminToken='';dashboard.hidden=true;login.hidden=false;tokenInput.value='';tokenInput.focus();
});

function statusSelect(id,status,type){
  const list=type==='digital'?digitalStatuses:contractStatuses;
  const label=(value)=>type==='digital'?(digitalLabels[value]||value):value;
  return `<select class="status-select" data-id="${esc(id)}" data-type="${type}">${list.map(item=>`<option value="${esc(item)}" ${item===status?'selected':''}>${esc(label(item))}</option>`).join('')}</select>`;
}
function rowsOrEmpty(rows,colspan){return rows.length?rows:`<tr><td colspan="${colspan}" class="admin-empty">لا توجد بيانات حتى الآن.</td></tr>`;}

function render(){
  const unread=state.notifications.filter(item=>!item.read);
  const active=[...state.contracts,...state.siteOrders].filter(item=>item.status==='قيد التنفيذ').length+
    state.digitalOrders.filter(item=>item.status==='قيد التنفيذ').length;
  const complete=[...state.contracts,...state.siteOrders].filter(item=>item.status==='مكتمل').length+
    state.digitalOrders.filter(item=>item.status==='مكتمل').length;

  const counts={
    navNotifications:unread.length,navCustomers:state.customers.length,navLeads:state.leads.length,
    navSiteOrders:state.siteOrders.length,navContracts:state.contracts.length,
    navDigitalOrders:state.digitalOrders.length,navWhatsapp:state.whatsappEvents.length,
    pendingReviewCount:state.contracts.filter(item=>item.status==='قيد المراجعة').length,
    customerCount:state.customers.length,contractCount:state.contracts.length,
    siteOrderCount:state.siteOrders.length,digitalOrderCount:state.digitalOrders.length,
    activeCount:active,completedCount:complete
  };
  Object.entries(counts).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.textContent=value;});

  document.getElementById('customersTable').innerHTML=rowsOrEmpty(state.customers.map(item=>`<tr><td dir="ltr">${esc(item.customerCode)}</td><td>${esc(item.name)}</td><td dir="ltr">${esc(item.phone)}</td><td><span class="status-pill">${esc(item.status||'مسجل')}</span></td><td>${fmtDate(item.createdAt)}</td></tr>`).join(''),5);
  document.getElementById('leadsTable').innerHTML=rowsOrEmpty(state.leads.map(item=>`<tr><td>${esc(item.name)}</td><td dir="ltr">${esc(item.contact)}</td><td><span class="status-pill">${esc(item.status||'جديد')}</span></td><td>${fmtDate(item.createdAt)}</td></tr>`).join(''),4);
  document.getElementById('siteOrdersTable').innerHTML=rowsOrEmpty(state.siteOrders.map(item=>`<tr><td dir="ltr">${esc(item.orderCode)}</td><td>${esc(item.name)}<br><small dir="ltr">${esc(item.customerCode||'')}</small></td><td>${esc(item.projectTitle||item.projectType)}</td><td>${esc(item.startingPrice||'—')}</td><td>${statusSelect(item.id,item.status||'جديد','site')}</td><td>${fmtDate(item.createdAt)}</td></tr>`).join(''),6);
  document.getElementById('contractsTable').innerHTML=rowsOrEmpty(state.contracts.map(item=>`<tr><td dir="ltr">${esc(item.trackingCode)}</td><td>${esc(item.clientName)}<br><small dir="ltr">${esc(item.customerPhone||'')}</small></td><td>${esc(item.service||'—')}</td><td>${esc(item.price||'—')}</td><td>${statusSelect(item.id,item.status||'قيد المراجعة','contract')}</td><td>${fmtDate(item.createdAt)}</td></tr>`).join(''),6);
  document.getElementById('digitalOrdersTable').innerHTML=rowsOrEmpty(state.digitalOrders.map(item=>`<tr><td dir="ltr">${esc(item.orderCode)}</td><td>${esc(item.name)}<br><small dir="ltr">${esc(item.phone||'')}</small></td><td>${esc(item.productTitle)}</td><td>${esc(item.amount)} ${esc(item.currency||'SAR')}</td><td>${statusSelect(item.id,item.status||'pending_payment','digital')}</td><td>${fmtDate(item.createdAt)}</td></tr>`).join(''),6);

  document.getElementById('notificationsList').innerHTML=state.notifications.length?state.notifications.map(item=>`<article class="notification-item ${item.read?'':'unread'}"><strong>${esc(item.title||'تنبيه')}</strong><p>${esc(item.message||'')}</p><small>${esc(item.orderCode||'')} · ${fmtDate(item.createdAt)}</small><div class="notification-actions">${item.read?'':`<button type="button" data-read-notification="${esc(item.id)}">تمت المشاهدة</button>`}${item.type==='contract_review'?'<button type="button" data-open-contracts>فتح العقود</button>':''}</div></article>`).join(''):'<p class="admin-empty">لا توجد طلبات تنتظر المراجعة.</p>';

  const activity=[
    ...state.contracts.map(item=>({title:`عقد · ${item.clientName}`,code:item.trackingCode,status:item.status,date:item.createdAt})),
    ...state.siteOrders.map(item=>({title:`موقع · ${item.name}`,code:item.orderCode,status:item.status,date:item.createdAt})),
    ...state.digitalOrders.map(item=>({title:`منتج رقمي · ${item.name}`,code:item.orderCode,status:digitalLabels[item.status]||item.status,date:item.createdAt}))
  ].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8);
  document.getElementById('recentActivity').innerHTML=activity.length?activity.map(item=>`<div class="activity-item"><strong>${esc(item.title)}</strong><div>${esc(item.code||'')} · <span class="status-pill">${esc(item.status||'—')}</span></div><small>${fmtDate(item.date)}</small></div>`).join(''):'<p class="admin-empty">لا يوجد نشاط بعد.</p>';

  document.getElementById('whatsappEvents').innerHTML=state.whatsappEvents.length?state.whatsappEvents.map(item=>`<div class="activity-item"><strong>${esc(item.kind==='message'?'رسالة واردة':'حالة رسالة')}</strong><div>${esc(item.from||item.recipient||'—')} · ${esc(item.text||item.status||item.type||'—')}</div><small>${fmtDate(item.createdAt)}</small></div>`).join(''):'<p class="admin-empty">لا توجد أحداث واتساب مسجلة بعد.</p>';

  renderHealth();
  bindDynamic();
}

function healthText(id,ready,on='مفعّل',off='غير مفعّل'){
  const el=document.getElementById(id);el.textContent=ready?on:off;el.className=ready?'ready':'off';
}
function renderHealth(){
  healthText('healthApi',state.health.ok===true,'متصل','غير متصل');
  healthText('healthAi',state.health.aiConfigured===true);
  healthText('healthWhatsapp',state.health.whatsappConfigured===true);
  healthText('healthTemplate',state.health.whatsappTemplateConfigured===true);
  healthText('healthAdminWa',state.health.whatsappAdminNotificationConfigured===true);
}

async function loadDashboard(){
  const results=await Promise.all([
    fetchJson('/api/customers'),fetchJson('/api/leads'),fetchJson('/api/site-orders'),
    fetchJson('/api/contracts'),fetchJson('/api/digital-orders'),fetchJson('/api/admin-notifications'),
    fetchJson('/api/whatsapp-events'),fetch('/api/health').then(r=>r.json())
  ]);
  [state.customers,state.leads,state.siteOrders,state.contracts,state.digitalOrders,state.notifications,state.whatsappEvents,state.health]=results;
  document.getElementById('lastUpdated').textContent='آخر تحديث: '+new Date().toLocaleTimeString('ar-SA');
  render();
}

async function updateStatus(select){
  const id=select.dataset.id,type=select.dataset.type;
  const endpoint=type==='contract'?'/api/contracts/':type==='site'?'/api/site-orders/':'/api/digital-orders/';
  select.disabled=true;
  try{await fetchJson(endpoint+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({status:select.value})});await loadDashboard();}
  catch(error){alert(error.message);select.disabled=false;}
}
function bindDynamic(){
  document.querySelectorAll('.status-select').forEach(el=>el.onchange=()=>updateStatus(el));
  document.querySelectorAll('[data-read-notification]').forEach(button=>button.onclick=async()=>{
    button.disabled=true;try{await fetchJson('/api/admin-notifications/'+encodeURIComponent(button.dataset.readNotification),{method:'PATCH',body:JSON.stringify({read:true})});await loadDashboard();}catch(error){alert(error.message);}
  });
  document.querySelectorAll('[data-open-contracts]').forEach(button=>button.onclick=()=>showTab('contracts'));
}

function showTab(tab){
  document.querySelectorAll('.admin-panel').forEach(panel=>panel.classList.toggle('active',panel.dataset.panel===tab));
  document.querySelectorAll('.admin-nav').forEach(button=>button.classList.toggle('active',button.dataset.tab===tab));
  document.getElementById('mobileTabSelect').value=tab;
}
document.querySelectorAll('.admin-nav').forEach(button=>button.addEventListener('click',()=>showTab(button.dataset.tab)));
document.getElementById('mobileTabSelect').addEventListener('change',event=>showTab(event.target.value));
document.getElementById('refreshDashboard').addEventListener('click',()=>loadDashboard().catch(handleLoadError));

document.querySelectorAll('.admin-search').forEach(input=>input.addEventListener('input',()=>{
  const query=input.value.trim().toLowerCase(),tbody=document.getElementById(input.dataset.target);
  tbody.querySelectorAll('tr').forEach(row=>row.hidden=Boolean(query)&&!row.textContent.toLowerCase().includes(query));
}));

function csvEscape(value){return '"'+String(value??'').replaceAll('"','""')+'"';}
function downloadCsv(name,headers,rows){
  const csv=[headers.map(csvEscape).join(','),...rows.map(row=>row.map(csvEscape).join(','))].join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=name;link.click();URL.revokeObjectURL(link.href);
}
document.querySelectorAll('[data-export]').forEach(button=>button.addEventListener('click',()=>{
  const key=button.dataset.export;
  if(key==='customers')downloadCsv('intlaqah-customers.csv',['رقم العميل','الاسم','الجوال','الحالة','التاريخ'],state.customers.map(i=>[i.customerCode,i.name,i.phone,i.status,i.createdAt]));
  if(key==='leads')downloadCsv('intlaqah-leads.csv',['الاسم','التواصل','الحالة','التاريخ'],state.leads.map(i=>[i.name,i.contact,i.status,i.createdAt]));
  if(key==='siteOrders')downloadCsv('intlaqah-site-orders.csv',['رقم الطلب','العميل','المشروع','السعر','الحالة','التاريخ'],state.siteOrders.map(i=>[i.orderCode,i.name,i.projectTitle,i.startingPrice,i.status,i.createdAt]));
  if(key==='contracts')downloadCsv('intlaqah-contracts.csv',['رقم التتبع','العميل','الجوال','الخدمة','القيمة','الحالة','التاريخ'],state.contracts.map(i=>[i.trackingCode,i.clientName,i.customerPhone,i.service,i.price,i.status,i.createdAt]));
  if(key==='digitalOrders')downloadCsv('intlaqah-digital-orders.csv',['رقم الطلب','العميل','الجوال','المنتج','القيمة','الحالة','التاريخ'],state.digitalOrders.map(i=>[i.orderCode,i.name,i.phone,i.productTitle,i.amount,i.status,i.createdAt]));
}));

function handleLoadError(error){
  if(error.message==='unauthorized'){
    sessionStorage.removeItem('intlaqahAdminToken');adminToken='';dashboard.hidden=true;login.hidden=false;setLoginMessage('انتهت صلاحية رمز الإدارة أو أنه غير صحيح.');
  }else{alert('تعذر تحميل لوحة التحكم: '+error.message);}
}
if(adminToken){validateAndEnter().catch(handleLoadError);}else{login.hidden=false;}
