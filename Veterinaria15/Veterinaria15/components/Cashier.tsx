import React, { useState, useMemo } from 'react';
import { PointOfSale, CashierShift, Vet, Permission, Payment, Expense } from '../types';
import { Modal } from './common';

// Helper function for currency formatting
const formatCurrency = (value: number) => {
    return (value || 0).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
    });
};

const OpenShiftForm: React.FC<{ onSave: (balance: number) => void, onCancel: () => void }> = ({ onSave, onCancel }) => {
    const [balance, setBalance] = useState(0);
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(balance); }} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Monto de Apertura</label>
                <input type="number" step="0.01" min="0" value={balance} onChange={e => setBalance(parseFloat(e.target.value) || 0)} className="w-full mt-1 p-2 border rounded-md" required />
            </div>
            <div className="flex justify-end gap-4 pt-4 border-t"><button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button><button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded">Abrir Caja</button></div>
        </form>
    );
};

const CloseShiftForm: React.FC<{ shift: CashierShift, onSave: (data: any) => void, onCancel: () => void }> = ({ shift, onSave, onCancel }) => {
    const [closingBalance, setClosingBalance] = useState(0);
    const [notes, setNotes] = useState('');

    const summary = useMemo(() => {
        const byMethod = shift.payments.reduce((acc, p) => {
            acc[p.method] = (acc[p.method] || 0) + p.amount;
            return acc;
        }, {} as Record<Payment['method'], number>);
        
        const cashFromPayments = byMethod['Efectivo'] || 0;
        const cashForExpenses = (shift.expenses || []).reduce((acc, e) => acc + e.amount, 0);
        // This calculation is correct for the LIVE shift object as it recalculates from raw data.
        const expected = shift.openingBalance + cashFromPayments - cashForExpenses;
        const difference = closingBalance - expected;

        return { byMethod, cashFromPayments, cashForExpenses, expected, difference };
    }, [shift, closingBalance]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ closingBalance, notes });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between"><span className="font-medium">Fondo de Apertura:</span><span>{formatCurrency(shift.openingBalance)}</span></div>
                <div className="flex justify-between"><span className="font-medium text-green-700">(+) Ventas en Efectivo:</span><span className="text-green-700">{formatCurrency(summary.cashFromPayments)}</span></div>
                <div className="flex justify-between"><span className="font-medium text-red-700">(-) Gastos en Efectivo:</span><span className="text-red-700">{formatCurrency(summary.cashForExpenses)}</span></div>
                <div className="flex justify-between border-t pt-2"><strong className="text-[var(--color-primary)]">Efectivo Esperado en Caja:</strong><strong className="text-[var(--color-primary)]">{formatCurrency(summary.expected)}</strong></div>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Conteo de Efectivo (Monto de Cierre)</label>
                <input type="number" step="0.01" value={closingBalance} onChange={e => setClosingBalance(parseFloat(e.target.value) || 0)} className="w-full mt-1 p-2 border rounded-md" required />
            </div>
            <div className={`p-2 rounded-lg text-center font-bold ${summary.difference === 0 ? 'bg-gray-100' : summary.difference > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                Diferencia: {formatCurrency(summary.difference)}
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Notas de Cierre (Opcional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full mt-1 p-2 border rounded-md" />
            </div>
            <div className="flex justify-end gap-4 pt-4 border-t"><button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button><button type="submit" className="px-4 py-2 bg-red-600 text-white rounded">Cerrar Caja</button></div>
        </form>
    )
}

interface CashierProps {
    pointsOfSale: PointOfSale[];
    cashierShifts: CashierShift[];
    currentUser: Vet;
    onOpenShift: (data: any) => void;
    onCloseShift: (shiftId: string, data: any) => void;
    hasPermission: (permission: Permission) => boolean;
}

export const CashierComponent: React.FC<CashierProps> = ({ pointsOfSale, cashierShifts, currentUser, onOpenShift, onCloseShift, hasPermission }) => {
    const [modal, setModal] = useState<{ type: 'OPEN' | 'CLOSE', data: any | null }>({ type: 'OPEN', data: null });
    const [view, setView] = useState<'active' | 'history'>('active');

    const handleOpenShift = (posId: string) => { setModal({ type: 'OPEN', data: { posId } }); };
    const handleCloseShift = (shift: CashierShift) => { setModal({ type: 'CLOSE', data: shift }); };

    const handleOpenSave = (balance: number) => {
        onOpenShift({
            pointOfSaleId: modal.data.posId,
            openingBalance: balance,
            openedByVetId: currentUser.id,
            openedByVetName: currentUser.name,
        });
        setModal({ type: 'OPEN', data: null });
    };
    
     const handleCloseSave = (data: { closingBalance: number, notes?: string }) => {
        onCloseShift(modal.data.id, { ...data, closedByVetId: currentUser.id, closedByVetName: currentUser.name });
        setModal({ type: 'CLOSE', data: null });
    };

    const activePos = useMemo(() => {
        return pointsOfSale.map(pos => {
            const openShift = cashierShifts.find(s => s.pointOfSaleId === pos.id && s.status === 'Abierto');
            return { ...pos, openShift };
        });
    }, [pointsOfSale, cashierShifts]);
    
    const closedShifts = useMemo(() => {
        return cashierShifts.filter(s => s.status === 'Cerrado').sort((a, b) => new Date(b.closingTime!).getTime() - new Date(a.closingTime!).getTime());
    }, [cashierShifts]);
    
    const getModalTitle = () => {
        if (!modal.data) return '';
        if (modal.type === 'OPEN') {
            const posName = pointsOfSale.find(p => p.id === modal.data.posId)?.name || '';
            return `Abrir Caja: ${posName}`;
        }
        if (modal.type === 'CLOSE') {
            return `Cerrar Caja: ${modal.data.pointOfSaleName}`;
        }
        return '';
    };

    return (
        <div className="p-8">
            <Modal isOpen={!!modal.data} onClose={() => setModal({ type:'OPEN', data: null })} title={getModalTitle()}>
                {modal.type === 'OPEN' && modal.data && <OpenShiftForm onSave={handleOpenSave} onCancel={() => setModal({type:'OPEN', data:null})} />}
                {modal.type === 'CLOSE' && modal.data && <CloseShiftForm shift={modal.data} onSave={handleCloseSave} onCancel={() => setModal({type:'OPEN', data:null})} />}
            </Modal>

            <header className="mb-8">
                <h1 className="text-3xl font-bold text-brand-gray-800">Gestión de Caja</h1>
                <p className="text-brand-gray-600">Abre y cierra los turnos de tus puntos de venta.</p>
                 <div className="mt-4 border-b">
                    <button onClick={() => setView('active')} className={`py-2 px-4 ${view==='active' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : ''}`}>Turnos Activos</button>
                    <button onClick={() => setView('history')} className={`py-2 px-4 ${view==='history' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : ''}`}>Historial</button>
                </div>
            </header>

            {view === 'active' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activePos.map(pos => (
                        <div key={pos.id} className="bg-white p-6 rounded-xl shadow-md">
                            <h2 className="text-xl font-bold">{pos.name}</h2>
                            <p className="text-sm text-gray-500 mb-4">{pos.description}</p>
                            {pos.openShift ? (
                                <div className="space-y-2">
                                    <div className="p-3 bg-green-100 text-green-800 rounded-lg">
                                        <p className="font-bold">Caja Abierta</p>
                                        <p className="text-sm">Por: {pos.openShift.openedByVetName}</p>
                                        <p className="text-sm">Hora: {new Date(pos.openShift.openingTime).toLocaleTimeString()}</p>
                                        <p className="text-sm">Fondo Inicial: {formatCurrency(pos.openShift.openingBalance)}</p>
                                    </div>
                                    {hasPermission(Permission.ManageCashierShifts) && <button onClick={() => handleCloseShift(pos.openShift!)} className="w-full mt-2 py-2 px-4 bg-red-600 text-white rounded-lg">Cerrar Caja</button>}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="p-3 bg-gray-100 text-gray-700 rounded-lg text-center">Caja Cerrada</div>
                                    {hasPermission(Permission.ManageCashierShifts) && <button onClick={() => handleOpenShift(pos.id)} className="w-full mt-2 py-2 px-4 bg-[var(--color-primary)] text-white rounded-lg">Abrir Caja</button>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            
            {view === 'history' && (
                 <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
                     <table className="min-w-full divide-y">
                        <thead className="bg-gray-50"><tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Caja</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Cierre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Cerrado por</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Fondo Inicial</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Efectivo Esperado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Efectivo Contado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Diferencia</th>
                        </tr></thead>
                        <tbody>
                            {closedShifts.map(s => {
                                const expected = (parseFloat(s.openingBalance as any) || 0) + (parseFloat(s.calculatedCashTotal as any) || 0);
                                const difference = s.difference ?? 0;
                                return (
                                <tr key={s.id}>
                                    <td className="px-6 py-4">{s.pointOfSaleName}</td>
                                    <td className="px-6 py-4">{new Date(s.closingTime!).toLocaleString()}</td>
                                    <td className="px-6 py-4">{s.closedByVetName}</td>
                                    <td className="px-6 py-4">{formatCurrency(s.openingBalance)}</td>
                                    <td className="px-6 py-4">{formatCurrency(expected)}</td>
                                    <td className="px-6 py-4">{formatCurrency(s.closingBalance)}</td>
                                    <td className={`px-6 py-4 font-bold ${difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : ''}`}>{formatCurrency(difference)}</td>
                                </tr>
                                )
                            })}
                        </tbody>
                     </table>
                 </div>
            )}

        </div>
    );
};