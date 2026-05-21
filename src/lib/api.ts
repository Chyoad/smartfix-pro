const API_BASE = '/api';

async function request(path: string, method = 'GET', body?: any) {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
  return res.json();
}

export const api = {
  users: {
    list: () => request('/users'),
    create: (data: any) => request('/users', 'POST', data),
  },
  inventory: {
    list: () => request('/inventory'),
    create: (data: any) => request('/inventory', 'POST', data),
    update: (id: string, data: any) => request(`/inventory/${id}`, 'PUT', data),
    delete: (id: string) => request(`/inventory/${id}`, 'DELETE'),
    updateStock: (id: string, stockLevel: number) => request(`/inventory/${id}`, 'PUT', { stockLevel }),
  },
  tickets: {
    list: () => request('/tickets'),
    create: (data: any) => request('/tickets', 'POST', data),
    update: (id: string, data: any) => request(`/tickets/${id}`, 'PUT', data),
    delete: (id: string) => request(`/tickets/${id}`, 'DELETE'),
  },
  transactions: {
    list: () => request('/transactions'),
    create: (data: any) => request('/transactions', 'POST', data),
    checkout: (data: any) => request('/checkout', 'POST', data),
  },
  system: {
    reset: () => request('/system/reset', 'POST'),
  }
};
