

import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, Payment, Permission, InvoiceItem, Product, ProductLot, CashierShift, Company } from '../types';
import { Modal } from './common';
import { TrashIcon, PencilIcon } from './icons';

const PaymentForm: React.FC<{
    balanceDue: number;
    activeShifts: CashierShift[];
    onSubmit: (data: { amount: number, method: Payment['method'], cashierShiftId?: string }) => void;
    onCancel: () => void;
}> = ({ balanceDue, activeShifts, onSubmit, onCancel }) => {
    const [amount, setAmount] = useState(balanceDue);
    const [method, setMethod] = useState<Payment['method']>('Tarjeta');
    const [cashierShiftId, setCashierShiftId] = useState<string>('');

    // When method changes to 'Efectivo', auto-select the first shift if available
    useEffect(() => {
        if (method === 'Efectivo' && activeShifts.length > 0) {
            setCashierShiftId(activeShifts[0].id);
        } else {
            setCashierShiftId('');
        }
    }, [method, activeShifts]);

    const isCashPayment = method === 'Efectivo';
    const noActiveShiftsForCash = isCashPayment && activeShifts.length === 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Guard clauses
        if (amount <= 0) return;
        if (noActiveShiftsForCash) {
            alert("No puede registrar un pago en efectivo porque no hay ninguna caja abierta. Por favor, vaya al módulo de 'Caja' y abra un turno primero.");
            return;
        }
        if (isCashPayment && !cashierShiftId) {
             alert("Debe seleccionar una caja para registrar un pago en efectivo.");
            return;
        }

        onSubmit({ amount, method, cashierShiftId: isCashPayment ? cashierShiftId : (cashierShiftId || undefined) });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-brand-gray-700">Monto del Pago</label>
                <input type="number" value={amount} onChange={e=>setAmount(parseFloat(e.target.value))} max={balanceDue} min="0.01" step="0.01" className="mt-1 w-full p-2 border rounded"/>
            </div>
            <div>
                <label className="block text-sm font-medium text-brand-gray-700">Método de Pago</label>
                <select value={method} onChange={e => setMethod(e.target.value as Payment['method'])} className="mt-1 w-full p-2 border rounded">
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Otro">Otro</option>
                </select>
            </div>

            {isCashPayment ? (
                // Logic for cash payments
                activeShifts.length > 0 ? (
                    <div>
                        <label className="block text-sm font-medium text-brand-gray-700">Registrar en Caja (Obligatorio)</label>
                        <select value={cashierShiftId} onChange={e => setCashierShiftId(e.target.value)} className="mt-1 w-full p-2 border rounded" required>
                             {/* No empty option to force a selection */}
                            {activeShifts.map(s => (
                                <option key={s.id} value={s.id}>{s.pointOfSaleName}</option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div className="p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md">
                        <p className="font-bold">Acción Requerida</p>
                        <p>Debe abrir una caja antes de registrar un pago en efectivo.</p>
                    </div>
                )
            ) : (
                 // Logic for other payment methods (optional shift selection)
                 activeShifts.length > 0 && (
                    <div>
                        <label className="block text-sm font-medium text-brand-gray-700">Registrar en Caja (Opcional)</label>
                        <select value={cashierShiftId} onChange={e => setCashierShiftId(e.target.value)} className="mt-1 w-full p-2 border rounded">
                            <option value="">No registrar en caja</option>
                            {activeShifts.map(s => (
                                <option key={s.id} value={s.id}>{s.pointOfSaleName}</option>
                            ))}
                        </select>
                    </div>
                )
            )}
           
            <div className="flex justify-end space-x-4 pt-4 border-t mt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-brand-gray-200 text-brand-gray-800 rounded-lg hover:bg-brand-gray-300 transition">Cancelar</button>
                <button 
                    type="submit" 
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={noActiveShiftsForCash}
                >
                    Registrar Pago
                </button>
            </div>
        </form>
    );
};

const InvoiceItemEditor: React.FC<{
    products: Product[],
    onAddItem: (item: InvoiceItem) => void,
}> = ({ products, onAddItem }) => {
    const [itemSelector, setItemSelector] = useState({productId: '', quantity: 1, lotId: '', price: 0});
    const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
    const [discountValue, setDiscountValue] = useState(0);
    const [availableLots, setAvailableLots] = useState<ProductLot[]>([]);

    const selectedProduct = useMemo(() => products.find(p => p.id === itemSelector.productId), [products, itemSelector.productId]);
    const selectedLot = useMemo(() => availableLots.find(l => l.id === itemSelector.lotId), [availableLots, itemSelector.lotId]);

     useEffect(() => {
        if(selectedProduct){
            setItemSelector(s => ({ ...s, price: selectedProduct.salePrice, lotId: '' }));
            if(selectedProduct.usesLotTracking){
                const lots = selectedProduct.lots.filter(l => l.quantity > 0).sort((a,b) => new Date(a.expirationDate || 0).getTime() - new Date(b.expirationDate || 0).getTime());
                setAvailableLots(lots);
            } else {
                setAvailableLots([]);
            }
        } else {
             setItemSelector(s => ({...s, price: 0}));
             setAvailableLots([]);
        }
    }, [selectedProduct]);

    const handleAddItem = () => {
        if(!selectedProduct || itemSelector.quantity <= 0 || itemSelector.price <= 0) return;
        if(selectedProduct.usesLotTracking && !itemSelector.lotId) return;

        const newItem: InvoiceItem = {
            id: selectedProduct.id, name: selectedProduct.name, description: selectedProduct.description,
            quantity: itemSelector.quantity, price: itemSelector.price, lotId: selectedLot?.id, lotNumber: selectedLot?.lotNumber,
            discountAmount: discountType === 'FIXED' ? discountValue : undefined,
            discountPercentage: discountType === 'PERCENT' ? discountValue : undefined,
        };
        onAddItem(newItem);
        setItemSelector({productId: '', quantity: 1, lotId: '', price: 0});
        setDiscountValue(0);
    }

    return (
        <div className="mt-4 pt-4 border-t">
            <h4 className="font-semibold text-lg text-brand-gray-700 mb-2">Añadir Nuevo Artículo</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 items-end gap-3">
                <div className="lg:col-span-3">
                    <label className="text-sm font-medium">Artículo</label>
                    <select value={itemSelector.productId} onChange={e=>setItemSelector(p=>({...p, productId:e.target.value}))} className="w-full mt-1 p-2 border rounded-md"><option value="">Seleccione un Artículo</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
                </div>
                 {selectedProduct?.usesLotTracking && (
                    <div className="lg:col-span-4">
                        <label className="text-sm font-medium">Lote</label>
                        <select value={itemSelector.lotId} onChange={e => setItemSelector(p => ({...p, lotId: e.target.value}))} required className="w-full mt-1 p-2 border rounded-md">
                            <option value="">Seleccione un lote...</option>
                            {availableLots.map(l => <option key={l.id} value={l.id}>{`${l.lotNumber} (Cant: ${l.quantity})`}</option>)}
                        </select>
                    </div>
                )}
                <div className="lg:col-span-1">
                    <label className="text-sm font-medium">Cant.</label>
                    <input type="number" min="1" max={selectedLot?.quantity} value={itemSelector.quantity} onChange={e=>setItemSelector(p=>({...p, quantity:parseInt(e.target.value)}))} className="w-full mt-1 p-2 border rounded-md"/>
                </div>
                 <div className="lg:col-span-1">
                    <label className="text-sm font-medium">Precio</label>
                    <input type="number" step="0.01" min="0" value={itemSelector.price} onChange={e=>setItemSelector(p=>({...p, price:parseFloat(e.target.value) || 0}))} className="w-full mt-1 p-2 border rounded-md"/>
                </div>
                <div className="lg:col-span-3 flex items-end gap-1">
                    <div>
                       <label className="text-sm font-medium">Descuento</label>
                       <input type="number" min="0" value={discountValue} onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)} className="w-full mt-1 p-2 border rounded-md"/>
                    </div>
                     <div className="flex-shrink-0 mb-px">
                         <button type="button" onClick={() => setDiscountType('PERCENT')} className={`px-3 py-2 rounded-l-md border ${discountType === 'PERCENT' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white'}`}>%</button>
                         <button type="button" onClick={() => setDiscountType('FIXED')} className={`px-3 py-2 rounded-r-md border -ml-px ${discountType === 'FIXED' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white'}`}>$</button>
                     </div>
                </div>
                <div className="lg:col-span-2">
                     <button type="button" onClick={handleAddItem} className="w-full p-2 bg-[var(--color-primary)] text-white rounded-md font-semibold hover:opacity-90 transition" disabled={!itemSelector.productId}>Añadir a la Factura</button>
                </div>
            </div>
        </div>
    )
}


export const InvoiceDetailComponent: React.FC<{
    invoice: Invoice | null;
    products: Product[];
    activeShifts: CashierShift[];
    currentCompany: Company | null;
    onBack: () => void;
    onRecordPayment: (invoiceId: string, paymentData: { amount: number, method: Payment['method'], cashierShiftId?: string }) => void;
    onUpdateInvoice: (invoiceId: string, updates: Partial<Invoice>) => void;
    hasPermission: (permission: Permission) => boolean;
}> = ({ invoice, products, activeShifts, currentCompany, onBack, onRecordPayment, onUpdateInvoice, hasPermission }) => {
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedItems, setEditedItems] = useState<InvoiceItem[]>([]);

    useEffect(() => {
        if (invoice && isEditing) {
            setEditedItems(JSON.parse(JSON.stringify(invoice.items)));
        }
    }, [isEditing, invoice]);
    
    if(!invoice) return <div className="p-8">Factura no encontrada. <button onClick={onBack} className="text-[var(--color-primary)] hover:underline">Volver</button></div>;

    const formatCurrency = (value: number) => {
        return (value || 0).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
        });
    };

    const handlePaymentSubmit = (data: { amount: number, method: Payment['method'], cashierShiftId?: string }) => {
        onRecordPayment(invoice.id, data);
        setPaymentModalOpen(false);
    };

    const handleSaveChanges = () => {
        onUpdateInvoice(invoice.id, { items: editedItems });
        setIsEditing(false);
    };
    
    const handleUpdateItem = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...editedItems];
        const numValue = parseFloat(value) || 0;

        if (field === 'quantity' || field === 'price' || field === 'discountPercentage' || field === 'discountAmount') {
             newItems[index] = { ...newItems[index], [field]: numValue };
        }
        setEditedItems(newItems);
    };

    const handleRemoveItem = (index: number) => {
        setEditedItems(current => current.filter((_, i) => i !== index));
    };

    const taxDisplay = (invoice.taxRate * 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    
    const canEditInvoice = invoice.status === 'No pagada' && invoice.amountPaid === 0 && hasPermission(Permission.ManageBilling);


    const ReadOnlyView = () => (
         <div className="bg-white p-8 rounded-xl shadow-md max-w-4xl mx-auto">
            <header className="flex justify-between items-start pb-4 border-b">
                <div>
                    <h2 className="text-3xl font-bold text-[var(--color-primary)]">FACTURA</h2>
                    <p className="text-brand-gray-600">N° {invoice.invoiceNumber || invoice.id.substring(0,8)}</p>
                </div>
                 <div className="text-right">
                    {canEditInvoice && (
                        <button onClick={() => setIsEditing(true)} className="flex items-center ml-auto mb-2 px-4 py-2 bg-yellow-500 text-white rounded-lg shadow-md hover:bg-yellow-600 transition">
                            <PencilIcon className="h-5 w-5 mr-2" /> Editar Factura
                        </button>
                    )}
                    <img src={currentCompany?.logoUrl || "https://i.imgur.com/Qf8c2bB.png"} alt="Logo" className="h-12 ml-auto object-contain mb-2"/>
                    <p className="font-bold">{currentCompany?.name}</p>
                    <p className="text-sm">{currentCompany?.address}</p>
                </div>
            </header>
            <section className="grid grid-cols-2 gap-8 my-6">
                <div>
                    <h4 className="font-bold text-brand-gray-600 mb-2">CLIENTE</h4>
                    <p className="font-semibold text-brand-gray-800">{invoice.client.name}</p>
                    <p className="text-sm text-brand-gray-700">ID: {invoice.client.identificationNumber}</p>
                    <p className="text-sm text-brand-gray-700">{invoice.client.billingAddress || invoice.client.address}</p>
                    <p className="text-sm text-brand-gray-700">{invoice.client.email}</p>
                </div>
                <div className="text-right">
                    <p><strong>Fecha:</strong> {invoice.date}</p>
                    <p><strong>Estado:</strong> {invoice.status}</p>
                    {invoice.pet && <p><strong>Paciente:</strong> {invoice.pet.name}</p>}
                </div>
            </section>
            <section>
                <table className="min-w-full">
                    <thead className="bg-brand-gray-100"><tr>
                       <th className="p-2 text-left text-xs font-medium uppercase">Artículo</th>
                       <th className="p-2 text-center text-xs font-medium uppercase">Cant.</th>
                       <th className="p-2 text-right text-xs font-medium uppercase">Precio Unitario</th>
                       <th className="p-2 text-right text-xs font-medium uppercase">Descuento</th>
                       <th className="p-2 text-right text-xs font-medium uppercase">Total</th>
                    </tr></thead>
                    <tbody>
                        {invoice.items.map((item, i) => {
                            const discountAmount = item.discountPercentage ? (item.price * (item.discountPercentage / 100)) : (item.discountAmount || 0);
                            const finalPrice = item.price - discountAmount;
                            return (
                                <tr key={i} className="border-b">
                                    <td className="p-2">
                                        {item.name}
                                        {item.lotNumber && <div className="text-xs text-brand-gray-500 font-mono">Lote: {item.lotNumber}</div>}
                                    </td>
                                    <td className="p-2 text-center">{item.quantity}</td>
                                    <td className="p-2 text-right">{formatCurrency(item.price)}</td>
                                    <td className="p-2 text-right text-red-600">-{formatCurrency(discountAmount * item.quantity)}</td>
                                    <td className="p-2 text-right font-semibold">{formatCurrency(finalPrice * item.quantity)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </section>
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                <div>
                    <h4 className="font-bold text-brand-gray-600 mb-2">Historial de Pagos</h4>
                    {invoice.paymentHistory.length > 0 ? (
                        <table className="min-w-full text-sm">
                            <thead className="bg-brand-gray-100"><tr>
                                <th className="p-2 text-left">Fecha</th>
                                <th className="p-2 text-left">Método</th>
                                <th className="p-2 text-right">Monto</th>
                            </tr></thead>
                            <tbody>
                                {invoice.paymentHistory.map((p, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="p-2">{p.date}</td>
                                        <td className="p-2">{p.method}</td>
                                        <td className="p-2 text-right">{formatCurrency(p.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-sm text-brand-gray-500">No se han registrado pagos.</p>
                    )}
                </div>
                <div className="w-full space-y-2 self-end">
                    <div className="flex justify-between"><span className="text-brand-gray-600">Subtotal:</span><span>{formatCurrency(invoice.subtotal)}</span></div>
                    {invoice.totalDiscount > 0 && <div className="flex justify-between text-red-600"><span className="text-brand-gray-600">Descuentos:</span><span>-{formatCurrency(invoice.totalDiscount)}</span></div>}
                    <div className="flex justify-between"><span className="text-brand-gray-600">Impuesto ({taxDisplay}%):</span><span>{formatCurrency(invoice.tax)}</span></div>
                    <div className="flex justify-between font-bold text-xl"><span className="text-brand-gray-800">Total:</span><span>{formatCurrency(invoice.total)}</span></div>
                    <div className="flex justify-between"><span className="text-brand-gray-600">Pagado:</span><span>-{formatCurrency(invoice.amountPaid)}</span></div>
                    <div className="flex justify-between font-bold text-xl bg-[var(--color-primary-light)] p-2 rounded"><span className="text-[var(--color-primary)]">Saldo Pendiente:</span><span className="text-[var(--color-primary)]">{formatCurrency(invoice.balanceDue)}</span></div>
                </div>
            </section>
            <footer className="mt-8 pt-4 border-t text-center">
                {invoice.status !== 'Pagada' && hasPermission(Permission.ManageBilling) && <button onClick={()=>setPaymentModalOpen(true)} className="px-6 py-3 bg-[var(--color-accent)] text-white rounded-lg shadow-md">Registrar Pago</button>}
            </footer>
        </div>
    );

    const EditView = () => (
        <div className="bg-white p-8 rounded-xl shadow-md max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-brand-gray-800 mb-6">Editando Factura N° {invoice.invoiceNumber || invoice.id.substring(0,8)}</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-brand-gray-100">
                        <tr>
                            <th className="p-2 text-left font-medium uppercase">Artículo</th>
                            <th className="p-2 text-center font-medium uppercase w-20">Cant.</th>
                            <th className="p-2 text-right font-medium uppercase w-28">Precio</th>
                            <th className="p-2 text-right font-medium uppercase w-28">DTO (%)</th>
                            <th className="p-2 text-right font-medium uppercase">Total</th>
                            <th className="p-2 text-right font-medium uppercase w-12"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {editedItems.map((item, index) => {
                            const itemTotal = (item.quantity * item.price * (1 - (item.discountPercentage || 0) / 100));
                            return (
                            <tr key={`${item.id}-${index}`} className="border-b">
                                <td className="p-2 align-middle">{item.name}</td>
                                <td className="p-2 align-middle">
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)}
                                        className="w-full text-center p-1 border rounded-md"
                                        min="1"
                                    />
                                </td>
                                <td className="p-2 align-middle">
                                    <input
                                        type="number"
                                        value={item.price}
                                        onChange={(e) => handleUpdateItem(index, 'price', e.target.value)}
                                        className="w-full text-right p-1 border rounded-md"
                                        step="0.01" min="0"
                                    />
                                </td>
                                <td className="p-2 align-middle">
                                    <input
                                        type="number"
                                        value={item.discountPercentage || 0}
                                        onChange={(e) => handleUpdateItem(index, 'discountPercentage', e.target.value)}
                                        className="w-full text-right p-1 border rounded-md"
                                        step="1" min="0" max="100"
                                    />
                                </td>
                                <td className="p-2 text-right font-semibold align-middle">{formatCurrency(itemTotal)}</td>
                                <td className="p-2 text-right align-middle">
                                    <button onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700 p-1"><TrashIcon className="h-4 w-4"/></button>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
            </div>
    
            <InvoiceItemEditor products={products} onAddItem={(newItem) => setEditedItems(current => [...current, newItem])} />
    
            <div className="flex justify-end space-x-4 mt-8 pt-4 border-t">
                <button onClick={() => setIsEditing(false)} className="px-6 py-2 bg-brand-gray-200 text-brand-gray-800 rounded-lg hover:bg-brand-gray-300 font-medium">Cancelar</button>
                <button onClick={handleSaveChanges} className="px-6 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 font-medium">Guardar Cambios</button>
            </div>
        </div>
    );
    

    return (
        <div className="p-8 bg-brand-gray-200 min-h-screen">
             <button onClick={onBack} className="mb-6 text-[var(--color-primary)] hover:underline">&larr; Volver a Facturación</button>
            {isEditing ? <EditView/> : <ReadOnlyView/>}
             <Modal isOpen={isPaymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Registrar Nuevo Pago">
                <PaymentForm balanceDue={invoice.balanceDue} activeShifts={activeShifts} onSubmit={handlePaymentSubmit} onCancel={() => setPaymentModalOpen(false)} />
            </Modal>
        </div>
    )
};