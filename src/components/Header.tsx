import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Shield,
  PlayCircle,
  RefreshCw,
  Database,
  FileText,
  Lock,
  Sun,
  Moon,
  Users,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    ledger,
    patientCredentials,
    setIsAutoScenarioOpen,
    setAutoStep,
    resetAll,
    theme,
    toggleTheme,
    samplePatients,
    activePatientId,
    selectPatientProfile,
  } = useApp();

  const totalBlocks = ledger.chain.length;
  const totalIpfs = ledger.ipfsStorage.size;
  const totalLogs = ledger.contracts.accessLogs.length;

  return (
    <header className="dark:bg-slate-900 bg-white dark:border-slate-800 border-slate-200 border-b text-slate-800 dark:text-white shadow-sm dark:shadow-xl sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20 shrink-0">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-600 dark:from-white dark:via-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                  MedPassport
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full dark:bg-cyan-950 dark:text-cyan-400 dark:border-cyan-800/80 bg-cyan-100 text-cyan-800 border border-cyan-300">
                  Hộ chiếu sức khỏe tự chủ (SSI)
                </span>
                <span className="hidden sm:inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800/60 bg-amber-100 text-amber-800 border border-amber-300">
                  Prototype mô phỏng
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Web Crypto API &middot; Sổ cái Consortium &middot; 3 Hồ sơ bệnh nhân mẫu
              </p>
            </div>
          </div>

          {/* Controls: Profile Switcher, Stats, Dark Mode Toggle, Guided Tour, Reset */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
            
            {/* Quick Patient Switcher in Header */}
            <div className="flex items-center gap-1.5 dark:bg-slate-800/90 bg-slate-100 border dark:border-slate-700 border-slate-300 rounded-lg px-2.5 py-1 text-xs">
              <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="hidden xl:inline text-slate-500 dark:text-slate-400 font-medium">Bệnh nhân:</span>
              <select
                value={activePatientId}
                onChange={(e) => selectPatientProfile(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-100 font-semibold focus:outline-none cursor-pointer text-xs"
                title="Chọn hồ sơ bệnh nhân mẫu để trải nghiệm"
              >
                {samplePatients.map((p) => (
                  <option key={p.id} value={p.id} className="dark:bg-slate-900 bg-white text-slate-900 dark:text-white">
                    {p.name} ({p.dob.slice(-4)})
                  </option>
                ))}
              </select>
            </div>

            {/* Ledger Stats Counter */}
            <div className="hidden lg:flex items-center gap-2 dark:bg-slate-800/80 bg-slate-100 border dark:border-slate-700/80 border-slate-300 rounded-lg px-3 py-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300" title="Số khối đã liên kết bằng SHA-256">
                <Database className="w-3.5 h-3.5 text-blue-500" />
                <span>Khối: <strong className="text-slate-900 dark:text-white font-mono">{totalBlocks}</strong></span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300" title="Tệp mã hóa trên IPFS">
                <Lock className="w-3.5 h-3.5 text-emerald-500" />
                <span>IPFS: <strong className="text-slate-900 dark:text-white font-mono">{totalIpfs}</strong></span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300" title="Nhật ký kiểm toán truy cập">
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span>Logs: <strong className="text-slate-900 dark:text-white font-mono">{totalLogs}</strong></span>
              </div>
            </div>

            {/* Dark Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg dark:bg-slate-800 dark:hover:bg-slate-700 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-300 dark:hover:text-white border dark:border-slate-700 border-slate-300 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
              title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Sáng</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-blue-600" />
                  <span className="hidden sm:inline">Tối</span>
                </>
              )}
            </button>

            {/* Guided Tour Button */}
            <button
              onClick={() => {
                setAutoStep(1);
                setIsAutoScenarioOpen(true);
              }}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs sm:text-sm shadow-sm sm:shadow-md shadow-blue-500/25 transition-all cursor-pointer border border-blue-400/30 active:scale-95"
            >
              <PlayCircle className="w-4 h-4 text-cyan-200" />
              <span>Kịch bản tự động</span>
            </button>

            {/* Reset Button */}
            <button
              onClick={() => {
                if (confirm('Đặt lại toàn bộ trạng thái Sổ cái, Ví và IPFS về ban đầu?')) {
                  resetAll();
                }
              }}
              title="Đặt lại dữ liệu mẫu"
              className="p-2 rounded-lg dark:bg-slate-800 dark:hover:bg-slate-700 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-300 dark:hover:text-white border dark:border-slate-700 border-slate-300 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
