import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { loginWithGoogle, loginWithEmail, registerWithEmail, sendResetEmail, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(location.state?.register || false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Registration metadata states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+244'); // Default to Angola
  const [phoneNumber, setPhoneNumber] = useState('');
  const [roleType, setRoleType] = useState('student');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status message states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.register !== undefined) {
      setIsRegistering(location.state.register);
    }
  }, [location.state]);

  // Clear states when toggling views
  useEffect(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [isRegistering]);

  const handlePasswordResetClick = async () => {
    if (!email) {
      setErrorMessage("Por favor, digite seu E-mail no campo correspondente antes de solicitar a redefinição.");
      return;
    }
    
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await sendResetEmail(email);
      setSuccessMessage(`Um link de redefinição de chave / senha foi enviado para ${email}. Verifique a sua caixa de entrada ou pasta de spam.`);
    } catch (err: any) {
      console.error("Failed to reset password", err);
      setErrorMessage("Ocorreu um erro ao enviar o e-mail de redefinição: " + (err?.message || err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserRouting = async (user: any, registrationData?: { firstName: string; lastName: string; phoneCountryCode: string; phoneNumber: string; roleType: string }) => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    const cleanEmail = (user.email || '').trim().toLowerCase();
    const isAdminEmail = cleanEmail === 'exportacoes.extras@gmail.com' || cleanEmail === 'grupocassaminha@gmail.com';

    let role = isAdminEmail ? 'admin' : 'student';
    let status = isAdminEmail ? 'active' : 'inactive';

    if (!userSnap.exists()) {
      if (registrationData?.roleType && !isAdminEmail) {
        role = registrationData.roleType;
      }
      status = (role === 'admin' || role === 'producer' || isAdminEmail) ? 'active' : 'inactive';
      
      const payload: any = {
        uid: user.uid,
        email: user.email,
        role: role,
        subscriptionStatus: status,
        createdAt: serverTimestamp()
      };

      if (registrationData) {
        payload.firstName = registrationData.firstName;
        payload.lastName = registrationData.lastName;
        payload.phoneCountryCode = registrationData.phoneCountryCode;
        payload.phoneNumber = registrationData.phoneNumber;
      }

      await setDoc(userRef, payload);
    } else {
      const data = userSnap.data();
      role = isAdminEmail ? 'admin' : (data.role || 'student');
      status = (isAdminEmail || role === 'admin' || role === 'producer') ? 'active' : (data.subscriptionStatus || 'inactive');

      if (isAdminEmail && (data.role !== 'admin' || data.subscriptionStatus !== 'active')) {
        await setDoc(userRef, { role: 'admin', subscriptionStatus: 'active', roleType: 'admin' }, { merge: true });
      }

      if (registrationData) {
        await setDoc(userRef, {
          firstName: registrationData.firstName,
          lastName: registrationData.lastName,
          phoneCountryCode: registrationData.phoneCountryCode,
          phoneNumber: registrationData.phoneNumber
        }, { merge: true });
      }
    }
    
    if (role === 'admin' || role === 'producer' || isAdminEmail) {
      navigate('/dashboard');
    } else if (status === 'active') {
      navigate('/library');
    } else {
      navigate('/pending');
    }
  };

  const getFriendlyErrorMessage = (error: any, context: 'login' | 'register') => {
    const code = error?.code || '';
    const message = error?.message || '';
    
    switch (code) {
      case 'auth/email-already-in-use':
        return 'Este e-mail já está cadastrado. Por favor, tente fazer login ou use outro e-mail.';
      case 'auth/weak-password':
        return 'A senha é muito fraca. Ela deve conter pelo menos 6 caracteres.';
      case 'auth/invalid-email':
        return 'O endereço de e-mail informado não é válido.';
      case 'auth/operation-not-allowed':
        return 'O login com e-mail e senha está desativado no console do Firebase. Ative a autenticação "Email/Senha" no seu console Firebase.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Credenciais incorretas ou inválidas. Caso não tenha uma conta, clique em "Não tem uma conta? Cadastre-se" abaixo e crie-a primeiro com a mesma senha desejada.';
      case 'auth/popup-closed-by-user':
        return 'A janela de autenticação foi fechada antes de concluir o login.';
      default:
        // Include raw message inside details for developer visibility
        return `${context === 'register' ? 'Falha ao criar conta' : 'Falha no login'}: ${message}`;
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    
    if (isRegistering) {
      if (!firstName.trim()) {
        setErrorMessage("Por favor, informe o seu Primeiro Nome.");
        return;
      }
      if (!lastName.trim()) {
        setErrorMessage("Por favor, informe o seu Último Nome.");
        return;
      }
      if (!phoneNumber.trim()) {
        setErrorMessage("Por favor, insira o seu número de telefone.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage("A Chave de Acesso e a confirmação não coincidem. Certifique-se de digitar a mesma senha duas vezes.");
        return;
      }
    }

    setIsLoading(true);
    try {
      let user;
      if (isRegistering) {
        user = await registerWithEmail(email, password);
      } else {
        user = await loginWithEmail(email, password);
      }
      await handleUserRouting(
        user,
        isRegistering ? { firstName, lastName, phoneCountryCode, phoneNumber, roleType } : undefined
      );
    } catch (error: any) {
      console.error("Auth failed", error);
      setErrorMessage(getFriendlyErrorMessage(error, isRegistering ? 'register' : 'login'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const user = await loginWithGoogle();
      await handleUserRouting(user);
    } catch (error: any) {
      console.error("Login failed", error);
      setErrorMessage(getFriendlyErrorMessage(error, 'login'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen relative flex flex-col overflow-hidden">
      <div className="fixed inset-0 z-0">
        <img
          className="w-full h-full object-cover opacity-30 blur-sm"
          alt="Trading floor"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCOkxwvUgvLTY6Lm9DxFNpJFev2gyUaghB-KnWWM0CAXlOoXt-DpaosRTyEnAVvD6Jeuc8GJ6p5pn-w9yX3jYPk11vL_P1Z7lRiAOx9VgMRwvi13E40T5BMnTWA4spkL9TJvn94bx_36VDEmAoXy5LVWLRotAO9GyoyaMVpsdWLGSnbb-zYVz8MwKYzpTghH3wwCdX79DhiB9_NNy6pbVHgdCrWFNtTWUWyZ6iapmtJ_MEI1QaPFxMFk6fsrdIC-BKGTpOINpVQRQ"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/80 to-transparent"></div>
        <div className="absolute inset-0 grain-overlay"></div>
      </div>
      <header className="relative z-10 w-full px-8 py-10 flex justify-center md:justify-start" id="login-header">
        <Link to="/sales" className="flex items-center gap-2 hover:opacity-80 transition-all cursor-pointer group" id="cfa-brand-logo">
          <span className="material-symbols-outlined text-primary text-3xl group-hover:scale-[1.05] transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>
            school
          </span>
          <h1 className="text-3xl font-black tracking-tighter text-primary font-headline">CFA</h1>
        </Link>
      </header>
      <main className="relative z-10 flex-grow flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-[480px] bg-surface-container-highest/60 backdrop-blur-2xl p-10 md:p-14 rounded-xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] border border-outline-variant/10">
          <div className="mb-8 text-center">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary mb-2 block font-label">Acesso de Alunos</span>
            <h2 className="text-3xl font-bold tracking-tight text-on-surface font-headline">{isRegistering ? 'Criar Conta' : 'Login Seguro'}</h2>
            <p className="text-on-surface-variant text-sm mt-2 font-body">
              {isRegistering ? 'Cadastre-se para acessar os seus cursos.' : 'Acesse seus cursos de Importação, Mercado Financeiro, Administração e muito mais.'}
            </p>
          </div>

          {/* Inline notification banners */}
          {errorMessage && (
            <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-200 text-sm p-4 rounded-xl flex flex-col gap-3">
              <div className="flex gap-2.5 items-start">
                <span className="material-symbols-outlined text-rose-400 text-lg flex-shrink-0 mt-0.5">error</span>
                <div className="flex-grow">
                  <p className="leading-relaxed font-body">{errorMessage}</p>
                  {errorMessage.includes('já está cadastrado') && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegistering(false);
                          setErrorMessage(null);
                        }}
                        className="bg-primary hover:brightness-110 active:scale-95 text-black font-black text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                      >
                        Fazer Login
                      </button>
                      <button
                        type="button"
                        onClick={handlePasswordResetClick}
                        className="bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                      >
                        Recuperar Senha
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-sm p-4 rounded-xl flex gap-2.5 items-start">
              <span className="material-symbols-outlined text-emerald-400 text-lg flex-shrink-0 mt-0.5">check_circle</span>
              <p className="leading-relaxed font-body">{successMessage}</p>
            </div>
          )}
          
          <form className="space-y-4" onSubmit={handleEmailSubmit}>
            {isRegistering && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider font-label" htmlFor="roleType">
                  TIPO DE CONTA
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-surface-container-lowest border-none rounded-xl py-3.5 pl-4 pr-12 text-on-surface text-sm focus:ring-1 focus:ring-primary transition-all duration-300 outline-none font-body appearance-none cursor-pointer"
                    id="roleType"
                    value={roleType}
                    onChange={(e) => setRoleType(e.target.value)}
                  >
                    <option value="student">Aluno / Estudante</option>
                    <option value="producer">Produtor / Administrador</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-lg">keyboard_arrow_down</span>
                  </div>
                </div>
              </div>
            )}

            {isRegistering && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider font-label" htmlFor="firstName">
                    PRIMEIRO NOME
                  </label>
                  <input
                    className="w-full bg-surface-container-lowest border-none rounded-xl py-3.5 px-4 text-on-surface placeholder:text-outline-variant/60 focus:ring-1 focus:ring-primary transition-all duration-300 outline-none font-body"
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ex: João"
                    type="text"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider font-label" htmlFor="lastName">
                    ÚLTIMO NOME
                  </label>
                  <input
                    className="w-full bg-surface-container-lowest border-none rounded-xl py-3.5 px-4 text-on-surface placeholder:text-outline-variant/60 focus:ring-1 focus:ring-primary transition-all duration-300 outline-none font-body"
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ex: Silva"
                    type="text"
                    required
                  />
                </div>
              </div>
            )}

            {isRegistering && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider font-label" htmlFor="phoneNumber">
                  CONTATO DO PAI / RESPONSÁVEL (DDI E TELEFONE)
                </label>
                <div className="flex gap-2">
                  <div className="relative w-[35%] min-w-[100px]">
                    <select
                      className="w-full bg-surface-container-lowest border-none rounded-xl py-3.5 pl-3 pr-8 text-on-surface text-sm focus:ring-1 focus:ring-primary transition-all duration-300 outline-none font-body appearance-none cursor-pointer"
                      value={phoneCountryCode}
                      onChange={(e) => setPhoneCountryCode(e.target.value)}
                      aria-label="Código telefônico do país (DDI)"
                    >
                      <option value="+55">🇧🇷 +55</option>
                      <option value="+244">🇦🇴 +244</option>
                      <option value="+351">🇵🇹 +351</option>
                      <option value="+258">🇲🇿 +258</option>
                      <option value="+238">🇨🇻 +238</option>
                      <option value="+245">🇬🇼 +245</option>
                      <option value="+239">🇸🇹 +239</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+34">🇪🇸 +34</option>
                      <option value="+44">🇬🇧 +44</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                    </div>
                  </div>
                  
                  <input
                    className="flex-grow w-[65%] bg-surface-container-lowest border-none rounded-xl py-3.5 px-4 text-on-surface placeholder:text-outline-variant/60 focus:ring-1 focus:ring-primary transition-all duration-300 outline-none font-body"
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="99999-9999"
                    type="tel"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider font-label" htmlFor="email">
                E-MAIL INSTITUCIONAL
              </label>
              <div className="relative">
                <input
                  className="w-full bg-surface-container-lowest border-none rounded-xl py-3.5 px-4 text-on-surface placeholder:text-outline-variant/60 focus:ring-1 focus:ring-primary transition-all duration-300 outline-none font-body"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@cassamia.academy"
                  type="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider font-label" htmlFor="password">
                {isRegistering ? 'CRIAR UMA SENHA' : 'CHAVE DE ACESSO'}
              </label>
              <div className="relative flex items-center">
                <input
                  className="w-full bg-surface-container-lowest border-none rounded-xl py-3.5 pl-4 pr-12 text-on-surface placeholder:text-outline-variant/60 focus:ring-1 focus:ring-primary transition-all duration-300 outline-none font-body"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  type={showPassword ? 'text' : 'password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-on-surface-variant hover:text-primary transition-colors focus:outline-none p-1 flex items-center justify-center cursor-pointer"
                  aria-label={showPassword ? 'Ocultar chave' : 'Mostrar chave'}
                >
                  <span className="material-symbols-outlined text-xl select-none" style={{ fontVariationSettings: "'FILL' 0" }}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {!isRegistering && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={handlePasswordResetClick}
                    className="text-xs text-primary/80 hover:text-primary hover:underline transition-colors focus:outline-none cursor-pointer font-medium"
                  >
                    Esqueceu a chave de acesso?
                  </button>
                </div>
              )}
            </div>

            {isRegistering && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider font-label" htmlFor="confirmPassword">
                  CONFIRMAR SENHA / CHAVE
                </label>
                <div className="relative flex items-center">
                  <input
                    className="w-full bg-surface-container-lowest border-none rounded-xl py-3.5 pl-4 pr-12 text-on-surface placeholder:text-outline-variant/60 focus:ring-1 focus:ring-primary transition-all duration-300 outline-none font-body"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    type={showPassword ? 'text' : 'password'}
                    required
                  />
                  {password && confirmPassword && (
                    <span className="absolute right-11 flex items-center justify-center pointer-events-none">
                      {password === confirmPassword ? (
                        <span className="material-symbols-outlined text-emerald-500 text-lg" title="As senhas coincidem">check_circle</span>
                      ) : (
                        <span className="material-symbols-outlined text-rose-500 text-lg" title="As senhas de acesso não coincidem">warning</span>
                      )}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-on-surface-variant hover:text-primary transition-colors focus:outline-none p-1 flex items-center justify-center cursor-pointer"
                    aria-label={showPassword ? 'Ocultar chave' : 'Mostrar chave'}
                  >
                    <span className="material-symbols-outlined text-xl select-none" style={{ fontVariationSettings: "'FILL' 0" }}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-[0_10px_20px_-10px_rgba(233,195,73,0.3)] hover:brightness-110 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 mt-4 font-headline disabled:opacity-70"
            >
              <span>{isLoading ? 'Processando...' : (isRegistering ? 'Criar Conta' : 'Entrar')}</span>
              {!isLoading && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
            </button>
          </form>

          <div className="relative flex items-center py-6">
            <div className="flex-grow border-t border-outline-variant/20"></div>
            <span className="flex-shrink-0 mx-4 text-on-surface-variant text-xs font-label uppercase tracking-widest">OU</span>
            <div className="flex-grow border-t border-outline-variant/20"></div>
          </div>
          
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-4 px-6 bg-white text-black font-bold rounded-xl shadow-lg hover:bg-gray-100 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 font-headline disabled:opacity-70"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Continuar com Google</span>
            </button>
          </div>
          
          <div className="mt-8 flex flex-col gap-4 text-center">
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-sm text-primary font-medium hover:underline decoration-primary/30 underline-offset-4 transition-all font-body"
            >
              {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Cadastre-se'}
            </button>
            <div className="flex items-center justify-center gap-4 text-[11px] text-on-surface-variant uppercase tracking-widest mt-2 font-label">
              <a className="hover:text-on-surface transition-colors" href="#">TERMOS DE SERVIÇO</a>
              <span className="w-1 h-1 bg-outline-variant rounded-full"></span>
              <a className="hover:text-on-surface transition-colors" href="#">POLÍTICA DE PRIVACIDADE</a>
            </div>
            <div className="mt-6 pt-6 border-t border-outline-variant/20">
              <p className="text-xs text-on-surface-variant font-body">Uma empresa do <strong className="text-primary">Grupo Cassaminha</strong></p>
            </div>
          </div>
        </div>
      </main>
      <footer className="relative z-10 w-full px-8 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-label">CONEXÃO COM OS SERVIDORES</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(147,214,160,0.5)]"></span>
              <span className="text-xs font-medium text-secondary font-body">Plataforma Online</span>
            </div>
          </div>
          <div className="h-8 w-[1px] bg-outline-variant/20 hidden md:block"></div>
          <div className="flex flex-col">
            <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-label">STATUS DO ACESSO</span>
            <span className="text-xs font-medium text-on-surface font-body">Serviço de Nuvem Ativo</span>
          </div>
        </div>
        <div className="flex gap-4">
          <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-xl">language</span>
          </button>
          <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-xl">help</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
