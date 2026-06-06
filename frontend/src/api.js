import axios from 'axios'

const api = axios.create({ baseURL: '', timeout: 15000 })

export const getUsers            = ()              => api.get('/api/users')
export const getUser             = (id)            => api.get(`/api/users/${id}`)
export const getUserTimeline     = (id)            => api.get(`/api/users/${id}/timeline`)
export const getDashboardSummary = ()              => api.get('/api/dashboard/summary')
export const explainRisk         = (id)            => api.get(`/api/users/${id}/explain`)
export const getInterventions    = (id, ls=false)  => api.get(`/api/users/${id}/interventions?load_shedding=${ls}`)
export const getCounterfactual   = (id)            => api.get(`/api/users/${id}/counterfactual`)

// Streaming explanation — uses relative URL so Vite proxy handles it
export const streamExplanation = (id) => {
  return new EventSource(`/api/users/${id}/explain/stream`)
}