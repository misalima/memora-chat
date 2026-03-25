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
            const timeoutMessage = 'O servidor demorou muito para responder. Tente novamente.';

            // Preserve Axios error shape while providing a user-facing message
            (error as any).message = timeoutMessage;
            if (!(error as any).response) {
                (error as any).response = {};
            }
            if (!(error as any).response.data) {
                (error as any).response.data = {};
            }
            (error as any).response.data.message = timeoutMessage;

            return Promise.reject(error);
        }
        return Promise.reject(error);
    }
);

export default api;