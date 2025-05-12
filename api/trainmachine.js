"use client"
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import dotenv from "dotenv";

dotenv.config();

const token = process.env.NEXT_PUBLIC_GITHUB_TOKEN;

export async function trainmachine(array) {
    const client = ModelClient(
        "https://models.github.ai/inference",
        new AzureKeyCredential(token)
    );

    const response = await client.path("/chat/completions").post({
        body: {
            messages: [
                { role: "system", content: "You will be given a set of questions. Your task is to extract key details, intent, and recurring themes from these questions and provide a concise summary. Ensure the summary is structured in a way that another AI can use it to generate responses as if it remembers past interactions. Preserve important names, dates, numbers, and specific topics mentioned in the questions while omitting unnecessary details. Format your response as a structured summary that can be used as a context prompt for another AI." },
                { role: "user", content: array.join() }
            ],
            model: "Ministral-3B",
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
