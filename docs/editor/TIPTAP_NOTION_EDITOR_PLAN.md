# V1-D1 Tiptap Notion-like Editor Plan

## 1. Yönetici özeti

Bu doküman, mevcut Tiptap tabanlı editör altyapısını Notion-benzeri blok editöre dönüştürmek için teknik yol haritasını tanımlar.

Kapsam yalnızca analiz ve planlamadır.

- Kod değişikliği yok.
- Paket ekleme yok.
- Supabase migration yok.
- Supabase db push yok.
- Vercel deploy/alias yok.
- Production mutation yok.
- Commit/push yok.

Temel strateji, mevcut Tiptap yapısını koruyarak editör yüzeyini blok tabanlı deneyime evirmek, ancak mevcut JSON içerikleri, tablo şemaları ve node adlarıyla uyumluluğu bozmamaktır. Özellikle `notes.content` ve `notebook_notes.content` alanları dokunulmadan kalacak; mevcut Tiptap JSON formatı geriye dönük uyumlu şekilde korunacaktır.

## 2. Mevcut editör mimarisi

Repo içinde üç ana editör yüzeyi var:

- `RichNoteEditor`: Zengin uzun form not editörü.
- `QuickNoteEditor`: Hızlı not editörü.
- `NotesView`: Supabase-backed ayrı not ekranı.

Mevcut editör çekirdeği Tiptap üzerine kurulu ve paylaşılan toolbar/extension yapıları kullanılıyor:

- `RichTextToolbar`
- `richTextExtensions`
- `@tiptap/starter-kit`
- `@tiptap/extension-link`
- `@tiptap/extension-placeholder`
- `@tiptap/extension-code-block-lowlight`
- `@tiptap/extension-task-list`
- `@tiptap/extension-task-item`

`RichNoteEditor` içinde ayrıca özel `ToggleBlock` node’u tanımlı. Bu node adı korunmalı.

## 3. Hangi modülde hangi editör kullanılıyor?

Gözlenen kullanım haritası:

- `src/features/knowledge/components/RichNotesPanel.tsx` içinde seçili rich not için `RichNoteEditor` kullanılıyor.
- `src/features/knowledge/components/NotebookView.tsx` içinde `RichDocumentEditor` wrapper üzerinden yine `RichNoteEditor` kullanılıyor.
- `src/features/quick-notes/components/QuickNotesPanel.tsx` akışı, dolaylı olarak `QuickNoteEditor` kullanan kart yapılarıyla çalışıyor.
- `src/components/NotesView.tsx` kendi bağımsız Tiptap instance’ını kullanıyor ve `notes` tablosuna yazıyor.

Bu ayrım önemlidir:

- Rich editör, Notion-benzeri blok deneyimin ana hedef yüzeyidir.
- Quick editör, hızlı yakalama alanı olarak dar kapsamda kalmalıdır.
- NotesView, ayrı risk yüzeyi olarak ayrıca ele alınmalıdır.

## 4. Mevcut veri formatları

### `notes`

`notes` tablosu eski düz metin odaklı yapıdan geliyor:

- `content` tipi `TEXT`.
- `title` sonradan eklenmiş.
- `deleted_at` soft delete için var.
- Bu tabloya Notion-like blok migration önerilmiyor.

### `notebook_notes`

`notebook_notes` tablosu bugün ana zengin içerik deposu:

- `type`: `quick` veya `rich`
- `title`: string
- `content`: `jsonb`
- `color`, `pinned`, `parent_note_id`, `position`

Mevcut kullanımda:

- Quick notlar için `content` çoğunlukla `{ text: "" }` benzeri küçük JSON yapısı.
- Rich notlar için `content` Tiptap doc JSON.

### Tiptap JSON

Mevcut Tiptap JSON bozulmayacak. Bu nedenle:

- Mevcut doc şeması korunmalı.
- Eski içeriklerin parse edilememesi halinde güvenli fallback uygulanmalı.
- Node adları ve attribute isimleri geriye dönük uyumlu tutulmalı.

## 5. Mevcut metinleri koruma stratejisi

Bu planın ana güvenlik şartı mevcut içeriklerin bozulmamasıdır.

Uygulanacak strateji:

- Eski içeriklere migration yapılmayacak.
- `notes.content` değiştirilmeyecek.
- `notebook_notes.content` değiştirilmeyecek.
- Eski Tiptap JSON şemasını kıracak bir node rename yapılmayacak.
- `ToggleBlock` node adı korunacak.
- `FontSize` ve `LineHeight` extension adları korunacak.
- Parse/serialize tarafında yalnızca geriye dönük uyumluluk eklenebilir, veri taşıma yapılmaz.

Riskli alanlar:

- Var olan doc JSON içinde eksik/bozuk node’lar olabilir.
- Link, code block veya task list node’larının mevcut render davranışı yeni blok UX ile çakışabilir.
- `content` alanları için mevcut boş/invalid JSON fallback’leri değişirse eski notlar etkilenebilir.

## 6. RichNoteEditor hedef mimarisi

RichNoteEditor, Notion-like deneyimin ana taşıyıcısı olacak.

Hedef mimari bileşenleri:

- Tiptap editor core.
- Slash command trigger ve komut palette’i.
- Bubble menu.
- Block node’lar için özel render katmanı.
- Toolbars’ın blok odaklı sadeleştirilmesi.
- Outline ile belge gezintisi.
- Template insertion akışı.

Beklenen evrim:

- Mevcut toolbar yalnızca format araçları sunmaktan çıkıp blok yerleştirme giriş noktası haline gelecek.
- Callout, toggle block, table ve template eylemleri blok komutları olarak eklenmeli.
- Heading, code block ve link mevcut yapıyla uyumlu kalmalı.

Teknik sınırlar:

- Tiptap korunacak.
- Node isimleri değişmeyecek.
- Mevcut content JSON taşınmayacak.

## 7. QuickNoteEditor sınırları

QuickNoteEditor’in amacı hızlı yakalama olmaya devam etmeli.

Dar kapsam sınırları:

- Uzun form blok editörü olmamalı.
- Slash command, callout, table veya outline buraya taşınmamalı.
- Mobilden hızlı giriş için hafif kalmalı.
- Font size ve line height desteği korunabilir ama genişletme ana hedef değil.

Bu bileşen için öneri:

- Sadece kısa paragraf/giriş odaklı kalsın.
- Gerekirse minimal toolbar ile sınırlansın.
- Blok tabanlı Notion deneyimi ana olarak RichNoteEditor’de yaşansın.

## 8. NotesView ayrı risk değerlendirmesi

NotesView ayrı bir risk yüzeyidir çünkü:

- Doğrudan `notes` tablosuna yazar.
- `content` alanı `TEXT`.
- Tiptap instance’ı bağımsızdır.

Riskler:

- `notes.content` JSON dönüşümü plan dışında yapılırsa veri uyumsuzluğu oluşur.
- Mevcut düz metin notlar yanlışlıkla blok modele zorlanırsa eski notlar kaybolmuş gibi görünebilir.
- Admin panel veya operational RPC’ler kullanıcı içeriklerine erişmemeli; bu sınır korunmalı.

Sonuç:

- NotesView için sadece gözlem ve risk notu tutulmalı.
- Bu aşamada şema veya veri taşıma önerilmemeli.

## 9. Slash command planı

Hedef:

- `/` ile blok komut paleti açmak.

Plan:

- Tiptap input rule veya key handler ile slash tetikleme tasarlanmalı.
- Komut paleti blok ekleme odaklı olmalı.
- Komutlar arama desteklemeli.
- Enter ile seçimi çalıştırmalı, Esc ile kapatmalı.

Komut grupları:

- Text blocks: paragraph, heading, quote, code block
- Interactive blocks: callout, toggle block, task list, table
- Utility blocks: divider benzeri eğer sonradan gerekirse
- Template blocks: basic templates

Uygulama notu:

- Slash palette, mevcut content JSON’u dönüştürmemeli.
- Sadece yeni blok ekleme ve mevcut blok tipini değiştirme işlemleri yapmalı.

## 10. Bubble menu planı

Hedef:

- Seçili metin üzerinde hızlı inline biçimlendirme ve bağlantı işlemleri.

Plan:

- Selection-based bubble menu.
- Bold, italic, strike, link, code mark.
- Başlık dönüşümü için sınırlı eylemler.
- Font size ve line height durum göstergeleri ile uyumlu davranış.

İlkeler:

- Desktop’ta görünmeli, mobilde sadeleşmeli veya kapatılmalı.
- Toolbar ile çakışmamalı.
- Callout veya table gibi block actions bubble içine sıkıştırılmamalı.

## 11. Callout node planı

Hedef:

- Notion-benzeri callout blokları.

Plan:

- Tiptap custom block node.
- Icon, background ve tone attribute’ları.
- İçerik olarak paragraph/content children.
- Varsayılan focus davranışı desteklenmeli.

Uyumluluk:

- Eski JSON’u bozmayacak şekilde yeni node olarak eklenmeli.
- Mevcut doc’larda bulunmayan callout, güvenli şekilde render dışı kalmalı.

Karar noktaları:

- Icon seti inline mı yoksa attribute mu olacak?
- Renk sistemi theme token mı yoksa fixed palette mi olacak?
- Copy/paste sırasında callout HTML’ye nasıl serialize edilecek?

## 12. ToggleBlock iyileştirme planı

Kısıt:

- `ToggleBlock` node name değişmeyecek.

Mevcut durum:

- `RichNoteEditor` içinde özel `toggleBlock` node’u var.
- `title` ve `open` attribute’ları taşıyor.
- İçerik olarak nested block’lar destekleniyor.

İyileştirme alanları:

- Keyboard interaction.
- Cursor davranışı.
- Nested content indentation.
- Collapse state persistence.
- Better handle for paste and backspace around the node.

Plan:

- Node adı aynı kalacak.
- Şema ve attribute uyumluluğu korunacak.
- UI etkileşimi Notion benzeri hale getirilecek.

## 13. Task list entegrasyon planı

Hedef:

- Task list bloklarını ana blok deneyimin bir parçası yapmak.

Mevcut durum:

- `StarterKit` + `TaskList` + `TaskItem` bazı yüzeylerde kullanılıyor.
- `RichTextToolbar` içinde task list butonu var.

Plan:

- Slash palette’e task list komutu eklenecek.
- Toolbar üzerinden erişim korunacak.
- Nested task davranışı test edilecek.
- Checkbox keyboard navigation kontrol edilecek.

Risk:

- Rich ve quick editor arasında task list desteği farklıysa kullanıcı deneyimi bölünebilir.

## 14. Table entegrasyon planı

Hedef:

- Notion benzeri tablo blokları.

Plan:

- Table node family entegrasyonu.
- Row/cell/header davranışlarının toolbar veya slash menu’den oluşturulması.
- Table içinde paste, tab navigation ve selection davranışlarının tanımlanması.

Mevcut kısıt:

- Eski içerikler değişmeyecek.
- Table var olmayan dokümanlarda yeni blok olarak eklenmeli.

Karar noktaları:

- Minimum tablo feature seti ne olacak?
- Header row zorunlu mu?
- Mobile’da horizontal scroll nasıl yönetilecek?

## 15. Heading/code/link planı

Hedef:

- Heading, code block ve link davranışlarını yeni blok mimaride güvenli şekilde korumak.

Plan:

- Heading seviyeleri sınırlandırılabilir ve context-aware hale getirilebilir.
- Code block için syntax highlight ve clipboard davranışları korunmalı.
- Link güvenliği güçlendirilmeli.

Link güvenliği:

- `http`, `https`, `mailto` dışı protokoller engellenmeli.
- Control character içeren URL’ler reddedilmeli.
- Paste edilen linkler sanitize edilmeli.

Bu bölümde öncelik:

- Geriye dönük içerik bozmamak.
- Güvenli parse/validate davranışını korumak.

## 16. FontSize/LineHeight koruma planı

Kısıt:

- `FontSize` extension name değişmeyecek.
- `LineHeight` extension name değişmeyecek.

Mevcut durum:

- Font size bir mark olarak uygulanıyor.
- Line height paragraph/heading/listItem/blockquote attribute’larına global attribute olarak ekleniyor.

Plan:

- Mevcut isimler korunacak.
- Toolbar ve bubble menu bu attribute’ları okuyup yazmaya devam edecek.
- Yeni bloklar için line height inheritance kuralları tanımlanacak.

Risk:

- Table cell, callout, toggle gibi yeni node’larda line height davranışı ayrıca ele alınmalı.

## 17. Basic templates planı

Hedef:

- Hızlı belge başlatmak için temel blok şablonları.

Önerilen şablonlar:

- Boş sayfa.
- Toplantı notu.
- Yapılacaklar listesi.
- Araştırma notu.
- Proje özeti.

Plan:

- Template insertion slash command veya starter modal ile tetiklenebilir.
- Şablonlar yalnızca yeni doküman başlangıcında uygulanmalı.
- Mevcut içerikler üzerinde otomatik rewrite yapılmamalı.

## 18. Document outline planı

Hedef:

- Uzun belgelerde heading bazlı outline oluşturmak.

Plan:

- Heading node’lardan outline çıkarma.
- Sol panel veya floating panel içinde gösterme.
- Tıklayınca ilgili heading’e scroll.

Kullanım amacı:

- Uzun Notion-like belgelerde gezinmeyi kolaylaştırmak.
- Mobile’da collapse edilebilir hale getirmek.

Teknik not:

- Outline yalnızca presentational katman olmalı; content source of truth değil.

## 19. Mobil kullanım planı

Hedef:

- Küçük ekranda blok editörün kullanılabilir kalması.

Plan:

- Sticky toolbar’ı küçült.
- Bubble menu’yu sadeleştir.
- Slash command erişimini klavye ve UI ile aç.
- Table ve callout için yatay taşma/scroll stratejisi belirle.
- Touch target’ları büyüt.

Risk:

- Çok yoğun toolbar mobilde kullanılmaz hale gelebilir.

## 20. Autosave/debounce güvenliği

Mevcut kodda debounce ile kayıt mantığı var. Bu plan aşamasında hedef:

- Veri kaybını önlemek.
- Render/update döngülerinde gereksiz content reset’i engellemek.

Plan:

- Editor content sync ve autosave ayrıştırılmalı.
- `onUpdate` ile `setContent` döngüsü dikkatle ayrılmalı.
- Debounce süreleri yüzeye göre ayrı değerlendirilmeli.
- Rapid block insertion sırasında sıralı güncellemeler korunmalı.

Özellikle:

- RichNoteEditor ve NotesView tarafında update race condition’ı incelenmeli.

## 21. Link/paste güvenliği

Hedef:

- Zararlı içerik veya beklenmeyen HTML girişi riskini azaltmak.

Plan:

- Link sanitizer korunmalı ve daha sıkı hale getirilmeli.
- Paste işlemleri için HTML whitelist yaklaşımı değerlendirilmeli.
- Unsafe protocol’ler reddedilmeli.
- Control character ve encoded payload’lar kontrol edilmeli.

Ek not:

- Bu aşamada mevcut güvenlik yaklaşımı korunmalı; davranış genişletme sadece dokümantasyon seviyesinde tanımlanmalı.

## 22. Test planı

Test kapsamı şu katmanlara ayrılmalı:

- Unit tests
- Component tests
- Editor integration tests
- Persistence regression tests
- Accessibility smoke tests

Öncelikli senaryolar:

- Eski Tiptap JSON yüklenince doküman bozulmamalı.
- Toggle block aç/kapa durumu korunmalı.
- Font size ve line height attribute’ları editörde kaybolmamalı.
- Slash command blok eklemeli.
- Bubble menu selection ile görünmeli.
- Task list, heading, code block ve link birlikte çalışmalı.
- QuickNoteEditor dar kapsamlı kalmalı.
- NotesView mevcut text content ile güvenli açılmalı.

Test verisi:

- Mevcut içeriklere dokunulmadan snapshot tabanlı fixture’lar kullanılmalı.

## 23. Production smoke planı

Bu aşama kod değişikliği yapmadığı için production smoke planı sadece hazırlık düzeyindedir.

Kontrol başlıkları:

- Not açma ve kaydetme.
- Rich editor content load.
- Toggle block render.
- Link insertion.
- Task list toggle.
- Table insertion.
- Outline görüntüleme.
- Mobile responsiveness.

Not:

- Deploy, alias veya production mutation yapılmayacak.

## 24. Prompt bazlı yol haritası

Bu bölümdeki D1-D11 başlıkları tek tek prompt değil, ana epik/aşamalardır. Her epik birkaç Codex promptuna bölünmelidir. Amaç Codex’e küçük, test edilebilir, geri alınabilir işler vermektir.

Toplam tahmin:

- RichNoteEditor Notion-like MVP: yaklaşık 35–45 prompt.
- QuickNoteEditor ve NotesView geniş kapsam dahil edilirse: yaklaşık 50–70 prompt.
- Tiptap tamamen yeniden organize edilip ileri seviye block UX’e gidilirse: 70+ prompt olabilir.

### D1 — Plan, review, commit

Tahmini: 3–4 prompt

İçerik:

- Plan dokümanı oluşturma.
- Dokümantasyon review.
- Gerekirse düzeltme.
- Commit/push.

### D2 — Extension refactor

Tahmini: 5–7 prompt

İçerik:

- ToggleBlock’u ayrı dosyaya çıkarma.
- FontSize/LineHeight korunumu.
- Shared rich editor extension list.
- Mevcut davranış regression.
- Commit/push.

### D3 — Bubble menu

Tahmini: 4–6 prompt

İçerik:

- BubbleTextMenu shell.
- Bold/italic/strike.
- Link edit/remove.
- Heading dropdown.
- Smoke + commit.

### D4 — Existing feature polish

Tahmini: 4–6 prompt

İçerik:

- Headings.
- Code block.
- Link güvenliği.
- Task list enable.
- Toolbar sadeleştirme.
- Smoke + commit.

### D5 — Callout block

Tahmini: 5–7 prompt

İçerik:

- CalloutBlock custom node.
- NodeView.
- Variants/emoji.
- Insert command.
- Save/load smoke.
- Commit.

### D6 — Slash command

Tahmini: 7–10 prompt

İçerik:

- Slash command shell.
- Suggestion menu.
- Keyboard navigation.
- Command filtering.
- Heading/list/todo/toggle/callout/code/table/template commands.
- Edge cases.
- Smoke + commit.

### D7 — Tables

Tahmini: 5–8 prompt

İçerik:

- Table extensions.
- Insert table.
- Row/column operations.
- Table toolbar/menu.
- Mobile overflow.
- Save/load smoke.
- Commit.

### D8 — Basic templates

Tahmini: 4–6 prompt

İçerik:

- Template definitions.
- Daily review.
- Trigger analysis.
- Weekly plan.
- Lesson note.
- Template insert menu.
- Smoke + commit.

### D9 — Document outline

Tahmini: 4–6 prompt

İçerik:

- Heading extraction.
- Right-side/sticky outline.
- Scroll-to-heading.
- Empty/long document behavior.
- Smoke + commit.

### D10 — Production regression

Tahmini: 5–8 prompt

İçerik:

- Old rich notes open.
- New callout/table/template save.
- Reload persistence.
- Mobile smoke.
- No data migration.
- Production static/browser smoke.

### D11 — Optional QuickNoteEditor / NotesView expansion

Tahmini: 12–25 ek prompt

İçerik:

- QuickNoteEditor hafif kalacak şekilde seçili özellikler.
- NotesView TEXT content risk analizi.
- Proje notları için ayrı migration’sız uyumluluk.
- Geniş kapsam smoke.

Özet kapsam / prompt tablosu:

| Kapsam | Tahmini prompt |
| --- | --- |
| Plan + review + commit | 3–4 |
| RichNoteEditor Notion-like MVP | 35–45 |
| QuickNoteEditor + NotesView dahil geniş kapsam | 50–70 |
| İleri seviye block UX / tam Notion hissi | 70+ |

Güvenlik ve veri koruma ilkeleri:

- Her epik ayrı commit/push ile kapanmalı.
- Her epik öncesi git temizliği yapılmalı.
- Her epik sonrası build/lint/smoke yapılmalı.
- Production verisi migrate edilmeyecek.
- Eski Tiptap JSON korunacak.
- Kullanıcı içeriklerine admin erişimi açılmayacak.

Bu planın amacı, implementasyonda tek seferde büyük kırılma yerine kontrollü, küçük prompt iterasyonlarıyla ilerlemektir.

## 25. Riskler ve açık kararlar

### Riskler

- Eski içeriklerin bozulması.
- `notes.content` ve `notebook_notes.content` arasında yanlış varsayım yapılması.
- Node adı değişiklikleriyle JSON uyumsuzluğu oluşması.
- Admin panelin kullanıcı içeriklerine erişim sınırını aşması.
- Mobilde yoğun blok UI’nın kullanılmaz hale gelmesi.
- Table ve callout node’larının paste/serialize davranışının tam tanımlanmaması.

### Açık kararlar

- Callout için attribute seti ne olacak?
- Table’ın minimum feature seti ne olacak?
- Outline paneli hangi yüzeylerde gösterilecek?
- Slash command ve bubble menu aynı anda mı yoksa farklı yüzeylerde mi aktif olacak?
- Template insertion yeni belge açılışında mı, yoksa editör içi komut olarak mı sunulacak?
- Rich editor ile NotesView arasında UX farkı bilinçli olarak ne kadar korunacak?

### Sabit kararlar

- Tiptap korunacak.
- Lexical’a geçiş planlanmayacak.
- Mevcut içerikler migrate edilmeyecek.
- `ToggleBlock` node name değişmeyecek.
- `FontSize` ve `LineHeight` extension name değişmeyecek.
- `notes.content` ve `notebook_notes.content` değiştirilmeyecek.
- Admin panel kullanıcı içeriklerine erişmeyecek.
