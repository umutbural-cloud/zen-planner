import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Details, DetailsSummary, DetailsContent } from "@tiptap/extension-details";
import { common, createLowlight } from "lowlight";
import { FontSize, LineHeight } from "@/components/editor/richTextExtensions";
import { normalizeSafeLinkUrl } from "@/components/editor/linkSafety";
import { DetailsKeyboardShortcuts } from "@/components/editor/detailsKeyboardShortcuts";
import { SlashCommand } from "@/components/editor/slash/SlashCommand";

const lowlight = createLowlight(common);

type RichEditorExtensionsOptions = {
  placeholder: string;
  linkClassName?: string;
};

export const createRichEditorExtensions = ({ placeholder, linkClassName }: RichEditorExtensionsOptions) => [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    codeBlock: false,
    dropcursor: false,
    gapcursor: false,
    link: false,
  }),
  CodeBlockLowlight.configure({ lowlight }),
  Details.configure({
    persist: true,
    HTMLAttributes: { class: "details-toggle" },
    renderToggleButton: ({ element, isOpen }) => {
      element.className = "details-toggle-button";
      element.dataset.open = isOpen ? "true" : "false";
      element.textContent = ">";
    },
  }),
  DetailsSummary.configure({
    HTMLAttributes: { class: "details-toggle-summary" },
  }),
  DetailsContent.configure({
    HTMLAttributes: { class: "details-toggle-content" },
  }),
  DetailsKeyboardShortcuts,
  SlashCommand,
  FontSize,
  LineHeight,
  Placeholder.configure({ placeholder }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: linkClassName ? { class: linkClassName } : {},
    validate: (href) => normalizeSafeLinkUrl(href) !== null,
  }),
];
