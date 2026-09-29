import { assembleEndometriosisTherapeuticsGraph } from "./buildGraph";

const assembled = assembleEndometriosisTherapeuticsGraph();
const problems = [
  ...assembled.schemaErrors,
  ...(assembled.report?.errors.map((issue) =>
    `[${issue.code}] ${issue.message}`
  ) ?? []),
];

if (!assembled.graph || problems.length > 0) {
  throw new Error(
    `Endometriosis therapeutics graph failed validation:\n${
      problems.join("\n")
    }`,
  );
}

/** Reviewed endometriosis reference graph. Import fails if validation fails. */
export const endometriosisTherapeuticsGraph = assembled.graph;

export { assembleEndometriosisTherapeuticsGraph } from "./buildGraph";
