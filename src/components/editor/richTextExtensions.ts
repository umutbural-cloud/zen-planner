import { Extension, Mark, mergeAttributes, type CommandProps } from "@tiptap/core";

export const FONT_SIZES = ["8", "9", "10", "11", "12", "14", "16", "18", "20", "24", "30", "36"] as const;
export const DEFAULT_FONT_SIZE = "12";

export const LINE_HEIGHTS = [
  { value: "1", label: "Tek" },
  { value: "1.15", label: "1,15" },
  { value: "1.5", label: "1,5" },
  { value: "1.75", label: "1,75" },
  { value: "2", label: "Çift" },
] as const;
export const DEFAULT_LINE_HEIGHT = "1.5";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
    lineHeight: {
      setLineHeight: (lineHeight: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
  }
}

export const FontSize = Mark.create({
  name: "fontSize",

  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (element) => element.style.fontSize?.replace("px", "") || null,
        renderHTML: (attributes) => {
          if (!attributes.size) return {};
          return { style: `font-size: ${attributes.size}px` };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[style*=font-size]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ commands }) =>
          commands.setMark(this.name, { size }),
      unsetFontSize:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});

export const LineHeight = Extension.create({
  name: "lineHeight",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "listItem", "blockquote"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    const targetTypes = ["paragraph", "heading", "listItem", "blockquote"];
    const updateLineHeight = (state: CommandProps["state"], dispatch: CommandProps["dispatch"], lineHeight: string | null) => {
      const { from, to, empty, $from } = state.selection;
      const tr = state.tr;
      let updated = false;

      if (empty) {
        for (let depth = $from.depth; depth > 0; depth -= 1) {
          const node = $from.node(depth);
          if (!targetTypes.includes(node.type.name)) continue;
          tr.setNodeMarkup($from.before(depth), undefined, { ...node.attrs, lineHeight });
          updated = true;
          break;
        }
      } else {
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (!targetTypes.includes(node.type.name)) return;
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, lineHeight });
          updated = true;
        });
      }

      if (updated && dispatch) dispatch(tr);
      return updated;
    };

    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ state, dispatch }) =>
          updateLineHeight(state, dispatch, lineHeight),
      unsetLineHeight:
        () =>
        ({ state, dispatch }) =>
          updateLineHeight(state, dispatch, null),
    };
  },
});
