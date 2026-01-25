
export interface DialogueEntry {
  id: string;
  text: string[]; // Array di stringhe per dialoghi a più pagine
}

export const WorldDialogues: Record<string, string[]> = {
  // --- STORIA PRINCIPALE ---
  intro_sequence: [
    "Ehi... amore?",
    "Ma dove siamo finiti?",
    "Sembra che siamo stati risucchiati dentro la TV!",
    "Tutto il mondo è fatto di... pixel?",
    "Non preoccuparti, troveremo il modo di uscire.",
    "Basta che restiamo insieme."
  ],

  // --- INTERAZIONI CON OGGETTI (CASA VOSTRA) ---
  // Inserisci questi ID negli oggetti sulla mappa di Tiled
  sofa_check: [
    "È il nostro divano!",
    "Sembra comodissimo anche in 8-bit.",
    "Perfetto per le coccole e Netflix."
  ],

  kitchen_fridge: [
    "C'è un post-it sopra:",
    "'Ricordati di comprare il cioccolato per lei'",
    "Che dolce..."
  ],

  photo_frame: [
    "È una foto del nostro primo viaggio.",
    "Sembravamo così giovani!",
    "Anche se in pixel, sei sempre bellissima."
  ],

  bed_sleep: [
    "Zzz...",
    "Sognando il nostro futuro insieme."
  ],

  // --- INTERAZIONE CON IL TUO AVATAR ---
  // Se lei preme spazio mentre guarda il tuo personaggio
  partner_talk_default: [
    "Ti copro le spalle, sempre.",
    "Andiamo a caccia di ricordi!"
  ],

  partner_talk_love: [
    "Sai che ti amo più di ogni altra cosa?",
    "Anche più del butter chicken"
  ]
};

// --- TESTI DI BATTAGLIA (MOSSE & NEMICI) ---
export const BattleText = {
  moves: {
    hug: "Hai usato ABBRACCIO! L'ansia del nemico svanisce.",
    kiss: "Hai usato BACIO! È superefficace! Il cuore batte forte.",
    listen: "Hai ascoltato pazientemente. Il nemico si sente compreso.",
    laugh: "Hai raccontato una battuta interna. Ridete insieme!"
  },

  enemies: {
    stress: "Appare lo STRESS QUOTIDIANO!",
    distance: "Appare la DISTANZA! (Ma non fa paura)",
    bad_day: "Appare una GIORNATACCIA!"
  },

  victory: [
    "Abbiamo vinto!",
    "Niente può fermarci quando siamo uniti."
  ]
};

// --- IL FINALE (Quando trova l'oggetto finale) ---
export const EndGameLetter = [
  "Hai trovato il 'Cuore di Pixel'!",
  "Aspetta, c'è un messaggio inciso sopra...",
  "Leggilo attentamente...",
  // QUI SCRIVI LA TUA DEDICA REALE
  "Siamo tornati nel mondo reale.",
  "Ma ricorda: la nostra avventura è appena iniziata.",
  "Ti amo. [Tuo Nome]"
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets a random string from an array
 */
export function getRandomText(texts: string[]): string {
  return texts[Math.floor(Math.random() * texts.length)];
}

/**
 * Gets dialogue by ID with fallback
 */
export function getDialogue(dialogueId: string): string[] {
  return WorldDialogues[dialogueId] || ['...'];
}

/**
 * Gets a random partner dialogue (mix of default and love)
 */
export function getPartnerDialogue(): string[] {
  const useLoving = Math.random() < 0.3; // 30% chance for love dialogue
  const pool = useLoving
    ? WorldDialogues.partner_talk_love
    : WorldDialogues.partner_talk_default;

  // Return a random single line as dialogue
  return [getRandomText(pool)];
}

/**
 * Gets a move description from BattleText
 */
export function getMoveDescription(moveId: string): string {
  const moveKey = moveId as keyof typeof BattleText.moves;
  return BattleText.moves[moveKey] || `Hai usato ${moveId}!`;
}

/**
 * Gets a random victory message
 */
export function getVictoryMessage(): string {
  return getRandomText(BattleText.victory);
}

// ============================================================================
// DATE NIGHT MINI-GAME DATA
// ============================================================================

export interface DateOption {
  text: string;
  score: number; // 0 = Bad, 1 = Ok, 2 = Perfect
  response: string[]; // Partner's reaction
}

export interface DateQuestion {
  id: string;
  question: string;
  options: DateOption[];
}

export const DateQuestions: DateQuestion[] = [
  {
    id: 'food',
    question: "Che ordiniamo da mangiare?",
    options: [
      { text: "Solo un'insalata scondita.", score: 0, response: ["Oh... sei a dieta?", "Che tristezza..."] },
      { text: "La torta al cioccolato gigante!", score: 2, response: ["Sì! È per questo che ti amo!", "Dividiamola!"] },
      { text: "Un semplice caffè.", score: 1, response: ["Semplice ed elegante.", "Mi piace."] }
    ]
  },
  {
    id: 'topic_vacation',
    question: "Dove vorresti andare per la prossima vacanza?",
    options: [
      { text: "Rimaniamo a casa a programmare.", score: 1, response: ["Produttivo... ma un po' noioso?", "Fermati un attimo!"] },
      { text: "In Giappone!", score: 2, response: ["Voglio vedere Akihabara!", "Sarebbe un sogno!"] },
      { text: "Da mia madre.", score: 0, response: ["Ehm... certo...", "Forse un'altra volta?"] }
    ]
  },
  {
    id: 'compliment',
    question: "Cosa noti di diverso in me?",
    options: [
      { text: "Hai cambiato pettinatura?", score: 1, response: ["Quasi...", "Ci sei vicino."] },
      { text: "Sei pixelata come sempre.", score: 0, response: ["Spiritoso...", "Molto divertente."] },
      { text: "Quel sorriso illumina la stanza.", score: 2, response: ["Aw, smettila!", "Arrossisco..."] }
    ]
  },
  {
    id: 'activity',
    question: "Cosa facciamo dopo il caffè?",
    options: [
      { text: "Andiamo a combattere mostri!", score: 2, response: ["Sì! Spacchiamo tutto!", "Sono carica!"] },
      { text: "Andiamo a dormire.", score: 0, response: ["Già stanco?", "Che noia..."] },
      { text: "Facciamo una passeggiata.", score: 1, response: ["Romantico.", "Mi piace l'idea."] }
    ]
  }
];

/**
 * Get random unique questions for the date
 */
export function getRandomDateQuestions(count: number): DateQuestion[] {
  // Shuffle array
  const shuffled = [...DateQuestions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
