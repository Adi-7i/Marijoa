import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileTypeBadge } from "@/components/files/FileTypeBadge";
import { getExtension } from "@/components/files/FileTypeBadge";

describe("FileTypeBadge", () => {
  it("renders PDF badge", () => {
    render(<FileTypeBadge filename="report.pdf" />);
    expect(screen.getByLabelText(/pdf file/i)).toBeInTheDocument();
  });

  it("renders DOCX badge", () => {
    render(<FileTypeBadge filename="doc.docx" />);
    expect(screen.getByLabelText(/docx file/i)).toBeInTheDocument();
  });

  it("renders CSV badge", () => {
    render(<FileTypeBadge filename="data.csv" />);
    expect(screen.getByLabelText(/csv file/i)).toBeInTheDocument();
  });

  it("renders PNG badge", () => {
    render(<FileTypeBadge filename="image.png" />);
    expect(screen.getByLabelText(/png file/i)).toBeInTheDocument();
  });

  it("renders YAML badge", () => {
    render(<FileTypeBadge filename="config.yaml" />);
    expect(screen.getByLabelText(/yaml file/i)).toBeInTheDocument();
  });

  it("renders FILE badge for unknown extension", () => {
    render(<FileTypeBadge filename="archive.zip" />);
    expect(screen.getByLabelText(/file file/i)).toBeInTheDocument();
  });
});

describe("getExtension", () => {
  it("extracts extension correctly", () => {
    expect(getExtension("report.pdf")).toBe("pdf");
    expect(getExtension("data.CSV")).toBe("csv");
    expect(getExtension("no-ext")).toBe("no-ext");
    expect(getExtension("a.b.c")).toBe("c");
  });
});
