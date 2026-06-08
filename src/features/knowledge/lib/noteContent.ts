import type { JSONContent } from "@tiptap/core";
import type { Json } from "@/integrations/supabase/types";

export const EMPTY_RICH_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };
const LEGACY_TOGGLE_TYPE = `toggle${"Block"}`;

export const isJsonObject = (value: Json): value is { [key: string]: Json | undefined } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const createParagraphNode = (text?: string): JSONContent => ({
  type: "paragraph",
  content: text ? [{ type: "text", text }] : undefined,
});

const createDetailsNode = (title: unknown, open: unknown, content: unknown): JSONContent => {
  const summaryText = typeof title === "string" ? title : "Toggle";
  const normalizedContent = Array.isArray(content)
    ? content.map(normalizeRichNode).filter(Boolean) as JSONContent[]
    : [];

  return {
    type: "details",
    attrs: { open: typeof open === "boolean" ? open : true },
    content: [
      {
        type: "detailsSummary",
        content: summaryText ? [{ type: "text", text: summaryText }] : undefined,
      },
      {
        type: "detailsContent",
        content: normalizedContent.length > 0 ? normalizedContent : [createParagraphNode()],
      },
    ],
  };
};

const normalizeRichNode = (value: unknown): JSONContent | null => {
  if (!isRecord(value)) return createParagraphNode();

  const type = typeof value.type === "string" ? value.type : null;
  if (!type) return createParagraphNode();

  if (type === LEGACY_TOGGLE_TYPE) {
    const attrs = isRecord(value.attrs) ? value.attrs : {};
    return createDetailsNode(attrs.title, attrs.open, value.content);
  }

  if (type === "details") {
    const attrs = isRecord(value.attrs) ? value.attrs : {};
    const rawContent = Array.isArray(value.content) ? value.content : [];
    const summary = rawContent.find((item) => isRecord(item) && item.type === "detailsSummary");
    const detailsContent = rawContent.find((item) => isRecord(item) && item.type === "detailsContent");

    return createDetailsNode(
      isRecord(summary) && Array.isArray(summary.content)
        ? summary.content.filter((item): item is Record<string, unknown> => isRecord(item) && item.type === "text")
          .map((item) => (typeof item.text === "string" ? item.text : ""))
          .join("")
        : "Toggle",
      attrs.open,
      isRecord(detailsContent) ? detailsContent.content : [],
    );
  }

  const nextNode: JSONContent = { type };

  if (isRecord(value.attrs)) {
    nextNode.attrs = value.attrs;
  }

  if (Array.isArray(value.marks)) {
    nextNode.marks = value.marks.filter((mark): mark is Exclude<JSONContent["marks"], undefined>[number] => {
      return isRecord(mark) && typeof mark.type === "string";
    });
  }

  if (typeof value.text === "string") {
    nextNode.text = value.text;
  }

  if (Array.isArray(value.content)) {
    const normalizedChildren = value.content
      .map(normalizeRichNode)
      .filter((child): child is JSONContent => child !== null);

    if (normalizedChildren.length > 0) {
      nextNode.content = normalizedChildren;
    } else if (type === "doc" || type === "detailsContent") {
      nextNode.content = [createParagraphNode()];
    }
  } else if (type === "doc" || type === "detailsContent") {
    nextNode.content = [createParagraphNode()];
  }

  return nextNode;
};

export const richDocFromJson = (value: Json): JSONContent => {
  if (!isJsonObject(value)) return EMPTY_RICH_DOC;
  if (value.type !== "doc") return EMPTY_RICH_DOC;

  const normalizedDoc = normalizeRichNode(value);
  if (!normalizedDoc || normalizedDoc.type !== "doc") return EMPTY_RICH_DOC;

  return normalizedDoc;
};

export const ensureSafeRichDoc = (value: JSONContent | null | undefined): JSONContent => {
  if (!value || typeof value !== "object") return EMPTY_RICH_DOC;

  const normalizedDoc = normalizeRichNode(value);
  if (!normalizedDoc || normalizedDoc.type !== "doc") return EMPTY_RICH_DOC;

  return normalizedDoc;
};

export const quickTextFromJson = (value: Json) => {
  if (!isJsonObject(value)) return "";
  return typeof value.text === "string" ? value.text : "";
};

export const quickDocFromJson = (value: Json): JSONContent | null => {
  if (!isJsonObject(value)) return null;
  const doc = value.doc;
  if (!isJsonObject(doc)) return null;
  return typeof doc.type === "string" ? doc as JSONContent : null;
};
