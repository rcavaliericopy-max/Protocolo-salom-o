import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon, KeyIcon } from './Icons';
import { dbService } from '../services/db';
import { User } from '../types';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isAdminLoginVisible, setIsAdminLoginVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (authMode === 'signup') {
        if (pass !== confirmPass) throw new Error('As senhas não coincidem.');
        if (pass.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');
        
        const newUser: User = {
          id: crypto.randomUUID(),
          email,
          name,
          password: pass,
          role: 'user',
          createdAt: Date.now()
        };
        await dbService.createUser(newUser);
        onLoginSuccess(newUser);
      } else {
        const user = await dbService.loginUser(email, pass);
        if (user) onLoginSuccess(user);
      }
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || 'Erro inesperado.');
      setLoading(false);
    }
  };

  const toggleAdmin = () => {
    setIsAdminLoginVisible(!isAdminLoginVisible);
    setAuthMode('login');
    setError('');
  };

  return (
    <div className="flex h-screen w-full bg-neural-bg items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neural-purple/10 via-transparent to-transparent opacity-50"></div>
      <div className="bg-neural-card border border-neural-accent/20 w-full max-w-md p-8 rounded-2xl shadow-[0_0_40px_rgba(189,0,255,0.1)] relative z-10 backdrop-blur-md">
        <div className="text-center mb-8 flex flex-col items-center">
          <img src="assets/brain-logo.png" className="h-40 w-auto mb-4 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} alt="Logo" />
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">{isAdminLoginVisible ? 'Área Administrativa' : 'Protocolo Salomão'}</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'signup' && !isAdminLoginVisible && (
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white" placeholder="Seu nome" />
          )}
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white" placeholder="seu@email.com" />
          <div className="relative">
            <input type={showPass ? "text" : "password"} required value={pass} onChange={e => setPass(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white pr-10" placeholder="******" />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-gray-500 hover:text-white">
              {showPass ? <EyeSlashIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}
            </button>
          </div>
          {authMode === 'signup' && !isAdminLoginVisible && (
            <input type="password" required value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white" placeholder="Confirmar Senha" />
          )}
          {error && <div className="text-red-400 text-sm text-center">{error}</div>}
          <button type="submit" disabled={loading} className={`w-full bg-gradient-to-r text-black font-bold py-3.5 rounded-lg hover:brightness-110 ${isAdminLoginVisible ? 'from-amber-400 to-yellow-600' : 'from-neural-purple to-neural-accent'}`}>
            {loading ? '...' : (authMode === 'login' ? 'Entrar' : 'Cadastrar')}
          </button>
        </form>
        {!isAdminLoginVisible && (
          <div className="mt-8 text-center">
            <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(''); }} className="text-sm text-gray-400 underline decoration-neural-accent/50">
              {authMode === 'login' ? 'Criar conta' : 'Fazer login'}
            </button>
          </div>
        )}
        <button onClick={toggleAdmin} className={`absolute bottom-4 right-4 p-2 transition-all ${isAdminLoginVisible ? 'text-amber-400' : 'text-gray-800 opacity-20'}`}>
          <KeyIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};