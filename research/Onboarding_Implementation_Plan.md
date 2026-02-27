# Onboarding Page — Plan implementacji

## Koncepcja

Onboarding składa się z **dwóch trybów**, między którymi user może przełączać się w każdym momencie:

1. **Tryb konwersacyjny (domyślny)** — user opisuje siebie i swój biznes w naturalnym języku, AI ekstrapoluje dane i wypełnia pola, dopytując o brakujące informacje
2. **Tryb formularzowy** — klasyczny formularz z polami do ręcznego wypełnienia

Oba tryby operują na tym samym modelu danych (shared state). Cokolwiek AI wypełni w trybie konwersacyjnym, jest widoczne w formularzu — i odwrotnie.

---

## Architektura UI

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  Logo    Onboarding    [Tryb: 💬 Rozmowa | 📋 Formularz]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────┐  ┌──────────────────────────┐  │
│  │                     │  │                          │  │
│  │   LEWA STRONA       │  │   PRAWA STRONA           │  │
│  │                     │  │                          │  │
│  │   Chat / Formularz  │  │   Intent Dashboard       │  │
│  │   (zależnie od      │  │   (live counter +        │  │
│  │    trybu)           │  │    lista odblokowanych)  │  │
│  │                     │  │                          │  │
│  └─────────────────────┘  └──────────────────────────┘  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [← Wstecz]     Progress bar: ████░░░░ 43/107 intentów │
│                  [Pomiń i zacznij →]                    │
└─────────────────────────────────────────────────────────┘
```

### Prawa strona — Intent Dashboard (zawsze widoczny)

Dashboard na żywo pokazujący stan odblokowanych intentów. Aktualizuje się po każdej odpowiedzi usera (w trybie chat) lub po każdym wypełnionym polu (w trybie formularza).

```
┌─────────────────────────────────────┐
│  🟢 43 / 107 intentów odblokowanych │
│  ████████████░░░░░░░░░  40%        │
│                                     │
│  Odblokowane kategorie:             │
│  ✅ Zaangażowanie w content (9/12)  │
│  ✅ Tworzenie contentu (8/12)       │
│  ⬜ Zmiany kariery (0/10)           │
│  ⬜ Hiring signals (0/9)            │
│  ...                                │
│                                     │
│  🔴 12 krytycznych odblokowanych    │
│  🟠 15 wysokich odblokowanych       │
│                                     │
│  💡 Podaj nazwy konkurentów,        │
│     aby odblokować 9 nowych         │
│     intentów (4 krytyczne)          │
└─────────────────────────────────────┘
```

Kluczowe elementy dashboardu:
- **Główny counter** z progress barem (np. 43/107) — gamifikacja, motywuje do podawania danych
- **Breakdown po kategoriach** — user widzi które grupy intentów ma odblokowane
- **Counter krytycznych / wysokich** — podkreśla wartość
- **Hint** — dynamiczna podpowiedź "co podać dalej, żeby odblokować najwięcej"
- **Animacja** przy każdym nowym odblokowanym intencie — licznik rośnie, kategorie się zapełniają

---

## Tryb konwersacyjny — szczegóły

### Wiadomość powitalna

Pierwsza wiadomość od AI po wejściu na onboarding:

```
Cześć! 👋 Jestem tu, żeby skonfigurować Twoje intent signals
— sygnały, dzięki którym będziesz rozmawiać z ludźmi, którzy
WŁAŚNIE szukają tego, co oferujesz.

Powiedz mi w kilku zdaniach: czym się zajmujesz i kogo szukasz
jako klientów?

Na przykład: "Prowadzę agencję SEO, szukam właścicieli
e-commerce B2C w Polsce z min. 50 pracownikami"
```

### Przykładowy flow konwersacji

**User:** "Jestem CEO agencji marketingowej, szukam klientów zainteresowanych usługami promowania biznesów B2B SaaS."

**AI przetwarza i ekstrapoluje:**

```
Ekstrapolacja z pierwszej wiadomości:
├── Twoja firma: agencja marketingowa (typ: agency)
├── Twoja rola: CEO
├── Target branża: B2B SaaS → industry = "SaaS", "B2B Software"
├── Target stanowisko: (inferowane) → CMO, VP Marketing, Head of Growth, Founder
├── Frazy problemów: (inferowane) → "B2B marketing", "SaaS growth", "demand generation"
├── Frazy produktowe: (inferowane) → "marketing agency", "B2B marketing services"
└── Hashtagi: (inferowane) → #B2BMarketing, #SaaSGrowth, #DemandGen
```

**AI odpowiada:**

```
Świetnie! Na podstawie tego co powiedziałeś, już skonfigurowałem:

✅ Branża docelowa: B2B SaaS
✅ Stanowiska: CMO, VP Marketing, Head of Growth, Founder/CEO
✅ Słowa kluczowe: "B2B marketing", "SaaS growth", "demand generation"
✅ Hashtagi: #B2BMarketing, #SaaSGrowth, #DemandGen

→ To odblokowało 27/107 intentów (w tym 8 krytycznych)

Teraz mam kilka pytań, żeby odblokować więcej sygnałów.
Możesz odpowiedzieć na wszystkie albo kliknąć "Pomiń"
w dowolnym momencie.

Kto jest Twoją główną konkurencją? Jakie inne agencje
marketingowe rywalizują o tych samych klientów B2B SaaS?
```

**User:** "Konkurują z nami głównie Ladder.io, Refine Labs i Directive Consulting"

**AI odpowiada:**

```
Dodałem 3 competitors:
✅ Ladder.io
✅ Refine Labs
✅ Directive Consulting

→ +9 intentów odblokowanych (4 krytyczne!) → 36/107

Będziemy monitorować kto komentuje ich posty, reaguje
na ich content, i narzeka na ich usługi. To najgorętsze
leady — ludzie, którzy aktywnie patrzą na konkurencję.

A jak duża jest Twoja firma? Ile masz osób w zespole?
```

**User:** "ok. 50 osób"

**AI odpowiada:**

```
✅ Wielkość firmy: ~50 osób

Teraz pytanie o Twoich klientów: jakiego rozmiaru firmy
szukasz? Np. startupy 10-50 osób, mid-market 50-500,
czy enterprise 500+?
```

**User:** "Celujemy w firmy 50-500 osób"

```
✅ Target wielkość firmy: 50-500 pracowników
→ +3 intenty → 39/107

W jakich regionach szukasz klientów? Polska? Europa?
Globalnie?
```

**User:** "Głównie US i UK"

```
✅ Target lokalizacja: US, UK
→ +4 intenty → 43/107

Masz może kilka nazw firm, które są Twoim wymarzonym
klientem — takich, do których chciałbyś się dostać?
```

**User:** "No np. Notion, Figma, Loom, Miro"

```
✅ Target accounts: Notion, Figma, Loom, Miro
→ +10 intentów (2 krytyczne!) → 53/107

Tych 4 firm będziemy monitorować szczególnie intensywnie
— każdą zmianę leadership, hiring, posty, funding.

Czy masz już jakichś istniejących klientów, których mogę
monitorować jako social proof? Kto komentuje ich posty
może być zainteresowany Tobą.
```

**User:** "Mamy Posthog i Hotjar"

```
✅ Istniejący klienci: PostHog, Hotjar
→ +4 intenty → 57/107

Ostatnie pytanie — czy znasz influencerów/thought leaderów
z branży B2B SaaS marketing, których Twoi klienci śledzą?
```

**User:** "skip"

```
Rozumiem! 💪

Masz teraz 57/107 intentów odblokowanych, w tym 18 krytycznych.
To bardzo solidna baza do startu!

Zawsze możesz wrócić do ustawień i dodać więcej danych,
żeby odblokować kolejne intenty.

[🚀 Zacznij szukać leadów]   [⚙️ Dostosuj w formularzu]
```

### Logika AI w trybie konwersacyjnym

#### System prompt dla AI onboardingu

```
Jesteś asystentem onboardingu narzędzia do LinkedIn lead generation.

Twoje cele:
1. Z pierwszej wiadomości usera wyekstrapoluj jak najwięcej danych
2. Dopytuj o brakujące WYMAGANE pola w kolejności priorytetu
3. Po każdej odpowiedzi informuj ile intentów zostało odblokowanych
4. Bądź zwięzły — max 3-4 zdania + pytanie
5. Nie pytaj o więcej niż jedną rzecz na raz
6. Używaj kontekstu odpowiedzi do inferowania powiązanych pól

Kolejność pytań (po ekstrapolacji z pierwszej wiadomości):
1. Competitors (9 intentów, 4 krytyczne) — JEŚLI jeszcze nie podane
2. Target company size — JEŚLI jeszcze nie podane
3. Target lokalizacja — JEŚLI jeszcze nie podane
4. Target accounts (10 intentów) — opcjonalne ale wysokie ROI
5. Istniejący klienci (4 intenty) — opcjonalne
6. Influencerzy branżowi (4 intenty) — opcjonalne
7. Hiring signal roles (6 intentów) — opcjonalne
8. Tech stack / grupy / eventy — opcjonalne, Growth phase

ZAWSZE po odpowiedzi usera:
- Potwierdź co zapisałeś (✅ lista)
- Pokaż delta intentów (→ +X intentów → Y/107)
- Zadaj JEDNO następne pytanie LUB zakończ jeśli required fields done

EKSTRAPOLACJA — z pierwszej wiadomości wyciągnij:
- Typ biznesu usera (agency, SaaS, services, solo)
- Branża docelowa (industry)
- Stanowiska docelowe (infer based on industry + user type)
- Słowa kluczowe problemów (infer based on industry)
- Frazy produktowe (infer based on user's service/product)
- Hashtagi (infer based on industry)
- Lokalizacja (jeśli wspomniana)
- Wielkość target firm (jeśli wspomniana)

Dane do wypełnienia (shared state):
{current_state_json}
```

#### Ekstrapolacja z pierwszej wiadomości — reguły

AI powinno być w stanie wyekstrapolować z jednego zdania:

| Jeśli user powie... | AI ekstrapoluje... |
|---|---|
| "Jestem CEO agencji marketingowej" | Typ: agency, Rola: CEO, Firma: agencja marketingowa |
| "szukam klientów B2B SaaS" | Industry: SaaS, B2B Software; Keywords: "B2B marketing", "SaaS growth" |
| "promowanie biznesów" | Product category: "marketing services", "marketing agency" |
| "prowadzę SaaS do automatyzacji sprzedaży" | Typ: SaaS, Industry: Sales Tech; Keywords: "sales automation"; Competitors: (AI może zasugerować znanych graczy) |
| "pomagam firmom e-commerce" | Industry: E-commerce; Keywords: "e-commerce growth" |
| "jestem freelancerem, robię cold outreach" | Typ: solo, Keywords: "cold outreach", "lead generation" |

#### Kolejność pytań AI — priorytet (po ekstrapolacji)

Pytania posortowane po: (1) ile intentów odblokowują, (2) ile z nich krytycznych, (3) czy required.

| Priorytet | Pytanie | Intentów | Krytycznych | Required? |
|---|---|---|---|---|
| 1 | Kto jest Twoją konkurencją? | 9 | 4 | TAK |
| 2 | Jak duże firmy targetujesz? (wielkość) | 3 | 1 | TAK |
| 3 | W jakich regionach szukasz klientów? | 4 | 1 | TAK |
| 4 | Podaj nazwy wymarzonych firm-klientów | 10 | 4 | NIE |
| 5 | Masz istniejących klientów? | 4 | 1 | NIE |
| 6 | Znasz influencerów z branży? | 4 | 0 | NIE |
| 7 | Jakie role w firmach sygnalizują buying intent? | 6 | 2 | NIE |
| 8 | Jakiego tech stacku używają Twoi prospects? | 5 | 1 | NIE |
| 9 | Jakie konferencje branżowe są kluczowe? | 4 | 0 | NIE |
| 10 | Znasz grupy LinkedIn z Twojej branży? | 3 | 1 | NIE |
| 11 | Kiedy zaczyna się rok budżetowy Twoich klientów? | 4 | 1 | NIE |

Uwaga: Pytania 1-3 są wymagane. AI powinno je zadać zawsze. Pytania 4-11 są opcjonalne — AI zadaje je po kolei, aż user powie "skip" lub "wystarczy".

Uwaga 2: Niektóre pola (stanowisko, branża, keywords, hashtagi, frazy produktowe, firma usera) są wypełniane automatycznie z ekstrapolacji pierwszej wiadomości i NIE wymagają osobnego pytania.

---

## Tryb formularzowy — szczegóły

### Struktura formularza

User może przełączyć się na formularz w każdym momencie. Formularz jest podzielony na sekcje odpowiadające grupom danych. Pola wypełnione przez AI w trybie konwersacyjnym są już uzupełnione.

```
┌──────────────────────────────────────────────┐
│  📋 FORMULARZ KONFIGURACJI                   │
│                                              │
│  ═══ Twoja firma (wymagane) ═══              │
│                                              │
│  Nazwa firmy:      [LeadSignal.io        ]   │
│  LinkedIn URL:     [linkedin.com/company/...]│
│  Typ biznesu:      [▼ Agency / SaaS / ...]   │
│  Profile teamu:    [+ dodaj profil]          │
│                                              │
│  ═══ Ideal Customer Profile (wymagane) ═══   │
│                                              │
│  Target stanowiska:[VP Sales, CRO, ...]  [+] │
│  Target branże:    [SaaS, FinTech, ...]  [+] │
│  Wielkość firmy:   [▼ 50-200]                │
│  Lokalizacja:      [US, UK, ...]         [+] │
│                                              │
│  ═══ Keywords i frazy (wymagane) ═══         │
│                                              │
│  Frazy problemów:  ["cold outreach", ...]  +  │
│  Frazy produktowe: ["sales automation", ...] +│
│  Hashtagi:         [#SalesTech, ...]       + │
│                                              │
│  ═══ Competitors (wymagane) ═══              │
│                                              │
│  Firma 1: [Dripify        ] [linkedin URL]   │
│  Firma 2: [Expandi        ] [linkedin URL]   │
│  [+ Dodaj competitor]                        │
│                                              │
│  ═══ Opcjonalne — więcej intentów ═══        │
│                                              │
│  ▸ Target accounts (10 intentów)     [▸]     │
│  ▸ Istniejący klienci (4 intenty)    [▸]     │
│  ▸ Thought leaderzy (4 intenty)      [▸]     │
│  ▸ Hiring signal roles (6 intentów)  [▸]     │
│  ▸ Tech stack (5 intentów)           [▸]     │
│  ▸ Konferencje/eventy (4 intenty)    [▸]     │
│  ▸ Grupy LinkedIn (3 intenty)        [▸]     │
│  ▸ Fiscal year (4 intenty)           [▸]     │
│                                              │
└──────────────────────────────────────────────┘
```

Kluczowe zasady formularza:
- **Sekcje opcjonalne są domyślnie zwinięte** z informacją ile intentów odblokują
- **Tag inputs** dla list (stanowiska, branże, keywords) — user wpisuje i enterem dodaje
- **Auto-suggest** z LinkedIn URL validation dla firm i profili
- **Real-time intent counter update** po każdej zmianie pola
- **Pola wypełnione przez AI mają badge "AI-suggested"** — user może edytować lub usunąć

---

## Model danych — shared state

```typescript
interface OnboardingState {
  // ═══ Twoja firma ═══
  companyName: string | null;
  companyLinkedInUrl: string | null;
  businessType: 'agency' | 'saas' | 'services' | 'solo' | 'other' | null;
  teamProfiles: string[];                 // LinkedIn URLs

  // ═══ ICP — wymagane ═══
  targetJobTitles: string[];              // VP Sales, CRO, Head of Growth...
  targetIndustries: string[];             // SaaS, FinTech, B2B Services...
  targetCompanySize: string | null;       // "11-50", "51-200", "201-1000", "1000+"
  targetLocations: string[];              // Poland, US, DACH...

  // ═══ Keywords — wymagane ═══
  problemKeywords: string[];              // "cold outreach", "low reply rate"...
  productCategoryPhrases: string[];       // "sales automation", "lead gen platform"...
  industryHashtags: string[];             // #SalesTech, #ABM...

  // ═══ Competitors — wymagane ═══
  competitors: CompetitorEntry[];
  
  // ═══ Opcjonalne ═══
  targetAccounts: CompanyEntry[];
  existingCustomers: CompanyEntry[];
  thoughtLeaders: string[];              // LinkedIn profile URLs
  hiringSignalRoles: string[];           // SDR, BDR, RevOps...
  targetTechStack: string[];             // HubSpot, Salesforce...
  industryEvents: string[];              // SaaStr, Dreamforce...
  linkedInGroups: string[];              // LinkedIn group URLs
  fiscalYearStart: number | null;        // 1-12 (month)

  // ═══ Meta ═══
  completedViaChat: boolean;
  completedViaForm: boolean;
  onboardingCompleted: boolean;
  unlockedIntentsCount: number;
  unlockedCriticalCount: number;
}

interface CompetitorEntry {
  name: string;
  linkedInUrl?: string;
  source: 'user' | 'ai-suggested';
}

interface CompanyEntry {
  name: string;
  linkedInUrl?: string;
  source: 'user' | 'ai-suggested';
}
```

---

## Logika obliczania odblokowanych intentów

### Mapping: pole → ile intentów odblokowuje

```typescript
const intentUnlockRules: IntentRule[] = [
  // ═══ Z ekstrapolacji pierwszej wiadomości (auto) ═══
  { field: 'targetJobTitles',       minItems: 1, intents: 7,  critical: 3, label: 'Stanowiska ICP' },
  { field: 'targetIndustries',      minItems: 1, intents: 4,  critical: 1, label: 'Branża ICP' },
  { field: 'problemKeywords',       minItems: 1, intents: 11, critical: 5, label: 'Frazy problemów' },
  { field: 'productCategoryPhrases',minItems: 1, intents: 5,  critical: 2, label: 'Frazy produktowe' },
  { field: 'industryHashtags',      minItems: 1, intents: 3,  critical: 0, label: 'Hashtagi' },
  { field: 'companyName',           minItems: null, intents: 5, critical: 2, label: 'Twoja firma' },
  
  // ═══ Z pytań AI (required) ═══
  { field: 'competitors',           minItems: 1, intents: 9,  critical: 4, label: 'Competitors' },
  { field: 'targetCompanySize',     minItems: null, intents: 3, critical: 1, label: 'Wielkość firmy' },
  { field: 'targetLocations',       minItems: 1, intents: 4,  critical: 1, label: 'Lokalizacja' },

  // ═══ Z pytań AI (opcjonalne) ═══
  { field: 'targetAccounts',        minItems: 1, intents: 10, critical: 4, label: 'Target accounts' },
  { field: 'existingCustomers',     minItems: 1, intents: 4,  critical: 1, label: 'Klienci' },
  { field: 'thoughtLeaders',        minItems: 1, intents: 4,  critical: 0, label: 'Influencerzy' },
  { field: 'hiringSignalRoles',     minItems: 1, intents: 6,  critical: 2, label: 'Hiring roles' },
  { field: 'targetTechStack',       minItems: 1, intents: 5,  critical: 1, label: 'Tech stack' },
  { field: 'industryEvents',        minItems: 1, intents: 4,  critical: 0, label: 'Eventy' },
  { field: 'linkedInGroups',        minItems: 1, intents: 3,  critical: 1, label: 'Grupy LinkedIn' },
  { field: 'fiscalYearStart',       minItems: null, intents: 4, critical: 1, label: 'Fiscal year' },
  { field: 'teamProfiles',          minItems: 1, intents: 3,  critical: 2, label: 'Profile teamu' },

  // ═══ Zawsze odblokowane (rule engine, temporal) ═══
  // 5 intentów z kalendarza (Q1, Q-end, Q4 budgeting, etc.) — zawsze aktywne
];

// Pola zawsze aktywne (wbudowane, nie wymagają inputu):
// - Timing signals (5 intentów): Q1, koniec kwartału, sezon budżetowania — ZAWSZE ON
// - AI behavioral patterns (bazowe): buying journey, research mode — aktywne jeśli
//   jest wystarczająco dużo danych z innych źródeł

const ALWAYS_UNLOCKED = 5; // temporal/calendar signals

function calculateUnlockedIntents(state: OnboardingState): IntentSummary {
  let total = ALWAYS_UNLOCKED;
  let critical = 0;
  const categories = [];

  for (const rule of intentUnlockRules) {
    const value = state[rule.field];
    let filled = false;
    
    if (rule.minItems === null) {
      filled = value !== null && value !== '';
    } else if (Array.isArray(value)) {
      filled = value.length >= rule.minItems;
    }

    if (filled) {
      total += rule.intents;
      critical += rule.critical;
      categories.push({ label: rule.label, intents: rule.intents, critical: rule.critical });
    }
  }

  return { total, critical, categories, maxTotal: 107, progress: total / 107 };
}
```

### Dynamiczny hint — "co podać dalej"

System zawsze liczy: "gdyby user podał X, odblokuje Y intentów (Z krytycznych)" i wyświetla podpowiedź o najwartościowszym następnym inputcie.

```typescript
function getNextBestHint(state: OnboardingState): Hint {
  const unfilled = intentUnlockRules
    .filter(rule => {
      const value = state[rule.field];
      if (rule.minItems === null) return value === null || value === '';
      return !Array.isArray(value) || value.length < rule.minItems;
    })
    .sort((a, b) => {
      // Sortuj po: (1) critical desc, (2) intents desc
      if (b.critical !== a.critical) return b.critical - a.critical;
      return b.intents - a.intents;
    });

  if (unfilled.length === 0) return null;
  
  const best = unfilled[0];
  return {
    field: best.field,
    label: best.label,
    intents: best.intents,
    critical: best.critical,
    message: `Podaj ${best.label}, aby odblokować ${best.intents} nowych intentów` 
             + (best.critical > 0 ? ` (${best.critical} krytycznych)` : '')
  };
}
```

---

## Przejścia między trybami

### Chat → Formularz

User klika przycisk "📋 Formularz". Pola formularza są pre-filled danymi z konwersacji. Pola wypełnione przez AI mają badge "🤖 AI-suggested" i tooltip z wyjaśnieniem skąd AI wywnioskowało tę wartość.

```
Target stanowiska: [VP Sales ✕] [CRO ✕] [Head of Growth ✕]
                    🤖 AI-suggested na podstawie: "agencja marketingowa, B2B SaaS"
```

### Formularz → Chat

User klika "💬 Rozmowa". AI widzi aktualny stan formularza i kontynuuje od miejsca, w którym skończył — nie pyta o rzeczy już wypełnione.

```
Widzę, że wypełniłeś już competitors, ICP i keywords w formularzu.

Brakuje Ci jeszcze target accounts i istniejących klientów.
Chcesz mi o nich opowiedzieć, czy wolisz przejść dalej?
```

---

## Przycisk "Pomiń i zacznij"

Widoczny **zawsze** na dole ekranu po wypełnieniu minimum required fields (competitors, ICP, keywords, firma). Przed wypełnieniem wymaganych pól przycisk jest disabled z tooltipem "Wypełnij wymagane pola, aby kontynuować".

Stany przycisku:
- **< 4 required fields filled:** `[Wypełnij wymagane pola...]` (disabled, szary)
- **Required fields filled, < 50% intentów:** `[Zacznij z ${X}/107 intentami →]` (aktywny, ale z notatką "Dodaj więcej danych, żeby zwiększyć skuteczność")
- **> 50% intentów:** `[🚀 Zacznij szukać leadów (${X}/107 intentów)]` (aktywny, zielony)
- **> 80% intentów:** `[🚀 Start — masz ${X}/107 intentów, świetna konfiguracja!]` (aktywny, celebration)

---

## Walidacja i error handling

### Walidacja inputów

| Pole | Walidacja | Error message |
|---|---|---|
| LinkedIn URL firmy | Regex: `linkedin.com/company/` | "Podaj prawidłowy URL strony firmowej LinkedIn" |
| LinkedIn URL profilu | Regex: `linkedin.com/in/` | "Podaj prawidłowy URL profilu LinkedIn" |
| Competitors | Min 1, max 20 | "Dodaj przynajmniej jednego competitora" |
| Target job titles | Min 1, max 20 | "Dodaj przynajmniej jedno stanowisko docelowe" |
| Target industries | Min 1, max 10 | "Wybierz przynajmniej jedną branżę" |
| Keywords | Min 3, max 30 | "Dodaj przynajmniej 3 słowa kluczowe" |
| Company size | Jedna z predefiniowanych opcji | — (dropdown) |
| Lokalizacja | Min 1, max 20 | "Wybierz przynajmniej jedną lokalizację" |

### AI error recovery

Jeśli AI nie może wyekstrapolować informacji z wiadomości:

```
Hmm, nie jestem pewien czym dokładnie się zajmujesz.
Możesz powiedzieć w jednym zdaniu: co sprzedajesz
i komu?

Na przykład:
• "Sprzedaję narzędzie do automatyzacji cold outreach dla SDR teamów"
• "Prowadzę agencję SEO dla firm e-commerce"
• "Szukam klientów na usługi konsultingowe w HR Tech"
```

---

## Tech stack implementacji

| Komponent | Technologia |
|---|---|
| Frontend | React/Next.js + Tailwind |
| Chat UI | Custom component (nie gotowa biblioteka — pełna kontrola nad UX) |
| AI backend | Claude API (streaming) z system promptem onboardingowym |
| State management | Zustand lub React Context (shared state między chat i formularzem) |
| Intent calculation | Client-side (reguły w JS, instant feedback) |
| Animacje | Framer Motion (counter animation, progress bar, category unlock) |
| Persistencja | Auto-save do localStorage + backend sync co 10s |
| LinkedIn URL validation | Async validation z regex + opcjonalnie ping API |

### API endpoints

```
POST /api/onboarding/chat
  Body: { message: string, currentState: OnboardingState }
  Response: { 
    reply: string,                    // AI response text
    stateUpdates: Partial<OnboardingState>,  // pola do zaktualizowania
    extractedFields: string[],        // które pola AI wyekstrapolował
    confidence: Record<string, number> // pewność ekstrapolacji per pole
  }

POST /api/onboarding/complete
  Body: { state: OnboardingState }
  Response: { success: boolean, initialIntentCount: number }

GET /api/onboarding/intent-count
  Query: { state: JSON }
  Response: { total: number, critical: number, categories: Category[] }
```

### System prompt — pełna wersja

```
SYSTEM: Jesteś asystentem onboardingu narzędzia do lead generation
opartego na intent signals z LinkedIn.

TWÓJ CEL: W jak najmniejszej liczbie wiadomości wyekstrapolować
i zebrać od usera dane potrzebne do skonfigurowania monitoringu
intent signals.

ZASADY:
1. Z PIERWSZEJ wiadomości usera wyciągnij MAKSIMUM informacji.
   Nie pytaj o rzeczy, które możesz wywnioskować.
2. Po każdej odpowiedzi podsumuj CO ZAPISAŁEŚ (✅ lista).
3. Po każdej odpowiedzi pokaż DELTA intentów (→ +X intentów → Y/107).
4. Zadawaj JEDNO pytanie na raz. Nigdy więcej.
5. Nie powtarzaj pytań o już wypełnione pola.
6. Bądź ZWIĘZŁY. Max 4 zdania + 1 pytanie.
7. Jeśli user powie "skip", "pomiń", "wystarczy" — zakończ.
8. Używaj emoji oszczędnie (✅ dla potwierdzeń, → dla intentów).

KOLEJNOŚĆ PYTAŃ (po ekstrapolacji):
1. Competitors — "Kto jest Twoją konkurencją?"
2. Target company size — "Jak duże firmy targetujesz?"
3. Target location — "W jakich regionach szukasz klientów?"
4. Target accounts — "Masz wymarzonych klientów-firmy?"
5. Existing customers — "Masz istniejących klientów?"
6. Thought leaders — "Znasz influencerów z branży?"
7. Hiring roles — "Jakie role sygnalizują buying intent?"
(Pomiń pytania, na które masz już odpowiedź z kontekstu.)

EKSTRAPOLACJA — z pierwszej wiadomości ZAWSZE próbuj wyciągnąć:
- businessType: agency / saas / services / solo
- targetIndustries: branża docelowa
- targetJobTitles: stanowiska docelowe (inferuj na bazie branży i typu)
- problemKeywords: słowa kluczowe problemów (inferuj na bazie branży)
- productCategoryPhrases: jak prospects opisują rozwiązanie usera
- industryHashtags: hashtagi branżowe
- companyName: nazwa firmy usera (jeśli podana)
- targetLocations: lokalizacja (jeśli podana)
- targetCompanySize: wielkość firm (jeśli podana)

ODPOWIEDŹ zawsze w formacie JSON + text:
{
  "reply": "Tekst odpowiedzi dla usera",
  "stateUpdates": { ... pola do zaktualizowania ... },
  "extractedFields": ["targetIndustries", "targetJobTitles", ...],
  "nextQuestion": "competitors" | "companySize" | ... | "done",
  "confidence": { "targetIndustries": 0.9, "targetJobTitles": 0.7 }
}

AKTUALNY STAN:
{current_state}
```

---

## Metryki sukcesu onboardingu

| Metryka | Target | Jak mierzyć |
|---|---|---|
| Czas do completed required fields | < 3 minuty | Timestamp first message → required fields filled |
| Czas do kliknięcia "Zacznij" | < 5 minut | Timestamp first message → onboarding complete |
| % userów, którzy wypełnią required fields | > 80% | Funnel: started onboarding → required fields done |
| % userów, którzy podadzą ≥1 opcjonalny input | > 60% | count(optional fields > 0) / count(completed) |
| Średnia liczba odblokowanych intentów | > 50/107 | avg(unlocked intents at completion) |
| % userów używających trybu chat vs formularz | Track ratio | analytics event per mode switch |
| Drop-off point | Identify | Który krok/pytanie powoduje porzucenie |

---

## Iteracje post-MVP

### V1.1 — Smart suggestions
- AI sugeruje competitors na podstawie branży ("W branży B2B SaaS marketing, popularne agencje to: Directive, Refine Labs, Ladder. Czy to Twoja konkurencja?")
- Auto-complete hashtagów i keywords z bazy popularnych per industry
- LinkedIn URL auto-resolve (user wpisuje "Dripify" → system szuka i proponuje URL)

### V1.2 — Progressive onboarding
- Po 7 dniach użytkowania: "Hej, dodaj influencerów z branży, żeby odblokować 4 nowe intent signals"
- Kontekstowe sugestie: "Zauważyliśmy dużo aktywności z firmy X. Dodaj ją do target accounts?"
- "Twoi leady często komentują posty [influencer]. Dodaj go do monitoringu?"

### V1.3 — Import & integrations
- Import competitors z CSV/Google Sheets
- Import z CRM (HubSpot, Pipedrive) — pull target accounts, existing customers, ICP criteria
- LinkedIn Sales Navigator import — pull saved leads jako target accounts
- "Connect your CRM" jako alternatywna ścieżka onboardingu

---

*Dokument przygotowany 26.02.2026 jako część planu implementacji LinkedIn Lead Generation & Outreach Tool.*
