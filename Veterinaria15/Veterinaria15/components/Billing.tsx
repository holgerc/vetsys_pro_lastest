

import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, Client, Product, InvoiceItem, ProductLot, Permission } from '../types';
import { Modal, PaginationControls } from './common';
import { PlusCircleIcon, DocumentTextIcon, TrashIcon } from './icons';

const CounterSaleForm: React.FC<{
    clients: Client[],
    products: Product[],
    onSubmit: (data: { clientId: string, items: InvoiceItem[] }) => void,
    onCancel: () => void
}> = ({ clients, products, onSubmit, onCancel }) => {
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [clientSearchResults, setClientSearchResults] = useState<Client[]>([]);

    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [itemSelector, setItemSelector] = useState({productId: '', quantity: 1, lotId: '', price: 0});
    const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
    const [discountValue, setDiscountValue] = useState(0);

    const [availableLots, setAvailableLots] = useState<ProductLot[]>([]);
    
    const selectedProduct = useMemo(() => products.find(p => p.id === itemSelector.productId), [products, itemSelector.productId]);
    const selectedLot = useMemo(() => availableLots.find(l => l.id === itemSelector.lotId), [availableLots, itemSelector.lotId]);

    useEffect(() => {
        if (clientSearchTerm && !selectedClient) {
            setClientSearchResults(
                clients.filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()))
                .slice(0, 5) // Limit results
            );
        } else {
            setClientSearchResults([]);
        }
    }, [clientSearchTerm, clients, selectedClient]);


    useEffect(() => {
        if (selectedProduct) {
            setItemSelector(s => ({ ...s, price: selectedProduct.salePrice, lotId: '' }));
            if (selectedProduct.usesLotTracking) {
                const lots = selectedProduct.lots
                    .filter(l => l.quantity > 0)
                    .sort((a,b) => new Date(a.expirationDate || 0).getTime() - new Date(b.expirationDate || 0).getTime());
                setAvailableLots(lots);
            } else {
                setAvailableLots([]);
            }
        } else {
            setItemSelector(s => ({ ...s, price: 0, lotId: '' }));
            setAvailableLots([]);
        }
    }, [selectedProduct]);

    const handleSelectClient = (client: Client) => {
        setSelectedClient(client);
        setClientSearchTerm(client.name);
        setClientSearchResults([]);
    };

    const handleAddItem = () => {
        if(!selectedProduct || itemSelector.quantity <= 0 || itemSelector.price <= 0) return;
        if(selectedProduct.usesLotTracking && !itemSelector.lotId) return;

        const newItem: InvoiceItem = {
            id: selectedProduct.id, 
            name: selectedProduct.name, 
            description: selectedProduct.description,
            quantity: itemSelector.quantity, 
            price: itemSelector.price,
            lotId: selectedLot?.id, 
            lotNumber: selectedLot?.lotNumber,
            discountAmount: discountType === 'FIXED' ? discountValue : undefined,
            discountPercentage: discountType === 'PERCENT' ? discountValue : undefined,
        };
        setItems(current => [...current, newItem]);
        // Reset item form
        setItemSelector({productId: '', quantity: 1, lotId: '', price: 0});
        setDiscountValue(0);
    };
    const handleRemoveItem = (index: number) => {
        setItems(current => current.filter((_, i) => i !== index));
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!selectedClient || items.length === 0) return;
        onSubmit({clientId: selectedClient.id, items});
    };

    const subtotal = useMemo(() => items.reduce((acc, item) => acc + item.price * item.quantity, 0), [items]);
    const totalDiscount = useMemo(() => {
        return items.reduce((acc, item) => {
            const itemTotal = item.price * item.quantity;
            const itemDiscount = (item.discountPercentage
                ? (itemTotal * (item.discountPercentage / 100))
                : (item.discountAmount || 0));
            return acc + itemDiscount;
        }, 0);
    }, [items]);
    
    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-[75vh]">
            <div className="flex-grow p-1 overflow-y-auto">
                {/* Client Selection */}
                <div className="relative mb-4">
                    <label className="block text-sm font-medium text-brand-gray-700">Cliente</label>
                    <input
                        type="text"
                        value={clientSearchTerm}
                        onChange={(e) => {
                            setClientSearchTerm(e.target.value);
                            if(selectedClient) setSelectedClient(null);
                        }}
                        placeholder="Buscar un cliente..."
                        className="mt-1 block w-full px-3 py-2 border rounded-md"
                        required
                    />
                    {selectedClient && <button type="button" onClick={() => { setSelectedClient(null); setClientSearchTerm('')}} className="absolute right-2 top-8 text-red-500 font-bold">&times;</button>}
                    {clientSearchResults.length > 0 && (
                        <ul className="absolute z-10 w-full bg-white border mt-1 rounded-md shadow-lg">
                            {clientSearchResults.map(client => (
                                <li key={client.id} onClick={() => handleSelectClient(client)} className="p-2 hover:bg-[var(--color-primary-light)] cursor-pointer">
                                    {client.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Item List */}
                <div className="mt-6">
                    <h3 className="text-lg font-semibold">Artículos</h3>
                    <div className="space-y-2 mt-2 max-h-48 overflow-y-auto pr-2">
                        {items.length === 0 && <p className="text-brand-gray-500 text-center py-4">No se han añadido artículos.</p>}
                        {items.map((item, index) => (
                             <div key={index} className="flex justify-between items-center bg-brand-gray-100 p-2 rounded-md">
                                <div>
                                   <p className="font-medium text-brand-gray-800">{item.name} (x{item.quantity})</p>
                                </div>
                                <div className="flex items-center">
                                    <p className="text-brand-gray-600 mr-4">{(item.price * item.quantity).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                                    <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-4 w-4"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Item Adder */}
                <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-1 sm:grid-cols-6 items-end gap-2">
                         <div className="sm:col-span-3">
                            <label className="text-sm font-medium">Añadir Artículo</label>
                            <select value={itemSelector.productId} onChange={e => setItemSelector(p => ({...p, productId: e.target.value}))} className="mt-1 block w-full p-2 border rounded-md">
                                <option value="">Seleccione un artículo...</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        
                        <div className="sm:col-span-1">
                            <label className="text-sm font-medium">Cant.</label>
                            <input type="number" value={itemSelector.quantity} onChange={e => setItemSelector(p => ({...p, quantity: parseInt(e.target.value, 10)}))} min="1" className="mt-1 block w-full p-2 border rounded-md"/>
                        </div>
                        <div className="sm:col-span-1">
                            <label className="text-sm font-medium">Precio ($)</label>
                            <input type="number" value={itemSelector.price} onChange={e => setItemSelector(p => ({...p, price: parseFloat(e.target.value) || 0}))} step="0.01" min="0" className="mt-1 block w-full p-2 border rounded-md"/>
                        </div>
                        <div className="sm:col-span-1">
                             <label className="text-sm font-medium text-white">.</label>
                            <button type="button" onClick={handleAddItem} className="w-full px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition">Añadir</button>
                        </div>
                         {selectedProduct?.usesLotTracking && (
                            <div className="sm:col-span-6">
                                <label className="text-sm font-medium">Lote</label>
                                <select value={itemSelector.lotId} onChange={e => setItemSelector(p => ({...p, lotId: e.target.value}))} required className="mt-1 block w-full p-2 border rounded-md">
                                    <option value="">Seleccione un lote...</option>
                                    {availableLots.map(l => <option key={l.id} value={l.id}>{`${l.lotNumber} (Cant: ${l.quantity})`}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="flex-shrink-0 pt-4 border-t">
                 <div className="flex justify-end space-x-4">
                    <button type="button" onClick={onCancel} className="px-6 py-2 bg-brand-gray-200 text-brand-gray-800 rounded-lg hover:bg-brand-gray-300 transition font-medium">Cancelar</button>
                    <button type="submit" disabled={!selectedClient || items.length === 0} className="px-6 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 transition font-medium disabled:opacity-50">Crear Factura</button>
                </div>
            </div>
        </form>
    );
};

export const BillingComponent: React.FC<{
    invoices: Invoice[];
    clients: Client[];
    products: Product[];
    onNavigateToInvoice: (invoiceId: string) => void;
    onAddCounterSale: (data: {clientId: string, items: InvoiceItem[]}) => void;
    hasPermission: (permission: Permission) => boolean;
}> = ({ invoices, clients, products, onNavigateToInvoice, onAddCounterSale, hasPermission }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('all_time');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const handleFormSubmit = (data: { clientId: string, items: InvoiceItem[] }) => {
        onAddCounterSale(data);
        setIsModalOpen(false);
    };

    const filteredInvoices = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const monthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
        const yearStr = new Date().toISOString().slice(0, 4); // YYYY
        
        return invoices
            .filter(inv => {
                const matchesFilter = filter === 'All' || inv.status === filter;
                const matchesSearch = searchTerm === '' || 
                    inv.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));

                let matchesDate = true;
                switch (dateFilter) {
                    case 'today':
                        matchesDate = new Date(inv.date).toISOString().split('T')[0] === todayStr;
                        break;
                    case 'this_month':
                        matchesDate = new Date(inv.date).toISOString().slice(0, 7) === monthStr;
                        break;
                    case 'this_year':
                        matchesDate = new Date(inv.date).toISOString().slice(0, 4) === yearStr;
                        break;
                    case 'all_time':
                    default:
                        matchesDate = true;
                }

                return matchesFilter && matchesSearch && matchesDate;
            })
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [invoices, filter, searchTerm, dateFilter]);

    const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
    const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const getStatusClass = (status: Invoice['status']) => {
        const classes = { 'Pagada': 'bg-green-100 text-green-800', 'No pagada': 'bg-yellow-100 text-yellow-800', 'Vencida': 'bg-red-100 text-red-800' };
        return classes[status];
    };

    return (
        <div className="p-8">
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Venta de Mostrador" size="4xl">
                <CounterSaleForm clients={clients} products={products} onSubmit={handleFormSubmit} onCancel={() => setIsModalOpen(false)} />
            </Modal>
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-brand-gray-800">Facturación</h1>
                    <p className="text-brand-gray-600">Gestiona todas las facturas y pagos.</p>
                </div>
                {hasPermission(Permission.ManageBilling) && (
                <button onClick={() => setIsModalOpen(true)} className="flex items-center px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg shadow-md hover:opacity-90 transition">
                    <PlusCircleIcon className="h-6 w-6 mr-2" /> Venta de Mostrador
                </button>
                )}
            </header>

            <div className="mb-4 flex items-center space-x-4">
                 <input
                    type="text"
                    placeholder="Buscar por cliente o N° de factura"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full max-w-sm px-4 py-2 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <select
                    value={filter}
                    onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }}
                    className="px-4 py-2 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                    <option value="All">Todos los Estados</option>
                    <option value="Pagada">Pagada</option>
                    <option value="No pagada">No Pagada</option>
                    <option value="Vencida">Vencida</option>
                </select>
                <select
                    value={dateFilter}
                    onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                    className="px-4 py-2 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                    <option value="all_time">Desde Siempre</option>
                    <option value="today">Hoy</option>
                    <option value="this_month">Este Mes</option>
                    <option value="this_year">Este Año</option>
                </select>
            </div>
            
             <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
                 <table className="min-w-full divide-y divide-brand-gray-200">
                    <thead className="bg-brand-gray-100"><tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Factura N°</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Cliente</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Total</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Saldo Pendiente</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Estado</th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase">Acciones</th>
                    </tr></thead>
                    <tbody>
                        {paginatedInvoices.map(inv => (
                            <tr key={inv.id} className="hover:bg-brand-gray-50">
                                <td className="px-6 py-4 font-mono text-sm">{inv.invoiceNumber}</td>
                                <td className="px-6 py-4">{new Date(inv.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4">{inv.client.name}</td>
                                <td className="px-6 py-4">{inv.total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                                <td className={`px-6 py-4 font-semibold ${inv.balanceDue > 0 ? 'text-red-600' : 'text-brand-gray-700'}`}>
                                    {inv.balanceDue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                </td>
                                <td className="px-6 py-4"><span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(inv.status)}`}>{inv.status}</span></td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => onNavigateToInvoice(inv.id)} className="text-[var(--color-primary)] p-1 rounded-full hover:bg-[var(--color-primary-light)]">
                                        <DocumentTextIcon className="h-5 w-5"/>
                                    </button>
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