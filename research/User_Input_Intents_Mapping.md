# User Input → Intent Signals Mapping

**Co user musi podać na onboardingu → jakie intenty to odblokowuje**
**18 typów danych wejściowych | 94 powiązań z intentami | Luty 2026**

---

## Podsumowanie (posortowane po priorytecie)

| # | Co user podaje | Przykład | Intentów | Krytycz. | Wymagane? | Faza |
|---|---------------|----------|----------|----------|-----------|------|
| 1 | Słowa kluczowe / frazy problemów | "cold outreach", "low reply rate" | 11 | 5 | ⚠️ TAK | MVP |
| 2 | Nazwy firm konkurencji | Dripify, Expandi, HeyReach | 9 | 4 | ⚠️ TAK | MVP |
| 3 | Lista target accounts | Notion, Figma, Loom, Miro | 10 | 4 | NIE | MVP |
| 4 | Kryteria ICP — stanowisko/rola | VP Sales, SDR Manager, CRO | 7 | 3 | ⚠️ TAK | MVP |
| 5 | Kluczowe role hiring signals | SDR, BDR, RevOps, Growth Manager | 6 | 2 | NIE | MVP |
| 6 | Frazy produktowe / nazwy kategorii | "sales automation", "lead gen platform" | 5 | 2 | ⚠️ TAK | MVP |
| 7 | Nazwa własnej firmy / LinkedIn | LeadSignal.io | 5 | 2 | ⚠️ TAK | MVP |
| 8 | Kryteria ICP — technologie/stack | HubSpot, Salesforce, Outreach | 5 | 1 | NIE | Growth |
| 9 | Kalendarz / fiscal year | January, April (UK gov) | 4 | 1 | NIE | Growth |
| 10 | Kryteria ICP — lokalizacja | Poland, US, DACH | 4 | 1 | ⚠️ TAK | MVP |
| 11 | Kryteria ICP — branża | SaaS, FinTech, B2B Services | 4 | 1 | ⚠️ TAK | MVP |
| 12 | Profile thought leaderów | linkedin.com/in/jasonlemkin | 4 | 0 | NIE | MVP |
| 13 | Nazwy konferencji/eventów | SaaStr, Dreamforce, Web Summit | 4 | 0 | NIE | Growth |
| 14 | Nazwy istniejących klientów | PostHog, Hotjar | 4 | 1 | NIE | MVP |
| 15 | Profile teamu (CEO, sales) | linkedin.com/in/jan-kowalski | 3 | 2 | NIE | MVP |
| 16 | Hashtagi branżowe | #SalesTech, #ABM, #LeadGen | 3 | 0 | NIE | MVP |
| 17 | Kryteria ICP — wielkość firmy | 51-200, 201-1000 | 3 | 1 | ⚠️ TAK | MVP |
| 18 | Linki do grup LinkedIn | linkedin.com/groups/12345 | 3 | 1 | NIE | Growth |

---

## Szczegóły: dane wejściowe → odblokowane intenty

### 1. Słowa kluczowe / frazy problemów ⚠️ WYMAGANE | MVP

**Przykład:** "cold outreach", "low reply rate", "lead generation tools", "scaling SDR team"
**Jak używamy:** Szukamy postów i komentarzy z tymi frazami — ludzie aktywnie mówiący o problemach, które rozwiązujesz.

| Intent signal | Siła | Jak wykrywamy |
|---|---|---|
| Post o problemie, który rozwiązujesz | 🔴 Krytyczny | Post Search z keywordami → AI dopasowuje do value prop |
| Post z pytaniem do sieci ("kto poleci?") | 🔴 Krytyczny | Post Search + intent classification na pytaniach |
| Post o frustracji z obecnego narzędzia | 🔴 Krytyczny | Post Search + sentiment analysis |
| Post z prośbą o demo/trial | 🔴 Krytyczny | Post Search z frazami "looking for", "recommend", "demo" |
| Buying journey pattern | 🔴 Krytyczny | AI: sekwencja pytanie → porównania → case study |
| Post o wdrożeniu nowego procesu | 🟠 Wysoki | Post Search z keywordami o wdrożeniach |
| Artykuł na LinkedIn o wyzwaniach | 🟠 Wysoki | Post Search long-form articles matching keywords |
| Aktywność w grupie branżowej | 🟠 Wysoki | Post Search filtrowany po grupach z keywords |
| Research mode pattern | 🟠 Wysoki | AI: lead reaguje na 5+ postów z tych keywords w 14 dni |
| Post z refleksją po konferencji | 🔵 Średni | Post Search z event-related keywords |
| Profil z keywords w About/Experience | ⚪ Niski | Serper: site:linkedin.com + keywords z profilu |

### 2. Nazwy firm konkurencji ⚠️ WYMAGANE | MVP

**Przykład:** Dripify, Expandi, HeyReach, Gojiberry.ai
**Jak używamy:** Monitorujemy posty competitors i wyłapujemy kto komentuje, reaguje, udostępnia ich content.

| Intent signal | Siła | Jak wykrywamy |
|---|---|---|
| Komentarz pod postem konkurencji | 🔴 Krytyczny | Scrapujemy komentarze pod postami competitors |
| Komentarz z pytaniem pod postem competitor | 🔴 Krytyczny | AI klasyfikuje intent komentarzy |
| Negatywny sentyment o narzędziu competitor | 🔴 Krytyczny | Sentiment analysis na komentarzach |
| Churning pattern u competitor | 🔴 Krytyczny | AI łączy negatywne komentarze + szukanie alternatyw |
| Reakcja na post konkurencji | 🟠 Wysoki | Scrapujemy reactions pod postami competitors |
| Polubienie postu "porównanie narzędzi" | 🟠 Wysoki | Monitorujemy posty competitors o porównaniach |
| Aktywny commenter (5+ postów jednej firmy) | 🟠 Wysoki | Agregacja komentarzy per competitor per miesiąc |
| Seria reakcji na competitor content (3+ w 7 dni) | 🔴 Krytyczny | Tracking wielokrotnych interakcji |
| Awaria/outage u competitor | 🟠 Wysoki | Monitoring statusów + social listening |

### 3. Lista target accounts | OPCJONALNE | MVP

**Przykład:** Notion, Figma, Loom, Miro
**Jak używamy:** Bezpośredni monitoring wszystkiego w tych firmach — każdy sygnał jest wzmocniony.

| Intent signal | Siła | Jak wykrywamy |
|---|---|---|
| Nowy CEO/CRO/VP w target account | 🔴 Krytyczny | Company Employees delta |
| Runda finansowania target account | 🔴 Krytyczny | News + Crunchbase monitoring |
| Seria ogłoszeń w target account | 🔴 Krytyczny | Job Search per firma |
| Multiple stakeholder engagement | 🔴 Krytyczny | 2+ osób z firmy generuje sygnały |
| Post leadera o zmianach | 🟠 Wysoki | Profile Posts monitoring |
| Wzrost headcount | 🟠 Wysoki | Company Employees delta |
| Ekspansja na nowy rynek | 🟠 Wysoki | Jobs + posts z nowych lokalizacji |
| Przejęcie M&A | 🟠 Wysoki | News monitoring |
| Rebranding / zmiana nazwy | 🔵 Średni | Company Scraper delta |
| Ogłoszenie nowego produktu | 🔵 Średni | Company posts + news |

### 4. Kryteria ICP — stanowisko/rola ⚠️ WYMAGANE | MVP

**Przykład:** VP Sales, Head of Growth, SDR Manager, CRO
**Jak używamy:** Filtrujemy wszystkie sygnały pod kątem stanowiska — interesują nas decision-makers.

| Intent signal | Siła | Jak wykrywamy |
|---|---|---|
| Zmiana stanowiska na decision-maker | 🔴 Krytyczny | Profile delta: awans na target title w 90 dni |
| Nowa rola w firmie matching ICP | 🔴 Krytyczny | Profile delta + ICP title match |
| ICP scoring na każdym leadzie | 🔴 Krytyczny | Każdy lead scorowany vs ICP title |
| Ogłoszenie na stanowisko z ICP title | 🔴 Krytyczny | Job Search po target titles |
| Awans wewnętrzny | 🟠 Wysoki | Ten sam company, nowy title matching ICP |
| Celebration post — nowa rola | 🟠 Wysoki | Post Search "#newrole" + title matching |
| Aktualizacja nagłówka profilu | 🔵 Średni | Headline delta matching target titles |

### 5. Kluczowe role hiring signals | OPCJONALNE | MVP

**Przykład:** SDR, BDR, Account Executive, RevOps, Growth Manager
**Jak używamy:** Firma szukająca SDR Managera buduje outbound — potrzebuje Twojego narzędzia.

| Intent signal | Siła | Jak wykrywamy |
|---|---|---|
| Ogłoszenie o pracę w kluczowej roli | 🔴 Krytyczny | Job Search po tych tytułach |
| Seria ogłoszeń (3+ w miesiącu) | 🔴 Krytyczny | Agregacja ogłoszeń z tych ról |
| Nowa rola RevOps / Sales Ops | 🟠 Wysoki | Job Search: te stanowiska = tool buyer |
| Hiring freeze zakończony | 🟠 Wysoki | Firma po 3+ miesiącach nagle publikuje te role |
| Ogłoszenie na stanowisko, które odeszło | 🟠 Wysoki | Job post + departure detection |
| Team building pattern | 🟠 Wysoki | AI: 5+ ogłoszeń w jednym dziale |

### 6. Frazy produktowe / nazwy kategorii ⚠️ WYMAGANE | MVP

**Przykład:** "sales automation", "LinkedIn automation", "outreach tool", "lead gen platform"
**Jak używamy:** W ogłoszeniach, postach i profilach — wskazują aktywne myślenie o Twoim typie rozwiązania.

| Intent signal | Siła | Jak wykrywamy |
|---|---|---|
| Ogłoszenie z requirement dla Twojego typu narzędzia | 🔴 Krytyczny | Job Search NLP: opis wymienia category name |
| Post z pytaniem o Twoją kategorię | 🔴 Krytyczny | Post Search: "recommend [category]" |
| Post o wdrożeniu narzędzia z kategorii | 🟠 Wysoki | Post Search: category + implementation keywords |
| Doświadczenie z kategorii w job desc | 🔵 Średni | "experience with [category]" as nice-to-have |
| Profil z category keywords (X-Ray) | ⚪ Niski | Serper: site:linkedin.com + category names |

### 7. Nazwa własnej firmy ⚠️ WYMAGANE | MVP

**Przykład:** LeadSignal.io, linkedin.com/company/leadsignal
**Jak używamy:** Kto wchodzi w interakcję z Twoim contentem — najcieplejsze leady.

| Intent signal | Siła | Jak wykrywamy |
|---|---|---|
| Komentarz pod postem Twojego CEO/founder | 🔴 Krytyczny | Scrapujemy komentarze pod postami Twojej firmy |
| Champion emergence pattern | 🔴 Krytyczny | Ktoś z firmy leada intensywnie reaguje na Twój content |
| Lead obserwuje Twoją firmę | 🔴 Krytyczny | Tracking followerów (jeśli admin access) |
| Reakcja na Twój content | 🟠 Wysoki | Reactions pod Twoimi postami |
| Udostępnienie Twojego postu | 🟠 Wysoki | Tracking reshare'ów |

### 8-18. Pozostałe inputy (skrót)

| # | Input | Intentów | Kluczowe intenty |
|---|-------|----------|-----------------|
| 8 | ICP — technologie | 5 | Zmiana tech stack, job desc z target tech |
| 9 | Fiscal year | 4 | Q1 budżet, Q4 planning, contract renewal |
| 10 | ICP — lokalizacja | 4 | Location scoring, ekspansja, nowe biura |
| 11 | ICP — branża | 4 | Industry scoring, regulacje, raporty branżowe |
| 12 | Thought leaderzy | 4 | Komentarze pod postami influencerów, network activation |
| 13 | Konferencje/eventy | 4 | RSVP, post-event content, sponsor detection |
| 14 | Istniejący klienci | 4 | Komentarze pod postami klientów, social proof, wspólne connections |
| 15 | Profile teamu | 3 | Komentarze pod postami teamu, profile viewed, connection requests |
| 16 | Hashtagi | 3 | Posts z hashtagami, #hiring + hashtag branżowy |
| 17 | ICP — wielkość firmy | 3 | Company size scoring, headcount growth, layoffs |
| 18 | Grupy LinkedIn | 3 | Aktywność w grupach, dołączenie do grupy, pytania w grupie |

---

## Onboarding flow — rekomendacja

| Krok | Sekcja | Co user podaje | Intentów | Czas | Łącznie |
|------|--------|----------------|----------|------|---------|
| 1 (wymagany) | ICP Builder | Stanowisko, branża, wielkość, lokalizacja | ~20 | 2 min | ~20 |
| 2 (wymagany) | Competitors | 3-10 nazw firm konkurencji | ~9 | 2 min | ~29 |
| 3 (wymagany) | Keywords | 5-15 fraz problemów + 3-5 nazw kategorii | ~16 | 3 min | ~45 |
| 4 (wymagany) | Twoja firma | Nazwa + LinkedIn + profile teamu | ~8 | 1 min | ~53 |
| 5 (opcjonalny) | Klienci | Nazwy firm-klientów | ~4 | 1 min | ~57 |
| 6 (opcjonalny) | Influencerzy | Profile thought leaderów | ~4 | 1 min | ~61 |
| 7 (opcjonalny) | Hiring + Accounts | Hiring roles + target accounts | ~16 | 2 min | ~77 |
| 8 (opcjonalny) | Zaawansowane | Hashtagi, tech stack, grupy, eventy, fiscal year | ~20 | 3 min | ~97 |

**Kluczowy insight:** 4 wymagane kroki (8 minut) odblokują ~53 intentów, w tym wszystkie krytyczne. Reszta to opcjonalne wzmocnienie.

---

*Dokument przygotowany 26.02.2026.*
