


import React from 'react';
import { Appointment, Client, Pet, Vet, Reminder } from '../types';
import { ChartBarIcon, UsersIcon, CalendarIcon, BellIcon } from './icons';

interface DashboardProps {
    appointments: Appointment[];
    clients: Client[];
    pets: Pet[];
    currentUser: Vet;
    reminders: Reminder[];
    onNavigateToPet: (petId: string) => void;
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-xl shadow-md flex items-center">
        <div className="p-4 bg-[var(--color-primary-light)] rounded-full mr-4">
            {icon}
        </div>
        <div>
            <p className="text-sm text-brand-gray-600">{title}</p>
            <p className="text-2xl font-bold text-brand-gray-800">{value}</p>
        </div>
    </div>
);


const AppointmentStatusBadge: React.FC<{ status: Appointment['status'] }> = ({ status }) => {
    const baseClasses = 'px-3 py-1 text-xs font-medium rounded-full';
    const statusClasses = {
        'Confirmada': 'bg-blue-100 text-blue-800',
        'En espera': 'bg-yellow-100 text-yellow-800',
        'En progreso': 'bg-green-100 text-green-800',
        'Completada': 'bg-gray-200 text-gray-700',
        'Cancelada': 'bg-red-100 text-red-800'
    };
    return <span className={`${baseClasses} ${statusClasses[status]}`}>{status}</span>;
}

const UpcomingReminders: React.FC<{reminders: Reminder[], onNavigateToPet: (petId: string) => void}> = ({ reminders, onNavigateToPet }) => {
    const today = new Date();
    today.setHours(0,0,0,0);

    const pendingReminders = reminders
        .filter(r => r.status === 'Pendiente')
        .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 7); // Show top 7

    const getDueDateClass = (dueDate: string) => {
        const date = new Date(dueDate);
        date.setDate(date.getDate() + 1); // Adjust for timezone issues if any
        if (date < today) return 'text-red-600 font-bold';
        return 'text-brand-gray-700';
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold text-brand-gray-800 mb-4 flex items-center">
                <BellIcon className="h-6 w-6 mr-3 text-[var(--color-primary)]" />
                Recordatorios Próximos
            </h2>
            <div className="space-y-3">
                {pendingReminders.length === 0 && <p className="text-brand-gray-500">No hay recordatorios pendientes.</p>}
                {pendingReminders.map(r => (
                    <div key={r.id} onClick={() => onNavigateToPet(r.petId)} className="p-3 bg-brand-gray-50 rounded-lg hover:bg-[var(--color-primary-light)] cursor-pointer transition">
                        <div className="flex justify-between items-center">
                            <p className="font-semibold text-brand-gray-800">{r.petName} <span className="font-normal text-brand-gray-600">({r.clientName})</span></p>
                            <p className={`text-sm ${getDueDateClass(r.dueDate)}`}>{new Date(r.dueDate).toLocaleDateString()}</p>
                        </div>
                        <p className="text-sm text-brand-gray-600">{r.message}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

export const Dashboard: React.FC<DashboardProps> = ({ appointments, clients, pets, currentUser, reminders, onNavigateToPet }) => {
    const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const waitingCount = appointments.filter(a => a.status === 'En espera' || a.status === 'En progreso').length;

    return (
        <div className="p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-brand-gray-800">¡Bienvenido de nuevo, {currentUser.name}!</h1>
                <p className="text-brand-gray-600">Esto es lo que sucede en la clínica hoy, {today}.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard title="Citas de Hoy" value={appointments.length.toString()} icon={<CalendarIcon className="h-6 w-6 text-[var(--color-primary)]"/>} />
                <StatCard title="Clientes Activos" value={clients.length.toString()} icon={<UsersIcon className="h-6 w-6 text-[var(--color-primary)]"/>} />
                <StatCard title="Pacientes en Clínica" value={waitingCount.toString()} icon={<ChartBarIcon className="h-6 w-6 text-[var(--color-primary)]"/>} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-bold text-brand-gray-800 mb-4">Agenda de Hoy</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-brand-gray-200">
                            <thead className="bg-brand-gray-100">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-gray-600 uppercase tracking-wider">Hora</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-gray-600 uppercase tracking-wider">Paciente</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-gray-600 uppercase tracking-wider">Motivo</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-gray-600 uppercase tracking-wider">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-brand-gray-200">
                                {appointments.map((appt) => (
                                    <tr key={appt.id} className="hover:bg-brand-gray-100 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-gray-900">{appt.time}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-700">{appt.petName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray-700">{appt.reason}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm"><AppointmentStatusBadge status={appt.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                 <UpcomingReminders reminders={reminders} onNavigateToPet={onNavigateToPet} />
            </div>
        </div>
    );
};