import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import ToggleBlock from "@/components/editor/extensions/ToggleBlock";
import { FontSize, LineHeight } from "@/components/editor/richTextExtensions";
import { normalizeSafeLinkUrl } from "@/components/editor/linkSafety";

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
  }),
  CodeBlockLowlight.configure({ lowlight }),
  ToggleBlock,
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
