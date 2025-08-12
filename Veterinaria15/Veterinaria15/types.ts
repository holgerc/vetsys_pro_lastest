
export enum View {
  DASHBOARD,
  APPOINTMENTS,
  CLIENTS,
  PET_DETAIL,
  INVENTORY,
  CONSUMPTION, // New
  PURCHASES,
  SUPPLIERS,
  BILLING,
  INVOICE_DETAIL,
  SETTINGS,
  HOSPITALIZATION,
  CASHIER,
  EXPENSES,
}

// --- NEW ---
export interface InternalConsumption {
    id: string;
    companyId: string;
    date: string; // ISO
    productId: string;
    productName: string;
    lotId?: string;
    lotNumber?: string;
    quantity: number;
    reason: string; // e.g., "Internal Use", "Expired", "Damaged"
    recordedByVetId: string;
    recordedByVetName: string;
}

export interface ExpenseCategory {
    id: string;
    companyId: string;
    name: string;
}

export interface Expense {
    id: string;
    companyId: string;
    date: string; // ISO
    amount: number;
    description: string;
    categoryId: string;
    categoryName: string;
    cashierShiftId?: string; // If paid from a specific shift's cash drawer
    recordedByVetId: string;
    recordedByVetName: string;
}

export interface Appointment {
    id: string;
    companyId: string;
    clientId: string;
    clientName: string; // denormalized
    petId: string;
    petName: string; // denormalized
    date: string; // YYYY-MM-DD
    time: string; // HH:MM
    reason: string;
    vet: string;
    status: 'Confirmada' | 'En espera' | 'En progreso' | 'Completada' | 'Cancelada';
}

export interface PointOfSale {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface CashierShift {
    id: string;
    companyId: string;
    pointOfSaleId: string;
    pointOfSaleName: string;
    openingTime: string; // ISO
    closingTime?: string; // ISO
    openingBalance: number;
    closingBalance?: number;
    calculatedCashTotal: number;
    difference?: number;
    status: 'Abierto' | 'Cerrado';
    openedByVetId: string;
    openedByVetName: string;
    closedByVetId?: string;
    closedByVetName?: string;
    payments: Payment[]; // All payments recorded during this shift
    expenses: Expense[]; // All expenses paid from this shift
    notes?: string;
}


export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email: string;
  address: string;
}

export interface ProductSupplier {
  supplierId: string;
  supplierName: string; // denormalized for easier display
  purchasePrice: number;
}

export interface AttachedFile {
  id: string;
  name: string;
  mimeType: string; // e.g., 'application/pdf', 'image/jpeg'
  data: string; // Base64 encoded string
  uploadedAt: string; // ISO string
  description: string;
  uploadedBy: string; // Name of the user who uploaded
  sourceId: string; // ID of the medical record or hospitalization
  sourceType: 'MedicalRecord' | 'Hospitalization';
}


// --- NEW: RBAC & MULTI-TENANCY ---
export interface ThemeColors {
    primary: string;
    primaryLight: string;
    accent: string;
}

export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  taxRate: number;
  address: string;
  phone: string;
  theme?: ThemeColors;
  sessionTimeoutMinutes?: number;
}

export enum Permission {
  // Appointments
  ViewAppointments = 'view_appointments',
  ManageAppointments = 'manage_appointments',
  // Clients & Pets
  ViewClients = 'view_clients',
  ManageClients = 'manage_clients',
  ViewPetMedicalRecords = 'view_pet_medical_records',
  ManagePetMedicalRecords = 'manage_pet_medical_records',
  // Prescriptions
  ManagePrescriptions = 'manage_prescriptions',
  // Hospitalization
  ViewHospitalizations = 'view_hospitalizations',
  ManageHospitalizations = 'manage_hospitalizations',
  // Billing
  ViewBilling = 'view_billing',
  ManageBilling = 'manage_billing',
  // Inventory
  ViewInventory = 'view_inventory',
  ManageInventory = 'manage_inventory',
  ManageInternalConsumption = 'manage_internal_consumption', // New
  // Purchases
  ViewPurchases = 'view_purchases',
  ManagePurchases = 'manage_purchases',
  // Suppliers
  ViewSuppliers = 'view_suppliers',
  ManageSuppliers = 'manage_suppliers',
  // Expenses
  ViewExpenses = 'view_expenses',
  ManageExpenses = 'manage_expenses',
  ManageExpenseCategories = 'manage_expense_categories',
  // Cashier
  ViewCashier = 'view_cashier',
  ManageCashierShifts = 'manage_cashier_shifts',
  // Settings
  ViewSettings = 'view_settings',
  ManageVets = 'manage_vets', // Assign roles to vets
  ManageRoles = 'manage_roles', // Create/edit roles (future)
  ManageCompanySettings = 'manage_company_settings',
  ManagePointsOfSale = 'manage_points_of_sale',
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

// --- PRESCRIPTION ---
export interface PrescriptionItem {
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
}

export interface Prescription {
    id: string;
    companyId: string;
    petId: string;
    date: string;
    vet: string;
    items: PrescriptionItem[];
}


// --- MODIFIED TYPES ---

export interface Vet {
  id: string;
  name: string;
  email: string;
  password: string; // In a real app, this would be a hash
  specialty: string;
  isSuperAdmin?: boolean;
  // Maps companyId to an array of roleIds
  companyRoles: { [companyId: string]: string[]; };
}


export type MedicalRecordCategory = 'Vacuna' | 'Antiparasitario' | 'Cirugía' | 'Tratamiento' | 'Examen' | 'Laboratorio' | 'Otro';

export interface Client {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  identificationNumber: string; // e.g., Cedula, RUC, Passport
  billingAddress?: string; // Optional, defaults to main address if not provided
  memberSince: string;
  pets: Pet[];
  balance: number;
}

export interface Pet {
  id: string;
  companyId: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  sex: 'Macho' | 'Hembra (Esterilizada)' | 'Hembra' | 'Macho (Castrado)';
  color: string;
  weightHistory: WeightEntry[];
  photoUrl: string;
  medicalAlerts: string[];
  medicalRecords: MedicalRecord[];
  prescriptions: Prescription[];
  ownerId: string;
}

export interface WeightEntry {
  date: string;
  weight: number;
}

export interface Reminder {
    id: string;
    companyId: string;
    petId: string;
    clientId: string;
    petName: string;
    clientName: string;
    dueDate: string;
    message: string;
    status: 'Pendiente' | 'Completado' | 'Descartado';
    relatedRecordId?: string;
    category: MedicalRecordCategory;
}

export interface MedicalRecord {
  id: string;
  companyId: string;
  petId: string;
  date: string;
  vet: string;
  reason: string;
  category: MedicalRecordCategory;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  invoiceItems: InvoiceItem[];
  invoiceId?: string;
  reminderDays?: number; // transient property for form
  attachments: AttachedFile[]; // New
}

export interface InvoiceItem {
  id: string; // Can be product ID or a generated ID for a service
  name: string;
  description: string;
  quantity: number;
  price: number; // Price per unit (original)
  lotId?: string;
  lotNumber?: string;
  discountAmount?: number;
  discountPercentage?: number;
}

export interface ProductLot {
    id: string;
    lotNumber: string;
    quantity: number;
    expirationDate?: string;
}

export interface Product {
    id: string;
    companyId: string;
    name: string;
    category: 'Medicina' | 'Alimento' | 'Accesorio' | 'Insumo' | 'Servicio';
    lots: ProductLot[];
    usesLotTracking: boolean;
    salePrice: number;
    lowStockThreshold: number;
    description: string;
    taxable: boolean;
    discountPercentage?: number;
    suppliers: ProductSupplier[];
    isDivisible?: boolean;
    totalVolume?: number;
    volumeUnit?: string;
}

export interface Purchase {
    id: string;
    companyId: string;
    productId: string;
    productName: string;
    supplierId: string;
    supplierName: string;
    quantity: number;
    purchasePrice: number;
    date: string;
    lotNumber?: string;
    expirationDate?: string;
}

export interface Payment {
    date: string;
    amount: number;
    method: 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Otro';
    cashierShiftId?: string; // Link to the shift
    invoiceId?: string; // for reference inside shift
}

export interface Invoice {
    id: string;
    invoiceNumber: string;
    companyId: string;
    client: Client;
    pet?: Pet;
    date: string;
    items: InvoiceItem[];
    status: 'Pagada' | 'No pagada' | 'Vencida';
    subtotal: number;
    totalDiscount: number;
    tax: number;
    total: number;
    amountPaid: number;
    balanceDue: number;
    taxRate: number; // New field for historical accuracy
    paymentHistory: Payment[];
}

export interface VitalSignEntry {
    id: string;
    timestamp: string; // ISO string
    recordedBy: string; // Vet or Tech name
    temperature?: number; // Celsius
    heartRate?: number; // bpm
    respiratoryRate?: number; // breaths per minute
    bloodPressure?: string; // e.g., "120/80"
    notes?: string;
}

export interface MedicationLogEntry {
    id: string;
    timestamp: string; // ISO string
    administeredBy: string; // Vet or Tech name
    productId: string;
    productName: string; // denormalized
    lotId?: string;
    lotNumber?: string; // denormalized
    quantity: number; // For stock deduction
    dosage: string; // e.g., "1 tablet", "5 mL"
    route: string; // e.g., "IV", "PO", "SQ"
    notes?: string;
    invoiceId?: string; // To track if this log has been billed
}

export interface ProgressNoteEntry {
    id: string;
    timestamp: string; // ISO string
    author: string; // Vet or Tech name
    note: string;
}

export type DischargeOutcome = 'Estable' | 'Mejorado' | 'Reservado' | 'Fallecido' | 'Transferido';

export interface Hospitalization {
    id:string;
    companyId: string;
    petId: string;
    clientId: string;
    petName: string;
    clientName: string;
    
    admissionDate: string; // ISO string with time
    dischargeDate?: string; // ISO string with time
    
    status: 'Activo' | 'De alta';
    reason: string;
    initialDiagnosis: string;
    
    vetInCharge: string;
    
    treatmentPlan: string;
    
    vitalSignsLog: VitalSignEntry[];
    medicationLog: MedicationLogEntry[];
    progressNotes: ProgressNoteEntry[];
    attachments: AttachedFile[]; // New
    
    invoiceId?: string; 

    // New fields for discharge
    dischargeOutcome?: DischargeOutcome;
    dischargeRecommendations?: string;
}
