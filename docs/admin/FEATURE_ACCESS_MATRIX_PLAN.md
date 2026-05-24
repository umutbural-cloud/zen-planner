# Feature Access Matrix Plan

Beginner / Plus Erişim Matrisi — Admin Panel V1 Sonrası Plan

## 1. Yönetici Özeti

Feature Access Matrix modülünün amacı Beginner ve Plus üyeliklerin hangi uygulama özelliklerine erişeceğini merkezi, denetlenebilir ve backend tarafından uygulanabilir şekilde yönetmektir.

Frontend görünürlüğü tek güvenlik sınırı değildir. Menü gizleme, route redirect veya LockedFeatureScreen yalnızca UX katmanıdır. Asıl güvenlik Supabase/Postgres tarafında RPC, RLS, SECURITY DEFINER fonksiyonlar, membership kontrolü ve audit log ile kurulmalıdır.

Bu doküman kodlama öncesi plan dokümanıdır. V1-C2 ve sonrası geliştirmeler bu plana göre küçük, review edilebilir aşamalarla ilerlemelidir.

## 2. Güncel Ürün Kararı

| Özellik | Beginner | Plus | Not |
| --- | --- | --- | --- |
| Ana Sayfa / Dashboard | Kapalı | Açık | Beginner için varsayılan landing önerisi `/pomodoro`. |
| Pomodoro | Açık | Açık | Timer ve temel odak akışı Beginner kapsamındadır. |
| Temel Görevler | Açık | Açık | Basit görev listeleme/durum yönetimi açık kalır. |
| Projeler | Açık | Açık | Proje ve temel proje içi görev akışı açık kalır. |
| Alışkanlıklar | Açık | Açık | Günlük alışkanlık takibi açık kalır. |
| Alışkanlık İstatistikleri | Kapalı | Açık | `HabitsStats` ve özet analiz alanları Plus kapsamına alınmalıdır. |
| Pomodoro içi sınırlı çalışma geçmişi | Açık | Açık | Pomodoro sayfasındaki kısa geçmiş/son kayıtlar açık kalabilir. |
| Tam Çalışma Geçmişi | Kapalı | Açık | `/work-history` Plus-only olmalıdır. |
| Gelişmiş İstatistikler | Kapalı | Açık | Dashboard ve çalışma geçmişi grafik/analizleri Plus-only olmalıdır. |
| Bilgi Merkezi | Kapalı | Açık | Notebook/knowledge alanları Plus-only olmalıdır. |
| Anlık Notlar | Kapalı | Açık | Quick notes Plus-only olmalıdır. |
| Metin Belgeleri | Kapalı | Açık | Rich document/note content Plus-only olmalıdır. |

## 3. Feature Key Kataloğu

| feature_key | label | category | beginner_default | plus_default | route/path | backend_enforcement_required | content_risk | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `dashboard_home` | Ana Sayfa / Dashboard | dashboard | false | true | `/`, `section=home` | Evet | Orta | Home dashboard tasks, pomodoro, habits ve çalışma özetlerini toplar. |
| `pomodoro` | Pomodoro | productivity | true | true | `/pomodoro` | Evet | Orta | Timer, aktif state ve oturum yazımı içerir. |
| `tasks_basic` | Temel Görevler | productivity | true | true | `/`, project views, Pomodoro task board | Evet | Orta | `tasks` içerikleri kullanıcıya aittir; Plus-only değil ama ownership/enforcement korunmalı. |
| `projects` | Projeler | productivity | true | true | `/`, sidebar/project views | Evet | Orta | `projects` ve proje view ayarları temel kapsamda açık. |
| `habits` | Alışkanlıklar | habits | true | true | `/`, `section=habits` | Evet | Orta | Temel alışkanlık CRUD ve completion açık. |
| `habit_stats` | Alışkanlık İstatistikleri | habits | false | true | `HabitsStats` | Evet | Orta | İstatistik componentleri Plus-only olmalı. |
| `work_history_basic` | Sınırlı Çalışma Geçmişi | pomodoro | true | true | `/pomodoro` içi kısa geçmiş | Evet | Orta | Sınır tarih/kayıt adedi backend tarafında uygulanmalı. |
| `work_history_full` | Tam Çalışma Geçmişi | pomodoro | false | true | `/work-history` | Evet | Orta | 5000 kayda kadar geçmiş ve detay listeleri Plus-only. |
| `advanced_stats` | Gelişmiş İstatistikler | analytics | false | true | `/`, `/work-history`, stats components | Evet | Orta | Dashboard metrikleri, trendler ve grafikler ayrı enforce edilmeli. |
| `knowledge_base` | Bilgi Merkezi | knowledge | false | true | `/`, `section=notebook` | Evet | Yüksek | Notebook ağacı ve bilgi merkezi içerikleri Plus-only. |
| `quick_notes` | Anlık Notlar | knowledge | false | true | Quick notes panels/views | Evet | Yüksek | Kısa kullanıcı metinleri içerir. |
| `documents` | Metin Belgeleri | knowledge | false | true | `NotesView`, rich note editor, notebook documents | Evet | Yüksek | Uzun form kullanıcı metni içerir. |

Membership ile kapatılmaması gereken core alanlar:

| key | davranış | not |
| --- | --- | --- |
| `account_settings` | always_available | Hesap, profil ve güvenlik ayarları üyelikle kapatılmamalı. |
| `auth` | always_available | Login/logout ve session akışları feature toggle olmamalı. |
| `password_reset` | always_available | Şifre sıfırlama her kullanıcıya açık kalmalı. |
| `privacy_export` | always_available | Veri taşınabilirliği/gizlilik hakları üyelikten bağımsız olmalı. |
| `account_deletion` | always_available | Hesap silme hakkı üyelikten bağımsız olmalı. |
| `security_notices` | always_available | Güvenlik uyarıları kapatılamaz olmalı. |

## 4. Mevcut Route / Modül Envanteri

| route | page/component | feature_key | beginner behavior | plus behavior | enforcement note |
| --- | --- | --- | --- | --- | --- |
| `/` | `src/pages/Index.tsx` | mixed | Beginner için default landing olmamalı. | Açık. | İç route/section bazlı gate gerekir. |
| `/` home section | `HomeView` | `dashboard_home`, `advanced_stats` | Kapalı veya `/pomodoro` redirect. | Açık. | Home hooks `tasks`, `pomodoro_sessions`, `habits` verilerini toplar. |
| `/` project section | `TableView`, `KanbanView`, `WeeklyCalendarView`, `GanttView` | `projects`, `tasks_basic` | Açık. | Açık. | View bazında ileride ek Plus ayrımı gerekirse ayrı key eklenmeli. |
| `/` project notes view | `NotesView` | `documents` | Kapalı. | Açık. | `notes` içerikleri metin belgesi olarak değerlendirilmelidir. |
| `/` backlog section | `BacklogView` | `tasks_basic` | Açık. | Açık. | `backlog_tasks` temel görev kapsamına dahil edilebilir. |
| `/` habits section | `HabitsView` | `habits`, `habit_stats` | Temel takip açık, stats kapalı. | Açık. | `HabitsStats` ayrı Plus gate almalı. |
| `/` notebook section | `NotebookView`, `QuickNotesPanel`, `RichNoteEditor` | `knowledge_base`, `quick_notes`, `documents` | Kapalı. | Açık. | High content risk; backend enforcement zorunlu. |
| `/` journal section | `JournalView` | TBD | Varsayılan kapalı önerilir. | TBD. | Product kararında yok; kullanıcı iç metni olduğu için default deny önerilir. |
| `/` trash section | `TrashView` | mixed/TBD | Kaynağın feature hakkına göre davranmalı. | Açık. | Trash tüm içerik türlerini görebildiği için underlying feature ile enforce edilmeli. |
| `/` retreat section | `InzivaView` | TBD | Karar bekliyor. | Karar bekliyor. | Product kapsamı netleşmeden feature key verilmemeli. |
| `/pomodoro` | `src/pages/Pomodoro.tsx` | `pomodoro`, `work_history_basic`, `tasks_basic`, `projects` | Açık. | Açık. | Sınırlı geçmiş ve task board backend tarafında limitlenmeli. |
| `/work-history` | `src/pages/WorkHistory.tsx` | `work_history_full`, `advanced_stats` | Kapalı. | Açık. | Full history sorguları Plus-only enforce edilmeli. |
| `/admin` | `src/pages/Admin.tsx` | admin-only, membership dışı | Membership matrix kapsamı dışı. | Membership matrix kapsamı dışı. | Admin role backend RPC gate ile korunur. |
| `/auth` | `src/pages/Auth.tsx` | `auth` | Açık. | Açık. | Core auth route. |
| `/reset-password` | `src/pages/ResetPassword.tsx` | `password_reset` | Açık. | Açık. | Core security route. |
| `*` | `NotFound` | none | Açık. | Açık. | Güvenlik sınırı değildir. |

Beginner `/` davranışı:

| Seçenek | Artı | Eksi |
| --- | --- | --- |
| `/pomodoro` redirect | Beginner için hızlı ve net landing; kapalı dashboard içeriği hiç render edilmez. | Kullanıcı `/` adresinde neden yönlendiğini anlamayabilir. |
| LockedFeatureScreen | Plus değerini anlatır; doğrudan URL erişiminde açıklayıcıdır. | Default açılışta Beginner için sürtünme yaratır. |

Öneri: Beginner için `/` default girişte `/pomodoro` redirect kullanılsın. Kullanıcı menüden veya doğrudan kapalı bir alt modüle giderse LockedFeatureScreen gösterilsin.

## 5. Veri Erişim / Tablo Envanteri

| module | likely tables/RPCs | feature_key | backend enforcement risk | notes |
| --- | --- | --- | --- | --- |
| Home dashboard | `tasks`, `pomodoro_sessions`, `pomodoro_categories`, `habits`, `habit_completions`, `user_settings` | `dashboard_home`, `advanced_stats` | Yüksek | Birden fazla modül verisini toplar; Beginner için kapalıysa fetch de durmalı. |
| Pomodoro | `pomodoro_active_state`, `pomodoro_sessions`, `pomodoro_categories`, `tasks`, `projects` | `pomodoro`, `work_history_basic` | Orta | Session insert/update/delete var; Plus ayrımı değil ama ownership ve basic history limitleri korunmalı. |
| Work history | `pomodoro_sessions`, `pomodoro_categories`, `projects` | `work_history_full`, `advanced_stats` | Yüksek | Full history ve grafikler Plus-only. |
| Tasks | `tasks`, `pomodoro_sessions` | `tasks_basic` | Orta | Temel görevler açık; task içerikleri kullanıcıya ait olduğu için RLS/feature check korunmalı. |
| Projects | `projects`, `tasks`, `notes` | `projects`, `tasks_basic`, `documents` | Orta/Yüksek | Proje temel açık; proje notları documents kapsamına ayrılmalı. |
| Backlog | `backlog_tasks`, `tasks`, `projects` | `tasks_basic` | Orta | Temel görev kapsamına dahil edilebilir. |
| Habits | `habits`, `habit_completions`, `habit_categories`, `projects` | `habits` | Orta | Temel takip açık. |
| Habit stats | `habits`, `habit_completions`, `habit_categories` | `habit_stats` | Orta | Stats componentleri Plus-only. |
| Knowledge base | `notebooks`, `notebook_notes` | `knowledge_base`, `documents`, `quick_notes` | Yüksek | Kullanıcı metinleri içerir; default deny. |
| Quick notes | `quick_notes`, `notebook_notes` | `quick_notes` | Yüksek | İki quick notes implementasyonu görünüyor; V1-C2 öncesi netleştirilmeli. |
| Rich documents / notes | `notes`, `notebook_notes` | `documents` | Yüksek | Raw kullanıcı metni içerir. |
| Journal | `journal_entries`, `tasks`, `pomodoro_sessions` | TBD | Yüksek | Product kararında yok; default deny ve ayrı karar önerilir. |
| Trash | `tasks`, `notes`, `projects`, `journal_entries`, `backlog_tasks` | mixed/TBD | Yüksek | Kaynağın bağlı olduğu feature hakkına göre filtrelenmeli. |
| Settings | `user_settings` | `account_settings` ve UI preferences | Düşük/Orta | Account/security ayarları always available; feature enforcement için localStorage kullanılmamalı. |
| Admin panel | Admin RPCs | admin-only | Yüksek | Membership matrix kapsamı dışı; admin role enforcement ayrı kalır. |

Kesin tablo adı bulunamayan veya ürün kapsamı netleşmeyen alanlar dokümanda TBD olarak bırakılmıştır. Bu alanlar uygulama sırasında kesin bilgiye çevrilmeden açılmamalıdır.

## 6. Backend Tasarım Önerisi

Önerilen tablolar:

| table | amaç |
| --- | --- |
| `public.app_features` | Sabit feature kataloğu: key, label, category, risk, sort order, active status. |
| `public.membership_feature_access` | `beginner` / `plus` membership için feature erişim matrisi. |

Önerilen helper/RPC seti:

| RPC/helper | amaç |
| --- | --- |
| `public.can_access_feature(feature_key text)` | Current user membership için tek feature erişimini backend tarafında hesaplar. |
| `public.get_current_feature_access()` | Frontend route/menu gating için current user matrix özetini döner. |
| `public.admin_get_feature_access_matrix()` | Super manager için read-only matrix yönetim ekranı verisi. |
| `public.admin_update_feature_access()` | Sonraki aşamada super manager mutation RPC. |
| audit action: `feature_access.changed` | Matrix değişikliklerinin audit log action değeri. |

Backend kuralları:

- `app_features` seed/migration ile gelmelidir.
- Admin serbest `feature_key` yazamamalıdır; yalnız katalogdaki key güncellenmelidir.
- Membership değeri yalnız `beginner` veya `plus` olmalıdır.
- Matrix mutation yalnız `super_manager` tarafından yapılmalıdır.
- Manager V1'de matrix görmemeli; öneri read-only bile göstermemektir.
- Her matrix mutation audit log yazmalıdır.
- Direct table SELECT grant açılmamalıdır.
- SECURITY DEFINER fonksiyonlarda `SET search_path = ''` korunmalıdır.
- Tüm tablo/fonksiyon referansları explicit schema ile yazılmalıdır.

## 7. Frontend Tasarım Önerisi

Önerilen parçalar:

- `useFeatureAccess`: `get_current_feature_access()` çağırır, safe loading/error state döner.
- `FeatureGate`: component seviyesinde görünürlük/locked state yönetir.
- `LockedFeatureScreen`: Plus-only veya kapalı feature için açıklayıcı ekran.
- Route/menu gating: sidebar, `/`, `/work-history`, notebook/notes sections ve stats componentleri feature key'e göre render edilir.
- Beginner default landing: `/pomodoro`.
- Plus default landing: `/`.

Beginner `/` davranışı için öneri:

- Default giriş veya login sonrası `/` hedefi Beginner ise `/pomodoro` redirect.
- Kullanıcı doğrudan Plus-only route/section açarsa LockedFeatureScreen.
- Bu yaklaşım hem günlük kullanım sürtünmesini azaltır hem kapalı modüllerde açıklama sağlar.

## 8. Backend Enforcement Stratejisi

Sadece menü gizlemek yeterli değildir. Plus-only veriye doğrudan route üzerinden, client bundle üzerinden veya Supabase client sorgularıyla erişim backend tarafında engellenmelidir.

Enforcement feature feature yapılmalıdır. İlk pilot kapsam:

1. `dashboard_home`
2. `habit_stats`
3. `advanced_stats`
4. `work_history_full`

Daha sonraki restricted content kapsamı:

1. `knowledge_base`
2. `quick_notes`
3. `documents`

Pilot aşamada amaç en yüksek UX etkili ama görece sınırlı backend yüzeyine sahip alanları kapatıp pattern'i kanıtlamaktır. Content-heavy modüller daha dikkatli migration/RLS/RPC tasarımı gerektirir.

## 9. Admin Panel Erişim Matrisi UI Planı

Admin panelde yeni sekme önerisi:

- `Erişim Matrisi`

V1-C3 read-only:

- Yalnız super manager görür.
- Matrix'i listeler.
- Toggle yoktur.
- Manager/non-super admin görmez.

V1-C4 mutation:

- Toggle kontrollü açılır.
- Confirm modal zorunludur.
- `reason_code` zorunludur.
- Audit log yazılır.
- Optimistic update yoktur.
- Mutation sonrası matrix yeniden fetch edilir.

Önerilen reason codes:

- `pricing_policy_update`
- `feature_rollout`
- `feature_restriction`
- `admin_correction`
- `experiment`

## 10. Audit Log Etkisi

Yeni audit action:

- `feature_access.changed`

Önerilen `write_admin_audit_log` metadata alanları:

- `feature_key`
- `membership`
- `from_enabled`
- `to_enabled`
- `normalized_reason_code`

Gerekli güncellemeler:

- `admin_search_audit_logs` whitelist'i `feature_access.changed` için genişletilmeli.
- Audit backend safe summary mapping eklenmeli.
- Audit UI action label mapping eklenmeli.
- Raw metadata yine response'a dönmemeli.
- `actor_user_id` / `target_user_id` UI veya response contract'a eklenmemeli.

## 11. Aşamalı Uygulama Planı

1. V1-C1 Feature Access Matrix Plan Dokümanı
2. V1-C2 Backend feature catalog + read RPC
3. V1-C3 Admin read-only matrix UI
4. V1-C4 Admin matrix mutation + audit
5. V1-C5 Frontend useFeatureAccess + route/menu gating
6. V1-C6 Pilot backend enforcement
7. V1-C7 Restricted content modules enforcement
8. V1-C8 Production smoke + final review

Her aşamada sıralama:

1. local implementation
2. diff/security review
3. commit/push
4. deploy/static doğrulama
5. production smoke

Migration, frontend entegrasyonu, deploy ve production mutation aynı promptta birleştirilmemelidir.

## 12. Test Planı

Super manager:

- Matrix sekmesini görür.
- Read-only matrix verisini görebilir.
- V1-C4 sonrası mutation yapabilir.
- Mutation sonrası audit oluşur.

Manager/non-super:

- Matrix sekmesini görmez.
- Matrix read RPC çağırırsa `insufficient_privilege` alır.
- Mutation yapamaz.

Beginner:

- `/pomodoro` açık.
- Basic tasks/projects/habits açık.
- `/` kapalı veya `/pomodoro` yönlendirmeli.
- `habit_stats` kapalı.
- `work_history_full` kapalı.
- `knowledge_base`, `quick_notes`, `documents` kapalı.

Plus:

- Tüm feature'lar açık.
- `/` default landing çalışır.
- `/work-history`, bilgi merkezi ve doküman alanları çalışır.

Security:

- Direct URL access test edilmeli.
- Supabase/RPC access test edilmeli.
- RLS/policy ve SECURITY DEFINER davranışı test edilmeli.
- Audit log safe response doğrulanmalı.
- User content privacy korunmalı.

## 13. Riskler ve Kararlar

Riskler:

- Frontend-only gating Plus-only veriyi korumaz.
- Content table leakage riski özellikle `notes`, `quick_notes`, `notebooks`, `notebook_notes`, `journal_entries` için yüksektir.
- Ana sayfa kapatıldığında Beginner landing UX'i bozulabilir.
- Existing users Plus normalizasyonu korunmazsa mevcut kullanıcı deneyimi bozulabilir.
- Admin serbest feature key girebilirse yanlış veya unsupported feature açılabilir.
- Per-user override V1 kapsamına alınırsa test ve audit yüzeyi büyür.

Kararlar:

- Per-user override yok.
- Global Beginner/Plus matrix var.
- Existing users Plus kalır.
- New users Beginner başlar.
- Account/security rights üyelikle kapatılmaz.
- Feature key serbest admin girdisi olmaz; katalog kontrollü olur.

## 14. Açık Sorular

- Ana sayfada Beginner için redirect mi LockedFeatureScreen mi?
- Çalışma geçmişi “sınırlı” kaç gün/kayıt olmalı?
- Alışkanlık istatistikleri tam olarak hangi componentleri kapsıyor?
- Bilgi Merkezi altında quick notes/documents ayrımı route bazında nasıl?
- Advanced stats hangi mevcut componentlerde yer alıyor?
- Journal alanı Beginner/Plus matrix'te hangi feature key'e bağlanmalı?
- Trash görünümü kaynak feature'a göre mi filtrelenmeli, yoksa ayrı Plus-only feature mı olmalı?

## 15. Son Karar

“Feature Access Matrix modülü doğrudan kodlanmadan önce bu plan referans alınmalıdır. İlk uygulama adımı V1-C2 backend feature catalog + read RPC olmalı; enforcement ise feature feature ve smoke testlerle ilerlemelidir.”
