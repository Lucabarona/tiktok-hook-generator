const requestLogs = new Map();

export default async function handler(req, res) {
    // 1. Sicurezza: Accetta solo POST
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    // 2. Sicurezza: Rate Limiting (max 5 richieste al minuto per utente)
    const clientIp = req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    const userHistory = requestLogs.get(clientIp) || [];
    const recentRequests = userHistory.filter(time => now - time < 60000);
    
    if (recentRequests.length >= 5) {
        return res.status(429).json({ error: "Troppe richieste, riprova tra un minuto." });
    }
    recentRequests.push(now);
    requestLogs.set(clientIp, recentRequests);

    try {
        const bodyData = req.body || {};
        const topic = (bodyData.topic || "").substring(0, 100);
        const vibe = (bodyData.vibe || "Curiosity");
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: "Errore configurazione API" });
        }

        // Prompt aggiornato senza asterischi o markdown per un output pulito nel box di testo
        const systemPrompt = `Sei un esperto di copywriting virale e video strategy per TikTok. 
Analizza l'argomento fornito dall'utente. Se l'argomento NON riguarda la creazione di contenuti, i social media, il business, il lifestyle o argomenti simili ma è completamente a vanvera o senza senso, rispondi ESATTAMENTE così: '❌ Per favore, inserisci un argomento valido legato ai social media o alla creazione di contenuti per generare hook efficaci!'. 

Se invece l'argomento è valido, genera 3 hook professionali strutturati rigorosamente sulla regola dei 3 canali sensoriali per azzerare lo scroll nei primi 3 secondi. 

IMPORTANTE: Non usare mai asterischi (*), grassetti o altri simboli di formattazione Markdown nel testo. Scrivi tutto in formato testo pulito seguendo esattamente questo schema per ogni opzione:

Opzione 1
- Visual (Cosa mostrare a schermo): [Descrizione della scena visiva]
- Titolo Scritto (Testo in alto): [Il testo breve da leggere]
- Hook Parlato (Cosa dire a voce): [La prima frase da pronunciare]
Hashtag: [3-4 hashtag pertinenti]

(Ripeti la stessa struttura pulita per Opzione 2 e Opzione 3, senza inserire asterischi).`;

        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ` + apiKey
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Argomento: ${topic}. Stile/Vibe: ${vibe}` }
                ],
                max_tokens: 500,
                temperature: 0.7
            })
        });

        const data = await aiResponse.json();
        
        if (!data.choices || data.choices.length === 0) {
            return res.status(500).json({ error: "Errore di risposta da OpenAI" });
        }

        const hooks = data.choices[0].message.content;

        return res.status(200).json({ hooks });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
