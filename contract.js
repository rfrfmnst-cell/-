const form = document.getElementById('contractForm');
const preview = document.getElementById('contractPreview');
const printButton = document.getElementById('printContract');
const requestedAgreement = new URLSearchParams(location.search).get('service');
const customer = window.IntlaqahCustomer.get();

if (!customer) {
  const returnTo = `contract.html${location.search || ''}`;
  location.replace(window.IntlaqahCustomer.registrationUrl(returnTo));
} else {
  const customerInfo = document.getElementById('contractCustomerInfo');
  if (customerInfo) customerInfo.textContent = `${customer.name} — ${customer.phone} — ${customer.customerCode}`;
  document.getElementById('clientName').value = customer.name;
  if (requestedAgreement) document.getElementById('agreementText').value = `تم الاتفاق مبدئيًا على: ${requestedAgreement}. تُستكمل تفاصيل النطاق والمخرجات قبل الاعتماد النهائي.`;
  const today = new Date();
  const isoToday = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  document.getElementById('agreementDate').value = isoToday;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const clientName = document.getElementById('clientName').value.trim();
    const price = document.getElementById('contractPrice').value.trim();
    const agreementDate = document.getElementById('agreementDate').value;
    const deliveryDate = document.getElementById('deliveryDate').value;
    const agreement = document.getElementById('agreementText').value.trim();
    document.getElementById('previewClient').textContent = clientName;
    document.getElementById('previewPrice').textContent = price || 'حسب الاتفاق';
    document.getElementById('previewAgreementDate').textContent = agreementDate;
    document.getElementById('previewDate').textContent = deliveryDate || 'يحدد حسب الاتفاق';
    document.getElementById('previewAgreement').textContent = agreement;
    try {
      const response = await fetch('/api/contracts', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          clientName, agreement, price, agreementDate, deliveryDate,
          customerCode: customer.customerCode,
          customerPhone: customer.phone
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'تعذر إنشاء الطلب.');
      if (data.trackingCode) {
        document.getElementById('trackingNotice')?.remove();
        const notice = document.createElement('p');
        notice.id='trackingNotice';
        notice.className='tracking-code';
        notice.innerHTML=`<strong>تم استلام طلبك وهو الآن قيد المراجعة.</strong><br>رقم التتبع: <strong>${data.trackingCode}</strong><br><small>سيتم تحديث الحالة بعد مراجعة فريق انطلاقة.</small>`;
        preview.prepend(notice);
      }
    } catch (error) {
      alert(error.message || 'تعذر حفظ الطلب.');
      return;
    }
    preview.hidden = false;
    printButton.disabled = false;
    preview.scrollIntoView({behavior:'smooth',block:'start'});
  });
  printButton.addEventListener('click', () => window.print());
}
