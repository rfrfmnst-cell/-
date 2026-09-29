const siteHeader = document.getElementById('siteHeader');
const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');

if (siteHeader) {
  const updateHeader = () => siteHeader.classList.toggle('is-scrolled', window.scrollY > 12);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });
}

if (menuToggle && mainNav) {
  const closeMenu = () => {
    mainNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  };
  menuToggle.addEventListener('click', () => {
    const open = !mainNav.classList.contains('open');
    mainNav.classList.toggle('open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
  });
  mainNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('click', (event) => {
    if (!mainNav.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
  });
}

const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

function addMessage(text, type) {
  const message = document.createElement('div');
  message.className = `message ${type}`;
  message.textContent = text;
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function assistantReply(question) {
  const text = question.toLowerCase();
  if (text.includes('ذكاء') || text.includes('موظف') || text.includes('أتمتة')) return 'نربط الذكاء الاصطناعي بموقعك أو نظامك ليعمل كموظف رقمي في خدمة العملاء، المحتوى، التحليل، التقارير والأتمتة. السعر يحدد بعد معرفة الأنظمة والمهام المطلوب ربطها.';
  if (text.includes('خصم')) return 'نحدد العروض حسب الخدمة ومرحلة المشروع. اشرح لي احتياجك وسأرشح لك البداية الأقل تكلفة المناسبة.';
  if (text.includes('تطبيق')) return 'اقتراحنا: ابدأ بنسخة أولية مركزة لاختبار السوق، ثم طوّرها تدريجيًا. إنشاء التطبيق يبدأ من 18,000 ر.س.';
  if (text.includes('متجر') || text.includes('دروب')) return 'يمكن البدء بمتجر مبسط، ثم ربط المنتجات والموردين تدريجيًا. إنشاء متجر مبسط يبدأ من 399 ر.س، وربط الدروب شوبنج يبدأ من 3,500 ر.س.';
  if (text.includes('سعر') || text.includes('أسعار') || text.includes('تكلفة')) return 'تختلف التكلفة حسب نطاق العمل. لدينا خدمات صغيرة تبدأ من 99 ر.س للاستشارة، مع خدمات مواقع وتطبيقات وأنظمة تُسعّر حسب المتطلبات.';
  if (text.includes('موقع')) return 'إنشاء المواقع الإلكترونية يبدأ من 4,500 ر.س، ويشمل تصميمًا متجاوبًا مناسبًا للجوال والكمبيوتر.';
  return 'يسعدني مساعدتك. اكتب نوع مشروعك أو ما تحتاجه: موقع، متجر، تطبيق، تسويق، أو ربط ذكاء اصطناعي.';
}

async function getAssistantReply(question) {
  try {
    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question })
    });
    if (!response.ok) throw new Error('assistant unavailable');
    const data = await response.json();
    if (data.reply) return data.reply;
  } catch {}
  return assistantReply(question);
}

async function sendQuestion(question) {
  const cleanQuestion = question.trim();
  if (!cleanQuestion) return;
  addMessage(cleanQuestion, 'user');
  const typing = document.createElement('div');
  typing.className = 'message bot typing-message';
  typing.textContent = 'جاري إعداد الرد...';
  chatMessages.appendChild(typing);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  const reply = await getAssistantReply(cleanQuestion);
  typing.remove();
  addMessage(reply, 'bot');
}

if (chatForm && chatInput && chatMessages) {
  chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = chatForm.querySelector('button[type="submit"]');
    if (submit.disabled) return;
    submit.disabled = true;
    const question = chatInput.value;
    chatInput.value = '';
    await sendQuestion(question);
    submit.disabled = false;
    chatInput.focus();
  });
}

document.querySelectorAll('[data-question]').forEach((button) => {
  button.addEventListener('click', () => sendQuestion(button.dataset.question));
});

const leadForm = document.getElementById('leadForm');
if (leadForm) leadForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const lead = { name: document.getElementById('leadName').value.trim(), contact: document.getElementById('leadContact').value.trim() };
  fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) })
    .then((response) => { if (!response.ok) throw new Error('save failed'); return response.json(); })
    .then(() => { document.getElementById('leadStatus').textContent = 'تم حفظ بياناتك بنجاح، وسنتواصل معك قريبًا.'; leadForm.reset(); })
    .catch(() => { document.getElementById('leadStatus').textContent = 'شغّل الموقع عبر الخادم المحلي لحفظ البيانات بأمان أكبر.'; });
});

const serviceDetails = [
  { title: 'التخطيط والاستشارات', price: '750 ر.س', image: 'service-strategy.jpg', description: 'جلسة عملية لفهم فكرتك وتحويلها إلى خطة واضحة قابلة للتنفيذ، مع تحديد الجمهور والأهداف والأولويات.', points: ['تحليل الفكرة والسوق المستهدف', 'تحديد نطاق المشروع والجدول الأولي', 'خارطة طريق للخطوات القادمة'] },
  { title: 'الهوية والمحتوى', price: '2,500 ر.س', image: 'service-identity.jpg', description: 'نصمم حضورًا بصريًا ومحتوى موحدًا يساعد مشروعك على الظهور بصورة احترافية في كل المنصات.', points: ['ألوان وخطوط وهوية بصرية', 'نماذج محتوى أساسية', 'صياغة الرسائل التعريفية للمشروع'] },
  { title: 'إنشاء المواقع الإلكترونية', price: '4,500 ر.س / يبدأ من', image: 'service-website.jpg', description: 'إنشاء موقع احترافي سريع ومتجاوب يعرض خدماتك ويمنح العملاء طريقة سهلة للتواصل والطلب.', points: ['تصميم متجاوب للجوال والكمبيوتر', 'صفحات رئيسية للخدمات والتواصل', 'تهيئة أساسية لمحركات البحث'] },
  { title: 'إنشاء التطبيقات', price: '18,000 ر.س / يبدأ من', image: 'service-apps.jpg', description: 'تطوير تطبيق جوال مخصص يحوّل فكرتك إلى تجربة سهلة للمستخدم وقابلة للنمو.', points: ['تحليل تجربة المستخدم والواجهات', 'تطوير الخصائص الأساسية', 'اختبار التطبيق وتجهيزه للنشر'] },
  { title: 'رفع التطبيقات', price: '2,500 ر.س / لا تشمل رسوم المتاجر', image: 'service-app-upload.jpg', description: 'تجهيز ملفات التطبيق ورفعها على متاجر Apple App Store وGoogle Play ومتابعة متطلبات النشر.', points: ['مراجعة متطلبات المتاجر', 'إعداد بيانات التطبيق والصور', 'متابعة حالة المراجعة والنشر'] },
  { title: 'البرمجة وتطوير الأنظمة', price: '8,000 ر.س / يبدأ من', image: 'service-programming.jpg', description: 'برمجة خصائص وأنظمة مخصصة تربط عملياتك الداخلية بخدماتك الرقمية بطريقة منظمة.', points: ['لوحات تحكم وإدارة بيانات', 'ربط APIs وخدمات خارجية', 'حلول مخصصة حسب احتياج العمل'] },
  { title: 'الموظف الرقمي بالذكاء الاصطناعي', price: 'حسب نطاق الربط', image: 'service-digital-advice.jpg', description: 'نربط الذكاء الاصطناعي بموقعك أو نظامك ليعمل كموظف رقمي ينفذ مهام متكررة ويتفاعل مع العملاء والبيانات وفق صلاحيات واضحة.', points: ['خدمة العملاء والرد على الأسئلة', 'إنشاء المحتوى والتحليل والتقارير', 'ربط الأنظمة وتنفيذ الأتمتة والمهام'] },
  { title: 'التسويق الرقمي', price: '3,000 ر.س / شهريًا', image: 'service-content.jpg', description: 'خطة تسويق رقمية متكاملة لزيادة الوصول وبناء حضور مستمر وتحويل الاهتمام إلى عملاء.', points: ['خطة محتوى شهرية', 'إدارة الحملات والإعلانات', 'تقارير متابعة وتحسين مستمر'] },
  { title: 'التسويق بالعمولة', price: '10%–20% / من المبيعات', image: 'service-digital-consulting.jpg', description: 'تنظيم برنامج تسويق بالعمولة يساعدك على توسيع شبكة المسوقين وربط النتائج بالمبيعات الفعلية.', points: ['تجهيز آلية الإحالة والتتبع', 'إدارة المسوقين والعمولات', 'متابعة الطلبات والنتائج'] },
  { title: 'ربط المنتجات بالدروب شوبنج', price: '3,500 ر.س / يبدأ من', image: 'service-dropshipping.jpg', description: 'ربط متجرك بالموردين ومنصات الدروب شوبنج لتسهيل تحديث المنتجات والطلبات والشحن.', points: ['استيراد وتحديث بيانات المنتجات', 'مزامنة الطلبات والمخزون', 'تنظيم حالات الشحن والمتابعة'] },
  { title: 'استشر مختص', price: '99 ر.س', image: 'service-consultation.jpg', description: 'جلسة استشارية مركزة تساعدك على فهم احتياجك واختيار الحل الرقمي الأنسب قبل بدء التنفيذ.', points: ['مراجعة الفكرة والهدف', 'اقتراح خطوات عملية واضحة', 'توصية بالخدمة أو الباقة المناسبة'] },
  { title: 'إنشاء متجر إلكتروني', price: '399 ر.س', image: 'service-store.jpg', description: 'إنشاء متجر إلكتروني مبسط لعرض المنتجات وتهيئة تجربة أولية لاستقبال الطلبات.', points: ['إعداد واجهة المتجر الأساسية', 'إضافة المنتجات والتصنيفات', 'تهيئة وسائل التواصل والطلب'] },
  { title: 'تحسين محركات البحث SEO', price: '299 ر.س', image: 'service-planning.jpg', description: 'تحسينات أساسية تساعد محركات البحث على فهم صفحاتك وتزيد فرص ظهورها أمام العملاء.', points: ['تحسين العناوين والوصف', 'مراجعة الكلمات المفتاحية الأساسية', 'تحسين بنية المحتوى والروابط'] },
  { title: 'تسويق تيك توك وسناب شات', price: '499 ر.س', image: 'service-content.jpg', description: 'تجهيز حملة تسويق أولية موجهة لجمهور تيك توك وسناب شات مع محتوى مناسب للمنصتين.', points: ['تحديد الجمهور والرسالة', 'اقتراح أفكار محتوى وإعلانات', 'خطة نشر وحملة أولية'] },
  { title: 'تسويق وحسابات التواصل الاجتماعي', price: '699 ر.س', image: 'service-content.jpg', description: 'إنشاء وتجهيز حسابات التواصل الاجتماعي مع خطة تسويق أولية وهوية موحدة تساعد مشروعك على الظهور باحترافية.', points: ['إنشاء وتجهيز الحسابات', 'توحيد الوصف والصور والروابط', 'خطة محتوى وتسويق ابتدائية'] },
  { title: 'ربط بوابات الدفع الإلكتروني عبر مبسط', price: '499 ر.س / يبدأ من', image: 'payment-gateway.svg', description: 'نجهز ربط قنوات الدفع الإلكتروني لموقعك أو متجرك عبر مبسط، ثم نختبر رحلة الدفع ونتأكد من جاهزية الربط قبل التسليم.', points: ['ربط قناة دفع واحدة في الباقة الأساسية', 'اختبار نجاح وفشل عملية الدفع', 'تهيئة الإشعارات والعودة للموقع حسب نطاق الربط', 'باقة احترافية 899 ر.س للربط الأوسع والاختبارات المتقدمة'] }
];

const modal = document.getElementById('serviceModal');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDescription = document.getElementById('modalDescription');
const modalPoints = document.getElementById('modalPoints');
const modalPrice = document.getElementById('modalPrice');
const serviceRequestLink = document.getElementById('serviceRequestLink');

function openService(index) {
  const service = serviceDetails[index];
  modalImage.src = service.image;
  modalImage.alt = service.title;
  modalTitle.textContent = service.title;
  modalDescription.textContent = service.description;
  modalPrice.textContent = service.price;
  if (index === 10) {
    serviceRequestLink.href = 'https://wa.me/966553575760?text=أرغب%20في%20حجز%20خدمة%20استشر%20مختص';
    serviceRequestLink.target = '_blank';
    serviceRequestLink.rel = 'noopener';
    serviceRequestLink.textContent = 'احجز الاستشارة';
  } else {
    serviceRequestLink.href = `contract.html?service=${encodeURIComponent(service.title)}`;
    serviceRequestLink.removeAttribute('target');
    serviceRequestLink.removeAttribute('rel');
    serviceRequestLink.textContent = 'اطلب هذه الخدمة';
  }
  modalPoints.innerHTML = service.points.map((point) => `<li>${point}</li>`).join('');
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeService() {
  modal.hidden = true;
  document.body.style.overflow = '';
}

document.querySelectorAll('.service-details').forEach((button) => {
  button.addEventListener('click', () => openService(Number(button.dataset.service)));
});
document.querySelectorAll('[data-close-modal]').forEach((element) => element.addEventListener('click', closeService));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) closeService(); });


// اربط طلبات الخدمات بحساب العميل المسجل.
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="contract.html"]');
  if (!link || !window.IntlaqahCustomer) return;
  if (window.IntlaqahCustomer.get()) return;
  event.preventDefault();
  const target = link.getAttribute('href') || 'contract.html';
  location.href = window.IntlaqahCustomer.registrationUrl(target);
});
