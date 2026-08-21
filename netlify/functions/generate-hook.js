exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const bodyData = JSON.parse(event.body || "{}");
        const topic = bodyData.topic || "Generale";
        const vibe = bodyData.vibe || "Curiosity";
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return { statusCode: 500, body: JSON.stringify({ error: "API Key mancante nelle impostazioni di Netlify" }) };
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
                    { role: "system", content: "Sei un esperto di copywriting virale per TikTok. Genera 3 hook potenti e brevi basati sull'argomento e sul vibe fornito." },
                    { role: "user", content: `Argomento: ${topic}, Vibe: ${vibe}` }
                ],
                temperature: 0.8
            })
        });

        const data = await aiResponse.json();
        
        if (!data.choices || data.choices.length === 0) {
            return { statusCode: 500, body: JSON.stringify({ error: "Errore da OpenAI", details: data }) };
        }

        const hooks = data.choices[0].message.content;

        return {
            statusCode: 200,
            body: JSON.stringify({ hooks })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
