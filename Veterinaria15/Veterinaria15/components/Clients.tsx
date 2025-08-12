import React, { useState } from 'react';
import { Client, Pet, View, Permission } from '../types';
import { PencilIcon, TrashIcon, PlusCircleIcon } from './icons';
import { Modal, ConfirmationDialog } from './common';


interface ClientsProps {
    clients: Client[];
    setView: (view: View) => void;
    setSelectedPet: (pet: Pet) => void;
    onAddClient: (data: Omit<Client, 'id' | 'pets' | 'memberSince' | 'balance'>) => void;
    onUpdateClient: (id: string, data: Partial<Client>) => void;
    onDeleteClient: (id: string) => void;
    onAddPet: (ownerId: string, data: Omit<Pet, 'id' | 'ownerId' | 'medicalRecords' | 'weightHistory'>) => void;
    onUpdatePet: (id: string, data: Partial<Pet>) => void;
    onDeletePet: (id: string, ownerId: string) => void;
    hasPermission: (permission: Permission) => boolean;
}

const ClientForm: React.FC<{client: Partial<Client> | null, onSubmit: (data: any) => void, onCancel: () => void}> = ({ client, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        name: client?.name || '',
        email: client?.email || '',
        phone: client?.phone || '',
        address: client?.address || '',
        identificationNumber: client?.identificationNumber || '',
        billingAddress: client?.billingAddress || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-brand-gray-700">Nombre Completo</label>
                <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-brand-gray-700">Correo Electrónico</label>
                    <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
                </div>
                 <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-brand-gray-700">Número de Teléfono</label>
                    <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
                </div>
            </div>
             <div>
                <label htmlFor="address" className="block text-sm font-medium text-brand-gray-700">Dirección Principal</label>
                <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
            </div>

            <div className="pt-4 mt-4 border-t border-brand-gray-200">
                <h3 className="text-lg font-medium text-brand-gray-800 mb-2">Información de Facturación</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="identificationNumber" className="block text-sm font-medium text-brand-gray-700">N° de Identificación (para Facturas)</label>
                        <input type="text" name="identificationNumber" id="identificationNumber" value={formData.identificationNumber} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
                    </div>
                    <div>
                        <label htmlFor="billingAddress" className="block text-sm font-medium text-brand-gray-700">Dirección de Facturación (si es diferente)</label>
                        <input type="text" name="billingAddress" id="billingAddress" value={formData.billingAddress} onChange={handleChange} placeholder="Dejar en blanco para usar la dirección principal" className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
                    </div>
                </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-brand-gray-200 text-brand-gray-800 rounded-lg hover:bg-brand-gray-300 transition">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition">Guardar Cliente</button>
            </div>
        </form>
    );
};

const PetForm: React.FC<{pet: Partial<Pet> | null, ownerId: string | null, onSubmit: (data: any) => void, onCancel: () => void}> = ({ pet, ownerId, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        name: pet?.name || '',
        species: pet?.species || 'Perro',
        breed: pet?.breed || '',
        age: pet?.age || 0,
        sex: pet?.sex || 'Macho',
        color: pet?.color || '',
        medicalAlerts: pet?.medicalAlerts?.join(', ') || ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: name === 'age' ? parseInt(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ ...formData, medicalAlerts: formData.medicalAlerts.split(',').map(s => s.trim()).filter(Boolean) });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-brand-gray-700">Nombre de la Mascota</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
                </div>
                 <div>
                    <label htmlFor="species" className="block text-sm font-medium text-brand-gray-700">Especie</label>
                    <select name="species" id="species" value={formData.species} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]">
                        <option>Perro</option>
                        <option>Gato</option>
                        <option>Ave</option>
                        <option>Reptil</option>
                        <option>Otro</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="breed" className="block text-sm font-medium text-brand-gray-700">Raza</label>
                    <input type="text" name="breed" id="breed" value={formData.breed} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
                </div>
                <div>
                    <label htmlFor="age" className="block text-sm font-medium text-brand-gray-700">Edad (años)</label>
                    <input type="number" name="age" id="age" value={formData.age} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
                </div>
                <div>
                    <label htmlFor="sex" className="block text-sm font-medium text-brand-gray-700">Sexo</label>
                    <select name="sex" id="sex" value={formData.sex} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]">
                        <option>Macho</option>
                        <option>Macho (Castrado)</option>
                        <option>Hembra</option>
                        <option>Hembra (Esterilizada)</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="color" className="block text-sm font-medium text-brand-gray-700">Color</label>
                    <input type="text" name="color" id="color" value={formData.color} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
                </div>
                 <div className="md:col-span-2">
                    <label htmlFor="medicalAlerts" className="block text-sm font-medium text-brand-gray-700">Alertas Médicas (separadas por coma)</label>
                    <input type="text" name="medicalAlerts" id="medicalAlerts" value={formData.medicalAlerts} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
                </div>
            </div>
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-brand-gray-200 text-brand-gray-800 rounded-lg hover:bg-brand-gray-300 transition">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition">Guardar Mascota</button>
            </div>
        </form>
    );
};


export const Clients: React.FC<ClientsProps> = ({ clients, setView, setSelectedPet, onAddClient, onUpdateClient, onDeleteClient, onAddPet, onUpdatePet, onDeletePet, hasPermission }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const [modalState, setModalState] = useState<{type: 'CLIENT' | 'PET' | null, data: any}>({ type: null, data: null });
    const [dialogState, setDialogState] = useState<{type: 'CLIENT' | 'PET' | null, data: any}>({ type: null, data: null });

    const handlePetClick = (pet: Pet) => {
        setSelectedPet(pet);
        setView(View.PET_DETAIL);
    };
    
    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.pets.some(pet => pet.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleClientFormSubmit = (data: any) => {
        if (modalState.data?.id) { // Editing existing client
            onUpdateClient(modalState.data.id, data);
        } else { // Adding new client
            onAddClient(data);
        }
        setModalState({ type: null, data: null });
    };
    
    const handlePetFormSubmit = (data: any) => {
        if (modalState.data?.id) { // Editing existing pet
            onUpdatePet(modalState.data.id, data);
        } else { // Adding new pet
            onAddPet(modalState.data.ownerId, data);
        }
        setModalState({ type: null, data: null });
    };
    
    const handleConfirmDelete = () => {
        if (dialogState.type === 'CLIENT') {
            onDeleteClient(dialogState.data.id);
        } else if (dialogState.type === 'PET') {
            onDeletePet(dialogState.data.id, dialogState.data.ownerId);
        }
        setDialogState({ type: null, data: null });
    };

    return (
        <div className="p-8">
            <Modal 
                isOpen={modalState.type === 'CLIENT'}
                onClose={() => setModalState({type: null, data: null})}
                title={modalState.data?.id ? "Editar Cliente" : "Añadir Nuevo Cliente"}
            >
                <ClientForm client={modalState.data} onSubmit={handleClientFormSubmit} onCancel={() => setModalState({type: null, data: null})} />
            </Modal>
            
            <Modal 
                isOpen={modalState.type === 'PET'}
                onClose={() => setModalState({type: null, data: null})}
                title={modalState.data?.id ? "Editar Mascota" : "Añadir Nueva Mascota"}
            >
                <PetForm pet={modalState.data} ownerId={modalState.data?.ownerId} onSubmit={handlePetFormSubmit} onCancel={() => setModalState({type: null, data: null})} />
            </Modal>
            
            <ConfirmationDialog 
                isOpen={!!dialogState.type}
                onClose={() => setDialogState({ type: null, data: null})}
                onConfirm={handleConfirmDelete}
                title={`Eliminar ${dialogState.type === 'CLIENT' ? 'Cliente' : 'Mascota'}`}
                message={`¿Está seguro de que desea eliminar a ${dialogState.data?.name}? Esta acción no se puede deshacer.`}
            />

            <header className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-brand-gray-800">Clientes y Pacientes</h1>
                        <p className="text-brand-gray-600">Busque clientes o mascotas para ver sus detalles.</p>
                    </div>
                    {hasPermission(Permission.ManageClients) && (
                        <button onClick={() => setModalState({ type: 'CLIENT', data: null})} className="flex items-center px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg shadow-md hover:opacity-90 transition">
                            <PlusCircleIcon className="h-6 w-6 mr-2" />
                            Añadir Cliente
                        </button>
                    )}
                </div>
                <div className="mt-4 max-w-lg">
                    <input
                        type="text"
                        placeholder="Buscar por nombre de cliente o mascota..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
                    />
                </div>
            </header>

            <div className="space-y-6">
                {filteredClients.map(client => (
                    <div key={client.id} className="bg-white p-6 rounded-xl shadow-md">
                        <div className="flex justify-between items-start">
                           <div className="flex-1">
                             <h2 className="text-xl font-bold text-[var(--color-primary)]">{client.name}</h2>
                             <p className="text-sm text-brand-gray-600">{client.email} | {client.phone}</p>
                             <p className="text-sm text-brand-gray-500 mt-1 font-mono">ID: {client.identificationNumber}</p>
                           </div>
                           <div className="text-right flex-shrink-0 ml-4">
                                <p className="text-sm text-brand-gray-600">Cliente Desde: {new Date(client.memberSince).toLocaleDateString()}</p>
                                {hasPermission(Permission.ManageClients) && (
                                <div className="mt-1 space-x-2">
                                    <button onClick={() => setModalState({ type: 'CLIENT', data: client })} className="text-[var(--color-primary)] hover:opacity-80 p-1 rounded-full hover:bg-[var(--color-primary-light)]"><PencilIcon className="h-5 w-5"/></button>
                                    <button onClick={() => setDialogState({ type: 'CLIENT', data: client })} className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100"><TrashIcon className="h-5 w-5"/></button>
                                </div>
                                )}
                           </div>
                        </div>
                        <div className="mt-4 border-t border-brand-gray-200 pt-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-md font-semibold text-brand-gray-700">Mascotas</h3>
                                {hasPermission(Permission.ManageClients) && (
                                <button onClick={() => setModalState({type: 'PET', data: { ownerId: client.id }})} className="flex items-center text-sm text-[var(--color-primary)] hover:underline">
                                    <PlusCircleIcon className="h-5 w-5 mr-1"/> Añadir Mascota
                                </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {client.pets.map(pet => (
                                    <div key={pet.id} className="group flex items-center p-3 bg-brand-gray-100 rounded-lg hover:bg-[var(--color-primary-light)] hover:shadow-sm transition-all relative">
                                        <img onClick={() => handlePetClick(pet)} src={pet.photoUrl} alt={pet.name} className="h-12 w-12 rounded-full object-cover mr-4 cursor-pointer" />
                                        <div onClick={() => handlePetClick(pet)} className="flex-1 cursor-pointer">
                                            <p className="font-bold text-brand-gray-800">{pet.name}</p>
                                            <p className="text-sm text-brand-gray-600">{pet.breed}</p>
                                        </div>
                                        {hasPermission(Permission.ManageClients) && (
                                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity space-x-1">
                                            <button onClick={() => setModalState({ type: 'PET', data: {...pet, ownerId: client.id}})} className="text-[var(--color-primary)] hover:opacity-80 p-1 rounded-full bg-white/50 hover:bg-white"><PencilIcon className="h-4 w-4"/></button>
                                            <button onClick={() => setDialogState({ type: 'PET', data: pet})} className="text-red-600 hover:text-red-800 p-1 rounded-full bg-white/50 hover:bg-white"><TrashIcon className="h-4 w-4"/></button>
                                        </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
                {filteredClients.length === 0 && (
                     <div className="text-center py-10 bg-white rounded-xl shadow-md">
                        <p className="text-brand-gray-600">No se encontraron clientes o mascotas que coincidan con su búsqueda.</p>
                    </div>
                )}
            </div>
        </div>
    );
};