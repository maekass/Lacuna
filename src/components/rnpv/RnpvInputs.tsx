import type {
  AssumptionField,
  NumericFormKey,
  ScenarioFormState,
} from "@/lib/research/rnpvScenarioForm";

const controlClass =
  "w-full rounded-lg border border-lacuna-lavender/70 bg-white px-3 py-2 text-sm text-lacuna-plum focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lacuna-plum";

export function BoundNumberField(
  { field, form, error, onField }: {
    field: AssumptionField;
    form: ScenarioFormState;
    error?: string;
    onField: (key: NumericFormKey, value: string) => void;
  },
) {
  const helpId = `${field.key}-help`;
  const errorId = `${field.key}-error`;
  return (
    <label
      className="flex flex-col gap-1 text-sm text-lacuna-plum"
      htmlFor={field.key}
    >
      <span className="font-medium">{field.label}</span>
      <span
        className="text-xs font-normal leading-snug text-lacuna-blue"
        id={helpId}
      >
        {field.unit}. {field.help}
      </span>
      <input
        id={field.key}
        name={field.key}
        className={`${controlClass} ${error ? "border-amber-700" : ""}`}
        type="number"
        inputMode={field.integer ? "numeric" : "decimal"}
        min={field.min}
        max={field.max}
        step={field.step}
        autoComplete="off"
        value={form[field.key]}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${helpId} ${errorId}` : helpId}
        onChange={(event) => onField(field.key, event.target.value)}
      />
      {error
        ? <span id={errorId} className="text-xs text-amber-900">{error}</span>
        : null}
    </label>
  );
}

export function FieldGrid(
  { fields, form, fieldErrors, showErrors, onField }: {
    fields: readonly AssumptionField[];
    form: ScenarioFormState;
    fieldErrors: Readonly<Record<string, string>>;
    showErrors: boolean;
    onField: (key: NumericFormKey, value: string) => void;
  },
) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <BoundNumberField
          key={field.key}
          field={field}
          form={form}
          error={showErrors ? fieldErrors[field.key] : undefined}
          onField={onField}
        />
      ))}
    </div>
  );
}

export function StageInput(
  { id, label, unit, min, max, step, integer, value, error, onChange }: {
    id: string;
    label: string;
    unit: string;
    min: number;
    max: number;
    step: number;
    integer?: boolean;
    value: string;
    error?: string;
    onChange: (value: string) => void;
  },
) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  return (
    <label
      className="flex flex-col gap-1 text-sm text-lacuna-plum"
      htmlFor={id}
    >
      <span className="font-medium">{label}</span>
      <span className="text-xs font-normal text-lacuna-blue" id={helpId}>
        {unit}
      </span>
      <input
        id={id}
        name={id}
        className={`${controlClass} ${error ? "border-amber-700" : ""}`}
        type="number"
        inputMode={integer ? "numeric" : "decimal"}
        min={min}
        max={max}
        step={step}
        autoComplete="off"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${helpId} ${errorId}` : helpId}
        onChange={(event) => onChange(event.target.value)}
      />
      {error
        ? <span id={errorId} className="text-xs text-amber-900">{error}</span>
        : null}
    </label>
  );
}

export const rnpvControlClass = controlClass;
