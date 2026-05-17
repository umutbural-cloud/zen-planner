# Prompt Rules

## Project Constraints

- Do not change the existing auth system unless explicitly requested.
- Use Supabase for persisted data.
- Do not add dependencies without explicit approval.
- Keep database migrations as separate SQL files.
- Preserve the existing card component structure and visual language.
- Build mobile-first responsive screens.

## Engineering Rules

- Inspect the existing code before implementing.
- Follow local patterns for hooks, components, state, and Supabase queries.
- Keep changes scoped to the requested feature.
- Do not revert unrelated user changes.
- Prefer `rg` for searching.
- Use `apply_patch` for manual file edits.
- Run build after implementation when feasible.

## Communication Rules

- Start by analyzing the existing implementation.
- Then list planned changes.
- Then implement.
- Report verification results clearly.
- If lint fails because of existing unrelated issues, state that separately from build status.

## Frontend Rules

- Use existing UI primitives.
- Use lucide icons already available in the project.
- Avoid new visual systems for a single module.
- Avoid explanatory text in the app UI unless it is an empty state or direct user-facing label.
- Keep mobile layout usable before optimizing desktop layout.

## Database Rules

- Tables must use `user_id` ownership.
- Enable row-level security.
- Add CRUD policies scoped to `auth.uid() = user_id`.
- Add indexes for frequent filters.
- Use soft delete when the module should integrate with trash or recoverable deletion.

# AI Development Rules

## General Principles

- Mevcut sistemi koru.
- Gereksiz refactor yapma.
- Kullanılmayan kod üretme.
- Placeholder/demo kod yazma.
- Fake/mock data ekleme.
- Var olan mimariyi değiştirme.
- Mevcut component yapısını yeniden kullan.
- Kod minimal ve sürdürülebilir olmalı.
- Gereksiz abstraction oluşturma.
- Kod readability performanstan önce gelir.
- Kod yazmadan önce mevcut sistemi analiz et.

---

## Before Writing Code

Kod yazmadan önce:

1. Değişecek dosyaları listele
2. Yapılacak değişiklikleri açıkla
3. Olası riskleri belirt
4. Mevcut sistemi bozup bozmayacağını değerlendir

---

## UI Rules

- Mobile-first zorunlu
- Mevcut spacing sistemini koru
- Yeni design system oluşturma
- Yeni renk paleti üretme
- Mevcut typography yapısını bozma
- UI tutarlılığı önceliklidir
- Mevcut componentleri yeniden kullan
- Yeni modal/sidebar patternleri üretme

---

## Architecture Rules

- Sadece mevcut tech stack kullanılabilir
- Yeni dependency ekleme
- Yeni state management sistemi kurma
- Yeni backend servisi ekleme
- Mevcut auth sistemine dokunma
- API yapısını değiştirme

---

## Database Rules

- Migration olmadan schema değiştirme
- Foreign key yapısını bozma
- Duplicate table oluşturma
- Soft delete yapısını koru
- User data isolation zorunlu

---

## Security Rules

- Secret key frontend'e yazma
- API key expose etme
- Admin yetkilerini client side kontrol etme
- SQL injection riskine dikkat et
- XSS riskine açık HTML render etme
- User inputlarını validate et
- Sensitive data console.log yapma
- Authentication bypass oluşturma

---

## Performance Rules

- Gereksiz re-render oluşturma
- Büyük componentleri parçala
- Kullanılmayan import bırakma
- Dead code bırakma
- Büyük package ekleme

---

## Code Quality

- TypeScript strict mode bozma
- any kullanma
- Açıklayıcı isimlendirme kullan
- Magic number kullanma
- Uzun componentleri böl
- Tek sorumluluk prensibini koru

---

## Forbidden Actions

- Tüm sistemi refactor etme
- Çalışan sistemi yeniden yazma
- Gereksiz dependency yükleme
- Kullanılmayan feature oluşturma
- Mevcut klasör yapısını değiştirme
- Kullanıcı deneyimini ağırlaştırma
