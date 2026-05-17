# UI Rules

## General

- Build mobile-first.
- Preserve the existing quiet, work-focused visual language.
- Use existing UI primitives from `src/components/ui`.
- Keep the existing card structure and border language.
- Prefer compact, scannable layouts over marketing-style sections.

## Layout

- Use responsive grids and stacked mobile layouts.
- Avoid horizontal overflow on mobile.
- Keep controls reachable with one thumb where practical.
- Use spacing consistent with existing modules: compact gaps, small labels, and restrained headers.

## Cards

- Use existing card styling patterns: subtle borders, low-radius corners, and muted backgrounds.
- Do not nest cards inside other cards.
- Cards should contain actual records or focused editing surfaces.

## Controls

- Use icon buttons for actions when a familiar icon exists.
- Use tooltips or `title` labels for compact icon-only actions.
- Use segmented controls, tabs, selects, checkboxes, and popovers according to existing patterns.
- Do not add new UI dependencies.

## Text

- Keep headings short.
- Avoid in-app explanatory copy that describes how the UI works.
- Use Turkish labels consistently with the rest of the app.
- Preserve existing Japanese accent labels where already used by a nearby module pattern.

## Accessibility

- Buttons must have accessible labels through visible text or `title`.
- Inputs need clear placeholders or labels.
- Interactive targets should remain usable on touch screens.

## Responsive Rules

- Mobile first: single-column, stacked panels, and full-width controls.
- Desktop: use multi-column layouts only when they improve scanning and comparison.
- Tables must degrade gracefully on small screens, either through cards or horizontal containment.

## Design Philosophy

Arayüz şu yapıda olmalıdır:

- Sakin.
- Sade.
- Ferah.
- Dikkat dağıtmayan.
- Modern.
- Yumuşak geçişli.
- Zihinsel yükü azaltan.

Japon minimalizmi prensipleri benimsenmelidir:

- Az ama anlamlı öğeler.
- Boş alan kullanımı.
- Görsel denge.
- Sade tipografi.
- Düşük görsel gürültü.
- Yumuşak kontrastlar.
- Sakin renk paleti.

## UX Principles

- Kullanıcı hiçbir zaman baskı altında hissetmemelidir.
- Uygulama suçluluk veya verimsizlik hissi üretmemelidir.
- Karmaşık dashboard yapılarından kaçınılmalıdır.
- Tek ekranda aşırı bilgi gösterilmez.
- Her ekran tek bir ana amaca odaklanmalıdır.
- Kullanıcının zihinsel enerjisini azaltacak deneyimler tercih edilmelidir.

## Interaction Rules

- Animasyonlar minimal ve anlamlı olmalıdır.
- Gereksiz popup/modal kullanımından kaçınılmalıdır.
- Bildirimler minimum seviyede tutulmalıdır.
- Kullanıcı akışı mümkün olduğunca doğal hissettirmelidir.
- Kullanıcıyı manipüle eden gamification sistemleri kullanılmamalıdır.

## UI Constraints

- Mobile-first tasarım zorunludur.
- Minimal component yapısı korunmalıdır.
- Tutarlı spacing sistemi kullanılmalıdır.
- Görsel hiyerarşi sade olmalıdır.
- Yeni feature eklenirken mevcut sadelik korunmalıdır.
- Yeni ekranlar mevcut tasarım diline uyumlu olmak zorundadır.

## AI Development Guidance

Yeni özellik geliştirirken:

- Önce mevcut sadeliği koru.
- Minimum karmaşıklıkla çözüm üret.
- Gereksiz feature ekleme.
- Kullanıcıyı yormayan deneyimler tasarla.
- "Daha fazla özellik" yerine "daha iyi deneyim" yaklaşımını benimse.
- Sistemi ağırlaştıracak veya dikkat dağıtacak tasarımlardan kaçın.
