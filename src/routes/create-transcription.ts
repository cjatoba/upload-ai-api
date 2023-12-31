import {FastifyInstance} from "fastify";
import {z} from "zod";
import {createReadStream} from "fs";
import {prisma} from "../lib/prisma";
import {openai} from "../lib/openai";

export async function createTranscriptionRoute(app: FastifyInstance) {
  app.post("/videos/:videoId/transcription", async (request, reply) => {
    try {
      const paramsSchema = z.object({
        videoId: z.string().uuid(),
      })

      const { videoId } = paramsSchema.parse(request.params);

      const bodySchema = z.object({
        prompt: z.string(),
      })

      const { prompt } = bodySchema.parse(request.body);

      const video = await prisma.video.findUniqueOrThrow({
        where: {
          id: videoId,
        }
      })

      const videoPath = video.path;
      const audioReadStream = createReadStream(videoPath);

      const response = await openai.audio.transcriptions.create({
        file: audioReadStream,
        model: "whisper-1",
        language: "pt",
        response_format: "json",
        temperature: 0,
        prompt,
      })

      const transcription = response.text

      await prisma.video.update({
        where: {
          id: videoId,
        },
        data: {
          transcription,
        }
      })

      return {
        transcription
      }
    } catch (e) {
      return reply.status(500).send({
        error: e
      })
    }
  });
}
