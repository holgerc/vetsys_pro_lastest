import React, { useState, useMemo } from 'react';
import { Product, Purchase, Permission, Supplier } from '../types';
import { PaginationControls } from './common';

export const PurchasesComponent: React.FC<{
    products: Product[];
    purchases: Purchase[];
    suppliers: Supplier[];
    onAddPurchase: (data: Omit<Purchase, 'id' | 'companyId' | 'productName' | 'date' | 'supplierName'>) => void;
    hasPermission: (permission: Permission) => boolean;
}> = ({ products, purchases, suppliers, onAddPurchase, hasPermission }) => {
    const [formData, setFormData] = useState({productId: '', quantity: 1, lotNumber: '', expirationDate: '', supplierId: '', purchasePrice: 0});
    const selectedProduct = useMemo(() => products.find(p => p.id === formData.productId), [products, formData.productId]);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!selectedProduct || formData.quantity <= 0 || !formData.supplierId || formData.purchasePrice <= 0) {
            alert('Por favor, complete todos los campos obligatorios.');
            return;
        }
        if(selectedProduct.usesLotTracking && (!formData.lotNumber || !formData.expirationDate)) {
            alert('El número de lote y la fecha de caducidad son obligatorios para los artículos con seguimiento de lote.');
            return;
        }
        
        const dataToSend = {
            ...formData,
            expirationDate: formData.expirationDate || undefined,
        };
        
        onAddPurchase(dataToSend);
        setFormData({productId: '', quantity: 1, lotNumber: '', expirationDate: '', supplierId: '', purchasePrice: 0});
    };

    const filteredPurchases = purchases
        .filter(p => {
            const searchLower = searchTerm.toLowerCase();
            return searchLower === '' ||
                p.productName.toLowerCase().includes(searchLower) ||
                p.supplierName.toLowerCase().includes(searchLower) ||
                (p.lotNumber && p.lotNumber.toLowerCase().includes(searchLower));
        })
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalPages = Math.ceil(filteredPurchases.length / ITEMS_PER_PAGE);
    const paginatedPurchases = filteredPurchases.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);


    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-brand-gray-800 mb-8">Compras y Entradas de Stock</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {hasPermission(Permission.ManagePurchases) && (
                <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-bold mb-4">Recibir Mercancía</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                           <label className="block text-sm font-medium text-brand-gray-700">Producto</label>
                           <select value={formData.productId} onChange={e => setFormData({...formData, productId: e.target.value, lotNumber: '', expirationDate: ''})} className="mt-1 w-full px-3 py-2 border rounded-md" required>
                               <option value="">Seleccionar Producto...</option>
                               {products.filter(p=>p.category !== 'Servicio').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                           </select>
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-brand-gray-700">Proveedor</label>
                           <select value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md" required>
                               <option value="">Seleccionar Proveedor...</option>
                               {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                           </select>
                        </div>
                         {selectedProduct?.usesLotTracking && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-700">Número de Lote</label>
                                    <input type="text" value={formData.lotNumber} onChange={e => setFormData({...formData, lotNumber: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-brand-gray-700">Fecha de Caducidad</label>
                                    <input type="date" value={formData.expirationDate} onChange={e => setFormData({...formData, expirationDate: e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-md" required />
                                </div>
                            </>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-brand-gray-700">Cantidad</label>
                                <input type="number" min="1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} className="mt-1 w-full px-3 py-2 border rounded-md" required />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-brand-gray-700">Precio de Compra</label>
                                <input type="number" min="0.01" step="0.01" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: parseFloat(e.target.value)})} className="mt-1 w-full px-3 py-2 border rounded-md" required />
                            </div>
                        </div>
                        <button type="submit" className="w-full px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition">Añadir a Inventario</button>
                    </form>
                </div>
                )}
                 <div className={`md:col-span-${hasPermission(Permission.ManagePurchases) ? '2' : '3'} bg-white p-6 rounded-xl shadow-md`}>
                     <h2 className="text-xl font-bold mb-4">Historial de Compras</h2>
                     <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Buscar por Producto, Proveedor o Lote N°"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full max-w-sm px-4 py-2 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                        />
                    </div>
                     <table className="min-w-full divide-y divide-brand-gray-200">
                         <thead className="bg-brand-gray-100"><tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Producto</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Proveedor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Cantidad</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Costo Unitario</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase">Lote N°</th>
                         </tr></thead>
                         <tbody>
                            {paginatedPurchases.map(p => (
                                <tr key={p.id}>
                                    <td className="px-6 py-4">{new Date(p.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">{p.productName}</td>
                                    <td className="px-6 py-4">{p.supplierName}</td>
                                    <td className="px-6 py-4">{p.quantity}</td>
                                    <td className="px-6 py-4">{p.purchasePrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                                    <td className="px-6 py-4 font-mono text-sm">{p.lotNumber || 'N/A'}</td>
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
        </div>
    )
};