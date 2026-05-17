import type { JSONContent } from "@tiptap/core";
import type { Json } from "@/integrations/supabase/types";

export const EMPTY_RICH_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

export const isJsonObject = (value: Json): value is { [key: string]: Json | undefined } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const richDocFromJson = (value: Json): JSONContent => {
  if (!isJsonObject(value)) return EMPTY_RICH_DOC;
  return typeof value.type === "string" ? value as JSONContent : EMPTY_RICH_DOC;
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
