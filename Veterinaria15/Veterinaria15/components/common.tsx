import React from 'react';

export const Modal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}> = ({ isOpen, onClose, title, children, size = '2xl' }) => {
    if (!isOpen) return null;

    const sizeClasses = {
        'md': 'max-w-md',
        'lg': 'max-w-lg',
        'xl': 'max-w-xl',
        '2xl': 'max-w-2xl',
        '4xl': 'max-w-4xl',
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className={`bg-white rounded-xl shadow-2xl w-full ${sizeClasses[size]} transform transition-all flex flex-col`} onClick={(e) => e.stopPropagation()}>
                <div className="flex-shrink-0 flex justify-between items-center p-6 border-b border-brand-gray-200">
                    <h3 id="modal-title" className="text-2xl font-bold text-brand-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-brand-gray-500 hover:text-brand-gray-800 text-3xl leading-none">&times;</button>
                </div>
                <div className="p-6 flex-grow overflow-hidden">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const ConfirmationDialog: React.FC<{ isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }> = ({ isOpen, onClose, onConfirm, title, message }) => (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
        <p className="text-brand-gray-700 mb-6">{message}</p>
        <div className="flex justify-end space-x-4">
            <button onClick={onClose} className="px-4 py-2 bg-brand-gray-200 text-brand-gray-800 rounded-lg hover:bg-brand-gray-300 transition">Cancelar</button>
            <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">Confirmar</button>
        </div>
    </Modal>
);

export const PaginationControls: React.FC<{
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    return (
        <div className="mt-6 flex justify-between items-center text-sm">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-brand-gray-200 text-brand-gray-800 rounded-lg hover:bg-brand-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Anterior
            </button>
            <span className="text-brand-gray-700">
                Página {currentPage} de {totalPages}
            </span>
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-brand-gray-200 text-brand-gray-800 rounded-lg hover:bg-brand-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Siguiente
            </button>
        </div>
    );
};
