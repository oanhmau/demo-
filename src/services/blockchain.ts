import {
  AccessLogEntry,
  BlockchainBlock,
  BlockchainTransaction,
  ConsentRecord,
  DidDocument,
  EncryptedIpfsPayload,
} from '../types';
import { sha256Hex } from './crypto';
import { HOSPITAL_A_INFO, ROGUE_HOSPITAL_INFO, DOCTOR_B_INFO } from './mockData';

export interface SmartContractState {
  didRegistry: Map<string, DidDocument>;
  issuerRegistry: Map<
    string,
    {
      did: string;
      name: string;
      license: string;
      accreditedBy: string;
      isAuthorized: boolean;
      approvedAt: string;
    }
  >;
  recordRegistry: Map<
    string,
    {
      recordId: string;
      patientDid: string;
      issuerDid: string;
      recordHash: string;
      cid: string;
      timestamp: string;
      blockIndex: number;
    }
  >;
  consentRegistry: Map<string, ConsentRecord>;
  accessLogs: AccessLogEntry[];
}

export class BlockchainLedger {
  public chain: BlockchainBlock[] = [];
  public ipfsStorage: Map<string, EncryptedIpfsPayload> = new Map();
  public contracts: SmartContractState;

  constructor() {
    this.contracts = {
      didRegistry: new Map(),
      issuerRegistry: new Map(),
      recordRegistry: new Map(),
      consentRegistry: new Map(),
      accessLogs: [],
    };
    this.initPredefinedRegistries();
  }

  private initPredefinedRegistries() {
    // 1. Preload IssuerRegistry with Hospital A (Accredited)
    this.contracts.issuerRegistry.set(HOSPITAL_A_INFO.did, {
      did: HOSPITAL_A_INFO.did,
      name: HOSPITAL_A_INFO.name,
      license: HOSPITAL_A_INFO.license,
      accreditedBy: HOSPITAL_A_INFO.accreditedBy,
      isAuthorized: true,
      approvedAt: '2025-01-01T00:00:00.000Z',
    });

    // Rogue Hospital explicitly NOT authorized
    this.contracts.issuerRegistry.set(ROGUE_HOSPITAL_INFO.did, {
      did: ROGUE_HOSPITAL_INFO.did,
      name: ROGUE_HOSPITAL_INFO.name,
      license: ROGUE_HOSPITAL_INFO.license,
      accreditedBy: 'KHÔNG CÓ (Chưa thẩm định)',
      isAuthorized: false,
      approvedAt: '',
    });
  }

  public async initGenesisBlock() {
    if (this.chain.length > 0) return;

    const genesisTx: BlockchainTransaction = {
      txHash: '0xgenesis000000000000000000000000000000000000000000000000000000000',
      timestamp: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      from: '0x0000000000000000000000000000000000000000',
      contract: 'IssuerRegistry',
      action: 'DEPLOY_AND_AUTHORIZE_GENESIS_ISSUERS',
      payload: {
        accreditedIssuers: [HOSPITAL_A_INFO.did],
        network: 'MedPassport-Ledger-Mainnet-Simulation',
        consensus: 'Proof of Authority (PoA) Consortium',
      },
      status: 'SUCCESS',
    };

    const previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const hash = await sha256Hex(`0${previousHash}${genesisTx.timestamp}${JSON.stringify([genesisTx])}0`);

    const genesisBlock: BlockchainBlock = {
      index: 0,
      timestamp: genesisTx.timestamp,
      transactions: [genesisTx],
      previousHash,
      hash,
      nonce: 42,
    };

    this.chain.push(genesisBlock);
  }

  /**
   * Mine a new block with a transaction list
   */
  public async addBlock(transactions: BlockchainTransaction[]): Promise<BlockchainBlock> {
    if (this.chain.length === 0) {
      await this.initGenesisBlock();
    }

    const previousBlock = this.chain[this.chain.length - 1];
    const index = previousBlock.index + 1;
    const timestamp = new Date().toISOString();
    const nonce = Math.floor(Math.random() * 90000) + 10000;

    const rawBlockData = `${index}${previousBlock.hash}${timestamp}${JSON.stringify(transactions)}${nonce}`;
    const hash = await sha256Hex(rawBlockData);

    const newBlock: BlockchainBlock = {
      index,
      timestamp,
      transactions,
      previousHash: previousBlock.hash,
      hash,
      nonce,
    };

    this.chain.push(newBlock);
    return newBlock;
  }

  // --- Smart Contract 1: DIDRegistry ---
  public async registerDid(didDoc: DidDocument): Promise<{ tx: BlockchainTransaction; block: BlockchainBlock }> {
    const txHash = '0x' + (await sha256Hex(`DIDRegistry:${didDoc.id}:${Date.now()}`)).slice(0, 64);
    const tx: BlockchainTransaction = {
      txHash,
      timestamp: new Date().toISOString(),
      from: didDoc.id,
      contract: 'DIDRegistry',
      action: 'REGISTER_DID',
      payload: {
        did: didDoc.id,
        name: didDoc.name,
        role: didDoc.role,
        ecdsaKeyType: 'P-256',
        rsaKeyType: didDoc.rsaPublicKeyJwk ? 'RSA-OAEP-2048' : undefined,
      },
      status: 'SUCCESS',
    };

    this.contracts.didRegistry.set(didDoc.id, didDoc);
    const block = await this.addBlock([tx]);
    return { tx, block };
  }

  public getDidDocument(did: string): DidDocument | undefined {
    return this.contracts.didRegistry.get(did);
  }

  // --- Smart Contract 2: IssuerRegistry ---
  public isAuthorizedIssuer(issuerDid: string): boolean {
    const issuer = this.contracts.issuerRegistry.get(issuerDid);
    return !!(issuer && issuer.isAuthorized);
  }

  // --- Smart Contract 3: RecordRegistry ---
  public async anchorRecord(
    issuerDid: string,
    recordId: string,
    patientDid: string,
    recordHash: string,
    cid: string
  ): Promise<{ success: boolean; tx: BlockchainTransaction; block?: BlockchainBlock; error?: string }> {
    const isAuth = this.isAuthorizedIssuer(issuerDid);
    const txHash = '0x' + (await sha256Hex(`RecordRegistry:${recordId}:${Date.now()}`)).slice(0, 64);

    if (!isAuth) {
      // SMART CONTRACT REVERTS!
      const revertTx: BlockchainTransaction = {
        txHash,
        timestamp: new Date().toISOString(),
        from: issuerDid,
        contract: 'RecordRegistry',
        action: 'ANCHOR_HEALTH_RECORD',
        payload: {
          recordId,
          patientDid,
          recordHash,
          cid,
        },
        status: 'REVERTED',
        revertReason: `GIAO DỊCH BỊ REVERT: Cơ sở y tế "${issuerDid}" KHÔNG NẰM TRONG IssuerRegistry được Bộ Y Tế cấp phép!`,
      };

      // In real blockchain, a reverted tx is still recorded on chain with REVERTED status (consuming gas)
      const block = await this.addBlock([revertTx]);
      return {
        success: false,
        tx: revertTx,
        block,
        error: revertTx.revertReason,
      };
    }

    // Success: Anchor to RecordRegistry state
    const nextBlockIndex = this.chain.length;
    this.contracts.recordRegistry.set(recordId, {
      recordId,
      patientDid,
      issuerDid,
      recordHash,
      cid,
      timestamp: new Date().toISOString(),
      blockIndex: nextBlockIndex,
    });

    const successTx: BlockchainTransaction = {
      txHash,
      timestamp: new Date().toISOString(),
      from: issuerDid,
      contract: 'RecordRegistry',
      action: 'ANCHOR_HEALTH_RECORD',
      payload: {
        recordId,
        patientDid,
        recordHash,
        cid,
        anchoredBy: issuerDid,
      },
      status: 'SUCCESS',
    };

    const block = await this.addBlock([successTx]);
    return { success: true, tx: successTx, block };
  }

  public getAnchoredRecord(recordId: string) {
    return this.contracts.recordRegistry.get(recordId);
  }

  // --- Smart Contract 4: ConsentRegistry & AccessLog ---
  public async grantConsent(
    patientDid: string,
    doctorDid: string,
    recordId: string,
    cid: string,
    wrappedKey: string,
    durationMs: number
  ): Promise<{ tx: BlockchainTransaction; consent: ConsentRecord; block: BlockchainBlock }> {
    const now = Date.now();
    const consentId = `CONSENT-${patientDid.slice(-6)}-${Date.now().toString().slice(-5)}`;
    const expiresAt = now + durationMs;

    const consent: ConsentRecord = {
      consentId,
      patientDid,
      doctorDid,
      recordId,
      cid,
      wrappedKey,
      grantedAt: now,
      expiresAt,
      status: 'ACTIVE',
    };

    this.contracts.consentRegistry.set(consentId, consent);

    const txHash = '0x' + (await sha256Hex(`ConsentRegistry:${consentId}`)).slice(0, 64);
    const tx: BlockchainTransaction = {
      txHash,
      timestamp: new Date().toISOString(),
      from: patientDid,
      contract: 'ConsentRegistry',
      action: 'GRANT_CONSENT',
      payload: {
        consentId,
        patientDid,
        doctorDid,
        recordId,
        durationSeconds: Math.round(durationMs / 1000),
        expiresAt: new Date(expiresAt).toISOString(),
      },
      status: 'SUCCESS',
    };

    const block = await this.addBlock([tx]);
    return { tx, consent, block };
  }

  public async revokeConsent(
    patientDid: string,
    consentId: string
  ): Promise<{ success: boolean; tx?: BlockchainTransaction; block?: BlockchainBlock; error?: string }> {
    const consent = this.contracts.consentRegistry.get(consentId);
    if (!consent) {
      return { success: false, error: 'Không tìm thấy bản ghi Consent!' };
    }

    if (consent.patientDid !== patientDid) {
      return { success: false, error: 'Chỉ bệnh nhân sở hữu mới có quyền thu hồi Consent này!' };
    }

    consent.status = 'REVOKED';
    this.contracts.consentRegistry.set(consentId, consent);

    const txHash = '0x' + (await sha256Hex(`ConsentRegistry:REVOKE:${consentId}:${Date.now()}`)).slice(0, 64);
    const tx: BlockchainTransaction = {
      txHash,
      timestamp: new Date().toISOString(),
      from: patientDid,
      contract: 'ConsentRegistry',
      action: 'REVOKE_CONSENT',
      payload: {
        consentId,
        recordId: consent.recordId,
        revokedAt: new Date().toISOString(),
      },
      status: 'SUCCESS',
    };

    const block = await this.addBlock([tx]);
    return { success: true, tx, block };
  }

  public checkConsentStatus(
    patientDid: string,
    doctorDid: string,
    recordId: string
  ): { valid: boolean; reason: string; consent?: ConsentRecord } {
    // Find active consent for this doctor & record
    const consents = Array.from(this.contracts.consentRegistry.values());
    const matched = consents
      .filter(c => c.patientDid === patientDid && c.doctorDid === doctorDid && c.recordId === recordId)
      .sort((a, b) => b.grantedAt - a.grantedAt)[0];

    if (!matched) {
      return { valid: false, reason: 'Chưa có quyền truy cập nào được cấp từ bệnh nhân.' };
    }

    if (matched.status === 'REVOKED') {
      return { valid: false, reason: 'Bệnh nhân đã chủ động thu hồi quyền truy cập (REVOKED).', consent: matched };
    }

    if (Date.now() > matched.expiresAt) {
      matched.status = 'EXPIRED';
      return { valid: false, reason: 'Thời hạn truy cập đã kết thúc (EXPIRED).', consent: matched };
    }

    return { valid: true, reason: 'Quyền truy cập hợp lệ và còn hiệu lực.', consent: matched };
  }

  public async logAccessAttempt(entry: {
    accessorDid: string;
    accessorName: string;
    patientDid: string;
    recordId: string;
    accessResult: 'GRANTED' | 'DENIED';
    reason: string;
    auditTrail: string[];
  }): Promise<{ tx: BlockchainTransaction; block: BlockchainBlock }> {
    const id = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const logEntry: AccessLogEntry = {
      id,
      timestamp: new Date().toISOString(),
      ...entry,
    };

    this.contracts.accessLogs.unshift(logEntry);

    const txHash = '0x' + (await sha256Hex(`AccessLog:${id}`)).slice(0, 64);
    const tx: BlockchainTransaction = {
      txHash,
      timestamp: logEntry.timestamp,
      from: entry.accessorDid,
      contract: 'AccessLog',
      action: 'RECORD_ACCESS_ATTEMPT',
      payload: {
        accessorDid: entry.accessorDid,
        recordId: entry.recordId,
        accessResult: entry.accessResult,
        reason: entry.reason,
      },
      status: 'SUCCESS',
    };

    const block = await this.addBlock([tx]);
    return { tx, block };
  }

  // --- Simulated IPFS Content-Addressed Storage ---
  public putIpfs(payload: EncryptedIpfsPayload): void {
    this.ipfsStorage.set(payload.cid, { ...payload });
  }

  public getIpfs(cid: string): EncryptedIpfsPayload | undefined {
    const item = this.ipfsStorage.get(cid);
    return item ? { ...item } : undefined;
  }

  public tamperIpfsFile(cid: string): { tampered: boolean; message: string } {
    const item = this.ipfsStorage.get(cid);
    if (!item) return { tampered: false, message: 'CID không tồn tại trên IPFS' };

    if (item.tampered && item.originalCiphertext) {
      // Restore
      item.ciphertext = item.originalCiphertext;
      item.tampered = false;
      this.ipfsStorage.set(cid, item);
      return { tampered: false, message: 'Đã hoàn tác và khôi phục nội dung gốc trên IPFS.' };
    } else {
      // Corrupt
      item.originalCiphertext = item.ciphertext;
      // Mutate characters in ciphertext to simulate an attacker altering the encrypted file on the node
      const chars = item.ciphertext.split('');
      for (let i = 10; i < Math.min(25, chars.length); i++) {
        chars[i] = chars[i] === 'A' ? 'B' : 'A';
      }
      item.ciphertext = chars.join('');
      item.tampered = true;
      this.ipfsStorage.set(cid, item);
      return {
        tampered: true,
        message: 'KẺ TẤN CÔNG ĐÃ SỬA ĐỔI DỮ LIỆU TRÊN IPFS! Các byte mã hóa đã bị can thiệp trái phép.',
      };
    }
  }
}
