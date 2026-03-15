let API_BASE = import.meta.env.VITE_API_BASE;

if (!API_BASE) {
  API_BASE = '/api';
}

console.log('API_BASE:', API_BASE);

export default API_BASE
