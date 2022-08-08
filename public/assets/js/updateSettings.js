import axios from 'axios';
import { showAlert } from './alerts';
// Update Data
//type os eotjer 'pasword' or 'data'
export const updateData = async (data, type) => {
  // console.log(data);
  try {
    const url =
      type === 'password'
        ? '/api/v1/user/updateMyPassword'
        : '/api/v1/user/updateMe';

    // console.log(123);
    const res = await axios({
      method: 'PATCH',
      url,
      data,
    });

    // console.log('debug', res.data);
    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated successfully!`);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
    // console.log(err);
  }
};
