import React, { useEffect, useState } from 'react';
import { Cpu } from 'lucide-react';

export type AIProviderType = 'gemini' | 'deepseek' | 'qwen';

interface ProviderInfo {
  provider: AIProviderType;
  configured: boolean;
  model: string;
}

const PROVIDER_LABELS: Record<AIProviderType, { label: string; color: string; dot: string }> = {
  gemini: { label: 'Gemini', color: 'text-[#4285F4]', dot: 'bg-[#4285F4]' },
  deepseek: { label: 'DeepSeek', color: 'text-[#6F4EFD]', dot: 'bg-[#6F4EFD]' },
  qwen: { label: 'Qwen', color: 'text-[#FF6A00]', dot: 'bg-[#FF6A00]' },
};

const STORAGE_KEY = 'gensight_ai_provider';

/**
 * Get the user's selected AI provider from localStorage.
 * 注意：Provider 选择现已移至后台 /admin，此函数仅用于向后兼容
 * 已调用此函数的代码（实际后端会忽略该值，统一使用后台配置）。
 */
export function getSelectedProvider(): AIProviderType {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && ['gemini', 'deepseek', 'qwen'].includes(saved)) {
      return saved as AIProviderType;
    }
  } catch {
    // ignore
  }
  return 'gemini';
}

/**
 * Save the selected AI provider to localStorage.
 * @deprecated Provider 选择已移至后台 /admin。
 */
export function setSelectedProvider(provider: AIProviderType): void {
  try {
    localStorage.setItem(STORAGE_KEY, provider);
  } catch {
    // ignore
  }
}

/**
 * 只读的 AI Provider 指示器。
 * 显示当前后台配置的 active provider，用户不可切换（切换请去 /?admin=1）。
 */
export const AIProviderSelector: React.FC = () => {
  const [active, setActive] = useState<AIProviderType | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);

  useEffect(() => {
    fetch('/api/ai-providers')
      .then((res) => res.json())
      .then((data) => {
        if (data?.active) setActive(data.active);
        if (data?.providers) setProviders(data.providers);
      })
      .catch(() => {
        // silent fail
      });
  }, []);

  // 未加载完成
  if (!active) {
    return (
      <div className="flex items-center gap-1.5 rounded-xs border border-[#E2E6E2] bg-white px-2 sm:px-2.5 py-1.5 text-xs opacity-60">
        <Cpu className="h-3.5 w-3.5 text-[#8C9E9F]" />
        <span className="hidden sm:inline font-serif font-medium text-[#1F3437]">
          加载中...
        </span>
      </div>
    );
  }

  const info = PROVIDER_LABELS[active];
  const activeProviderInfo = providers.find((p) => p.provider === active);
  const isConfigured = activeProviderInfo?.configured ?? false;

  return (
    <div
      className="flex items-center gap-1.5 rounded-xs border border-[#E2E6E2] bg-white px-2 sm:px-2.5 py-1.5 text-xs"
      title={`当前 AI 模型：${info.label}${activeProviderInfo ? ` (${activeProviderInfo.model})` : ''}\n切换请前往 /?admin=1 后台`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${info.dot} ${!isConfigured ? 'opacity-30' : ''}`} />
      <Cpu className={`h-3.5 w-3.5 ${info.color}`} />
      <span className="hidden sm:inline font-serif font-medium text-[#1F3437]">
        {info.label}
      </span>
      {!isConfigured && (
        <span className="text-[9px] text-[#A84A3E] font-mono">未配置</span>
      )}
    </div>
  );
};
