const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');
menuToggle?.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

const cards = [...document.querySelectorAll('.sector-card')];
const form = document.getElementById('siteOrderForm');
const summary = document.getElementById('selectedSummary');
const statusBox = document.getElementById('formStatus');
const typeInput = document.getElementById('projectType');
const titleInput = document.getElementById('projectTitle');
const priceInput = document.getElementById('projectPrice');
let customer = window.IntlaqahCustomer.get();

function syncCustomerFields() {
  customer = window.IntlaqahCustomer.get();
  const name = document.getElementById('customerName');
  const contact = document.getElementById('customerContact');
  if (customer) {
    name.value = customer.name;
    contact.value = customer.phone;
  } else {
    name.value = '';
    contact.value = '';
  }
}
syncCustomerFields();

function registrationForProject(card) {
  const type = card?.dataset.type || '';
  const target = `start-project.html${type ? `?type=${encodeURIComponent(type)}` : ''}#builder`;
  location.href = window.IntlaqahCustomer.registrationUrl(target);
}

function selectCard(card, scroll = true) {
  cards.forEach((item) => item.classList.toggle('selected', item === card));
  typeInput.value = card.dataset.type || '';
  titleInput.value = card.dataset.title || '';
  priceInput.value = card.dataset.price || '';
  summary.innerHTML = `<span>${card.dataset.duration || 'المدة تحدد حسب النطاق'}</span><strong>${card.dataset.title} — يبدأ من ${card.dataset.price}</strong>`;
  if (scroll) document.getElementById('builder').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

cards.forEach((card) => card.querySelector('.choose-sector')?.addEventListener('click', () => {
  customer = window.IntlaqahCustomer.get();
  if (!customer) return registrationForProject(card);
  selectCard(card);
}));

const requestedType = new URLSearchParams(location.search).get('type');
if (requestedType && customer) {
  const card = cards.find((item) => item.dataset.type === requestedType);
  if (card) selectCard(card, false);
}

function selectedValues(name) {
  return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  customer = window.IntlaqahCustomer.get();
  if (!customer) {
    const selected = cards.find((item) => item.dataset.type === typeInput.value);
    return registrationForProject(selected);
  }
  statusBox.className = 'form-status';
  if (!typeInput.value) {
    statusBox.textContent = 'اختر نوع الموقع أولًا من الخيارات بالأعلى.';
    statusBox.classList.add('error');
    document.getElementById('options').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const payload = {
    customerCode: customer.customerCode,
    customerPhone: customer.phone,
    name: customer.name,
    contact: customer.phone,
    projectType: typeInput.value,
    projectTitle: titleInput.value,
    startingPrice: priceInput.value,
    businessName: document.getElementById('businessName').value.trim(),
    businessActivity: document.getElementById('businessActivity').value.trim(),
    colors: document.getElementById('colors').value.trim(),
    pages: selectedValues('pages'),
    features: selectedValues('features'),
    references: document.getElementById('references').value.trim(),
    notes: document.getElementById('notes').value.trim()
  };

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'جارٍ إرسال الطلب...';
  try {
    const response = await fetch('/api/site-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || 'تعذر إرسال الطلب.');
    statusBox.textContent = `تم استلام وصف مشروعك. رقم الطلب: ${result.orderCode} — مرتبط بالعميل: ${customer.customerCode}`;
    statusBox.classList.add('success');
    form.reset();
    syncCustomerFields();
    cards.forEach((item) => item.classList.remove('selected'));
    typeInput.value = '';
    titleInput.value = '';
    priceInput.value = '';
    summary.innerHTML = '<span>تم إرسال الطلب بنجاح</span><strong>سنراجع وصف المشروع قبل بدء التنفيذ.</strong>';
  } catch (error) {
    statusBox.textContent = error.message || 'تعذر إرسال الطلب حاليًا.';
    statusBox.classList.add('error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'إرسال وصف المشروع';
  }
});
