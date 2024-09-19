/*
API for Generate Skeleton
*/

import type { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import formidable, { Fields, Files } from 'formidable';
import { promises as fsPromises } from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

let systemPrompt = `You are an expert in developing Web pages using tailwind.
The user will provide you with a low-fidelity wireframe of a Web page, along with an analysis document about the wireframe diagram.
I will assign you some ground rules:
1. you will return a single html file created using tailwind. Please use <script src=“https://cdn.tailwindcss.com”></script> in <head> to import tailwind.
2. If you need to insert an image, use placehold.co to create a placeholder image.
3. Don't leave out any part of the low-fidelity wireframe. Only one HTML file will be returned.\n`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const uploadDir = path.join(process.cwd(), '/tmp');

  try {
    await fsPromises.access(uploadDir);
  } catch (err) {
    await fsPromises.mkdir(uploadDir, { recursive: true });
  }

  const form = formidable({
    uploadDir,
    keepExtensions: true,
  });

  form.parse(req, async (err: any, fields: Fields, files: Files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to parse form data' });
    }

    const { UserText } = fields;
    const image = files.image instanceof Array ? files.image[0] : files.image;

    if (!image) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const imagePath = image.filepath;
    try {
      await fsPromises.access(imagePath);
    } catch (err) {
      return res.status(400).json({ error: `File not found: ${imagePath}` });
    }

    let base64Image;
    try {
      const imageData = await fsPromises.readFile(imagePath, { encoding: 'base64' });
      base64Image = imageData;
    } catch (err) {
      return res.status(500).json({ error: 'Failed to read image file' });
    }

    const body: GPT4VCompletionRequest = {
      model: "gpt-4o",
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `This image is a low-fidelity wireframe. ${UserText}`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
    };

    const userMessage = body.messages[1].content[0];
    // Use TypeScript type guards to ensure that userMessage is of the correct type
    if (typeof userMessage !== 'string' && userMessage.type === 'text') {
      console.log("Sending the following text to OpenAI:", userMessage.text);
    } else {
      console.log("The first content item is not a text message.");
    }

    const proxyUrl = `http://127.0.0.1:7890`;
    const proxyAgent = new HttpsProxyAgent(proxyUrl);

    let json = null;

    try {
      if (!process.env.OPENAI_API_KEY)
        throw new Error('process.env.OPENAI_API_KEY not found');
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        agent: proxyAgent,
        body: JSON.stringify(body),
      });
      json = await resp.json();
      if (!json) {
        throw new Error('Empty response from OpenAI API');
      }
      res.status(200).json(json);
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      res.status(500).json({ error: 'Failed to fetch from OpenAI API', details: errorMessage });
    } finally {
      try {
        await fsPromises.access(imagePath);
        await fsPromises.unlink(imagePath);
      } catch (unlinkErr) {
        console.error('Failed to delete the file:', unlinkErr);
      }
    }
  });
}


type MessageContent =
  | string
  | (string | { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[];

export type GPT4VCompletionRequest = {
  model: "gpt-4o";
  messages: {
    role: "system" | "user" | "assistant" | "function";
    content: MessageContent;
    name?: string;
  }[];
  functions?: any[];
  function_call?: any;
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  n?: number;
  best_of?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  logit_bias?: { [x: string]: number };
  stop?: string[] | string;
};
