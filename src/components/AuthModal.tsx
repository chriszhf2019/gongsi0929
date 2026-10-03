import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  Building,
  Briefcase,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalInitialTab,
    login,
    register,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(authModalInitialTab);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Register form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regOrg, setRegOrg] = useState('');
  const [regRole, setRegRole] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!loginEmail.trim()) {
      setErrorMsg('请输入注册邮箱');
      return;
    }
    if (!loginPassword) {
      setErrorMsg('请输入登录密码');
      return;
    }
    setIsSubmitting(true);
    const result = await login(loginEmail.trim(), loginPassword);
    setIsSubmitting(false);
    if (!result.ok) {
      setErrorMsg(result.error || '登录失败');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!regName.trim() || !regEmail.trim()) {
      setErrorMsg('请填写姓名与邮箱');
      return;
    }
    if (regPassword.length < 8 || !/[a-zA-Z]/.test(regPassword) || !/[0-9]/.test(regPassword)) {
      setErrorMsg('密码至少 8 位，且需同时包含字母与数字');
      return;
    }
    setIsSubmitting(true);
    const result = await register(
      regName.trim(),
      regEmail.trim(),
      regPassword,
      regOrg.trim(),
      regRole.trim()
    );
    setIsSubmitting(false);
    if (!result.ok) {
      setErrorMsg(result.error || '注册失败');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F3437]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-xs border border-[#E2E6E2] bg-white shadow-2xl p-6 sm:p-8 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 rounded-xs border border-[#E2E6E2] bg-white p-1.5 text-[#627578] hover:text-[#1F3437] hover:bg-[#F6F7F5] transition-colors"
          title="关闭"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 rounded-xs bg-[#FAFBF9] border border-[#E2E6E2] px-3 py-1 text-xs font-serif font-medium text-[#3E6F73]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#3E6F73]" />
            <span>鉴源・GenSight 账号</span>
          </div>
          <h2 className="text-2xl font-bold font-serif text-[#1F3437] tracking-tight">
            {activeTab === 'login' && '登录您的产业投研账号'}
            {activeTab === 'register' && '注册账号'}
          </h2>
          <p className="text-xs text-[#627578] font-serif">
            账号由服务端会话管理，配额与订单均与账号绑定
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 bg-[#F0F2EF] p-1 rounded-xs border border-[#E2E6E2] mb-6">
          <button
            onClick={() => {
              setActiveTab('login');
              setErrorMsg('');
            }}
            className={`py-2 text-xs font-serif font-medium rounded-xs transition-all ${
              activeTab === 'login'
                ? 'bg-[#1F3437] text-white font-bold shadow-xs'
                : 'text-[#627578] hover:text-[#1F3437] hover:bg-white'
            }`}
          >
            账号登录
          </button>
          <button
            onClick={() => {
              setActiveTab('register');
              setErrorMsg('');
            }}
            className={`py-2 text-xs font-serif font-medium rounded-xs transition-all ${
              activeTab === 'register'
                ? 'bg-[#1F3437] text-white font-bold shadow-xs'
                : 'text-[#627578] hover:text-[#1F3437] hover:bg-white'
            }`}
          >
            新用户注册
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-xs bg-[#B84233]/10 border border-[#B84233]/30 px-3.5 py-2 text-xs text-[#B84233] font-serif">
            {errorMsg}
          </div>
        )}

        {/* Tab 1: Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-serif font-medium text-[#1F3437] flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-[#3E6F73]" />
                注册邮箱
              </label>
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full rounded-xs bg-white border border-[#D4D9D4] px-3.5 py-2 text-xs text-[#1F3437] placeholder-[#8C9E9F] focus:outline-none focus:border-[#3E6F73]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-serif font-medium text-[#1F3437] flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-[#3E6F73]" />
                  登录密码
                </label>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full rounded-xs bg-white border border-[#D4D9D4] px-3.5 py-2 text-xs text-[#1F3437] placeholder-[#8C9E9F] focus:outline-none focus:border-[#3E6F73]"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-[#627578] font-serif pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded-xs border-[#D4D9D4] text-[#1F3437] focus:ring-0"
                />
                <span>保持 30 天免登录状态</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xs bg-[#1F3437] hover:bg-[#3E6F73] disabled:opacity-60 py-2.5 text-xs font-serif font-bold text-white shadow-xs transition-all mt-2"
            >
              <span>{isSubmitting ? '正在登录...' : '安全登录'}</span>
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        )}

        {/* Tab 2: Register Form */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-serif font-medium text-[#1F3437] flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-[#3E6F73]" />
                  姓名
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：张明"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full rounded-xs bg-white border border-[#D4D9D4] px-3 py-2 text-xs text-[#1F3437] placeholder-[#8C9E9F] focus:outline-none focus:border-[#3E6F73]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-serif font-medium text-[#1F3437] flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-[#3E6F73]" />
                  邮箱
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full rounded-xs bg-white border border-[#D4D9D4] px-3 py-2 text-xs text-[#1F3437] placeholder-[#8C9E9F] focus:outline-none focus:border-[#3E6F73]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-serif font-medium text-[#1F3437] flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-[#3E6F73]" />
                  所属机构 / 企业（选填）
                </label>
                <input
                  type="text"
                  placeholder="如：产业研究所 / 战略部"
                  value={regOrg}
                  onChange={(e) => setRegOrg(e.target.value)}
                  className="w-full rounded-xs bg-white border border-[#D4D9D4] px-3 py-2 text-xs text-[#1F3437] placeholder-[#8C9E9F] focus:outline-none focus:border-[#3E6F73]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-serif font-medium text-[#1F3437] flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5 text-[#3E6F73]" />
                  专业职能（选填）
                </label>
                <input
                  type="text"
                  placeholder="如：投资经理 / 供应链总监"
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full rounded-xs bg-white border border-[#D4D9D4] px-3 py-2 text-xs text-[#1F3437] placeholder-[#8C9E9F] focus:outline-none focus:border-[#3E6F73]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-serif font-medium text-[#1F3437] flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 text-[#3E6F73]" />
                设置密码
              </label>
              <input
                type="password"
                placeholder="至少 8 位包含字母与数字"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full rounded-xs bg-white border border-[#D4D9D4] px-3 py-2 text-xs text-[#1F3437] placeholder-[#8C9E9F] focus:outline-none focus:border-[#3E6F73]"
              />
            </div>

            <div className="rounded-xs bg-[#FAFBF9] border border-[#E2E6E2] p-3 text-[11px] text-[#254E52] font-serif flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-[#3E6F73] shrink-0 mt-0.5" />
              <span>密码以 scrypt 加盐哈希存储于服务端；每日免费分析配额与账号绑定。</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xs bg-[#1F3437] hover:bg-[#3E6F73] disabled:opacity-60 py-2.5 text-xs font-serif font-bold text-white shadow-xs transition-all mt-2"
            >
              <span>{isSubmitting ? '正在创建账号...' : '创建账号'}</span>
              {!isSubmitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
