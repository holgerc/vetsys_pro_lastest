import React, { useState, useMemo } from 'react';
import { Expense, ExpenseCategory, Vet, CashierShift, Permission } from '../types';
import { Modal, ConfirmationDialog, PaginationControls } from './common';
import { PlusCircleIcon, PencilIcon, TrashIcon } from './icons';

interface ExpensesProps {
    expenses: Expense[];
    expenseCategories: ExpenseCategory[];
    activeShifts: CashierShift[];
    currentUser: Vet;
    onAddExpense: (data: Omit<Expense, 'id' | 'companyId' | 'date'>) => void;
    onAddCategory: (data: Omit<ExpenseCategory, 'id' | 'companyId'>) => void;
    onUpdateCategory: (id: string, data: Partial<ExpenseCategory>) => void;
    onDeleteCategory: (id: string) => void;
    hasPermission: (permission: Permission) => boolean;
}

const ExpenseForm: React.FC<{
    categories: ExpenseCategory[],
    activeShifts: CashierShift[],
    currentUser: Vet,
    onSubmit: (data: any) => void,
    onCancel: () => void,
}> = ({ categories, activeShifts, currentUser, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        amount: 0,
        description: '',
        categoryId: '',
        payFromCashier: false,
        cashierShiftId: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if(type === 'checkbox') {
            const isChecked = (e.target as HTMLInputElement).checked;
            setFormData(p => ({ ...p, [name]: isChecked, cashierShiftId: isChecked && activeShifts.length > 0 ? activeShifts[0].id : ''}));
        } else {
            setFormData(p => ({ ...p, [name]: name === 'amount' ? parseFloat(value) : value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const category = categories.find(c => c.id === formData.categoryId);
        if (!category) {
            alert("Por favor seleccione una categoría válida.");
            return;
        }

        const dataToSubmit = {
            amount: formData.amount,
            description: formData.description,
            categoryId: category.id,
            categoryName: category.name,
            cashierShiftId: formData.payFromCashier ? formData.cashierShiftId : undefined,
            recordedByVetId: currentUser.id,
            recordedByVetName: currentUser.name,
        };

        onSubmit(dataToSubmit);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium">Monto del Gasto</label>
                <input type="number" name="amount" step="0.01" min="0.01" value={formData.amount} onChange={handleChange} required className="w-full mt-1 p-2 border rounded-md" />
            </div>
            <div>
                <label className="block text-sm font-medium">Descripción</label>
                <textarea name="description" value={formData.description} onChange={handleChange} required rows={3} className="w-full mt-1 p-2 border rounded-md" />
            </div>
            <div>
                <label className="block text-sm font-medium">Categoría</label>
                <select name="categoryId" value={formData.categoryId} onChange={handleChange} required className="w-full mt-1 p-2 border rounded-md">
                    <option value="">Seleccione una Categoría...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            <div className="pt-4 border-t">
                <div className="flex items-center">
                    <input type="checkbox" id="payFromCashier" name="payFromCashier" checked={formData.payFromCashier} onChange={handleChange} className="h-4 w-4 text-[var(--color-primary)] border-brand-gray-300 rounded focus:ring-[var(--color-primary)]" />
                    <label htmlFor="payFromCashier" className="ml-2 block text-sm text-brand-gray-900">Pagar con efectivo de una caja abierta</label>
                </div>
                {formData.payFromCashier && (
                    activeShifts.length > 0 ? (
                        <div className="mt-2">
                             <label className="block text-sm font-medium">Seleccionar Caja</label>
                            <select name="cashierShiftId" value={formData.cashierShiftId} onChange={handleChange} required className="w-full mt-1 p-2 border rounded-md">
                                {activeShifts.map(s => <option key={s.id} value={s.id}>{s.pointOfSaleName}</option>)}
                            </select>
                        </div>
                    ) : (
                        <p className="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded-md">No hay cajas abiertas para registrar un pago en efectivo.</p>
                    )
                )}
            </div>
            <div className="flex justify-end gap-4 pt-4 border-t"><button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button><button type="submit" disabled={formData.payFromCashier && activeShifts.length === 0} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded disabled:opacity-50">Registrar Gasto</button></div>
        </form>
    );
};

const CategoryForm: React.FC<{ category: ExpenseCategory | null, onSave: (data: any) => void, onCancel: () => void }> = ({ category, onSave, onCancel }) => {
    const [name, setName] = useState(category?.name || '');
    return (
        <form onSubmit={(e)=>{e.preventDefault(); onSave({ name })}} className="space-y-4">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre de la Categoría" required className="w-full p-2 border rounded"/>
            <div className="flex justify-end gap-4 pt-4 border-t"><button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button><button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded">Guardar</button></div>
        </form>
    )
}

export const ExpensesComponent: React.FC<ExpensesProps> = (props) => {
    const { expenses, expenseCategories, activeShifts, currentUser, onAddExpense, onAddCategory, onUpdateCategory, onDeleteCategory, hasPermission } = props;
    const [activeTab, setActiveTab] = useState<'expenses' | 'categories'>('expenses');
    
    const [expenseModalOpen, setExpenseModalOpen] = useState(false);
    const [categoryModal, setCategoryModal] = useState<{ isOpen: boolean, data: ExpenseCategory | null }>({ isOpen: false, data: null });
    const [categoryDialog, setCategoryDialog] = useState<{ isOpen: boolean, data: ExpenseCategory | null }>({ isOpen: false, data: null });

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const sortedExpenses = useMemo(() => expenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [expenses]);

    const paginatedExpenses = sortedExpenses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(sortedExpenses.length / ITEMS_PER_PAGE);

    const handleSaveCategory = (data: any) => {
        if (categoryModal.data?.id) {
            onUpdateCategory(categoryModal.data.id, data);
        } else {
            onAddCategory(data);
        }
        setCategoryModal({ isOpen: false, data: null });
    };

    const handleConfirmDeleteCategory = () => {
        if(categoryDialog.data) {
            onDeleteCategory(categoryDialog.data.id);
            setCategoryDialog({ isOpen: false, data: null });
        }
    };
    
    return (
        <div className="p-8">
            <Modal isOpen={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} title="Registrar Nuevo Gasto">
                <ExpenseForm categories={expenseCategories} activeShifts={activeShifts} currentUser={currentUser} onSubmit={(data) => { onAddExpense(data); setExpenseModalOpen(false); }} onCancel={() => setExpenseModalOpen(false)} />
            </Modal>
            <Modal isOpen={categoryModal.isOpen} onClose={() => setCategoryModal({isOpen: false, data: null})} title={categoryModal.data ? 'Editar Categoría' : 'Nueva Categoría de Gasto'}>
                <CategoryForm category={categoryModal.data} onSave={handleSaveCategory} onCancel={() => setCategoryModal({isOpen: false, data: null})} />
            </Modal>
             <ConfirmationDialog isOpen={categoryDialog.isOpen} onClose={()=>setCategoryDialog({isOpen:false, data:null})} onConfirm={handleConfirmDeleteCategory} title="Eliminar Categoría" message={`¿Eliminar la categoría "${categoryDialog.data?.name}"? Esto no se puede deshacer.`} />
            
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-brand-gray-800">Gastos</h1>
                    <p className="text-brand-gray-600">Registra y gestiona los gastos de la clínica.</p>
                </div>
                 {hasPermission(Permission.ManageExpenses) && activeTab === 'expenses' && (
                    <button onClick={() => setExpenseModalOpen(true)} className="flex items-center px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg shadow-md hover:opacity-90 transition">
                        <PlusCircleIcon className="h-6 w-6 mr-2" /> Registrar Gasto
                    </button>
                )}
                 {hasPermission(Permission.ManageExpenseCategories) && activeTab === 'categories' && (
                    <button onClick={() => setCategoryModal({ isOpen: true, data: null })} className="flex items-center px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg shadow-md hover:opacity-90 transition">
                        <PlusCircleIcon className="h-6 w-6 mr-2" /> Añadir Categoría
                    </button>
                )}
            </header>
            
            <div className="mb-6 border-b border-brand-gray-300">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('expenses')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'expenses' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700'}`}>Registro de Gastos</button>
                    {hasPermission(Permission.ManageExpenseCategories) &&
                        <button onClick={() => setActiveTab('categories')} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'categories' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-brand-gray-500 hover:text-brand-gray-700'}`}>Categorías de Gastos</button>
                    }
                </nav>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
            {activeTab === 'expenses' && (
                <>
                <table className="min-w-full divide-y divide-brand-gray-200">
                    <thead className="bg-brand-gray-100"><tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Descripción</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Categoría</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Monto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Registrado Por</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Pagado De</th>
                    </tr></thead>
                    <tbody>
                        {paginatedExpenses.map(e => (
                            <tr key={e.id}>
                                <td className="px-6 py-4">{e.date}</td>
                                <td className="px-6 py-4">{e.description}</td>
                                <td className="px-6 py-4">{e.categoryName}</td>
                                <td className="px-6 py-4 font-semibold">${e.amount.toFixed(2)}</td>
                                <td className="px-6 py-4">{e.recordedByVetName}</td>
                                <td className="px-6 py-4">{e.cashierShiftId ? 'Caja' : 'Otro'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </>
            )}
            {activeTab === 'categories' && hasPermission(Permission.ManageExpenseCategories) && (
                 <table className="min-w-full divide-y divide-brand-gray-200">
                    <thead className="bg-brand-gray-100"><tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Nombre de Categoría</th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase">Acciones</th>
                    </tr></thead>
                    <tbody>
                        {expenseCategories.map(c => (
                            <tr key={c.id}>
                                <td className="px-6 py-4 font-medium">{c.name}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => setCategoryModal({ isOpen: true, data: c })} className="text-[var(--color-primary)]"><PencilIcon className="h-5 w-5"/></button>
                                    <button onClick={() => setCategoryDialog({ isOpen: true, data: c })} className="text-red-600"><TrashIcon className="h-5 w-5"/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            </div>
        </div>
    );
};