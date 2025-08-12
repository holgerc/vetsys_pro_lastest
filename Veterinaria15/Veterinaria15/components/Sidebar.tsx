



import React, { useState } from 'react';
import { View, Vet, Company, Permission } from '../types';
import { HomeIcon, CalendarIcon, UsersIcon, DocumentTextIcon, CogIcon, ArchiveIcon, ShoppingCartIcon, LogoutIcon, HeartbeatIcon, TruckIcon, CashIcon, ReceiptIcon, BoxArrowOutIcon } from './icons';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  currentUser: Vet | null;
  onLogout: () => void;
  availableCompanies: Company[];
  currentCompany: Company | null;
  onSwitchCompany: (company: Company) => void;
  hasPermission: (permission: Permission) => boolean;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <li
    onClick={onClick}
    className={`flex items-center p-3 my-1 rounded-lg cursor-pointer transition-all duration-200 ${
      isActive
        ? 'bg-[var(--color-primary)] text-white shadow-md'
        : 'text-brand-gray-700 hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]'
    }`}
  >
    {icon}
    <span className="ml-4 font-medium">{label}</span>
  </li>
);

const CompanySwitcher: React.FC<{
    availableCompanies: Company[];
    currentCompany: Company | null;
    onSwitchCompany: (company: Company) => void;
}> = ({ availableCompanies, currentCompany, onSwitchCompany }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (availableCompanies.length <= 1) {
        return (
             <div className="p-3 mb-4 rounded-lg bg-[var(--color-primary-light)]">
                <h2 className="font-bold text-[var(--color-primary)] text-lg">{currentCompany?.name}</h2>
            </div>
        )
    }

    return (
        <div className="relative mb-4">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full p-3 rounded-lg bg-[var(--color-primary-light)] text-left">
                <h2 className="font-bold text-[var(--color-primary)] text-lg">{currentCompany?.name}</h2>
                <span className="text-sm text-brand-gray-600">Cambiar de clínica</span>
            </button>
            {isOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border">
                    <ul>
                        {availableCompanies.map(company => (
                            <li key={company.id} onClick={() => { onSwitchCompany(company); setIsOpen(false); }}
                                className="p-3 hover:bg-[var(--color-primary-light)] cursor-pointer">
                                {company.name}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};


export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, currentUser, onLogout, availableCompanies, currentCompany, onSwitchCompany, hasPermission }) => {
  return (
    <div className="w-64 bg-brand-gray-100 h-screen p-4 flex flex-col fixed top-0 left-0 shadow-lg">
      <div className="flex items-center mb-4">
         <img src={currentCompany?.logoUrl || "https://i.imgur.com/Qf8c2bB.png"} alt="VetSys Pro Logo" className="h-10 w-10 mr-3 rounded-md object-cover"/>
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">VetSys Pro</h1>
      </div>
      
      {currentUser && <CompanySwitcher availableCompanies={availableCompanies} currentCompany={currentCompany} onSwitchCompany={onSwitchCompany} />}

      <nav className="flex-grow">
        {currentCompany ? (
        <ul>
          <NavItem icon={<HomeIcon className="h-6 w-6" />} label="Panel Principal" isActive={currentView === View.DASHBOARD} onClick={() => setView(View.DASHBOARD)}/>
          {hasPermission(Permission.ViewAppointments) && <NavItem icon={<CalendarIcon className="h-6 w-6" />} label="Citas" isActive={currentView === View.APPOINTMENTS} onClick={() => setView(View.APPOINTMENTS)}/>}
          {hasPermission(Permission.ViewClients) && <NavItem icon={<UsersIcon className="h-6 w-6" />} label="Clientes y Pacientes" isActive={currentView === View.CLIENTS || currentView === View.PET_DETAIL} onClick={() => setView(View.CLIENTS)}/>}
          {hasPermission(Permission.ViewHospitalizations) && <NavItem icon={<HeartbeatIcon className="h-6 w-6" />} label="Hospitalización" isActive={currentView === View.HOSPITALIZATION} onClick={() => setView(View.HOSPITALIZATION)}/>}
          {hasPermission(Permission.ViewBilling) && <NavItem icon={<DocumentTextIcon className="h-6 w-6" />} label="Facturación" isActive={currentView === View.BILLING || currentView === View.INVOICE_DETAIL} onClick={() => setView(View.BILLING)}/>}
          {hasPermission(Permission.ViewCashier) && <NavItem icon={<CashIcon className="h-6 w-6" />} label="Caja" isActive={currentView === View.CASHIER} onClick={() => setView(View.CASHIER)}/>}
          {hasPermission(Permission.ViewExpenses) && <NavItem icon={<ReceiptIcon className="h-6 w-6" />} label="Gastos" isActive={currentView === View.EXPENSES} onClick={() => setView(View.EXPENSES)}/>}
          {hasPermission(Permission.ViewInventory) && <NavItem icon={<ArchiveIcon className="h-6 w-6" />} label="Inventario" isActive={currentView === View.INVENTORY} onClick={() => setView(View.INVENTORY)}/>}
          {hasPermission(Permission.ManageInternalConsumption) && <NavItem icon={<BoxArrowOutIcon className="h-6 w-6" />} label="Consumo Interno" isActive={currentView === View.CONSUMPTION} onClick={() => setView(View.CONSUMPTION)}/>}
          {hasPermission(Permission.ViewPurchases) && <NavItem icon={<ShoppingCartIcon className="h-6 w-6" />} label="Compras" isActive={currentView === View.PURCHASES} onClick={() => setView(View.PURCHASES)}/>}
          {hasPermission(Permission.ViewSuppliers) && <NavItem icon={<TruckIcon className="h-6 w-6" />} label="Proveedores" isActive={currentView === View.SUPPLIERS} onClick={() => setView(View.SUPPLIERS)}/>}
        </ul>
        ) : (
            <div className="text-center text-brand-gray-500 p-4">Por favor, seleccione una clínica para comenzar.</div>
        )}
      </nav>
      <div>
        <ul>
            {hasPermission(Permission.ViewSettings) && <NavItem icon={<CogIcon className="h-6 w-6" />} label="Configuración" isActive={currentView === View.SETTINGS} onClick={() => setView(View.SETTINGS)}/>}
        </ul>
        <div className="border-t border-brand-gray-300 mt-4 pt-4">
            {currentUser && (
                <div className="p-2 rounded-lg mb-2">
                    <p className="font-bold text-brand-gray-800">{currentUser.name}</p>
                    <p className="text-sm text-brand-gray-600">{currentUser.isSuperAdmin ? 'Superadministrador' : currentUser.specialty}</p>
                </div>
            )}
            <button onClick={onLogout} className="w-full flex items-center p-3 text-left text-brand-gray-700 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors">
                <LogoutIcon className="h-6 w-6" />
                <span className="ml-4 font-medium">Cerrar Sesión</span>
            </button>
        </div>
      </div>
    </div>
  );
};