// services/mockData.ts - REWRITTEN AS AN API CLIENT

import { Company, Role, Client, Pet, Appointment, MedicalRecord, Invoice, Vet, Product, Purchase, Reminder, Hospitalization, Payment, Supplier, PointOfSale, CashierShift, ExpenseCategory, Expense, InternalConsumption, Prescription } from '../types';

const API_BASE_URL = 'http://localhost:3003/api/v1';

// A helper function to handle API responses.
const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `API request failed with status ${response.status}`);
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    }
    return {};
};

// A generic fetch wrapper to include headers and base URL.
const apiFetch = (endpoint: string, options: RequestInit = {}) => {
    // In a real production app, you would manage an auth token (e.g., JWT)
    const token = localStorage.getItem('authToken'); 
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    }).then(handleResponse);
};

// --- AUTH ---
export const login = async (email: string, password: string): Promise<{ vet: Vet, companies: Company[] }> => {
    const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    // In a real app, the server would return a token to store.
    // if (data.token) localStorage.setItem('authToken', data.token);
    return data;
};

// --- DATA GETTERS ---
const companyResourceGetter = (resource: string) => (companyId: string) => apiFetch(`/companies/${companyId}/${resource}`);
const globalResourceGetter = (resource: string) => () => apiFetch(`/${resource}`);

export const getClients = companyResourceGetter('clients');
export const getPets = companyResourceGetter('pets');
export const getAppointments = companyResourceGetter('appointments');
export const getProducts = companyResourceGetter('products');
export const getPurchases = companyResourceGetter('purchases');
export const getInvoices = companyResourceGetter('invoices');
export const getReminders = companyResourceGetter('reminders');
export const getHospitalizations = companyResourceGetter('hospitalizations');
export const getSuppliers = companyResourceGetter('suppliers');
export const getPointsOfSale = companyResourceGetter('points-of-sale');
export const getCashierShifts = companyResourceGetter('cashier-shifts');
export const getExpenseCategories = companyResourceGetter('expense-categories');
export const getExpenses = companyResourceGetter('expenses');
export const getInternalConsumptions = companyResourceGetter('internal-consumptions');
export const getVetsByCompany = companyResourceGetter('vets');
export const getClientById = (companyId: string, id: string) => apiFetch(`/companies/${companyId}/clients/${id}`);
export const getPetById = (companyId: string, id: string) => apiFetch(`/companies/${companyId}/pets/${id}`);
export const getInvoiceById = (companyId: string, id: string) => apiFetch(`/companies/${companyId}/invoices/${id}`);
export const getRoles = globalResourceGetter('roles');
export const getVets = globalResourceGetter('vets');

// --- SETTINGS & RBAC ---
export const addCompany = (companyData: Omit<Company, 'id'>): Promise<Company> => apiFetch('/companies', { method: 'POST', body: JSON.stringify(companyData) });
export const updateCompany = (companyId: string, updates: Partial<Company>): Promise<Company> => apiFetch(`/companies/${companyId}`, { method: 'PUT', body: JSON.stringify(updates) });
export const deleteCompany = (companyId: string): Promise<{ id: string }> => apiFetch(`/companies/${companyId}`, { method: 'DELETE' });
export const assignVetRoles = (vetId: string, companyId: string, roleIds: string[]): Promise<Vet> => apiFetch(`/vets/${vetId}/assign-roles`, { method: 'POST', body: JSON.stringify({ companyId, roleIds }) });
export const removeVetFromCompany = (vetId: string, companyId: string): Promise<Vet> => apiFetch(`/vets/${vetId}/assign-roles`, { method: 'DELETE', body: JSON.stringify({ companyId }) });

// --- VET CRUD (Super Admin) ---
export const addVet = (vetData: Omit<Vet, 'id' | 'companyRoles'>): Promise<Vet> => apiFetch('/vets', { method: 'POST', body: JSON.stringify(vetData) });
export const updateVet = (vetId: string, updates: Partial<Vet>): Promise<Vet> => apiFetch(`/vets/${vetId}`, { method: 'PUT', body: JSON.stringify(updates) });
export const deleteVet = (vetId: string): Promise<{ id: string }> => apiFetch(`/vets/${vetId}`, { method: 'DELETE' });

// --- Specific CRUD Functions ---
export const addClient = (companyId: string, data: any) => apiFetch(`/companies/${companyId}/clients`, { method: 'POST', body: JSON.stringify(data) });
export const updateClient = (id: string, updates: Partial<Client>) => apiFetch(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
export const deleteClient = (id: string) => apiFetch(`/clients/${id}`, { method: 'DELETE' });

export const addPet = (companyId: string, ownerId: string, petData: any) => apiFetch(`/companies/${companyId}/clients/${ownerId}/pets`, { method: 'POST', body: JSON.stringify(petData) });
export const updatePet = (id: string, updates: Partial<Pet>): Promise<Pet> => apiFetch(`/pets/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
export const deletePet = (id: string) => apiFetch(`/pets/${id}`, { method: 'DELETE' });

export const addAppointment = (companyId: string, apptData: any) => apiFetch(`/companies/${companyId}/appointments`, { method: 'POST', body: JSON.stringify(apptData) });
export const updateAppointment = (id: string, updates: Partial<Appointment>) => apiFetch(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
export const deleteAppointment = (id: string) => apiFetch(`/appointments/${id}`, { method: 'DELETE' });

export const addProduct = (companyId: string, productData: any) => apiFetch(`/companies/${companyId}/products`, { method: 'POST', body: JSON.stringify(productData) });
export const updateProduct = (id: string, updates: Partial<Product>) => apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
export const deleteProduct = (id: string) => apiFetch(`/products/${id}`, { method: 'DELETE' });

export const addPurchase = (companyId: string, purchaseData: any) => apiFetch(`/companies/${companyId}/purchases`, { method: 'POST', body: JSON.stringify(purchaseData) });
export const addMedicalRecord = (companyId: string, petId: string, recordData: any) => apiFetch(`/companies/${companyId}/pets/${petId}/medical-records`, { method: 'POST', body: JSON.stringify(recordData) });
export const updateMedicalRecord = (id: string, updates: Partial<MedicalRecord>) => apiFetch(`/medical-records/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
export const deleteMedicalRecord = (id: string) => apiFetch(`/medical-records/${id}`, { method: 'DELETE' });

export const addPrescription = (companyId: string, data: Omit<Prescription, 'id' | 'companyId'>) => apiFetch(`/companies/${companyId}/prescriptions`, { method: 'POST', body: JSON.stringify(data) });

export const updateInvoice = (id: string, updates: Partial<Invoice>): Promise<Invoice> => apiFetch(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
export const recordPayment = (invoiceId: string, paymentData: any): Promise<Invoice> => apiFetch(`/invoices/${invoiceId}/payments`, { method: 'POST', body: JSON.stringify(paymentData) });
export const addCounterSale = (companyId: string, saleData: any) => apiFetch(`/companies/${companyId}/counter-sales`, { method: 'POST', body: JSON.stringify(saleData) });

export const updateReminderStatus = (reminderId: string, status: Reminder['status']): Promise<Reminder> => apiFetch(`/reminders/${reminderId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });

export const addSupplier = (companyId: string, data: any) => apiFetch(`/companies/${companyId}/suppliers`, { method: 'POST', body: JSON.stringify(data) });
export const updateSupplier = (id: string, updates: Partial<Supplier>) => apiFetch(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
export const deleteSupplier = (id: string) => apiFetch(`/suppliers/${id}`, { method: 'DELETE' });

export const addPointOfSale = (companyId: string, data: any) => apiFetch(`/companies/${companyId}/points-of-sale`, { method: 'POST', body: JSON.stringify(data) });
export const updatePointOfSale = (id: string, updates: Partial<PointOfSale>) => apiFetch(`/points-of-sale/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
export const deletePointOfSale = (id: string) => apiFetch(`/points-of-sale/${id}`, { method: 'DELETE' });

export const addExpenseCategory = (companyId: string, data: any) => apiFetch(`/companies/${companyId}/expense-categories`, { method: 'POST', body: JSON.stringify(data) });
export const updateExpenseCategory = (id: string, updates: Partial<ExpenseCategory>) => apiFetch(`/expense-categories/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
export const deleteExpenseCategory = (id: string) => apiFetch(`/expense-categories/${id}`, { method: 'DELETE' });

export const addExpense = (companyId: string, data: any) => apiFetch(`/companies/${companyId}/expenses`, { method: 'POST', body: JSON.stringify(data) });
export const addInternalConsumption = (companyId: string, data: any) => apiFetch(`/companies/${companyId}/internal-consumptions`, { method: 'POST', body: JSON.stringify(data) });

export const openCashierShift = (companyId: string, data: any) => apiFetch(`/companies/${companyId}/cashier-shifts/open`, { method: 'POST', body: JSON.stringify(data) });
export const closeCashierShift = (shiftId: string, data: any) => apiFetch(`/cashier-shifts/${shiftId}/close`, { method: 'POST', body: JSON.stringify(data) });

export const addHospitalization = (companyId: string, data: any) => apiFetch(`/companies/${companyId}/hospitalizations`, { method: 'POST', body: JSON.stringify(data) });
export const addAttachmentToHospitalization = (hospId: string, data: any) => apiFetch(`/hospitalizations/${hospId}/attachments`, { method: 'POST', body: JSON.stringify(data) });
export const addHospitalizationLog = (hospId: string, logType: string, data: any) => apiFetch(`/hospitalizations/${hospId}/logs`, { method: 'POST', body: JSON.stringify({ logType, ...data }) });
export const updateHospitalizationPlan = (hospId: string, plan: string) => apiFetch(`/hospitalizations/${hospId}/plan`, { method: 'PUT', body: JSON.stringify({ plan }) });
export const dischargePatient = (hospId: string, data: any) => apiFetch(`/hospitalizations/${hospId}/discharge`, { method: 'POST', body: JSON.stringify(data) });
