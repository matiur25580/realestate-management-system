import axios from 'axios';
// One Axios client centralizes the API base URL and adds the current session token to requests.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});
api.interceptors.request.use((config)=>{
  const token = localStorage.getItem('token');
  if(token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});
export default api;
