import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon, KeyIcon } from './Icons';
import { dbService, generateUUID } from '../services/db';
import { User } from '../types';

interface AuthScreenProps {
  onLoginSuccess: (user: User, rememberMe: boolean) => void;
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
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Timeout de segurança: Se o banco não responder em 8 segundos, destrava a tela.
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject("O sistema demorou para responder. Tente novamente ou recarregue a página."), 8000)
    );

    try {
      if (authMode === 'signup') {
        if (pass !== confirmPass) throw new Error('As senhas não coincidem.');
        if (pass.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');
        
        const newUser: User = {
          id: generateUUID(),
          email: email.trim(),
          name: name.trim(),
          password: pass,
          role: 'user',
          createdAt: Date.now()
        };
        
        // Race condition: Ou o cadastro funciona, ou o timeout estoura
        await Promise.race([
            dbService.createUser(newUser),
            timeoutPromise
        ]);
        
        onLoginSuccess(newUser, rememberMe);
      } else {
        // Race condition: Ou o login funciona, ou o timeout estoura
        const user = await Promise.race([
            dbService.loginUser(email.trim(), pass),
            timeoutPromise
        ]) as User;
        
        if (user) onLoginSuccess(user, rememberMe);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(typeof err === 'string' ? err : err.message || 'Erro inesperado.');
      setLoading(false); // CRUCIAL: Destrava o botão
    }
  };

  const switchMode = () => {
      setAuthMode(authMode === 'login' ? 'signup' : 'login');
      setError('');
      setLoading(false); // CRUCIAL: Garante que o botão destrava ao trocar de tela
  };

  const toggleAdmin = () => {
    setIsAdminLoginVisible(!isAdminLoginVisible);
    setAuthMode('login');
    setError('');
    setLoading(false);
  };

  return (
    <div 
      className="flex h-screen w-full bg-neural-bg items-center justify-center p-4 relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url("imagens/capa.jpg")' }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
      
      <div className="bg-neural-card/90 border border-neural-accent/20 w-full max-w-md p-8 rounded-2xl shadow-[0_0_40px_rgba(189,0,255,0.1)] relative z-10 backdrop-blur-md">
        <div className="text-center mb-8 flex flex-col items-center">
          <img src="assets/brain-logo.png" className="h-40 w-auto mb-4 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} alt="Logo" />
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1 shadow-black drop-shadow-md">
            {isAdminLoginVisible ? 'Área Administrativa' : 'Protocolo Salomão'}
          </h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'signup' && !isAdminLoginVisible && (
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-neural-accent outline-none transition-colors" placeholder="Seu nome" disabled={loading} />
          )}
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-neural-accent outline-none transition-colors" placeholder="seu@email.com" disabled={loading} />
          <div className="relative">
            <input type={showPass ? "text" : "password"} required value={pass} onChange={e => setPass(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white pr-10 placeholder-gray-400 focus:border-neural-accent outline-none transition-colors" placeholder="******" disabled={loading} />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-gray-500 hover:text-white" disabled={loading}>
              {showPass ? <EyeSlashIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}
            </button>
          </div>
          {authMode === 'signup' && !isAdminLoginVisible && (
            <input type="password" required value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-neural-accent outline-none transition-colors" placeholder="Confirmar Senha" disabled={loading} />
          )}
          
          {!isAdminLoginVisible && (
            <div className="flex items-center gap-2 px-1">
              <input 
                type="checkbox" 
                id="rememberMe" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-black/50 text-neural-accent focus:ring-neural-accent focus:ring-offset-0 cursor-pointer accent-neural-accent"
                disabled={loading}
              />
              <label htmlFor="rememberMe" className="text-sm text-gray-300 cursor-pointer select-none">
                Manter-me conectado
              </label>
            </div>
          )}

          {error && <div className="text-red-400 text-sm text-center font-medium bg-red-900/20 py-2 rounded border border-red-500/30">{error}</div>}
          
          <button 
            type="submit" 
            disabled={loading} 
            className={`w-full bg-gradient-to-r text-black font-bold py-3.5 rounded-lg shadow-lg transition-all ${
                loading 
                ? 'from-gray-500 to-gray-600 cursor-not-allowed opacity-80' 
                : (isAdminLoginVisible ? 'from-amber-400 to-yellow-600 hover:brightness-110' : 'from-neural-purple to-neural-accent hover:brightness-110')
            }`}
          >
            {loading ? 'Processando...' : (authMode === 'login' ? 'Entrar' : 'Cadastrar')}
          </button>
        </form>
        {!isAdminLoginVisible && (
          <div className="mt-8 text-center">
            <button 
                onClick={switchMode} 
                disabled={loading}
                className="text-sm text-gray-300 hover:text-white underline decoration-neural-accent/50 underline-offset-4 disabled:opacity-50"
            >
              {authMode === 'login' ? 'Não tem conta? Crie agora' : 'Já tem conta? Fazer login'}
            </button>
          </div>
        )}
        <button onClick={toggleAdmin} className={`absolute bottom-4 right-4 p-2 transition-all ${isAdminLoginVisible ? 'text-amber-400' : 'text-gray-500 opacity-30 hover:opacity-100'}`}>
          <KeyIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};