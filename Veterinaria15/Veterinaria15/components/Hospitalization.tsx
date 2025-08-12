import React, { useState, useEffect, useMemo } from 'react';
import { Hospitalization, Client, Vet, Pet, MedicationLogEntry, ProgressNoteEntry, VitalSignEntry, Permission, AttachedFile, DischargeOutcome, Product, ProductLot } from '../types';
import { Modal, ConfirmationDialog } from './common';
import { PlusCircleIcon, PaperclipIcon, DocumentTextIcon } from './icons';

interface HospitalizationProps {
    hospitalizations: Hospitalization[];
    clients: Client[];
    vets: Vet[];
    products: Product[];
    currentUser: Vet;
    onAdmit: (data: any) => void;
    onAddLog: (hospId: string, logType: 'vital' | 'med' | 'note', data: any) => void;
    onDischarge: (hospId: string, dischargeData: { recommendations: string, outcome: DischargeOutcome }) => void;
    onUpdatePlan: (hospId: string, plan: string) => void;
    onAddAttachment: (hospId: string, attachmentData: Omit<AttachedFile, 'id' | 'uploadedAt' | 'sourceId' | 'sourceType'>) => void;
    hasPermission: (permission: Permission) => boolean;
}

const LogIcon: React.FC<{type: 'vital'|'med'|'note'|'document-text', className?: string}> = ({type, className}) => {
    const icons = {
        vital: <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h2.5l1.5-4 3 8 2-6 1.5 4H18" />,
        med: <path strokeLinecap="round" strokeLinejoin="round" d="M8 8a3 3 0 100-6 3 3 0 000 6zM8 17a3 3 0 100-6 3 3 0 000 6zM17 8a3 3 0 100-6 3 3 0 000 6zM17 17a3 3 0 100-6 3 3 0 000 6z" />,
        note: <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
        'document-text': <DocumentTextIcon className={className} />
    };
    if (type === 'document-text') return icons[type];
    return <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>{icons[type]}</svg>;
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
            <input type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} required className="block w-full text-sm text-brand-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary-light)] file:text-[var(--color-primary)] hover:file:opacity-90" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción (opcional)" className="w-full p-2 border rounded" rows={3}></textarea>
            <div className="flex justify-end gap-4 pt-4 border-t">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-brand-gray-200 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg">Subir</button>
            </div>
        </form>
    )
};

const AdmissionForm: React.FC<{
    clients: Client[];
    vets: Vet[];
    onSubmit: (data: any) => void;
    onCancel: () => void;
}> = ({ clients, vets, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({ clientId: '', petId: '', reason: '', initialDiagnosis: '', vetInCharge: '', treatmentPlan: '' });
    const [availablePets, setAvailablePets] = useState<Pet[]>([]);

    useEffect(() => {
        if (formData.clientId) {
            const client = clients.find(c => c.id === formData.clientId);
            setAvailablePets(client?.pets || []);
        } else {
            setAvailablePets([]);
        }
    }, [formData.clientId, clients]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        // Atomic update to prevent race conditions
        setFormData(p => {
            const newState = { ...p, [name]: value };
            if (name === 'clientId') {
                newState.petId = ''; // Reset pet when client changes
            }
            return newState;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const client = clients.find(c => c.id === formData.clientId);
        const pet = client?.pets.find(p => p.id === formData.petId);
        if (client && pet) {
            onSubmit({ ...formData, clientName: client.name, petName: pet.name });
        }
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select name="clientId" value={formData.clientId} onChange={handleChange} required className="w-full p-2 border rounded" > <option value="">Seleccionar Cliente</option> {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)} </select>
                <select name="petId" value={formData.petId} onChange={handleChange} required disabled={!formData.clientId} className="w-full p-2 border rounded disabled:bg-gray-200"> <option value="">Seleccionar Mascota</option> {availablePets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)} </select>
            </div>
            <input name="reason" value={formData.reason} onChange={handleChange} placeholder="Motivo de Admisión" required className="w-full p-2 border rounded" />
            <input name="initialDiagnosis" value={formData.initialDiagnosis} onChange={handleChange} placeholder="Diagnóstico Inicial" required className="w-full p-2 border rounded" />
            <select name="vetInCharge" value={formData.vetInCharge} onChange={handleChange} required className="w-full p-2 border rounded"> <option value="">Asignar Veterinario a Cargo</option> {vets.map(v => <option key={v.id} value={v.name}>{v.name}</option>)} </select>
            <textarea name="treatmentPlan" value={formData.treatmentPlan} onChange={handleChange} placeholder="Plan de Tratamiento Inicial" required rows={4} className="w-full p-2 border rounded" />
            <div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={onCancel} className="px-4 py-2 bg-brand-gray-200 rounded-lg">Cancelar</button><button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg">Admitir Paciente</button></div>
        </form>
    );
}

const LogEntryForm: React.FC<{
    logType: 'vital' | 'med' | 'note';
    products?: Product[];
    currentUser: Vet;
    onSubmit: (data: any) => void;
    onCancel: () => void;
}> = ({ logType, products, currentUser, onSubmit, onCancel }) => {
    const commonFields = { recordedBy: currentUser.name, administeredBy: currentUser.name, author: currentUser.name };
    const [formData, setFormData] = useState<any>({quantity: 1});
    
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [availableLots, setAvailableLots] = useState<ProductLot[]>([]);

    useEffect(() => {
        if (logType === 'med' && formData.productId && products) {
            const product = products.find(p => p.id === formData.productId);
            setSelectedProduct(product || null);
            if (product?.usesLotTracking) {
                setAvailableLots(product.lots.filter(l => l.quantity > 0));
            } else {
                setAvailableLots([]);
            }
            setFormData(p => ({ ...p, lotId: '' }));
        }
    }, [formData.productId, logType, products]);

    const maxQuantity = useMemo(() => {
        if (!selectedProduct) return undefined;
        if (selectedProduct.usesLotTracking) {
            const lot = availableLots.find(l => l.id === formData.lotId);
            return lot?.quantity;
        }
        return selectedProduct.lots[0]?.quantity;
    }, [selectedProduct, formData.lotId, availableLots]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSubmit = { ...formData, ...commonFields };
    
        if (logType === 'med' && selectedProduct?.isDivisible) {
            if (!dataToSubmit.consumedVolume || dataToSubmit.consumedVolume <= 0 || !selectedProduct.totalVolume || selectedProduct.totalVolume <= 0) {
                alert("Por favor, ingrese un volumen consumido válido y asegúrese de que el producto tenga un volumen total configurado.");
                return;
            }
            // Calculate the quantity in product units (e.g., bottles) to deduct from stock
            dataToSubmit.quantity = dataToSubmit.consumedVolume / selectedProduct.totalVolume;
            delete dataToSubmit.consumedVolume; // clean up temp field
        }
        
        onSubmit(dataToSubmit);
    };

    const fields = {
        vital: <>
            <input name="temperature" type="number" step="0.1" onChange={e => setFormData(p=>({...p, [e.target.name]: parseFloat(e.target.value)}))} placeholder="Temp (°C)" className="w-full p-2 border rounded" />
            <input name="heartRate" type="number" onChange={e => setFormData(p=>({...p, [e.target.name]: parseInt(e.target.value)}))} placeholder="Frecuencia Cardíaca (lpm)" className="w-full p-2 border rounded" />
            <input name="respiratoryRate" type="number" onChange={e => setFormData(p=>({...p, [e.target.name]: parseInt(e.target.value)}))} placeholder="Frecuencia Resp. (rpm)" className="w-full p-2 border rounded" />
            <input name="bloodPressure" onChange={e => setFormData(p=>({...p, [e.target.name]: e.target.value}))} placeholder="Presión Arterial (ej. 120/80)" className="w-full p-2 border rounded" />
            <textarea name="notes" onChange={e => setFormData(p=>({...p, [e.target.name]: e.target.value}))} placeholder="Notas" rows={2} className="w-full p-2 border rounded" />
        </>,
        med: <>
            <select name="productId" onChange={e => setFormData(p=>({...p, [e.target.name]: e.target.value}))} required className="w-full p-2 border rounded">
                <option value="">Seleccione un Producto...</option>
                {products?.filter(p => p.category === 'Medicina' || p.category === 'Insumo').map(p => 
                    <option key={p.id} value={p.id}>{p.name}</option>
                )}
            </select>
            {selectedProduct?.usesLotTracking && (
                <select name="lotId" value={formData.lotId || ''} onChange={e => setFormData(p=>({...p, [e.target.name]: e.target.value}))} required className="w-full p-2 border rounded">
                    <option value="">Seleccione un Lote...</option>
                    {availableLots.map(l => 
                        <option key={l.id} value={l.id}>{l.lotNumber} (Cant: {l.quantity.toFixed(2)}, Exp: {l.expirationDate || 'N/A'})</option>
                    )}
                </select>
            )}

            {selectedProduct?.isDivisible ? (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Volumen Consumido</label>
                            <input name="consumedVolume" type="number" step="any" onChange={e => setFormData(p=>({...p, [e.target.name]: parseFloat(e.target.value)}))} placeholder={`Cant. en ${selectedProduct.volumeUnit || 'unidades'}`} required className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Vía</label>
                            <input name="route" onChange={e => setFormData(p=>({...p, [e.target.name]: e.target.value}))} placeholder="ej. 'PO', 'IV'" required className="w-full p-2 border rounded" />
                        </div>
                    </div>
                    <input name="dosage" onChange={e => setFormData(p=>({...p, [e.target.name]: e.target.value}))} placeholder="Dosis (descripción, ej: 5ml IV)" required className="w-full p-2 border rounded" />
                </>
            ) : (
                <>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium">Cantidad (unidades)</label>
                            <input name="quantity" type="number" min="1" max={maxQuantity} onChange={e => setFormData(p=>({...p, [e.target.name]: parseInt(e.target.value, 10)}))} placeholder="Cantidad entera" required className="w-full p-2 border rounded" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium">Vía</label>
                            <input name="route" onChange={e => setFormData(p=>({...p, [e.target.name]: e.target.value}))} placeholder="ej. 'PO', 'IV'" required className="w-full p-2 border rounded" />
                        </div>
                    </div>
                    <input name="dosage" onChange={e => setFormData(p=>({...p, [e.target.name]: e.target.value}))} placeholder="Dosis (ej. '1 tableta')" required className="w-full p-2 border rounded" />
                </>
            )}
            <textarea name="notes" onChange={e => setFormData(p=>({...p, [e.target.name]: e.target.value}))} placeholder="Notas" rows={2} className="w-full p-2 border rounded" />
        </>,
        note: <>
            <textarea name="note" onChange={e => setFormData(p=>({...p, [e.target.name]: e.target.value}))} placeholder="Introducir nota de progreso..." required rows={5} className="w-full p-2 border rounded" />
        </>
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {fields[logType]}
            <div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={onCancel} className="px-4 py-2 bg-brand-gray-200 rounded-lg">Cancelar</button><button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg">Añadir Registro</button></div>
        </form>
    );
};


const EditPlanForm: React.FC<{
    initialPlan: string;
    onSubmit: (plan: string) => void;
    onCancel: () => void;
}> = ({ initialPlan, onSubmit, onCancel }) => {
    const [plan, setPlan] = useState(initialPlan);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(plan);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <textarea value={plan} onChange={e => setPlan(e.target.value)} rows={8} className="w-full p-2 border rounded-md" />
            <div className="flex justify-end space-x-4 pt-4 border-t">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-brand-gray-200 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg">Guardar Plan</button>
            </div>
        </form>
    );
};

const DischargeForm: React.FC<{
    onSubmit: (data: { recommendations: string; outcome: DischargeOutcome }) => void;
    onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
    const [recommendations, setRecommendations] = useState('');
    const [outcome, setOutcome] = useState<DischargeOutcome>('Estable');
    const outcomes: DischargeOutcome[] = ['Estable', 'Mejorado', 'Reservado', 'Fallecido', 'Transferido'];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ recommendations, outcome });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-brand-gray-700">Resultado del Alta</label>
                <select value={outcome} onChange={e => setOutcome(e.target.value as DischargeOutcome)} className="w-full mt-1 p-2 border rounded-md">
                    {outcomes.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-brand-gray-700">Recomendaciones y Receta</label>
                <textarea value={recommendations} onChange={e => setRecommendations(e.target.value)} rows={8} placeholder="Introducir instrucciones para el cliente..." className="w-full mt-1 p-2 border rounded-md" required />
            </div>
            <div className="flex justify-end space-x-4 pt-4 border-t">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-brand-gray-200 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg">Confirmar Alta</button>
            </div>
        </form>
    )
};


interface HospitalizationDetailProps {
    hosp: Hospitalization,
    pet: Pet | undefined,
    products: Product[],
    currentUser: Vet,
    onBack: () => void,
    onAddLog: (hospId: string, logType: 'vital' | 'med' | 'note', data: any) => void;
    onDischarge: (hospId: string, dischargeData: { recommendations: string, outcome: DischargeOutcome }) => void;
    onUpdatePlan: (hospId: string, plan: string) => void;
    onAddAttachment: (hospId: string, attachmentData: Omit<AttachedFile, 'id' | 'uploadedAt' | 'sourceId' | 'sourceType'>) => void;
    hasPermission: (permission: Permission) => boolean;
}

const HospitalizationDetail: React.FC<HospitalizationDetailProps> = ({ hosp, pet, products, currentUser, onBack, onAddLog, onDischarge, onUpdatePlan, onAddAttachment, hasPermission }) => {
    const [activeTab, setActiveTab] = useState('plan');
    const [modalState, setModalState] = useState<{type: 'vital'|'med'|'note'|'attachment'|'editPlan'|null}>({type: null});
    const [isDischargeModalOpen, setDischargeModalOpen] = useState(false);
    
    useEffect(() => {
        if(hosp.status === 'De alta' && activeTab !== 'discharge') {
            setActiveTab('discharge');
        } else if (hosp.status === 'Activo' && activeTab === 'discharge') {
            setActiveTab('plan');
        }
    }, [hosp.status, activeTab]);
    
    const handleLogSubmit = (data: any) => {
        if(modalState.type && !['attachment', 'editPlan'].includes(modalState.type)) {
            onAddLog(hosp.id, modalState.type as 'vital'|'med'|'note', data);
        }
        setModalState({type: null});
    };
    
    const handlePlanSubmit = (plan: string) => {
        onUpdatePlan(hosp.id, plan);
        setModalState({type: null});
    };
    
    const handleDischargeSubmit = (data: { recommendations: string; outcome: DischargeOutcome }) => {
        onDischarge(hosp.id, data);
        setDischargeModalOpen(false);
    };
    
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
            setModalState({type: null});
        };
        reader.readAsDataURL(file);
    };

    const tabs: Record<string, {label: string, icon: 'note'|'vital'|'med'|'paperclip'|'document-text'}> = {
        plan: {label: 'Plan de Tratamiento', icon: 'note'},
        vitals: {label: 'Signos Vitales', icon: 'vital'},
        meds: {label: 'Medicación', icon: 'med'},
        notes: {label: 'Notas de Progreso', icon: 'note'},
        attachments: {label: `Adjuntos (${hosp.attachments.length})`, icon: 'paperclip'}
    };

    if (hosp.status === 'De alta') {
        tabs['discharge'] = {label: 'Resumen de Alta', icon: 'document-text'};
    }

    const renderLog = () => {
        switch (activeTab) {
            case 'plan': return (
                <div className="p-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-brand-gray-800">Plan Actual</h3>
                        {hosp.status === 'Activo' && hasPermission(Permission.ManageHospitalizations) && (
                            <button onClick={() => setModalState({type: 'editPlan'})} className="text-sm px-3 py-1 bg-[var(--color-primary-light)] text-[var(--color-primary)] rounded-md hover:opacity-80">Editar Plan</button>
                        )}
                    </div>
                    <div className="p-4 bg-brand-gray-50 rounded-lg whitespace-pre-wrap mt-2">{hosp.treatmentPlan}</div>
                </div>
            );
            case 'vitals': return <LogTable<VitalSignEntry> log={hosp.vitalSignsLog} headers={['Hora', 'Temp', 'FC', 'FR', 'PA', 'Notas', 'Por']} renderRow={item => (<><td className="px-4 py-3 whitespace-nowrap">{new Date(item.timestamp).toLocaleString()}</td><td className="px-4 py-3 whitespace-nowrap">{item.temperature ? `${item.temperature}°C` : '–'}</td><td className="px-4 py-3 whitespace-nowrap">{item.heartRate || '–'}</td><td className="px-4 py-3 whitespace-nowrap">{item.respiratoryRate || '–'}</td><td className="px-4 py-3 whitespace-nowrap">{item.bloodPressure || '–'}</td><td className="px-4 py-3">{item.notes || '–'}</td><td className="px-4 py-3 whitespace-nowrap">{item.recordedBy}</td></>)} />;
            case 'meds': return <LogTable<MedicationLogEntry> log={hosp.medicationLog} headers={['Hora', 'Producto', 'Cant.', 'Dosis', 'Vía', 'Notas', 'Por']} renderRow={item => (<><td className="px-4 py-3 whitespace-nowrap">{new Date(item.timestamp).toLocaleString()}</td><td className="px-4 py-3 whitespace-nowrap">{item.productName}{item.lotNumber && <div className="text-xs text-gray-500 font-mono">Lote: {item.lotNumber}</div>}</td><td className="px-4 py-3 whitespace-nowrap font-bold">{item.quantity.toFixed(3)}</td><td className="px-4 py-3 whitespace-nowrap">{item.dosage}</td><td className="px-4 py-3 whitespace-nowrap">{item.route}</td><td className="px-4 py-3">{item.notes || '–'}</td><td className="px-4 py-3 whitespace-nowrap">{item.administeredBy}</td></>)} />;
            case 'notes': return <LogTable<ProgressNoteEntry> log={hosp.progressNotes} headers={['Hora', 'Autor', 'Nota']} renderRow={item => (<><td className="px-4 py-3 whitespace-nowrap">{new Date(item.timestamp).toLocaleString()}</td><td className="px-4 py-3 whitespace-nowrap">{item.author}</td><td className="px-4 py-3 whitespace-pre-wrap">{item.note}</td></>)} />;
            case 'attachments': return <LogTable<AttachedFile> log={hosp.attachments} headers={['Fecha de Carga', 'Archivo', 'Descripción', 'Por']} renderRow={item => (<><td className="px-4 py-3 whitespace-nowrap">{new Date(item.uploadedAt).toLocaleString()}</td><td className="px-4 py-3 whitespace-nowrap"><a href={item.data} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">{item.name}</a></td><td className="px-4 py-3">{item.description}</td><td className="px-4 py-3 whitespace-nowrap">{item.uploadedBy}</td></>)} />;
            case 'discharge': return (
                <div className="space-y-4 p-4">
                    <div><strong className="text-brand-gray-700">Fecha de Alta:</strong> {new Date(hosp.dischargeDate!).toLocaleString()}</div>
                    <div><strong className="text-brand-gray-700">Resultado:</strong> <span className="font-semibold px-2 py-1 bg-[var(--color-primary-light)] text-[var(--color-primary)] rounded-full text-sm">{hosp.dischargeOutcome}</span></div>
                    <div>
                        <h4 className="font-semibold text-brand-gray-700">Recomendaciones para el Cliente:</h4>
                        <div className="mt-2 p-3 bg-brand-gray-50 rounded-md whitespace-pre-wrap border">{hosp.dischargeRecommendations}</div>
                    </div>
                </div>
            );
            default: return null;
        }
    }
    
    return <>
        <Modal isOpen={!!modalState.type} onClose={()=>setModalState({type: null})} title={
            modalState.type === 'attachment' ? 'Subir Archivo Adjunto'
            : modalState.type === 'editPlan' ? 'Editar Plan de Tratamiento'
            : `Añadir Registro de ${modalState.type === 'vital' ? 'Signos Vitales' : modalState.type === 'med' ? 'Medicación' : 'Nota de Progreso'}`
        }>
            {modalState.type && ['vital', 'med', 'note'].includes(modalState.type) && <LogEntryForm logType={modalState.type as 'vital'|'med'|'note'} products={products} currentUser={currentUser} onSubmit={handleLogSubmit} onCancel={() => setModalState({type: null})} />}
            {modalState.type === 'attachment' && <AttachmentUploadForm onSubmit={handleUploadSubmit} onCancel={() => setModalState({type:null})} />}
            {modalState.type === 'editPlan' && <EditPlanForm initialPlan={hosp.treatmentPlan} onSubmit={handlePlanSubmit} onCancel={() => setModalState({type: null})} />}
        </Modal>
        
        <Modal isOpen={isDischargeModalOpen} onClose={() => setDischargeModalOpen(false)} title="Dar de Alta al Paciente">
             <DischargeForm onSubmit={handleDischargeSubmit} onCancel={() => setDischargeModalOpen(false)} />
        </Modal>

        <button onClick={onBack} className="mb-6 text-[var(--color-primary)] hover:underline">&larr; Volver a la Lista de Hospitalización</button>
        <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold text-brand-gray-800">{hosp.petName} <span className="text-xl font-normal text-brand-gray-600">({hosp.clientName})</span></h2>
                    <p>Admitido: {new Date(hosp.admissionDate).toLocaleString()} - Dr. {hosp.vetInCharge}</p>
                    <p className="mt-1"><strong>Motivo:</strong> {hosp.reason}</p>
                    <p><strong>Diagnóstico:</strong> {hosp.initialDiagnosis}</p>
                </div>
                {hosp.status === 'Activo' && hasPermission(Permission.ManageHospitalizations) && <button onClick={()=>setDischargeModalOpen(true)} className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg">Dar de Alta al Paciente</button>}
                 {hosp.status === 'De alta' && <div className="text-right"><p className="font-bold text-green-600">De alta</p><p className="text-sm">{new Date(hosp.dischargeDate!).toLocaleString()}</p></div>}
            </div>

            {pet?.medicalAlerts?.length > 0 && (
                <div className="mt-4 bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-r-lg shadow-sm">
                    <h3 className="font-bold text-lg mb-2">Alertas Médicas</h3>
                    <ul className="list-disc list-inside">
                        {pet.medicalAlerts.map((alert, index) => <li key={index}>{alert}</li>)}
                    </ul>
                </div>
            )}
            
            <div className="mt-6">
                <div className="flex justify-between items-center border-b">
                    <div className="flex space-x-4 overflow-x-auto">
                        {Object.entries(tabs).map(([key, {label, icon}]) => (
                            <button key={key} onClick={()=>setActiveTab(key)} className={`py-2 px-3 flex items-center gap-2 border-b-2 whitespace-nowrap ${activeTab === key ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-brand-gray-500'}`}>
                                 {icon === 'paperclip' ? <PaperclipIcon className="h-5 w-5"/> : <LogIcon type={icon} className="h-5 w-5" />} {label}
                            </button>
                        ))}
                    </div>
                     {hosp.status === 'Activo' && hasPermission(Permission.ManageHospitalizations) &&
                        <div className="flex-shrink-0 ml-2">
                             {activeTab === 'attachments' ? (
                                <button onClick={()=>setModalState({type: 'attachment'})} className="flex items-center text-sm px-3 py-1 bg-[var(--color-primary)] text-white rounded-md"><PlusCircleIcon className="h-5 w-5 mr-1"/> Subir Archivo</button>
                            ) : !['plan', 'discharge'].includes(activeTab) && (
                                <button onClick={()=>setModalState({type: activeTab === 'vitals' ? 'vital' : activeTab === 'meds' ? 'med' : 'note'})} className="flex items-center text-sm px-3 py-1 bg-[var(--color-primary)] text-white rounded-md"><PlusCircleIcon className="h-5 w-5 mr-1"/> Añadir Entrada</button>
                            )}
                        </div>
                    }
                </div>
                <div className="mt-4 max-h-[50vh] overflow-y-auto">{renderLog()}</div>
            </div>
        </div>
    </>;
}

const LogTable = <T extends {id: string}>({log, headers, renderRow}: {log: T[], headers: string[], renderRow: (item: T) => React.ReactNode}) => {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-brand-gray-200 text-sm">
                <thead className="bg-brand-gray-100">
                    <tr>
                        {headers.map(h => <th key={h} className="px-4 py-2 text-left font-semibold text-brand-gray-600 uppercase tracking-wider">{h}</th>)}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-brand-gray-200">
                    {log.length === 0 
                        ? (<tr><td colSpan={headers.length} className="text-center py-6 text-brand-gray-500">No se encontraron entradas de registro.</td></tr>) 
                        : log.map(item => <tr key={item.id} className="hover:bg-brand-gray-50 transition-colors">{renderRow(item)}</tr>)}
                </tbody>
            </table>
        </div>
    )
}

export const HospitalizationComponent: React.FC<HospitalizationProps> = ({ hospitalizations, clients, vets, products, currentUser, onAdmit, onAddLog, onDischarge, onUpdatePlan, onAddAttachment, hasPermission }) => {
    const [selectedHosp, setSelectedHosp] = useState<Hospitalization | null>(null);
    const [isAdmitModalOpen, setAdmitModalOpen] = useState(false);

    if (selectedHosp) {
        const fullHospData = hospitalizations.find(h => h.id === selectedHosp.id) || selectedHosp;
        const client = clients.find(c => c.id === fullHospData.clientId);
        const pet = client?.pets.find(p => p.id === fullHospData.petId);
        return <div className="p-8"><HospitalizationDetail hosp={fullHospData} pet={pet} products={products} currentUser={currentUser} onBack={() => setSelectedHosp(null)} onAddLog={onAddLog} onDischarge={onDischarge} onUpdatePlan={onUpdatePlan} onAddAttachment={onAddAttachment} hasPermission={hasPermission} /></div>
    }

    const activeCases = hospitalizations.filter(h => h.status === 'Activo');
    const dischargedCases = hospitalizations.filter(h => h.status === 'De alta');

    return (
        <div className="p-8">
            <Modal isOpen={isAdmitModalOpen} onClose={() => setAdmitModalOpen(false)} title="Admitir Nuevo Paciente">
                <AdmissionForm clients={clients} vets={vets} onSubmit={(data)=>{onAdmit(data); setAdmitModalOpen(false)}} onCancel={() => setAdmitModalOpen(false)} />
            </Modal>
            <header className="mb-8 flex justify-between items-center">
                <h1 className="text-3xl font-bold">Casos de Hospitalización</h1>
                {hasPermission(Permission.ManageHospitalizations) && (
                <button onClick={() => setAdmitModalOpen(true)} className="flex items-center px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg shadow-md">
                    <PlusCircleIcon className="h-6 w-6 mr-2" /> Admitir Paciente
                </button>
                )}
            </header>
            
            <div className="space-y-8">
                <CaseList title="Casos Activos" cases={activeCases} onSelect={setSelectedHosp} />
                <CaseList title="Casos de Alta" cases={dischargedCases} onSelect={setSelectedHosp} />
            </div>
        </div>
    );
};

const CaseList: React.FC<{title: string, cases: Hospitalization[], onSelect: (hosp: Hospitalization) => void}> = ({title, cases, onSelect}) => (
     <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-bold mb-4 text-brand-gray-800">{title} ({cases.length})</h2>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-brand-gray-200">
                <thead className="bg-brand-gray-100"><tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Paciente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Fecha de Admisión</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Motivo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Veterinario</th>
                </tr></thead>
                <tbody>
                    {cases.map(h => (
                        <tr key={h.id} onClick={() => onSelect(h)} className="hover:bg-[var(--color-primary-light)] cursor-pointer">
                            <td className="px-6 py-4 font-semibold">{h.petName}</td>
                            <td className="px-6 py-4">{h.clientName}</td>
                            <td className="px-6 py-4">{new Date(h.admissionDate).toLocaleDateString()}</td>
                            <td className="px-6 py-4 truncate max-w-xs">{h.reason}</td>
                            <td className="px-6 py-4">{h.vetInCharge}</td>
                        </tr>
                    ))}
                    {cases.length === 0 && <tr><td colSpan={5} className="text-center py-4 text-brand-gray-500">No hay casos en esta categoría.</td></tr>}
                </tbody>
            </table>
        </div>
    </div>
);