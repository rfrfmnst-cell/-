const form = document.getElementById('trackingForm');
const result = document.getElementById('trackingResult');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
const stages = ['جديد', 'قيد المراجعة', 'قيد التنفيذ', 'مكتمل'];

function renderProgress(status) {
  if (status === 'ملغى') return '<div class="tracking-cancelled">تم إلغاء الطلب. تواصل معنا إذا كنت تحتاج تفاصيل إضافية.</div>';
  const activeIndex = Math.max(0, stages.indexOf(status));
  const labels = ['تم الاستلام', 'قيد المراجعة', 'قيد التنفيذ', 'مكتمل'];
  return `<div class="tracking-status">${labels.map((label, index) => `<span class="${index <= activeIndex ? 'active' : ''}">${label}</span>`).join('')}</div>`;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  result.hidden = false;
  result.textContent = 'جارٍ البحث عن الطلب...';
  try {
    const code = document.getElementById('orderNumber').value.trim().toUpperCase();
    const response = await fetch(`/api/track/${encodeURIComponent(code)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'تعذر العثور على الطلب.');
    result.innerHTML = `<strong>الطلب ${esc(data.trackingCode)}</strong><p>الخدمة: ${esc(data.service || '—')}<br />تاريخ الإنشاء: ${new Date(data.createdAt).toLocaleDateString('ar-SA')}<br />موعد التسليم: ${esc(data.deliveryDate || 'يحدد لاحقًا')}<br />الحالة الحالية: <b>${esc(data.status)}</b></p>${renderProgress(data.status)}`;
  } catch (error) {
    result.innerHTML = `<strong>تعذر العثور على الطلب</strong><p>${esc(error.message)}</p>`;
  }
});
