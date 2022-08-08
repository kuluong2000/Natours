import '@babel/polyfill';
import { displayMap } from './mapbox';
import { login, logout } from './login';
import { updateData } from './updateSettings';
// DOM ELEMENT
const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const logoutBtn = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-user-data');
const userChangePassword = document.querySelector('.form-user-password');
//VALUES

//DELEGATION

//mapbox
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

//form login
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });
}
if (logoutBtn) {
  logoutBtn.addEventListener('click', logout);
}

if (userDataForm) {
  userDataForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = new FormData();
    const file = document.getElementById('photo').files[0];
    const label = document.getElementById('form-file__label').value;
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);
    document.querySelector('.btn-save__data').innerHTML = 'updating data ...';
    // label.innerText = 'test';
    updateData(form, 'data');
    document.querySelector('.btn-save__data').innerHTML = 'SAVE SETTINGS';
  });
}

if (userChangePassword) {
  userChangePassword.addEventListener('submit', async (e) => {
    e.preventDefault();
    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    document.querySelector('.btn--password').innerHTML =
      'updating password ...';
    await updateData(
      { passwordCurrent, password, passwordConfirm },
      'password'
    );
    document.querySelector('.btn--password').innerHTML = 'SAVE PASSWORD';
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });
}
