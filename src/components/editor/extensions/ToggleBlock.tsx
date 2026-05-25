import { type ChangeEvent } from "react";
import { Node, mergeAttributes, type NodeViewProps } from "@tiptap/core";
import { EditorContent, NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { ChevronRight } from "lucide-react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    toggleBlock: {
      insertToggleBlock: () => ReturnType;
    };
  }
}

const ToggleBlockView = ({ node, updateAttributes }: NodeViewProps) => {
  const open = (node.attrs.open as boolean | undefined) ?? true;
  const title = (node.attrs.title as string | undefined) || "";

  const handleToggle = () => {
    updateAttributes({ open: !open });
  };

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateAttributes({ title: event.target.value });
  };

  return (
    <NodeViewWrapper className="notion-toggle" data-open={open ? "true" : "false"}>
      <div className="notion-toggle-header" contentEditable={false}>
        <button type="button" className="notion-toggle-button" onClick={handleToggle} title={open ? "Kapat" : "Aç"}>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <input
          value={title}
          onChange={handleTitleChange}
          placeholder="Toggle"
          className="notion-toggle-title"
        />
      </div>
      <NodeViewContent className="notion-toggle-content" />
    </NodeViewWrapper>
  );
};

const ToggleBlock = Node.create({
  name: "toggleBlock",
  group: "block",
  content: "block*",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      title: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-title") || "",
        renderHTML: (attributes) => ({ "data-title": attributes.title }),
      },
      open: {
        default: true,
        parseHTML: (element) => element.getAttribute("data-open") !== "false",
        renderHTML: (attributes) => ({ "data-open": attributes.open ? "true" : "false" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="toggle-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "toggle-block" }),
      ["div", { "data-toggle-fallback-title": "" }, HTMLAttributes["data-title"] || ""],
      ["div", { "data-toggle-content": "" }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleBlockView);
  },

  addCommands() {
    return {
      insertToggleBlock:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { title: "", open: true },
            content: [
              {
                type: "paragraph",
              },
            ],
          }),
    };
  },
});

export default ToggleBlock;
