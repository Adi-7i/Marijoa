from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.modules.deep_research import safe_fetcher
from app.modules.deep_research.chunker import chunk_text
from app.modules.deep_research.citation_builder import build_citation_map
from app.modules.deep_research.content_extractor import extract_content
from app.modules.deep_research.embeddings import EmbeddingsClient
from app.modules.deep_research.evidence_retriever import select_evidence
from app.modules.deep_research.models import DeepResearchSession, ResearchSessionStatus
from app.modules.deep_research.planner import fallback_plan
from app.modules.deep_research.repository import set_session_status
from app.modules.deep_research.source_ranker import rank_sources
from app.modules.deep_research.synthesizer import synthesize_report
from app.modules.web_search.schemas import SearchResult


def test_planner_fallback_creates_valid_plan() -> None:
    plan = fallback_plan("India geography overview")
    assert plan.title.startswith("Research:")
    assert len(plan.objectives) >= 3
    assert len(plan.search_queries) >= 3
    assert len(plan.steps) >= 5


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost/private",
        "http://127.0.0.1/private",
        "http://10.1.2.3/private",
        "http://169.254.169.254/latest/meta-data",
        "file:///etc/passwd",
    ],
)
def test_safe_fetcher_blocks_unsafe_urls(url: str) -> None:
    with pytest.raises(safe_fetcher.UnsafeUrlError):
        safe_fetcher.validate_url(url)


def test_safe_fetcher_allows_public_https_when_dns_is_public(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        safe_fetcher.socket,
        "getaddrinfo",
        lambda *args, **kwargs: [(safe_fetcher.socket.AF_INET, 0, 0, "", ("93.184.216.34", 0))],
    )
    assert safe_fetcher.validate_url("https://example.com/report") == "https://example.com/report"


def test_content_extractor_strips_script_and_style() -> None:
    extracted = extract_content(
        """
        <html><head><title>Example</title><style>.x{}</style><script>alert(1)</script></head>
        <body><article><h1>Heading</h1><p>This is a readable research page with enough useful text.</p>
        <p>It contains factual content for extraction and should not include scripts.</p>
        <p>More body text makes the page pass the low content threshold.</p></article></body></html>
        """,
        min_chars=20,
    )
    assert extracted is not None
    assert extracted.title == "Example"
    assert "alert" not in extracted.text
    assert "readable research page" in extracted.text


def test_chunker_creates_overlapping_chunks() -> None:
    text = " ".join(f"word{i}" for i in range(1000))
    chunks = chunk_text(text, chunk_size_chars=1000, overlap_chars=200, max_chunks=5)
    assert len(chunks) > 1
    assert chunks[0][-120:] in chunks[1]


def test_embeddings_client_can_be_mocked() -> None:
    class FakeEmbeddings:
        def create(self, *, model: str, input: list[str]):  # noqa: A002
            assert model == "fake-model"
            return SimpleNamespace(
                data=[SimpleNamespace(embedding=[float(i)] * 3) for i, _ in enumerate(input, start=1)]
            )

    client = EmbeddingsClient.__new__(EmbeddingsClient)
    client.enabled = True
    client.model = "fake-model"
    client.dimensions = 3
    client.batch_size = 2
    client._client = SimpleNamespace(embeddings=FakeEmbeddings())
    vectors = client.embed_texts(["a", "b", "c"])
    assert len(vectors) == 3
    assert all(len(vector) == 3 for vector in vectors)


def test_source_ranker_deduplicates_urls() -> None:
    results = [
        ("india geography", SearchResult(title="Official", url="https://example.gov/page", snippet="India geography")),
        ("india geography", SearchResult(title="Duplicate", url="https://example.gov/page/", snippet="same")),
        ("india geography", SearchResult(title="Academic", url="https://school.edu/report", snippet="India")),
    ]
    ranked = rank_sources(results, max_sources=5)
    assert len(ranked) == 2
    assert ranked[0].rank == 1


def test_citation_builder_maps_sources_once() -> None:
    source_id = uuid4()
    citation_map = build_citation_map(
        [
            SimpleNamespace(id=source_id, title="Source", url="https://example.com/a", domain="example.com"),
            SimpleNamespace(id=uuid4(), title="Duplicate", url="https://example.com/a/", domain="example.com"),
        ]
    )
    assert citation_map["1"]["source_id"] == str(source_id)
    assert len(citation_map) == 1


def test_evidence_retrieval_uses_keywords_and_citations() -> None:
    source_id = uuid4()
    chunk = SimpleNamespace(
        id=uuid4(),
        source_id=source_id,
        content="India geography includes mountains, plains, rivers, climate zones, and coastline.",
    )
    evidence = select_evidence(
        query="India geography",
        objectives=["mountains and rivers"],
        chunks=[chunk],
        citation_map={"1": {"source_id": str(source_id), "title": "Source", "url": "https://x"}},
    )
    assert evidence[0].citation_index == "1"


def test_synthesizer_prompt_includes_evidence_and_citation_rules(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: list[str] = []

    class FakeProvider:
        def generate_response(self, messages):
            captured.extend(message.content for message in messages)
            return SimpleNamespace(content="# Report\n\nClaim with citation [1].")

    monkeypatch.setattr("app.modules.deep_research.synthesizer.OpenAICompatibleProvider", FakeProvider)
    markdown, _summary = synthesize_report(
        query="India geography",
        title="India Geography",
        objectives=["Explain geography"],
        evidence=[SimpleNamespace(citation_index="1", content="Evidence text")],
        citation_map={"1": {"source_id": "s1", "title": "Source", "url": "https://example.com"}},
    )
    prompt = "\n".join(captured)
    assert "Do not invent citations" in prompt
    assert "Evidence text" in prompt
    assert "[1]" in markdown


def test_session_status_transitions() -> None:
    class FakeDb:
        def flush(self) -> None:
            self.flushed = True

    session = DeepResearchSession(
        user_id=uuid4(),
        workspace_id=uuid4(),
        query="q",
        status=ResearchSessionStatus.PLANNED.value,
    )
    db = FakeDb()
    set_session_status(db, session, ResearchSessionStatus.RUNNING, current_step="searching")
    assert session.status == ResearchSessionStatus.RUNNING.value
    assert session.started_at is not None
    set_session_status(db, session, ResearchSessionStatus.COMPLETED)
    assert session.status == ResearchSessionStatus.COMPLETED.value
    assert session.progress_percent == 100
