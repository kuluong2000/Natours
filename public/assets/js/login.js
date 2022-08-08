// import 'regenerator-runtime/runtime';

import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
  console.log(email, password);
  try {
    const res = await axios({
      method: 'post',
      url: 'http://127.0.0.1:3000/api/v1/user/login',
      data: {
        email: email,
        password: password,
      },
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Login in successfully');
      window.setTimeout(() => {
        location.assign('/');
      }, 1000);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: 'http://127.0.0.1:3000/api/v1/user/logout',
    });
    if ((res.data.status = 'success')) {
      location.reload(true);
    }
  } catch (err) {
    showAlert('error', 'Error logging out! try again');
  }
};
