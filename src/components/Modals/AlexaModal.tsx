import React, { useState } from 'react';
import { PackingItem } from '../../types';

interface AlexaModalProps {
  isOpen: boolean;
  onClose: () => void;
  packingItems: PackingItem[];
}

export const AlexaModal: React.FC<AlexaModalProps> = ({ isOpen, onClose, packingItems }) => {
  const [completedLines, setCompletedLines] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const ALEXA_LIST_NAME = 'DC Trip';

  const alexaSpokenName = (name: string) => {
    return name
      .replace(/\([^)]*\)/g, '')
      .replace(/\s*[&/+]\s*/g, ' and ')
      .replace(/[^A-Za-z0-9' ,.-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const uncheckedItems = packingItems.filter(i => !i.checked);
  const commands = uncheckedItems.map(
    i => `Alexa, add ${alexaSpokenName(i.name)} to my ${ALEXA_LIST_NAME} list.`
  );

  const toggleLine = (idx: number) => {
    setCompletedLines(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const copyCommands = () => {
    const text = [`Alexa, create a list called ${ALEXA_LIST_NAME}.`, ...commands].join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      prompt('Copy these commands:', text);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-start pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center text-lg">
              <i className="fa-solid fa-microphone"></i>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-sky-600 tracking-wider block">
                Packing List
              </span>
              <h3 className="serif text-base sm:text-lg font-black text-slate-900 leading-snug">
                Send to Alexa
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          <div className="bg-sky-50 p-3.5 rounded-xl border border-sky-200 text-sky-950 leading-relaxed">
            Stand near your Echo and say each line below. Tap a line after Alexa confirms it to keep
            your place. This makes a separate list in your Alexa app; checking items off here won&apos;t
            change it there.
          </div>

          <div>
            <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] mb-2">
              1. Create the list (once)
            </h4>
            <div className="rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 font-bold text-slate-800">
              &quot;Alexa, create a list called <span className="font-mono">{ALEXA_LIST_NAME}</span>.&quot;
            </div>
          </div>

          <div>
            <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] mb-2">
              2. Add what&apos;s left to pack ({commands.length})
            </h4>
            {commands.length === 0 ? (
              <p className="text-slate-500">
                Everything is already checked off. Nothing left to send!
              </p>
            ) : (
              <div className="space-y-1.5">
                {commands.map((cmd, idx) => {
                  const isDone = !!completedLines[idx];
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleLine(idx)}
                      className={`w-full text-left flex items-start gap-2.5 rounded-xl border-2 px-3 py-2.5 font-bold transition cursor-pointer ${
                        isDone
                          ? 'opacity-50 border-emerald-300 bg-emerald-50 text-slate-600'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <span
                        className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center text-[10px] ${
                          isDone
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-300 text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                      <span className={isDone ? 'line-through' : ''}>&quot;{cmd}&quot;</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] mb-2">
              3. While you pack
            </h4>
            <ul className="space-y-1.5 text-slate-700">
              <li>🔊 &quot;Alexa, what&apos;s on my {ALEXA_LIST_NAME} list?&quot;</li>
              <li>✅ &quot;Alexa, remove <em>sunscreen</em> from my {ALEXA_LIST_NAME} list.&quot;</li>
              <li>➕ &quot;Alexa, add <em>umbrella</em> to my {ALEXA_LIST_NAME} list.&quot;</li>
            </ul>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            onClick={copyCommands}
            className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-3 rounded-xl text-center text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <i className="fa-solid fa-check"></i> Copied!
              </>
            ) : (
              <>
                <i className="fa-regular fa-copy"></i> Copy all commands
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
