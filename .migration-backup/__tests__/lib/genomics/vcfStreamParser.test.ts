import { describe, expect, it } from "vitest";
import { parseVcfDataLine } from "@/lib/genomics/vcfStreamParser";

describe("parseVcfDataLine", () => {
  it("parses a VCF data row with INFO gene (success)", () => {
    const line =
      "17\t43044295\t.\tG\tA\t99.5\tPASS\tGENE=BRCA1;CLNSIG=Pathogenic;CSQ=missense_variant";
    const row = parseVcfDataLine(line);

    expect(row?.chrom).toBe("17");
    expect(row?.pos).toBe(43044295);
    expect(row?.geneSymbol).toBe("BRCA1");
    expect(row?.isPathogenic).toBe(true);
  });

  it("returns null for header lines (edge)", () => {
    expect(parseVcfDataLine("##fileformat=VCFv4.2")).toBeNull();
    expect(parseVcfDataLine("#CHROM\tPOS\tID")).toBeNull();
  });
});
