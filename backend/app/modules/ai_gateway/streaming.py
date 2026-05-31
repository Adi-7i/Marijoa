import json

EVENT_TOKEN = "token"
EVENT_DONE = "done"
EVENT_ERROR = "error"
EVENT_START = "start"


def format_sse_event(event: str, data: dict) -> str:
    return "event: " + event + "\ndata: " + json.dumps(data, ensure_ascii=False) + "\n\n"
