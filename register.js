const form = document.getElementById('customerRegisterForm');
const nameInput = document.getElementById('customerName');
const phoneInput = document.getElementById('customerPhone');
const statusBox = document.getElementById('registerStatus');
const submitButton = form.querySelector('button[type="submit"]');
const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
const params = new URLSearchParams(location.search);
const returnTo = window.IntlaqahCustomer.safeReturn(params.get('return'), 'index.html');

function toEnglishDigits(value) {
  return String(value || '')
    .replace(/[٠-٩]/g, (d) => arabicDigits.indexOf(d))
    .replace(/[۰-۹]/g, (d) => persianDigits.indexOf(d));
}

function normalizeSaudiMobile(value) {
  let digits = toEnglishDigits(value).replace(/\D/g, '');
  if (digits.startsWith('00966')) digits = digits.slice(5);
  else if (digits.startsWith('966')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return /^5\d{8}$/.test(digits) ? `+966${digits}` : null;
}

const saved = window.IntlaqahCustomer.get();
if (saved) {
  nameInput.value = saved.name;
  phoneInput.value = saved.phone.replace(/^\+966/, '');
  const note = document.getElementById('registeredCustomerNotice');
  if (note) {
    note.hidden = false;
    note.innerHTML = `أنت مسجل حاليًا برقم العميل <strong dir="ltr">${saved.customerCode}</strong>. يمكنك تحديث الربط بإعادة إدخال بياناتك.`;
  }
}

phoneInput.addEventListener('input', () => {
  const digits = toEnglishDigits(phoneInput.value).replace(/\D/g, '').replace(/^0+/, '').slice(0, 9);
  phoneInput.value = digits;
});

function continueToRequest(customer, message) {
  window.IntlaqahCustomer.set(customer);
  statusBox.classList.add('success');
  statusBox.innerHTML = `${message} رقم العميل: <strong dir="ltr">${customer.customerCode}</strong><br><small>سيتم نقلك الآن لإكمال طلب الخدمة.</small>`;
  setTimeout(() => { location.href = returnTo; }, 650);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  statusBox.className = 'register-status';
  statusBox.textContent = '';
  const name = nameInput.value.trim();
  const phone = normalizeSaudiMobile(phoneInput.value);

  if (name.length < 2) {
    statusBox.classList.add('error');
    statusBox.textContent = 'اكتب الاسم بشكل صحيح.';
    nameInput.focus();
    return;
  }
  if (!phone) {
    statusBox.classList.add('error');
    statusBox.textContent = 'اكتب رقم جوال سعودي صحيح يبدأ بالرقم 5.';
    phoneInput.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'جارٍ ربط الحساب...';
  try {
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone })
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 409 && result.customerCode) {
      continueToRequest({ customerCode: result.customerCode, name, phone }, 'رقم الجوال مسجل مسبقًا وتم ربطه بطلبك.');
      return;
    }
    if (!response.ok) throw new Error(result.message || 'تعذر تسجيل العميل.');
    continueToRequest({ customerCode: result.customerCode, name, phone }, 'تم تسجيلك وربط بياناتك بطلب الخدمة.');
  } catch (error) {
    statusBox.classList.add('error');
    statusBox.textContent = error.message || 'تعذر تسجيل العميل. حاول مرة أخرى.';
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'تسجيل ومتابعة الطلب';
  }
});
