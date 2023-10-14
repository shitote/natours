/* elslint-disable */

import axios from 'axios';
import { showAlert } from './alert';

// type is either the password or data
export const updateSettings = async (data, type) => {
  try {
    const url =
      type === 'password'
        ? '/api/v2/users/updateMyPassword'
        : '/api/v2/users/updateMe';

    const res = await axios({
      method: 'PATCH',
      url,
      data,
    });
    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase} updated successfully!`);
    }
  } catch (err) {
    showAlert('error', err.message);
  }
};
