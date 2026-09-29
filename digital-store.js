const filterButtons = document.querySelectorAll('[data-filter]');
const products = document.querySelectorAll('.store-products article[data-category]');
filterButtons.forEach((button) => button.addEventListener('click', () => {
  filterButtons.forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  const filter = button.dataset.filter;
  products.forEach((product) => { product.hidden = filter !== 'all' && product.dataset.category !== filter; });
}));
