import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { HOSPITAL_A_INFO, ROGUE_HOSPITAL_INFO, SAMPLE_RECORDS } from '../services/mockData';
import { MedicalRecordData } from '../types';
import {
  Building2,
  ShieldCheck,
  AlertTriangle,
  Send,
  Lock,
  FileCheck,
  CheckCircle2,
  XCircle,
  Sparkles,
  Database,
  ArrowRight,
  Info,
} from 'lucide-react';

export const HospitalTab: React.FC = () => {
  const {
    patientDid,
    patientName,
    issueRecordByHospitalA,
    issueRecordByRogueHospital,
    hospitalAKeys,
    rogueHospitalKeys,
    setInspectData,
    setTab,
  } = useApp();

  const [activeTemplateIdx, setActiveTemplateIdx] = useState<number>(0);
  const [formData, setFormData] = useState<MedicalRecordData>(SAMPLE_RECORDS[0]);
  const [isIssuing, setIsIssuing] = useState<boolean>(false);
  const [isRogueIssuing, setIsRogueIssuing] = useState<boolean>(false);

  // Status feedback
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'reverted' | 'error';
    title: string;
    details: string;
    data?: any;
  } | null>(null);

  const handleSelectTemplate = (idx: number) => {
    setActiveTemplateIdx(idx);
    if (SAMPLE_RECORDS[idx]) {
      setFormData({
        ...SAMPLE_RECORDS[idx],
        patientDid,
        patientName,
      });
    }
  };

  const handleIssueByHospitalA = async () => {
    setIsIssuing(true);
    setFeedback(null);

    const recordToIssue: MedicalRecordData = {
      ...formData,
      patientDid,
      patientName,
      date: new Date().toISOString().split('T')[0],
    };

    const res = await issueRecordByHospitalA(recordToIssue);
    setIsIssuing(false);

    if (res.success && res.vc) {
      setFeedback({
        type: 'success',
        title: 'Phát hành & Neo Sổ cái thành công (Bệnh viện Bạch Mai A)!',
        details: `Hồ sơ ${recordToIssue.recordId} đã được mã hóa AES-GCM (256-bit), tải lên IPFS (CID: ${res.vc.credentialSubject.cid}), ký số ECDSA P-256 và neo vào RecordRegistry. Đã tự động chuyển vào Ví bệnh nhân.`,
        data: res.vc,
      });
    } else {
      setFeedback({
        type: 'error',
        title: 'Lỗi phát hành',
        details: res.error || 'Không thể cấp phát hồ sơ',
      });
    }
  };

  const handleIssueByRogueHospital = async () => {
    setIsRogueIssuing(true);
    setFeedback(null);

    const rogueRecord: MedicalRecordData = {
      ...formData,
      recordId: `ROGUE-${Date.now().toString().slice(-4)}`,
      facility: ROGUE_HOSPITAL_INFO.name,
      patientDid,
      patientName,
      date: new Date().toISOString().split('T')[0],
    };

    const res = await issueRecordByRogueHospital(rogueRecord);
    setIsRogueIssuing(false);

    if (!res.success) {
      setFeedback({
        type: 'reverted',
        title: 'GIAO DỊCH BỊ SMART CONTRACT TỪ CHỐI (REVERT)!',
        details: `Cơ chế bảo mật Smart Contract RecordRegistry đã kích hoạt: Tổ chức "${ROGUE_HOSPITAL_INFO.did}" không nằm trong danh sách cấp phép của IssuerRegistry do Bộ Y Tế xác thực. Toàn bộ giao dịch bị hủy bỏ, không thể lưu hash giả mạo vào sổ cái!`,
        data: {
          attemptedIssuer: ROGUE_HOSPITAL_INFO.did,
          facilityName: ROGUE_HOSPITAL_INFO.name,
          contract: 'RecordRegistry',
          ruleTriggered: 'require(IssuerRegistry.isAuthorized(msg.sender))',
          error: res.error,
        },
      });
    } else {
      setFeedback({
        type: 'success',
        title: 'Bệnh viện lạ phát hành',
        details: 'Giao dịch thành công (không đúng mong muốn kịch bản)',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Hospital Identity Header Card */}
      <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl p-6 shadow-sm dark:shadow-xl relative overflow-hidden transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-600/20 shrink-0">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2.5">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{HOSPITAL_A_INFO.name}</h2>
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Được kiểm định bởi Bộ Y Tế (IssuerRegistry)
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                {HOSPITAL_A_INFO.department} &middot; Giấy phép: <strong className="text-blue-600 dark:text-cyan-300 font-mono">{HOSPITAL_A_INFO.license}</strong>
              </p>
              <div className="mt-2 flex items-center flex-wrap gap-2">
                <span className="text-xs font-mono dark:bg-slate-950 bg-slate-100 px-2.5 py-1 rounded text-cyan-700 dark:text-cyan-300 border dark:border-slate-800 border-slate-200">
                  {HOSPITAL_A_INFO.did}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Khóa ký số: <strong>ECDSA P-256 (NIST)</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
            <button
              onClick={() => {
                if (hospitalAKeys) {
                  setInspectData({
                    title: 'Khóa công khai của Bệnh viện Bạch Mai A (Issuer)',
                    subtitle: HOSPITAL_A_INFO.did,
                    content: {
                      did: HOSPITAL_A_INFO.did,
                      name: HOSPITAL_A_INFO.name,
                      license: HOSPITAL_A_INFO.license,
                      accreditedBy: HOSPITAL_A_INFO.accreditedBy,
                      ecdsaPublicKeyJwk: hospitalAKeys.ecdsaPublicKeyJwk,
                      fingerprint: hospitalAKeys.fingerprint,
                      algorithm: 'ECDSA with SHA-256 (curve P-256)',
                    },
                  });
                }
              }}
              className="px-3.5 py-2 rounded-xl dark:bg-slate-800 dark:hover:bg-slate-700 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-medium border dark:border-slate-700 border-slate-200 cursor-pointer transition"
            >
              Soi Public Key Bệnh viện
            </button>
          </div>
        </div>
      </div>

      {/* Reversion / Feedback Banner */}
      {feedback && (
        <div
          className={`p-5 rounded-2xl border space-y-2 animate-in fade-in ${
            feedback.type === 'success'
              ? 'dark:bg-emerald-950/40 bg-emerald-50 dark:border-emerald-700/60 border-emerald-300 text-emerald-800 dark:text-emerald-200'
              : feedback.type === 'reverted'
              ? 'dark:bg-rose-950/60 bg-rose-50 border-rose-600 text-rose-800 dark:text-rose-200 shadow-lg ring-1 ring-rose-500/30'
              : 'dark:bg-amber-950/40 bg-amber-50 dark:border-amber-700/60 border-amber-300 text-amber-800 dark:text-amber-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-500 shrink-0" />
              )}
              <h4 className="text-base font-bold text-slate-900 dark:text-white">{feedback.title}</h4>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs opacity-75 hover:opacity-100 font-semibold cursor-pointer"
            >
              Đóng
            </button>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed pl-8">{feedback.details}</p>

          {feedback.data && (
            <div className="pl-8 pt-2">
              <button
                onClick={() => {
                  setInspectData({
                    title: feedback.type === 'reverted' ? 'Giao dịch bị Revert chi tiết' : 'Verifiable Credential đã phát hành',
                    subtitle: 'Bằng chứng ghi nhận trên hệ thống',
                    content: feedback.data,
                  });
                }}
                className="text-xs font-semibold underline cursor-pointer hover:opacity-80"
              >
                Xem chi tiết kỹ thuật JSON &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Clinical Entry Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form: Medical Record Editor (8 cols) */}
        <div className="lg:col-span-8 dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b dark:border-slate-800 border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Soạn thảo hồ sơ bệnh án điện tử</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dữ liệu sẽ được mã hóa đầu-cuối (AES-GCM) trước khi rời khỏi trình duyệt
              </p>
            </div>

            {/* Template Selector */}
            <div className="flex items-center gap-1.5 dark:bg-slate-950 bg-slate-100 p-1 rounded-xl border dark:border-slate-800 border-slate-200 text-xs">
              <button
                onClick={() => handleSelectTemplate(0)}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  activeTemplateIdx === 0 ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Mẫu 1: Dị ứng Penicillin
              </button>
              <button
                onClick={() => handleSelectTemplate(1)}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  activeTemplateIdx === 1 ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Mẫu 2: Đái tháo đường
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Mã hồ sơ (Record ID)</label>
              <input
                type="text"
                value={formData.recordId}
                onChange={e => setFormData({ ...formData, recordId: e.target.value })}
                className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-800 border-slate-200 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Người nhận (DID Bệnh nhân)</label>
              <input
                type="text"
                value={patientDid}
                disabled
                className="w-full dark:bg-slate-950/80 bg-slate-100 border dark:border-slate-800 border-slate-200 rounded-xl px-3 py-2 text-blue-700 dark:text-cyan-300 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Chẩn đoán chính</label>
              <input
                type="text"
                value={formData.diagnosis}
                onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
                className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-800 border-slate-200 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-rose-700 dark:text-rose-300 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                Tiền sử Dị ứng nghiêm trọng (Allergies - Dữ liệu sống còn)
              </label>
              <input
                type="text"
                value={formData.allergies.join(', ')}
                onChange={e =>
                  setFormData({
                    ...formData,
                    allergies: e.target.value.split(',').map(s => s.trim()),
                  })
                }
                className="w-full dark:bg-rose-950/20 bg-rose-50 border dark:border-rose-800/60 border-rose-300 rounded-xl px-3 py-2 text-rose-800 dark:text-rose-200 font-medium focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Triệu chứng lâm sàng</label>
              <textarea
                rows={2}
                value={formData.symptoms}
                onChange={e => setFormData({ ...formData, symptoms: e.target.value })}
                className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-800 border-slate-200 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Chỉ định thuốc & Xử trí cấp cứu</label>
              <div className="dark:bg-slate-950 bg-slate-50 p-3 rounded-xl border dark:border-slate-800 border-slate-200 space-y-2">
                {formData.medications.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-slate-700 dark:text-slate-300 text-xs">
                    <span className="font-semibold text-slate-900 dark:text-white">• {m.name}</span>
                    <span className="text-slate-500 dark:text-slate-400">{m.dosage} – {m.frequency}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Lời dặn & Cảnh báo của Bác sĩ</label>
              <textarea
                rows={2}
                value={formData.doctorNotes}
                onChange={e => setFormData({ ...formData, doctorNotes: e.target.value })}
                className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-800 border-slate-200 rounded-xl px-3 py-2 text-amber-800 dark:text-amber-200 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t dark:border-slate-800 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Ký bằng: <strong className="text-slate-800 dark:text-slate-200">ECDSA P-256</strong> &middot; Mã hóa: <strong className="text-slate-800 dark:text-slate-200">AES-GCM-256</strong>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Rogue Hospital Test Button */}
              <button
                onClick={handleIssueByRogueHospital}
                disabled={isRogueIssuing || isIssuing}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl dark:bg-rose-950/60 bg-rose-50 hover:dark:bg-rose-900/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-semibold border dark:border-rose-800/80 border-rose-300 transition cursor-pointer active:scale-95 disabled:opacity-50"
                title="Mô phỏng cơ sở chưa đăng ký Bộ Y Tế phát hành hồ sơ"
              >
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Thử bằng Bệnh viện Lạ (Xem Revert)</span>
              </button>

              {/* Authorized Hospital Issue Button */}
              <button
                onClick={handleIssueByHospitalA}
                disabled={isIssuing || isRogueIssuing}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md sm:shadow-lg shadow-blue-600/30 transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isIssuing ? 'Đang mã hóa & Ký...' : 'Mã hóa, Ký VC & Neo Sổ cái'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Info: Protocol Architecture Pipeline (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-500 dark:text-cyan-400" />
              Quy trình phát hành chuẩn SSI
            </h4>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl dark:bg-slate-950 bg-slate-50 border dark:border-slate-800 border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold">
                  <span>1. Mã hóa AES-GCM 256-bit</span>
                  <Lock className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Sinh khóa đối xứng AES ngẫu nhiên + IV 12 bytes. Dữ liệu y tế được bảo mật tuyệt đối trước khi truyền tải.
                </p>
              </div>

              <div className="p-3 rounded-xl dark:bg-slate-950 bg-slate-50 border dark:border-slate-800 border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold">
                  <span>2. Đẩy lên IPFS & Tính CID</span>
                  <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  CID = SHA-256(ciphertext). Nội dung mã hóa được định danh bằng mã băm nội dung bất biến.
                </p>
              </div>

              <div className="p-3 rounded-xl dark:bg-slate-950 bg-slate-50 border dark:border-slate-800 border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold">
                  <span>3. Ký số VC (ECDSA P-256)</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Bệnh viện A dùng Private Key ký lên cấu trúc W3C Verifiable Credential. Chữ ký chứng minh nguồn gốc bệnh án.
                </p>
              </div>

              <div className="p-3 rounded-xl dark:bg-slate-950 bg-slate-50 border dark:border-slate-800 border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold">
                  <span>4. Neo Hash lên RecordRegistry</span>
                  <Database className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Chỉ neo Fingerprint (SHA-256) và CID vào Blockchain. Không bao giờ lưu trữ dữ liệu y tế công khai trên chuỗi!
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl dark:bg-blue-950/40 bg-blue-50 border dark:border-blue-800/50 border-blue-200 text-[11px] text-blue-900 dark:text-blue-200 space-y-1">
              <strong className="block text-blue-700 dark:text-cyan-300">💡 Thử nghiệm kiểm tra:</strong>
              <p>
                Bấm vào nút màu đỏ <strong>"Thử bằng Bệnh viện Lạ"</strong> để thấy Smart Contract ngăn chặn tổ chức mạo danh như thế nào.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
