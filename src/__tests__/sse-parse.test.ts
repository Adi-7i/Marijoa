import { describe, it, expect } from "vitest";
import { createSSEParser, readSSEStream } from "@/lib/sse/parse-sse";

describe("createSSEParser", () => {
  it("parses a single complete event", () => {
    const parser = createSSEParser();
    const events = parser.push("event: token\ndata: {\"content\":\"hi\"}\n\n");
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      event: "token",
      data: '{"content":"hi"}',
      id: undefined,
    });
  });

  it("defaults to event 'message' when no event field is sent", () => {
    const parser = createSSEParser();
    const events = parser.push('data: {"x":1}\n\n');
    expect(events[0].event).toBe("message");
    expect(events[0].data).toBe('{"x":1}');
  });

  it("handles events split across multiple chunks", () => {
    const parser = createSSEParser();
    expect(parser.push("event: start\n")).toEqual([]);
    expect(parser.push("data: {\"chat_id\":\"abc\",")).toEqual([]);
    expect(parser.push("\"user_message_id\":\"u1\"}\n\n")).toEqual([
      {
        event: "start",
        data: '{"chat_id":"abc","user_message_id":"u1"}',
        id: undefined,
      },
    ]);
  });

  it("joins multi-line data fields with newlines", () => {
    const parser = createSSEParser();
    const events = parser.push("event: token\ndata: line one\ndata: line two\n\n");
    expect(events[0].data).toBe("line one\nline two");
  });

  it("ignores comment lines starting with ':'", () => {
    const parser = createSSEParser();
    const events = parser.push(": this is a comment\nevent: ping\ndata: ok\n\n");
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("ping");
  });

  it("parses CRLF line endings the same as LF", () => {
    const parser = createSSEParser();
    const events = parser.push("event: token\r\ndata: hi\r\n\r\n");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ event: "token", data: "hi" });
  });

  it("captures the id field", () => {
    const parser = createSSEParser();
    const events = parser.push("id: 7\nevent: token\ndata: yo\n\n");
    expect(events[0].id).toBe("7");
  });

  it("parses several events in one chunk", () => {
    const parser = createSSEParser();
    const events = parser.push(
      "event: start\ndata: {}\n\nevent: token\ndata: a\n\nevent: token\ndata: b\n\nevent: done\ndata: {}\n\n"
    );
    expect(events.map((e) => e.event)).toEqual(["start", "token", "token", "done"]);
  });

  it("trims a single leading space from values per the spec", () => {
    const parser = createSSEParser();
    const events = parser.push("event: token\ndata:  with leading space\n\n");
    // Spec: one leading space is stripped; remainder kept verbatim.
    expect(events[0].data).toBe(" with leading space");
  });
});

describe("readSSEStream", () => {
  function makeResponse(text: string): Response {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(text));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "content-type": "text/event-stream" },
    });
  }

  it("invokes onEvent for every parsed frame", async () => {
    const events: { event: string; data: string }[] = [];
    const response = makeResponse(
      "event: start\ndata: {\"chat_id\":\"c\",\"user_message_id\":\"u\"}\n\n" +
        "event: token\ndata: {\"content\":\"hi\"}\n\n" +
        "event: done\ndata: {\"chat_id\":\"c\",\"message_id\":\"m\"}\n\n"
    );
    await readSSEStream(response, (evt) => {
      events.push({ event: evt.event, data: evt.data });
    });
    expect(events.map((e) => e.event)).toEqual(["start", "token", "done"]);
  });
});
