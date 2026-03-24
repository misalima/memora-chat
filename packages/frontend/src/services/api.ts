import axios from 'axios';



const api = axios.create({
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 60000,
});


api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
            console.error('Request timeout - a resposta demorou muito');
            return Promise.reject(new Error('O servidor demorou muito para responder. Tente novamente.'));
        }
        return Promise.reject(error);
    }
);

export default api;