import { describe, expect, it } from "vitest";
import { DEFAULT_POST_SIGN_IN_PATH, safeNextPath } from "@/lib/auth/safeNextPath";

describe("safeNextPath", () => {
  it("returns the default when the raw value is empty / null", () => {
    expect(safeNextPath(null)).toBe(DEFAULT_POST_SIGN_IN_PATH);
    expect(safeNextPath(undefined)).toBe(DEFAULT_POST_SIGN_IN_PATH);
    expect(safeNextPath("")).toBe(DEFAULT_POST_SIGN_IN_PATH);
  });

  it("returns the default when the raw value is not an internal path", () => {
    expect(safeNextPath("https://evil.example.com")).toBe(DEFAULT_POST_SIGN_IN_PATH);
    expect(safeNextPath("http://evil.example.com")).toBe(DEFAULT_POST_SIGN_IN_PATH);
    expect(safeNextPath("evil.example.com")).toBe(DEFAULT_POST_SIGN_IN_PATH);
    expect(safeNextPath("javascript:alert(1)")).toBe(DEFAULT_POST_SIGN_IN_PATH);
    expect(safeNextPath("mailto:victim@example.com")).toBe(DEFAULT_POST_SIGN_IN_PATH);
  });

  it("blocks protocol-relative open-redirects", () => {
    expect(safeNextPath("//evil.example.com")).toBe(DEFAULT_POST_SIGN_IN_PATH);
    expect(safeNextPath("//evil.example.com/path")).toBe(DEFAULT_POST_SIGN_IN_PATH);
  });

  it("blocks Windows-style backslash open-redirects", () => {
    expect(safeNextPath("/\\evil.example.com")).toBe(DEFAULT_POST_SIGN_IN_PATH);
  });

  it("blocks first-segment colon schemes (defence-in-depth)", () => {
    expect(safeNextPath("/javascript:alert(1)")).toBe(DEFAULT_POST_SIGN_IN_PATH);
    expect(safeNextPath("/vbscript:msgbox(1)")).toBe(DEFAULT_POST_SIGN_IN_PATH);
  });

  it("returns the raw value when it is a safe internal path", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/practice")).toBe("/practice");
    expect(safeNextPath("/review")).toBe("/review");
    expect(safeNextPath("/lesson/a0-1-l1-alfabeto")).toBe("/lesson/a0-1-l1-alfabeto");
    expect(safeNextPath("/assess/a0-a1")).toBe("/assess/a0-a1");
    expect(safeNextPath("/placement")).toBe("/placement");
    expect(safeNextPath("/profile")).toBe("/profile");
    expect(safeNextPath("/settings")).toBe("/settings");
    expect(safeNextPath("/progress")).toBe("/progress");
    expect(safeNextPath("/confidence")).toBe("/confidence");
  });

  it("preserves query strings and fragments on safe internal paths", () => {
    expect(safeNextPath("/practice?unit=a0-1")).toBe("/practice?unit=a0-1");
    expect(safeNextPath("/lesson/a0-1-l1-alfabeto#step-2")).toBe("/lesson/a0-1-l1-alfabeto#step-2");
  });

  it("blocks raw values with a colon anywhere in the first segment", () => {
    expect(safeNextPath("/foo:bar/baz")).toBe(DEFAULT_POST_SIGN_IN_PATH);
    expect(safeNextPath("/foo:")).toBe(DEFAULT_POST_SIGN_IN_PATH);
  });
});