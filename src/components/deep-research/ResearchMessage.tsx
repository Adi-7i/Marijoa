"use client";

import { ResearchCanvasCard } from "@/components/deep-research/ResearchCanvasCard";
import { ResearchPlanCard } from "@/components/deep-research/ResearchPlanCard";
import { ResearchProgressCard } from "@/components/deep-research/ResearchProgressCard";
import type { DeepResearchCardState } from "@/types/deep-research";

interface ResearchMessageProps {
  research: DeepResearchCardState;
  onStart: (sessionId: string) => void;
  onCancel: (sessionId: string) => void;
  onExpand: (sessionId: string) => void;
  onExportPdf: (sessionId: string) => void;
}

export function ResearchMessage({
  research,
  onStart,
  onCancel,
  onExpand,
  onExportPdf,
}: ResearchMessageProps) {
  if (research.status === "COMPLETED") {
    return (
      <ResearchCanvasCard
        research={research}
        onExpand={onExpand}
        onExportPdf={onExportPdf}
      />
    );
  }

  if (research.status === "RUNNING") {
    return <ResearchProgressCard research={research} onCancel={onCancel} />;
  }

  if (research.status === "FAILED" || research.status === "CANCELLED") {
    return <ResearchProgressCard research={research} onCancel={onCancel} />;
  }

  return (
    <ResearchPlanCard
      research={research}
      onStart={onStart}
      onCancel={onCancel}
    />
  );
}

