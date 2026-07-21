"use client";

import { useState } from 'react';

type CopyFieldProps = {
  label: string;
  value: string;
};

export function CopyField({ label, value }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3">
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-sm text-slate-800">{value}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="rounded-md bg-ink px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
