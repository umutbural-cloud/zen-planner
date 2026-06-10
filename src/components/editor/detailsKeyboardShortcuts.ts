import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection, type EditorState } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

const detailsKeyboardPluginKey = new PluginKey("details-keyboard-shortcuts");

const isInsideCodeBlock = (state: EditorState) => {
  const { $from } = state.selection;

  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === "codeBlock" || node.type.spec.code) {
      return true;
    }
  }

  return false;
};

const findAncestorDepth = (state: EditorState, nodeName: string) => {
  const { $from } = state.selection;

  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    if ($from.node(depth).type.name === nodeName) {
      return depth;
    }
  }

  return null;
};

const scheduleSelection = (view: EditorView, targetPos: number) => {
  const win = view.dom.ownerDocument?.defaultView ?? window;

  const applySelection = () => {
    const { state } = view;

    if (!view.dom.isConnected) {
      return;
    }

    if (targetPos < 0 || targetPos > state.doc.content.size) {
      return;
    }

    try {
      const selection = TextSelection.create(state.doc, targetPos);
      view.dispatch(state.tr.setSelection(selection).scrollIntoView());
    } catch {
      // If the details content changed before we got here, do nothing.
    }
  };

  if (typeof win.requestAnimationFrame === "function") {
    win.requestAnimationFrame(() => {
      win.requestAnimationFrame(applySelection);
    });
    return;
  }

  win.setTimeout(applySelection, 0);
};

export const DetailsKeyboardShortcuts = Extension.create({
  name: "detailsKeyboardShortcuts",
  priority: 1000,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: detailsKeyboardPluginKey,
        props: {
          handleKeyDown: (view, event) => {
            if (event.key !== "Enter") return false;
            if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return false;
            if (!view.editable) return false;

            const { state } = view;
            if (isInsideCodeBlock(state)) return false;

            const summaryDepth = findAncestorDepth(state, "detailsSummary");
            const detailsDepth = findAncestorDepth(state, "details");
            if (summaryDepth === null || detailsDepth === null || summaryDepth <= detailsDepth) return false;

            const { $from } = state.selection;
            const detailsNode = $from.node(detailsDepth);
            const detailsPos = $from.before(detailsDepth);
            const paragraphType = state.schema.nodes.paragraph;
            if (!paragraphType) return false;

            let detailsContentPos: number | null = null;
            let detailsContentNode: typeof detailsNode | null = null;

            detailsNode.forEach((child, offset) => {
              if (detailsContentPos === null && child.type.name === "detailsContent") {
                detailsContentPos = detailsPos + 1 + offset;
                detailsContentNode = child;
              }
            });

            if (detailsContentPos === null || detailsContentNode === null) return false;

            let targetPos: number | null = null;

            if (detailsContentNode.firstChild?.isTextblock) {
              targetPos = detailsContentPos + 2;
            } else {
              detailsContentNode.descendants((node, pos) => {
                if (targetPos !== null) return false;
                if (node.isTextblock) {
                  targetPos = detailsContentPos + 1 + pos + 1;
                  return false;
                }
                return true;
              });
            }

            let tr = state.tr;

            if (detailsNode.attrs.open !== true) {
              tr = tr.setNodeMarkup(detailsPos, undefined, {
                ...detailsNode.attrs,
                open: true,
              });
            }

            if (targetPos === null) {
              const insertPos = detailsContentPos + 1;
              const paragraph = paragraphType.createAndFill();
              if (!paragraph) return false;

              tr = tr.insert(insertPos, paragraph);
              targetPos = insertPos + 1;
            }

            if (targetPos < 0 || targetPos > tr.doc.content.size) return false;

            event.preventDefault();
            event.stopPropagation();

            view.dispatch(tr.scrollIntoView());
            scheduleSelection(view, targetPos);
            return true;
          },
        },
      }),
    ];
  },
});
