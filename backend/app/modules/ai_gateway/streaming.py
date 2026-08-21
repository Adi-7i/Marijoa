import json

EVENT_TOKEN = "token"
EVENT_DONE = "done"
EVENT_ERROR = "error"
EVENT_START = "start"
# Web search SSE events — emitted before token streaming begins.
EVENT_WEB_SEARCH_START = "web_search_start"
EVENT_WEB_SOURCES = "web_sources"


def format_sse_event(event: str, data: dict) -> str:
    return "event: " + event + "\ndata: " + json.dumps(data, ensure_ascii=False) + "\n\n"
