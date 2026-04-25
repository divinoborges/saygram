"use client";

import { diagramStore } from "@/lib/diagram-store";
import { DIAGRAM_TYPES, DiagramType, DiagramToolResult } from "@/lib/diagram-types";
import { parseMermaid } from "@/lib/mermaid";

export const SET_DIAGRAM_TOOL = {
  type: "function" as const,
  name: "set_diagram",
  description:
    "Use this when creating a new diagram, switching diagram type, or making a structural change too large to express as a patch. Always pass the full, complete Mermaid code, not a fragment.",
  parameters: {
    type: "object",
    properties: {
      mermaid_code: {
        type: "string",
        description:
          "The full Mermaid source for the new diagram. Pass an empty string to clear the diagram (panic reset).",
      },
      diagram_type: {
        type: "string",
        enum: DIAGRAM_TYPES,
        description: "The Mermaid diagram type for the new code.",
      },
    },
    required: ["mermaid_code", "diagram_type"],
    additionalProperties: false,
  },
};

export const PATCH_DIAGRAM_TOOL = {
  type: "function" as const,
  name: "patch_diagram",
  description:
    "Use this for small, targeted edits to the existing diagram. `find` must be an exact substring of the current Mermaid code and must be unique. If the substring appears more than once or zero times, the patch will fail and you should retry with a more specific `find` or use `set_diagram` instead.",
  parameters: {
    type: "object",
    properties: {
      find: {
        type: "string",
        description:
          "Exact substring of the current Mermaid code to replace. Must occur exactly once.",
      },
      replace: {
        type: "string",
        description: "Text to substitute for the matched `find` substring.",
      },
    },
    required: ["find", "replace"],
    additionalProperties: false,
  },
};

export const DIAGRAM_TOOLS = [SET_DIAGRAM_TOOL, PATCH_DIAGRAM_TOOL];

type SetDiagramArgs = {
  mermaid_code: string;
  diagram_type: DiagramType;
};

type PatchDiagramArgs = {
  find: string;
  replace: string;
};

function countOccurrences(haystack: string, needle: string): number {
  if (needle === "") return 0;
  let count = 0;
  let idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) {
    count++;
    idx += needle.length;
  }
  return count;
}

export async function handleSetDiagram(
  rawArgs: string,
): Promise<DiagramToolResult> {
  const previous = diagramStore.getCurrent();

  let parsed: SetDiagramArgs;
  try {
    parsed = JSON.parse(rawArgs);
  } catch (err) {
    return {
      ok: false,
      error: `Failed to parse tool arguments as JSON: ${(err as Error).message}`,
      mermaid_code: previous,
    };
  }

  const { mermaid_code, diagram_type } = parsed;

  if (typeof mermaid_code !== "string") {
    return {
      ok: false,
      error: "mermaid_code must be a string",
      mermaid_code: previous,
    };
  }

  if (mermaid_code === "") {
    diagramStore.commit("");
    return { ok: true, mermaid_code: "" };
  }

  const validation = await parseMermaid(mermaid_code);
  if (!validation.ok) {
    return {
      ok: false,
      error: validation.error,
      mermaid_code: previous,
    };
  }

  diagramStore.commit(mermaid_code);
  return {
    ok: true,
    mermaid_code,
    diagram_type,
  };
}

export async function handlePatchDiagram(
  rawArgs: string,
): Promise<DiagramToolResult> {
  const previous = diagramStore.getCurrent();

  let parsed: PatchDiagramArgs;
  try {
    parsed = JSON.parse(rawArgs);
  } catch (err) {
    return {
      ok: false,
      error: `Failed to parse tool arguments as JSON: ${(err as Error).message}`,
      mermaid_code: previous,
    };
  }

  const { find, replace } = parsed;

  if (typeof find !== "string" || typeof replace !== "string") {
    return {
      ok: false,
      error: "find and replace must both be strings",
      mermaid_code: previous,
    };
  }

  const count = countOccurrences(previous, find);
  if (count !== 1) {
    return {
      ok: false,
      error: `find substring matched ${count} times, must be exactly 1`,
      mermaid_code: previous,
    };
  }

  const candidate = previous.replace(find, replace);
  const validation = await parseMermaid(candidate);
  if (!validation.ok) {
    return {
      ok: false,
      error: validation.error,
      mermaid_code: previous,
    };
  }

  diagramStore.commit(candidate);
  return {
    ok: true,
    mermaid_code: candidate,
  };
}

export async function dispatchDiagramTool(
  name: string,
  rawArgs: string,
): Promise<DiagramToolResult | null> {
  if (name === "set_diagram") return handleSetDiagram(rawArgs);
  if (name === "patch_diagram") return handlePatchDiagram(rawArgs);
  return null;
}
