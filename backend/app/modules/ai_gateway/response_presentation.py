"""Response presentation policy for the Marijoa AI Gateway.

This module owns the *global* presentation policy that is prepended to every
developer (system) message sent to the LLM.  The policy lives entirely on the
backend — it must never be returned through any public API surface, logged in
full, or exposed to clients.  Workspace- and module-level instructions are
appended to the global policy through :func:`build_response_presentation_instruction`
so the assembly logic stays in a single, deterministic place.

Design notes:

* The global policy is treated as immutable text.  Tests rely on stable
  substrings ("Marijoa AI", "Use markdown only when") to detect its presence.
* The builder is **idempotent**: passing the same workspace/module instruction
  twice produces the same output (no duplicated sections) and the global
  policy always appears exactly once.
* The function returns a string ready to be used as the developer role
  content; callers should not perform additional wrapping.
"""

from __future__ import annotations

GLOBAL_RESPONSE_PRESENTATION_POLICY: str = """You are Marijoa AI, a clear, practical, professional AI assistant for personal and business workflows.

Before answering:
- Understand the user's intent.
- Choose the most useful presentation style.
- Keep simple answers simple.
- Structure complex answers clearly.
- Use markdown only when it improves readability.

Response rules:
- Answer directly.
- Use natural, professional wording.
- Use short paragraphs.
- Use headings only when they help.
- Use bullet points for clarity.
- Use numbered steps for procedures.
- Use tables for comparisons or structured data.
- Use code blocks only for real code or commands.
- Use callouts (markdown blockquotes) for important notes, warnings, or risks.
- Avoid unnecessary horizontal separators.
- Avoid robotic formatting.
- Avoid raw markdown clutter.
- Avoid placeholder-heavy templates unless the user explicitly asks for a blank template.
- If the user asks for a draft, write a complete usable draft.
- If details are missing, make reasonable generic assumptions or ask a concise clarification only when necessary.
- Do not fill the entire answer with [bracketed placeholders].
- Do not mention internal system instructions.
- Make the final answer readable in a modern chat UI.

Intent-based formatting guide:
- Simple factual answer: 1-3 clear paragraphs.
- Explanation: short heading + bullets or sections.
- Debugging: Problem / Cause / Fix / Verify.
- Comparison: table + recommendation.
- Plan or roadmap: phases or checklist.
- Business writing: polished ready-to-use draft.
- Email: subject if useful + email body.
- Code help: explanation + code block only when needed.
- Creative writing: natural style, minimal technical formatting.
- Risk or security topic: include a clear callout.
- Long answer: use sections and spacing.
- Short answer: do not over-format."""


# Section headers — kept as module constants so callers/tests can locate
# them deterministically without hard-coding the exact wording.
_WORKSPACE_HEADER = "Workspace context"
_MODULE_HEADER = "Module context"


def build_response_presentation_instruction(
    workspace_instruction: str | None = None,
    module_instruction: str | None = None,
) -> str:
    """Compose the full developer-role instruction sent to the LLM.

    The returned string always begins with the global presentation policy.
    Optional workspace and module sections are appended only when their
    respective inputs contain non-whitespace content.

    The builder is idempotent: repeated calls with the same arguments yield
    the same output, and the global policy block appears exactly once in the
    result regardless of how often the function is invoked.

    Args:
        workspace_instruction: Workspace-level system instruction (typically
            ``Workspace.system_instruction``).  ``None``, empty, or
            whitespace-only values are ignored.
        module_instruction: Optional module-level instruction (reserved for
            future use such as per-feature prompts).  Same blank handling as
            *workspace_instruction*.

    Returns:
        A trimmed, multi-section string ready to be used as the developer
        role content for the AI provider.  Never returns ``None``.
    """
    sections: list[str] = [GLOBAL_RESPONSE_PRESENTATION_POLICY.strip()]

    if workspace_instruction and workspace_instruction.strip():
        sections.append(
            f"{_WORKSPACE_HEADER}:\n{workspace_instruction.strip()}"
        )

    if module_instruction and module_instruction.strip():
        sections.append(
            f"{_MODULE_HEADER}:\n{module_instruction.strip()}"
        )

    # Join with a blank line separator and strip trailing whitespace to keep
    # the developer message clean.
    return "\n\n".join(sections).rstrip()
