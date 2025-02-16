import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

import dotenv from "dotenv";
dotenv.config();

export async function main(prompt,trained) {
    const client = ModelClient(
        "https://models.github.ai/inference",
        new AzureKeyCredential(process.env.NEXT_PUBLIC_GITHUB_TOKEN)
        
    );

    const response = await client.path("/chat/completions").post({
        body: {
            messages: [
                { role: "system", content: trained},
                { role: "user", content: prompt }
            ],
            model: "Mistral-small",
            temperature: 0.8,
            max_tokens: 2048,
            top_p: 0.1
        }
    });

    if (isUnexpected(response)) {
        throw response.body.error;
    }
    return response.body.choices[0].message.content;
}
