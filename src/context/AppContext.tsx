import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  BlockchainBlock,
  BlockchainTransaction,
  ConsentRecord,
  DidDocument,
  EncryptedIpfsPayload,
  KeyPairBundle,
  MedicalRecordData,
  SamplePatientProfile,
  VerifiableCredential,
  VerificationStepResult,
} from '../types';
import {
  generateEcdsaKeyPair,
  generateRsaKeyPair,
  generateAesKey,
  encryptAesGcm,
  decryptAesGcm,
  wrapAesKey,
  unwrapAesKey,
  signEcdsa,
  verifyEcdsa,
  sha256Hex,
  generateCid,
  exportKeyJwk,
  bufferToHex,
  base64ToBuffer,
} from '../services/crypto';
import { BlockchainLedger } from '../services/blockchain';
import {
  HOSPITAL_A_INFO,
  ROGUE_HOSPITAL_INFO,
  DOCTOR_B_INFO,
  SAMPLE_PATIENTS,
  SAMPLE_RECORDS,
} from '../services/mockData';

export type TabType = 'patient' | 'hospital' | 'doctor' | 'ledger';
export type ThemeMode = 'dark' | 'light';

interface PatientWalletState {
  profile: SamplePatientProfile;
  did: string;
  keys: KeyPairBundle;
  credentials: VerifiableCredential[];
  vaultKeys: Record<string, CryptoKey>;
}

interface AppContextType {
  tab: TabType;
  setTab: (tab: TabType) => void;
  ledger: BlockchainLedger;
  blockchainVersion: number;
  
  // Theme
  theme: ThemeMode;
  toggleTheme: () => void;

  // Sample Profiles
  samplePatients: SamplePatientProfile[];
  activePatientId: string;
  activePatientProfile: SamplePatientProfile | null;
  selectPatientProfile: (profileId: string) => void;

  // Active Patient Identity
  patientDid: string;
  patientName: string;
  patientKeys: KeyPairBundle | null;
  hospitalAKeys: KeyPairBundle | null;
  rogueHospitalKeys: KeyPairBundle | null;
  doctorBKeys: KeyPairBundle | null;
  isInitializing: boolean;

  // Patient Wallet
  patientCredentials: VerifiableCredential[];
  patientVaultKeys: Record<string, CryptoKey>;

  // Search keyword in records
  recordSearchQuery: string;
  setRecordSearchQuery: (query: string) => void;
  recordFilterTag: string;
  setRecordFilterTag: (tag: string) => void;

  // Actions
  generateNewPatientDid: (name?: string) => Promise<string>;
  issueRecordByHospitalA: (data: MedicalRecordData) => Promise<{ success: boolean; vc?: VerifiableCredential; error?: string }>;
  issueRecordByRogueHospital: (data: MedicalRecordData) => Promise<{ success: boolean; error?: string }>;
  grantConsentToDoctorB: (recordId: string, durationMs: number) => Promise<{ success: boolean; consentId?: string; error?: string }>;
  revokeConsent: (consentId: string) => Promise<{ success: boolean; error?: string }>;
  toggleTamperIpfs: (cid: string) => { tampered: boolean; message: string };

  // Verification process for Doctor B
  runDoctorVerification: (
    recordId: string,
    onStepUpdate?: (steps: VerificationStepResult[]) => void
  ) => Promise<{
    success: boolean;
    recordData?: MedicalRecordData;
    failedStep?: string;
    steps: VerificationStepResult[];
  }>;

  // Auto Scenario State
  isAutoScenarioOpen: boolean;
  setIsAutoScenarioOpen: (open: boolean) => void;
  autoStep: number;
  setAutoStep: (step: number) => void;
  isScenarioRunning: boolean;
  setIsScenarioRunning: (running: boolean) => void;
  runScenarioStep: (stepNumber: number) => Promise<void>;

  // Inspection Modal
  inspectData: { title: string; subtitle?: string; content: any; mode?: 'json' | 'crypto' } | null;
  setInspectData: (data: { title: string; subtitle?: string; content: any; mode?: 'json' | 'crypto' } | null) => void;

  // Reset
  resetAll: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tab, setTab] = useState<TabType>('patient');
  const [ledger] = useState<BlockchainLedger>(() => new BlockchainLedger());
  const [blockchainVersion, setBlockchainVersion] = useState<number>(0);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Theme setup with localStorage persistence
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('medpassport_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    return 'dark';
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('medpassport_theme', next);
      } catch {
        // ignore
      }
      return next;
    });
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Pre-loaded patient wallets mapping: profileId -> PatientWalletState
  const [walletsMap, setWalletsMap] = useState<Record<string, PatientWalletState>>({});
  const [activePatientId, setActivePatientId] = useState<string>('patient-an');

  // Search in records
  const [recordSearchQuery, setRecordSearchQuery] = useState<string>('');
  const [recordFilterTag, setRecordFilterTag] = useState<string>('ALL');

  // Identity Bundles
  const [patientDid, setPatientDid] = useState<string>('did:demo:patient-an');
  const [patientName, setPatientName] = useState<string>('Nguyễn Văn An');
  const [patientKeys, setPatientKeys] = useState<KeyPairBundle | null>(null);
  const [hospitalAKeys, setHospitalAKeys] = useState<KeyPairBundle | null>(null);
  const [rogueHospitalKeys, setRogueHospitalKeys] = useState<KeyPairBundle | null>(null);
  const [doctorBKeys, setDoctorBKeys] = useState<KeyPairBundle | null>(null);

  // Patient wallet
  const [patientCredentials, setPatientCredentials] = useState<VerifiableCredential[]>([]);
  const [patientVaultKeys, setPatientVaultKeys] = useState<Record<string, CryptoKey>>({});

  // Inspection modal
  const [inspectData, setInspectData] = useState<{
    title: string;
    subtitle?: string;
    content: any;
    mode?: 'json' | 'crypto';
  } | null>(null);

  // Auto Scenario Tour
  const [isAutoScenarioOpen, setIsAutoScenarioOpen] = useState<boolean>(false);
  const [autoStep, setAutoStep] = useState<number>(1);
  const [isScenarioRunning, setIsScenarioRunning] = useState<boolean>(false);

  const bumpBlockchain = () => setBlockchainVersion(v => v + 1);

  // Initialize System and Pre-load 3 Patient Profiles
  const initializeSystem = useCallback(async () => {
    setIsInitializing(true);
    try {
      // 1. Genesis Block
      await ledger.initGenesisBlock();

      // 2. Hospital A keys (ECDSA P-256)
      const hospEcdsa = await generateEcdsaKeyPair();
      const hospJwk = await exportKeyJwk(hospEcdsa.publicKey);
      const hospBundle: KeyPairBundle = {
        ecdsaPublicKeyJwk: hospJwk,
        ecdsaPrivateKey: hospEcdsa.privateKey,
        ecdsaPublicKey: hospEcdsa.publicKey,
        fingerprint: (await sha256Hex(JSON.stringify(hospJwk))).slice(0, 16),
      };
      setHospitalAKeys(hospBundle);

      const hospDoc: DidDocument = {
        id: HOSPITAL_A_INFO.did,
        name: HOSPITAL_A_INFO.name,
        role: 'hospital',
        ecdsaPublicKeyJwk: hospJwk,
        created: new Date().toISOString(),
        accreditedBy: HOSPITAL_A_INFO.accreditedBy,
        status: 'ACTIVE',
      };
      await ledger.registerDid(hospDoc);

      // 3. Rogue Hospital keys (ECDSA P-256)
      const rogueEcdsa = await generateEcdsaKeyPair();
      const rogueJwk = await exportKeyJwk(rogueEcdsa.publicKey);
      const rogueBundle: KeyPairBundle = {
        ecdsaPublicKeyJwk: rogueJwk,
        ecdsaPrivateKey: rogueEcdsa.privateKey,
        ecdsaPublicKey: rogueEcdsa.publicKey,
        fingerprint: (await sha256Hex(JSON.stringify(rogueJwk))).slice(0, 16),
      };
      setRogueHospitalKeys(rogueBundle);

      const rogueDoc: DidDocument = {
        id: ROGUE_HOSPITAL_INFO.did,
        name: ROGUE_HOSPITAL_INFO.name,
        role: 'hospital',
        ecdsaPublicKeyJwk: rogueJwk,
        created: new Date().toISOString(),
        status: 'ACTIVE',
      };
      await ledger.registerDid(rogueDoc);

      // 4. Doctor B keys (RSA-OAEP for unwrapping + ECDSA for signing)
      const docRsa = await generateRsaKeyPair();
      const docEcdsa = await generateEcdsaKeyPair();
      const docRsaJwk = await exportKeyJwk(docRsa.publicKey);
      const docEcdsaJwk = await exportKeyJwk(docEcdsa.publicKey);

      const docBundle: KeyPairBundle = {
        ecdsaPublicKeyJwk: docEcdsaJwk,
        ecdsaPrivateKey: docEcdsa.privateKey,
        ecdsaPublicKey: docEcdsa.publicKey,
        rsaPublicKeyJwk: docRsaJwk,
        rsaPrivateKey: docRsa.privateKey,
        rsaPublicKey: docRsa.publicKey,
        fingerprint: (await sha256Hex(JSON.stringify(docRsaJwk))).slice(0, 16),
      };
      setDoctorBKeys(docBundle);

      const docDoc: DidDocument = {
        id: DOCTOR_B_INFO.did,
        name: DOCTOR_B_INFO.name,
        role: 'doctor',
        ecdsaPublicKeyJwk: docEcdsaJwk,
        rsaPublicKeyJwk: docRsaJwk,
        created: new Date().toISOString(),
        status: 'ACTIVE',
      };
      await ledger.registerDid(docDoc);

      // 5. Pre-load 3 Patient Profiles & Issue their sample medical records
      const loadedWallets: Record<string, PatientWalletState> = {};

      for (const profile of SAMPLE_PATIENTS) {
        const pEcdsa = await generateEcdsaKeyPair();
        const pRsa = await generateRsaKeyPair();
        const pEcdsaJwk = await exportKeyJwk(pEcdsa.publicKey);
        const pRsaJwk = await exportKeyJwk(pRsa.publicKey);

        const fingerprint = (await sha256Hex(JSON.stringify(pEcdsaJwk))).slice(0, 8);
        const did = `did:demo:${profile.id}-${fingerprint}`;

        const pBundle: KeyPairBundle = {
          ecdsaPublicKeyJwk: pEcdsaJwk,
          ecdsaPrivateKey: pEcdsa.privateKey,
          ecdsaPublicKey: pEcdsa.publicKey,
          rsaPublicKeyJwk: pRsaJwk,
          rsaPrivateKey: pRsa.privateKey,
          rsaPublicKey: pRsa.publicKey,
          fingerprint,
        };

        const patDoc: DidDocument = {
          id: did,
          name: profile.name,
          role: 'patient',
          ecdsaPublicKeyJwk: pEcdsaJwk,
          rsaPublicKeyJwk: pRsaJwk,
          created: new Date().toISOString(),
          status: 'ACTIVE',
        };
        await ledger.registerDid(patDoc);

        const vcs: VerifiableCredential[] = [];
        const vault: Record<string, CryptoKey> = {};

        // Pre-issue each record for this patient
        for (const record of profile.records) {
          const aesKey = await generateAesKey();
          const recordPayload: MedicalRecordData = {
            ...record,
            patientDid: did,
            patientName: profile.name,
          };
          const recordJson = JSON.stringify(recordPayload);
          const recordHash = await sha256Hex(recordJson);
          const { ciphertext, iv } = await encryptAesGcm(aesKey, recordJson);
          const cid = await generateCid(ciphertext);

          // Put into IPFS
          const ipfsPayload: EncryptedIpfsPayload = {
            cid,
            ciphertext,
            iv,
            recordId: record.recordId,
            patientDid: did,
            issuerDid: HOSPITAL_A_INFO.did,
            createdAt: new Date().toISOString(),
          };
          ledger.putIpfs(ipfsPayload);

          // Sign VC with Hospital A's key
          const issuanceDate = record.date ? `${record.date}T08:00:00.000Z` : new Date().toISOString();
          const credentialSubject = {
            id: did,
            recordId: record.recordId,
            recordHash,
            cid,
            summary: `${record.diagnosis} (${record.facility})`,
            diagnosis: record.diagnosis,
            doctorName: record.doctorName,
            date: record.date,
            severity: record.severity,
          };

          const signature = await signEcdsa(hospBundle.ecdsaPrivateKey, JSON.stringify(credentialSubject));

          const vc: VerifiableCredential = {
            '@context': ['https://www.w3.org/2018/credentials/v1', 'https://w3id.org/health/v1'],
            id: `urn:uuid:${record.recordId}-${Date.now()}`,
            type: ['VerifiableCredential', 'MedicalHealthRecordCredential'],
            issuer: {
              id: HOSPITAL_A_INFO.did,
              name: HOSPITAL_A_INFO.name,
              license: HOSPITAL_A_INFO.license,
            },
            issuanceDate,
            credentialSubject,
            proof: {
              type: 'JsonWebSignature2020',
              created: issuanceDate,
              verificationMethod: `${HOSPITAL_A_INFO.did}#key-1`,
              jws: signature,
            },
          };

          // Anchor to RecordRegistry
          await ledger.anchorRecord(HOSPITAL_A_INFO.did, record.recordId, did, recordHash, cid);

          vcs.push(vc);
          vault[record.recordId] = aesKey;
        }

        loadedWallets[profile.id] = {
          profile,
          did,
          keys: pBundle,
          credentials: vcs,
          vaultKeys: vault,
        };
      }

      setWalletsMap(loadedWallets);

      // Select default patient (Nguyễn Văn An)
      const defaultWallet = loadedWallets['patient-an'] || Object.values(loadedWallets)[0];
      if (defaultWallet) {
        setActivePatientId(defaultWallet.profile.id);
        setPatientDid(defaultWallet.did);
        setPatientName(defaultWallet.profile.name);
        setPatientKeys(defaultWallet.keys);
        setPatientCredentials(defaultWallet.credentials);
        setPatientVaultKeys(defaultWallet.vaultKeys);
      }

      bumpBlockchain();
    } catch (err) {
      console.error('Lỗi khởi tạo hệ thống:', err);
    } finally {
      setIsInitializing(false);
    }
  }, [ledger]);

  useEffect(() => {
    initializeSystem();
  }, [initializeSystem]);

  // Switch between pre-loaded sample patient profiles
  const selectPatientProfile = useCallback((profileId: string) => {
    const targetWallet = walletsMap[profileId];
    if (targetWallet) {
      setActivePatientId(profileId);
      setPatientDid(targetWallet.did);
      setPatientName(targetWallet.profile.name);
      setPatientKeys(targetWallet.keys);
      setPatientCredentials(targetWallet.credentials);
      setPatientVaultKeys(targetWallet.vaultKeys);
      setRecordSearchQuery('');
      setRecordFilterTag('ALL');
    }
  }, [walletsMap]);

  const activePatientProfile = SAMPLE_PATIENTS.find(p => p.id === activePatientId) || null;

  // Generate new custom Patient DID
  const generateNewPatientDid = async (name: string = 'Nguyễn Văn An'): Promise<string> => {
    const patEcdsa = await generateEcdsaKeyPair();
    const patRsa = await generateRsaKeyPair();
    const patEcdsaJwk = await exportKeyJwk(patEcdsa.publicKey);
    const patRsaJwk = await exportKeyJwk(patRsa.publicKey);

    const didFingerprint = (await sha256Hex(JSON.stringify(patEcdsaJwk))).slice(0, 8);
    const newDid = `did:demo:patient-${didFingerprint}`;

    const patBundle: KeyPairBundle = {
      ecdsaPublicKeyJwk: patEcdsaJwk,
      ecdsaPrivateKey: patEcdsa.privateKey,
      ecdsaPublicKey: patEcdsa.publicKey,
      rsaPublicKeyJwk: patRsaJwk,
      rsaPrivateKey: patRsa.privateKey,
      rsaPublicKey: patRsa.publicKey,
      fingerprint: didFingerprint,
    };

    setPatientDid(newDid);
    setPatientName(name);
    setPatientKeys(patBundle);
    setPatientCredentials([]);
    setPatientVaultKeys({});
    setActivePatientId('custom');

    const patDoc: DidDocument = {
      id: newDid,
      name,
      role: 'patient',
      ecdsaPublicKeyJwk: patEcdsaJwk,
      rsaPublicKeyJwk: patRsaJwk,
      created: new Date().toISOString(),
      status: 'ACTIVE',
    };
    await ledger.registerDid(patDoc);
    bumpBlockchain();
    return newDid;
  };

  // Issue Medical Record by Hospital A
  const issueRecordByHospitalA = async (
    record: MedicalRecordData
  ): Promise<{ success: boolean; vc?: VerifiableCredential; error?: string }> => {
    if (!hospitalAKeys) {
      return { success: false, error: 'Chưa khởi tạo khóa Bệnh viện A' };
    }

    try {
      const aesKey = await generateAesKey();
      const recordJson = JSON.stringify(record);
      const recordHash = await sha256Hex(recordJson);
      const { ciphertext, iv } = await encryptAesGcm(aesKey, recordJson);
      const cid = await generateCid(ciphertext);

      const ipfsPayload: EncryptedIpfsPayload = {
        cid,
        ciphertext,
        iv,
        recordId: record.recordId,
        patientDid: record.patientDid,
        issuerDid: HOSPITAL_A_INFO.did,
        createdAt: new Date().toISOString(),
      };
      ledger.putIpfs(ipfsPayload);

      const issuanceDate = new Date().toISOString();
      const credentialSubject = {
        id: record.patientDid,
        recordId: record.recordId,
        recordHash,
        cid,
        summary: `${record.diagnosis} (${record.facility})`,
        diagnosis: record.diagnosis,
        doctorName: record.doctorName,
        date: record.date,
        severity: record.severity,
      };

      const canonicalSubjectString = JSON.stringify(credentialSubject);
      const signature = await signEcdsa(hospitalAKeys.ecdsaPrivateKey, canonicalSubjectString);

      const vc: VerifiableCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1', 'https://w3id.org/health/v1'],
        id: `urn:uuid:${record.recordId}-${Date.now()}`,
        type: ['VerifiableCredential', 'MedicalHealthRecordCredential'],
        issuer: {
          id: HOSPITAL_A_INFO.did,
          name: HOSPITAL_A_INFO.name,
          license: HOSPITAL_A_INFO.license,
        },
        issuanceDate,
        credentialSubject,
        proof: {
          type: 'JsonWebSignature2020',
          created: issuanceDate,
          verificationMethod: `${HOSPITAL_A_INFO.did}#key-1`,
          jws: signature,
        },
      };

      const anchorResult = await ledger.anchorRecord(
        HOSPITAL_A_INFO.did,
        record.recordId,
        record.patientDid,
        recordHash,
        cid
      );

      if (!anchorResult.success) {
        return { success: false, error: anchorResult.error };
      }

      setPatientCredentials(prev => [vc, ...prev.filter(c => c.credentialSubject.recordId !== record.recordId)]);
      setPatientVaultKeys(prev => ({ ...prev, [record.recordId]: aesKey }));

      // Also persist to current active wallet if sample patient
      if (activePatientId && walletsMap[activePatientId]) {
        walletsMap[activePatientId].credentials.unshift(vc);
        walletsMap[activePatientId].vaultKeys[record.recordId] = aesKey;
      }

      bumpBlockchain();
      return { success: true, vc };
    } catch (err: any) {
      console.error('Lỗi cấp phát hồ sơ:', err);
      return { success: false, error: err.message || 'Lỗi không xác định khi cấp phát' };
    }
  };

  // Issue Record by Rogue Hospital (Should REVERT!)
  const issueRecordByRogueHospital = async (
    record: MedicalRecordData
  ): Promise<{ success: boolean; error?: string }> => {
    if (!rogueHospitalKeys) {
      return { success: false, error: 'Chưa khởi tạo khóa Bệnh viện Lạ' };
    }

    try {
      const aesKey = await generateAesKey();
      const recordJson = JSON.stringify(record);
      const recordHash = await sha256Hex(recordJson);
      const { ciphertext, iv } = await encryptAesGcm(aesKey, recordJson);
      const cid = await generateCid(ciphertext);

      const anchorResult = await ledger.anchorRecord(
        ROGUE_HOSPITAL_INFO.did,
        record.recordId,
        record.patientDid,
        recordHash,
        cid
      );

      bumpBlockchain();

      if (!anchorResult.success) {
        return { success: false, error: anchorResult.error };
      }

      return { success: true };
    } catch (err: any) {
      bumpBlockchain();
      return { success: false, error: err.message };
    }
  };

  // Grant Consent to Doctor B
  const grantConsentToDoctorB = async (
    recordId: string,
    durationMs: number
  ): Promise<{ success: boolean; consentId?: string; error?: string }> => {
    if (!doctorBKeys?.rsaPublicKey) {
      return { success: false, error: 'Không tìm thấy RSA Public Key của Bác sĩ B' };
    }

    const aesKey = patientVaultKeys[recordId];
    if (!aesKey) {
      return { success: false, error: 'Không tìm thấy khóa giải mã trong Ví bệnh nhân' };
    }

    const vc = patientCredentials.find(c => c.credentialSubject.recordId === recordId);
    if (!vc) {
      return { success: false, error: 'Hồ sơ chưa có trong ví bệnh nhân' };
    }

    try {
      const wrappedKey = await wrapAesKey(aesKey, doctorBKeys.rsaPublicKey);
      const { consent } = await ledger.grantConsent(
        patientDid,
        DOCTOR_B_INFO.did,
        recordId,
        vc.credentialSubject.cid,
        wrappedKey,
        durationMs
      );

      bumpBlockchain();
      return { success: true, consentId: consent.consentId };
    } catch (err: any) {
      console.error('Lỗi cấp quyền:', err);
      return { success: false, error: err.message || 'Lỗi bọc khóa RSA-OAEP' };
    }
  };

  // Revoke Consent
  const revokeConsent = async (consentId: string): Promise<{ success: boolean; error?: string }> => {
    const result = await ledger.revokeConsent(patientDid, consentId);
    bumpBlockchain();
    return result;
  };

  // Tamper / Corrupt IPFS file
  const toggleTamperIpfs = (cid: string) => {
    const res = ledger.tamperIpfsFile(cid);
    bumpBlockchain();
    return res;
  };

  // Run Doctor Verification
  const runDoctorVerification = async (
    recordId: string,
    onStepUpdate?: (steps: VerificationStepResult[]) => void
  ): Promise<{
    success: boolean;
    recordData?: MedicalRecordData;
    failedStep?: string;
    steps: VerificationStepResult[];
  }> => {
    const steps: VerificationStepResult[] = [
      {
        id: '1-issuer',
        title: 'Xác thực Cơ sở y tế (IssuerRegistry)',
        description: 'Kiểm tra danh tính và giấy phép của Bệnh viện cấp phát trên Sổ cái Consortium.',
        status: 'PENDING',
      },
      {
        id: '2-consent',
        title: 'Kiểm tra Giấy ủy quyền (ConsentRegistry)',
        description: 'Kiểm tra quyền truy cập còn hiệu lực và chưa bị bệnh nhân thu hồi.',
        status: 'PENDING',
      },
      {
        id: '3-fetch-ipfs',
        title: 'Tải gói tin mã hóa từ IPFS',
        description: 'Truy xuất gói tin mã hóa từ mạng lưu trữ phi tập trung theo mã định danh CID.',
        status: 'PENDING',
      },
      {
        id: '4-check-cid',
        title: 'Kiểm tra Tính toàn vẹn nội dung CID (SHA-256)',
        description: 'Xác minh CID khớp chuẩn hàm băm SHA-256 của nội dung tải về (chống giả mạo storage).',
        status: 'PENDING',
      },
      {
        id: '5-unwrap-key',
        title: 'Mở bọc khóa giải mã (RSA-OAEP 2048)',
        description: 'Bác sĩ B dùng Private Key RSA cá nhân để mở bọc chìa khóa đối xứng AES-GCM bí mật.',
        status: 'PENDING',
      },
      {
        id: '6-decrypt-aes',
        title: 'Giải mã nội dung y tế (AES-GCM 256-bit)',
        description: 'Giải mã bản mã và kiểm tra thẻ xác thực (Auth Tag) để phát hiện can thiệp byte.',
        status: 'PENDING',
      },
      {
        id: '7-verify-vc-sig',
        title: 'Xác thực Chữ ký số Bệnh viện (ECDSA P-256)',
        description: 'Dùng Public Key Bệnh viện A để kiểm tra tính toàn vẹn và nguồn gốc của Verifiable Credential.',
        status: 'PENDING',
      },
      {
        id: '8-check-anchor',
        title: 'Đối chiếu Hash neo trên Blockchain (RecordRegistry)',
        description: 'So sánh mã băm của hồ sơ đã giải mã với Fingerprint bất biến neo trên Sổ cái.',
        status: 'PENDING',
      },
    ];

    const auditTrail: string[] = [];
    const updateStep = (index: number, patch: Partial<VerificationStepResult>) => {
      steps[index] = { ...steps[index], ...patch };
      if (onStepUpdate) onStepUpdate([...steps]);
    };

    try {
      // Step 1: Issuer Check
      updateStep(0, { status: 'RUNNING' });
      await new Promise(r => setTimeout(r, 220));

      const anchored = ledger.getAnchoredRecord(recordId);
      const issuerDid = anchored?.issuerDid || HOSPITAL_A_INFO.did;
      const isAuthIssuer = ledger.isAuthorizedIssuer(issuerDid);

      if (!isAuthIssuer) {
        updateStep(0, {
          status: 'FAILED',
          details: `Issuer "${issuerDid}" KHÔNG ĐƯỢC PHÉP trong IssuerRegistry!`,
        });
        await ledger.logAccessAttempt({
          accessorDid: DOCTOR_B_INFO.did,
          accessorName: DOCTOR_B_INFO.name,
          patientDid,
          recordId,
          accessResult: 'DENIED',
          reason: 'Issuer không hợp lệ trên IssuerRegistry',
          auditTrail: ['Bước 1 thất bại: Issuer không được cấp phép'],
        });
        bumpBlockchain();
        return { success: false, failedStep: 'Issuer không được cấp phép', steps };
      }

      updateStep(0, {
        status: 'SUCCESS',
        details: `Cơ sở: ${HOSPITAL_A_INFO.name} – Giấy phép: ${HOSPITAL_A_INFO.license} (Được phê duyệt bởi ${HOSPITAL_A_INFO.accreditedBy})`,
      });
      auditTrail.push('Bước 1: Issuer hợp lệ');

      // Step 2: Consent Check
      updateStep(1, { status: 'RUNNING' });
      await new Promise(r => setTimeout(r, 220));

      const consentCheck = ledger.checkConsentStatus(patientDid, DOCTOR_B_INFO.did, recordId);
      if (!consentCheck.valid || !consentCheck.consent) {
        updateStep(1, {
          status: 'FAILED',
          details: `Từ chối truy cập: ${consentCheck.reason}`,
        });
        await ledger.logAccessAttempt({
          accessorDid: DOCTOR_B_INFO.did,
          accessorName: DOCTOR_B_INFO.name,
          patientDid,
          recordId,
          accessResult: 'DENIED',
          reason: consentCheck.reason,
          auditTrail: [...auditTrail, `Bước 2 thất bại: ${consentCheck.reason}`],
        });
        bumpBlockchain();
        return { success: false, failedStep: consentCheck.reason, steps };
      }

      const activeConsent = consentCheck.consent;
      const remainingSeconds = Math.max(0, Math.round((activeConsent.expiresAt - Date.now()) / 1000));
      updateStep(1, {
        status: 'SUCCESS',
        details: `Consent ID: ${activeConsent.consentId} – Còn hiệu lực (${remainingSeconds}s còn lại)`,
      });
      auditTrail.push(`Bước 2: Consent hợp lệ (${activeConsent.consentId})`);

      // Step 3: Fetch from IPFS
      updateStep(2, { status: 'RUNNING' });
      await new Promise(r => setTimeout(r, 220));

      const ipfsItem = ledger.getIpfs(activeConsent.cid);
      if (!ipfsItem) {
        updateStep(2, {
          status: 'FAILED',
          details: `Không tìm thấy gói tin trên IPFS với CID: ${activeConsent.cid}`,
        });
        await ledger.logAccessAttempt({
          accessorDid: DOCTOR_B_INFO.did,
          accessorName: DOCTOR_B_INFO.name,
          patientDid,
          recordId,
          accessResult: 'DENIED',
          reason: 'CID không tồn tại trên IPFS',
          auditTrail: [...auditTrail, 'Bước 3 thất bại: CID not found'],
        });
        bumpBlockchain();
        return { success: false, failedStep: 'CID không tồn tại', steps };
      }

      updateStep(2, {
        status: 'SUCCESS',
        details: `Đã tải gói tin (${ipfsItem.ciphertext.length} ký tự mã hóa, IV 12 bytes). ${ipfsItem.tampered ? '⚠️ PHÁT HIỆN DẤU HIỆU BỊ SỬA ĐỔI' : 'Trạng thái lưu trữ ổn định.'}`,
        dataSnippet: `CID: ${ipfsItem.cid}`,
      });
      auditTrail.push('Bước 3: Tải IPFS thành công');

      // Step 4: Check CID Hash
      updateStep(3, { status: 'RUNNING' });
      await new Promise(r => setTimeout(r, 220));

      const recalculatedCid = await generateCid(ipfsItem.ciphertext);
      if (recalculatedCid !== ipfsItem.cid || ipfsItem.tampered) {
        updateStep(3, {
          status: 'FAILED',
          details: `CẢNH BÁO GIẢ MẠO: Hash của dữ liệu (${recalculatedCid.slice(0, 16)}...) KHÔNG TRÙNG KHỚP với CID gốc (${ipfsItem.cid.slice(0, 16)}...)! Dữ liệu trên node IPFS đã bị kẻ tấn công thay đổi trái phép!`,
        });
        await ledger.logAccessAttempt({
          accessorDid: DOCTOR_B_INFO.did,
          accessorName: DOCTOR_B_INFO.name,
          patientDid,
          recordId,
          accessResult: 'DENIED',
          reason: 'Phát hiện tệp tin trên IPFS bị sửa đổi (CID mismatch)',
          auditTrail: [...auditTrail, 'Bước 4 thất bại: CID mismatch / Tampered IPFS content'],
        });
        bumpBlockchain();
        return { success: false, failedStep: 'Phát hiện sửa đổi tệp IPFS', steps };
      }

      updateStep(3, {
        status: 'SUCCESS',
        details: `Khớp hoàn hảo: SHA-256(ciphertext) === CID (${ipfsItem.cid})`,
      });
      auditTrail.push('Bước 4: CID khớp toàn vẹn');

      // Step 5: Unwrap AES key with Doctor's RSA private key
      updateStep(4, { status: 'RUNNING' });
      await new Promise(r => setTimeout(r, 220));

      if (!doctorBKeys?.rsaPrivateKey) {
        throw new Error('Thiếu RSA Private Key của Bác sĩ B');
      }

      let unwrappedAesKey: CryptoKey;
      try {
        unwrappedAesKey = await unwrapAesKey(activeConsent.wrappedKey, doctorBKeys.rsaPrivateKey);
        updateStep(4, {
          status: 'SUCCESS',
          details: 'Đã dùng RSA-OAEP Private Key của Bác sĩ B để mở bọc chìa khóa AES-GCM (256-bit).',
        });
        auditTrail.push('Bước 5: Mở bọc khóa RSA-OAEP thành công');
      } catch (keyErr: any) {
        updateStep(4, {
          status: 'FAILED',
          details: `Không thể mở bọc khóa: ${keyErr.message}`,
        });
        await ledger.logAccessAttempt({
          accessorDid: DOCTOR_B_INFO.did,
          accessorName: DOCTOR_B_INFO.name,
          patientDid,
          recordId,
          accessResult: 'DENIED',
          reason: 'Thất bại khi mở bọc khóa RSA-OAEP',
          auditTrail: [...auditTrail, 'Bước 5 thất bại: RSA-OAEP unwrap failed'],
        });
        bumpBlockchain();
        return { success: false, failedStep: 'Lỗi mở bọc khóa', steps };
      }

      // Step 6: Decrypt AES-GCM
      updateStep(5, { status: 'RUNNING' });
      await new Promise(r => setTimeout(r, 220));

      let decryptedPlainText = '';
      let medicalData: MedicalRecordData;
      try {
        decryptedPlainText = await decryptAesGcm(unwrappedAesKey, ipfsItem.ciphertext, ipfsItem.iv);
        medicalData = JSON.parse(decryptedPlainText);
        updateStep(5, {
          status: 'SUCCESS',
          details: 'Giải mã AES-GCM thành công. Thẻ xác thực (Authentication Tag) hợp lệ.',
        });
        auditTrail.push('Bước 6: Giải mã AES-GCM thành công');
      } catch (aesErr: any) {
        updateStep(5, {
          status: 'FAILED',
          details: `Giải mã thất bại: Thẻ xác thực AES-GCM Tag không hợp lệ hoặc bản mã bị phá hủy!`,
        });
        await ledger.logAccessAttempt({
          accessorDid: DOCTOR_B_INFO.did,
          accessorName: DOCTOR_B_INFO.name,
          patientDid,
          recordId,
          accessResult: 'DENIED',
          reason: 'AES-GCM Authentication Tag mismatch',
          auditTrail: [...auditTrail, 'Bước 6 thất bại: Tag mismatch'],
        });
        bumpBlockchain();
        return { success: false, failedStep: 'Lỗi giải mã AES-GCM', steps };
      }

      // Step 7: Verify VC ECDSA Signature
      updateStep(6, { status: 'RUNNING' });
      await new Promise(r => setTimeout(r, 220));

      const vc = patientCredentials.find(c => c.credentialSubject.recordId === recordId);
      if (!vc) {
        updateStep(6, {
          status: 'FAILED',
          details: 'Không tìm thấy Verifiable Credential kèm theo.',
        });
        return { success: false, failedStep: 'Không tìm thấy VC', steps };
      }

      const hospDidDoc = ledger.getDidDocument(HOSPITAL_A_INFO.did);
      if (!hospDidDoc || !hospitalAKeys?.ecdsaPublicKey) {
        throw new Error('Không tìm thấy Public Key của Bệnh viện A');
      }

      const canonicalSubject = JSON.stringify(vc.credentialSubject);
      const isSigValid = await verifyEcdsa(hospitalAKeys.ecdsaPublicKey, vc.proof.jws, canonicalSubject);

      if (!isSigValid) {
        updateStep(6, {
          status: 'FAILED',
          details: 'CHỮ KÝ SỐ KHÔNG HỢP LỆ! Chữ ký ECDSA P-256 không khớp với Public Key của Bệnh viện A!',
        });
        await ledger.logAccessAttempt({
          accessorDid: DOCTOR_B_INFO.did,
          accessorName: DOCTOR_B_INFO.name,
          patientDid,
          recordId,
          accessResult: 'DENIED',
          reason: 'Chữ ký ECDSA trên VC không hợp lệ',
          auditTrail: [...auditTrail, 'Bước 7 thất bại: Chữ ký số giả mạo'],
        });
        bumpBlockchain();
        return { success: false, failedStep: 'Chữ ký số giả mạo', steps };
      }

      updateStep(6, {
        status: 'SUCCESS',
        details: `Chữ ký ECDSA P-256 hợp lệ. Người ký: ${HOSPITAL_A_INFO.name} (${HOSPITAL_A_INFO.license})`,
      });
      auditTrail.push('Bước 7: Chữ ký số VC hợp lệ');

      // Step 8: Compare Decrypted Hash with Blockchain Anchor
      updateStep(7, { status: 'RUNNING' });
      await new Promise(r => setTimeout(r, 220));

      const calculatedPlainHash = await sha256Hex(decryptedPlainText);
      const onChainRecord = ledger.getAnchoredRecord(recordId);

      if (!onChainRecord) {
        updateStep(7, {
          status: 'FAILED',
          details: 'Bản ghi không tồn tại trong RecordRegistry trên Sổ cái!',
        });
        return { success: false, failedStep: 'Record chưa neo trên Blockchain', steps };
      }

      if (onChainRecord.recordHash !== calculatedPlainHash) {
        updateStep(7, {
          status: 'FAILED',
          details: `Sai lệch mã băm: Hash giải mã (${calculatedPlainHash.slice(0, 16)}...) != Hash neo trên chuỗi (${onChainRecord.recordHash.slice(0, 16)}...)!`,
        });
        await ledger.logAccessAttempt({
          accessorDid: DOCTOR_B_INFO.did,
          accessorName: DOCTOR_B_INFO.name,
          patientDid,
          recordId,
          accessResult: 'DENIED',
          reason: 'Hash hồ sơ không khớp Hash trên Blockchain RecordRegistry',
          auditTrail: [...auditTrail, 'Bước 8 thất bại: Hash mismatch với Ledger'],
        });
        bumpBlockchain();
        return { success: false, failedStep: 'Hash không khớp Ledger', steps };
      }

      updateStep(7, {
        status: 'SUCCESS',
        details: `Mã băm hoàn toàn trùng khớp với Khối #${onChainRecord.blockIndex} trên Sổ cái (${calculatedPlainHash.slice(0, 24)}...)`,
      });
      auditTrail.push('Bước 8: Đối chiếu Hash Blockchain thành công');

      await ledger.logAccessAttempt({
        accessorDid: DOCTOR_B_INFO.did,
        accessorName: DOCTOR_B_INFO.name,
        patientDid,
        recordId,
        accessResult: 'GRANTED',
        reason: 'Xác minh thành công 8/8 lớp bảo mật',
        auditTrail,
      });

      bumpBlockchain();
      return { success: true, recordData: medicalData, steps };
    } catch (unexpectedErr: any) {
      console.error('Lỗi xác minh bất ngờ:', unexpectedErr);
      return { success: false, failedStep: unexpectedErr.message, steps };
    }
  };

  // Run Guided Scenario Step
  const runScenarioStep = async (stepNumber: number) => {
    setAutoStep(stepNumber);
    switch (stepNumber) {
      case 1:
        setTab('patient');
        await generateNewPatientDid('Nguyễn Văn An');
        break;
      case 2:
        setTab('hospital');
        if (SAMPLE_RECORDS[0]) {
          await issueRecordByHospitalA({
            ...SAMPLE_RECORDS[0],
            patientDid,
            patientName,
          });
        }
        break;
      case 3:
        setTab('hospital');
        if (SAMPLE_RECORDS[1]) {
          await issueRecordByRogueHospital({
            ...SAMPLE_RECORDS[1],
            patientDid,
            patientName,
          });
        }
        break;
      case 4:
        setTab('patient');
        if (patientCredentials.length > 0) {
          await grantConsentToDoctorB(patientCredentials[0].credentialSubject.recordId, 30 * 1000);
        }
        break;
      case 5:
        setTab('doctor');
        break;
      case 6:
        if (patientCredentials.length > 0) {
          toggleTamperIpfs(patientCredentials[0].credentialSubject.cid);
        }
        setTab('doctor');
        break;
      case 7:
        setTab('patient');
        const consents = Array.from(ledger.contracts.consentRegistry.values());
        if (consents.length > 0) {
          await revokeConsent(consents[0].consentId);
        }
        setTab('doctor');
        break;
      default:
        break;
    }
  };

  // Reset entire state
  const resetAll = async () => {
    ledger.chain = [];
    ledger.ipfsStorage.clear();
    ledger.contracts.didRegistry.clear();
    ledger.contracts.issuerRegistry.clear();
    ledger.contracts.recordRegistry.clear();
    ledger.contracts.consentRegistry.clear();
    ledger.contracts.accessLogs = [];
    setPatientCredentials([]);
    setPatientVaultKeys({});
    setWalletsMap({});
    await initializeSystem();
    setAutoStep(1);
    setIsScenarioRunning(false);
  };

  return (
    <AppContext.Provider
      value={{
        tab,
        setTab,
        ledger,
        blockchainVersion,
        theme,
        toggleTheme,
        samplePatients: SAMPLE_PATIENTS,
        activePatientId,
        activePatientProfile,
        selectPatientProfile,
        patientDid,
        patientName,
        patientKeys,
        hospitalAKeys,
        rogueHospitalKeys,
        doctorBKeys,
        isInitializing,
        patientCredentials,
        patientVaultKeys,
        recordSearchQuery,
        setRecordSearchQuery,
        recordFilterTag,
        setRecordFilterTag,
        generateNewPatientDid,
        issueRecordByHospitalA,
        issueRecordByRogueHospital,
        grantConsentToDoctorB,
        revokeConsent,
        toggleTamperIpfs,
        runDoctorVerification,
        isAutoScenarioOpen,
        setIsAutoScenarioOpen,
        autoStep,
        setAutoStep,
        isScenarioRunning,
        setIsScenarioRunning,
        runScenarioStep,
        inspectData,
        setInspectData,
        resetAll,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
