import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Blocks,
  FileCode,
  Database,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Hash,
  ExternalLink,
  Flame,
  Key,
  Lock,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const LedgerTab: React.FC = () => {
  const { ledger, blockchainVersion, setInspectData, toggleTamperIpfs } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'blocks' | 'contracts' | 'ipfs'>('blocks');
  const [selectedContract, setSelectedContract] = useState<
    'DIDRegistry' | 'IssuerRegistry' | 'RecordRegistry' | 'ConsentRegistry' | 'AccessLog'
  >('RecordRegistry');

  const blocks = [...ledger.chain].reverse();
  const ipfsFiles = Array.from(ledger.ipfsStorage.values());

  const dids = Array.from(ledger.contracts.didRegistry.values());
  const issuers = Array.from(ledger.contracts.issuerRegistry.values());
  const records = Array.from(ledger.contracts.recordRegistry.values());
  const consents = Array.from(ledger.contracts.consentRegistry.values());
  const accessLogs = ledger.contracts.accessLogs;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl p-6 shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sổ cái Consortium & Lưu trữ IPFS</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full dark:bg-blue-950 bg-blue-100 text-blue-700 dark:text-blue-400 border dark:border-blue-800 border-blue-200 font-mono">
              Proof-of-Authority (PoA)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Chuỗi khối nối bằng hàm băm SHA-256 bất biến &middot; 4 Smart Contracts thực thi tự động &middot; IPFS Content-Addressed
          </p>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex items-center dark:bg-slate-950 bg-slate-100 p-1 rounded-xl border dark:border-slate-800 border-slate-200 text-xs">
          <button
            onClick={() => setActiveSubTab('blocks')}
            className={`px-3.5 py-2 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'blocks'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Blocks className="w-4 h-4" />
            <span>Khối ({ledger.chain.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('contracts')}
            className={`px-3.5 py-2 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'contracts'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>4 Smart Contracts</span>
          </button>

          <button
            onClick={() => setActiveSubTab('ipfs')}
            className={`px-3.5 py-2 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'ipfs'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Kho IPFS ({ipfsFiles.length})</span>
          </button>
        </div>
      </div>

      {/* Sub-tab 1: Blocks Explorer */}
      {activeSubTab === 'blocks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Tổng cộng: <strong className="text-slate-900 dark:text-white">{ledger.chain.length} khối</strong> đã liên kết bằng SHA-256</span>
            <span>Khối mới nhất ở trên cùng</span>
          </div>

          <div className="space-y-4">
            {blocks.map((block) => (
              <div
                key={block.index}
                className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl p-5 shadow-sm dark:shadow-xl space-y-3 relative overflow-hidden transition-colors"
              >
                {/* Block Title Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b dark:border-slate-800 border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                      #{block.index}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {block.index === 0 ? 'Genesis Block (Khối khởi tạo mạng)' : `Khối #${block.index}`}
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded dark:bg-slate-950 bg-slate-100 text-slate-600 dark:text-slate-400 border dark:border-slate-800 border-slate-200">
                          Nonce: {block.nonce}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {new Date(block.timestamp).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setInspectData({
                        title: `Khối #${block.index} (Block Payload)`,
                        subtitle: `Block Hash: ${block.hash}`,
                        content: block,
                      });
                    }}
                    className="text-xs text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                  >
                    Soi chi tiết JSON Khối &rarr;
                  </button>
                </div>

                {/* Cryptographic Link Hashes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono dark:bg-slate-950 bg-slate-50 p-3 rounded-xl border dark:border-slate-800/80 border-slate-200">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase">Block Hash (SHA-256):</span>
                    <span className="text-blue-700 dark:text-cyan-300 font-bold break-all">{block.hash}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase">Previous Hash:</span>
                    <span className="text-slate-600 dark:text-slate-400 break-all">{block.previousHash}</span>
                  </div>
                </div>

                {/* Transactions in Block */}
                <div className="space-y-2 pt-1">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                    <span>Giao dịch trong khối ({block.transactions.length}):</span>
                  </div>

                  <div className="space-y-1.5">
                    {block.transactions.map((tx) => {
                      const isReverted = tx.status === 'REVERTED';
                      return (
                        <div
                          key={tx.txHash}
                          className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                            isReverted
                              ? 'dark:bg-rose-950/30 bg-rose-50 dark:border-rose-800/60 border-rose-300 text-rose-800 dark:text-rose-200'
                              : 'dark:bg-slate-950 bg-slate-50 dark:border-slate-800/80 border-slate-200 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div className="flex items-center gap-2">
                              {isReverted ? (
                                <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              )}
                              <span className="font-mono text-blue-600 dark:text-cyan-400 font-semibold">{tx.contract}</span>
                              <span className="text-slate-400">&bull;</span>
                              <span className="font-bold text-slate-900 dark:text-white">{tx.action}</span>
                            </div>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isReverted
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            <span>Tx: {tx.txHash.slice(0, 26)}...</span>
                            <span>From: {tx.from.slice(0, 24)}...</span>
                          </div>

                          {isReverted && tx.revertReason && (
                            <div className="p-2 rounded dark:bg-rose-950/80 bg-rose-100 border border-rose-300 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-300 font-semibold">
                              ⚠️ {tx.revertReason}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-tab 2: 4 Smart Contracts State Explorer */}
      {activeSubTab === 'contracts' && (
        <div className="space-y-4">
          <div className="flex items-center flex-wrap gap-2 pb-2">
            {[
              { id: 'RecordRegistry', label: '1. RecordRegistry', count: records.length },
              { id: 'IssuerRegistry', label: '2. IssuerRegistry (Bệnh viện)', count: issuers.length },
              { id: 'ConsentRegistry', label: '3. ConsentRegistry', count: consents.length },
              { id: 'AccessLog', label: '4. AccessLog (Audit Trail)', count: accessLogs.length },
              { id: 'DIDRegistry', label: 'DIDRegistry (Danh tính)', count: dids.length },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedContract(c.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  selectedContract === c.id
                    ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                    : 'dark:bg-slate-900 bg-white dark:border-slate-800 border-slate-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {c.label} ({c.count})
              </button>
            ))}
          </div>

          {/* RecordRegistry View */}
          {selectedContract === 'RecordRegistry' && (
            <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl p-5 shadow-sm dark:shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b dark:border-slate-800 border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">RecordRegistry Smart Contract</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Lưu trữ các hash neo bất biến của hồ sơ bệnh án kèm theo IPFS CID tương ứng
                  </p>
                </div>
                <span className="text-xs font-mono text-blue-600 dark:text-cyan-400 dark:bg-slate-950 bg-slate-100 px-2.5 py-1 rounded border dark:border-slate-800 border-slate-200">
                  {records.length} hồ sơ neo
                </span>
              </div>

              {records.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">Chưa có hồ sơ nào được neo.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="dark:bg-slate-950 bg-slate-50 text-slate-500 dark:text-slate-400 border-b dark:border-slate-800 border-slate-200">
                      <tr>
                        <th className="p-3">Record ID</th>
                        <th className="p-3">Bệnh nhân (DID)</th>
                        <th className="p-3">Issuer (Bệnh viện)</th>
                        <th className="p-3">Hash hồ sơ (SHA-256)</th>
                        <th className="p-3">IPFS CID</th>
                        <th className="p-3">Khối #</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800 divide-slate-200 text-slate-700 dark:text-slate-300">
                      {records.map((r) => (
                        <tr key={r.recordId} className="hover:dark:bg-slate-800/40 hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{r.recordId}</td>
                          <td className="p-3 text-blue-600 dark:text-cyan-300 truncate max-w-[150px]">{r.patientDid}</td>
                          <td className="p-3 text-indigo-600 dark:text-indigo-300">{r.issuerDid}</td>
                          <td className="p-3 text-slate-500 dark:text-slate-400 truncate max-w-[150px]" title={r.recordHash}>
                            {r.recordHash.slice(0, 20)}...
                          </td>
                          <td className="p-3 text-emerald-600 dark:text-emerald-400 select-all">{r.cid}</td>
                          <td className="p-3 text-blue-600 dark:text-blue-400">#{r.blockIndex}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* IssuerRegistry View */}
          {selectedContract === 'IssuerRegistry' && (
            <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl p-5 shadow-sm dark:shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b dark:border-slate-800 border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">IssuerRegistry Smart Contract</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Danh sách tổ chức y tế được Bộ Y Tế chứng nhận quyền phát hành hồ sơ bệnh án
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="dark:bg-slate-950 bg-slate-50 text-slate-500 dark:text-slate-400 border-b dark:border-slate-800 border-slate-200 font-mono">
                    <tr>
                      <th className="p-3">Tên cơ sở y tế</th>
                      <th className="p-3">DID Định danh</th>
                      <th className="p-3">Số giấy phép</th>
                      <th className="p-3">Cơ quan thẩm định</th>
                      <th className="p-3">Trạng thái cấp phép</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-800 divide-slate-200 text-slate-700 dark:text-slate-300">
                    {issuers.map((iss) => (
                      <tr key={iss.did} className="hover:dark:bg-slate-800/40 hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">{iss.name}</td>
                        <td className="p-3 font-mono text-blue-600 dark:text-cyan-300">{iss.did}</td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{iss.license}</td>
                        <td className="p-3 text-slate-500 dark:text-slate-400">{iss.accreditedBy}</td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              iss.isAuthorized
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                            }`}
                          >
                            {iss.isAuthorized ? 'APPROVED (ĐÃ CẤP PHÉP)' : 'REJECTED (CHƯA CẤP PHÉP)'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ConsentRegistry View */}
          {selectedContract === 'ConsentRegistry' && (
            <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl p-5 shadow-sm dark:shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b dark:border-slate-800 border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">ConsentRegistry Smart Contract</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Hợp đồng quản lý ủy quyền truy cập dữ liệu y tế do bệnh nhân toàn quyền kiểm soát
                  </p>
                </div>
              </div>

              {consents.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">Chưa có Consent nào được đăng ký.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="dark:bg-slate-950 bg-slate-50 text-slate-500 dark:text-slate-400 border-b dark:border-slate-800 border-slate-200">
                      <tr>
                        <th className="p-3">Consent ID</th>
                        <th className="p-3">Bệnh nhân</th>
                        <th className="p-3">Bác sĩ thụ hưởng</th>
                        <th className="p-3">Mã hồ sơ</th>
                        <th className="p-3">Thời hạn hết hạn</th>
                        <th className="p-3">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800 divide-slate-200 text-slate-700 dark:text-slate-300">
                      {consents.map((c) => {
                        const isExpired = Date.now() > c.expiresAt;
                        const isRevoked = c.status === 'REVOKED';
                        const isActive = !isExpired && !isRevoked;

                        return (
                          <tr key={c.consentId} className="hover:dark:bg-slate-800/40 hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-900 dark:text-white">{c.consentId}</td>
                            <td className="p-3 text-blue-600 dark:text-cyan-300">{c.patientDid.slice(0, 18)}...</td>
                            <td className="p-3 text-emerald-600 dark:text-emerald-300">{c.doctorDid}</td>
                            <td className="p-3">{c.recordId}</td>
                            <td className="p-3 text-slate-500 dark:text-slate-400">{new Date(c.expiresAt).toLocaleTimeString()}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isActive
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                                    : isRevoked
                                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {isActive ? 'ACTIVE' : isRevoked ? 'REVOKED' : 'EXPIRED'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* AccessLog Audit Trail View */}
          {selectedContract === 'AccessLog' && (
            <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl p-5 shadow-sm dark:shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b dark:border-slate-800 border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">AccessLog Smart Contract (Audit Trail)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Nhật ký kiểm toán bất biến ghi nhận mọi yêu cầu truy xuất (cả thành công và bị chặn)
                  </p>
                </div>
                <span className="text-xs font-mono text-blue-600 dark:text-cyan-400 dark:bg-slate-950 bg-slate-100 px-2.5 py-1 rounded border dark:border-slate-800 border-slate-200">
                  {accessLogs.length} lần truy cập
                </span>
              </div>

              {accessLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Chưa có lần truy cập nào. Sang tab <strong>Bác sĩ B</strong> và bấm "Xem & Xác minh" để tạo bản ghi kiểm toán.
                </div>
              ) : (
                <div className="space-y-3">
                  {accessLogs.map((log) => {
                    const isGranted = log.accessResult === 'GRANTED';
                    return (
                      <div
                        key={log.id}
                        className={`p-4 rounded-xl border space-y-2 text-xs ${
                          isGranted
                            ? 'dark:bg-slate-950 bg-emerald-50/40 dark:border-emerald-900/50 border-emerald-300'
                            : 'dark:bg-rose-950/20 bg-rose-50 border-rose-300 dark:border-rose-800/60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center gap-2">
                            {isGranted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                            )}
                            <span className="font-bold text-slate-900 dark:text-white">{log.accessorName}</span>
                            <span className="text-slate-500 font-mono">({log.accessorDid})</span>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border self-start sm:self-auto ${
                              isGranted
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                            }`}
                          >
                            {log.accessResult}
                          </span>
                        </div>

                        <div className="text-slate-700 dark:text-slate-300">
                          <strong>Kết quả:</strong> {log.reason}
                        </div>

                        {log.auditTrail && (
                          <div className="dark:bg-slate-900/80 bg-white p-2 rounded-lg border dark:border-slate-800 border-slate-200 text-[11px] font-mono text-slate-600 dark:text-slate-400 space-y-0.5">
                            {log.auditTrail.map((trail, idx) => (
                              <div key={idx}>&gt; {trail}</div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                          <span>Log ID: {log.id}</span>
                          <span>{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* DIDRegistry View */}
          {selectedContract === 'DIDRegistry' && (
            <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl p-5 shadow-sm dark:shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b dark:border-slate-800 border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">DIDRegistry Smart Contract</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ánh xạ DID (did:demo:...) với các Public Key JWK (ECDSA & RSA)
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="dark:bg-slate-950 bg-slate-50 text-slate-500 dark:text-slate-400 border-b dark:border-slate-800 border-slate-200">
                    <tr>
                      <th className="p-3">DID</th>
                      <th className="p-3">Tên / Chủ thể</th>
                      <th className="p-3">Vai trò</th>
                      <th className="p-3">Loại khóa ECDSA</th>
                      <th className="p-3">Khóa RSA-OAEP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-800 divide-slate-200 text-slate-700 dark:text-slate-300">
                    {dids.map((d) => (
                      <tr key={d.id} className="hover:dark:bg-slate-800/40 hover:bg-slate-50">
                        <td className="p-3 text-blue-600 dark:text-cyan-300 font-bold">{d.id}</td>
                        <td className="p-3 text-slate-900 dark:text-white font-sans">{d.name}</td>
                        <td className="p-3 uppercase text-indigo-600 dark:text-indigo-300">{d.role}</td>
                        <td className="p-3 text-emerald-600 dark:text-emerald-400">P-256 (SHA-256)</td>
                        <td className="p-3 text-slate-500 dark:text-slate-400">
                          {d.rsaPublicKeyJwk ? '2048-bit (SHA-256)' : 'Không sử dụng'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 3: IPFS Storage Explorer */}
      {activeSubTab === 'ipfs' && (
        <div className="space-y-4">
          <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b dark:border-slate-800 border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Kho lưu trữ IPFS mô phỏng (Content-Addressed)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Các tệp được đánh địa chỉ bằng mã băm nội dung CID = SHA-256(ciphertext). Không thể sửa đổi ngầm mà không làm lệch CID!
                </p>
              </div>
              <span className="text-xs font-mono text-blue-600 dark:text-cyan-400 dark:bg-slate-950 bg-slate-100 px-2.5 py-1 rounded border dark:border-slate-800 border-slate-200">
                {ipfsFiles.length} tệp được mã hóa
              </span>
            </div>

            {ipfsFiles.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Chưa có tệp nào trên IPFS. Phát hành bệnh án tại tab <strong>Bệnh viện A</strong> để lưu bản mã lên IPFS.
              </div>
            ) : (
              <div className="space-y-4">
                {ipfsFiles.map((file) => (
                  <div
                    key={file.cid}
                    className={`dark:bg-slate-950 bg-slate-50 p-5 rounded-xl border space-y-3 ${
                      file.tampered
                        ? 'border-rose-600 ring-1 ring-rose-500/40 shadow-md'
                        : 'dark:border-slate-800 border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-mono font-bold text-blue-700 dark:text-cyan-300 select-all">
                          CID: {file.cid}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            file.tampered
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                          }`}
                        >
                          {file.tampered ? '⚠️ ĐÃ BỊ SỬA ĐỔI (TAMPERED)' : 'CHƯA BỊ CAN THIỆP (INTACT)'}
                        </span>

                        <button
                          onClick={() => toggleTamperIpfs(file.cid)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                            file.tampered
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-rose-600 hover:bg-rose-500 text-white'
                          }`}
                        >
                          {file.tampered ? 'Khôi phục file' : '💥 Sửa đổi file'}
                        </button>
                      </div>
                    </div>

                    {/* Ciphertext preview */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        <span>Bản mã Base64 (AES-GCM):</span>
                        <span>IV: {file.iv}</span>
                      </div>
                      <div className="dark:bg-slate-900 bg-white p-2.5 rounded-lg border dark:border-slate-800 border-slate-200 font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all max-h-24 overflow-y-auto">
                        {file.ciphertext}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                      <span>Mã hồ sơ: {file.recordId}</span>
                      <span>Issuer: {file.issuerDid}</span>
                      <span>Ngày tạo: {new Date(file.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
