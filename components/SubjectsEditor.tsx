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
      <div className="grid grid-cols-[1fr_72px_72px] items-end gap-2 px-1">
        <span className="text-xs font-medium text-slate-500">Sujet</span>
        <span className="text-center text-xs font-medium text-slate-500">Nb</span>
        <span className="text-center text-xs font-medium text-slate-500">Heures</span>
      </div>

      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-[1fr_72px_72px] items-center gap-2">
          {row.editable ? (
            <div className="flex items-center gap-1">
              <input
                className="input"
                placeholder={`Sujet ${idx + 1}`}
                value={row.label}
                onChange={(e) => onChange(idx, { label: e.target.value, custom_label: e.target.value })}
              />
              <button
                type="button"
                aria-label="Supprimer"
                onClick={() => onRemoveCustom(idx)}
                className="rounded-md px-2 py-1 text-slate-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          ) : (
            <span className="truncate text-sm text-slate-800">{row.label}</span>
          )}
          <input
            type="number"
            inputMode="numeric"
            min={0}
            className="input text-center"
            value={Number.isFinite(row.intercessions) ? row.intercessions : 0}
            onChange={(e) =>
              onChange(idx, { intercessions: Math.max(0, Number(e.target.value) || 0) })
            }
          />
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.25"
            className="input text-center"
            value={Number.isFinite(row.hours) ? row.hours : 0}
            onChange={(e) =>
              onChange(idx, { hours: Math.max(0, Number(e.target.value) || 0) })
            }
          />
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
