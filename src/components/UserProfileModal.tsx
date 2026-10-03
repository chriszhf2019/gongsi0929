import React from 'react';
import {
  X,
  Mail,
  Building,
  Sparkles,
  LogOut,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UserProfileModalProps {
  onOpenPricing: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ onOpenPricing }) => {
  const {
    user,
    isProfileModalOpen,
    closeProfileModal,
    logout,
    openAuthModal,
  } = useAuth();

  if (!isProfileModalOpen || !user) return null;

  const isPro = user.tier === 'Pro';
  const isEnterprise = user.tier === 'Enterprise';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F3437]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-xs border border-[#E2E6E2] bg-white shadow-2xl p-6 sm:p-8 flex flex-col max-h-[90vh] overflow-y-auto space-y-6">
        {/* Close Button */}
        <button
          onClick={closeProfileModal}
          className="absolute top-5 right-5 rounded-xs border border-[#E2E6E2] bg-white p-1.5 text-[#627578] hover:text-[#1F3437] hover:bg-[#F6F7F5] transition-colors"
          title="关闭"
        >
          <X className="h-4 w-4" />
        </button>

        {/* User Card Header */}
        <div className="flex items-center gap-4 border-b border-[#E2E6E2] pb-5">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-xs text-xl font-serif font-bold text-white shadow-xs ${
              isEnterprise
                ? 'bg-[#1F3437]'
                : isPro
                ? 'bg-[#3E6F73]'
                : 'bg-[#627578]'
            }`}
          >
            {user.name.charAt(0)}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-serif font-bold text-[#1F3437]">{user.name}</h3>
              <span
                className={`rounded-xs px-2 py-0.5 text-[10px] font-serif font-bold border ${
                  isEnterprise
                    ? 'bg-[#2E6B56]/15 text-[#2E6B56] border-[#2E6B56]/30'
                    : isPro
                    ? 'bg-[#9E6B28]/15 text-[#9E6B28] border-[#9E6B28]/30'
                    : 'bg-[#F0F2EF] text-[#627578] border-[#E2E6E2]'
                }`}
              >
                {isEnterprise ? '机构尊享版' : isPro ? '专业投研版' : '基础体验版'}
              </span>
            </div>
            <p className="text-xs text-[#627578] font-serif flex items-center gap-1">
              <Mail className="h-3 w-3 text-[#8C9E9F]" />
              <span>{user.email}</span>
            </p>
            {user.organization && (
              <p className="text-xs text-[#3E6F73] font-serif flex items-center gap-1">
                <Building className="h-3 w-3 text-[#3E6F73]" />
                <span>
                  {user.organization} · {user.role}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Usage Stats Grid */}
        <div>
          <h4 className="text-xs font-serif font-bold text-[#1F3437] mb-2.5">
            个人产业智库研报与监控资产
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-xs border border-[#E2E6E2] bg-[#FAFBF9] p-3 text-center">
              <div className="text-lg font-serif font-bold text-[#1F3437]">
                {user.stats.analyzedCompaniesCount}
              </div>
              <div className="text-[10px] text-[#627578] font-serif mt-0.5">已穿透企业</div>
            </div>
            <div className="rounded-xs border border-[#E2E6E2] bg-[#FAFBF9] p-3 text-center">
              <div className="text-lg font-serif font-bold text-[#9E6B28]">
                {user.stats.watchlistCount}
              </div>
              <div className="text-[10px] text-[#627578] font-serif mt-0.5">自选监控雷达</div>
            </div>
            <div className="rounded-xs border border-[#E2E6E2] bg-[#FAFBF9] p-3 text-center">
              <div className="text-lg font-serif font-bold text-[#2E6B56]">
                {user.stats.exportedReportsCount}
              </div>
              <div className="text-[10px] text-[#627578] font-serif mt-0.5">导出研报次数</div>
            </div>
            <div className="rounded-xs border border-[#E2E6E2] bg-[#FAFBF9] p-3 text-center">
              <div className="text-lg font-serif font-bold text-[#3E6F73]">
                {user.stats.savedCustomNodesCount}
              </div>
              <div className="text-[10px] text-[#627578] font-serif mt-0.5">自定义图谱节点</div>
            </div>
          </div>
        </div>

        {/* Subscription & VIP Status */}
        <div className="rounded-xs border border-[#E2E6E2] bg-[#FAFBF9] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#1F3437]">
              <Sparkles className="h-4 w-4 text-[#9E6B28]" />
              <span>当前订阅权益周期</span>
            </div>
            <span className="text-xs text-[#627578] font-mono">
              {user.expiresAt ? `至 ${user.expiresAt}` : '永久基础体验'}
            </span>
          </div>
          <p className="text-[11px] text-[#627578] font-serif leading-relaxed">
            每日免费分析配额与账号绑定；账号下线后配额随之失效。
          </p>

          <button
            onClick={() => {
              closeProfileModal();
              onOpenPricing();
            }}
            className="w-full flex items-center justify-center gap-1.5 rounded-xs bg-[#1F3437] hover:bg-[#3E6F73] py-2 text-xs font-serif font-bold text-white transition-all mt-2"
          >
            <span>升级机构定制版 / 扩展团队席位</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Logout & Actions */}
        <div className="pt-3 border-t border-[#E2E6E2] flex items-center justify-between">
          <button
            onClick={() => {
              closeProfileModal();
              openAuthModal('login');
            }}
            className="text-xs font-serif text-[#3E6F73] hover:underline flex items-center gap-1"
          >
            切换其他账号登录
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-xs bg-white border border-[#B84233]/30 px-3 py-1.5 text-xs font-serif text-[#B84233] hover:bg-[#B84233]/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>退出当前登录</span>
          </button>
        </div>
      </div>
    </div>
  );
};
