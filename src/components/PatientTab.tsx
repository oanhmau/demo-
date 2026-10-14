import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DOCTOR_B_INFO } from '../services/mockData';
import {
  User,
  Key,
  Shield,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  Trash2,
  RefreshCw,
  Search,
  X,
  Filter,
  Calendar,
  AlertTriangle,
  Stethoscope,
  Users,
  ChevronRight,
  Info,
  Download,
  HardDrive,
} from 'lucide-react';
import { VerifiableCredential } from '../types';

export const PatientTab: React.FC = () => {
  const {
    patientDid,
    patientName,
    patientKeys,
    patientCredentials,
    patientVaultKeys,
    samplePatients,
    activePatientId,
    activePatientProfile,
    selectPatientProfile,
    generateNewPatientDid,
    grantConsentToDoctorB,
    revokeConsent,
    ledger,
    blockchainVersion,
    setInspectData,
    setTab,
  } = useApp();

  const [copiedDid, setCopiedDid] = useState<boolean>(false);
  const [selectedDuration, setSelectedDuration] = useState<'30s' | '7d'>('30s');
  const [grantingRecordId, setGrantingRecordId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [nowMs, setNowMs] = useState<number>(Date.now());

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTag, setFilterTag] = useState<'ALL' | 'EMERGENCY' | 'RECENT'>('ALL');

  // Keep countdown timer ticking
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyDid = () => {
    navigator.clipboard.writeText(patientDid);
    setCopiedDid(true);
    setTimeout(() => setCopiedDid(false), 2000);
  };

  const handleGrantConsent = async (recordId: string) => {
    setGrantingRecordId(recordId);
    setActionMessage(null);
    const durationMs = selectedDuration === '30s' ? 30 * 1000 : 7 * 24 * 60 * 60 * 1000;

    const res = await grantConsentToDoctorB(recordId, durationMs);
    setGrantingRecordId(null);

    if (res.success) {
      setActionMessage({
        type: 'success',
        text: `Đã cấp quyền truy cập cho Bác sĩ B thành công (${selectedDuration === '30s' ? '30 giây' : '7 ngày'}). Chìa khóa AES đã được bọc bằng RSA-OAEP!`,
      });
    } else {
      setActionMessage({
        type: 'error',
        text: `Lỗi khi cấp quyền: ${res.error}`,
      });
    }
  };

  const handleRevokeConsent = async (consentId: string) => {
    const res = await revokeConsent(consentId);
    if (res.success) {
      setActionMessage({
        type: 'success',
        text: 'Đã thu hồi quyền truy cập thành công trên ConsentRegistry.',
      });
    } else {
      setActionMessage({
        type: 'error',
        text: `Lỗi khi thu hồi: ${res.error}`,
      });
    }
  };

  const handleExportRecord = (vc: VerifiableCredential) => {
    const recordId = vc.credentialSubject.recordId;
    const ipfsItem = ledger.getIpfs(vc.credentialSubject.cid);
    const onChainRecord = ledger.getAnchoredRecord(recordId);

    const exportPackage = {
      format: 'MedPassport-Encrypted-Record-Backup',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      metadata: {
        system: 'MedPassport – Hộ chiếu sức khỏe tự chủ (Self-Sovereign Identity)',
        description:
          'Tệp JSON sao lưu ngoại tuyến chứa dữ liệu y tế đã mã hóa chuẩn AES-GCM (256-bit) và chữ ký số xác thực ECDSA P-256 từ Bệnh viện.',
        compliance: ['W3C Verifiable Credentials', 'Web Crypto API', 'IPFS Content-Addressed Storage'],
      },
      patient: {
        did: patientDid,
        name: patientName,
        dob: activePatientProfile?.dob,
        gender: activePatientProfile?.gender,
        bloodType: activePatientProfile?.bloodType,
      },
      clinicalSummary: {
        recordId,
        diagnosis: vc.credentialSubject.diagnosis || vc.credentialSubject.summary,
        doctorName: vc.credentialSubject.doctorName || 'Bác sĩ điều trị',
        facility: vc.issuer.name,
        date: vc.credentialSubject.date || vc.issuanceDate,
        severity: vc.credentialSubject.severity || 'Thường',
      },
      encryptedStoragePayload: {
        cid: vc.credentialSubject.cid,
        algorithm: 'AES-GCM-256',
        ciphertextBase64: ipfsItem?.ciphertext || '',
        ivBase64: ipfsItem?.iv || '',
        storageType: 'IPFS Content-Addressed Encrypted Object',
        tampered: !!ipfsItem?.tampered,
      },
      verifiableCredential: vc,
      blockchainConsortiumProof: onChainRecord
        ? {
            contract: 'RecordRegistry',
            recordId: onChainRecord.recordId,
            recordHash: onChainRecord.recordHash,
            cid: onChainRecord.cid,
            issuerDid: onChainRecord.issuerDid,
            blockIndex: onChainRecord.blockIndex,
            timestamp: onChainRecord.timestamp,
            verificationStatus: 'CONFIRMED_ON_CHAIN',
          }
        : null,
      verificationNote:
        'Dữ liệu lâm sàng trong tệp được bảo vệ bằng mã hóa đối xứng AES-GCM. Để đọc nội dung, cần khóa giải mã đối xứng hoặc khóa riêng tư RSA-OAEP của bên được cấp quyền (ConsentRegistry).',
    };

    const blob = new Blob([JSON.stringify(exportPackage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MedPassport-${recordId}-${vc.credentialSubject.date || 'backup'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setActionMessage({
      type: 'success',
      text: `Đã xuất hồ sơ "${recordId}" thành file JSON ngoại tuyến (${Math.round((blob.size / 1024) * 10) / 10} KB). Tệp chứa bản mã AES-GCM, chữ ký số ECDSA và bằng chứng Blockchain!`,
    });
  };

  const handleExportAllRecords = () => {
    if (patientCredentials.length === 0) return;

    const allPackages = patientCredentials.map((vc) => {
      const recordId = vc.credentialSubject.recordId;
      const ipfsItem = ledger.getIpfs(vc.credentialSubject.cid);
      const onChainRecord = ledger.getAnchoredRecord(recordId);

      return {
        recordId,
        clinicalSummary: {
          diagnosis: vc.credentialSubject.diagnosis || vc.credentialSubject.summary,
          doctorName: vc.credentialSubject.doctorName,
          date: vc.credentialSubject.date || vc.issuanceDate,
          facility: vc.issuer.name,
        },
        encryptedStoragePayload: {
          cid: vc.credentialSubject.cid,
          algorithm: 'AES-GCM-256',
          ciphertextBase64: ipfsItem?.ciphertext || '',
          ivBase64: ipfsItem?.iv || '',
        },
        verifiableCredential: vc,
        blockchainProof: onChainRecord,
      };
    });

    const fullBackup = {
      format: 'MedPassport-Full-Patient-Wallet-Backup',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      patient: {
        did: patientDid,
        name: patientName,
        dob: activePatientProfile?.dob,
        bloodType: activePatientProfile?.bloodType,
      },
      totalRecords: allPackages.length,
      records: allPackages,
    };

    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MedPassport-Full-Wallet-${patientName.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setActionMessage({
      type: 'success',
      text: `Đã xuất toàn bộ ${allPackages.length} hồ sơ bệnh án trong ví thành file JSON sao lưu tổng thể!`,
    });
  };

  // Filter patient credentials by search query (diagnosis, date, doctorName, recordId)
  const filteredCredentials = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return patientCredentials.filter((vc) => {
      const subject = vc.credentialSubject;
      const diagnosis = (subject.diagnosis || subject.summary || '').toLowerCase();
      const date = (subject.date || vc.issuanceDate || '').toLowerCase();
      const doctorName = (subject.doctorName || '').toLowerCase();
      const recordId = (subject.recordId || '').toLowerCase();
      const issuer = (vc.issuer.name || '').toLowerCase();
      const severity = subject.severity || 'Thường';

      // Text search match
      const matchesSearch =
        !q ||
        diagnosis.includes(q) ||
        date.includes(q) ||
        doctorName.includes(q) ||
        recordId.includes(q) ||
        issuer.includes(q);

      if (!matchesSearch) return false;

      // Tag filter
      if (filterTag === 'EMERGENCY') {
        return severity === 'Cảnh báo cao' || severity === 'Khẩn cấp';
      }
      if (filterTag === 'RECENT') {
        return date.includes('2026-10') || date.includes('2026-09');
      }

      return true;
    });
  }, [patientCredentials, searchQuery, filterTag]);

  const allConsents = Array.from(ledger.contracts.consentRegistry.values()).filter(
    (c) => c.patientDid === patientDid
  );

  return (
    <div className="space-y-6">
      {/* Top Banner Alert / Action notification */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-in fade-in ${
            actionMessage.type === 'success'
              ? 'dark:bg-emerald-950/40 bg-emerald-50 dark:border-emerald-700/60 border-emerald-300 dark:text-emerald-200 text-emerald-800'
              : 'dark:bg-rose-950/40 bg-rose-50 dark:border-rose-700/60 border-rose-300 dark:text-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs opacity-75 hover:opacity-100 font-semibold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* 3 Sample Patient Profiles Selector Banner */}
      <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl p-5 shadow-sm dark:shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              Hồ sơ bệnh nhân mẫu sẵn có (Chọn để thử nghiệm nhanh):
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Dữ liệu y tế và hồ sơ mã hóa được nạp sẵn
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {samplePatients.map((p) => {
            const isSelected = activePatientId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => selectPatientProfile(p.id)}
                className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'dark:bg-blue-950/40 bg-blue-50/80 dark:border-blue-500 border-blue-400 ring-2 ring-blue-500/20 shadow-sm'
                    : 'dark:bg-slate-950/60 bg-slate-50 dark:border-slate-800 border-slate-200 hover:dark:bg-slate-800/60 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{p.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        {p.gender}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Sinh: <strong>{p.dob}</strong> &middot; Nhóm máu: <strong className="text-blue-600 dark:text-cyan-400 font-mono">{p.bloodType}</strong>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
                  )}
                </div>

                <div className="mt-2.5 text-[11px] text-rose-600 dark:text-rose-400 font-medium truncate flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span className="truncate">{p.allergies[0]}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Patient DID Identity Card */}
      <div className="dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40 bg-gradient-to-br from-white via-slate-50 to-blue-50/50 border dark:border-slate-800 border-slate-200 rounded-2xl p-6 shadow-sm dark:shadow-xl relative overflow-hidden transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
              <User className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2.5">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{patientName}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium">
                  Chủ thể dữ liệu (Self-Sovereign)
                </span>
                {activePatientProfile && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                    Ngày sinh: {activePatientProfile.dob}
                  </span>
                )}
              </div>

              {/* DID String */}
              <div className="mt-2 flex items-center flex-wrap gap-2">
                <span className="text-xs font-mono dark:bg-slate-950/80 bg-slate-100 px-3 py-1.5 rounded-lg border dark:border-slate-800 border-slate-200 text-cyan-700 dark:text-cyan-300 break-all select-all">
                  {patientDid}
                </span>
                <button
                  onClick={handleCopyDid}
                  className="p-1.5 rounded-lg dark:bg-slate-800 dark:hover:bg-slate-700 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:text-slate-300 border dark:border-slate-700 border-slate-200 transition cursor-pointer"
                  title="Sao chép DID"
                >
                  {copiedDid ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Patient Allergies Notice */}
              {activePatientProfile && (
                <div className="mt-2 flex items-center flex-wrap gap-1.5 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Tiền sử dị ứng:</span>
                  {activePatientProfile.allergies.map((a, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-[11px] font-semibold"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-2.5 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-500" />
                  ECDSA P-256 (Ký số)
                </span>
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-500" />
                  RSA-OAEP 2048 (Nhận ủy quyền)
                </span>
              </div>
            </div>
          </div>

          {/* Quick Identity Actions */}
          <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
            <button
              onClick={() => generateNewPatientDid()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl dark:bg-slate-800 dark:hover:bg-slate-700 bg-white hover:bg-slate-100 text-slate-800 dark:text-slate-200 text-xs font-medium border dark:border-slate-700 border-slate-200 shadow-sm transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-500 dark:text-cyan-400" />
              <span>Tạo DID ngẫu nhiên mới</span>
            </button>

            <button
              onClick={() => {
                if (patientKeys) {
                  setInspectData({
                    title: 'Cặp khóa mật mã của Bệnh nhân (Web Crypto API)',
                    subtitle: `DID: ${patientDid}`,
                    content: {
                      did: patientDid,
                      name: patientName,
                      ecdsaPublicKeyJwk: patientKeys.ecdsaPublicKeyJwk,
                      rsaPublicKeyJwk: patientKeys.rsaPublicKeyJwk,
                      fingerprint: patientKeys.fingerprint,
                      privateKeyStorage: 'Stored safely in in-memory Web Crypto CryptoKey handle (non-extractable)',
                    },
                  });
                }
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl dark:bg-blue-950/60 dark:hover:bg-blue-900/60 bg-blue-50 hover:bg-blue-100 text-blue-800 dark:text-blue-200 text-xs font-medium border dark:border-blue-800/60 border-blue-200 shadow-sm transition cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-300" />
              <span>Soi Public Key JWK</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Credentials Wallet with Search + Consent Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Verifiable Credentials Wallet & Search (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Ví hồ sơ bệnh án (Verifiable Credentials)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {patientCredentials.length > 0 && (
                <button
                  onClick={handleExportAllRecords}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg dark:bg-slate-800 dark:hover:bg-slate-700 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border dark:border-slate-700 border-slate-200 text-xs font-medium cursor-pointer shadow-sm transition"
                  title="Xuất toàn bộ hồ sơ trong ví thành một tệp JSON sao lưu ngoại tuyến"
                >
                  <Download className="w-3.5 h-3.5 text-blue-500" />
                  <span>Xuất tất cả JSON</span>
                </button>
              )}
              <span className="text-xs px-2.5 py-0.5 rounded-full dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-700 border dark:border-slate-700 border-slate-200 font-mono">
                {filteredCredentials.length}/{patientCredentials.length} hồ sơ
              </span>
            </div>
          </div>

          {/* SEARCH & FILTER BAR */}
          <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm theo chẩn đoán, ngày khám (2026-10-10), tên bác sĩ, mã REC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-800 border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs dark:text-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Tags */}
            <div className="flex items-center flex-wrap gap-2 text-xs">
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <Filter className="w-3 h-3" /> Lọc nhanh:
              </span>

              <button
                onClick={() => setFilterTag('ALL')}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer text-xs ${
                  filterTag === 'ALL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'dark:bg-slate-800 bg-slate-100 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Tất cả ({patientCredentials.length})
              </button>

              <button
                onClick={() => setFilterTag('EMERGENCY')}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer text-xs ${
                  filterTag === 'EMERGENCY'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'dark:bg-slate-800 bg-slate-100 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Cảnh báo cao & Khẩn cấp
              </button>

              <button
                onClick={() => setFilterTag('RECENT')}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer text-xs ${
                  filterTag === 'RECENT'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'dark:bg-slate-800 bg-slate-100 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Mới nhất (Tháng 9 & 10)
              </button>
            </div>
          </div>

          {/* Credentials List */}
          {patientCredentials.length === 0 ? (
            <div className="dark:bg-slate-900/60 bg-white border border-dashed dark:border-slate-800 border-slate-200 rounded-2xl p-8 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-400 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Ví bệnh nhân chưa có hồ sơ nào
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Chuyển sang tab <strong>"2. Bệnh viện A"</strong> để bệnh viện phát hành bệnh án được mã hóa và ký số.
              </p>
              <button
                onClick={() => setTab('hospital')}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 cursor-pointer"
              >
                <span>Đến Bệnh viện A để phát hành ngay</span>
              </button>
            </div>
          ) : filteredCredentials.length === 0 ? (
            <div className="dark:bg-slate-900/60 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl p-8 text-center space-y-3">
              <Search className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Không tìm thấy hồ sơ phù hợp với "{searchQuery}"
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thử tìm bằng từ khóa khác như "Viêm", "Hen", "Stent", "Đái tháo đường", ngày khám, hoặc tên bác sĩ.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterTag('ALL');
                }}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCredentials.map((vc) => {
                const subject = vc.credentialSubject;
                const recordId = subject.recordId;
                const dateStr = subject.date || new Date(vc.issuanceDate).toISOString().split('T')[0];
                const doctorName = subject.doctorName || 'Bác sĩ điều trị';
                const severity = subject.severity || 'Thường';

                return (
                  <div
                    key={vc.id}
                    className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 hover:dark:border-slate-700 hover:border-slate-300 rounded-2xl p-5 shadow-sm dark:shadow-lg space-y-4 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded dark:bg-blue-950 bg-blue-100 dark:text-blue-300 text-blue-800 border dark:border-blue-800 border-blue-200">
                            {recordId}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {dateStr}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Stethoscope className="w-3.5 h-3.5" />
                            {doctorName}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                          {subject.summary || subject.diagnosis}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Đơn vị cấp: <strong className="text-slate-800 dark:text-slate-200">{vc.issuer.name}</strong> ({vc.issuer.license})
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            severity === 'Khẩn cấp'
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                              : severity === 'Cảnh báo cao'
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                              : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          }`}
                        >
                          {severity}
                        </span>
                      </div>
                    </div>

                    {/* Hashes & CID bar */}
                    <div className="dark:bg-slate-950 bg-slate-50 p-3 rounded-xl border dark:border-slate-800/80 border-slate-200 space-y-1.5 text-xs font-mono">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span>IPFS CID:</span>
                        <span className="text-blue-600 dark:text-cyan-400 select-all">{subject.cid}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span>Record Hash (SHA-256):</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px]" title={subject.recordHash}>
                          {subject.recordHash.slice(0, 24)}...
                        </span>
                      </div>
                    </div>

                    {/* Delegation Section */}
                    <div className="pt-2 border-t dark:border-slate-800/80 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Thời hạn cấp quyền:</span>
                        <div className="flex items-center dark:bg-slate-950 bg-slate-100 rounded-lg p-0.5 border dark:border-slate-800 border-slate-200 text-xs">
                          <button
                            onClick={() => setSelectedDuration('30s')}
                            className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                              selectedDuration === '30s'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            30 giây (Demo)
                          </button>
                          <button
                            onClick={() => setSelectedDuration('7d')}
                            className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                              selectedDuration === '7d'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            7 ngày
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setInspectData({
                              title: `Verifiable Credential (W3C Standard) – ${recordId}`,
                              subtitle: `Chữ ký ECDSA P-256 bởi ${vc.issuer.name}`,
                              content: vc,
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg dark:bg-slate-800 dark:hover:bg-slate-700 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-medium border dark:border-slate-700 border-slate-200 cursor-pointer"
                        >
                          Soi VC Proof
                        </button>

                        <button
                          onClick={() => handleExportRecord(vc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg dark:bg-blue-950/60 dark:hover:bg-blue-900/60 bg-blue-50 hover:bg-blue-100 text-blue-800 dark:text-blue-200 text-xs font-medium border dark:border-blue-800/60 border-blue-200 shadow-sm transition cursor-pointer"
                          title="Tải xuống file JSON chứa bản mã AES-GCM, chữ ký số ECDSA và bằng chứng neo Blockchain để lưu trữ ngoại tuyến"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-300" />
                          <span>Xuất JSON ngoại tuyến</span>
                        </button>

                        <button
                          onClick={() => handleGrantConsent(recordId)}
                          disabled={grantingRecordId === recordId}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Cấp quyền cho Bác sĩ B</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Consent Registry & Access Logs (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Quản lý quyền truy cập (Consent)
              </h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full dark:bg-slate-800 bg-slate-100 text-slate-600 dark:text-slate-400 border dark:border-slate-700 border-slate-200 font-mono">
              {allConsents.length} bản ghi
            </span>
          </div>

          {allConsents.length === 0 ? (
            <div className="dark:bg-slate-900/60 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500 dark:text-slate-400 shadow-sm">
              Chưa có giấy ủy quyền nào được tạo cho bệnh nhân này. Chọn hồ sơ bên trái và bấm <strong>"Cấp quyền cho Bác sĩ B"</strong>.
            </div>
          ) : (
            <div className="space-y-3">
              {allConsents.map((consent) => {
                const isRevoked = consent.status === 'REVOKED';
                const isExpired = Date.now() > consent.expiresAt;
                const isActive = !isRevoked && !isExpired;
                const remainingSecs = Math.max(0, Math.round((consent.expiresAt - nowMs) / 1000));

                return (
                  <div
                    key={consent.consentId}
                    className={`dark:bg-slate-900 bg-white border rounded-xl p-4 space-y-2.5 transition shadow-sm ${
                      isActive
                        ? 'border-emerald-500/50 dark:border-emerald-600/40'
                        : 'dark:border-slate-800 border-slate-200 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-blue-600 dark:text-cyan-300 font-semibold">
                            {consent.consentId}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isActive
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                                : isRevoked
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {isActive ? 'ĐANG CÓ HIỆU LỰC' : isRevoked ? 'ĐÃ THU HỒI' : 'ĐÃ HẾT HẠN'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                          Ủy quyền cho: <strong>{DOCTOR_B_INFO.name}</strong> ({DOCTOR_B_INFO.did})
                        </p>
                      </div>

                      {isActive && (
                        <button
                          onClick={() => handleRevokeConsent(consent.consentId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-600/20 hover:bg-rose-100 dark:hover:bg-rose-600/30 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 text-[11px] font-medium transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Thu hồi</span>
                        </button>
                      )}
                    </div>

                    {/* Timer & Details */}
                    <div className="flex items-center justify-between text-xs font-mono dark:bg-slate-950 bg-slate-50 p-2.5 rounded-lg border dark:border-slate-800/80 border-slate-200">
                      <span className="text-slate-500 dark:text-slate-400">Thời gian còn lại:</span>
                      {isActive ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          {remainingSecs} giây
                        </span>
                      ) : (
                        <span className="text-slate-400">0s (Không khả dụng)</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                      <span>Mã hồ sơ: {consent.recordId}</span>
                      <button
                        onClick={() => {
                          setInspectData({
                            title: `Giao dịch bọc khóa RSA-OAEP cho Bác sĩ B (${consent.consentId})`,
                            subtitle: `Hợp đồng thông minh ConsentRegistry`,
                            content: {
                              consentId: consent.consentId,
                              patientDid: consent.patientDid,
                              doctorDid: consent.doctorDid,
                              recordId: consent.recordId,
                              cid: consent.cid,
                              wrappedKeyRsaBase64: consent.wrappedKey,
                              grantedAt: new Date(consent.grantedAt).toISOString(),
                              expiresAt: new Date(consent.expiresAt).toISOString(),
                              status: consent.status,
                            },
                          });
                        }}
                        className="text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer font-medium"
                      >
                        Soi WrappedKey RSA
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Educational Callout */}
          <div className="dark:bg-slate-900/50 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl p-4 text-xs text-slate-600 dark:text-slate-400 space-y-1.5 shadow-sm">
            <h5 className="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-blue-500 dark:text-cyan-400" />
              Nguyên lý tự chủ dữ liệu (Self-Sovereignty)
            </h5>
            <p>
              Bệnh viện không giữ quyền chia sẻ hồ sơ của bạn. Khi bạn cấp quyền cho bác sĩ, bạn trực tiếp bọc khóa đối xứng bằng khóa công khai của bác sĩ đó. Khi bạn bấm <strong>Thu hồi</strong>, Smart Contract lập tức từ chối và bác sĩ không thể giải mã nội dung được nữa.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
