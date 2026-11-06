import { describe, expect, it } from "vitest";

import {
  createConnectFrameParser,
  frameConnectMessage,
  resetConnectFrameBuffer,
} from "../src/client/bridge.js";

function payload(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

describe("createConnectFrameParser owner buffer", () => {
  it("keeps a partial frame across parsers created for the same bridge", () => {
    const owner = {};
    const frame = frameConnectMessage(payload("second-half-survives"));
    const split = 9; // header (5 bytes) + part of the body
    const first: string[] = [];
    const second: string[] = [];

    // Tool-call pause: the first parser has received only part of the next frame.
    createConnectFrameParser(
      (bytes) => first.push(decode(bytes)),
      () => {},
      { owner },
    )(frame.subarray(0, split));
    expect(first).toEqual([]);

    // Tool-call resume on the same stream builds a new parser; the rest of the frame arrives.
    createConnectFrameParser(
      (bytes) => second.push(decode(bytes)),
      () => {},
      { owner },
    )(frame.subarray(split));

    expect(second).toEqual(["second-half-survives"]);
  });

  it("desyncs without an owner (the upstream bug this guards against)", () => {
    const frame = frameConnectMessage(payload("x".repeat(64)));
    createConnectFrameParser(
      () => {},
      () => {},
    )(frame.subarray(0, 9));
    const fresh = createConnectFrameParser(
      () => {},
      () => {},
    );
    // The tail is read as a frame header with an absurd declared length.
    expect(() => fresh(frame.subarray(9))).toThrow(/Connect message exceeds/);
  });

  it("starts clean after resetConnectFrameBuffer (new Connect stream)", () => {
    const owner = {};
    const stale = frameConnectMessage(payload("stale"));
    createConnectFrameParser(
      () => {},
      () => {},
      { owner },
    )(stale.subarray(0, 7));

    resetConnectFrameBuffer(owner);

    const seen: string[] = [];
    createConnectFrameParser(
      (bytes) => seen.push(decode(bytes)),
      () => {},
      { owner },
    )(frameConnectMessage(payload("fresh")));
    expect(seen).toEqual(["fresh"]);
  });
});
