import {FastifyInstance} from "fastify";
import {z} from "zod";
import {prisma} from "../lib/prisma";
import {openai} from "../lib/openai";
import {OpenAIStream, streamToResponse} from "ai";

export async function generateAiCompletionRoute(app: FastifyInstance) {
  app.post("/ai/complete", async (request, reply) => {
    try {
      const bodySchema = z.object({
        videoId: z.string().uuid(),
        prompt: z.string(),
        temperature: z.number().min(0).max(1).default(0.5),
      })

      const { videoId, prompt, temperature } = bodySchema.parse(request.body);

      const video = await prisma.video.findUniqueOrThrow({
        where: {
          id: videoId,
        }
      })

      if (!video.transcription) {
        return reply.status(400).send({
          error: "Transcription not found."
        })
      }

      const promptMessage = prompt.replace("{transcription}", video.transcription);

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-16k",
        temperature: temperature,
        messages: [
          { role: "user", content: promptMessage }
        ],
        stream: true,
      })

      const stream = OpenAIStream(response);

      streamToResponse(stream, reply.raw, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        }
      });
    } catch (e) {
      return reply.status(500).send({
        error: e
      })
    }
  });
}
