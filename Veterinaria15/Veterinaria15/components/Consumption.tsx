import React, { useState, useMemo } from 'react';
import { Product, ProductLot, InternalConsumption, Vet, Permission } from '../types';
import { PaginationControls } from './common';

interface ConsumptionProps {
    products: Product[];
    internalConsumptions: InternalConsumption[];
    currentUser: Vet;
    onAddConsumption: (data: Omit<InternalConsumption, 'id' | 'companyId' | 'date' | 'productName' | 'lotNumber'>) => void;
    hasPermission: (permission: Permission) => boolean;
}

const ConsumptionForm: React.FC<{
    products: Product[],
    currentUser: Vet,
    onSubmit: (data: any) => void,
}> = ({ products, currentUser, onSubmit }) => {
    
    const initialFormState = {
        productId: '',
        lotId: '',
        quantity: 1,
        consumedVolume: 0,
        reason: '',
    };
    
    const [formData, setFormData] = useState(initialFormState);

    const availableProducts = useMemo(() => {
        return products.filter(p => p.category !== 'Servicio');
    }, [products]);

    const selectedProduct = useMemo(() => {
        return products.find(p => p.id === formData.productId);
    }, [products, formData.productId]);

    const availableLots = useMemo(() => {
        if (!selectedProduct || !selectedProduct.usesLotTracking) return [];
        return selectedProduct.lots.filter(l => l.quantity > 0);
    }, [selectedProduct]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const isNumber = ['quantity', 'consumedVolume'].includes(name);
        setFormData(prev => ({...prev, [name]: isNumber ? parseFloat(value) : value }));
        
        if (name === 'productId') {
            setFormData(prev => ({...prev, lotId: ''}));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const dataToSubmit: any = {
            productId: formData.productId,
            lotId: formData.lotId,
            reason: formData.reason,
            recordedByVetId: currentUser.id,
            recordedByVetName: currentUser.name,
        };

        if (selectedProduct?.isDivisible) {
            if (!formData.consumedVolume || formData.consumedVolume <= 0 || !selectedProduct.totalVolume || selectedProduct.totalVolume <= 0) {
                alert("Por favor, ingrese un volumen consumido válido y asegúrese de que el producto tenga un volumen total configurado.");
                return;
            }
            dataToSubmit.quantity = formData.consumedVolume / selectedProduct.totalVolume;
        } else {
            if (formData.quantity <= 0) {
                alert("Por favor, ingrese una cantidad válida.");
                return;
            }
            dataToSubmit.quantity = formData.quantity;
        }

        onSubmit(dataToSubmit);
        setFormData(initialFormState); // Reset form
    };

    const maxQuantity = useMemo(() => {
        if (!selectedProduct) return undefined;
        if (selectedProduct.usesLotTracking) {
            const lot = availableLots.find(l => l.id === formData.lotId);
            return lot?.quantity;
        }
        return selectedProduct.lots[0]?.quantity;
    }, [selectedProduct, formData.lotId, availableLots]);


    return (
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold text-brand-gray-800 mb-4">Registrar Consumo Interno</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label htmlFor="productId" className="block text-sm font-medium text-brand-gray-700">Producto</label>
                    <select id="productId" name="productId" value={formData.productId} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-brand-gray-300 rounded-md">
                        <option value="">Seleccione un producto...</option>
                        {availableProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                {selectedProduct?.usesLotTracking && (
                     <div>
                        <label htmlFor="lotId" className="block text-sm font-medium text-brand-gray-700">Lote</label>
                        <select id="lotId" name="lotId" value={formData.lotId} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-brand-gray-300 rounded-md">
                            <option value="">Seleccione un lote...</option>
                            {availableLots.map(l => <option key={l.id} value={l.id}>{l.lotNumber} (Cant: {l.quantity.toFixed(2)})</option>)}
                        </select>
                    </div>
                )}
                
                {selectedProduct?.isDivisible ? (
                    <div>
                        <label htmlFor="consumedVolume" className="block text-sm font-medium text-brand-gray-700">Cantidad Consumida ({selectedProduct.volumeUnit || 'unidades'})</label>
                        <input type="number" id="consumedVolume" name="consumedVolume" value={formData.consumedVolume} onChange={handleChange} min="0.01" step="any" max={maxQuantity ? selectedProduct.totalVolume * maxQuantity : undefined} required className="mt-1 block w-full px-3 py-2 border border-brand-gray-300 rounded-md"/>
                    </div>
                ) : (
                    <div>
                        <label htmlFor="quantity" className="block text-sm font-medium text-brand-gray-700">Cantidad Consumida (Unidades)</label>
                        <input type="number" id="quantity" name="quantity" value={formData.quantity} onChange={handleChange} min="1" step="1" max={maxQuantity} required className="mt-1 block w-full px-3 py-2 border border-brand-gray-300 rounded-md"/>
                    </div>
                )}
                
                <div>
                     <label htmlFor="reason" className="block text-sm font-medium text-brand-gray-700">Motivo del Consumo</label>
                    <textarea id="reason" name="reason" value={formData.reason} onChange={handleChange} required rows={3} placeholder="Ej: Uso en quirófano, material dañado, vencido, etc." className="mt-1 block w-full px-3 py-2 border border-brand-gray-300 rounded-md"></textarea>
                </div>
                
                <button type="submit" className="w-full px-4 py-2 bg-[var(--color-primary)] text-white font-semibold rounded-lg hover:opacity-90 transition-colors disabled:opacity-50" disabled={!formData.productId}>
                    Registrar Consumo
                </button>
            </form>
        </div>
    )
}


export const ConsumptionComponent: React.FC<ConsumptionProps> = ({ products, internalConsumptions, currentUser, onAddConsumption, hasPermission }) => {
    
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const sortedConsumptions = useMemo(() => {
        return [...internalConsumptions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [internalConsumptions]);

    const paginatedConsumptions = sortedConsumptions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(sortedConsumptions.length / ITEMS_PER_PAGE);

    return (
        <div className="p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-brand-gray-800">Consumo Interno</h1>
                <p className="text-brand-gray-600">Registra productos del inventario que se utilizan para gastos internos o se dan de baja.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    {hasPermission(Permission.ManageInternalConsumption) && (
                        <ConsumptionForm products={products} currentUser={currentUser} onSubmit={onAddConsumption} />
                    )}
                </div>
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-bold text-brand-gray-800 mb-4">Historial de Consumo</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-brand-gray-200">
                             <thead className="bg-brand-gray-100"><tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-600 uppercase">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-600 uppercase">Producto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-600 uppercase">Cantidad</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-600 uppercase">Motivo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-600 uppercase">Registrado Por</th>
                            </tr></thead>
                            <tbody className="bg-white divide-y divide-brand-gray-200">
                                {paginatedConsumptions.map(item => (
                                    <tr key={item.id} className="hover:bg-brand-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(item.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-gray-900">
                                            {item.productName}
                                            {item.lotNumber && <div className="text-xs text-brand-gray-500 font-mono">Lote: {item.lotNumber}</div>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-center">{item.quantity.toFixed(3)}</td>
                                        <td className="px-6 py-4 text-sm">{item.reason}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{item.recordedByVetName}</td>
                                    </tr>
                                ))}
                                {paginatedConsumptions.length === 0 && (
                                    <tr><td colSpan={5} className="text-center py-6 text-brand-gray-500">No hay registros de consumo.</td></tr>
                                )}
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
        </div>
    );
};