// Mappa per il Rate Limiting (in memoria)
const requestLogs = new Map();

exports.handler = async function(event, context) {
    // 1. Sicurezza: Accetta solo POST
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    // 2. Sicurezza: Verifica il Referer (deve provenire dal tuo sito)
    const referer = event.headers.referer || "";
    if (!referer.includes("clever-genie-a00ce2.netlify.app")) {
        return { statusCode: 403, body: "Accesso non autorizzato" };
    }

    // 3. Sicurezza: Rate Limiting semplice (max 5 richieste al minuto per IP/Sessione)
    const clientIp = event.headers['client-ip'] || 'unknown';
    const now = Date.now();
    const userHistory = requestLogs.get(clientIp) || [];
    const recentRequests = userHistory.filter(time => now - time < 60000);
    
    if (recentRequests.length >= 5) {
        return { statusCode: 429, body: "Troppe richieste, riprova tra un minuto." };
    }
    recentRequests.push(now);
    requestLogs.set(clientIp, recentRequests);

    try {
        const bodyData = JSON.parse(event.body || "{}");
        // Pulizia input: limitiamo la lunghezza per evitare abusi di token
        const topic = (bodyData.topic || "").substring(0, 100);
        const vibe = (bodyData.vibe || "Curiosity");
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return { statusCode: 500, body: JSON.stringify({ error: "Errore configurazione" }) };
        }

        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "Sei un copywriter esperto di TikTok. Rispondi solo con 3 hook pronti all'uso, senza introduzioni extra." },
                    { role: "user", content: `Argomento: ${topic}. Stile: ${vibe}` }
                ],
                max_tokens: 300, // Limite token per evitare consumi eccessivi
                temperature: 0.7
            })
        });

        const data = await aiResponse.json();
        const hooks = data.choices[0].message.content;

        return {
            statusCode: 200,
            body: JSON.stringify({ hooks })
        };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: "Errore interno" }) };
    }
};
