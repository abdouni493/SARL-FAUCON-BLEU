import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, User, Lock, Mail, Shield, HardHat, Warehouse, ShoppingCart, Settings, Wrench, Calculator, FolderKanban, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const roleIcons: Record<UserRole, React.ElementType> = {
  admin: Shield,
  chef_projet: HardHat,
  storage: Warehouse,
  purchase: ShoppingCart,
  gestionnaire: Settings,
  technique: Wrench,
  comptable: Calculator,
  resp_projets: FolderKanban,
};

const roleColors: Record<UserRole, string> = {
  admin: 'from-blue-600 to-blue-800',
  chef_projet: 'from-teal-500 to-teal-700',
  storage: 'from-amber-500 to-amber-700',
  purchase: 'from-emerald-500 to-emerald-700',
  gestionnaire: 'from-indigo-500 to-indigo-700',
  technique: 'from-orange-500 to-orange-700',
  comptable: 'from-rose-500 to-rose-700',
  resp_projets: 'from-cyan-500 to-cyan-700',
};

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login, signup, loginAsRole } = useAuth();
  const navigate = useNavigate();
  
  const [isSignup, setIsSignup] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isRtl = i18n.language === 'ar';
  const roles: UserRole[] = ['admin', 'chef_projet', 'storage', 'purchase', 'gestionnaire', 'technique', 'comptable', 'resp_projets'];

  const quickAccessCredentials: Record<UserRole, { email: string; password: string }> = {
    admin: { email: 'admin@admin.com', password: 'admin123' },
    chef_projet: { email: 'chef@projet.com', password: 'chef123' },
    storage: { email: 'stockage@stockage.com', password: 'stockage123' },
    purchase: { email: 'achats@achats.com', password: 'achats123' },
    gestionnaire: { email: 'gest@erp.com', password: 'demo' },
    technique: { email: 'tech@erp.com', password: 'demo' },
    comptable: { email: 'comptable@comptable.com', password: 'comptable123' },
    resp_projets: { email: 'resp@erp.com', password: 'demo' },
  };

  const handleQuickLogin = async (role: UserRole) => {
    setError('');
    setLoading(true);
    const { email, password } = quickAccessCredentials[role];
    
    try {
      const success = await login(email, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError(t('login.error') || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError(t('login.error') || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const success = await login(emailOrUsername, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError(t('login.error') || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError(t('login.error') || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName || !username || !email || !password || !confirmPassword) {
      setError(t('login.all_fields_required') || 'All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError(t('login.passwords_do_not_match') || 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError(t('login.password_too_short') || 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    
    try {
      const success = await signup(fullName, username, email, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError(t('login.signup_failed') || 'Signup failed. Please try again.');
      }
    } catch (err) {
      setError(t('login.signup_error') || 'An error occurred during signup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, hsl(220,30%,12%) 0%, hsl(215,80%,20%) 50%, hsl(220,35%,8%) 100%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-5xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 erp-gradient-bg"
          >
            <Building2 className="w-10 h-10 text-primary-foreground" />
          </motion.div>
          <h1 className="text-3xl font-bold text-primary-foreground">{t('app_name')}</h1>
          <button
            onClick={() => i18n.changeLanguage(isRtl ? 'fr' : 'ar')}
            className="mt-2 text-sm text-blue-300 hover:text-blue-100 transition-colors"
          >
            {isRtl ? 'Français' : 'العربية'}
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Login/Signup Form */}
          <motion.div
            initial={{ opacity: 0, x: isRtl ? 30 : -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card/95 backdrop-blur-xl rounded-2xl p-8 border border-border/50"
          >
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => { setIsSignup(false); setError(''); }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  !isSignup
                    ? 'bg-blue-600 text-white'
                    : 'text-muted-foreground hover:text-foreground border border-border'
                }`}
              >
                {t('login.title')}
              </button>
              <button
                onClick={() => { setIsSignup(true); setError(''); }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  isSignup
                    ? 'bg-blue-600 text-white'
                    : 'text-muted-foreground hover:text-foreground border border-border'
                }`}
              >
                {t('login.signup')}
              </button>
            </div>

            {error && (
              <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {!isSignup ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative">
                  <User className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRtl ? 'right' : 'left']: '12px' }} />
                  <Input
                    placeholder={t('login.email') + ' / ' + t('login.username')}
                    value={emailOrUsername}
                    onChange={e => setEmailOrUsername(e.target.value)}
                    className={isRtl ? 'pr-10' : 'pl-10'}
                    disabled={loading}
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRtl ? 'right' : 'left']: '12px' }} />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('login.password')}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={isRtl ? 'pr-10' : 'pl-10'}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-3 text-muted-foreground hover:text-foreground"
                    style={{ [isRtl ? 'left' : 'right']: '12px' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button type="submit" className="w-full erp-gradient-bg border-0 text-primary-foreground font-semibold h-12 text-base" disabled={loading}>
                  {loading ? t('login.loading') : t('login.submit')}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="relative">
                  <User className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRtl ? 'right' : 'left']: '12px' }} />
                  <Input
                    placeholder={t('common.full_name')}
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className={isRtl ? 'pr-10' : 'pl-10'}
                    disabled={loading}
                  />
                </div>
                <div className="relative">
                  <User className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRtl ? 'right' : 'left']: '12px' }} />
                  <Input
                    placeholder={t('login.username')}
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className={isRtl ? 'pr-10' : 'pl-10'}
                    disabled={loading}
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRtl ? 'right' : 'left']: '12px' }} />
                  <Input
                    type="email"
                    placeholder={t('login.email')}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={isRtl ? 'pr-10' : 'pl-10'}
                    disabled={loading}
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRtl ? 'right' : 'left']: '12px' }} />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('login.password')}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={isRtl ? 'pr-10' : 'pl-10'}
                    disabled={loading}
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute top-3 text-muted-foreground w-4 h-4" style={{ [isRtl ? 'right' : 'left']: '12px' }} />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('login.confirm_password')}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className={isRtl ? 'pr-10' : 'pl-10'}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-3 text-muted-foreground hover:text-foreground"
                    style={{ [isRtl ? 'left' : 'right']: '12px' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button type="submit" className="w-full erp-gradient-bg border-0 text-primary-foreground font-semibold h-12 text-base" disabled={loading}>
                  {loading ? t('login.loading') : t('login.signup')}
                </Button>
              </form>
            )}
          </motion.div>

          {/* Quick Access */}
          <motion.div
            initial={{ opacity: 0, x: isRtl ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card/95 backdrop-blur-xl rounded-2xl p-8 border border-border/50"
          >
            <h2 className="text-xl font-bold text-foreground mb-6">{t('login.quick_access')}</h2>
            <div className="grid grid-cols-2 gap-3">
              {roles.map((role, i) => {
                const Icon = roleIcons[role];
                return (
                  <motion.button
                    key={role}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    onClick={() => handleQuickLogin(role)}
                    disabled={loading}
                    className={`flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r ${roleColors[role]} text-primary-foreground text-sm font-medium hover:scale-[1.03] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t(`roles.${role}`)}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
