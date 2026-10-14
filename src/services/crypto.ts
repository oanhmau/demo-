/**
 * Web Crypto API implementation for MedPassport:
 * - ECDSA P-256: Identity, DID and Verifiable Credential signing
 * - AES-GCM (256-bit): Symmetric encryption of clinical records
 * - RSA-OAEP (2048-bit): Asymmetric key wrapping for Doctor B
 * - SHA-256: Hash pointer for blockchain blocks, transaction hashes, and IPFS CIDs
 */

// Helper conversions
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBuffer(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
}

/**
 * SHA-256 Digest
 */
export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const encoded = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded as unknown as BufferSource);
  return bufferToHex(hashBuffer);
}

/**
 * Generate simulated IPFS CID format (Content-Addressed) based on SHA-256 hash
 * Format: "Qm" + truncated hex / base58-like representation
 */
export async function generateCid(content: string | Uint8Array): Promise<string> {
  const hash = await sha256Hex(content);
  // IPFS v0 CIDs often start with Qm; for our prototype we format clean unique content hash
  return `Qm${hash.slice(0, 44)}`;
}

/**
 * ECDSA P-256 Key Pair for DID Identity & VC Signing
 */
export async function generateEcdsaKeyPair(): Promise<CryptoKeyPair> {
  return window.crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true, // extractable
    ['sign', 'verify']
  );
}

/**
 * RSA-OAEP Key Pair (2048-bit, SHA-256) for Key Wrapping / Encryption
 */
export async function generateRsaKeyPair(): Promise<CryptoKeyPair> {
  return window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: 'SHA-256',
    },
    true, // extractable
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

/**
 * AES-GCM (256-bit) Key for Medical Record Payload Encryption
 */
export async function generateAesKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt medical record using AES-GCM (12-byte initialization vector)
 */
export async function encryptAesGcm(
  key: CryptoKey,
  plainText: string
): Promise<{ ciphertext: string; iv: string; rawCiphertextHex: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encoded
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
    rawCiphertextHex: bufferToHex(encryptedBuffer),
  };
}

/**
 * Decrypt medical record using AES-GCM
 * Will throw error if ciphertext or tag was tampered with!
 */
export async function decryptAesGcm(
  key: CryptoKey,
  ciphertextBase64: string,
  ivBase64: string
): Promise<string> {
  const ciphertext = base64ToBuffer(ciphertextBase64);
  const iv = base64ToBuffer(ivBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    ciphertext as unknown as BufferSource
  );

  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Wrap AES-GCM key using recipient's RSA-OAEP public key
 */
export async function wrapAesKey(
  aesKey: CryptoKey,
  recipientRsaPublicKey: CryptoKey
): Promise<string> {
  const wrappedBuffer = await window.crypto.subtle.wrapKey(
    'raw',
    aesKey,
    recipientRsaPublicKey,
    {
      name: 'RSA-OAEP',
    }
  );
  return bufferToBase64(wrappedBuffer);
}

/**
 * Unwrap AES-GCM key using recipient's RSA-OAEP private key
 */
export async function unwrapAesKey(
  wrappedKeyBase64: string,
  recipientRsaPrivateKey: CryptoKey
): Promise<CryptoKey> {
  const wrappedBytes = base64ToBuffer(wrappedKeyBase64);

  return window.crypto.subtle.unwrapKey(
    'raw',
    wrappedBytes as unknown as BufferSource,
    recipientRsaPrivateKey,
    {
      name: 'RSA-OAEP',
    },
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Sign data string with ECDSA P-256 private key
 */
export async function signEcdsa(
  privateKey: CryptoKey,
  data: string
): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const signatureBuffer = await window.crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' },
    },
    privateKey,
    encoded
  );
  return bufferToBase64(signatureBuffer);
}

/**
 * Verify ECDSA P-256 signature
 */
export async function verifyEcdsa(
  publicKey: CryptoKey,
  signatureBase64: string,
  data: string
): Promise<boolean> {
  try {
    const signature = base64ToBuffer(signatureBase64);
    const encoded = new TextEncoder().encode(data);

    return await window.crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' },
      },
      publicKey,
      signature as unknown as BufferSource,
      encoded as unknown as BufferSource
    );
  } catch (err) {
    console.error('ECDSA verification error:', err);
    return false;
  }
}

/**
 * Key Export / Import helpers
 */
export async function exportKeyJwk(key: CryptoKey): Promise<JsonWebKey> {
  return window.crypto.subtle.exportKey('jwk', key);
}

export async function importEcdsaPublicKeyJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['verify']
  );
}

export async function importRsaPublicKeyJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'wrapKey']
  );
}

export async function exportKeyRawHex(key: CryptoKey): Promise<string> {
  try {
    const exported = await window.crypto.subtle.exportKey('raw', key);
    return bufferToHex(exported);
  } catch {
    return 'non-exportable';
  }
}
