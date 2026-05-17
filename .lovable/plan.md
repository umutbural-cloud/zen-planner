## Hedef

Bilgi Merkezi'ni proje sisteminden tamamen ayırmak ve şu yapıya kavuşturmak:

```
Bilgi Merkezi
└── Defterler (notebooks)
    ├── Anlık Notlar     (note type: quick)
    └── Zengin Doküman   (note type: rich, Notion-benzeri)
```

Anlık Notlar artık ayrı bir ana modül değil — her defterin içindeki bir not türü.

---

## 1. Veritabanı (yeni şema)

Yeni tablolar (projelerden ayrı, kendi feature'ı):

- `notebooks` — defter
  - `name`, `icon`, `icon_color`, `parent_id` (nested defter), `position`, `deleted_at`
- `notebook_notes` — defter içindeki notlar
  - `notebook_id`, `type` (`quick` | `rich`), `title`, `content` (jsonb — Tiptap doc), `color` (quick için), `pinned`, `parent_note_id` (rich için nested sayfa), `position`, `deleted_at`

`projects.kind = 'knowledge'` artık kullanılmayacak. Mevcut knowledge projeler:
- Migration ile `notebooks`'a kopyalanır (isim/ikon korunur).
- Mevcut `quick_notes` defter yapısına bağlanmadığı için, kullanıcının ilk defteri otomatik oluşturulur ve global quick_notes oraya taşınır (veya kullanıcı isterse boş bırakılır — basitlik için: ilk defterin "Hızlı Notlar" altına taşınır).

`useProjects.createProject` artık sadece `project` kind'ı destekler — `knowledge` parametresi kaldırılır.

---

## 2. Klasör yapısı (feature-based)

```
src/features/knowledge/
  types.ts                       # Notebook, NotebookNote, NoteType
  hooks/
    useNotebooks.ts              # CRUD defterler
    useNotebookNotes.ts          # CRUD notlar (filterable by type)
  components/
    NotebookSidebarTree.tsx      # Sidebar tree
    NotebookView.tsx             # Defter ana sayfası — sekmeli (Anlık | Zengin)
    QuickNotesPanel.tsx          # Keep tarzı kart grid (defter scoped)
    RichNotesPanel.tsx           # Sol: sayfa ağacı, sağ: editor
    RichNoteEditor.tsx           # Tiptap tabanlı blok editör
    editor/
      extensions.ts              # heading, code, table, toggle, slash-command
      SlashMenu.tsx
      ToggleBlock.tsx
  registry/
    noteTypes.tsx                # NoteType registry — yeni tür eklemek için tek nokta
```

Eski `QuickNotesView.tsx` ve `useQuickNotes.tsx` kaldırılır. Eski `quick_notes` tablosu migration ile `notebook_notes` (type='quick') olarak taşınır.

---

## 3. Sidebar değişiklikleri

`AppSidebar.tsx`:
- "知 Bilgi Merkezi" grubu kalır ama artık `KnowledgeItem` (proje tabanlı) yerine `NotebookSidebarTree` kullanır.
- "Yeni Defter" butonu artık `useNotebooks.create()` çağırır — `useProjects` ile karışmaz.
- "付箋 Anlık Notlar" üst-seviye grubu **kaldırılır**.
- `Section` tipi: `quickNotes` çıkar; `notebook` eklenir.
- Defter tıklanınca `setSection("notebook")`, `selectedNotebookId` set edilir.

---

## 4. Notebook görünümü

`NotebookView` defter ID alır, üstte sekmeler: `Anlık Notlar` · `Zengin Doküman`. Sekmeler `noteTypes` registry'sinden gelir — yeni tür eklemek `registry/noteTypes.tsx`'e bir entry eklemekten ibaret.

### Anlık Notlar paneli
- Mevcut Keep tarzı (renk, pin, masonry) deneyimi korunur, defter scope'lu.
- Başlık opsiyonel, hızlı capture, frictionless.

### Zengin Doküman paneli
- Sol kolon: sayfa ağacı (nested, `parent_note_id` üzerinden).
- Sağ kolon: Tiptap editör.
- Özellikler:
  - Heading (H1/H2/H3), paragraph, bullet/numbered list
  - Code block (lowlight), inline code
  - Table (extension-table)
  - Toggle/details block (custom node)
  - Slash menu (`/` ile blok ekleme)
  - Mention (`@`) — şimdilik diğer not sayfalarına link
  - Embed — link önizleme (basit iframe/oEmbed yok; URL → kart)
- Otosave (debounce 600ms), JSON content olarak `content` kolonuna.
- Tipografi: `font-light`, geniş satır aralığı, max-w-[720px], soft spacing — Notion + Craft hissi.

---

## 5. State / mimari kuralları

- Tek source of truth: `useNotebooks` ve `useNotebookNotes` (Supabase + local cache). Component'ler kendi listelerini tutmaz.
- UI / business logic ayrımı: panel component'leri sadece prop alır, hook'lar veriyi yönetir.
- `NoteType` registry pattern → yeni tür eklemek tek dosya değişikliği.
- Component'ler küçük ve composable: `RichNoteEditor`, `SlashMenu`, `PageTreeItem`, `QuickNoteCard` ayrı.

---

## 6. Bağımlılıklar

Tiptap için:
- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-cell`, `@tiptap/extension-table-header`, `@tiptap/extension-code-block-lowlight`, `@tiptap/extension-placeholder`, `@tiptap/extension-mention`, `@tiptap/suggestion`, `lowlight`

---

## 7. Geçiş (migration) adımları

1. SQL migration: `notebooks` + `notebook_notes` tabloları (RLS ile).
2. Veri taşıma:
   - `projects` (kind='knowledge') → `notebooks`
   - `quick_notes` → `notebook_notes` (type='quick'); ilk defter yoksa "Defterim" oluşturulur.
3. `projects.kind` kolonu bırakılır (geriye dönük uyumluluk) ama yeni knowledge yaratma artık projects'e dokunmaz.
4. Eski `QuickNotesView`, `useQuickNotes`, `KnowledgeItem` (sidebar'daki proje varyantı) kaldırılır.

---

## 8. Tasarım dili

Mevcut washi tema korunur. Editör alanı:
- `bg-background`, geniş padding (`px-12 py-16` desktop), max-w-[720px]
- Noto Serif JP başlık, Noto Sans JP body, weight 300
- Distraction-free: toolbar yok, blok aksiyonları hover'da görünür satır tutamacı (⋮⋮)
- Yumuşak focus, border yok, sadece subtle separators

---

## Teknik notlar

- Migration onayı gerekecek.
- Tiptap paketleri eklenecek (~100kb gzipped).
- Tablo şeması RLS'li (`auth.uid() = user_id`).
- Soft delete (`deleted_at`), Çöp Kutusu entegrasyonu sonra.
- Mevcut kullanıcının sandbox'taki "knowledge" proje verisi otomatik notebook'a dönecek.

Plan onaylanırsa migration ile başlayıp sonra kodu yazacağım.
