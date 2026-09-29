(function () {
  const KEY = 'intlaqahCustomer';

  function get() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const customer = JSON.parse(raw);
      if (!customer || !customer.customerCode || !customer.name || !customer.phone) return null;
      return customer;
    } catch {
      return null;
    }
  }

  function set(customer) {
    if (!customer || !customer.customerCode || !customer.name || !customer.phone) return;
    localStorage.setItem(KEY, JSON.stringify({
      customerCode: String(customer.customerCode),
      name: String(customer.name),
      phone: String(customer.phone)
    }));
  }

  function clear() {
    localStorage.removeItem(KEY);
  }

  function safeReturn(value, fallback = 'index.html') {
    const target = String(value || '').trim();
    if (!target || target.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(target)) return fallback;
    return target.replace(/^\/+/, '') || fallback;
  }

  function registrationUrl(returnTo) {
    return `register.html?return=${encodeURIComponent(safeReturn(returnTo))}`;
  }

  window.IntlaqahCustomer = { get, set, clear, safeReturn, registrationUrl };
})();
