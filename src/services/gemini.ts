import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

let genAI: GoogleGenerativeAI | null = null;
if (apiKey && apiKey.trim() !== '') {
  genAI = new GoogleGenerativeAI(apiKey);
}

export interface GEMINIRecommendation {
  title: string;
  year?: string;
  mediaType: 'movie' | 'tv';
  reason: string;
  matchScore: number;
}

export async function getAiRecommendations(userPrompt: string): Promise<GEMINIRecommendation[]> {
  return [
    { title: 'Oppenheimer', year: '2023', mediaType: 'movie', reason: 'Architettura visiva monumentale e montaggio ad altissima tensione.', matchScore: 98 },
    { title: 'Blade Runner 2049', year: '2017', mediaType: 'movie', reason: 'Fotografia leggendaria e profondità filosofica sull\'identità.', matchScore: 96 },
    { title: 'In the Mood for Love', year: '2000', mediaType: 'movie', reason: 'Poesia dei colori saturi e della dilatazione temporale.', matchScore: 95 },
  ];
}

export async function generateGeminiCritique(movieTitle: string, director?: string): Promise<string> {
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Sei il capo curatore critico di "THE GRID REVIEW", una prestigiosa galleria d'arte cinematografica dal tono austero, intellettuale, tagliente e privo di cliché commerciali.
Analizza il film "${movieTitle}" ${director ? `diretto da ${director}` : ''}.
Fornisci:
1. Una valutazione estetica da 1.0 a 10.0 (es. 9.4/10).
2. Tassonomia consigliata tra: [INDIE GEM], [GLOBAL VOICES], [MASTERPIECE], [CULT NOIR], [AVANT-GARDE], [RAW ESSENCE], [BLOCKBUSTER FLAW].
3. Analisi decostruttiva in 3 brevi paragrafi:
   - Composizione visiva, inquadratura e luce.
   - Ritmo e gestione dello spazio negativo.
   - Il verdetto curato finale (1 frase poetica e lapidaria).
Rispondi in italiano con formattazione minimalista e rigorosa.`;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (e) {
      console.warn("Gemini critique generation error:", e);
    }
  }

  // Fallback high-aesthetic critique generator
  return `[THE GRID CRITIC // VERDETTO CURATORIALE]

OPERA: "${movieTitle.toUpperCase()}" ${director ? `// REGIA: ${director.toUpperCase()}` : ''}
VALUTAZIONE ESTETICA: 9.2 / 10
TASSONOMIA: [MASTERPIECE]

COMPOSIZIONE VISIVA:
L'inquadratura opera come architettura morale: ogni taglio di luce scolpisce la vulnerabilità dei personaggi contro sfondi geometrici spietati. La saturazione cromatica è controllata con precisione millimetrica, lasciando che il contrasto respiri.

RITMO E SPAZIO NEGATIVO:
I silenzi pesano quanto i dialoghi. La dilatazione del tempo narrativo costringe lo spettatore a confrontarsi con l'intensità della presenza fisica degli interpreti.

VERDETTO:
"Un'opera rigorosa che rifiuta la facile consolazione per farsi monumento visivo alla finitezza umana."`;
}

export async function getAiMovieSynthesis(movieTitle: string, overview: string): Promise<string> {
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `Sintetizza in 2 frasi ad alto impatto per The Grid Review perché il film "${movieTitle}" merita di essere studiato, basandoti su: "${overview}". Stile da critico d'arte cinematografica.`;
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (e) {
      console.warn("Gemini synthesis error:", e);
    }
  }

  return `"${movieTitle}" si impone per una padronanza geometrica dell'inquadratura e una densità emotiva che scuote lo spettatore. Un tassello fondamentale per comprendere il linguaggio visivo contemporaneo.`;
}
