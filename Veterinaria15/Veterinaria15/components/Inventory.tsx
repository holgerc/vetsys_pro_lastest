import React, { useState, useEffect } from 'react';
import { Product, Permission, ProductSupplier, Supplier } from '../types';
import { Modal, ConfirmationDialog, PaginationControls } from './common';
import { PlusCircleIcon, PencilIcon, TrashIcon } from './icons';

const ProductForm: React.FC<{
    product: Product | null;
    allSuppliers: Supplier[];
    onSave: (data: any) => void;
    onCancel: () => void;
}> = ({product, allSuppliers, onSave, onCancel}) => {
    const [activeTab, setActiveTab] = useState('details');
    const [formData, setFormData] = useState({
        name: product?.name || '',
        description: product?.description || '',
        category: product?.category || 'Medicina',
        salePrice: product?.salePrice || 0,
        initialStock: product ? product.lots.reduce((acc, lot) => acc + lot.quantity, 0) : 0,
        lowStockThreshold: product?.lowStockThreshold || 0,
        taxable: product?.taxable ?? true,
        discountPercentage: product?.discountPercentage || 0,
        usesLotTracking: product?.usesLotTracking || false,
        isDivisible: product?.isDivisible || false,
        totalVolume: product?.totalVolume || 0,
        volumeUnit: product?.volumeUnit || '',
    });
    const [productSuppliers, setProductSuppliers] = useState<ProductSupplier[]>(product?.suppliers || []);
    const [newSupplier, setNewSupplier] = useState({ supplierId: '', purchasePrice: 0 });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
             setFormData(p => ({ ...p, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            const isNumber = ['salePrice', 'initialStock', 'lowStockThreshold', 'discountPercentage', 'totalVolume'].includes(name);
            setFormData(p => ({...p, [name]: isNumber ? parseFloat(value) || 0 : value }));
        }
    };
    
    const handleAddProductSupplier = () => {
        if (!newSupplier.supplierId || newSupplier.purchasePrice <= 0) {
            alert("Por favor seleccione un proveedor e ingrese un precio de compra válido.");
            return;
        }
        if (productSuppliers.some(ps => ps.supplierId === newSupplier.supplierId)) {
            alert("Este proveedor ya está asociado al producto.");
            return;
        }
        const supplier = allSuppliers.find(s => s.id === newSupplier.supplierId);
        if (supplier) {
            setProductSuppliers(prev => [...prev, { supplierId: supplier.id, supplierName: supplier.name, purchasePrice: newSupplier.purchasePrice }]);
            setNewSupplier({ supplierId: '', purchasePrice: 0 });
        }
    };

    const handleRemoveProductSupplier = (supplierId: string) => {
        setProductSuppliers(prev => prev.filter(ps => ps.supplierId !== supplierId));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...formData, suppliers: productSuppliers });
    };

    const isDivisibleRelevant = formData.category === 'Medicina' || formData.category === 'Insumo';

    const DetailsTab = (
        <div className="space-y-6 p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="md:col-span-2">
                    <label htmlFor="name" className="block text-sm font-medium text-brand-gray-700">Nombre del Producto</label>
                    <input id="name" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
                </div>
                <div className="md:col-span-2">
                     <label htmlFor="description" className="block text-sm font-medium text-brand-gray-700">Descripción</label>
                     <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows={3} className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
                </div>
                <div>
                     <label htmlFor="category" className="block text-sm font-medium text-brand-gray-700">Categoría</label>
                     <select id="category" name="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]">
                        <option>Medicina</option><option>Alimento</option><option>Accesorio</option><option>Insumo</option><option>Servicio</option>
                    </select>
                </div>
                <div>
                     <label htmlFor="salePrice" className="block text-sm font-medium text-brand-gray-700">Precio de Venta ($)</label>
                     <input id="salePrice" name="salePrice" type="number" step="0.01" value={formData.salePrice} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
                </div>
                <div>
                     <label htmlFor="discountPercentage" className="block text-sm font-medium text-brand-gray-700">Descuento (%)</label>
                     <input id="discountPercentage" name="discountPercentage" type="number" step="1" min="0" max="100" value={formData.discountPercentage} onChange={handleChange} placeholder="Ej: 10" className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
                </div>
                 <div>
                    <label htmlFor="initialStock" className="block text-sm font-medium text-brand-gray-700">Stock Inicial</label>
                    <input id="initialStock" name="initialStock" type="number" step="any" value={formData.initialStock} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] disabled:bg-brand-gray-200" disabled={!!product || formData.usesLotTracking || formData.category === 'Servicio'}/>
                </div>
                 <div>
                    <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-brand-gray-700">Umbral de Stock Bajo</label>
                    <input id="lowStockThreshold" name="lowStockThreshold" type="number" value={formData.lowStockThreshold} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]" />
                </div>
                
                <div className="md:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-8 pt-2">
                         <div className="flex items-center">
                            <input type="checkbox" id="taxable" name="taxable" checked={formData.taxable} onChange={handleChange} className="h-4 w-4 text-[var(--color-primary)] border-brand-gray-300 rounded focus:ring-[var(--color-primary)]" />
                            <label htmlFor="taxable" className="ml-2 block text-sm text-brand-gray-900">Paga impuestos</label>
                        </div>
                         <div className="flex items-center">
                            <input type="checkbox" id="usesLotTracking" name="usesLotTracking" checked={formData.usesLotTracking} onChange={handleChange} className="h-4 w-4 text-[var(--color-primary)] border-brand-gray-300 rounded focus:ring-[var(--color-primary)] disabled:bg-brand-gray-300" disabled={!!product}/>
                            <label htmlFor="usesLotTracking" className="ml-2 block text-sm text-brand-gray-900">Usa Lote y Caducidad</label>
                        </div>
                        {isDivisibleRelevant && (
                        <div className="flex items-center">
                            <input type="checkbox" id="isDivisible" name="isDivisible" checked={formData.isDivisible} onChange={handleChange} className="h-4 w-4 text-[var(--color-primary)] border-brand-gray-300 rounded focus:ring-[var(--color-primary)]"/>
                            <label htmlFor="isDivisible" className="ml-2 block text-sm text-brand-gray-900">Es divisible</label>
                        </div>
                        )}
                    </div>
                </div>

                {isDivisibleRelevant && formData.isDivisible && (
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 mt-2 border-t">
                     <div>
                        <label htmlFor="totalVolume" className="block text-sm font-medium text-brand-gray-700">Contenido Total por Unidad</label>
                        <input id="totalVolume" name="totalVolume" type="number" step="any" min="0" value={formData.totalVolume} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm"/>
                    </div>
                     <div>
                        <label htmlFor="volumeUnit" className="block text-sm font-medium text-brand-gray-700">Unidad de Medida</label>
                        <input id="volumeUnit" name="volumeUnit" type="text" value={formData.volumeUnit} onChange={handleChange} placeholder="Ej: ml, mg, g" required className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm"/>
                    </div>
                </div>
                )}
            </div>
        </div>
    );

    const SuppliersTab = (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-brand-gray-700">Análisis de Precios</h3>
            <p className="text-sm text-brand-gray-600">
                Gestiona los proveedores de este producto. Usa esta lista de precios de compra para determinar el Precio de Venta final en la pestaña de Detalles.
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 border-b pb-2">
                {productSuppliers.length === 0 ? (
                    <p className="text-brand-gray-500 text-center py-4">No hay proveedores asociados.</p>
                ) : (
                    productSuppliers.map(ps => (
                        <div key={ps.supplierId} className="flex justify-between items-center bg-brand-gray-100 p-2 rounded-md">
                            <div>
                                <p className="font-medium text-brand-gray-800">{ps.supplierName}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <p className="text-brand-gray-600 font-mono">{ps.purchasePrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                                <button type="button" onClick={() => handleRemoveProductSupplier(ps.supplierId)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-4 w-4"/></button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="border-t pt-4">
                <h4 className="text-md font-semibold text-brand-gray-700 mb-2">Añadir Nuevo Proveedor</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 items-end gap-2">
                    <div className="sm:col-span-1">
                         <label htmlFor="supplier-select" className="text-sm font-medium text-brand-gray-700">Proveedor</label>
                        <select id="supplier-select" value={newSupplier.supplierId} onChange={e => setNewSupplier(s => ({...s, supplierId: e.target.value}))} className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm">
                            <option value="">Seleccionar...</option>
                            {allSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                     <div className="sm:col-span-1">
                         <label htmlFor="purchase-price" className="text-sm font-medium text-brand-gray-700">Precio de Compra</label>
                         <input type="number" id="purchase-price" step="0.01" min="0" value={newSupplier.purchasePrice} onChange={e => setNewSupplier(s => ({...s, purchasePrice: parseFloat(e.target.value) || 0}))} className="mt-1 block w-full px-3 py-2 bg-white border border-brand-gray-300 rounded-md shadow-sm"/>
                    </div>
                     <div className="sm:col-span-1">
                        <button type="button" onClick={handleAddProductSupplier} className="w-full px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition">Añadir</button>
                    </div>
                </div>
            </div>
        </div>
    );


    return (
         <form onSubmit={handleSubmit} className="flex flex-col h-[70vh]">
            <div className="flex-shrink-0 border-b border-brand-gray-200">
                <nav className="flex space-x-2">
                    <button type="button" onClick={() => setActiveTab('details')} className={`py-3 px-4 font-medium text-sm ${activeTab === 'details' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-b-2 border-transparent text-brand-gray-500'}`}>Detalles</button>
                    {product && <button type="button" onClick={() => setActiveTab('suppliers')} className={`py-3 px-4 font-medium text-sm ${activeTab === 'suppliers' ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-b-2 border-transparent text-brand-gray-500'}`}>Proveedores</button>}
                </nav>
            </div>

            <div className="flex-grow overflow-y-auto py-6 pr-2">
                {activeTab === 'details' && DetailsTab}
                {activeTab === 'suppliers' && product && SuppliersTab}
            </div>

            <div className="flex-shrink-0 flex justify-end space-x-4 pt-4 border-t mt-6">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-brand-gray-200 text-brand-gray-800 rounded-lg hover:bg-brand-gray-300 transition">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition">Guardar Producto</button>
            </div>
        </form>
    );
};

export const InventoryComponent: React.FC<{
    products: Product[];
    suppliers: Supplier[];
    onAddProduct: (data: Omit<Product, 'id' | 'lots'> & { initialStock?: number }) => void;
    onUpdateProduct: (id: string, data: Partial<Product>) => void;
    onDeleteProduct: (id: string) => void;
    hasPermission: (permission: Permission) => boolean;
}> = ({ products, suppliers, onAddProduct, onUpdateProduct, onDeleteProduct, hasPermission }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const handleSaveProduct = (formData: any) => {
        const { initialStock, ...dataToSubmit } = formData;
        if(editingProduct) {
            onUpdateProduct(editingProduct.id, dataToSubmit);
        } else {
            onAddProduct({ ...dataToSubmit, initialStock });
        }
        setIsModalOpen(false);
        setEditingProduct(null);
    };

    const filteredProducts = products.filter(p => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const matchesSearch = lowerSearchTerm === '' || p.name.toLowerCase().includes(lowerSearchTerm) || (p.description && p.description.toLowerCase().includes(lowerSearchTerm));
        const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);


    return (
        <div className="p-8">
             <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-brand-gray-800">Inventario</h1>
                    <p className="text-brand-gray-600">Gestiona productos y servicios.</p>
                </div>
                {hasPermission(Permission.ManageInventory) && (
                <button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="flex items-center px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg shadow-md hover:opacity-90 transition">
                    <PlusCircleIcon className="h-6 w-6 mr-2" /> Añadir Producto
                </button>
                )}
            </header>

            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingProduct(null); }} title={editingProduct ? "Editar Producto" : "Añadir Producto"} size="4xl">
                <ProductForm product={editingProduct} allSuppliers={suppliers} onSave={handleSaveProduct} onCancel={() => { setIsModalOpen(false); setEditingProduct(null); }}/>
            </Modal>
            <ConfirmationDialog isOpen={!!deletingProduct} onClose={() => setDeletingProduct(null)} onConfirm={() => { if(deletingProduct) { onDeleteProduct(deletingProduct.id); setDeletingProduct(null); }}} title="Eliminar Producto" message={`¿Eliminar ${deletingProduct?.name}? Esta acción no se puede deshacer.`}/>

            <div className="mb-4 flex items-center space-x-4">
                 <input
                    type="text"
                    placeholder="Buscar por nombre o descripción..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full max-w-sm px-4 py-2 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <select
                    value={categoryFilter}
                    onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                    className="px-4 py-2 border border-brand-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                    <option value="All">Todas las Categorías</option>
                    <option>Medicina</option>
                    <option>Alimento</option>
                    <option>Accesorio</option>
                    <option>Insumo</option>
                    <option>Servicio</option>
                </select>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
                 <table className="min-w-full divide-y divide-brand-gray-200">
                    <thead className="bg-brand-gray-100"><tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-600 uppercase">Producto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-600 uppercase">Categoría</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-600 uppercase">Existencias</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-600 uppercase">Precio</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-brand-gray-600 uppercase">Descuento</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-brand-gray-600 uppercase">Acciones</th>
                    </tr></thead>
                    <tbody>
                        {paginatedProducts.map(p => {
                            const totalStock = p.lots.reduce((acc, lot) => acc + lot.quantity, 0);
                            const isLowStock = totalStock < p.lowStockThreshold;

                            return (
                            <tr key={p.id} className={isLowStock && p.category !== 'Servicio' ? 'bg-yellow-50' : ''}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-medium text-brand-gray-900">{p.name}</div>
                                    <div className="text-sm text-brand-gray-500 space-x-2">
                                        <span>{p.taxable ? 'Con Impuesto' : 'Sin Impuesto'}</span>
                                        {p.usesLotTracking && <span className="font-semibold text-purple-600">Usa Lote</span>}
                                        {p.isDivisible && <span className="font-semibold text-green-600">Divisible</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-brand-gray-700">{p.category}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {p.category === 'Servicio' ? (
                                        <span className="text-sm text-brand-gray-500">N/A</span>
                                    ) : (
                                        <span className={`px-3 py-1 inline-block text-xs leading-5 font-semibold rounded-full ${
                                            isLowStock 
                                            ? 'bg-yellow-200 text-yellow-800' 
                                            : 'bg-green-100 text-green-800'
                                        }`}>
                                            {totalStock.toFixed(2)} en stock
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                     <span className="px-3 py-1 inline-block text-xs leading-5 font-semibold rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                                        {p.salePrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {p.discountPercentage && p.discountPercentage > 0 ? (
                                        <span className="px-3 py-1 inline-block text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                            {p.discountPercentage}% DE DTO.
                                        </span>
                                    ) : (
                                        <span className="text-sm text-brand-gray-500">—</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                    {hasPermission(Permission.ManageInventory) && (
                                    <>
                                        <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="text-[var(--color-primary)] hover:opacity-80 p-1 rounded-full hover:bg-[var(--color-primary-light)]"><PencilIcon className="h-5 w-5"/></button>
                                        <button onClick={() => setDeletingProduct(p)} className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100"><TrashIcon className="h-5 w-5"/></button>
                                    </>
                                    )}
                                </td>
                            </tr>
                        )})}
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