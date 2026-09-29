const catalog = {
  'services-site': { title: 'موقع شركة خدمات', price: 349 },
  'starter-store': { title: 'متجر إلكتروني جاهز', price: 449 },
  'landing-page': { title: 'صفحة هبوط تسويقية', price: 199 },
  'consulting-site': { title: 'موقع مكتب استشارات', price: 399 },
  'orders-dashboard': { title: 'لوحة إدارة الطلبات', price: 599 },
  'fashion-store': { title: 'تصميم متجر أزياء', price: 449 }
};
const productId = new URLSearchParams(location.search).get('product');
const selectedProductId = catalog[productId] ? productId : 'services-site';
const product = catalog[selectedProductId];
const summary = document.getElementById('productSummary');
summary.innerHTML = `<small>المنتج المختار</small><h2>${product.title}</h2><div><span>السعر</span><strong>${product.price} ر.س</strong></div>`;
document.getElementById('digitalOrderForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = document.getElementById('orderStatus');
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true; status.textContent = 'جاري تجهيز الطلب...';
  try {
    const response = await fetch('/api/digital-orders', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ productId: selectedProductId, name:document.getElementById('buyerName').value, email:document.getElementById('buyerEmail').value, phone:document.getElementById('buyerPhone').value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'تعذر إنشاء الطلب');
    status.textContent = `تم تجهيز الطلب رقم ${data.orderCode}. سيتم تحويلك للدفع فور تفعيل الربط المالي.`;
  } catch (error) { status.textContent = error.message || 'تعذر تجهيز الطلب حاليًا.'; }
  button.disabled = false;
});
