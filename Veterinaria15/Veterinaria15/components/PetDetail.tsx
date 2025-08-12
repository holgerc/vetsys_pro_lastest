
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Pet, MedicalRecord, WeightEntry, InvoiceItem, Product, Vet, ProductLot, Reminder, MedicalRecordCategory, Hospitalization, VitalSignEntry, MedicationLogEntry, ProgressNoteEntry, Permission, AttachedFile, Client, Company, Prescription, PrescriptionItem, Appointment } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { generateMedicalSummary } from '../services/geminiService';
import { requestPrescriptionPdf } from '../services/pdfService';
import { SparklesIcon, PencilIcon, TrashIcon, PlusCircleIcon, DocumentTextIcon, BellIcon, HeartbeatIcon, PaperclipIcon, DocumentReportIcon, HomeIcon } from './icons';
import { Modal, ConfirmationDialog } from './common';


interface PetDetailProps {
    pet: Pet;
    clients: Client[];
    currentCompany: Company | null;
    reminders: Reminder[];
    hospitalizations: Hospitalization[];
    products: Product[];
    vets: Vet[];
    currentUser: Vet;
    onBack: () => void;
    onAddRecord: (petId: string, data: Omit<MedicalRecord, 'id' | 'companyId' | 'invoiceId'> & {weight?: number, temperature?: number}) => Promise<{ record: MedicalRecord, invoice: any } | null>;
    onUpdateRecord: (recordId: string, data: Partial<MedicalRecord>) => void;
    onDeleteRecord: (recordId: string) => void;
    onAddPrescription: (data: Omit<Prescription, 'id' | 'companyId'>) => void;
    onUpdateReminderStatus: (reminderId: string, status: Reminder['status']) => void;
    onNavigateToInvoice: (invoiceId: string) => void;
    onAddAttachmentToHospitalization: (hospId: string, attachmentData: Omit<AttachedFile, 'id' | 'uploadedAt' | 'sourceId' | 'sourceType'>) => void,
    onUpdatePet: (petId: string, data: Partial<Pet>) => void;
    hasPermission: (permission: Permission) => boolean;
}

const PetInfoCard: React.FC<{ pet: Pet, onEditPhoto: () => void, canEdit: boolean }> = ({ pet, onEditPhoto, canEdit }) => (
    <div className="bg-white p-6 rounded-xl shadow-md flex items-start space-x-6">
        <div className="relative group flex-shrink-0">
            <img src={pet.photoUrl} alt={pet.name} className="h-32 w-32 rounded-full object-cover border-4 border-[var(--color-primary-light)]" />
            {canEdit && (
                 <button 
                    onClick={onEditPhoto}
                    className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center rounded-full transition-opacity duration-300"
                    aria-label="Change pet photo"
                >
                    <PencilIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                 </button>
            )}
        </div>
        <div className="flex-1">
            <h2 className="text-3xl font-bold text-brand-gray-800">{pet.name}</h2>
            <p className="text-brand-gray-600 text-lg">{pet.breed}</p>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-brand-gray-700">
                <div><strong>Especie:</strong> {pet.species}</div>
                <div><strong>Edad:</strong> {pet.age} años</div>
                <div><strong>Sexo:</strong> {pet.sex}</div>
                <div><strong>Color:</strong> {pet.color}</div>
            </div>
        </div>
    </div>
);

const MedicalAlerts: React.FC<{ alerts: string[] }> = ({ alerts }) => (
    <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-r-lg shadow-md h-full">
        <h3 className="font-bold text-lg mb-2">Alertas Médicas</h3>
        {alerts.length > 0 ? (
            <ul className="list-disc list-inside">
                {alerts.map((alert, index) => <li key={index}>{alert}</li>)}
            </ul>
        ) : (
            <p>No hay alertas médicas registradas.</p>
        )}
    </div>
);

const WeightChart: React.FC<{ data: WeightEntry[] }> = ({ data }) => (
    <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="font-bold text-lg mb-4 text-brand-gray-800">Historial de Peso (kg)</h3>
        <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="weight" stroke="var(--color-primary)" strokeWidth={2} activeDot={{ r: 8 }} />
            </LineChart>
        </ResponsiveContainer>
    </div>
);

const RECORD_CATEGORIES: MedicalRecordCategory[] = ['Examen', 'Vacuna', 'Cirugía', 'Tratamiento', 'Laboratorio', 'Antiparasitario', 'Otro'];

const MedicalRecordForm: React.FC<{
    record: Partial<MedicalRecord> | null,
    products: Product[],
    vets: Vet[],
    currentUser: Vet,
    onSubmit: (data: any, action: 'save' | 'bill') => void,
    onCancel: () => void
}> = ({ record, products, vets, currentUser, onSubmit, onCancel }) => {
    const [activeTab, setActiveTab] = useState<'notes' | 'billing' | 'attachments'>('notes');
    const [formData, setFormData] = useState({
        date: record?.date || new Date().toISOString().split('T')[0],
        vet: record?.vet || currentUser.name,
        reason: record?.reason || '',
        category: record?.category || 'Examen' as MedicalRecordCategory,
        reminderDays: record?.reminderDays?.toString() || '0',
        weight: '',
        temperature: '',
        subjective: record?.subjective || '',
        objective: record?.objective || '',
        assessment: record?.assessment || '',
        plan: record?.plan || '',
        invoiceItems: record?.invoiceItems || [],
    });
    
    const [stagedFiles, setStagedFiles] = useState<Omit<AttachedFile, 'id'|'uploadedAt'|'sourceId'|'sourceType'>[]>([]);

    const [itemSelector, setItemSelector] = useState<{productId: string, quantity: number, lotId: string, price: number}>({productId: '', quantity: 1, lotId: '', price: 0});
    const [availableLots, setAvailableLots] = useState<ProductLot[]>([]);

    const selectedProduct = useMemo(() => products.find(p => p.id === itemSelector.productId), [itemSelector.productId, products]);
    const selectedLot = useMemo(() => availableLots.find(l => l.id === itemSelector.lotId), [itemSelector.lotId, availableLots]);
    
    useEffect(() => {
        if (selectedProduct) {
            setItemSelector(s => ({ ...s, price: selectedProduct.salePrice, lotId: '' }));
            if (selectedProduct.usesLotTracking) {
                const lots = selectedProduct.lots
                    .filter(l => l.quantity > 0)
                    .sort((a,b) => new Date(a.expirationDate || 0).getTime() - new Date(b.expirationDate || 0).getTime());
                setAvailableLots(lots);
            } else {
                setAvailableLots([]);
            }
        } else {
            setItemSelector(s => ({ ...s, price: 0, lotId: '' }));
            setAvailableLots([]);
        }
    }, [selectedProduct]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (loadEvent) => {
                    const fileData = {
                        name: file.name,
                        mimeType: file.type,
                        data: loadEvent.target?.result as string,
                        description: '',
                        uploadedBy: currentUser.name,
                    };
                    setStagedFiles(prev => [...prev, fileData]);
                };
                reader.readAsDataURL(file);
            });
        }
    };
    
    const removeStagedFile = (index: number) => {
        setStagedFiles(prev => prev.filter((_, i) => i !== index));
    };


    const handleAddItem = () => {
        if(!selectedProduct || itemSelector.quantity <= 0 || itemSelector.price <= 0) return;
        if(selectedProduct.usesLotTracking && !itemSelector.lotId) return;

        // The discount will be applied by calculateInvoiceTotals. We just need to pass the info.
        const newItem: InvoiceItem = {
            id: selectedProduct.id,
            name: selectedProduct.name,
            description: selectedProduct.description,
            quantity: itemSelector.quantity,
            price: itemSelector.price,
            discountPercentage: selectedProduct.discountPercentage || undefined, // Pass the discount percentage
            lotId: selectedLot?.id,
            lotNumber: selectedLot?.lotNumber
        };
        
        setFormData(prev => ({...prev, invoiceItems: [...prev.invoiceItems, newItem]}));
        setItemSelector({productId: '', quantity: 1, lotId: '', price: 0}); // Reset
    };
    
    const handleRemoveItem = (itemId: string, index: number) => {
        setFormData(prev => ({
            ...prev,
            invoiceItems: prev.invoiceItems.filter((item, i) => item.id !== itemId || i !== index)
        }));
    };

    const handleSubmit = (action: 'save' | 'bill') => {
        const processedData = {
            ...formData,
            reminderDays: parseInt(formData.reminderDays, 10) || 0,
            weight: parseFloat(formData.weight) || undefined,
            temperature: parseFloat(formData.temperature) || undefined,
            attachments: stagedFiles,
        }
        onSubmit(processedData, action);
    };

    const subtotal = formData.invoiceItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const TabButton: React.FC<{ tabName: string; label: string; count?: number; }> = ({ tabName, label, count }) => (
        <button
            type="button"
            onClick={() => setActiveTab(tabName as any)}
            className={`whitespace-nowrap py-3 px-4 font-medium text-sm transition-colors focus:outline-none ${
                activeTab === tabName
                ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-b-2 border-transparent text-brand-gray-500 hover:text-brand-gray-700 hover:border-brand-gray-300'
            }`}
        >
            {label} {count !== undefined && count > 0 && <span className="ml-1.5 bg-[var(--color-primary-light)] text-[var(--color-primary)] rounded-full px-2 py-0.5 text-xs">{count}</span>}
        </button>
    );

    const ClinicalNotes = (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="date" className="block text-sm font-medium text-brand-gray-700">Fecha</label>
                    <input type="date" id="date" name="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
                </div>
                <div>
                    <label htmlFor="vet" className="block text-sm font-medium text-brand-gray-700">Veterinario Tratante</label>
                    <select id="vet" name="vet" value={formData.vet} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]">
                        {vets.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                    </select>
                </div>
                 {!record && (
                    <>
                        <div>
                            <label htmlFor="weight" className="block text-sm font-medium text-brand-gray-700">Peso (kg)</label>
                            <input type="number" id="weight" name="weight" step="0.1" min="0" value={formData.weight} onChange={handleChange} placeholder="Ej: 5.2" className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
                        </div>
                        <div>
                            <label htmlFor="temperature" className="block text-sm font-medium text-brand-gray-700">Temperatura (°C)</label>
                            <input type="number" id="temperature" name="temperature" step="0.1" min="0" value={formData.temperature} onChange={handleChange} placeholder="Ej: 38.5" className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
                        </div>
                    </>
                )}
            </div>
             <div>
                 <label htmlFor="reason" className="block text-sm font-medium text-brand-gray-700">Motivo de la Visita</label>
                 <input type="text" id="reason" name="reason" value={formData.reason} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-brand-gray-700">Categoría</label>
                    <select id="category" name="category" value={formData.category} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]">
                        {RECORD_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <div>
                     <label htmlFor="reminderDays" className="block text-sm font-medium text-brand-gray-700">Crear Recordatorio (en días)</label>
                     <input type="number" id="reminderDays" name="reminderDays" min="0" value={formData.reminderDays} onChange={handleChange} placeholder="Ej: 365" className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
                </div>
            </div>
            <textarea id="subjective" name="subjective" placeholder="Subjetivo..." value={formData.subjective} onChange={handleChange} rows={3} className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
            <textarea id="objective" name="objective" placeholder="Objetivo..." value={formData.objective} onChange={handleChange} rows={3} className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
            <textarea id="assessment" name="assessment" placeholder="Evaluación (Assessment)..." value={formData.assessment} onChange={handleChange} rows={3} className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
            <textarea id="plan" name="plan" placeholder="Plan..." value={formData.plan} onChange={handleChange} rows={3} className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
        </div>
    );
    
    const Billing = (
        <div className="space-y-4">
            <h4 className="text-lg font-semibold text-brand-gray-800">Artículos Facturables</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {formData.invoiceItems.length === 0 && <p className="text-brand-gray-500 text-center py-4">No hay artículos agregados.</p>}
                {formData.invoiceItems.map((item, index) => {
                    const lineSubtotal = item.price * item.quantity;
                    const lineDiscount = item.discountPercentage ? (lineSubtotal * (item.discountPercentage / 100)) : (item.discountAmount || 0);
                    const lineTotal = lineSubtotal - lineDiscount;
                    return (
                         <div key={`${item.id}-${index}`} className="flex justify-between items-center bg-brand-gray-100 p-2 rounded-md">
                            <div>
                               <p className="font-medium text-brand-gray-800">{item.name} (x{item.quantity})</p>
                               {item.lotNumber && <p className="text-xs text-brand-gray-500">Lote: {item.lotNumber}</p>}
                               {lineDiscount > 0 && <p className="text-xs text-red-500">Descuento: -${lineDiscount.toFixed(2)}</p>}
                            </div>
                            <div className="flex items-center">
                                <p className="text-brand-gray-600 mr-4 font-semibold">${lineTotal.toFixed(2)}</p>
                                <button type="button" onClick={() => handleRemoveItem(item.id, index)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-4 w-4"/></button>
                            </div>
                        </div>
                    )
                })}
            </div>
            {formData.invoiceItems.length > 0 && <p className="text-right font-bold mt-2 text-brand-gray-800">Subtotal (antes de desc.): ${subtotal.toFixed(2)}</p>}
            
            <div className="border-t pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-6 items-end gap-2">
                    <div className="sm:col-span-3">
                        <label htmlFor="product-select" className="text-sm font-medium text-brand-gray-700">Añadir Servicio/Producto</label>
                        <select id="product-select" value={itemSelector.productId} onChange={e => setItemSelector(p => ({...p, productId: e.target.value}))} className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]">
                            <option value="">Seleccione un artículo...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    
                    <div className="sm:col-span-1">
                         <label htmlFor="quantity" className="text-sm font-medium text-brand-gray-700">Cant.</label>
                         <input type="number" id="quantity" value={itemSelector.quantity} onChange={e => setItemSelector(p => ({...p, quantity: parseInt(e.target.value, 10)}))} min="1" max={selectedLot?.quantity} className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"/>
                    </div>
                     <div className="sm:col-span-1">
                        <label htmlFor="price" className="text-sm font-medium text-brand-gray-700">Precio ($)</label>
                        <input type="number" id="price" value={itemSelector.price} onChange={e => setItemSelector(p => ({...p, price: parseFloat(e.target.value) || 0}))} step="0.01" min="0" className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"/>
                    </div>
                    <div className="sm:col-span-1">
                        <button type="button" onClick={handleAddItem} className="w-full px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition">Añadir</button>
                    </div>

                    {selectedProduct?.usesLotTracking && (
                         <div className="sm:col-span-6">
                            <label htmlFor="lot-select" className="text-sm font-medium text-brand-gray-700">Número de Lote (PEPS)</label>
                            <select id="lot-select" value={itemSelector.lotId} onChange={e => setItemSelector(p => ({...p, lotId: e.target.value}))} required className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]">
                                <option value="">Seleccione un lote...</option>
                                {availableLots.map(l => <option key={l.id} value={l.id}>{`${l.lotNumber} (Cant: ${l.quantity}) Exp: ${l.expirationDate || 'N/A'}`}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const Attachments = (
        <div className="space-y-4">
             <h4 className="text-lg font-semibold text-brand-gray-800">Adjuntos</h4>
            {record ? (
                <p className="text-sm text-brand-gray-500">Los archivos adjuntos pueden añadirse directamente al registro de hospitalización, pero no a un registro médico existente.</p>
            ) : (
                <>
                <input type="file" multiple onChange={handleFileChange} className="block w-full text-sm text-brand-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary-light)] file:text-[var(--color-primary)] hover:file:opacity-80" />
                 <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-2">
                    {stagedFiles.length === 0 && <p className="text-brand-gray-500 text-center py-4">No hay archivos seleccionados.</p>}
                    {stagedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-brand-gray-50 p-2 rounded-md">
                            <span className="text-sm truncate">{file.name}</span>
                            <button type="button" onClick={() => removeStagedFile(index)} className="text-red-500 hover:text-red-700">&times;</button>
                        </div>
                    ))}
                </div>
                </>
            )}
        </div>
    );

    return (
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col h-[75vh]">
            <div className="flex-shrink-0 border-b border-brand-gray-200">
                <nav className="flex space-x-2">
                    <TabButton tabName="notes" label="Notas Clínicas" />
                    <TabButton tabName="billing" label="Facturación" count={formData.invoiceItems.length} />
                    {!record && <TabButton tabName="attachments" label="Adjuntos" count={stagedFiles.length} />}
                </nav>
            </div>

            <div className="flex-grow overflow-y-auto py-6 pr-2">
                {activeTab === 'notes' && ClinicalNotes}
                {activeTab === 'billing' && Billing}
                {activeTab === 'attachments' && Attachments}
            </div>

            <div className="flex-shrink-0 flex justify-end space-x-4 pt-4 border-t border-brand-gray-200">
                <button type="button" onClick={onCancel} className="px-6 py-2 bg-brand-gray-200 text-brand-gray-800 rounded-lg hover:bg-brand-gray-300 transition font-medium">Cancelar</button>
                {record ? ( // Editing mode
                    <button type="button" onClick={() => handleSubmit('save')} className="px-6 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 transition font-medium">
                        Guardar Cambios
                    </button>
                ) : ( // New record mode
                    <>
                        {formData.invoiceItems.length > 0 ? (
                            <>
                                <button type="button" onClick={() => handleSubmit('save')} className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition font-medium">
                                    Guardar Sólo Registro
                                </button>
                                <button type="button" onClick={() => handleSubmit('bill')} className="px-6 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 transition font-medium">
                                    Guardar y Facturar
                                </button>
                            </>
                        ) : (
                            <button type="button" onClick={() => handleSubmit('save')} className="px-6 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 transition font-medium">
                                Guardar Registro
                            </button>
                        )}
                    </>
                )}
            </div>
        </form>
    );
};

const Reminders: React.FC<{reminders: Reminder[], onUpdateStatus: (id: string, status: Reminder['status']) => void, hasPermission: (p: Permission) => boolean}> = ({ reminders, onUpdateStatus, hasPermission }) => {
    const pendingReminders = reminders.filter(r => r.status === 'Pendiente').sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const today = new Date();
    today.setHours(0,0,0,0);

    const getDueDateClass = (dueDate: string) => {
        const date = new Date(dueDate);
        date.setDate(date.getDate() + 1);
        if (date < today) return 'bg-red-50 border-red-400';
        const inAWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        if (date <= inAWeek) return 'bg-yellow-50 border-yellow-400';
        return 'bg-brand-gray-50 border-brand-gray-200';
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md h-full">
            <h3 className="font-bold text-lg mb-4 text-brand-gray-800 flex items-center"><BellIcon className="h-6 w-6 mr-2 text-[var(--color-primary)]"/>Recordatorios</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                 {pendingReminders.length > 0 ? pendingReminders.map(r => (
                     <div key={r.id} className={`p-3 rounded-lg border-l-4 ${getDueDateClass(r.dueDate)}`}>
                         <div className="flex justify-between items-start">
                            <div>
                                <p className="font-semibold text-brand-gray-800">{r.message}</p>
                                <p className="text-sm text-brand-gray-600">Vence: {new Date(r.dueDate).toLocaleDateString()}</p>
                            </div>
                            {hasPermission(Permission.ManagePetMedicalRecords) && (
                            <div className="flex space-x-1 flex-shrink-0 ml-2">
                                <button onClick={() => onUpdateStatus(r.id, 'Completado')} className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600">Hecho</button>
                                <button onClick={() => onUpdateStatus(r.id, 'Descartado')} className="text-xs px-2 py-1 bg-brand-gray-400 text-white rounded hover:bg-brand-gray-500">Descartar</button>
                            </div>
                            )}
                         </div>
                     </div>
                 )) : (
                    <p className="text-brand-gray-500">No hay recordatorios pendientes para esta mascota.</p>
                 )}
            </div>
        </div>
    );
}

const MedicalHistory: React.FC<{ 
    records: MedicalRecord[]; 
    onGenerateSummary: () => void; 
    isSummaryLoading: boolean; 
    summary: string | null;
    onAdd: () => void;
    onEdit: (record: MedicalRecord) => void;
    onDelete: (record: MedicalRecord) => void;
    onViewInvoice: (invoiceId: string) => void;
    hasPermission: (permission: Permission) => boolean;
}> = ({ records, onGenerateSummary, isSummaryLoading, summary, onAdd, onEdit, onDelete, onViewInvoice, hasPermission }) => {
    const [activeTab, setActiveTab] = useState<MedicalRecordCategory | 'All'>('All');
    
    const tabs: (MedicalRecordCategory | 'All')[] = ['All', ...RECORD_CATEGORIES];
    const filteredRecords = activeTab === 'All' ? records : records.filter(r => r.category === activeTab);

    return (
    <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-lg text-brand-gray-800">Historial Médico</h3>
            <div className="flex items-center space-x-2">
                <button
                  onClick={onGenerateSummary}
                  disabled={isSummaryLoading}
                  className="flex items-center px-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg shadow-md hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  {isSummaryLoading ? 'Generando...' : 'Resumen con IA'}
                </button>
                {hasPermission(Permission.ManagePetMedicalRecords) && (
                 <button onClick={onAdd} className="flex items-center px-3 py-2 bg-[var(--color-primary)] text-white rounded-lg shadow-md hover:opacity-90 transition text-sm">
                    <PlusCircleIcon className="h-5 w-5 mr-2" />
                    Añadir Registro
                </button>
                )}
            </div>
        </div>

        {summary && (
            <div className="mb-6 p-4 bg-[var(--color-primary-light)] border border-[var(--color-primary)] rounded-lg">
                <h4 className="font-bold text-[var(--color-primary)] mb-2 flex items-center"><SparklesIcon className="h-5 w-5 mr-2"/>Resumen con Inteligencia Artificial</h4>
                <div className="text-sm text-brand-gray-800 whitespace-pre-wrap font-mono">{summary}</div>
            </div>
        )}

        <div className="border-b border-brand-gray-200 mb-4">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`${
                            activeTab === tab
                            ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                            : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700 hover:border-brand-gray-300'
                        } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors`}
                    >
                    {tab === 'All' ? 'Todos' : tab}
                    </button>
                ))}
            </nav>
        </div>
        
        <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
            {filteredRecords.map(record => (
                <div key={record.id} className="border border-brand-gray-200 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                             <h4 className="font-bold text-[var(--color-primary)]">{record.reason}</h4>
                             <p className="text-sm text-brand-gray-600">{new Date(record.date).toLocaleDateString()} - {record.vet}</p>
                             <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">{record.category}</span>
                        </div>
                        <div className="flex-shrink-0 space-x-1">
                            {record.attachments.length > 0 && <PaperclipIcon className="h-5 w-5 inline-block text-brand-gray-400" title={`${record.attachments.length} archivo(s) adjunto(s)`} />}
                            {record.invoiceId && 
                                <button onClick={() => onViewInvoice(record.invoiceId!)} className="text-[var(--color-accent)] hover:opacity-80 p-1 rounded-full hover:bg-green-100"><DocumentTextIcon className="h-5 w-5"/></button>
                            }
                            {hasPermission(Permission.ManagePetMedicalRecords) && (
                                <>
                                <button onClick={() => onEdit(record)} className="text-[var(--color-primary)] hover:opacity-80 p-1 rounded-full hover:bg-[var(--color-primary-light)]"><PencilIcon className="h-5 w-5"/></button>
                                <button onClick={() => onDelete(record)} className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100"><TrashIcon className="h-5 w-5"/></button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="text-sm space-y-2 text-brand-gray-700">
                        <p><strong>S:</strong> {record.subjective}</p>
                        <p><strong>O:</strong> {record.objective}</p>
                        <p><strong>A:</strong> {record.assessment}</p>
                        <p><strong>P:</strong> {record.plan}</p>
                    </div>
                    {record.attachments.length > 0 && (
                        <div className="mt-3 border-t pt-3">
                            <h5 className="font-semibold text-sm text-brand-gray-700 mb-1">Adjuntos:</h5>
                            <div className="flex flex-wrap gap-2">
                                {record.attachments.map(att => (
                                    <a key={att.id} href={att.data} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--color-primary)] hover:underline bg-[var(--color-primary-light)] px-2 py-1 rounded-md">{att.name}</a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}
            {filteredRecords.length === 0 && <p className="text-brand-gray-500 py-4 text-center">No hay registros en esta categoría.</p>}
        </div>
    </div>
);
}

const LogIcon: React.FC<{type: 'vital'|'med'|'note', className?: string}> = ({type, className}) => {
    const icons = {
        vital: <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h2.5l1.5-4 3 8 2-6 1.5 4H18" />,
        med: <path strokeLinecap="round" strokeLinejoin="round" d="M8 8a3 3 0 100-6 3 3 0 000 6zM8 17a3 3 0 100-6 3 3 0 000 6zM17 8a3 3 0 100-6 3 3 0 000 6zM17 17a3 3 0 100-6 3 3 0 000 6z" />,
        note: <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    }
    return <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>{icons[type]}</svg>;
}

const LogTable = <T extends {id: string}>({log, headers, renderRow}: {log: T[], headers: string[], renderRow: (item: T) => React.ReactNode}) => {
    if (log.length === 0) {
        return <p className="text-brand-gray-500 py-4 text-center">No se encontraron entradas de registro.</p>
    }
    return <table className="min-w-full divide-y text-sm">
        <thead className="bg-brand-gray-50"><tr>{headers.map(h=><th key={h} className="px-4 py-2 text-left font-medium text-brand-gray-600 uppercase">{h}</th>)}</tr></thead>
        <tbody className="divide-y">{log.map(item => <tr key={item.id} className="hover:bg-brand-gray-50">{renderRow(item)}</tr>)}</tbody>
    </table>
}

const HospitalizationDetailModal: React.FC<{
    hosp: Hospitalization | null, 
    onClose: () => void, 
    onAddAttachment: (hospId: string, attachmentData: Omit<AttachedFile, 'id' | 'uploadedAt' | 'sourceId' | 'sourceType'>) => void,
    currentUser: Vet,
}> = ({ hosp, onClose, onAddAttachment, currentUser }) => {
    const [activeTab, setActiveTab] = useState('plan');
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    
    if (!hosp) return null;
    
    const handleUploadSubmit = (file: File, description: string) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const fileData = {
                name: file.name,
                mimeType: file.type,
                data: e.target?.result as string,
                description,
                uploadedBy: currentUser.name,
            };
            onAddAttachment(hosp.id, fileData);
            setUploadModalOpen(false);
        };
        reader.readAsDataURL(file);
    };

    const tabs = {
        plan: {label: 'Plan de Tratamiento', icon: 'note'},
        vitals: {label: 'Signos Vitales', icon: 'vital'},
        meds: {label: 'Medicación', icon: 'med'},
        notes: {label: 'Notas de Progreso', icon: 'note'},
        attachments: {label: `Adjuntos (${hosp.attachments.length})`, icon: 'paperclip'}
    };

    const renderLog = () => {
        switch (activeTab) {
            case 'plan': return <div className="p-4 bg-brand-gray-50 rounded-lg whitespace-pre-wrap">{hosp.treatmentPlan}</div>;
            case 'vitals': return <LogTable<VitalSignEntry> log={hosp.vitalSignsLog} headers={['Hora', 'Temp', 'FC', 'FR', 'PA', 'Notas', 'Por']} renderRow={item => (<><td className="p-2">{new Date(item.timestamp).toLocaleString()}</td><td className="p-2">{item.temperature}°C</td><td className="p-2">{item.heartRate}</td><td className="p-2">{item.respiratoryRate}</td><td className="p-2">{item.bloodPressure}</td><td className="p-2">{item.notes}</td><td className="p-2">{item.recordedBy}</td></>)} />;
            case 'meds': return <LogTable<MedicationLogEntry> log={hosp.medicationLog} headers={['Hora', 'Medicamento', 'Dosis', 'Vía', 'Notas', 'Por']} renderRow={item => (<><td className="p-2">{new Date(item.timestamp).toLocaleString()}</td><td className="p-2">{item.productName}</td><td className="p-2">{item.dosage}</td><td className="p-2">{item.route}</td><td className="p-2">{item.notes}</td><td className="p-2">{item.administeredBy}</td></>)} />;
            case 'notes': return <LogTable<ProgressNoteEntry> log={hosp.progressNotes} headers={['Hora', 'Autor', 'Nota']} renderRow={item => (<><td className="p-2">{new Date(item.timestamp).toLocaleString()}</td><td className="p-2">{item.author}</td><td className="p-2 whitespace-pre-wrap">{item.note}</td></>)} />;
            case 'attachments': return <LogTable<AttachedFile> log={hosp.attachments} headers={['Fecha de Carga', 'Archivo', 'Descripción', 'Por']} renderRow={item => (<><td className="p-2">{new Date(item.uploadedAt).toLocaleString()}</td><td className="p-2"><a href={item.data} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">{item.name}</a></td><td className="p-2">{item.description}</td><td className="p-2">{item.uploadedBy}</td></>)} />;
            default: return null;
        }
    }

    return (
        <>
        <Modal isOpen={isUploadModalOpen} onClose={() => setUploadModalOpen(false)} title="Subir Archivo Adjunto">
            <AttachmentUploadForm onSubmit={handleUploadSubmit} onCancel={() => setUploadModalOpen(false)} />
        </Modal>
        <Modal isOpen={!!hosp} onClose={onClose} title={`Hospitalización: ${new Date(hosp.admissionDate).toLocaleDateString()}`}>
             <div className="text-sm text-brand-gray-700 space-y-1 mb-4">
                <p><strong>Motivo:</strong> {hosp.reason}</p>
                <p><strong>De alta:</strong> {hosp.dischargeDate ? new Date(hosp.dischargeDate).toLocaleString() : 'N/A'}</p>
             </div>
             <div className="flex justify-between items-center border-b">
                <div className="flex space-x-4 overflow-x-auto">
                    {Object.entries(tabs).map(([key, {label, icon}]) => (
                        <button key={key} onClick={()=>setActiveTab(key)} className={`py-2 px-3 flex items-center gap-2 border-b-2 whitespace-nowrap ${activeTab === key ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-brand-gray-500'}`}>
                            {icon === 'paperclip' ? <PaperclipIcon className="h-5 w-5"/> : <LogIcon type={icon as any} className="h-5 w-5" />} {label}
                        </button>
                    ))}
                </div>
                 <button onClick={() => setUploadModalOpen(true)} className="flex items-center text-sm px-3 py-1 bg-[var(--color-primary)] text-white rounded-md whitespace-nowrap ml-2"><PlusCircleIcon className="h-5 w-5 mr-1"/> Subir</button>
            </div>
            <div className="mt-4 max-h-[50vh] overflow-y-auto">{renderLog()}</div>
        </Modal>
        </>
    )
}

const AttachmentUploadForm: React.FC<{
    onSubmit: (file: File, description: string) => void,
    onCancel: () => void
}> = ({ onSubmit, onCancel }) => {
    const [file, setFile] = useState<File | null>(null);
    const [description, setDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (file) {
            onSubmit(file, description);
        }
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} required className="block w-full text-sm text-brand-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary-light)] file:text-[var(--color-primary)] hover:file:opacity-80" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción (opcional)" className="w-full p-2 border rounded" rows={3}></textarea>
            <div className="flex justify-end gap-4"><button type="button" onClick={onCancel}>Cancelar</button><button type="submit">Subir</button></div>
        </form>
    )
};


const HospitalizationHistory: React.FC<{ 
    records: Hospitalization[]; 
    onViewDetails: (hosp: Hospitalization) => void;
}> = ({ records, onViewDetails }) => {
    return (
    <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-brand-gray-800 flex items-center">
                <HeartbeatIcon className="h-6 w-6 mr-2 text-[var(--color-primary)]"/> Historial de Hospitalización
            </h3>
        </div>
        
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {records.length > 0 ? records
                .sort((a,b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime())
                .map(hosp => (
                <div key={hosp.id} className="border border-brand-gray-200 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h4 className="font-bold text-[var(--color-primary)]">{hosp.reason}</h4>
                            <p className="text-sm text-brand-gray-600">
                                Ingreso: {new Date(hosp.admissionDate).toLocaleDateString()}
                                {hosp.dischargeDate ? ` | Alta: ${new Date(hosp.dischargeDate).toLocaleDateString()}` : ''}
                            </p>
                            <span className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${hosp.status === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                                {hosp.status}
                            </span>
                             {hosp.attachments.length > 0 && <span className="ml-2 mt-1 inline-flex items-center text-xs font-medium text-brand-gray-600"><PaperclipIcon className="h-4 w-4 mr-1"/> {hosp.attachments.length}</span>}
                        </div>
                        <div className="flex-shrink-0 space-x-1">
                            <button onClick={() => onViewDetails(hosp)} className="text-[var(--color-primary)] hover:opacity-80 p-2 text-sm rounded-lg hover:bg-[var(--color-primary-light)] flex items-center">
                                <DocumentTextIcon className="h-4 w-4 mr-1"/> Ver Detalles
                            </button>
                        </div>
                    </div>
                    <div className="text-sm space-y-1 text-brand-gray-700">
                        <p><strong>Diagnóstico:</strong> {hosp.initialDiagnosis}</p>
                        <p><strong>Veterinario a Cargo:</strong> {hosp.vetInCharge}</p>
                    </div>
                </div>
            )) : (
                <p className="text-brand-gray-500 py-4 text-center">No se encontraron registros de hospitalización para esta mascota.</p>
            )}
        </div>
    </div>
);
}

const AllDocumentsView: React.FC<{
    medicalRecords: MedicalRecord[],
    hospitalizations: Hospitalization[]
}> = ({ medicalRecords, hospitalizations }) => {
    const allAttachments = useMemo(() => {
        const fromMedical = medicalRecords.flatMap(r => r.attachments);
        const fromHosp = hospitalizations.flatMap(h => h.attachments);
        return [...fromMedical, ...fromHosp].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    }, [medicalRecords, hospitalizations]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-brand-gray-800 mb-4">Todos los Documentos del Paciente</h3>
            {allAttachments.length === 0 ? (
                <p className="text-brand-gray-500">No se han subido documentos para este paciente.</p>
            ) : (
                <table className="min-w-full divide-y divide-brand-gray-200">
                    <thead className="bg-brand-gray-100">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Fecha de Carga</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Nombre de Archivo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Origen</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Subido Por</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-brand-gray-200">
                        {allAttachments.map(file => {
                            const sourceRecord = file.sourceType === 'MedicalRecord' 
                                ? medicalRecords.find(r => r.id === file.sourceId)
                                : hospitalizations.find(h => h.id === file.sourceId);
                            const sourceText = sourceRecord
                                ? `${file.sourceType === 'MedicalRecord' ? 'Reg. Médico' : 'Hosp.'} del ${new Date( 'date' in sourceRecord ? sourceRecord.date : sourceRecord.admissionDate).toLocaleDateString()}`
                                : 'Desconocido';

                            return (
                                <tr key={file.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(file.uploadedAt).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium"><a href={file.data} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">{file.name}</a></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{sourceText}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{file.uploadedBy}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
};

const PrescriptionForm: React.FC<{
    onSubmit: (items: PrescriptionItem[]) => void;
    onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
    const [items, setItems] = useState<Partial<PrescriptionItem>[]>([{}]);

    const handleItemChange = (index: number, field: keyof PrescriptionItem, value: string) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const addItem = () => setItems([...items, {}]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalItems = items.filter(item => item.medication && item.dosage && item.frequency && item.duration) as PrescriptionItem[];
        if (finalItems.length > 0) {
            onSubmit(finalItems);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {items.map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg relative space-y-3">
                        <button type="button" onClick={() => removeItem(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xl">&times;</button>
                        <input value={item.medication || ''} onChange={e => handleItemChange(index, 'medication', e.target.value)} placeholder="Nombre del Medicamento" required className="w-full p-2 border rounded"/>
                        <div className="grid grid-cols-3 gap-2">
                             <input value={item.dosage || ''} onChange={e => handleItemChange(index, 'dosage', e.target.value)} placeholder="Dosis" required className="w-full p-2 border rounded"/>
                             <input value={item.frequency || ''} onChange={e => handleItemChange(index, 'frequency', e.target.value)} placeholder="Frecuencia" required className="w-full p-2 border rounded"/>
                             <input value={item.duration || ''} onChange={e => handleItemChange(index, 'duration', e.target.value)} placeholder="Duración" required className="w-full p-2 border rounded"/>
                        </div>
                        <textarea value={item.instructions || ''} onChange={e => handleItemChange(index, 'instructions', e.target.value)} placeholder="Instrucciones Especiales" rows={2} className="w-full p-2 border rounded"/>
                    </div>
                ))}
            </div>
            <button type="button" onClick={addItem} className="w-full py-2 bg-[var(--color-primary-light)] text-[var(--color-primary)] rounded-lg">+ Añadir Otro Medicamento</button>
            <div className="flex justify-end space-x-4 pt-4 border-t"><button type="button" onClick={onCancel}>Cancelar</button><button type="submit">Guardar Receta</button></div>
        </form>
    );
};

const PrescriptionsView: React.FC<{
    pet: Pet,
    client?: Client,
    company?: Company | null,
    currentUser: Vet,
    onAddPrescription: (data: Omit<Prescription, 'id' | 'companyId'>) => void;
    hasPermission: (p: Permission) => boolean
}> = ({ pet, client, company, currentUser, onAddPrescription, hasPermission }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const handleFormSubmit = (items: PrescriptionItem[]) => {
        onAddPrescription({
            petId: pet.id,
            date: new Date().toISOString().split('T')[0],
            vet: currentUser.name,
            items,
        });
        setIsModalOpen(false);
    };

    const handlePrint = (prescription: Prescription) => {
        if (client && company) {
            requestPrescriptionPdf(prescription, pet, client, company);
        } else {
            alert("No se pudo encontrar la información del cliente o de la clínica para generar el PDF.");
        }
    };

    return (
        <>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Nueva Receta para ${pet.name}`}>
                <PrescriptionForm onSubmit={handleFormSubmit} onCancel={() => setIsModalOpen(false)} />
            </Modal>
             <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-brand-gray-800">Recetas</h3>
                    {hasPermission(Permission.ManagePrescriptions) && (
                        <button onClick={() => setIsModalOpen(true)} className="flex items-center px-3 py-2 bg-[var(--color-primary)] text-white rounded-lg shadow-md hover:opacity-90 transition text-sm">
                            <PlusCircleIcon className="h-5 w-5 mr-2" />
                            Crear Receta
                        </button>
                    )}
                </div>
                 <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {pet.prescriptions.length === 0 && <p className="text-center text-brand-gray-500 py-4">No hay recetas registradas.</p>}
                    {pet.prescriptions.map(presc => (
                        <div key={presc.id} className="p-4 border rounded-lg">
                             <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold text-[var(--color-primary)]">Receta - {new Date(presc.date).toLocaleDateString()}</h4>
                                    <p className="text-sm text-brand-gray-600">Emitida por Dr. {presc.vet}</p>
                                </div>
                                <button onClick={() => handlePrint(presc)} className="px-3 py-1 bg-[var(--color-accent)] text-white text-sm rounded-md">Imprimir PDF</button>
                            </div>
                            <div className="mt-3 border-t pt-3 space-y-2">
                                {presc.items.map((item, i) => (
                                    <div key={i} className="text-sm">
                                        <p className="font-semibold">{item.medication}</p>
                                        <p className="text-brand-gray-700">{item.dosage} - {item.frequency} - {item.duration}</p>
                                        {item.instructions && <p className="text-xs text-brand-gray-500 italic">Instrucciones: {item.instructions}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                 </div>
             </div>
        </>
    )
}

export const PetDetailComponent: React.FC<PetDetailProps> = ({ pet, clients, currentCompany, reminders, hospitalizations, products, vets, currentUser, onBack, onAddRecord, onUpdateRecord, onDeleteRecord, onAddPrescription, onUpdateReminderStatus, onNavigateToInvoice, onAddAttachmentToHospitalization, onUpdatePet, hasPermission }) => {
    const [summary, setSummary] = useState<string | null>(null);
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
    const [deletingRecord, setDeletingRecord] = useState<MedicalRecord | null>(null);
    const [viewingHosp, setViewingHosp] = useState<Hospitalization | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'prescriptions'>('overview');

    const photoInputRef = useRef<HTMLInputElement>(null);
    const client = useMemo(() => clients.find(c => c.id === pet.ownerId), [clients, pet.ownerId]);

    const handleGenerateSummary = async () => {
        if (!pet.medicalRecords || pet.medicalRecords.length === 0) {
            setSummary("No hay registros médicos disponibles para generar un resumen.");
            return;
        }
        setIsSummaryLoading(true);
        setSummary(null);
        try {
            const result = await generateMedicalSummary(pet.medicalRecords);
            setSummary(result);
        } catch (error: any) {
            setSummary(`Error: ${error.toString()}`);
        } finally {
            setIsSummaryLoading(false);
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onUpdatePet(pet.id, { photoUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleOpenAddModal = () => {
        setEditingRecord(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (record: MedicalRecord) => {
        // Disallow editing items on an existing record for simplicity
        const recordWithoutItems = { ...record, invoiceItems: [], reminderDays: 0 };
        setEditingRecord(recordWithoutItems);
        setIsModalOpen(true);
    };
    
    const handleFormSubmit = async (data: any, action: 'save' | 'bill') => {
        if (editingRecord) {
            // Updating a record that has an invoice is complex. For now, we only update text fields.
            const { date, vet, reason, subjective, objective, assessment, plan, category } = data;
            onUpdateRecord(editingRecord.id, { date, vet, reason, subjective, objective, assessment, plan, category });
        } else {
            const result = await onAddRecord(pet.id, data);
            if (action === 'bill' && result && result.invoice) {
                // After creating a record and invoice, navigate to the new invoice if requested
                onNavigateToInvoice(result.invoice.id);
            }
        }
        setIsModalOpen(false);
        setEditingRecord(null);
    }
    
    const handleConfirmDelete = () => {
        if (deletingRecord) {
            onDeleteRecord(deletingRecord.id);
            setDeletingRecord(null);
        }
    }

    return (
        <div className="p-8">
            <input type="file" ref={photoInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
            {hasPermission(Permission.ManagePetMedicalRecords) && (
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingRecord ? "Editar Registro Médico" : "Añadir Nuevo Registro Médico"}
                size="4xl"
            >
                <MedicalRecordForm 
                    record={editingRecord}
                    products={products}
                    vets={vets}
                    currentUser={currentUser}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>
            )}
            {hasPermission(Permission.ManagePetMedicalRecords) && (
            <ConfirmationDialog
                isOpen={!!deletingRecord}
                onClose={() => setDeletingRecord(null)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Registro Médico"
                message={`¿Está seguro de que desea eliminar este registro médico del ${new Date(deletingRecord?.date || '').toLocaleDateString()}? Esto no eliminará la factura asociada. Esta acción no se puede deshacer.`}
            />
            )}

            <HospitalizationDetailModal hosp={viewingHosp} onClose={() => setViewingHosp(null)} onAddAttachment={onAddAttachmentToHospitalization} currentUser={currentUser} />
            
            <button onClick={onBack} className="mb-6 text-[var(--color-primary)] hover:underline">
                &larr; Volver a la Lista de Clientes
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <div className="lg:col-span-3">
                    <PetInfoCard 
                        pet={pet} 
                        canEdit={hasPermission(Permission.ManageClients)} 
                        onEditPhoto={() => photoInputRef.current?.click()} 
                    />
                </div>
            </div>
            
            <div className="border-b border-brand-gray-300 mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700'}`}>
                       <HomeIcon className="h-5 w-5" /> Resumen
                    </button>
                     <button onClick={() => setActiveTab('prescriptions')} className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'prescriptions' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700'}`}>
                       <DocumentTextIcon className="h-5 w-5" /> Recetas
                    </button>
                    <button onClick={() => setActiveTab('documents')} className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'documents' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700'}`}>
                       <DocumentReportIcon className="h-5 w-5" /> Documentos
                    </button>
                </nav>
            </div>
            
            {activeTab === 'overview' && (
                <div className="space-y-8">
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                         <div className="lg:col-span-1 grid grid-rows-2 gap-8">
                             <MedicalAlerts alerts={pet.medicalAlerts} />
                             <Reminders reminders={reminders} onUpdateStatus={onUpdateReminderStatus} hasPermission={hasPermission}/>
                         </div>
                        <div className="lg:col-span-2">
                            <WeightChart data={pet.weightHistory} />
                        </div>
                    </div>
                    <MedicalHistory 
                        records={pet.medicalRecords} 
                        onGenerateSummary={handleGenerateSummary} 
                        isSummaryLoading={isSummaryLoading} 
                        summary={summary}
                        onAdd={handleOpenAddModal}
                        onEdit={handleOpenEditModal}
                        onDelete={(record) => setDeletingRecord(record)}
                        onViewInvoice={onNavigateToInvoice}
                        hasPermission={hasPermission}
                    />
                    <HospitalizationHistory 
                        records={hospitalizations}
                        onViewDetails={(hosp) => setViewingHosp(hosp)}
                    />
                </div>
            )}
            
            {activeTab === 'prescriptions' && (
                <PrescriptionsView
                    pet={pet}
                    client={client}
                    company={currentCompany}
                    currentUser={currentUser}
                    onAddPrescription={onAddPrescription}
                    hasPermission={hasPermission}
                />
            )}

             {activeTab === 'documents' && (
                <AllDocumentsView 
                    medicalRecords={pet.medicalRecords} 
                    hospitalizations={hospitalizations} 
                />
            )}
            
        </div>
    );
};
