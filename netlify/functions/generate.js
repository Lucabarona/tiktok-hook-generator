const OpenAI = require("openai");

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { topic, vibe } = JSON.parse(event.body);
        
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        const prompt = `Act as an elite copywriter and viral growth expert for TikTok and Reels. 
        The user's video topic is: "${topic}".
        The chosen vibe/angle is: "${vibe}".
        Generate 3 high-converting, non-cliché hooks and 3 relevant niche hashtags. 
        Format the response clearly with numbers for hooks and a hashtag line at the bottom.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ result: response.choices[0].message.content })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
