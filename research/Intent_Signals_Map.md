# Intent Signals — Kompletna mapa 114 sygnałów intencji zakupowej

**LinkedIn Lead Generation & Outreach Tool | Luty 2026**

## Podsumowanie kategorii

| # | Kategoria | Liczba | Krytycznych | Wysokich | Główne źródło |
|---|-----------|--------|-------------|----------|----------------|
| 1 | Zaangażowanie w content | 12 | 3 | 5 | HarvestAPI Post Comments |
| 2 | Tworzenie contentu przez leada | 12 | 4 | 4 | HarvestAPI Post Search |
| 3 | Zmiany kariery i stanowiska | 10 | 3 | 2 | HarvestAPI Profile Scraper |
| 4 | Hiring i wzrost zespołu | 9 | 3 | 4 | HarvestAPI Job Search |
| 5 | Sygnały firmowe | 13 | 2 | 4 | Serper + HarvestAPI |
| 6 | Sieć kontaktów i aktywność | 10 | 2 | 3 | HarvestAPI Post Comments |
| 7 | Wyszukiwanie i research | 6 | 3 | 1 | Bombora / Serper |
| 8 | Timing i sezonowość | 8 | 2 | 1 | Kalendarz (rule-based) |
| 9 | Wzorce behawioralne (AI) | 10 | 4 | 4 | All sources + ML |
| 10 | Sygnały zewnętrzne | 12 | 0 | 3 | Serper + web scraping |
| 11 | Mikro-sygnały | 12 | 2 | 0 | HarvestAPI Profile delta |
| | **RAZEM** | **114** | **28** | **31** | |

## 1. ZAANGAŻOWANIE W CONTENT (12 sygnałów)

| # | Sygnał | Siła | AI? | Źródło | Częstotliwość |
|---|--------|------|-----|--------|---------------|
| 1.1 | Komentarz pod postem konkurencji | 🔴 Krytyczny | Rule | HarvestAPI Post Comments | Real-time |
| 1.2 | Reakcja na post konkurencji | 🟠 Wysoki | Rule | HarvestAPI Post Comments (reactions) | Real-time |
| 1.3 | Komentarz z pytaniem o rozwiązanie | 🔴 Krytyczny | AI | HarvestAPI Post Comments + LLM | Real-time |
| 1.4 | Komentarz pod postem thought leadera | 🔵 Średni | Rule | HarvestAPI Post Comments | Dziennie |
| 1.5 | Udostępnienie artykułu branżowego | 🔵 Średni | AI | HarvestAPI Profile Posts | Dziennie |
| 1.6 | Seria reakcji na content z jednej tematyki (3+ w 7 dni) | 🔴 Krytyczny | AI | HarvestAPI + scoring engine | Tygodniowo |
| 1.7 | Komentarz z negatywnym sentymentem o narzędziu | 🔴 Krytyczny | AI | HarvestAPI Post Comments + LLM | Real-time |
| 1.8 | Polubienie postu "porównanie narzędzi" | 🟠 Wysoki | Rule | HarvestAPI Post Search | Dziennie |
| 1.9 | Komentarz pod postem klienta/case study | 🟠 Wysoki | Rule | HarvestAPI Post Comments | Real-time |
| 1.10 | Aktywny commenter (5+ postów jednej firmy/miesiąc) | 🟠 Wysoki | Rule | HarvestAPI + agregacja | Tygodniowo |
| 1.11 | Reakcja na poll/ankietę branżową | ⚪ Niski | Rule | HarvestAPI Post Search | Dziennie |
| 1.12 | Tagowanie kolegów w komentarzu | 🟠 Wysoki | AI | HarvestAPI Post Comments + NLP | Real-time |

## 2. TWORZENIE CONTENTU PRZEZ LEADA (12 sygnałów)

| # | Sygnał | Siła | AI? | Źródło | Częstotliwość |
|---|--------|------|-----|--------|---------------|
| 2.1 | Post o problemie, który rozwiązujesz | 🔴 Krytyczny | AI | HarvestAPI Post Search + LLM | Dziennie |
| 2.2 | Artykuł na LinkedIn o wyzwaniach branżowych | 🟠 Wysoki | AI | HarvestAPI Profile Posts + LLM | Tygodniowo |
| 2.3 | Post z pytaniem do sieci ("kto poleci?") | 🔴 Krytyczny | AI | HarvestAPI Post Search + LLM | Real-time |
| 2.4 | Post o wdrożeniu nowego procesu | 🟠 Wysoki | AI | HarvestAPI Post Search + LLM | Dziennie |
| 2.5 | Post o frustracji z obecnego narzędzia | 🔴 Krytyczny | AI | HarvestAPI Post Search + LLM | Real-time |
| 2.6 | Celebration post — nowy budżet/funding | 🟠 Wysoki | AI | HarvestAPI Post Search + LLM | Dziennie |
| 2.7 | Post o zatrudnianiu (#hiring) | 🟠 Wysoki | Rule | HarvestAPI Post Search | Dziennie |
| 2.8 | Post z refleksją po konferencji | 🔵 Średni | AI | HarvestAPI Post Search + LLM | Tygodniowo |
| 2.9 | Post o zmianach strategicznych w firmie | 🟠 Wysoki | AI | HarvestAPI Profile Posts + LLM | Tygodniowo |
| 2.10 | Post z hashtagami branżowymi | ⚪ Niski | Rule | HarvestAPI Post Search | Dziennie |
| 2.11 | Wzrost częstotliwości postowania | ⚪ Niski | Rule | HarvestAPI Profile Posts + agregacja | Tygodniowo |
| 2.12 | Post z prośbą o demo/trial | 🔴 Krytyczny | AI | HarvestAPI Post Search | Real-time |

## 3. ZMIANY KARIERY I STANOWISKA (10 sygnałów)

| # | Sygnał | Siła | AI? | Źródło | Częstotliwość |
|---|--------|------|-----|--------|---------------|
| 3.1 | Zmiana stanowiska na decision-maker (90 dni) | 🔴 Krytyczny | Rule | HarvestAPI Profile Scraper (delta) | Tygodniowo |
| 3.2 | Zmiana firmy | 🔴 Krytyczny | Rule | HarvestAPI Profile Scraper | Tygodniowo |
| 3.3 | Nowa rola w firmie matching ICP | 🔴 Krytyczny | AI | HarvestAPI Profile + ICP engine | Tygodniowo |
| 3.4 | Awans wewnętrzny | 🟠 Wysoki | Rule | HarvestAPI Profile Scraper | Tygodniowo |
| 3.5 | Celebration post — nowa rola | 🟠 Wysoki | Rule | HarvestAPI Post Search | Dziennie |
| 3.6 | Aktualizacja nagłówka profilu | 🔵 Średni | Rule | HarvestAPI Profile Scraper (delta) | Tygodniowo |
| 3.7 | Dodanie nowego skill | ⚪ Niski | Rule | HarvestAPI Profile Scraper | Miesięcznie |
| 3.8 | Zmiana lokalizacji | ⚪ Niski | Rule | HarvestAPI Profile Scraper | Miesięcznie |
| 3.9 | Aktualizacja sekcji About | 🔵 Średni | AI | HarvestAPI Profile Scraper + LLM | Miesięcznie |
| 3.10 | Dodanie certyfikatu/szkolenia | ⚪ Niski | Rule | HarvestAPI Profile Scraper | Miesięcznie |

## 4. HIRING I WZROST ZESPOŁU (9 sygnałów)

| # | Sygnał | Siła | AI? | Źródło | Częstotliwość |
|---|--------|------|-----|--------|---------------|
| 4.1 | Ogłoszenie o pracę w kluczowej roli | 🔴 Krytyczny | Rule | HarvestAPI Job Search | Dziennie |
| 4.2 | Seria ogłoszeń (3+ w miesiącu) | 🔴 Krytyczny | Rule | HarvestAPI Job Search + agregacja | Tygodniowo |
| 4.3 | Ogłoszenie z requirement dla Twojego typu narzędzia | 🔴 Krytyczny | AI | HarvestAPI Job Search + NLP | Dziennie |
| 4.4 | Nowa rola RevOps / Sales Ops | 🟠 Wysoki | Rule | HarvestAPI Job Search | Dziennie |
| 4.5 | Wzrost headcount >10%/kwartał | 🟠 Wysoki | Rule | HarvestAPI Company Employees (delta) | Miesięcznie |
| 4.6 | Ogłoszenie na stanowisko, które odeszło | 🟠 Wysoki | AI | HarvestAPI Job Search + Profile delta | Tygodniowo |
| 4.7 | Ogłoszenie w nowej lokalizacji | 🔵 Średni | Rule | HarvestAPI Job Search | Tygodniowo |
| 4.8 | Hiring freeze zakończony | 🟠 Wysoki | Rule | HarvestAPI Job Search (temporal) | Tygodniowo |
| 4.9 | Doświadczenie z target tech w job desc | 🔵 Średni | AI | HarvestAPI Job Search + LLM | Dziennie |

## 5-11: Pozostałe kategorie

Pełne tabele w pliku intent_signals.docx. Skrótowe podsumowanie:

- **5. Sygnały firmowe (13):** funding, M&A, IPO, zmiana leadership, ekspansja, rebranding, technographics
- **6. Sieć kontaktów (10):** grupy, eventy, follow, komentarze pod Twoim contentem, social proof
- **7. Wyszukiwanie (6):** Google X-Ray, website visits, intent data (Bombora/G2)
- **8. Timing (8):** Q1/Q4, konferencje, contract renewal, fiscal year
- **9. Wzorce AI (10):** buying journey, churning, team building, research mode, champion emergence
- **10. Zewnętrzne (12):** news, regulacje, competitor funding, outages, earnings, patents
- **11. Mikro-sygnały (12):** zmiana zdjęcia, Open to Work, profile viewed, connection request

## Scoring model

| Element | Wartość | Logika |
|---------|---------|--------|
| Krytyczny sygnał | +30-50 pkt | 1 wystarczy do outreach |
| Wysoki sygnał | +15-25 pkt | 2-3 = outreach ready |
| Średni sygnał | +5-10 pkt | Context |
| Niski sygnał | +1-3 pkt | Wzmacniacz |
| ICP match bonus | +20-40 pkt | Mnożnik |
| Recency bonus | x1.5-2.0 | 7 dni > miesiąc |
| Multi-stakeholder | +25 pkt | 2+ osoby z firmy |
| **Próg outreach** | **70+ pkt** | Auto outreach |
| **Próg digest** | **40-69 pkt** | Daily digest review |
