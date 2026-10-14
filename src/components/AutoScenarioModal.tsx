import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Play,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface ScenarioStepDef {
  step: number;
  title: string;
  shortDesc: string;
  roleTarget: 'patient' | 'hospital' | 'doctor' | 'ledger';
  detailExplanation: string;
  cryptoDetail: string;
}

export const AUTO_STEPS: ScenarioStepDef[] = [
  {
    step: 1,
    title: 'Bước 1: Bệnh nhân khởi tạo danh tính DID tự chủ',
    shortDesc: 'Tạo cặp khóa ECDSA P-256 & RSA-OAEP, đăng ký trên DIDRegistry.',
    roleTarget: 'patient',
    detailExplanation:
      'Bệnh nhân Nguyễn Văn An tạo danh tính phi tập trung (DID) hoàn toàn trên trình duyệt bằng Web Crypto API. Khóa riêng tư (Private Key) được lưu cục bộ trong ví trình duyệt và không bao giờ gửi lên máy chủ.',
    cryptoDetail: 'Thuật toán: ECDSA P-256 (Ký số & Danh tính) + RSA-OAEP 2048-bit (Nhận dữ liệu). Định dạng: did:demo:...',
  },
  {
    step: 2,
    title: 'Bước 2: Bệnh viện A mã hóa AES-GCM, ký VC & Neo vào Sổ cái',
    shortDesc: 'Phát hành bệnh án Sốc phản vệ Penicillin, tải lên IPFS và neo hash.',
    roleTarget: 'hospital',
    detailExplanation:
      'Bệnh viện A tạo hồ sơ cấp cứu dị ứng thuốc. Dữ liệu được mã hóa đối xứng AES-GCM 256-bit với IV 12 bytes. Bản mã được lưu trữ Content-Addressed trên IPFS (tính ra CID). Bệnh viện dùng Private Key ký điện tử W3C Verifiable Credential và neo Transaction vào RecordRegistry.',
    cryptoDetail: 'AES-GCM (256-bit) -> CID = SHA-256(ciphertext) -> Chữ ký ECDSA P-256 trên VC -> RecordRegistry.anchorRecord().',
  },
  {
    step: 3,
    title: 'Bước 3: Thử nghiệm Phòng khám Lạ phát hành -> Smart Contract Revert',
    shortDesc: 'Chứng minh hàng rào IssuerRegistry ngăn chặn tổ chức mạo danh.',
    roleTarget: 'hospital',
    detailExplanation:
      'Một cơ sở khám chữa bệnh chui (chưa được Bộ Y Tế thẩm định) cố tình phát hành bệnh án và neo vào Blockchain. Smart contract RecordRegistry tự động tra cứu IssuerRegistry, phát hiện cơ sở này chưa được cấp phép và lập tức REVERT giao dịch!',
    cryptoDetail: 'RecordRegistry.anchorRecord() kiểm tra IssuerRegistry.isAuthorized(issuerDid). Kết quả: Giao dịch bị Revert!',
  },
  {
    step: 4,
    title: 'Bước 4: Bệnh nhân cấp quyền cho Bác sĩ B trong 30 giây',
    shortDesc: 'Bọc khóa AES bằng RSA-OAEP của Bác sĩ B & neo vào ConsentRegistry.',
    roleTarget: 'patient',
    detailExplanation:
      'Bệnh nhân chọn hồ sơ và cấp quyền khám bệnh khẩn cấp cho Bác sĩ B trong 30 giây. Bệnh nhân dùng Public Key RSA-OAEP của Bác sĩ B để bọc chìa khóa AES (Envelope Encryption). Giao dịch ủy quyền được neo lên ConsentRegistry kèm thời hạn chính xác.',
    cryptoDetail: 'Web Crypto wrapKey("raw", aesKey, doctorRsaPublicKey, { name: "RSA-OAEP" }) -> ConsentRegistry.grantConsent().',
  },
  {
    step: 5,
    title: 'Bước 5: Bác sĩ B xem & vượt qua 8 bước xác minh mật mã',
    shortDesc: 'Kiểm tra Issuer, Consent, IPFS, CID, mở bọc RSA, giải mã AES, chữ ký VC & Hash.',
    roleTarget: 'doctor',
    detailExplanation:
      'Bác sĩ B nhận thông báo và bấm "Xem & Xác minh". Trình duyệt thực hiện chuỗi 8 bước kiểm tra toán học nghiêm ngặt: Kiểm tra hợp đồng thông minh, xác minh CID trên IPFS, dùng Private Key RSA mở bọc khóa AES, giải mã bệnh án an toàn và đối chiếu chữ ký số.',
    cryptoDetail: 'Xác minh tuần tự: IssuerRegistry -> ConsentRegistry -> CID hash match -> RSA unwrap -> AES-GCM decrypt -> ECDSA verify -> Hash match.',
  },
  {
    step: 6,
    title: 'Bước 6: Mô phỏng Kẻ tấn công sửa file mã hóa trên IPFS',
    shortDesc: 'Can thiệp byte trên storage -> Bác sĩ phát hiện ngay lập tức!',
    roleTarget: 'doctor',
    detailExplanation:
      'Hacker xâm nhập node lưu trữ IPFS và sửa đổi các byte trong file mã hóa. Khi Bác sĩ B truy cập và xác minh lại, hệ thống lập tức bắt lỗi: SHA-256 của file tải về không khớp CID đã neo, hoặc thẻ kiểm tra tính xác thực (AES-GCM Auth Tag) báo lỗi!',
    cryptoDetail: 'Phát hiện phá vỡ toàn vẹn: SHA-256(tamperedCiphertext) != CID gốc, hoặc GCM tag authentication failure.',
  },
  {
    step: 7,
    title: 'Bước 7: Thu hồi quyền truy cập (hoặc hết hạn 30s) & Ghi nhận AccessLog',
    shortDesc: 'Bác sĩ bị chặn truy cập & toàn bộ nỗ lực được ghi nhận bất biến.',
    roleTarget: 'doctor',
    detailExplanation:
      'Bệnh nhân chủ động bấm "Thu hồi quyền" (hoặc đồng hồ 30 giây đếm về 0). Khi Bác sĩ B cố gắng truy cập lại, ConsentRegistry từ chối quyền đọc. Mọi nỗ lực truy cập thành công hay thất bại đều được ghi vào AccessLog vĩnh viễn trên Sổ cái.',
    cryptoDetail: 'ConsentRegistry.status === REVOKED / EXPIRED -> AccessLog.logAccessAttempt(DENIED).',
  },
];

export const AutoScenarioModal: React.FC = () => {
  const {
    isAutoScenarioOpen,
    setIsAutoScenarioOpen,
    autoStep,
    setAutoStep,
    runScenarioStep,
  } = useApp();

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const currentStepDef = AUTO_STEPS.find(s => s.step === autoStep) || AUTO_STEPS[0];

  if (!isAutoScenarioOpen) return null;

  const handleNext = async () => {
    if (autoStep < 7) {
      const next = autoStep + 1;
      setAutoStep(next);
      await runScenarioStep(next);
    }
  };

  const handlePrev = async () => {
    if (autoStep > 1) {
      const prev = autoStep - 1;
      setAutoStep(prev);
      await runScenarioStep(prev);
    }
  };

  const handleRunAll = async () => {
    setIsRunning(true);
    for (let s = autoStep; s <= 7; s++) {
      setAutoStep(s);
      await runScenarioStep(s);
      await new Promise(r => setTimeout(r, 2200));
    }
    setIsRunning(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="dark:bg-slate-900 bg-white border dark:border-blue-500/30 border-blue-200 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        
        {/* Modal Header */}
        <div className="px-6 py-4 dark:bg-gradient-to-r dark:from-blue-900/60 dark:via-slate-900 dark:to-indigo-900/60 bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 border-b dark:border-slate-800 border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl dark:bg-blue-500/20 bg-blue-100 text-blue-600 dark:text-cyan-400 border dark:border-blue-400/30 border-blue-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Kịch bản tự động mô phỏng (7 bước tương tác)
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full dark:bg-blue-950 bg-blue-100 text-blue-800 dark:text-blue-300 border dark:border-blue-800 border-blue-300">
                  Bước {autoStep}/7
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                Minh họa toàn bộ vòng đời bảo mật dữ liệu y tế SSI & Web Crypto API
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAutoScenarioOpen(false)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="px-6 py-3 dark:bg-slate-950 bg-slate-100 border-b dark:border-slate-800/80 border-slate-200 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[500px] gap-2">
            {AUTO_STEPS.map(item => {
              const isPassed = item.step < autoStep;
              const isCurrent = item.step === autoStep;
              return (
                <button
                  key={item.step}
                  onClick={() => {
                    setAutoStep(item.step);
                    runScenarioStep(item.step);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                      : isPassed
                      ? 'dark:bg-slate-800 bg-white text-emerald-600 dark:text-emerald-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-transparent'
                      : 'dark:bg-slate-900 bg-slate-200/60 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-white text-blue-600'
                        : isPassed
                        ? 'bg-emerald-500 text-white dark:text-slate-950'
                        : 'dark:bg-slate-800 bg-slate-300 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {isPassed ? '✓' : item.step}
                  </span>
                  <span className="truncate max-w-[80px]">Bước {item.step}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 dark:bg-slate-900/60 bg-white">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-cyan-400">
              Chi tiết kịch bản
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {currentStepDef.title}
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">
              {currentStepDef.detailExplanation}
            </p>
          </div>

          {/* Cryptographic Mechanics Highlight */}
          <div className="p-4 rounded-xl dark:bg-slate-950/80 bg-slate-50 border dark:border-slate-800/80 border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-cyan-300">
              <ShieldCheck className="w-4 h-4 text-blue-500 dark:text-cyan-400" />
              <span>Cơ chế mật mã Web Crypto API & Blockchain:</span>
            </div>
            <p className="text-xs font-mono text-blue-900 dark:text-cyan-200/90 leading-relaxed dark:bg-slate-900/80 bg-white p-2.5 rounded-lg border dark:border-slate-800 border-slate-200">
              {currentStepDef.cryptoDetail}
            </p>
          </div>

          <div className="dark:bg-amber-950/30 bg-amber-50 border dark:border-amber-800/40 border-amber-200 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-200/90 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <strong>Ghi chú thực hành:</strong> Khi bấm "Thực thi bước này", ứng dụng sẽ tự động chuyển đến tab tương ứng ({currentStepDef.roleTarget === 'patient' ? 'Bệnh nhân' : currentStepDef.roleTarget === 'hospital' ? 'Bệnh viện A' : currentStepDef.roleTarget === 'doctor' ? 'Bác sĩ B' : 'Sổ cái'}) và kích hoạt thao tác thực tế trong trình duyệt!
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-t dark:border-slate-800 border-slate-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => runScenarioStep(autoStep)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-md sm:shadow-lg shadow-blue-600/30 transition cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Thực thi bước {autoStep}</span>
            </button>

            <button
              onClick={handleRunAll}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl dark:bg-slate-800 dark:hover:bg-slate-700 bg-white hover:bg-slate-100 text-slate-800 dark:text-slate-200 font-medium text-xs border dark:border-slate-700 border-slate-300 shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{isRunning ? 'Đang chạy kịch bản...' : 'Chạy liên tục từ bước này'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={autoStep <= 1}
              className="p-2 rounded-xl dark:bg-slate-800 dark:hover:bg-slate-700 bg-white hover:bg-slate-100 text-slate-700 dark:text-slate-300 border dark:border-slate-700 border-slate-300 shadow-sm disabled:opacity-40 transition cursor-pointer"
              title="Bước trước"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleNext}
              disabled={autoStep >= 7}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl dark:bg-slate-800 dark:hover:bg-slate-700 bg-white hover:bg-slate-100 text-slate-900 dark:text-white font-medium text-xs sm:text-sm border dark:border-slate-700 border-slate-300 shadow-sm disabled:opacity-40 transition cursor-pointer"
            >
              <span>Bước tiếp</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
