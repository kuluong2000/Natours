// Type is 'success' or 'error'

export const hidelAlert = () => {
  const el = document.querySelector('.alert');
  if (el) el.parentElement.removeChild(el);
};

export const showAlert = (type, msg) => {
  hidelAlert();
  const markup = `<div class="alert alert--${type}">${msg}</div>`;
  document.querySelector('body').insertAdjacentHTML('afterbegin', markup);
  window.setTimeout(hidelAlert, 3000);
};
