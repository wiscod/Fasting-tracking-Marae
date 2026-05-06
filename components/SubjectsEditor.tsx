"use client";

export type SubjectRow = {
  weekly_fast_subject_id: string | null;
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
    <div className="flex flex-col gap-3">
      {rows.map((row, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          {/* Header: number + label */}
          <div className="flex items-start gap-3">
            <span className="min-w-[2rem] text-3xl font-bold leading-none text-brand-600 tabular-nums">
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              {row.editable ? (
                <div className="flex items-start gap-2">
                  <input
                    className="input text-sm font-medium"
                    placeholder={`Sujet ${idx + 1}`}
                    value={row.label}
                    onChange={(e) =>
                      onChange(idx, { label: e.target.value, custom_label: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    aria-label="Supprimer"
                    onClick={() => onRemoveCustom(idx)}
                    className="mt-2 shrink-0 rounded-md px-1 text-slate-400 hover:text-red-600"
                  >
                    ×
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
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Nb intercessions
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                className="input text-center text-lg font-bold tabular-nums"
                value={Number.isFinite(row.intercessions) ? row.intercessions : 0}
                onChange={(e) =>
                  onChange(idx, { intercessions: Math.max(0, Number(e.target.value) || 0) })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Heures
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.25"
                className="input text-center text-lg font-bold tabular-nums"
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
        className="self-start text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        + Autre sujet
      </button>
    </div>
  );
}
