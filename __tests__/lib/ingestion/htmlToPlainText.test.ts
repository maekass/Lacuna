import { describe, expect, it } from "vitest";
import { htmlToPlainText } from "@/lib/ingestion/htmlToPlainText";

describe("htmlToPlainText", () => {
  it("strips tags and collapses whitespace", () => {
    expect(
      htmlToPlainText(
        "<html><body>The company completed its acquisition of Example Target on June 1.</body></html>",
      ),
    ).toBe(
      "The company completed its acquisition of Example Target on June 1.",
    );
  });

  it("drops script content even when the closer has extra attributes", () => {
    const html = "<p>keep</p><script>alert(1)</script foo><p>after</p>";
    expect(htmlToPlainText(html)).toBe("keep after");
  });

  it("drops script content for tab/newline closers and mixed case tags", () => {
    const html =
      "<P>visible</P><SCRIPT type='text/javascript'>payload</SCRIPT\t\n bar><P>done</P>";
    expect(htmlToPlainText(html)).toBe("visible done");
  });

  it("does not treat </scripting> as a script closer", () => {
    expect(
      htmlToPlainText(
        "<script>secret</scripting>still-secret</script>visible",
      ),
    ).toBe("visible");
  });

  it("drops style blocks including malformed closers", () => {
    expect(
      htmlToPlainText(
        "<style>body{color:red}</style foo >Item 2.01 Completion of Acquisition",
      ),
    ).toBe("Item 2.01 Completion of Acquisition");
  });

  it("ignores HTML comments that end with --> or --!>", () => {
    expect(
      htmlToPlainText("before<!-- hidden -->after<!-- bang --!>end"),
    ).toBe("before after end");
  });

  it("decodes named and numeric entities", () => {
    expect(htmlToPlainText("A&nbsp;&amp;&#160;&#xA0;B")).toBe("A & B");
    expect(htmlToPlainText("&ldquo;quoted&rdquo;")).toBe("“quoted”");
  });

  it("keeps text after a self-closing script tag", () => {
    expect(htmlToPlainText('<script src="x.js" />kept')).toBe("kept");
  });

  it("does not emit markup that sits in quoted attributes", () => {
    expect(
      htmlToPlainText('<div title="a > b">target</div>'),
    ).toBe("target");
  });

  it("keeps comparison operators that are not tags", () => {
    expect(htmlToPlainText("value < $50 million and p < 0.05")).toBe(
      "value < $50 million and p < 0.05",
    );
  });
});
