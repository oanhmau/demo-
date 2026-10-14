/**
 * MedPassport – Hộ chiếu sức khỏe tự chủ (Self-Sovereign Health ID)
 * Frontend prototype using Web Crypto API & simulated Consortium Ledger
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { TabsNav } from './components/TabsNav';
import { PatientTab } from './components/PatientTab';
import { HospitalTab } from './components/HospitalTab';
import { DoctorTab } from './components/DoctorTab';
import { LedgerTab } from './components/LedgerTab';
import { CryptoInspectorModal } from './components/CryptoInspectorModal';
import { AutoScenarioModal } from './components/AutoScenarioModal';
import { Shield, Lock, FileCode, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { tab, isInitializing } = useApp();

  if (isInitializing) {
    return (
      <div className="min-h-screen dark:bg-slate-950 bg-slate-50 dark:text-white text-slate-900 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-blue-500/25 animate-pulse text-white">
          <Shield className="w-8 h-8" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold">Đang khởi tạo Web Crypto API & 3 Hồ sơ mẫu...</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sinh cặp khóa ECDSA P-256, RSA-OAEP 2048-bit và khởi tạo Genesis Block Sổ cái
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:bg-slate-950 bg-slate-50/50 dark:text-slate-100 text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* Top Header with Dark Mode Toggle & Profile Switcher */}
      <Header />

      {/* 4 Tabs Bar */}
      <TabsNav />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {tab === 'patient' && <PatientTab />}
        {tab === 'hospital' && <HospitalTab />}
        {tab === 'doctor' && <DoctorTab />}
        {tab === 'ledger' && <LedgerTab />}
      </main>

      {/* Prototype Footer Disclaimer */}
      <footer className="dark:bg-slate-900 bg-white border-t dark:border-slate-800/80 border-slate-200 py-5 text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="space-y-1">
            <div className="flex items-center justify-center md:justify-start gap-2 text-slate-800 dark:text-slate-300 font-semibold">
              <Shield className="w-4 h-4 text-blue-500 dark:text-cyan-400" />
              <span>MedPassport – Hệ thống Hộ chiếu Sức khỏe Tự chủ (Self-Sovereign Identity)</span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Ứng dụng thử nghiệm (Prototype) chạy hoàn toàn trong trình duyệt &middot; Dữ liệu bệnh án giả lập &middot; Web Crypto API (ECDSA P-256, AES-GCM-256, RSA-OAEP-2048, SHA-256).
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Web Crypto Sẵn sàng
            </span>
            <span className="text-slate-400 dark:text-slate-600">&bull;</span>
            <span>W3C Verifiable Credentials</span>
            <span className="text-slate-400 dark:text-slate-600">&bull;</span>
            <span>Zero-Knowledge Architecture</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CryptoInspectorModal />
      <AutoScenarioModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
