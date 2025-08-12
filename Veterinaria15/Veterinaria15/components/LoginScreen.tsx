import React, { useState } from 'react';

export const LoginScreen: React.FC<{ onLogin: (email: string, pass: string) => void; error: string | null; }> = ({ onLogin, error }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(email, password);
    };

    return (
        <div className="flex items-center justify-center h-screen bg-brand-gray-100">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl">
                <div className="text-center">
                    <img src="https://i.imgur.com/Qf8c2bB.png" alt="VetSys Pro Logo" className="w-20 h-20 mx-auto mb-4"/>
                    <h2 className="text-3xl font-bold text-brand-gray-900">Bienvenido a VetSys Pro</h2>
                    <p className="mt-2 text-brand-gray-600">Por favor, inicie sesión en su cuenta</p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input id="email-address" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-brand-gray-300 placeholder-brand-gray-500 text-brand-gray-900 rounded-t-md focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] focus:z-10 sm:text-sm" placeholder="Correo electrónico" />
                        </div>
                        <div>
                            <input id="password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-brand-gray-300 placeholder-brand-gray-500 text-brand-gray-900 rounded-b-md focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] focus:z-10 sm:text-sm" placeholder="Contraseña" />
                        </div>
                    </div>
                     {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                    <div>
                        <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[var(--color-primary)] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] transition">
                            Iniciar Sesión
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};