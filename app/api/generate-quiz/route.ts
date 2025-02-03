import { z } from "zod";
import { questionSchema, questionsSchema } from "@/lib/schemas";
import { google } from "@ai-sdk/google";
import { streamObject } from "ai";

export const maxDuration = 300; // Increased to 5 minutes for larger PDFs

export async function POST(req: Request) {
  const { files } = await req.json();
  const firstFile = files[0].data;

  const result = streamObject({
    model: google("gemini-1.5-pro-latest"),
    messages: [
      {
        role: "system",
        content:
          "You are a teacher. Your job is to take a document and create a multiple-choice test with questions based on its content length. " +
          "Generate a minimum of 2 questions and a maximum of 15 questions, depending on the depth and complexity of the content. " +
          "Each question should have 4 options of roughly equal length. " +
          "Focus on key topics and ensure the questions cover the most important parts of the document.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Create a multiple-choice test based on this document. Generate between 2 and 15 questions, depending on the content length and complexity.",
          },
          {
            type: "file",
            data: firstFile,
            mimeType: "application/pdf",
          },
        ],
      },
    ],
    schema: questionSchema,
    output: "array",
    onFinish: ({ object }) => {
      const res = questionsSchema.safeParse(object);
      if (res.error) {
        throw new Error(res.error.errors.map((e) => e.message).join("\n"));
      }
    },
  });

  return result.toTextStreamResponse();
}
