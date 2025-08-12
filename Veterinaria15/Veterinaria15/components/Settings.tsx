




import React, { useState, useRef } from 'react';
import { Vet, Role, Permission, Company, PointOfSale, ThemeColors } from '../types';
import { Modal, ConfirmationDialog } from './common';
import { PlusCircleIcon, PencilIcon, TrashIcon } from './icons';

// --- SUB-COMPONENTS FOR SUPER ADMIN ---

const VetForm: React.FC<{
    vet: Vet | null;
    onSave: (data: any) => void;
    onCancel: () => void;
}> = ({ vet, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: vet?.name || '',
        email: vet?.email || '',
        specialty: vet?.specialty || '',
        password: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSave: any = {
            name: formData.name,
            email: formData.email,
            specialty: formData.specialty,
        };

        // For new vets, password is required
        if (!vet) {
            if (!formData.password) {
                alert("La contraseña es obligatoria para nuevos usuarios.");
                return;
            }
            dataToSave.password = formData.password;
        } 
        // For existing vets, only include password if a new one was entered
        else if (formData.password.trim() !== '') {
            dataToSave.password = formData.password;
        }
        
        onSave(dataToSave);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Nombre Completo" required className="w-full px-3 py-2 border rounded" />
            <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Correo Electrónico" required className="w-full px-3 py-2 border rounded" />
            <input name="specialty" value={formData.specialty} onChange={handleChange} placeholder="Especialidad" required className="w-full px-3 py-2 border rounded" />
            <input 
                name="password" 
                type="password" 
                value={formData.password} 
                onChange={handleChange} 
                placeholder={vet ? "Nueva Contraseña (dejar en blanco para no cambiar)" : "Contraseña"}
                required={!vet}
                className="w-full px-3 py-2 border rounded" 
            />
            <div className="flex justify-end space-x-4 pt-4 border-t">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-brand-gray-200 text-brand-gray-800 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg">Guardar Usuario</button>
            </div>
        </form>
    );
};

const CompanyForm: React.FC<{
    company: Company | null;
    onSave: (data: any) => void;
    onCancel: () => void;
}> = ({ company, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: company?.name || '',
        address: company?.address || '',
        phone: company?.phone || '',
        taxRate: company?.taxRate ? company.taxRate * 100 : 0,
        logoUrl: company?.logoUrl || '',
        sessionTimeoutMinutes: company?.sessionTimeoutMinutes || 60,
        theme: {
            primary: company?.theme?.primary || '#1a73e8',
            primaryLight: company?.theme?.primaryLight || '#e8f0fe',
            accent: company?.theme?.accent || '#1e8e3e',
        }
    });

    const logoInputRef = useRef<HTMLInputElement>(null);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(p => ({ ...p, logoUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name.startsWith('theme.')) {
            const themeColor = name.split('.')[1];
            setFormData(p => ({
                ...p,
                theme: { ...p.theme, [themeColor]: value }
            }));
        } else {
            setFormData(p => ({ ...p, [name]: (name === 'taxRate' || name === 'sessionTimeoutMinutes') ? parseFloat(value) : value }));
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            name: formData.name,
            address: formData.address,
            phone: formData.phone,
            taxRate: formData.taxRate / 100,
            logoUrl: formData.logoUrl,
            sessionTimeoutMinutes: formData.sessionTimeoutMinutes,
            theme: formData.theme,
        });
    };


    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-brand-gray-700">Nombre de la Clínica</label>
                <input name="name" value={formData.name} onChange={handleChange} required className="mt-1 w-full px-3 py-2 border rounded-md" />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Dirección</label>
                    <input name="address" value={formData.address} onChange={handleChange} required className="mt-1 w-full px-3 py-2 border rounded-md" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Teléfono</label>
                    <input name="phone" value={formData.phone} onChange={handleChange} required className="mt-1 w-full px-3 py-2 border rounded-md" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Tasa de Impuesto (%)</label>
                    <input name="taxRate" type="number" step="0.01" value={formData.taxRate} onChange={handleChange} required className="mt-1 w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Tiempo de Inactividad Máximo (minutos)</label>
                    <input name="sessionTimeoutMinutes" type="number" value={formData.sessionTimeoutMinutes} onChange={handleChange} required className="mt-1 w-full px-3 py-2 border rounded-md" />
                </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-brand-gray-700">Logo de la Clínica</label>
                    <div className="mt-1 flex items-center gap-4">
                        <img src={formData.logoUrl || "https://i.imgur.com/Qf8c2bB.png"} alt="Logo Preview" className="h-16 w-16 rounded-full object-cover bg-gray-200 border"/>
                        <button type="button" onClick={() => logoInputRef.current?.click()} className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50">
                            Cambiar Logo
                        </button>
                        <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                    </div>
                 </div>
            </div>
            
            <div className="pt-4 border-t">
                <h3 className="text-lg font-medium text-brand-gray-800 mb-2">Tema de Colores</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div>
                        <label className="block text-sm font-medium text-brand-gray-700 mb-1">Color Primario</label>
                        <div className="flex items-center gap-2 p-2 border rounded-md">
                           <input name="theme.primary" type="color" value={formData.theme.primary} onChange={handleChange} className="w-10 h-10 p-0 border-none rounded cursor-pointer" />
                           <span className="font-mono text-brand-gray-600">{formData.theme.primary}</span>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-brand-gray-700 mb-1">Primario Claro</label>
                         <div className="flex items-center gap-2 p-2 border rounded-md">
                           <input name="theme.primaryLight" type="color" value={formData.theme.primaryLight} onChange={handleChange} className="w-10 h-10 p-0 border-none rounded cursor-pointer" />
                           <span className="font-mono text-brand-gray-600">{formData.theme.primaryLight}</span>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-brand-gray-700 mb-1">Color de Acento</label>
                         <div className="flex items-center gap-2 p-2 border rounded-md">
                            <input name="theme.accent" type="color" value={formData.theme.accent} onChange={handleChange} className="w-10 h-10 p-0 border-none rounded cursor-pointer" />
                           <span className="font-mono text-brand-gray-600">{formData.theme.accent}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4 border-t">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-brand-gray-200 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg">Guardar Clínica</button>
            </div>
        </form>
    )
}

const UserManagementPanel: React.FC<{
    vets: Vet[];
    onAddVet: (data: any) => void;
    onUpdateVet: (id: string, data: Partial<Vet>) => void;
    onDeleteVet: (id: string) => void;
}> = ({ vets, onAddVet, onUpdateVet, onDeleteVet }) => {
    const [vetModal, setVetModal] = useState<{ isOpen: boolean, data: Vet | null }>({ isOpen: false, data: null });
    const [dialog, setDialog] = useState<{ isOpen: boolean, data: Vet | null }>({ isOpen: false, data: null });

    const handleSaveVet = (data: any) => {
        if (vetModal.data?.id) {
            onUpdateVet(vetModal.data.id, data);
        } else {
            onAddVet(data);
        }
        setVetModal({ isOpen: false, data: null });
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <Modal isOpen={vetModal.isOpen} onClose={() => setVetModal({ isOpen: false, data: null })} title={vetModal.data ? "Editar Usuario" : "Añadir Nuevo Usuario"}>
                <VetForm vet={vetModal.data} onSave={handleSaveVet} onCancel={() => setVetModal({ isOpen: false, data: null })} />
            </Modal>
            <ConfirmationDialog
                isOpen={dialog.isOpen}
                onClose={() => setDialog({ isOpen: false, data: null })}
                onConfirm={() => { if (dialog.data) { onDeleteVet(dialog.data.id); setDialog({ isOpen: false, data: null }); } }}
                title="Eliminar Usuario"
                message={`¿Está seguro de que desea eliminar al usuario ${dialog.data?.name}? Esta acción no se puede deshacer.`}
            />
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-brand-gray-800">Gestión de Usuarios (Super Admin)</h2>
                <button onClick={() => setVetModal({ isOpen: true, data: null })} className="flex items-center px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg shadow-md">
                    <PlusCircleIcon className="h-5 w-5 mr-2" /> Añadir Usuario
                </button>
            </div>
            <table className="min-w-full divide-y divide-brand-gray-200">
                <thead className="bg-brand-gray-100">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Nombre</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Correo Electrónico</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Rol/Especialidad</th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {vets.map(v => (
                        <tr key={v.id}>
                            <td className="px-6 py-4">{v.name}</td>
                            <td className="px-6 py-4">{v.email}</td>
                            <td className="px-6 py-4">{v.isSuperAdmin ? <span className="font-bold text-purple-600">Superadministrador</span> : v.specialty}</td>
                            <td className="px-6 py-4 text-right space-x-2">
                                <button onClick={() => setVetModal({ isOpen: true, data: v })} className="text-[var(--color-primary)]"><PencilIcon className="h-5 w-5" /></button>
                                {!v.isSuperAdmin && <button onClick={() => setDialog({ isOpen: true, data: v })} className="text-red-600"><TrashIcon className="h-5 w-5" /></button>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const CompanyManagementPanel: React.FC<{
    companies: Company[];
    onAddCompany: (data: Omit<Company, 'id'>) => void;
    onUpdateCompany: (companyId: string, data: Partial<Company>) => void;
    onDeleteCompany: (companyId: string) => void;
}> = ({ companies, onAddCompany, onUpdateCompany, onDeleteCompany }) => {
    const [companyModal, setCompanyModal] = useState<{ isOpen: boolean, data: Company | null }>({ isOpen: false, data: null });
    const [dialog, setDialog] = useState<{ isOpen: boolean, data: Company | null }>({ isOpen: false, data: null });

    const handleSaveCompany = (data: any) => {
        if (companyModal.data?.id) {
            onUpdateCompany(companyModal.data.id, data);
        } else {
            onAddCompany(data);
        }
        setCompanyModal({ isOpen: false, data: null });
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <Modal isOpen={companyModal.isOpen} onClose={() => setCompanyModal({ isOpen: false, data: null })} title={companyModal.data ? "Editar Clínica" : "Añadir Nueva Clínica"}>
                <CompanyForm company={companyModal.data} onSave={handleSaveCompany} onCancel={() => setCompanyModal({ isOpen: false, data: null })} />
            </Modal>
            <ConfirmationDialog
                isOpen={dialog.isOpen}
                onClose={() => setDialog({ isOpen: false, data: null })}
                onConfirm={() => { if (dialog.data) { onDeleteCompany(dialog.data.id); setDialog({ isOpen: false, data: null }); } }}
                title="Eliminar Clínica"
                message={`¿Está seguro de que desea eliminar ${dialog.data?.name}? Se eliminarán todos los clientes, mascotas, facturas y registros asociados. Esta acción es irreversible.`}
            />
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-brand-gray-800">Gestión de Clínicas (Super Admin)</h2>
                <button onClick={() => setCompanyModal({ isOpen: true, data: null })} className="flex items-center px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg shadow-md">
                    <PlusCircleIcon className="h-5 w-5 mr-2" /> Añadir Clínica
                </button>
            </div>
            <table className="min-w-full divide-y divide-brand-gray-200">
                <thead className="bg-brand-gray-100">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Nombre</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Tasa de Impuesto</th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {companies.map(c => (
                        <tr key={c.id}>
                            <td className="px-6 py-4 flex items-center gap-3">
                                <img src={c.logoUrl} alt="logo" className="h-8 w-8 rounded-full object-cover"/>
                                {c.name}
                            </td>
                            <td className="px-6 py-4">{(c.taxRate * 100).toFixed(2)}%</td>
                            <td className="px-6 py-4 text-right space-x-2">
                                <button onClick={() => setCompanyModal({ isOpen: true, data: c })} className="text-[var(--color-primary)]"><PencilIcon className="h-5 w-5" /></button>
                                <button onClick={() => setDialog({ isOpen: true, data: c })} className="text-red-600"><TrashIcon className="h-5 w-5" /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const PointOfSaleForm: React.FC<{ pos: PointOfSale | null, onSave: (data: any) => void, onCancel: () => void }> = ({ pos, onSave, onCancel }) => {
    const [formData, setFormData] = useState({ name: pos?.name || '', description: pos?.description || '' });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData); };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Nombre (e.g., Recepción)" required className="w-full p-2 border rounded" />
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Descripción (opcional)" className="w-full p-2 border rounded" rows={3} />
            <div className="flex justify-end gap-4 pt-4 border-t"><button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button><button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded">Guardar</button></div>
        </form>
    );
};

const PointOfSalePanel: React.FC<{
    pointsOfSale: PointOfSale[];
    onAdd: (data: any) => void;
    onUpdate: (id: string, data: any) => void;
    onDelete: (id: string) => void;
}> = ({ pointsOfSale, onAdd, onUpdate, onDelete }) => {
    const [modal, setModal] = useState<{ isOpen: boolean, data: PointOfSale | null }>({ isOpen: false, data: null });
    const [dialog, setDialog] = useState<{ isOpen: boolean, data: PointOfSale | null }>({ isOpen: false, data: null });

    const handleSave = (data: any) => {
        if (modal.data?.id) { onUpdate(modal.data.id, data); } 
        else { onAdd(data); }
        setModal({ isOpen: false, data: null });
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <Modal isOpen={modal.isOpen} onClose={() => setModal({ isOpen: false, data: null })} title={modal.data ? "Editar Punto de Venta" : "Nuevo Punto de Venta"}>
                <PointOfSaleForm pos={modal.data} onSave={handleSave} onCancel={() => setModal({ isOpen: false, data: null })} />
            </Modal>
            <ConfirmationDialog isOpen={dialog.isOpen} onClose={() => setDialog({ isOpen: false, data: null })} onConfirm={() => { if (dialog.data) { onDelete(dialog.data.id); setDialog({ isOpen: false, data: null }); } }} title="Eliminar Punto de Venta" message={`¿Eliminar ${dialog.data?.name}? Esta acción no se puede deshacer.`} />
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-brand-gray-800">Puntos de Venta (Cajas)</h2>
                <button onClick={() => setModal({ isOpen: true, data: null })} className="flex items-center px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg shadow-md"><PlusCircleIcon className="h-5 w-5 mr-2" /> Añadir Punto de Venta</button>
            </div>
            <table className="min-w-full divide-y">
                <thead className="bg-brand-gray-100"><tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Nombre</th><th className="px-6 py-3 text-left text-xs font-medium uppercase">Descripción</th><th className="px-6 py-3 text-right text-xs font-medium uppercase">Acciones</th>
                </tr></thead>
                <tbody>
                    {pointsOfSale.map(pos => <tr key={pos.id}>
                        <td className="px-6 py-4 font-semibold">{pos.name}</td><td className="px-6 py-4">{pos.description}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                            <button onClick={() => setModal({ isOpen: true, data: pos })} className="text-[var(--color-primary)]"><PencilIcon className="h-5 w-5" /></button>
                            <button onClick={() => setDialog({ isOpen: true, data: pos })} className="text-red-600"><TrashIcon className="h-5 w-5" /></button>
                        </td>
                    </tr>)}
                </tbody>
            </table>
        </div>
    );
};


// --- MAIN SETTINGS COMPONENT ---

export const SettingsComponent: React.FC<{
    vets: Vet[];
    roles: Role[];
    companies: Company[];
    currentCompany: Company | null;
    currentUser: Vet;
    pointsOfSale: PointOfSale[];
    onAddVet: (data: Omit<Vet, 'id' | 'companyRoles'>) => void;
    onUpdateVet: (id: string, data: Partial<Vet>) => void;
    onDeleteVet: (id: string) => void;
    onAssignVetRoles: (vetId: string, companyId: string, roleIds: string[]) => void;
    onUnassignVetFromCompany: (vetId: string, companyId: string) => void;
    onAddCompany: (data: Omit<Company, 'id'>) => void;
    onUpdateCompany: (companyId: string, data: Partial<Company>) => void;
    onDeleteCompany: (companyId: string) => void;
    onAddPointOfSale: (data: any) => void;
    onUpdatePointOfSale: (id: string, data: any) => void;
    onDeletePointOfSale: (id: string) => void;
    hasPermission: (permission: Permission) => boolean;
}> = ({ vets, roles, companies, currentCompany, currentUser, pointsOfSale, onAddVet, onUpdateVet, onDeleteVet, onAssignVetRoles, onUnassignVetFromCompany, onAddCompany, onUpdateCompany, onDeleteCompany, onAddPointOfSale, onUpdatePointOfSale, onDeletePointOfSale, hasPermission }) => {
    
    return (
        <div className="p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-brand-gray-800">Configuración</h1>
                <p className="text-brand-gray-600">Gestionar la configuración de {currentCompany ? `"${currentCompany.name}"` : 'del sistema'}.</p>
            </header>

            <div className="space-y-8">

                {/* --- Super Admin Panels --- */}
                {currentUser.isSuperAdmin && (
                    <>
                        <UserManagementPanel
                            vets={vets}
                            onAddVet={onAddVet}
                            onUpdateVet={onUpdateVet}
                            onDeleteVet={onDeleteVet}
                        />
                        <CompanyManagementPanel
                            companies={companies}
                            onAddCompany={onAddCompany}
                            onUpdateCompany={onUpdateCompany}
                            onDeleteCompany={onDeleteCompany}
                        />
                    </>
                )}

                {/* --- Company-Level Panels --- */}
                
                {/* Staff Role Management for current company */}
                {currentCompany && hasPermission(Permission.ManageVets) && (
                     <div className="bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-xl font-bold text-brand-gray-800 mb-4">Gestionar Personal de "{currentCompany.name}"</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-brand-gray-200">
                                <thead className="bg-brand-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-600 uppercase tracking-wider">Nombre</th>
                                        {roles.map(role => (
                                            <th key={role.id} className="px-6 py-3 text-center text-xs font-medium text-brand-gray-600 uppercase tracking-wider">{role.name}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-brand-gray-200">
                                    {vets.filter(v => !v.isSuperAdmin).map(v => {
                                        const handleRoleChange = (roleId: string, isChecked: boolean) => {
                                            const currentRoles = v.companyRoles?.[currentCompany!.id] || [];
                                            let newRoles: string[];
                                            if (isChecked) {
                                                newRoles = [...currentRoles, roleId];
                                            } else {
                                                newRoles = currentRoles.filter(id => id !== roleId);
                                            }
                                            onAssignVetRoles(v.id, currentCompany!.id, newRoles);
                                        };

                                        return (
                                        <tr key={v.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <p className="text-sm font-medium text-brand-gray-900">{v.name}</p>
                                                <p className="text-sm text-brand-gray-500">{v.specialty}</p>
                                            </td>
                                            {roles.map(role => (
                                                <td key={role.id} className="px-6 py-4 whitespace-nowrap text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={v.companyRoles?.[currentCompany!.id]?.includes(role.id) ?? false}
                                                        onChange={(e) => handleRoleChange(role.id, e.target.checked)}
                                                        className="h-5 w-5 text-[var(--color-primary)] border-brand-gray-300 rounded focus:ring-[var(--color-primary)]"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {/* Point of Sale Management */}
                {currentCompany && hasPermission(Permission.ManagePointsOfSale) && (
                    <PointOfSalePanel
                        pointsOfSale={pointsOfSale}
                        onAdd={onAddPointOfSale}
                        onUpdate={onUpdatePointOfSale}
                        onDelete={onDeletePointOfSale}
                    />
                )}


                {/* Role & Permission Display */}
                {hasPermission(Permission.ViewSettings) && (
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-xl font-bold text-brand-gray-800 mb-4">Roles y Permisos del Sistema</h2>
                        <div className="space-y-4">
                            {roles.map(role => (
                                <div key={role.id} className="p-4 border rounded-lg">
                                    <h3 className="font-bold text-[var(--color-primary)]">{role.name}</h3>
                                    <p className="text-sm text-brand-gray-600 mb-2">{role.description}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {role.permissions.map(p => <span key={p} className="text-xs bg-gray-200 px-2 py-1 rounded-full">{p.replace(/_/g, ' ')}</span>)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};