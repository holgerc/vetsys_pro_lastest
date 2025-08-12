

import React, { useState, useCallback, useEffect } from 'react';
import { View, Pet, Client, Appointment, MedicalRecord, Product, Purchase, Invoice, Payment, Vet, Reminder, Hospitalization, Company, Role, Permission, AttachedFile, DischargeOutcome, Supplier, PointOfSale, CashierShift, Expense, ExpenseCategory, InternalConsumption } from './types';
import * as api from './services/mockData';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Clients } from './components/Clients';
import { PetDetailComponent } from './components/PetDetail';
import { LoginScreen } from './components/LoginScreen';
import { SettingsComponent } from './components/Settings';
import { InventoryComponent } from './components/Inventory';
import { PurchasesComponent } from './components/Purchases';
import { BillingComponent } from './components/Billing';
import { InvoiceDetailComponent } from './components/InvoiceDetail';
import { AppointmentsComponent } from './components/Appointments';
import { HospitalizationComponent } from './components/Hospitalization';
import { SuppliersComponent } from './components/Suppliers';
import { CashierComponent } from './components/Cashier';
import { ExpensesComponent } from './components/Expenses';
import { ConsumptionComponent } from './components/Consumption';


const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
    const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

    // Auth & Tenancy State
    const [currentUser, setCurrentUser] = useState<Vet | null>(null);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
    const [currentCompany, setCurrentCompany] = useState<Company | null>(null);

    // Data State
    const [vets, setVets] = useState<Vet[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [pets, setPets] = useState<Pet[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [hospitalizations, setHospitalizations] = useState<Hospitalization[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [pointsOfSale, setPointsOfSale] = useState<PointOfSale[]>([]);
    const [cashierShifts, setCashierShifts] = useState<CashierShift[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
    const [internalConsumptions, setInternalConsumptions] = useState<InternalConsumption[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refreshData = useCallback(async (companyId: string) => {
        setIsLoading(true);
        try {
            const [
                vetsData, rolesData, clientsData, petsData, appointmentsData,
                productsData, purchasesData, invoicesData, remindersData,
                hospitalizationsData, suppliersData, pointsOfSaleData,
                cashierShiftsData, expensesData, expenseCategoriesData, internalConsumptionsData
            ] = await Promise.all([
                api.getVets(),
                api.getRoles(),
                api.getClients(companyId),
                api.getPets(companyId),
                api.getAppointments(companyId),
                api.getProducts(companyId),
                api.getPurchases(companyId),
                api.getInvoices(companyId),
                api.getReminders(companyId),
                api.getHospitalizations(companyId),
                api.getSuppliers(companyId),
                api.getPointsOfSale(companyId),
                api.getCashierShifts(companyId),
                api.getExpenses(companyId),
                api.getExpenseCategories(companyId),
                api.getInternalConsumptions(companyId)
            ]);
            
            // --- AGGREGATION STEP ---
            const clientsWithPets = clientsData.map((client: Client) => ({
                ...client,
                pets: petsData.filter((pet: Pet) => pet.ownerId === client.id) || []
            }));

            setVets(vetsData);
            setRoles(rolesData);
            setClients(clientsWithPets as Client[]); // Use aggregated data
            setPets(petsData);
            setAppointments(appointmentsData);
            setProducts(productsData);
            setPurchases(purchasesData);
            setInvoices(invoicesData);
            setReminders(remindersData);
            setHospitalizations(hospitalizationsData);
            setSuppliers(suppliersData);
            setPointsOfSale(pointsOfSaleData);
            setCashierShifts(cashierShiftsData);
            setExpenses(expensesData);
            setExpenseCategories(expenseCategoriesData);
            setInternalConsumptions(internalConsumptionsData);
        } catch (error) {
            console.error("Failed to refresh data:", error);
            // Optional: Show an error message to the user
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadInitialData = async () => {
            if (currentCompany) {
                await refreshData(currentCompany.id);
            } else if (currentUser?.isSuperAdmin) {
                setIsLoading(true);
                const [vetsData, rolesData] = await Promise.all([api.getVets(), api.getRoles()]);
                setVets(vetsData);
                setRoles(rolesData);
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, [currentCompany, currentUser, refreshData]);

    // --- NEW: Dynamic Theming Effect ---
    useEffect(() => {
        const companyTheme = currentCompany?.theme;
        const root = document.documentElement;

        const primaryColor = companyTheme?.primary || '#1a73e8';
        const primaryLightColor = companyTheme?.primaryLight || '#e8f0fe';
        const accentColor = companyTheme?.accent || '#1e8e3e';

        root.style.setProperty('--color-primary', primaryColor);
        root.style.setProperty('--color-primary-light', primaryLightColor);
        root.style.setProperty('--color-accent', accentColor);
    }, [currentCompany]);


    // --- RBAC Permission Checker ---
    const hasPermission = useCallback((permission: Permission): boolean => {
        if (!currentUser) return false;
        if (currentUser.isSuperAdmin) return true;
        if (!currentCompany) return false;
        
        const roleIds = currentUser.companyRoles?.[currentCompany.id];
        if (!roleIds || roleIds.length === 0) return false;
        
        for (const roleId of roleIds) {
            const role = roles.find(r => r.id === roleId);
            if (role && role.permissions.includes(permission)) {
                return true;
            }
        }
        
        return false;

    }, [currentUser, currentCompany, roles]);


    // --- Auth & Tenancy Handlers ---
    const handleLogin = async (email: string, pass: string) => {
        const result = await api.login(email, pass);
        if (result) {
            setCurrentUser(result.vet);
            setAvailableCompanies(result.companies);
            if (result.companies.length > 0) {
                setCurrentCompany(result.companies[0]);
            } else {
                setCurrentCompany(null);
            }
            setLoginError(null);
            setCurrentView(View.DASHBOARD);
        } else {
            setLoginError("Credenciales inválidas. Por favor, intente de nuevo.");
        }
    };
    const handleLogout = useCallback(() => {
        setCurrentUser(null);
        setAvailableCompanies([]);
        setCurrentCompany(null);
    }, []);

    const handleSwitchCompany = useCallback((company: Company) => {
        setCurrentCompany(company);
        setCurrentView(View.DASHBOARD);
    }, []);

    // --- Navigation ---
    const setView = useCallback((view: View) => { setCurrentView(view); }, []);

    const handleSetSelectedPet = useCallback(async (pet: Pet) => {
        if(currentCompany) setSelectedPet(await api.getPetById(currentCompany.id, pet.id) || null);
    }, [currentCompany]);

    const handleNavigateToPet = useCallback(async (petId: string) => {
        if(currentCompany) {
            const petToSelect = await api.getPetById(currentCompany.id, petId);
            if(petToSelect) { setSelectedPet(petToSelect); setView(View.PET_DETAIL); }
        }
    }, [currentCompany, setView]);

    const handleNavigateToInvoice = useCallback((invoiceId: string) => {
        setSelectedInvoiceId(invoiceId);
        setView(View.INVOICE_DETAIL);
    }, [setView]);
    
    // --- CRUD Handlers ---
    // All handler functions are wrapped in `useCallback` to ensure they have a stable identity
    // across re-renders. This prevents unnecessary re-rendering of child components and
    // avoids potential state loss, resolving the issue of being logged out on navigation.
    const handleAddClient = useCallback(async (data: any) => {
        if (!currentCompany) return;
        await api.addClient(currentCompany.id, data);
        await refreshData(currentCompany.id);
    }, [currentCompany, refreshData]);

    const handleAddPet = useCallback(async (ownerId: string, data: any) => {
        if (!currentCompany) return;
        await api.addPet(currentCompany.id, ownerId, data);
        await refreshData(currentCompany.id);
    }, [currentCompany, refreshData]);

    const handleAddAppointment = useCallback(async (data: any) => {
        if (!currentCompany) return;
        await api.addAppointment(currentCompany.id, data);
        await refreshData(currentCompany.id);
    }, [currentCompany, refreshData]);

    const handleAddProduct = useCallback(async (data: any) => {
        if (!currentCompany) return;
        await api.addProduct(currentCompany.id, data);
        await refreshData(currentCompany.id);
    }, [currentCompany, refreshData]);

    const handleAddPurchase = useCallback(async (data: any) => {
        if (!currentCompany) return;
        await api.addPurchase(currentCompany.id, data);
        await refreshData(currentCompany.id);
    }, [currentCompany, refreshData]);

    const handleAddCounterSale = useCallback(async (data: any) => {
        if (!currentCompany) return;
        await api.addCounterSale(currentCompany.id, data);
        await refreshData(currentCompany.id);
    }, [currentCompany, refreshData]);
    
    const handleAddHospitalization = useCallback(async (data: any) => {
        if (!currentCompany) return;
        await api.addHospitalization(currentCompany.id, data);
        await refreshData(currentCompany.id);
    }, [currentCompany, refreshData]);

    const handleAddAttachmentToHospitalization = useCallback(async (hospId: string, data: any) => {
        await api.addAttachmentToHospitalization(hospId, data);
        if (currentCompany) await refreshData(currentCompany.id);
    }, [currentCompany, refreshData]);

    const handleAddSupplier = useCallback(async (data: any) => {
        if (!currentCompany) return;
        await api.addSupplier(currentCompany.id, data);
        await refreshData(currentCompany.id);
    }, [currentCompany, refreshData]);

    const handleAddPointOfSale = useCallback(async (data: any) => {
        if (!currentCompany) return;
        await api.addPointOfSale(currentCompany.id, data);
        await refreshData(currentCompany.id);
    }, [currentCompany, refreshData]);
    
    const handleOpenCashierShift = useCallback(async (data: any) => {
        if (!currentCompany) return;
        await api.openCashierShift(currentCompany.id, data);
        await refreshData(currentCompany.id);
    }, [currentCompany, refreshData]);
    
    const handleAddExpense = useCallback(async (data: any) => {
        if (!currentCompany) return;
        await api.addExpense(currentCompany.id, data);
        await refreshData(currentCompany.id);
    }, [currentCompany, refreshData]);

    const handleAddExpenseCategory = useCallback(async (data: any) => {
        if (!currentCompany) return;
        await api.addExpenseCategory(currentCompany.id, data);
        await refreshData(currentCompany.id);
    }, [currentCompany, refreshData]);

    const handleAddInternalConsumption = useCallback(async (data: any) => {
        if (!currentCompany) return;
        await api.addInternalConsumption(currentCompany.id, data);
        await refreshData(currentCompany.id);
    }, [currentCompany, refreshData]);

    const handleAddMedicalRecord = useCallback(async (petId: string, data: any) => {
        if (!currentCompany) return null;
        const result = await api.addMedicalRecord(currentCompany.id, petId, data);
        if (currentCompany) {
            await refreshData(currentCompany.id);
            if (selectedPet && selectedPet.id === petId) {
                setSelectedPet(await api.getPetById(currentCompany.id, petId) || null);
            }
        }
        return result;
    }, [currentCompany, refreshData, selectedPet]);
    
     const handleAddPrescription = useCallback(async (data: any) => {
        if (!currentCompany) return null;
        const result = await api.addPrescription(currentCompany.id, data);
        if (currentCompany) {
            await refreshData(currentCompany.id);
             if (selectedPet && selectedPet.id === data.petId) {
                setSelectedPet(await api.getPetById(currentCompany.id, data.petId) || null);
            }
        }
        return result;
    }, [currentCompany, refreshData, selectedPet]);

    const handleAddVet = useCallback(async (data: any) => { await api.addVet(data); setVets(await api.getVets()); }, []);
    const handleUpdateVet = useCallback(async (id: string, data: any) => { await api.updateVet(id, data); setVets(await api.getVets()); }, []);
    const handleDeleteVet = useCallback(async (id: string) => { await api.deleteVet(id); setVets(await api.getVets()); }, []);
    
    const handleAssignVetRoles = useCallback(async (vetId: string, companyId: string, roleIds: string[]) => {
        await api.assignVetRoles(vetId, companyId, roleIds); 
        setVets(await api.getVets());
        if(currentCompany) await refreshData(currentCompany.id); 
    }, [currentCompany, refreshData]);

    const handleUnassignVetFromCompany = useCallback(async (vetId: string, companyId: string) => { 
        await api.removeVetFromCompany(vetId, companyId); 
        if(currentCompany) await refreshData(currentCompany.id); 
    }, [currentCompany, refreshData]);
    
    const handleAddCompany = useCallback(async (data: Omit<Company, 'id'>) => {
        const newComp = await api.addCompany(data);
        setAvailableCompanies(c => [...c, newComp]);
        if (!currentCompany) setCurrentCompany(newComp);
    }, [currentCompany]);

    const handleUpdateCompany = useCallback(async (companyId: string, data: Partial<Company>) => { 
        const updatedCompany = await api.updateCompany(companyId, data); 
        setAvailableCompanies(c => c.map(comp => comp.id === companyId ? updatedCompany! : comp)); 
        if(currentCompany?.id === companyId) { setCurrentCompany(updatedCompany || null); }
    }, [currentCompany]);

     const handleDeleteCompany = useCallback(async (companyId: string) => {
        await api.deleteCompany(companyId);
        const remainingCompanies = availableCompanies.filter(c => c.id !== companyId);
        setAvailableCompanies(remainingCompanies);

        if (currentCompany?.id === companyId) {
            const newCompany = remainingCompanies.length > 0 ? remainingCompanies[0] : null;
            setCurrentCompany(newCompany);
        }
    }, [availableCompanies, currentCompany]);

    const handleSimpleUpdate = useCallback(async (apiFn: Function, ...args: any[]) => {
        await apiFn(...args);
        if (currentCompany) await refreshData(currentCompany.id);
    }, [currentCompany, refreshData]);

    const handleUpdateAppointment = useCallback((id: string, data: Partial<Appointment>) => handleSimpleUpdate(api.updateAppointment, id, data), [handleSimpleUpdate]);
    const handleUpdateProduct = useCallback((id: string, data: Partial<Product>) => handleSimpleUpdate(api.updateProduct, id, data), [handleSimpleUpdate]);
    const handleUpdateSupplier = useCallback((id: string, data: Partial<Supplier>) => handleSimpleUpdate(api.updateSupplier, id, data), [handleSimpleUpdate]);
    const handleUpdatePointOfSale = useCallback((id: string, data: Partial<PointOfSale>) => handleSimpleUpdate(api.updatePointOfSale, id, data), [handleSimpleUpdate]);
    const handleDeleteClient = useCallback((id: string) => handleSimpleUpdate(api.deleteClient, id), [handleSimpleUpdate]);
    const handleDeleteAppointment = useCallback((id: string) => handleSimpleUpdate(api.deleteAppointment, id), [handleSimpleUpdate]);
    const handleDeleteProduct = useCallback((id: string) => handleSimpleUpdate(api.deleteProduct, id), [handleSimpleUpdate]);
    const handleDeleteSupplier = useCallback((id: string) => handleSimpleUpdate(api.deleteSupplier, id), [handleSimpleUpdate]);
    const handleDeletePointOfSale = useCallback((id: string) => handleSimpleUpdate(api.deletePointOfSale, id), [handleSimpleUpdate]);
    const handleUpdateReminderStatus = useCallback((id: string, status: Reminder['status']) => handleSimpleUpdate(api.updateReminderStatus, id, { status }), [handleSimpleUpdate]);
    const handleAddHospitalizationLog = useCallback((hospId: string, logType: string, data: any) => handleSimpleUpdate(api.addHospitalizationLog, hospId, logType, data), [handleSimpleUpdate]);
    const handleUpdateHospitalizationPlan = useCallback((hospId: string, plan: string) => handleSimpleUpdate(api.updateHospitalizationPlan, hospId, plan), [handleSimpleUpdate]);
    const handleCloseCashierShift = useCallback((shiftId: string, data: any) => handleSimpleUpdate(api.closeCashierShift, shiftId, data), [handleSimpleUpdate]);
    const handleUpdateExpenseCategory = useCallback((id: string, data: Partial<ExpenseCategory>) => handleSimpleUpdate(api.updateExpenseCategory, id, data), [handleSimpleUpdate]);
    const handleDeleteExpenseCategory = useCallback((id: string) => handleSimpleUpdate(api.deleteExpenseCategory, id), [handleSimpleUpdate]);
    const handleDeletePet = useCallback((id: string) => handleSimpleUpdate(api.deletePet, id), [handleSimpleUpdate]);
    const handleUpdateClientProp = useCallback((id: string, data: Partial<Client>) => handleSimpleUpdate(api.updateClient, id, data), [handleSimpleUpdate]);

    const handleUpdatePet = useCallback(async (petId: string, updates: Partial<Pet>) => {
        await api.updatePet(petId, updates);
        if (currentCompany) {
            await refreshData(currentCompany.id);
            if (selectedPet && selectedPet.id === petId) {
                setSelectedPet(await api.getPetById(currentCompany.id, petId) || null);
            }
        }
    }, [currentCompany, refreshData, selectedPet]);

    const handleUpdateInvoice = useCallback(async (invoiceId: string, updates: Partial<Invoice>) => {
        const updatedInvoice = await api.updateInvoice(invoiceId, updates);
        if (currentCompany) await refreshData(currentCompany.id);
        return updatedInvoice;
    }, [currentCompany, refreshData]);

    const handleDischargePatient = useCallback(async (hospId: string, dischargeData: { recommendations: string, outcome: DischargeOutcome }) => {
        const result = await api.dischargePatient(hospId, dischargeData);
        if (currentCompany) await refreshData(currentCompany.id);
        if (result && result.invoice) {
            handleNavigateToInvoice(result.invoice.id);
        }
    }, [currentCompany, refreshData, handleNavigateToInvoice]);
    
    const handleUpdateMedicalRecord = useCallback(async (recordId: string, updates: Partial<MedicalRecord>) => {
        await api.updateMedicalRecord(recordId, updates);
        if (currentCompany && selectedPet) {
            await refreshData(currentCompany.id);
            setSelectedPet(await api.getPetById(currentCompany.id, selectedPet.id) || null);
        }
    }, [currentCompany, refreshData, selectedPet]);

    const handleDeleteMedicalRecord = useCallback(async (recordId: string) => {
        await api.deleteMedicalRecord(recordId);
        if (currentCompany && selectedPet) {
            await refreshData(currentCompany.id);
            setSelectedPet(await api.getPetById(currentCompany.id, selectedPet.id) || null);
        }
    }, [currentCompany, refreshData, selectedPet]);

    const handleRecordPayment = useCallback(async (invoiceId: string, paymentData: { amount: number, method: Payment['method'], cashierShiftId?: string }) => {
        const updatedInvoice = await api.recordPayment(invoiceId, paymentData);
        if (currentCompany) await refreshData(currentCompany.id);
        if(updatedInvoice) setSelectedInvoiceId(updatedInvoice.id);
        return updatedInvoice;
    }, [currentCompany, refreshData]);
    

    const renderView = () => {
        if (isLoading) {
            return (
                 <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <h1 className="text-xl font-semibold text-brand-gray-700">
                           Cargando...
                        </h1>
                    </div>
                </div>
            );
        }
        
        if (!currentCompany && currentUser && !currentUser.isSuperAdmin) {
            return (
                <div className="p-8 text-center">
                    <h1 className="text-xl font-semibold text-brand-gray-700">Usted no está asignado a ninguna clínica.</h1>
                    <p className="text-brand-gray-600">Por favor, contacte a un administrador.</p>
                </div>
            );
        }

        switch (currentView) {
            case View.DASHBOARD:
                 if (!currentCompany) return <div className="p-8 text-center text-xl">Por favor seleccione una clínica en Configuración para ver el panel principal.</div>
                const todayStr = new Date().toISOString().split('T')[0];
                const todaysAppointments = appointments.filter(a => a.date === todayStr);
                return <Dashboard appointments={todaysAppointments} clients={clients} pets={pets} currentUser={currentUser!} reminders={reminders} onNavigateToPet={handleNavigateToPet} />;
            case View.APPOINTMENTS:
                 if (!currentCompany) return <div className="p-8 text-center text-xl">Por favor seleccione una clínica para gestionar las citas.</div>
                 return <AppointmentsComponent appointments={appointments} clients={clients} vets={vets} onAdd={handleAddAppointment} onUpdate={handleUpdateAppointment} onDelete={handleDeleteAppointment} hasPermission={hasPermission} />;
            case View.CLIENTS:
                 if (!currentCompany) return <div className="p-8 text-center text-xl">Por favor seleccione una clínica para gestionar los clientes.</div>
                return <Clients clients={clients} setView={setView} setSelectedPet={handleSetSelectedPet} onAddClient={handleAddClient} onUpdateClient={handleUpdateClientProp} onDeleteClient={handleDeleteClient} onAddPet={handleAddPet} onUpdatePet={handleUpdatePet} onDeletePet={handleDeletePet} hasPermission={hasPermission}/>;
            case View.PET_DETAIL:
                if (selectedPet) {
                    return <PetDetailComponent 
                        pet={selectedPet}
                        clients={clients}
                        currentCompany={currentCompany}
                        reminders={reminders.filter(r => r.petId === selectedPet.id)} 
                        hospitalizations={hospitalizations.filter(h => h.petId === selectedPet.id)}
                        products={products} 
                        vets={vets} 
                        currentUser={currentUser!} 
                        onBack={() => setView(View.CLIENTS)} 
                        onAddRecord={handleAddMedicalRecord} 
                        onUpdateRecord={handleUpdateMedicalRecord} 
                        onDeleteRecord={handleDeleteMedicalRecord}
                        onAddPrescription={handleAddPrescription}
                        onNavigateToInvoice={handleNavigateToInvoice} 
                        onUpdateReminderStatus={handleUpdateReminderStatus} 
                        onAddAttachmentToHospitalization={handleAddAttachmentToHospitalization}
                        onUpdatePet={handleUpdatePet}
                        hasPermission={hasPermission}
                    />;
                }
                setView(View.CLIENTS); return null;
            case View.EXPENSES:
                if (!currentCompany) return <div className="p-8 text-center text-xl">Por favor seleccione una clínica para gestionar los gastos.</div>
                return <ExpensesComponent
                    expenses={expenses}
                    expenseCategories={expenseCategories}
                    activeShifts={cashierShifts.filter(s => s.status === 'Abierto')}
                    currentUser={currentUser!}
                    onAddExpense={handleAddExpense}
                    onAddCategory={handleAddExpenseCategory}
                    onUpdateCategory={handleUpdateExpenseCategory}
                    onDeleteCategory={handleDeleteExpenseCategory}
                    hasPermission={hasPermission}
                />;
            case View.INVENTORY:
                 if (!currentCompany) return <div className="p-8 text-center text-xl">Por favor seleccione una clínica para gestionar el inventario.</div>
                return <InventoryComponent products={products} suppliers={suppliers} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} hasPermission={hasPermission} />;
            case View.CONSUMPTION:
                if (!currentCompany) return <div className="p-8 text-center text-xl">Por favor seleccione una clínica para gestionar el consumo.</div>
                return <ConsumptionComponent
                    products={products}
                    internalConsumptions={internalConsumptions}
                    currentUser={currentUser!}
                    onAddConsumption={handleAddInternalConsumption}
                    hasPermission={hasPermission}
                />;
            case View.PURCHASES:
                 if (!currentCompany) return <div className="p-8 text-center text-xl">Por favor seleccione una clínica para gestionar las compras.</div>
                return <PurchasesComponent products={products} purchases={purchases} suppliers={suppliers} onAddPurchase={handleAddPurchase} hasPermission={hasPermission}/>;
            case View.SUPPLIERS:
                if (!currentCompany) return <div className="p-8 text-center text-xl">Por favor seleccione una clínica para gestionar los proveedores.</div>
                return <SuppliersComponent suppliers={suppliers} onAddSupplier={handleAddSupplier} onUpdateSupplier={handleUpdateSupplier} onDeleteSupplier={handleDeleteSupplier} hasPermission={hasPermission} />;
            case View.BILLING:
                 if (!currentCompany) return <div className="p-8 text-center text-xl">Por favor seleccione una clínica para gestionar la facturación.</div>
                return <BillingComponent invoices={invoices} clients={clients} products={products} onNavigateToInvoice={handleNavigateToInvoice} onAddCounterSale={handleAddCounterSale} hasPermission={hasPermission}/>;
            case View.INVOICE_DETAIL:
                const invoice = invoices.find(i => i.id === selectedInvoiceId);
                const activeShifts = cashierShifts.filter(s => s.status === 'Abierto');
                return <InvoiceDetailComponent invoice={invoice || null} products={products} activeShifts={activeShifts} onBack={() => setView(View.BILLING)} onRecordPayment={handleRecordPayment} onUpdateInvoice={handleUpdateInvoice} hasPermission={hasPermission} currentCompany={currentCompany} />;
            case View.SETTINGS:
                 return <SettingsComponent 
                    vets={vets} 
                    roles={roles}
                    companies={availableCompanies}
                    currentCompany={currentCompany}
                    currentUser={currentUser!}
                    pointsOfSale={pointsOfSale}
                    onAddVet={handleAddVet} 
                    onUpdateVet={handleUpdateVet}
                    onDeleteVet={handleDeleteVet}
                    onAssignVetRoles={handleAssignVetRoles}
                    onUnassignVetFromCompany={handleUnassignVetFromCompany}
                    onAddCompany={handleAddCompany}
                    onUpdateCompany={handleUpdateCompany}
                    onDeleteCompany={handleDeleteCompany}
                    onAddPointOfSale={handleAddPointOfSale}
                    onUpdatePointOfSale={handleUpdatePointOfSale}
                    onDeletePointOfSale={handleDeletePointOfSale}
                    hasPermission={hasPermission}
                 />;
            case View.HOSPITALIZATION:
                 if (!currentCompany) return <div className="p-8 text-center text-xl">Por favor seleccione una clínica para gestionar la hospitalización.</div>
                 return <HospitalizationComponent 
                    hospitalizations={hospitalizations} 
                    clients={clients}
                    vets={vets}
                    products={products}
                    currentUser={currentUser!}
                    onAdmit={handleAddHospitalization}
                    onAddLog={handleAddHospitalizationLog}
                    onDischarge={handleDischargePatient}
                    onUpdatePlan={handleUpdateHospitalizationPlan}
                    onAddAttachment={handleAddAttachmentToHospitalization}
                    hasPermission={hasPermission}
                />;
            case View.CASHIER:
                 if (!currentCompany) return <div className="p-8 text-center text-xl">Por favor seleccione una clínica para gestionar la caja.</div>
                 return <CashierComponent
                    pointsOfSale={pointsOfSale}
                    cashierShifts={cashierShifts}
                    currentUser={currentUser!}
                    onOpenShift={handleOpenCashierShift}
                    onCloseShift={handleCloseCashierShift}
                    hasPermission={hasPermission}
                 />
            default:
                 if (!currentCompany) return <div className="p-8 text-center text-xl">Por favor seleccione una clínica.</div>
                return <Dashboard appointments={appointments} clients={clients} pets={pets} currentUser={currentUser!} reminders={reminders} onNavigateToPet={handleNavigateToPet} />;
        }
    };

    if (!currentUser) {
        return <LoginScreen onLogin={handleLogin} error={loginError} />;
    }
    
    return (
        <div className="flex h-screen bg-brand-gray-100">
            <Sidebar 
                currentView={currentView} 
                setView={setView} 
                currentUser={currentUser} 
                onLogout={handleLogout}
                availableCompanies={availableCompanies}
                currentCompany={currentCompany}
                onSwitchCompany={handleSwitchCompany}
                hasPermission={hasPermission}
            />
            <main className="flex-1 ml-64 overflow-y-auto bg-brand-gray-200">
                {renderView()}
            </main>
        </div>
    );
};

export default App;
