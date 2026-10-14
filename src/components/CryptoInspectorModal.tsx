import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Copy, Check, Key } from 'lucide-react';

export const CryptoInspectorModal: React.FC = () => {
  const { inspectData, setInspectData } = useApp();
  const [copied, setCopied] = useState<boolean>(false);

  if (!inspectData) return null;

  const contentString =
    typeof inspectData.content === 'string'
      ? inspectData.content
      : JSON.stringify(inspectData.content, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(contentString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="dark:bg-slate-900 bg-white border dark:border-slate-700/80 border-slate-200 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-5 py-4 border-b dark:border-slate-800 border-slate-200 flex items-center justify-between dark:bg-slate-900/90 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">{inspectData.title}</h3>
              {inspectData.subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{inspectData.subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg dark:bg-slate-800 dark:hover:bg-slate-700 bg-slate-200 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-medium border dark:border-slate-700 border-slate-300 transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-medium">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sao chép</span>
                </>
              )}
            </button>
            <button
              onClick={() => setInspectData(null)}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Box */}
        <div className="p-5 overflow-y-auto flex-1 font-mono text-xs dark:text-cyan-300 text-blue-900 dark:bg-slate-950 bg-slate-900 text-white">
          <pre className="whitespace-pre-wrap break-all leading-relaxed">{contentString}</pre>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t dark:border-slate-800 border-slate-200 dark:bg-slate-900/90 bg-slate-50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Kích thước: {contentString.length} ký tự</span>
          <button
            onClick={() => setInspectData(null)}
            className="px-4 py-1.5 rounded-lg dark:bg-slate-800 dark:hover:bg-slate-700 bg-slate-200 hover:bg-slate-300 text-slate-800 dark:text-white font-medium cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
