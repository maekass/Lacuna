/**
 * Sentence-transformer embeddings for the nightly response eval.
 * Imported only from `scripts/` so the Next.js bundle does not include the
 * model runtime.
 */

import { meanPool } from "../../src/lib/ai/evals/similarity";

type Extractor = (
  text: string,
  options: { pooling: "none"; normalize: boolean },
) => Promise<{ tolist: () => number[][][] }>;

let extractorPromise: Promise<Extractor> | null = null;

function extractor(): Promise<Extractor> {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const specifier: string = "@huggingface/transformers";
      const transformers = await import(specifier) as {
        pipeline: (
          task: "feature-extraction",
          model: string,
        ) => Promise<Extractor & { dispose?: () => Promise<void> }>;
      };
      return await transformers.pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2",
      );
    })();
  }
  return extractorPromise;
}

/**
 * Embed one sentence with all-MiniLM-L6-v2 and mean-pool the token vectors.
 * Requires `@huggingface/transformers` and a download of the model on first use.
 */
export async function sentenceTransformerEmbed(
  text: string,
): Promise<number[]> {
  const model = await extractor();
  const output = await model(text, { pooling: "none", normalize: false });
  const sequence = output.tolist()[0] ?? [];
  return meanPool(sequence);
}
