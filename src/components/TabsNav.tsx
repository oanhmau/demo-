import React from 'react';
import { TabType, useApp } from '../context/AppContext';
import { User, Building2, Stethoscope, Blocks } from 'lucide-react';

interface TabItem {
  id: TabType;
  label: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export const TabsNav: React.FC = () => {
  const { tab, setTab, patientCredentials, ledger } = useApp();

  const activeConsentsCount = Array.from(ledger.contracts.consentRegistry.values()).filter(
    c => c.status === 'ACTIVE' && c.expiresAt > Date.now()
  ).length;

  const tabs: TabItem[] = [
    {
      id: 'patient',
      label: '1. Bệnh nhân',
      badge: patientCredentials.length > 0 ? `${patientCredentials.length} VC` : undefined,
      icon: User,
      description: 'Quản lý DID, Tìm kiếm & Cấp quyền',
    },
    {
      id: 'hospital',
      label: '2. Bệnh viện A',
      badge: 'Issuer',
      icon: Building2,
      description: 'Ký số VC & Neo hash vào Sổ cái',
    },
    {
      id: 'doctor',
      label: '3. Bác sĩ B',
      badge: activeConsentsCount > 0 ? `${activeConsentsCount} Quyền` : undefined,
      icon: Stethoscope,
      description: 'Mở khóa RSA & Xác minh 8 bước',
    },
    {
      id: 'ledger',
      label: '4. Sổ cái & IPFS',
      badge: `${ledger.chain.length} khối`,
      icon: Blocks,
      description: '4 Smart Contracts & Kho lưu trữ',
    },
  ];

  return (
    <nav className="dark:bg-slate-900/80 bg-slate-50/90 border-b dark:border-slate-800 border-slate-200 backdrop-blur-md sticky top-[65px] z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 py-2.5">
          {tabs.map(item => {
            const Icon = item.icon;
            const isActive = tab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                  isActive
                    ? 'dark:bg-blue-600/15 bg-blue-50 dark:border-blue-500/60 border-blue-400 text-blue-900 dark:text-white shadow-sm shadow-blue-500/10'
                    : 'dark:bg-slate-800/40 bg-white dark:border-slate-700/50 border-slate-200 hover:dark:bg-slate-800/80 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div
                  className={`p-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'dark:bg-slate-700/60 bg-slate-100 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-semibold truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                          isActive
                            ? 'dark:bg-blue-500/20 bg-blue-100 dark:text-blue-300 text-blue-700 border dark:border-blue-500/30 border-blue-200'
                            : 'dark:bg-slate-700 bg-slate-100 dark:text-slate-300 text-slate-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{item.description}</p>
                </div>

                {isActive && (
                  <div className="absolute -bottom-[11px] left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
