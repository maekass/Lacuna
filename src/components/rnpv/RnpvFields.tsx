import {
  FieldGrid,
  rnpvControlClass,
  StageInput,
} from "@/components/rnpv/RnpvInputs";
import {
  CAPITAL_FIELDS,
  COMMERCIAL_FIELDS,
  MONTE_CARLO_FIELDS,
  STAGE_LABELS,
  stagesFromStart,
} from "@/lib/research/rnpvScenarioForm";
import type {
  NumericFormKey,
  ScenarioFormState,
  StageId,
} from "@/lib/research/rnpvScenarioForm";

interface RnpvFieldsProps {
  form: ScenarioFormState;
  fieldErrors: Readonly<Record<string, string>>;
  showErrors: boolean;
  onPatch: (patch: Partial<ScenarioFormState>) => void;
  onField: (key: NumericFormKey, value: string) => void;
  onStage: (
    id: StageId,
    key: "years" | "probabilityPercent" | "cost",
    value: string,
  ) => void;
  onLoadPreset: () => void;
}

function errorFor(
  showErrors: boolean,
  fieldErrors: Readonly<Record<string, string>>,
  key: string,
): string | undefined {
  return showErrors ? fieldErrors[key] : undefined;
}

export default function RnpvFields(
  { form, fieldErrors, showErrors, onPatch, onField, onStage, onLoadPreset }:
    RnpvFieldsProps,
) {
  const active = stagesFromStart(form.startStage);
  const rationaleError = errorFor(
    showErrors,
    fieldErrors,
    "preclinicalRationale",
  );
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label
          className="flex max-w-xl flex-col gap-1 text-sm text-lacuna-plum"
          htmlFor="startStage"
        >
          <span className="font-medium">Current development stage</span>
          <span className="text-xs font-normal leading-snug text-lacuna-blue">
            The asset is valued at entry into this stage, not halfway through
            it. Earlier stages are left out. Their costs are sunk unless you
            type them into the certain upfront cost.
          </span>
          <select
            id="startStage"
            name="startStage"
            className={rnpvControlClass}
            value={form.startStage}
            onChange={(event) => {
              const value = event.target.value;
              if (
                value === "preclinical" || value === "phase1" ||
                value === "phase2" ||
                value === "phase3" || value === "submission"
              ) {
                onPatch({ startStage: value });
              }
            }}
          >
            <option value="preclinical">Preclinical</option>
            <option value="phase1">Phase I</option>
            <option value="phase2">Phase II</option>
            <option value="phase3">Phase III</option>
            <option value="submission">Regulatory submission</option>
          </select>
        </label>
        <button
          type="button"
          className="touch-target-inline rounded-lg border border-lacuna-plum px-4 py-2 text-sm font-semibold text-lacuna-plum focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lacuna-plum"
          onClick={onLoadPreset}
        >
          Load illustrative preset
        </button>
      </div>
      {form.presetId
        ? (
          <p
            className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
            role="note"
          >
            Illustrative preset loaded. These figures are hypothetical teaching
            inputs. They are not observed company results, published success
            rates, or Lacuna benchmarks.
          </p>
        )
        : (
          <p className="text-sm text-lacuna-blue">
            The form starts blank. Load the illustrative preset, or type your
            own hypothetical assumptions. Nothing here is observed company data.
          </p>
        )}

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold text-lacuna-plum">
          Remaining development
        </legend>
        <p className="text-sm text-lacuna-blue">
          Conditional success is the chance of finishing a stage after entering
          it. Future cost is spread evenly to each year-end of that stage and is
          paid in full once the stage is entered, including paths that later
          fail.
        </p>
        {form.startStage === "preclinical"
          ? (
            <label
              className="flex flex-col gap-1 text-sm text-lacuna-plum"
              htmlFor="preclinicalRationale"
            >
              <span className="font-medium">Preclinical rationale</span>
              <span
                className="text-xs font-normal text-lacuna-blue"
                id="preclinical-rationale-help"
              >
                Required. Record where the preclinical probability, duration,
                and cost came from. Lacuna does not supply a preclinical
                benchmark.
              </span>
              <textarea
                id="preclinicalRationale"
                name="preclinicalRationale"
                className={`${rnpvControlClass} min-h-24 ${
                  rationaleError ? "border-amber-700" : ""
                }`}
                value={form.preclinicalRationale}
                aria-invalid={rationaleError ? true : undefined}
                aria-describedby={rationaleError
                  ? "preclinical-rationale-help preclinical-rationale-error"
                  : "preclinical-rationale-help"}
                onChange={(event) =>
                  onPatch({ preclinicalRationale: event.target.value })}
              />
              {rationaleError
                ? (
                  <span
                    id="preclinical-rationale-error"
                    className="text-xs text-amber-900"
                  >
                    {rationaleError}
                  </span>
                )
                : null}
            </label>
          )
          : (
            <p className="text-sm text-lacuna-blue">
              Preclinical risk and cost are excluded. To model them, choose
              Preclinical and enter your own probability, duration, cost, and
              rationale.
            </p>
          )}
        {active.map((id) => {
          const yearsId = `stage-${id}-years`;
          const probabilityId = `stage-${id}-probability`;
          const costId = `stage-${id}-cost`;
          return (
            <fieldset
              key={id}
              className="rounded-xl border border-lacuna-lavender/40 p-4"
            >
              <legend className="px-1 font-medium text-lacuna-plum">
                {STAGE_LABELS[id]}
              </legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StageInput
                  id={yearsId}
                  label="Duration"
                  unit="years"
                  min={1}
                  max={15}
                  step={1}
                  integer
                  value={form.stages[id].years}
                  error={errorFor(showErrors, fieldErrors, yearsId)}
                  onChange={(value) => onStage(id, "years", value)}
                />
                <StageInput
                  id={probabilityId}
                  label="Conditional success probability"
                  unit="percent"
                  min={0}
                  max={100}
                  step={0.1}
                  value={form.stages[id].probabilityPercent}
                  error={errorFor(showErrors, fieldErrors, probabilityId)}
                  onChange={(value) => onStage(id, "probabilityPercent", value)}
                />
                <StageInput
                  id={costId}
                  label="Future stage cost"
                  unit="USD million"
                  min={0}
                  max={1000000}
                  step={0.1}
                  value={form.stages[id].cost}
                  error={errorFor(showErrors, fieldErrors, costId)}
                  onChange={(value) => onStage(id, "cost", value)}
                />
              </div>
            </fieldset>
          );
        })}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold text-lacuna-plum">
          Discounting and capital
        </legend>
        <FieldGrid
          fields={CAPITAL_FIELDS}
          form={form}
          fieldErrors={fieldErrors}
          showErrors={showErrors}
          onField={onField}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold text-lacuna-plum">
          Commercial forecast
        </legend>
        <FieldGrid
          fields={COMMERCIAL_FIELDS}
          form={form}
          fieldErrors={fieldErrors}
          showErrors={showErrors}
          onField={onField}
        />
      </fieldset>

      <label
        className="flex flex-col gap-1 text-sm text-lacuna-plum"
        htmlFor="assumptionNotes"
      >
        <span className="font-medium">Assumption notes</span>
        <span className="text-xs font-normal text-lacuna-blue">
          Optional source notes for your own assumptions. Included in the JSON
          export.
        </span>
        <textarea
          id="assumptionNotes"
          name="assumptionNotes"
          className={`${rnpvControlClass} min-h-24`}
          value={form.assumptionNotes}
          onChange={(event) => onPatch({ assumptionNotes: event.target.value })}
        />
      </label>

      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold text-lacuna-plum">
          Monte Carlo uncertainty
        </legend>
        <p className="text-sm text-lacuna-blue">
          Each path succeeds or fails stage by stage. Later costs stop after a
          failure. Path results are not multiplied by the success probability
          again. Zero ranges isolate that development risk. Positive ranges are
          independent uniform analyst choices, not estimated confidence
          intervals. Durations, margin, tax, upfront cost, and the sales shape
          stay fixed.
        </p>
        <FieldGrid
          fields={MONTE_CARLO_FIELDS}
          form={form}
          fieldErrors={fieldErrors}
          showErrors={showErrors}
          onField={onField}
        />
      </fieldset>
    </div>
  );
}
