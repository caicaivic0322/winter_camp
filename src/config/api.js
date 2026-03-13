let API_BASE = import.meta.env.VITE_API_BASE;

if (!API_BASE) {
  if (import.meta.env.DEV) {
    API_BASE = '/api';
  } else {
    const hostname = window.location.hostname;
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      API_BASE = 'http://localhost:8787/api';
    } else {
      API_BASE = 'https://cpp-camp-server.onrender.com/api';
    }
  }
}

console.log('API_BASE:', API_BASE);

export default API_BASE
