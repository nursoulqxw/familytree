import { Platform } from 'react-native';

const LOCAL_IP = '192.168.0.133';

export const API_BASE_URL =
  Platform.OS === 'android'
    ? `http://${LOCAL_IP}:8000/api`
    : `http://${LOCAL_IP}:8000/api`;

export default API_BASE_URL;