import axios from 'axios'

// 创建 axios 实例
const service = axios.create({
    baseURL: '/api/', // 基础地址
    timeout: 5000, // 超时时间
})

// 请求拦截器
service.interceptors.request.use(
    (config) => {
        // 可在此添加 token（示例）
        // const token = localStorage.getItem('token')
        // if (token) config.headers.Authorization = `Bearer ${token}`
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// 响应拦截器
service.interceptors.response.use(
    (response) => {
        // 统一处理响应数据（根据后端格式调整）
        if (response.status === 200) {
            return response.data
        } else {
            return Promise.reject(new Error(response.data.message || 'Error'))
        }
    },
    (error) => {
        // 统一处理错误（如 401、404 等）
        return Promise.reject(error)
    }
)

export default service