import React, { useState } from 'react';
import { Supplier, Permission } from '../types';
import { Modal, ConfirmationDialog, PaginationControls } from './common';
import { PlusCircleIcon, PencilIcon, TrashIcon } from './icons';

const SupplierForm: React.FC<{
    supplier: Supplier | null;
    onSave: (data: Omit<Supplier, 'id' | 'companyId'>) => void;
    onCancel: () => void;
}> = ({ supplier, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: supplier?.name || '',
        contactPerson: supplier?.contactPerson || '',
        email: supplier?.email || '',
        phone: supplier?.phone || '',
        address: supplier?.address || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-brand-gray-700">Nombre del Proveedor</label>
                <input name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Persona de Contacto</label>
                    <input name="contactPerson" value={formData.contactPerson} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-brand-gray-700">Teléfono de Contacto</label>
                    <input name="phone" type="tel" value={formData.phone} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border rounded-md" />
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-brand-gray-700">Correo Electrónico de Contacto</label>
                <input name="email" type="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border rounded-md" />
            </div>
             <div>
                <label className="block text-sm font-medium text-brand-gray-700">Dirección</label>
                <input name="address" value={formData.address} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="flex justify-end space-x-4 pt-4 border-t">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-brand-gray-200 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg">Guardar Proveedor</button>
            </div>
        </form>
    );
};

export const SuppliersComponent: React.FC<{
    suppliers: Supplier[];
    onAddSupplier: (data: Omit<Supplier, 'id' | 'companyId'>) => void;
    onUpdateSupplier: (id: string, data: Partial<Supplier>) => void;
    onDeleteSupplier: (id: string) => void;
    hasPermission: (permission: Permission) => boolean;
}> = ({ suppliers, onAddSupplier, onUpdateSupplier, onDeleteSupplier, hasPermission }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const handleSave = (formData: any) => {
        if (editingSupplier) {
            onUpdateSupplier(editingSupplier.id, formData);
        } else {
            onAddSupplier(formData);
        }
        setIsModalOpen(false);
        setEditingSupplier(null);
    };

    const filteredSuppliers = suppliers.filter(s => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        return lowerSearchTerm === '' ||
            s.name.toLowerCase().includes(lowerSearchTerm) ||
            (s.contactPerson && s.contactPerson.toLowerCase().includes(lowerSearchTerm)) ||
            s.email.toLowerCase().includes(lowerSearchTerm);
    });

    const totalPages = Math.ceil(filteredSuppliers.length / ITEMS_PER_PAGE);
    const paginatedSuppliers = filteredSuppliers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-brand-gray-800">Proveedores</h1>
                    <p className="text-brand-gray-600">Gestiona tus proveedores de productos.</p>
                </div>
                {hasPermission(Permission.ManageSuppliers) && (
                    <button onClick={() => { setEditingSupplier(null); setIsModalOpen(true); }} className="flex items-center px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg shadow-md hover:opacity-90 transition">
                        <PlusCircleIcon className="h-6 w-6 mr-2" /> Añadir Proveedor
                    </button>
                )}
            </header>

            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingSupplier(null); }} title={editingSupplier ? "Editar Proveedor" : "Añadir Nuevo Proveedor"}>
                <SupplierForm supplier={editingSupplier} onSave={handleSave} onCancel={() => { setIsModalOpen(false); setEditingSupplier(null); }} />
            </Modal>
            <ConfirmationDialog 
                isOpen={!!deletingSupplier} 
                onClose={() => setDeletingSupplier(null)} 
                onConfirm={() => { if (deletingSupplier) { onDeleteSupplier(deletingSupplier.id); setDeletingSupplier(null); } }} 
                title="Eliminar Proveedor" 
                message={`¿Está seguro de que desea eliminar a ${deletingSupplier?.name}? Esta acción no se puede deshacer.`} />

            <div className="mb-4">
                 <input
                    type="text"
                    placeholder="Buscar por nombre, contacto o correo electrónico..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full max-w-sm px-4 py-2 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
                 <table className="min-w-full divide-y divide-brand-gray-200">
                    <thead className="bg-brand-gray-100">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-600 uppercase">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-600 uppercase">Persona de Contacto</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-600 uppercase">Teléfono</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-600 uppercase">Correo Electrónico</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-brand-gray-600 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-brand-gray-200">
                        {paginatedSuppliers.map(s => (
                            <tr key={s.id} className="hover:bg-brand-gray-50">
                                <td className="px-6 py-4 font-medium">{s.name}</td>
                                <td className="px-6 py-4">{s.contactPerson || '—'}</td>
                                <td className="px-6 py-4">{s.phone}</td>
                                <td className="px-6 py-4">{s.email}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    {hasPermission(Permission.ManageSuppliers) && (
                                        <>
                                            <button onClick={() => { setEditingSupplier(s); setIsModalOpen(true); }} className="text-[var(--color-primary)] hover:opacity-80 p-1"><PencilIcon className="h-5 w-5"/></button>
                                            <button onClick={() => setDeletingSupplier(s)} className="text-red-600 hover:text-red-800 p-1"><TrashIcon className="h-5 w-5"/></button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
};