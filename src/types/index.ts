export type ActorRole = 'patient' | 'hospital' | 'doctor';

export interface KeyPairBundle {
  ecdsaPublicKeyJwk: JsonWebKey;
  ecdsaPrivateKey: CryptoKey;
  ecdsaPublicKey: CryptoKey;
  rsaPublicKeyJwk?: JsonWebKey;
  rsaPrivateKey?: CryptoKey;
  rsaPublicKey?: CryptoKey;
  fingerprint: string;
}

export interface DidDocument {
  id: string; // e.g. "did:demo:patient-an"
  name: string;
  role: ActorRole;
  ecdsaPublicKeyJwk: JsonWebKey;
  rsaPublicKeyJwk?: JsonWebKey;
  created: string;
  accreditedBy?: string;
  status: 'ACTIVE' | 'REVOKED';
}

export interface MedicalRecordData {
  recordId: string;
  patientDid: string;
  patientName: string;
  date: string;
  facility: string;
  diagnosis: string;
  symptoms: string;
  allergies: string[];
  bloodType: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
  }[];
  labResults: {
    testName: string;
    value: string;
    reference: string;
    status: 'NORMAL' | 'HIGH' | 'LOW' | 'WARNING';
  }[];
  doctorNotes: string;
  doctorName: string;
  severity: 'Thường' | 'Cảnh báo cao' | 'Khẩn cấp';
}

export interface VerifiableCredential {
  '@context': string[];
  id: string; // urn:uuid:...
  type: string[];
  issuer: {
    id: string;
    name: string;
    license: string;
  };
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id: string; // patientDid
    recordId: string;
    recordHash: string; // SHA-256 of plain medical record
    cid: string; // IPFS CID of encrypted record
    summary: string;
    diagnosis?: string;
    doctorName?: string;
    date?: string;
    severity?: 'Thường' | 'Cảnh báo cao' | 'Khẩn cấp';
  };
  proof: {
    type: string; // "JsonWebSignature2020" / "ECDSA-P256-SHA256"
    created: string;
    verificationMethod: string;
    jws: string; // Base64 signature of canonical credentialSubject
  };
}

export interface SamplePatientProfile {
  id: string;
  name: string;
  dob: string;
  gender: string;
  phone: string;
  idCard: string;
  bloodType: string;
  allergies: string[];
  records: MedicalRecordData[];
}

export interface EncryptedIpfsPayload {
  cid: string;
  ciphertext: string; // Base64
  iv: string; // Base64
  recordId: string;
  patientDid: string;
  issuerDid: string;
  createdAt: string;
  tampered?: boolean;
  originalCiphertext?: string;
}

export interface ConsentRecord {
  consentId: string;
  patientDid: string;
  doctorDid: string;
  recordId: string;
  cid: string;
  wrappedKey: string; // AES key wrapped using Doctor B's RSA-OAEP public key (Base64)
  grantedAt: number;
  expiresAt: number; // timestamp in ms
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
}

export interface AccessLogEntry {
  id: string;
  timestamp: string;
  accessorDid: string;
  accessorName: string;
  patientDid: string;
  recordId: string;
  accessResult: 'GRANTED' | 'DENIED';
  reason: string;
  auditTrail: string[];
}

export interface BlockchainTransaction {
  txHash: string;
  timestamp: string;
  from: string;
  contract: 'DIDRegistry' | 'IssuerRegistry' | 'RecordRegistry' | 'ConsentRegistry' | 'AccessLog';
  action: string;
  payload: Record<string, any>;
  status: 'SUCCESS' | 'REVERTED';
  revertReason?: string;
}

export interface BlockchainBlock {
  index: number;
  timestamp: string;
  transactions: BlockchainTransaction[];
  previousHash: string;
  hash: string;
  nonce: number;
}

export interface VerificationStepResult {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  details?: string;
  dataSnippet?: string;
  latencyMs?: number;
}
