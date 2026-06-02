/**
 * Minimal Server-Sent Events parser.
 *
 * Why we don't use `EventSource`: the backend AI stream endpoint
 * (`POST /chats/{chat_id}/ai/stream`) is a POST with a JSON body and bearer
 * auth — `EventSource` only supports GET and cannot attach headers. We
 * therefore drive the connection with `fetch`/`ReadableStream` and parse the
 * SSE frames ourselves.
 *
 * Frame format (RFC 9110-compatible Server-Sent Events):
 *   event: token
 *   data: {"content":"hello"}
 *   \n           <-- blank line terminates the frame
 *
 * `data:` may appear on multiple lines; consumers can join them with `\n`.
 * Lines starting with `:` are comments and are ignored.
 */

export interface SSEEvent {
  event: string;
  data: string;
  id?: string;
}

interface ParserState {
  buffer: string;
  event: string;
  data: string[];
  id?: string;
}

function createState(): ParserState {
  return { buffer: "", event: "", data: [] };
}

function resetEvent(state: ParserState) {
  state.event = "";
  state.data = [];
  state.id = undefined;
}

function consumeLine(line: string, state: ParserState): SSEEvent | null {
  // Blank line → dispatch the buffered event.
  if (line === "") {
    if (state.data.length === 0 && state.event === "" && !state.id) {
      return null;
    }
    const evt: SSEEvent = {
      event: state.event || "message",
      data: state.data.join("\n"),
      id: state.id,
    };
    resetEvent(state);
    return evt;
  }
  // Comment lines start with ":".
  if (line.startsWith(":")) return null;

  const colon = line.indexOf(":");
  const field = colon === -1 ? line : line.slice(0, colon);
  let value = colon === -1 ? "" : line.slice(colon + 1);
  if (value.startsWith(" ")) value = value.slice(1);

  switch (field) {
    case "event":
      state.event = value;
      break;
    case "data":
      state.data.push(value);
      break;
    case "id":
      state.id = value;
      break;
    case "retry":
      // ignored — only meaningful for EventSource reconnect.
      break;
    default:
      // unknown field — ignored per spec.
      break;
  }
  return null;
}

/**
 * Feed a chunk into the parser and return any complete events. Lines may be
 * split across chunks — partial input is preserved in the internal buffer.
 */
export function createSSEParser() {
  const state = createState();

  function push(chunk: string): SSEEvent[] {
    state.buffer += chunk.replace(/\r\n?/g, "\n");
    const events: SSEEvent[] = [];

    let newlineIdx = state.buffer.indexOf("\n");
    while (newlineIdx !== -1) {
      const line = state.buffer.slice(0, newlineIdx);
      state.buffer = state.buffer.slice(newlineIdx + 1);
      const evt = consumeLine(line, state);
      if (evt) events.push(evt);
      newlineIdx = state.buffer.indexOf("\n");
    }

    return events;
  }

  function flush(): SSEEvent[] {
    const events: SSEEvent[] = [];
    if (state.buffer.length > 0) {
      const evt = consumeLine(state.buffer, state);
      if (evt) events.push(evt);
      state.buffer = "";
    }
    // Dispatch any remaining buffered event.
    const tail = consumeLine("", state);
    if (tail) events.push(tail);
    return events;
  }

  return { push, flush };
}

/**
 * Reads an SSE stream from a `Response` body, decodes chunks, parses events,
 * and invokes `onEvent` for each complete frame. Resolves when the stream
 * closes; rejects if the body cannot be read or `signal` aborts.
 */
export async function readSSEStream(
  response: Response,
  onEvent: (event: SSEEvent) => void,
  options: { signal?: AbortSignal } = {}
): Promise<void> {
  if (!response.body) {
    throw new Error("SSE response has no body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  const parser = createSSEParser();
  const { signal } = options;

  const onAbort = () => {
    reader.cancel().catch(() => {
      // swallow — abort initiated by caller
    });
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      for (const evt of parser.push(text)) onEvent(evt);
    }
    const tail = decoder.decode();
    if (tail) {
      for (const evt of parser.push(tail)) onEvent(evt);
    }
    for (const evt of parser.flush()) onEvent(evt);
  } finally {
    signal?.removeEventListener("abort", onAbort);
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }
}
