import express from 'express';
import { GoogleGenAI } from "@google/genai";
import * as db from '../../db.js';

const router = express.Router();

const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ===================================
//              AUTH
// ===================================
router.post('/auth/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const vet = await db.getVetByEmail(email);

    if (vet && vet.password === password) { // In real app, use bcrypt.compare
        const companies = await db.getCompaniesForVet(vet);
        res.json({ vet, companies });
    } else {
        res.status(401).json({ message: 'Credenciales inválidas.' });
    }
}));


// ===================================
//              SUPER ADMIN
// ===================================
router.get('/vets', asyncHandler(async(req, res) => res.json(await db.getVets())));
router.post('/vets', asyncHandler(async(req, res) => res.status(201).json(await db.addVet(req.body))));
router.put('/vets/:id', asyncHandler(async(req, res) => res.json(await db.updateVet(req.params.id, req.body))));
router.delete('/vets/:id', asyncHandler(async(req, res) => { await db.deleteVet(req.params.id); res.status(204).send(); }));

router.get('/roles', asyncHandler(async(req, res) => res.json(await db.getRoles())));
router.get('/companies', asyncHandler(async(req, res) => res.json(await db.getCompanies())));
router.post('/companies', asyncHandler(async(req, res) => res.status(201).json(await db.addCompany(req.body))));
router.put('/companies/:id', asyncHandler(async(req, res) => res.json(await db.updateCompany(req.params.id, req.body))));
router.delete('/companies/:id', asyncHandler(async(req, res) => { await db.deleteCompany(req.params.id); res.status(204).send(); }));

router.post('/vets/:vetId/assign-roles', asyncHandler(async (req, res) => {
    const { vetId } = req.params;
    const { companyId, roleIds } = req.body;
    const updatedVet = await db.assignVetRoles(vetId, companyId, roleIds);
    res.json(updatedVet);
}));
router.delete('/vets/:vetId/assign-roles', asyncHandler(async (req, res) => {
    const { vetId } = req.params;
    const { companyId } = req.body;
    const updatedVet = await db.removeVetFromCompany(vetId, companyId);
    res.json(updatedVet);
}));

// ===================================
//         COMPANY-SCOPED GETTERS
// ===================================
const companyResourceGetter = (dbFunction) => asyncHandler(async (req, res) => {
    res.json(await dbFunction(req.params.companyId));
});

router.get('/companies/:companyId/clients', companyResourceGetter(db.getClients));
router.get('/companies/:companyId/pets', companyResourceGetter(db.getPets));
router.get('/companies/:companyId/appointments', companyResourceGetter(db.getAppointments));
router.get('/companies/:companyId/products', companyResourceGetter(db.getProducts));
router.get('/companies/:companyId/purchases', companyResourceGetter(db.getPurchases));
router.get('/companies/:companyId/invoices', companyResourceGetter(db.getInvoices));
router.get('/companies/:companyId/reminders', companyResourceGetter(db.getReminders));
router.get('/companies/:companyId/hospitalizations', companyResourceGetter(db.getHospitalizations));
router.get('/companies/:companyId/suppliers', companyResourceGetter(db.getSuppliers));
router.get('/companies/:companyId/points-of-sale', companyResourceGetter(db.getPointsOfSale));
router.get('/companies/:companyId/cashier-shifts', companyResourceGetter(db.getCashierShifts));
router.get('/companies/:companyId/expense-categories', companyResourceGetter(db.getExpenseCategories));
router.get('/companies/:companyId/expenses', companyResourceGetter(db.getExpenses));
router.get('/companies/:companyId/internal-consumptions', companyResourceGetter(db.getInternalConsumptions));
router.get('/companies/:companyId/prescriptions', companyResourceGetter(db.getPrescriptions));
router.get('/companies/:companyId/vets', companyResourceGetter(db.getVetsByCompany));

// ===================================
//          GENERIC CRUD ROUTES
// ===================================
const setupCrudRoutes = (resource, dbFunctions) => {
    const { add, getById, update, del } = dbFunctions;
    const singleResource = resource.slice(0, -1); // 'clients' -> 'client'

    if (getById) router.get(`/${resource}/:id`, asyncHandler(async (req, res) => {
        const item = await getById(req.params.id);
        if (item) res.json(item);
        else res.status(404).json({ message: `${singleResource} not found` });
    }));
    
    if (add) router.post('/companies/:companyId/' + resource, asyncHandler(async (req, res) => {
        res.status(201).json(await add(req.params.companyId, req.body));
    }));
    
    if (update) router.put(`/${resource}/:id`, asyncHandler(async (req, res) => {
        const updatedItem = await update(req.params.id, req.body);
        if (updatedItem) res.json(updatedItem);
        else res.status(404).json({ message: `${singleResource} not found` });
    }));

    if (del) router.delete(`/${resource}/:id`, asyncHandler(async (req, res) => {
        await del(req.params.id);
        res.status(204).send();
    }));
};

setupCrudRoutes('clients', { add: db.addClient, getById: db.getClientById, update: db.updateClient, del: db.deleteClient });
setupCrudRoutes('pets', { getById: db.getPetById, update: db.updatePet, del: db.deletePet });
router.post('/companies/:companyId/clients/:ownerId/pets', asyncHandler(async(req,res) => res.status(201).json(await db.addPet(req.params.companyId, req.params.ownerId, req.body))));

setupCrudRoutes('appointments', { add: db.addAppointment, update: db.updateAppointment, del: db.deleteAppointment });
setupCrudRoutes('products', { add: db.addProduct, update: db.updateProduct, del: db.deleteProduct });
setupCrudRoutes('purchases', { add: db.addPurchase });
setupCrudRoutes('suppliers', { add: db.addSupplier, update: db.updateSupplier, del: db.deleteSupplier });
setupCrudRoutes('points-of-sale', { add: db.addPointOfSale, update: db.updatePointOfSale, del: db.deletePointOfSale });
setupCrudRoutes('expense-categories', { add: db.addExpenseCategory, update: db.updateExpenseCategory, del: db.deleteExpenseCategory });
setupCrudRoutes('expenses', { add: db.addExpense });
setupCrudRoutes('internal-consumptions', { add: db.addInternalConsumption });
setupCrudRoutes('prescriptions', { add: db.addPrescription });
// ... more specific routes below

// ===================================
//          COMPLEX ROUTES
// ===================================

// --- Medical Records ---
router.post('/companies/:companyId/pets/:petId/medical-records', asyncHandler(async(req, res) => {
    res.status(201).json(await db.addMedicalRecord(req.params.companyId, req.params.petId, req.body));
}));
router.put('/medical-records/:id', asyncHandler(async(req, res) => res.json(await db.updateMedicalRecord(req.params.id, req.body))));
router.delete('/medical-records/:id', asyncHandler(async(req, res) => { await db.deleteMedicalRecord(req.params.id); res.status(204).send(); }));

// --- Invoices ---
router.put('/invoices/:id', asyncHandler(async (req, res) => res.json(await db.updateInvoice(req.params.id, req.body))));
router.post('/invoices/:invoiceId/payments', asyncHandler(async (req, res) => res.json(await db.recordPayment(req.params.invoiceId, req.body))));
router.post('/companies/:companyId/counter-sales', asyncHandler(async (req, res) => res.status(201).json(await db.addCounterSale(req.params.companyId, req.body))));

// --- Hospitalizations ---
router.post('/companies/:companyId/hospitalizations', asyncHandler(async (req, res) => res.status(201).json(await db.addHospitalization(req.params.companyId, req.body))));
router.post('/hospitalizations/:hospId/logs', asyncHandler(async (req, res) => res.status(201).json(await db.addHospitalizationLog(req.params.hospId, req.body))));
router.post('/hospitalizations/:hospId/attachments', asyncHandler(async (req, res) => res.status(201).json(await db.addAttachmentToHospitalization(req.params.hospId, req.body))));
router.put('/hospitalizations/:hospId/plan', asyncHandler(async (req, res) => res.json(await db.updateHospitalizationPlan(req.params.hospId, req.body.plan))));
router.post('/hospitalizations/:hospId/discharge', asyncHandler(async (req, res) => res.json(await db.dischargePatient(req.params.hospId, req.body))));


// --- Reminders ---
router.put('/reminders/:id/status', asyncHandler(async(req, res) => res.json(await db.updateReminderStatus(req.params.id, req.body))));

// --- Cashier Shifts ---
router.post('/companies/:companyId/cashier-shifts/open', asyncHandler(async (req, res) => {
    res.status(201).json(await db.openCashierShift(req.params.companyId, req.body));
}));

router.post('/cashier-shifts/:shiftId/close', asyncHandler(async (req, res) => {
    res.json(await db.closeCashierShift(req.params.shiftId, req.body));
}));


// ===================================
//              AI & PDF
// ===================================
router.post('/ai/generate-summary', async (req, res) => {
    const { records } = req.body;
    if (!process.env.API_KEY) return res.status(500).json({ message: "API key not configured." });
    
    const prompt = `Eres un asistente veterinario. Resume el siguiente historial médico, enfocándote en condiciones crónicas, eventos significativos y problemas recurrentes. Usa viñetas. Historial: ${JSON.stringify(records)}`;
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
        res.json({ summary: response.text });
    } catch (error) {
        console.error("Gemini Error:", error);
        res.status(500).json({ message: 'Error con el servicio de IA.' });
    }
});

router.get('/prescriptions/:id/pdf', (req, res) => {
    res.type('text/plain').send(`Placeholder for PDF of prescription ${req.params.id}.`);
});

// ===================================
//              ERROR HANDLER
// ===================================
router.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'An internal server error occurred', error: err.message });
});

export default router;