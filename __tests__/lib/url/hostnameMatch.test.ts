import { describe, expect, it } from "vitest";
import {
  citationHostnameMatches,
  urlHostnameMatches,
} from "@/lib/url/hostnameMatch";

describe("urlHostnameMatches", () => {
  it("accepts the registrable domain and www subdomains", () => {
    expect(urlHostnameMatches("https://sec.gov/Archives/8-k.htm", "sec.gov"))
      .toBe(true);
    expect(
      urlHostnameMatches("https://www.sec.gov/Archives/8-k.htm", "sec.gov"),
    ).toBe(true);
    expect(urlHostnameMatches("https://www.ft.com/content/abc", "ft.com")).toBe(
      true,
    );
  });

  it("rejects substring spoofs in path, query, and attacker hostnames", () => {
    expect(
      urlHostnameMatches("https://evil.example/sec.gov/8-k.htm", "sec.gov"),
    ).toBe(false);
    expect(
      urlHostnameMatches("https://evil.example/?q=sec.gov", "sec.gov"),
    ).toBe(false);
    expect(
      urlHostnameMatches("https://sec.gov.attacker.example/8-k.htm", "sec.gov"),
    ).toBe(false);
    expect(urlHostnameMatches("https://notsec.gov/", "sec.gov")).toBe(false);
    expect(urlHostnameMatches("https://evil.example/ft.com", "ft.com")).toBe(
      false,
    );
  });

  it("rejects non-http schemes and non-URLs", () => {
    expect(urlHostnameMatches("javascript:sec.gov", "sec.gov")).toBe(false);
    expect(urlHostnameMatches("not a url", "sec.gov")).toBe(false);
    expect(urlHostnameMatches("sec.gov", "sec.gov")).toBe(false);
  });
});

describe("citationHostnameMatches", () => {
  it("matches an embedded https citation", () => {
    expect(
      citationHostnameMatches(
        "See https://www.ft.com/content/abc for coverage.",
        "ft.com",
      ),
    ).toBe(true);
  });

  it("does not match host text without a URL", () => {
    expect(citationHostnameMatches("Quoted on ft.com last week", "ft.com"))
      .toBe(false);
  });
});
