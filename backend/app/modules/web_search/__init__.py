"""Global Web Search Access Layer.

Provides controlled, opt-in internet access for the AI gateway via a
self-hosted SearXNG instance. Frontend never talks to SearXNG directly —
every search request, decision, and result normalization happens inside this
module on the backend.
"""
