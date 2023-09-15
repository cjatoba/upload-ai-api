import fastifyMultipart from "@fastify/multipart";
import {FastifyInstance} from "fastify";
import {randomUUID} from "node:crypto";
import * as path from "path";
import {promisify} from "util";
import {pipeline} from "stream";
import * as fs from "fs";
import {prisma} from "../lib/prisma";

const pump = promisify(pipeline)

export async function uploadVideoRoute(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1048576 * 25, // 25 MB
    },
  });

  app.post("/videos", async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({
        error: "Missing file input.",
      });
    }

    const extension = path.extname(data.filename);

    if (!extension || extension !== ".mp3") {
      return reply.status(400).send({
        error: "Invalid file type. Only mp3 files are allowed.",
      });
    }

    const fileBaseName = path.basename(data.filename, extension);
    const fileUploadName = `${fileBaseName}-${randomUUID()}.${extension}`;

    const uploadDestination = path.resolve(__dirname, "../../tmp", fileUploadName);

    await pump(data.file, fs.createWriteStream(uploadDestination));

    const video = await prisma.video.create({
      data: {
        name: data.filename,
        path: uploadDestination,
      },
    })

    return {
      video,
    }
  });
}
