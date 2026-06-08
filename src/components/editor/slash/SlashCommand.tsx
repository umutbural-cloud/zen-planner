import { Extension, type Editor, type Range } from "@tiptap/core";
import Suggestion, { exitSuggestion, type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import { PluginKey, type EditorState } from "@tiptap/pm/state";

type SlashCommandProps = {
  editor: Editor;
  range: Range;
};

type SlashCommandItem = {
  title: string;
  description: string;
  keywords: string[];
  command: (props: SlashCommandProps) => void;
};

const slashCommandPluginKey = new PluginKey("slash-command");
const detailsSummaryText = "Başlık";

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

const safeDeleteSlashRange = (editor: Editor, range: Range): number | null => {
  const { doc, selection } = editor.state;
  const docEnd = doc.content.size;

  if (range.from < 0 || range.to > docEnd || range.from >= range.to) return null;
  if (selection.from < range.from || selection.from > range.to + 1) return null;

  const rangeText = doc.textBetween(range.from, range.to, "\n", "\n");
  if (!rangeText.startsWith("/")) return null;
  if (rangeText.includes("\n")) return null;
  if (rangeText.length > 80) return null;

  const deleted = editor.chain().focus().deleteRange(range).setTextSelection(range.from).run();
  return deleted ? range.from : null;
};

const findDetailsContentTextPosition = (editor: Editor, from: number) => {
  let textPosition: number | null = null;

  editor.state.doc.nodesBetween(Math.max(0, from), editor.state.doc.content.size, (node, pos) => {
    if (textPosition !== null) return false;

    if (node.type.name === "detailsContent" && node.firstChild?.type.name === "paragraph") {
      textPosition = pos + 2;
      return false;
    }

    return true;
  });

  return textPosition;
};

const insertDetailsBlock = ({ editor }: SlashCommandProps) => {
  const insertFrom = editor.state.selection.from;
  const inserted = editor
    .chain()
    .focus()
    .insertContent({
      type: "details",
      attrs: { open: true },
      content: [
        {
          type: "detailsSummary",
          content: [{ type: "text", text: detailsSummaryText }],
        },
        {
          type: "detailsContent",
          content: [{ type: "paragraph" }],
        },
      ],
    })
    .run();

  if (!inserted) return false;

  const contentTextPosition = findDetailsContentTextPosition(editor, insertFrom);
  if (contentTextPosition !== null) {
    editor.chain().focus().setTextSelection(contentTextPosition).run();
  }

  return true;
};

const slashCommandItems: SlashCommandItem[] = [
  {
    title: "Paragraph",
    description: "Plain text block",
    keywords: ["paragraph", "text", "p", "paragraf"],
    command: ({ editor }) => editor.chain().focus().setParagraph().run(),
  },
  {
    title: "Heading 1",
    description: "Large section heading",
    keywords: ["heading", "h1", "title", "başlık", "baslik"],
    command: ({ editor }) => editor.chain().focus().setNode("heading", { level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    keywords: ["heading", "h2", "subtitle", "başlık", "baslik"],
    command: ({ editor }) => editor.chain().focus().setNode("heading", { level: 2 }).run(),
  },
  {
    title: "Bullet List",
    description: "Unordered list",
    keywords: ["bullet", "list", "ul", "madde", "liste"],
    command: ({ editor }) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Ordered List",
    description: "Numbered list",
    keywords: ["ordered", "numbered", "list", "ol", "numara", "liste"],
    command: ({ editor }) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: "Code Block",
    description: "Preformatted code",
    keywords: ["code", "pre", "kod"],
    command: ({ editor }) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: "Details / Toggle",
    description: "Collapsible section",
    keywords: ["details", "toggle", "collapse", "açılır", "acilir"],
    command: insertDetailsBlock,
  },
  {
    title: "Horizontal Rule",
    description: "Section divider",
    keywords: ["rule", "divider", "hr", "line", "çizgi", "cizgi"],
    command: ({ editor }) => editor.chain().focus().setHorizontalRule().run(),
  },
];

const getSlashCommandItems = (query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return slashCommandItems;

  return slashCommandItems.filter((item) => {
    const searchable = [item.title, item.description, ...item.keywords].join(" ").toLowerCase();
    return searchable.includes(normalizedQuery);
  });
};

const setMenuPosition = (element: HTMLElement, clientRect?: (() => DOMRect | null) | null) => {
  const rect = clientRect?.();
  if (!rect) {
    element.style.display = "none";
    return;
  }

  element.style.display = "flex";
  element.style.visibility = "hidden";

  const menuRect = element.getBoundingClientRect();
  const menuWidth = menuRect.width || element.offsetWidth;
  const menuHeight = menuRect.height || element.offsetHeight;
  const viewportPadding = 8;
  const belowTop = rect.bottom + viewportPadding;
  const aboveTop = rect.top - menuHeight - viewportPadding;
  const hasRoomBelow = belowTop + menuHeight <= window.innerHeight - viewportPadding;
  const preferredTop = hasRoomBelow ? belowTop : aboveTop;
  const clampedTop = Math.max(
    viewportPadding,
    Math.min(preferredTop, window.innerHeight - menuHeight - viewportPadding),
  );
  const clampedLeft = Math.max(
    viewportPadding,
    Math.min(rect.left, window.innerWidth - menuWidth - viewportPadding),
  );

  element.style.left = `${clampedLeft}px`;
  element.style.top = `${clampedTop}px`;
  element.style.visibility = "visible";
};

const renderSlashMenu = (
  element: HTMLElement,
  items: SlashCommandItem[],
  selectedIndex: number,
  onSelect: (item: SlashCommandItem) => void,
) => {
  element.replaceChildren();

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "slash-command-empty";
    empty.textContent = "Sonuç yok";
    element.appendChild(empty);
    return;
  }

  items.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `slash-command-item${index === selectedIndex ? " is-selected" : ""}`;
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onSelect(item);
    });

    const title = document.createElement("span");
    title.className = "slash-command-title";
    title.textContent = item.title;

    const description = document.createElement("span");
    description.className = "slash-command-description";
    description.textContent = item.description;

    button.append(title, description);
    element.appendChild(button);
  });

  element.querySelector(".slash-command-item.is-selected")?.scrollIntoView({ block: "nearest" });
};

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem, SlashCommandItem>({
        editor: this.editor,
        char: "/",
        pluginKey: slashCommandPluginKey,
        allowSpaces: false,
        allowedPrefixes: [" ", "\n"],
        decorationClass: "slash-command-active",
        decorationEmptyClass: "is-empty",
        shouldResetDismissed: ({ transaction }) => transaction.docChanged,
        allow: ({ state }) => {
          const { $from } = state.selection;
          return $from.parent.type.name === "paragraph" && !isInsideCodeBlock(state);
        },
        items: ({ query }) => getSlashCommandItems(query),
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
        render: () => {
          let menu: HTMLDivElement | null = null;
          let currentProps: SuggestionProps<SlashCommandItem, SlashCommandItem> | null = null;
          let selectedIndex = 0;

          const selectItem = (item: SlashCommandItem) => {
            if (!currentProps) return;
            const { editor, range } = currentProps;
            const commandPosition = safeDeleteSlashRange(editor, range);
            if (typeof commandPosition !== "number") {
              exitSuggestion(editor.view, slashCommandPluginKey);
              return;
            }
            exitSuggestion(editor.view, slashCommandPluginKey);
            editor.commands.setTextSelection(commandPosition);
            item.command({ editor, range });
          };

          const updateMenu = (props: SuggestionProps<SlashCommandItem, SlashCommandItem>) => {
            if (!menu) return;

            currentProps = props;
            selectedIndex = Math.min(selectedIndex, Math.max(props.items.length - 1, 0));
            renderSlashMenu(menu, props.items, selectedIndex, selectItem);
            setMenuPosition(menu, props.clientRect);
          };

          return {
            onStart: (props) => {
              menu = document.createElement("div");
              menu.className = "slash-command-menu";
              document.body.appendChild(menu);
              selectedIndex = 0;
              updateMenu(props);
            },
            onUpdate: (props) => {
              selectedIndex = 0;
              updateMenu(props);
            },
            onKeyDown: ({ event }: SuggestionKeyDownProps) => {
              if (!currentProps || !menu) return false;

              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                const { editor, range } = currentProps;
                safeDeleteSlashRange(editor, range);
                exitSuggestion(editor.view, slashCommandPluginKey);
                return true;
              }

              if (event.key === "ArrowDown") {
                event.preventDefault();
                event.stopPropagation();
                if (currentProps.items.length === 0) return true;
                selectedIndex = (selectedIndex + 1) % currentProps.items.length;
                renderSlashMenu(menu, currentProps.items, selectedIndex, selectItem);
                return true;
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                event.stopPropagation();
                if (currentProps.items.length === 0) return true;
                selectedIndex = (selectedIndex + currentProps.items.length - 1) % currentProps.items.length;
                renderSlashMenu(menu, currentProps.items, selectedIndex, selectItem);
                return true;
              }

              if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                if (currentProps.items.length === 0) return true;
                selectItem(currentProps.items[selectedIndex]);
                return true;
              }

              return false;
            },
            onExit: () => {
              menu?.remove();
              menu = null;
              currentProps = null;
              selectedIndex = 0;
            },
          };
        },
      }),
    ];
  },
});
