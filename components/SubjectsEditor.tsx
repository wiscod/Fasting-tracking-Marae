"use client";

import { X, Plus } from "lucide-react";

export type SubjectRow = {
  weekly_fast_subject_id: string | null;
  croisade_subject_id: string | null;
  custom_label: string | null;
  label: string;
  intercessions: number;
  hours: number;
  editable: boolean;
};

export function SubjectsEditor({
  rows,
  onChange,
  onAddCustom,
  onRemoveCustom,
}: {
  rows: SubjectRow[];
  onChange: (index: number, patch: Partial<SubjectRow>) => void;
  onAddCustom: () => void;
  onRemoveCustom: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {rows.map((row, idx) => (
        <div
          key={idx}
          className="group relative rounded-2xl border border-slate-200/60 bg-white/70 p-5 shadow-sm backdrop-blur-md transition-all hover:shadow-md hover:border-slate-300 animate-fade-in"
        >
          {/* Header: number + label */}
          <div className="flex items-start gap-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-600 shrink-0 shadow-sm border border-brand-100">
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0 pt-1">
              {row.editable ? (
                <div className="flex items-center gap-2">
                  <input
                    className="input py-2 text-sm font-medium"
                    placeholder={`Nouveau sujet ${idx + 1}`}
                    value={row.label}
                    onChange={(e) =>
                      onChange(idx, { label: e.target.value, custom_label: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    aria-label="Supprimer"
                    onClick={() => onRemoveCustom(idx)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <p className="text-[15px] font-semibold leading-snug tracking-tight text-slate-800">
                  {row.label}
                </p>
              )}
            </div>
          </div>

          {/* Inputs: Nb + Heures */}
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 transition-colors group-hover:bg-brand-50/30 group-hover:border-brand-100/50">
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500 text-center">
                Nb importunités
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                className="input text-center text-xl font-bold tabular-nums text-brand-700 bg-white"
                value={Number.isFinite(row.intercessions) ? row.intercessions : 0}
                onChange={(e) =>
                  onChange(idx, { intercessions: Math.max(0, Number(e.target.value) || 0) })
                }
              />
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 transition-colors group-hover:bg-brand-50/30 group-hover:border-brand-100/50">
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500 text-center">
                Minutes
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="1"
                className="input text-center text-xl font-bold tabular-nums text-brand-700 bg-white"
                value={Number.isFinite(row.hours) ? row.hours : 0}
                onChange={(e) =>
                  onChange(idx, { hours: Math.max(0, Number(e.target.value) || 0) })
                }
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={onAddCustom}
        className="flex items-center gap-1.5 self-start rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-100 hover:text-brand-700"
      >
        <Plus className="h-4 w-4" />
        Autre sujet
      </button>
    </div>
  );
}
