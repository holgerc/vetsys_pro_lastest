
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
  user: 'admin',
  host: '68.183.157.159',
  database: 'clinica-veterinaria2',
  password: 'vetsysad24-Ec',
  port: 5433,
});

pool.on('connect', () => console.log('Successfully connected to the database!'));
pool.on('error', (err) => console.error('Unexpected error on idle PostgreSQL client', err));

const toCamelCase = (str) => str.replace(/(_\w)/g, m => m[1].toUpperCase());
const toSnakeCase = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const convertKeys = (obj, converter) => {
    if (Array.isArray(obj)) {
        return obj.map(v => convertKeys(v, converter));
    } else if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((acc, key) => {
            acc[converter(key)] = convertKeys(obj[key], converter);
            return acc;
        }, {});
    }
    return obj;
};

const query = async (text, params) => {
    const { rows } = await pool.query(text, params);
    return convertKeys(rows, toCamelCase);
};

const buildUpdateQuery = (table, id, updates) => {
    const snakeCaseUpdates = convertKeys(updates, toSnakeCase);
    const keys = Object.keys(snakeCaseUpdates).filter(k => k !== 'id' && snakeCaseUpdates[k] !== undefined);
    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
    const values = keys.map(key => {
        const val = snakeCaseUpdates[key];
        return typeof val === 'object' && val !== null ? JSON.stringify(val) : val;
    });
    values.push(id);
    const text = `UPDATE ${table} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;
    return { text, values };
};

const buildInsertQuery = (table, data) => {
    const snakeCaseData = convertKeys(data, toSnakeCase);
    const keys = Object.keys(snakeCaseData).filter(k => snakeCaseData[k] !== undefined);
    const columns = keys.join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const values = keys.map(key => {
        const val = snakeCaseData[key];
        return typeof val === 'object' && val !== null ? JSON.stringify(val) : val;
    });
    const text = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
    return { text, values };
}

// ===================================
//              VETS / AUTH
// ===================================
export const getVetByEmail = async (email) => (await query('SELECT * FROM vets WHERE email = $1', [email]))[0];
export const getVets = async () => await query('SELECT id, name, email, specialty, is_super_admin, company_roles FROM vets ORDER BY name');
export const addVet = async (data) => (await query(...Object.values(buildInsertQuery('vets', { ...data, companyRoles: {} }))))[0];
export const updateVet = async (id, updates) => (await query(...Object.values(buildUpdateQuery('vets', id, updates))))[0];
export const deleteVet = async (id) => await query('DELETE FROM vets WHERE id = $1', [id]);

export const assignVetRoles = async (vetId, companyId, roleIds) => {
    const vet = (await query('SELECT * FROM vets WHERE id = $1', [vetId]))[0];
    const companyRoles = vet.companyRoles || {};
    companyRoles[companyId] = roleIds;
    return await updateVet(vetId, { companyRoles });
};

export const removeVetFromCompany = async (vetId, companyId) => {
    const vet = (await query('SELECT * FROM vets WHERE id = $1', [vetId]))[0];
    const companyRoles = vet.companyRoles || {};
    delete companyRoles[companyId];
    return await updateVet(vetId, { companyRoles });
};

// ===================================
//         COMPANIES & ROLES
// ===================================
export const getRoles = async () => await query('SELECT * FROM roles ORDER BY name');
export const getCompanies = async () => await query('SELECT * FROM companies ORDER BY name');
export const getCompaniesForVet = async (vet) => {
    if (vet.isSuperAdmin) return await getCompanies();
    const companyIds = Object.keys(vet.companyRoles || {});
    if (companyIds.length === 0) return [];
    return await query(`SELECT * FROM companies WHERE id = ANY($1::uuid[])`, [companyIds]);
};
export const addCompany = async (data) => (await query(...Object.values(buildInsertQuery('companies', data))))[0];
export const updateCompany = async (id, updates) => (await query(...Object.values(buildUpdateQuery('companies', id, updates))))[0];
export const deleteCompany = async (id) => await query('DELETE FROM companies WHERE id = $1', [id]);

// ===================================
//         GENERIC CRUD HELPERS
// ===================================
const genericCompanyGetter = (table, orderBy = 'created_at DESC') => (companyId) => {
    const orderClause = orderBy ? `ORDER BY ${orderBy}` : '';
    return query(`SELECT * FROM ${table} WHERE company_id = $1 ${orderClause}`, [companyId]);
};

const genericGetById = (table) => (id) => query(`SELECT * FROM ${table} WHERE id = $1`, [id]).then(res => res[0]);
const genericAdd = (table) => (companyId, data) => query(...Object.values(buildInsertQuery(table, { companyId, ...data }))).then(res => res[0]);
const genericUpdate = (table) => (id, updates) => query(...Object.values(buildUpdateQuery(table, id, updates))).then(res => res[0]);
const genericDelete = (table) => (id) => query(`DELETE FROM ${table} WHERE id = $1`, [id]);

// ===================================
//         ENTITY-SPECIFIC DB FUNCTIONS
// ===================================
export const getClients = genericCompanyGetter('clients');
export const getPets = genericCompanyGetter('pets');
export const getAppointments = genericCompanyGetter('appointments', 'date ASC, time ASC');
export const getProducts = genericCompanyGetter('products', 'name ASC');
export const getPurchases = genericCompanyGetter('purchases');

export const getInvoices = async (companyId) => {
    const invoices = await query(`SELECT * FROM invoices WHERE company_id = $1 ORDER BY date DESC, created_at DESC`, [companyId]);
    if (!invoices || invoices.length === 0) return [];
    
    const clientIds = [...new Set(invoices.map(i => i.clientId))];
    const clients = await query(`SELECT id, name, email, phone, address, identification_number, billing_address, member_since, balance FROM clients WHERE id = ANY($1::uuid[])`, [clientIds]);
    const clientsById = Object.fromEntries(clients.map(c => [c.id, c]));
    
    const petIds = [...new Set(invoices.map(i => i.petId).filter(Boolean))];
    let petsById = {};
    if (petIds.length > 0) {
      const pets = await query(`SELECT * FROM pets WHERE id = ANY($1::uuid[])`, [petIds]);
      petsById = Object.fromEntries(pets.map(p => [p.id, p]));
    }

    return invoices.map(invoice => ({
        ...invoice,
        client: clientsById[invoice.clientId] || null,
        pet: invoice.petId ? petsById[invoice.petId] : null
    }));
};

export const getReminders = genericCompanyGetter('reminders');
export const getHospitalizations = genericCompanyGetter('hospitalizations');
export const getSuppliers = genericCompanyGetter('suppliers', 'name ASC');
export const getPointsOfSale = genericCompanyGetter('points_of_sale', 'name ASC');
export const getCashierShifts = genericCompanyGetter('cashier_shifts');
export const getExpenseCategories = genericCompanyGetter('expense_categories', 'name ASC');
export const getExpenses = genericCompanyGetter('expenses');
export const getInternalConsumptions = genericCompanyGetter('internal_consumptions');
export const getPrescriptions = genericCompanyGetter('prescriptions');

export const getVetsByCompany = async (companyId) => {
    const allVets = await getVets();
    return allVets.filter(v => v.companyRoles && v.companyRoles[companyId]);
};

export const getClientById = genericGetById('clients');
export const getPetById = genericGetById('pets');
export const getInvoiceById = async (id) => {
    const invoice = (await query('SELECT * FROM invoices WHERE id = $1', [id]))[0];
    if (!invoice) return null;
    const client = (await query('SELECT id, name, email, phone, address, identification_number, billing_address, member_since, balance FROM clients WHERE id = $1', [invoice.clientId]))[0] || null;
    const pet = invoice.petId ? (await query('SELECT * FROM pets WHERE id = $1', [invoice.petId]))[0] : null;
    return { ...invoice, client, pet };
};

export const addClient = (companyId, data) => genericAdd('clients')(companyId, { ...data, pets: [], balance: 0, memberSince: new Date().toISOString() });
export const addPet = (companyId, ownerId, data) => genericAdd('pets')(companyId, {
    ...data,
    ownerId,
    weightHistory: [],
    medicalRecords: [],
    prescriptions: [],
    photoUrl: data.photoUrl || 'https://i.imgur.com/TAm9t51.png'
});
export const addAppointment = genericAdd('appointments');
export const addProduct = async (companyId, data) => {
    const { initialStock, ...productData } = data;
    if (initialStock > 0 && !productData.usesLotTracking) {
        productData.lots = [{ id: `lot_${Date.now()}`, lotNumber: 'N/A', quantity: initialStock }];
    } else {
        productData.lots = [];
    }
    return genericAdd('products')(companyId, productData);
};

export const addPurchase = async (companyId, data) => {
    const product = (await query('SELECT id, name, lots, uses_lot_tracking FROM products WHERE id = $1', [data.productId]))[0];
    const supplier = (await query('SELECT name FROM suppliers WHERE id = $1', [data.supplierId]))[0];

    if (!product) throw new Error(`Product not found: ${data.productId}`);
    if (!supplier) throw new Error(`Supplier not found: ${data.supplierId}`);

    const purchaseData = { 
        ...data,
        productName: product.name,
        supplierName: supplier.name,
        expirationDate: data.expirationDate || null,
        date: new Date().toISOString()
    };
    const purchase = await genericAdd('purchases')(companyId, purchaseData);
    
    const newLots = [...(product.lots || [])];
    if (product.usesLotTracking) {
        newLots.push({ id: `lot_${Date.now()}`, lotNumber: purchase.lotNumber, quantity: purchase.quantity, expirationDate: purchase.expirationDate });
    } else {
        if (newLots.length === 0) newLots.push({ id: `lot_${Date.now()}`, lotNumber: 'N/A', quantity: 0 });
        newLots[0].quantity += purchase.quantity;
    }
    await updateProduct(product.id, { lots: newLots });
    
    return purchase;
};

export const addMedicalRecord = async (companyId, petId, data) => {
    const { weight, temperature, reminderDays, invoiceItems, attachments, ...recordData } = data;
    
    const pet = await getPetById(petId);
    if (!pet) throw new Error(`Pet with id ${petId} not found.`);
    
    const record = await genericAdd('medical_records')(companyId, { ...recordData, petId, attachments: attachments || [], invoiceItems: invoiceItems || [] });
    
    const petUpdates = { medicalRecords: [...(pet.medicalRecords || []), record] };
    if (weight) {
        petUpdates.weightHistory = [...(pet.weightHistory || []), { date: recordData.date, weight }];
    }
    await updatePet(petId, petUpdates);
    
    if (reminderDays && reminderDays > 0) {
        const client = await getClientById(pet.ownerId);
        const dueDate = new Date(record.date);
        dueDate.setDate(dueDate.getDate() + reminderDays);
        await genericAdd('reminders')(companyId, { 
            petId, clientId: client.id, petName: pet.name, clientName: client.name,
            dueDate: dueDate.toISOString().split('T')[0], 
            message: `Seguimiento para: ${record.reason}`, 
            category: record.category, 
            relatedRecordId: record.id,
            status: 'Pendiente'
        });
    }

    let createdInvoice = null;
    if (data.action === 'bill' && invoiceItems && invoiceItems.length > 0) {
        createdInvoice = await addCounterSale(companyId, { clientId: pet.ownerId, petId: pet.id, items: invoiceItems, source: 'medical_record' });
        await updateMedicalRecord(record.id, { invoiceId: createdInvoice.id });
    }

    return { record, invoice: createdInvoice };
};

export const addPrescription = async(companyId, data) => {
    const prescription = await genericAdd('prescriptions')(companyId, data);
    const pet = await getPetById(prescription.petId);
    if (pet) {
        const updatedPrescriptions = [...(pet.prescriptions || []), prescription];
        await updatePet(pet.id, { prescriptions: updatedPrescriptions });
    }
    return prescription;
};

export const addSupplier = genericAdd('suppliers');
export const addPointOfSale = genericAdd('points_of_sale');
export const addExpenseCategory = genericAdd('expense_categories');

// Modified addExpense to handle shift updates
export const addExpense = async (companyId, data) => {
    const expenseData = { ...data, date: new Date().toISOString() };
    const expense = await genericAdd('expenses')(companyId, expenseData);

    // If expense is paid from a cashier shift, update the shift
    if (expense.cashierShiftId) {
        const shift = await genericGetById('cashier_shifts')(expense.cashierShiftId);
        if (shift) {
            const shiftExpenses = [...(shift.expenses || []), expense];
            const newCalculatedTotal = parseFloat(shift.calculatedCashTotal) - parseFloat(expense.amount);
            await genericUpdate('cashier_shifts')(shift.id, {
                expenses: shiftExpenses,
                calculatedCashTotal: newCalculatedTotal,
            });
        }
    }

    return expense;
};


export const addInternalConsumption = async (companyId, data) => {
    const product = await getProducts(companyId).then(ps => ps.find(p => p.id === data.productId));
    if (!product) throw new Error('Product not found for consumption');
    
    const consumptionData = { ...data, productName: product.name, lotNumber: 'N/A', date: new Date().toISOString() };

    const newLots = [...(product.lots || [])];
    let lotToUpdateIndex;

    if (product.usesLotTracking) {
        lotToUpdateIndex = newLots.findIndex(l => l.id === data.lotId);
        if (lotToUpdateIndex === -1 || newLots[lotToUpdateIndex].quantity < data.quantity) throw new Error('Insufficient stock in selected lot');
        consumptionData.lotNumber = newLots[lotToUpdateIndex].lotNumber;
    } else {
        lotToUpdateIndex = 0; // Assume single lot for non-tracked items
        if (!newLots[lotToUpdateIndex] || newLots[lotToUpdateIndex].quantity < data.quantity) throw new Error('Insufficient stock');
    }

    newLots[lotToUpdateIndex].quantity -= data.quantity;
    await updateProduct(product.id, { lots: newLots.filter(l => l.quantity > 0) });
    
    return await genericAdd('internal_consumptions')(companyId, consumptionData);
};

// --- Invoicing and Sales ---
const calculateInvoiceTotals = (items, taxRate) => {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalDiscount = items.reduce((sum, item) => {
        const itemTotal = item.price * item.quantity;
        const discount = (item.discountPercentage ? (itemTotal * (item.discountPercentage / 100)) : (item.discountAmount || 0));
        return sum + discount;
    }, 0);
    const taxableAmount = subtotal - totalDiscount;
    const tax = taxableAmount * taxRate;
    const total = taxableAmount + tax;
    return { subtotal, totalDiscount, tax, total };
};

const getNextInvoiceNumber = async (companyId) => {
    const result = await query(
        `SELECT invoice_number FROM invoices 
         WHERE company_id = $1 AND invoice_number ~ '^[0-9]+$'
         ORDER BY CAST(invoice_number AS INTEGER) DESC 
         LIMIT 1`, 
        [companyId]
    );

    if (result.length > 0 && result[0].invoiceNumber) {
        const lastNumber = parseInt(result[0].invoiceNumber, 10);
        if (!isNaN(lastNumber)) {
            return lastNumber + 1;
        }
    }
    return 1;
};

export const addCounterSale = async (companyId, data) => {
    const { clientId, petId, items, skipStockDeduction = false } = data;
    const client = await getClientById(clientId);
    const pet = petId ? await getPetById(petId) : null;
    const company = (await query('SELECT * FROM companies WHERE id = $1', [companyId]))[0];

    if (!skipStockDeduction) {
        for (const item of items) {
            const product = await getProducts(companyId).then(ps => ps.find(p => p.id === item.id));
            if (product && product.category !== 'Servicio') {
                const newLots = [...(product.lots || [])];
                let remainingQty = item.quantity;
                if (product.usesLotTracking) {
                    const lotIndex = newLots.findIndex(l => l.id === item.lotId);
                    if (lotIndex === -1 || newLots[lotIndex].quantity < remainingQty) throw new Error(`Insufficient stock for lot ${item.lotNumber} of ${product.name}`);
                    newLots[lotIndex].quantity -= remainingQty;
                } else {
                    if (!newLots[0] || newLots[0].quantity < remainingQty) throw new Error(`Insufficient stock for ${product.name}`);
                    newLots[0].quantity -= remainingQty;
                }
                await updateProduct(product.id, { lots: newLots.filter(l => l.quantity > 0) });
            }
        }
    }
    
    const { subtotal, totalDiscount, tax, total } = calculateInvoiceTotals(items, company.taxRate);
    const nextNumber = await getNextInvoiceNumber(companyId);

    const invoiceData = {
        invoiceNumber: String(nextNumber),
        clientId: client.id,
        petId: pet ? pet.id : null,
        date: new Date().toISOString(),
        items,
        status: 'No pagada',
        subtotal,
        totalDiscount,
        tax,
        total,
        amountPaid: 0,
        balanceDue: total,
        taxRate: company.taxRate,
        paymentHistory: [],
    };
    
    return genericAdd('invoices')(companyId, invoiceData);
};


export const updateInvoice = async (id, updates) => {
    const originalInvoice = await getInvoiceById(id);
    if (!originalInvoice) throw new Error('Invoice not found');

    if (updates.items) {
        const productsMap = new Map();
        const allProducts = await getProducts(originalInvoice.companyId);
        allProducts.forEach(p => productsMap.set(p.id, p));

        const adjustStock = async (items, operation) => {
            for (const item of items) {
                const product = productsMap.get(item.id);
                if (product && product.category !== 'Servicio') {
                    const newLots = [...product.lots];
                    const qty = operation === 'add' ? item.quantity : -item.quantity;

                    if (product.usesLotTracking) {
                        const lotIndex = newLots.findIndex(l => l.id === item.lotId);
                        if (lotIndex !== -1) {
                            newLots[lotIndex].quantity += qty;
                        } else if (operation === 'add') {
                             newLots.push({ id: item.lotId, lotNumber: item.lotNumber, quantity: item.quantity, expirationDate: product.lots.find(l=>l.id === item.lotId)?.expirationDate });
                        } else {
                            console.error(`Cannot find lot ${item.lotId} for product ${product.name} to deduct stock.`);
                            continue;
                        }
                    } else {
                        if (newLots.length > 0) {
                            newLots[0].quantity += qty;
                        } else if (operation === 'add') {
                            newLots.push({ id: `lot_${Date.now()}`, lotNumber: 'N/A', quantity: item.quantity });
                        }
                    }
                    const updatedProductData = await updateProduct(product.id, { lots: newLots.filter(l => l.quantity > 0) });
                    productsMap.set(product.id, updatedProductData);
                }
            }
        };

        await adjustStock(originalInvoice.items, 'add');
        await adjustStock(updates.items, 'subtract');

        const company = await query('SELECT tax_rate FROM companies WHERE id = $1', [originalInvoice.companyId]).then(r => r[0]);
        const { subtotal, totalDiscount, tax, total } = calculateInvoiceTotals(updates.items, company.taxRate);
        updates = { ...updates, subtotal, totalDiscount, tax, total, balanceDue: total - originalInvoice.amountPaid };
    }
    
    await genericUpdate('invoices')(id, updates);
    return await getInvoiceById(id);
};

export const recordPayment = async (invoiceId, paymentData) => {
    const invoice = await getInvoiceById(invoiceId);
    const newPayment = { ...paymentData, date: new Date().toISOString().split('T')[0] };
    const paymentHistory = [...invoice.paymentHistory, newPayment];
    const amountPaid = parseFloat(invoice.amountPaid) + parseFloat(newPayment.amount);
    const balanceDue = invoice.total - amountPaid;
    const status = balanceDue <= 0 ? 'Pagada' : 'No pagada';
    
    if (paymentData.cashierShiftId && paymentData.method === 'Efectivo') {
        const shift = await genericGetById('cashier_shifts')(paymentData.cashierShiftId);
        if (shift) {
            const shiftPayments = [...(shift.payments || []), { ...newPayment, invoiceId }];
            const newCalculatedTotal = parseFloat(shift.calculatedCashTotal) + parseFloat(newPayment.amount);
            await genericUpdate('cashier_shifts')(shift.id, { 
                payments: shiftPayments,
                calculatedCashTotal: newCalculatedTotal
            });
        }
    }
    
    return await updateInvoice(invoiceId, { paymentHistory, amountPaid, balanceDue, status });
};


// --- Hospitalizations ---
export const addHospitalization = (companyId, data) => genericAdd('hospitalizations')(companyId, {
    ...data,
    admissionDate: new Date().toISOString(), status: 'Activo',
    vitalSignsLog: [], medicationLog: [], progressNotes: [], attachments: [],
});

export const addHospitalizationLog = async (hospId, logData) => {
    const { logType, ...data } = logData;
    const hosp = await genericGetById('hospitalizations')(hospId);
    const logEntry = { ...data, id: `log_${Date.now()}`, timestamp: new Date().toISOString() };
    
    if (logType === 'med' && logEntry.productId && logEntry.quantity > 0) {
        const product = await getProducts(hosp.companyId).then(ps => ps.find(p => p.id === logEntry.productId));
        if (!product) throw new Error(`Product not found for medication log: ${logEntry.productId}`);

        logEntry.productName = product.name; 

        const newLots = [...(product.lots || [])];
        let lotToUpdateIndex;

        if (product.usesLotTracking) {
            lotToUpdateIndex = newLots.findIndex(l => l.id === logEntry.lotId);
            if (lotToUpdateIndex === -1 || newLots[lotToUpdateIndex].quantity < logEntry.quantity) {
                throw new Error(`Insufficient stock in lot for ${product.name}`);
            }
            logEntry.lotNumber = newLots[lotToUpdateIndex].lotNumber;
        } else {
            lotToUpdateIndex = 0;
            if (!newLots[lotToUpdateIndex] || newLots[lotToUpdateIndex].quantity < logEntry.quantity) {
                throw new Error(`Insufficient stock for ${product.name}`);
            }
        }
        
        newLots[lotToUpdateIndex].quantity -= logEntry.quantity;
        await updateProduct(product.id, { lots: newLots.filter(l => l.quantity > 0) });
    }
    
    let updateField;
    switch(logType) {
        case 'vital': updateField = 'vitalSignsLog'; break;
        case 'med': updateField = 'medicationLog'; break;
        case 'note': updateField = 'progressNotes'; break;
        default: throw new Error('Invalid log type');
    }
    const updatedLog = [...hosp[updateField], logEntry];
    return await genericUpdate('hospitalizations')(hospId, { [updateField]: updatedLog });
};

export const addAttachmentToHospitalization = async (hospId, attachmentData) => {
    const hosp = await genericGetById('hospitalizations')(hospId);
    const newAttachment = { ...attachmentData, id: `att_${Date.now()}`, uploadedAt: new Date().toISOString(), sourceId: hospId, sourceType: 'Hospitalization' };
    const updatedAttachments = [...hosp.attachments, newAttachment];
    return await genericUpdate('hospitalizations')(hospId, { attachments: updatedAttachments });
};

export const updateHospitalizationPlan = (hospId, plan) => genericUpdate('hospitalizations')(hospId, { treatmentPlan: plan });

export const dischargePatient = async (hospId, data) => {
    const hosp = await genericGetById('hospitalizations')(hospId);
    if (!hosp) throw new Error('Hospitalization not found');

    const unbilledMedications = hosp.medicationLog.filter(log => !log.invoiceId);

    let createdInvoice = null;
    let updatedMedicationLog = hosp.medicationLog;

    if (unbilledMedications.length > 0) {
        const productsMap = new Map();
        const allProducts = await getProducts(hosp.companyId);
        allProducts.forEach(p => productsMap.set(p.id, p));

        const invoiceItems = unbilledMedications.map(log => {
            const product = productsMap.get(log.productId);
            if (!product) return null;

            return {
                id: product.id,
                name: log.productName,
                description: `Administered during hospitalization on ${new Date(log.timestamp).toLocaleDateString()}`,
                quantity: log.quantity,
                price: product.salePrice,
                lotId: log.lotId,
                lotNumber: log.lotNumber,
                discountPercentage: product.discountPercentage || 0,
            };
        }).filter(Boolean);

        if (invoiceItems.length > 0) {
            createdInvoice = await addCounterSale(hosp.companyId, {
                clientId: hosp.clientId,
                petId: hosp.petId,
                items: invoiceItems,
                skipStockDeduction: true // Stock was already deducted when logged
            });
            
            updatedMedicationLog = hosp.medicationLog.map(log =>
                !log.invoiceId ? { ...log, invoiceId: createdInvoice.id } : log
            );
            data.medicationLog = updatedMedicationLog;
        }
    }
    
    const dischargeDate = new Date().toISOString();
    const updatedHosp = await genericUpdate('hospitalizations')(hospId, { ...data, dischargeDate, status: 'De alta', invoiceId: createdInvoice?.id });

    return { hospitalization: updatedHosp, invoice: createdInvoice };
};


// --- Cashier ---
export const openCashierShift = async (companyId, data) => {
    const pointOfSale = await query("SELECT name FROM points_of_sale WHERE id = $1", [data.pointOfSaleId]).then(r => r[0]);
    if (!pointOfSale) throw new Error('Point of sale not found');
    
    return genericAdd('cashier_shifts')(companyId, {
        ...data,
        pointOfSaleName: pointOfSale.name,
        status: 'Abierto',
        openingTime: new Date().toISOString(),
        payments: [],
        expenses: [],
        calculatedCashTotal: 0,
    });
};

export const closeCashierShift = async (shiftId, data) => {
    const shift = await genericGetById('cashier_shifts')(shiftId);
    if (!shift) {
        throw new Error('Shift not found to close.');
    }

    const { closingBalance } = data;
    
    const openingBalanceNum = parseFloat(shift.openingBalance) || 0;
    const calculatedCashTotalNum = parseFloat(shift.calculatedCashTotal) || 0;
    const closingBalanceNum = parseFloat(closingBalance) || 0;
    
    const expectedCash = openingBalanceNum + calculatedCashTotalNum;
    const difference = closingBalanceNum - expectedCash;
    
    const updates = {
        ...data,
        status: 'Cerrado',
        closingTime: new Date().toISOString(),
        difference: difference,
    };

    return genericUpdate('cashier_shifts')(shiftId, updates);
};


export const updateClient = genericUpdate('clients');
export const updatePet = genericUpdate('pets');
export const updateAppointment = genericUpdate('appointments');
export const updateProduct = genericUpdate('products');
export const updateMedicalRecord = genericUpdate('medical_records');
export const updateSupplier = genericUpdate('suppliers');
export const updatePointOfSale = genericUpdate('points_of_sale');
export const updateExpenseCategory = genericUpdate('expense_categories');
export const updateReminderStatus = (id, { status }) => genericUpdate('reminders')(id, { status });

export const deleteClient = genericDelete('clients');
export const deletePet = genericDelete('pets');
export const deleteAppointment = genericDelete('appointments');
export const deleteProduct = genericDelete('products');
export const deleteMedicalRecord = genericDelete('medical_records');
export const deleteSupplier = genericDelete('suppliers');
export const deletePointOfSale = genericDelete('points_of_sale');
export const deleteExpenseCategory = genericDelete('expense_categories');
