import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DOCTOR_B_INFO } from '../services/mockData';
import { MedicalRecordData, VerificationStepResult } from '../types';
import {
  Stethoscope,
  ShieldCheck,
  ShieldAlert,
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  AlertTriangle,
  FileText,
  Lock,
  Unlock,
  Eye,
  Activity,
  Pill,
  Biohazard,
  Flame,
  Check,
  Copy,
} from 'lucide-react';

export const DoctorTab: React.FC = () => {
  const {
    doctorBKeys,
    patientDid,
    patientName,
    patientCredentials,
    runDoctorVerification,
    toggleTamperIpfs,
    ledger,
    blockchainVersion,
    setInspectData,
    setTab,
  } = useApp();

  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationSteps, setVerificationSteps] = useState<VerificationStepResult[]>([]);
  const [decryptedRecord, setDecryptedRecord] = useState<MedicalRecordData | null>(null);
  const [verificationFailedReason, setVerificationFailedReason] = useState<string | null>(null);
  const [activeTamperStatus, setActiveTamperStatus] = useState<boolean>(false);
  const [tamperNotification, setTamperNotification] = useState<string | null>(null);

  // Consents granted to Doctor B
  const grantedConsents = Array.from(ledger.contracts.consentRegistry.values()).filter(
    c => c.doctorDid === DOCTOR_B_INFO.did
  );

  const primaryConsent = grantedConsents[0];
  const activeCid = primaryConsent?.cid || (patientCredentials[0] ? patientCredentials[0].credentialSubject.cid : null);
  const ipfsItem = activeCid ? ledger.getIpfs(activeCid) : null;
  const isIpfsTampered = !!ipfsItem?.tampered;

  const handleStartVerification = async () => {
    if (!primaryConsent && patientCredentials.length === 0) {
      alert('Chưa có hồ sơ bệnh án nào được cấp quyền cho Bác sĩ B! Vui lòng qua tab "1. Bệnh nhân" và bấm "Cấp quyền cho Bác sĩ B".');
      return;
    }

    const recordId = primaryConsent?.recordId || patientCredentials[0]?.credentialSubject.recordId;
    if (!recordId) return;

    setIsVerifying(true);
    setDecryptedRecord(null);
    setVerificationFailedReason(null);

    const result = await runDoctorVerification(recordId, (currentSteps) => {
      setVerificationSteps(currentSteps);
    });

    setIsVerifying(false);
    if (result.success && result.recordData) {
      setDecryptedRecord(result.recordData);
    } else {
      setVerificationFailedReason(result.failedStep || 'Không thể xác minh hồ sơ');
    }
  };

  const handleToggleTamper = () => {
    if (!activeCid) {
      alert('Chưa có tệp nào trên IPFS để mô phỏng can thiệp!');
      return;
    }
    const res = toggleTamperIpfs(activeCid);
    setActiveTamperStatus(res.tampered);
    setTamperNotification(res.message);
    setDecryptedRecord(null);
    setVerificationSteps([]);
    setVerificationFailedReason(null);
  };

  return (
    <div className="space-y-6">
      {/* Doctor Identity Header */}
      <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl p-6 shadow-sm dark:shadow-xl relative overflow-hidden transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20 shrink-0">
              <Stethoscope className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2.5">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{DOCTOR_B_INFO.name}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800 bg-blue-100 text-blue-800 border border-blue-300 font-semibold">
                  Bên kiểm tra & Thụ hưởng (Verifier)
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                {DOCTOR_B_INFO.hospital} &middot; {DOCTOR_B_INFO.department} &middot; Số CCHN:{' '}
                <strong className="text-blue-600 dark:text-cyan-300 font-mono">{DOCTOR_B_INFO.licenseNumber}</strong>
              </p>
              <div className="mt-2 flex items-center flex-wrap gap-2">
                <span className="text-xs font-mono dark:bg-slate-950 bg-slate-100 px-2.5 py-1 rounded text-cyan-700 dark:text-cyan-300 border dark:border-slate-800 border-slate-200">
                  {DOCTOR_B_INFO.did}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Khóa giải mã: <strong>RSA-OAEP 2048-bit (SHA-256)</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
            <button
              onClick={() => {
                if (doctorBKeys) {
                  setInspectData({
                    title: 'Khóa công khai RSA-OAEP của Bác sĩ B (Dùng để bọc chìa khóa)',
                    subtitle: DOCTOR_B_INFO.did,
                    content: {
                      did: DOCTOR_B_INFO.did,
                      name: DOCTOR_B_INFO.name,
                      rsaPublicKeyJwk: doctorBKeys.rsaPublicKeyJwk,
                      fingerprint: doctorBKeys.fingerprint,
                      algorithm: 'RSA-OAEP 2048-bit (SHA-256)',
                      purpose: 'Bệnh nhân dùng khóa này để mã hóa/bọc khóa AES đối xứng trước khi chuyển giao.',
                    },
                  });
                }
              }}
              className="px-3.5 py-2 rounded-xl dark:bg-slate-800 dark:hover:bg-slate-700 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-medium border dark:border-slate-700 border-slate-200 cursor-pointer transition"
            >
              Soi Public Key RSA Bác sĩ
            </button>
          </div>
        </div>
      </div>

      {/* Attacker Tamper Simulator Bar */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isIpfsTampered
          ? 'dark:bg-rose-950/60 bg-rose-50 border-rose-600 shadow-lg text-rose-800 dark:text-rose-200 ring-1 ring-rose-500/40'
          : 'dark:bg-slate-900 bg-white dark:border-slate-800 border-slate-200 text-slate-700 dark:text-slate-300 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isIpfsTampered ? 'bg-rose-600 text-white animate-bounce' : 'dark:bg-slate-800 bg-slate-100 text-amber-500'}`}>
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Mô phỏng Tấn công: {isIpfsTampered ? 'DỮ LIỆU IPFS ĐÃ BỊ KẺ GIAN SỬA ĐỔI!' : 'Storage an toàn (Chưa bị can thiệp)'}
                </span>
                {isIpfsTampered && (
                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                    Tampered!
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isIpfsTampered
                  ? 'Các byte mã hóa trên node IPFS đã bị tráo đổi. Bác sĩ B bấm xác minh sẽ phát hiện ngay!'
                  : 'Bấm nút bên phải để giả lập kẻ tấn công xâm nhập máy chủ lưu trữ và can thiệp file.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleTamper}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition cursor-pointer active:scale-95 ${
              isIpfsTampered
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
            }`}
          >
            {isIpfsTampered ? 'Khôi phục tệp IPFS gốc' : '💥 Kẻ tấn công sửa file trên IPFS'}
          </button>
        </div>

        {tamperNotification && (
          <div className="mt-3 pt-3 border-t border-rose-300 dark:border-rose-800/40 text-xs font-mono text-rose-700 dark:text-rose-300">
            &gt; {tamperNotification}
          </div>
        )}
      </div>

      {/* Main Verification & Clinical Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Verification Panel & Checklist (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl p-5 shadow-sm dark:shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b dark:border-slate-800 border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Hộp thư hồ sơ được ủy quyền</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {primaryConsent ? `Consent ID: ${primaryConsent.consentId}` : 'Chưa có yêu cầu ủy quyền'}
                </p>
              </div>

              {primaryConsent && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  primaryConsent.status === 'ACTIVE' && primaryConsent.expiresAt > Date.now()
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                }`}>
                  {primaryConsent.status === 'ACTIVE' && primaryConsent.expiresAt > Date.now()
                    ? 'CÒN HIỆU LỰC'
                    : 'KHÔNG KHẢ DỤNG'}
                </span>
              )}
            </div>

            {/* Target Patient Box */}
            <div className="dark:bg-slate-950 bg-slate-50 p-3.5 rounded-xl border dark:border-slate-800 border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Bệnh nhân:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{patientName}</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-500 dark:text-slate-400">DID:</span>
                <span className="text-blue-600 dark:text-cyan-400 truncate max-w-[200px]" title={patientDid}>
                  {patientDid}
                </span>
              </div>
              {primaryConsent && (
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-500 dark:text-slate-400">Thời hạn:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {Math.max(0, Math.round((primaryConsent.expiresAt - Date.now()) / 1000))}s còn lại
                  </span>
                </div>
              )}
            </div>

            {/* Big Action Button */}
            <button
              onClick={handleStartVerification}
              disabled={isVerifying}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-sm shadow-md sm:shadow-lg shadow-emerald-600/25 transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang giải mã & xác thực mật mã...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Xem & Xác minh (Audit & Decrypt)</span>
                </>
              )}
            </button>

            {/* Checklist of 8 Verification Steps */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Quy trình kiểm tra 8 bước</span>
                <span className="font-mono text-[10px] text-slate-400">
                  {verificationSteps.filter(s => s.status === 'SUCCESS').length}/8
                </span>
              </h4>

              {verificationSteps.length === 0 ? (
                <div className="p-4 rounded-xl dark:bg-slate-950/60 bg-slate-50 border dark:border-slate-800 border-slate-200 text-center text-xs text-slate-500">
                  Bấm <strong>"Xem & Xác minh"</strong> ở trên để bắt đầu chuỗi kiểm tra Web Crypto API.
                </div>
              ) : (
                <div className="space-y-2">
                  {verificationSteps.map((step, idx) => {
                    const isSuccess = step.status === 'SUCCESS';
                    const isFailed = step.status === 'FAILED';
                    const isRunning = step.status === 'RUNNING';

                    return (
                      <div
                        key={step.id}
                        className={`p-3 rounded-xl border text-xs transition-all ${
                          isSuccess
                            ? 'dark:bg-slate-950/90 bg-emerald-50/50 dark:border-emerald-900/60 border-emerald-300 text-slate-800 dark:text-slate-200'
                            : isFailed
                            ? 'dark:bg-rose-950/40 bg-rose-50 border-rose-600 text-rose-800 dark:text-rose-200 shadow-md ring-1 ring-rose-500/30'
                            : isRunning
                            ? 'dark:bg-blue-950/40 bg-blue-50 border-blue-500/50 text-blue-900 dark:text-white animate-pulse'
                            : 'dark:bg-slate-950/40 bg-slate-50 dark:border-slate-800 border-slate-200 text-slate-400'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {isSuccess ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : isFailed ? (
                              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                            ) : isRunning ? (
                              <Loader2 className="w-4 h-4 text-blue-500 dark:text-cyan-400 animate-spin shrink-0" />
                            ) : (
                              <span className="w-4 h-4 rounded-full border border-slate-400 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400">
                                {idx + 1}
                              </span>
                            )}
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {idx + 1}. {step.title}
                            </span>
                          </div>
                        </div>

                        {step.details && (
                          <p
                            className={`mt-1.5 text-[11px] leading-relaxed pl-6 ${
                              isFailed ? 'text-rose-700 dark:text-rose-300 font-semibold' : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {step.details}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Decrypted Clinical Record or Rejection Alert (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {verificationFailedReason ? (
            <div className="dark:bg-rose-950/50 bg-rose-50 border-2 border-rose-600 rounded-2xl p-6 shadow-xl space-y-4 animate-in fade-in">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-rose-600 text-white shrink-0 shadow-lg shadow-rose-600/30">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-rose-900 dark:text-white">
                    TỪ CHỐI TRUY CẬP: PHÁT HIỆN VI PHẠM BẢO MẬT!
                  </h3>
                  <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                    Hệ thống MedPassport đã chủ động chặn đứng phiên giải mã và bảo vệ tính toàn vẹn y khoa.
                  </p>
                </div>
              </div>

              <div className="dark:bg-slate-950 bg-white p-4 rounded-xl border border-rose-300 dark:border-rose-800/80 space-y-2 text-xs font-mono text-rose-800 dark:text-rose-200">
                <div className="text-slate-500 dark:text-slate-400">Lý do thất bại:</div>
                <div className="font-bold text-rose-600 dark:text-rose-400 text-sm">{verificationFailedReason}</div>
              </div>

              <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1 dark:bg-slate-900/60 bg-white p-3.5 rounded-xl border dark:border-slate-800 border-slate-200">
                <strong className="text-slate-900 dark:text-white">Ghi nhận vào Sổ cái:</strong> Nỗ lực truy cập bất hợp pháp hoặc không hợp lệ này đã được hợp đồng thông minh <strong>AccessLog</strong> ghi lại vĩnh viễn trên Sổ cái Blockchain kèm dấu thời gian và DID của Bác sĩ B.
              </div>

              <button
                onClick={() => setTab('ledger')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl dark:bg-slate-800 dark:hover:bg-slate-700 bg-white hover:bg-slate-100 text-slate-900 dark:text-white text-xs font-semibold border dark:border-slate-700 border-slate-300 shadow-sm transition cursor-pointer"
              >
                <span>Xem bản ghi từ chối trên Sổ cái (AccessLog) &rarr;</span>
              </button>
            </div>
          ) : decryptedRecord ? (
            <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl shadow-sm dark:shadow-xl overflow-hidden animate-in fade-in">
              {/* Record Header */}
              <div className="dark:bg-gradient-to-r dark:from-emerald-900/60 dark:via-slate-900 dark:to-teal-900/60 bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 p-5 border-b dark:border-slate-800 border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded dark:bg-emerald-950 bg-emerald-100 text-emerald-800 dark:text-emerald-300 border dark:border-emerald-800 border-emerald-300">
                      {decryptedRecord.recordId}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      Ngày khám: {decryptedRecord.date}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {decryptedRecord.diagnosis}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cơ sở điều trị: {decryptedRecord.facility}
                  </p>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full dark:bg-emerald-500/20 bg-emerald-100 text-emerald-800 dark:text-emerald-300 border dark:border-emerald-500/30 border-emerald-300 text-xs font-bold">
                    <Unlock className="w-3.5 h-3.5" />
                    Đã giải mã thành công
                  </span>
                </div>
              </div>

              {/* CRITICAL WARNING: Allergies Section */}
              <div className="p-5 space-y-4">
                <div className="p-4 rounded-xl dark:bg-rose-950/40 bg-rose-50 border-2 border-rose-500/80 space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs uppercase tracking-wider">
                    <Biohazard className="w-4 h-4 text-rose-500" />
                    <span>Cảnh báo Dị ứng Thuốc nghiêm trọng (Sốc phản vệ)</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {decryptedRecord.allergies.map((allergy, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-900/40"
                      >
                        ⚠️ {allergy}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Vitals & Clinical Info */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl dark:bg-slate-950 bg-slate-50 border dark:border-slate-800 border-slate-200">
                    <span className="text-slate-500 dark:text-slate-400 block">Nhóm máu:</span>
                    <span className="text-base font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                      {decryptedRecord.bloodType}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl dark:bg-slate-950 bg-slate-50 border dark:border-slate-800 border-slate-200">
                    <span className="text-slate-500 dark:text-slate-400 block">Mức độ khẩn cấp:</span>
                    <span className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
                      {decryptedRecord.severity}
                    </span>
                  </div>
                </div>

                {/* Symptoms */}
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Triệu chứng lâm sàng:</span>
                  <p className="text-xs text-slate-800 dark:text-slate-300 dark:bg-slate-950 bg-slate-50 p-3 rounded-xl border dark:border-slate-800 border-slate-200 leading-relaxed">
                    {decryptedRecord.symptoms}
                  </p>
                </div>

                {/* Prescribed Medications */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-blue-500" />
                    Chỉ định thuốc & Xử trí:
                  </span>
                  <div className="space-y-1.5">
                    {decryptedRecord.medications.map((m, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 rounded-lg dark:bg-slate-950 bg-slate-50 border dark:border-slate-800 border-slate-200 text-xs"
                      >
                        <span className="font-semibold text-slate-900 dark:text-white">{m.name}</span>
                        <span className="text-slate-500 dark:text-slate-400">{m.dosage} ({m.frequency})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lab Results */}
                {decryptedRecord.labResults && decryptedRecord.labResults.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-500" />
                      Kết quả xét nghiệm cận lâm sàng:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {decryptedRecord.labResults.map((lab, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg dark:bg-slate-950 bg-slate-50 border dark:border-slate-800 border-slate-200 text-xs space-y-0.5"
                        >
                          <div className="text-slate-500 dark:text-slate-400 text-[11px] truncate">{lab.testName}</div>
                          <div className="font-bold text-slate-900 dark:text-white font-mono">{lab.value}</div>
                          <div className="text-[10px] text-slate-400">Chuẩn: {lab.reference}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Doctor Note & Signature Stamp */}
                <div className="pt-3 border-t dark:border-slate-800 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Bác sĩ phát hành:</span>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">{decryptedRecord.doctorName}</div>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg dark:bg-slate-950 bg-slate-50 border dark:border-slate-800 border-slate-200 text-[11px] font-mono text-blue-700 dark:text-cyan-300">
                    Ký số: ECDSA-P256-SHA256 (Verified)
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="dark:bg-slate-900/60 bg-white border border-dashed dark:border-slate-800 border-slate-200 rounded-2xl p-10 text-center space-y-3 shadow-sm">
              <Lock className="w-12 h-12 text-slate-400 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Hồ sơ y tế đang được mã hóa an toàn trên IPFS
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Bác sĩ B chỉ có thể giải mã và xem dữ liệu lâm sàng sau khi vượt qua toàn bộ 8 chốt chặn mật mã và xác minh tính hợp lệ của hợp đồng thông minh.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
