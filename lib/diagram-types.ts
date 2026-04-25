export const DIAGRAM_TYPES = [
  "flowchart",
  "sequence",
  "class",
  "state",
  "er",
  "gantt",
  "mindmap",
  "timeline",
  "pie",
  "journey",
  "gitGraph",
  "quadrantChart",
  "requirement",
  "c4",
  "sankey",
  "block",
  "other",
] as const;

export type DiagramType = (typeof DIAGRAM_TYPES)[number];

export type DiagramToolResult = {
  ok: boolean;
  error?: string;
  mermaid_code: string;
  diagram_type?: DiagramType;
};
