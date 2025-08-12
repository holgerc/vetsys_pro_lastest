import React, { useState, useEffect } from 'react';
import { Appointment, Client, Pet, Vet, Permission } from '../types';
import { Modal, ConfirmationDialog } from './common';
import { PlusCircleIcon, PencilIcon, TrashIcon } from './icons';

const AppointmentForm: React.FC<{
    appt: Appointment | null, 
    clients: Client[],
    vets: Vet[],
    onSubmit: (data: any) => void, 
    onCancel: () => void
}> = ({ appt, clients, vets, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        clientId: appt?.clientId || '', petId: appt?.petId || '', reason: appt?.reason || '',
        vet: appt?.vet || '', time: appt?.time || '', status: appt?.status || 'Confirmada',
        date: appt?.date || new Date().toISOString().split('T')[0]
    });
    const [availablePets, setAvailablePets] = useState<Pet[]>([]);
    
    useEffect(() => {
        if(formData.clientId) {
            const client = clients.find(c => c.id === formData.clientId);
            setAvailablePets(client?.pets || []);
        } else { setAvailablePets([]); }
    }, [formData.clientId, clients]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
        if(name === 'clientId') setFormData(prev => ({...prev, petId: ''}));
    };

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(formData); }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">Cliente</label>
                    <select name="clientId" value={formData.clientId} onChange={handleChange} required className="mt-1 block w-full p-2 border rounded">
                        <option value="">Seleccionar Cliente</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium">Mascota</label>
                    <select name="petId" value={formData.petId} onChange={handleChange} required disabled={!formData.clientId} className="mt-1 block w-full p-2 border rounded disabled:bg-gray-200">
                         <option value="">Seleccionar Mascota</option>
                         {availablePets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium">Fecha</label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full p-2 border rounded" />
                </div>
                 <div>
                    <label className="block text-sm font-medium">Hora</label>
                    <input type="text" name="time" value={formData.time} onChange={handleChange} required placeholder="HH:MM" className="mt-1 block w-full p-2 border rounded" />
                </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium">Veterinario Asignado</label>
                    <select name="vet" value={formData.vet} onChange={handleChange} required className="mt-1 block w-full p-2 border rounded">
                       <option value="">Seleccionar Veterinario</option>
                       {vets.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                       <option>Técnico</option>
                    </select>
                </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium">Motivo</label>
                    <input type="text" name="reason" value={formData.reason} onChange={handleChange} required className="mt-1 block w-full p-2 border rounded" />
                </div>
                 <div>
                    <label className="block text-sm font-medium">Estado</label>
                     <select name="status" value={formData.status} onChange={handleChange} required className="mt-1 block w-full p-2 border rounded">
                         <option>Confirmada</option><option>En espera</option><option>En progreso</option><option>Completada</option><option>Cancelada</option>
                     </select>
                </div>
            </div>
             <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-brand-gray-200 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg">Guardar</button>
            </div>
        </form>
    )
};

const AppointmentStatusBadge: React.FC<{ status: Appointment['status'] }> = ({ status }) => {
    const statusClasses: {[key in Appointment['status']]: string} = { 'Confirmada': 'bg-blue-100 text-blue-800', 'En espera': 'bg-yellow-100 text-yellow-800', 'En progreso': 'bg-green-100 text-green-800', 'Completada': 'bg-gray-200 text-gray-700', 'Cancelada': 'bg-red-100 text-red-800' };
    return <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusClasses[status]}`}>{status}</span>;
}

export const AppointmentsComponent: React.FC<{
    appointments: Appointment[],
    clients: Client[],
    vets: Vet[],
    onAdd: (data: Omit<Appointment, 'id' | 'companyId' | 'clientName' | 'petName'>) => void,
    onUpdate: (id: string, data: Partial<Appointment>) => void,
    onDelete: (id: string) => void,
    hasPermission: (permission: Permission) => boolean;
}> = ({ appointments, clients, vets, onAdd, onUpdate, onDelete, hasPermission }) => {
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
    const [deletingAppt, setDeletingAppt] = useState<Appointment | null>(null);

    const openAddModal = () => { setEditingAppt(null); setIsModalOpen(true); };
    const openEditModal = (appt: Appointment) => { setEditingAppt(appt); setIsModalOpen(true); };

    const handleFormSubmit = (data: any) => {
        const client = clients.find(c => c.id === data.clientId);
        const pet = client?.pets.find(p => p.id === data.petId);

        if (client && pet) {
            const appointmentData = { ...data, clientName: client.name, petName: pet.name };
            if (editingAppt) {
                onUpdate(editingAppt.id, appointmentData);
            } else { onAdd(appointmentData); }
        }
        setIsModalOpen(false);
        setEditingAppt(null);
    };
    

    return (
        <div className="p-8">
            <header className="mb-8 flex justify-between items-center">
                <h1 className="text-3xl font-bold">Citas</h1>
                {hasPermission(Permission.ManageAppointments) && (
                    <button onClick={openAddModal} className="flex items-center px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg shadow-md">
                        <PlusCircleIcon className="h-6 w-6 mr-2" /> Añadir Cita
                    </button>
                )}
            </header>
            
            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingAppt(null); }} title={editingAppt ? 'Editar Cita' : 'Añadir Nueva Cita'}>
                <AppointmentForm 
                    appt={editingAppt} 
                    clients={clients} 
                    vets={vets} 
                    onSubmit={handleFormSubmit} 
                    onCancel={() => { setIsModalOpen(false); setEditingAppt(null); }} 
                />
            </Modal>
            <ConfirmationDialog 
                isOpen={!!deletingAppt}
                onClose={() => setDeletingAppt(null)}
                onConfirm={() => { if (deletingAppt) { onDelete(deletingAppt.id); setDeletingAppt(null); } }}
                title="Eliminar Cita"
                message={`¿Eliminar cita para ${deletingAppt?.petName} a las ${deletingAppt?.time}?`}
            />

            <div className="bg-white p-6 rounded-xl shadow-md">
                 <table className="min-w-full divide-y">
                    <thead className="bg-brand-gray-100"><tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Hora</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Mascota</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Cliente</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Motivo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Veterinario</th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase">Acciones</th>
                    </tr></thead>
                     <tbody>
                        {appointments.map((appt) => (
                            <tr key={appt.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">{new Date(appt.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4">{appt.time}</td><td className="px-6 py-4">{appt.petName}</td>
                                <td className="px-6 py-4">{appt.clientName}</td><td className="px-6 py-4">{appt.reason}</td>
                                <td className="px-6 py-4"><AppointmentStatusBadge status={appt.status} /></td><td className="px-6 py-4">{appt.vet}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    {hasPermission(Permission.ManageAppointments) && (
                                    <>
                                        <button onClick={() => openEditModal(appt)} className="text-[var(--color-primary)]"><PencilIcon className="h-5 w-5"/></button>
                                        <button onClick={() => setDeletingAppt(appt)} className="text-red-600"><TrashIcon className="h-5 w-5"/></button>
                                    </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
