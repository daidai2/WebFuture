/*
API for Prompt Enhancement
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

const generateSystemPrompt = (round: 'Framework' | 'Content' | 'Interaction', frameworkEnhancement: string, contentEnhancement: string): string => {
  const basePrompt = `You are a front-end designer for a web site.
  The user will provide you with a low-fidelity wireframe of a webpage, and you need to analyze the elements in the wireframe from the ${round} aspects, and provide an analysis document for the wireframe. This analysis document will be used in the future to help you understand the wireframe and generate HTML code.
  Please wrap the analysis document in <Enhance></Enhance> tags. For example, if your analysis content is "A is B," you should output <Enhance>A is B</Enhance>.\n`;

  const prompts = {
    Framework: `You need to describe the framework elements in the page, including <header>, <footer>, <nav>, <section>, <article>, <aside>, <div>, <table>, <span>, <iframe>. When describing, please follow these rules:
    1. First, analyze the framework elements in the page and name each framework element.
    2. In the analysis, explain the inclusion relationship between each framework element starting from the top-level framework.
    3. Explain the position of each framework element on the page.\n`,
    Content: `You need to describe the content-related elements on the page, including text elements (<h1>-<h6>, <p>, etc.), image elements (<img>, <figure>, etc.), and video elements (<audio>, <video>, etc.). When describing, please follow these rules:
    1. First, analyze the text, image, and video elements on the page, and name each content element.
    2. During the analysis, specify which framework element each content element belongs to.
    3. Specify the position of the content element within its framework element.
    Now, I will first provide an analysis document for the layout of this wireframe, which includes my naming of each framework element:\n` + frameworkEnhancement,
    Interaction: `You need to describe elements related to user interaction on the page, including <button>, <a>, <textarea>, <select>, <option>, and form-related elements (<form>, <fieldset>, etc.). When describing, please follow these rules:
    1. First analyze the elements related to user interaction on the page and name each user interaction element.
    2. When analyzing, please explain which frame element the interactive content element belongs to.
    3. Explain the position of the user interaction element in its parent frame element.
    4. Explain the possible functions of these user interaction elements.
    Now, I will first provide an analysis document for the layout of this wireframe, which includes my naming of each framework element:\n` + frameworkEnhancement + 
    `Then, I will provide an analysis document regarding the content of this wireframe. These text, image, and video elements may be helpful to you:\n` + contentEnhancement,
  };

  return `${basePrompt}${prompts[round]}`;
};

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

    const frameworkEnhancement = typeof fields.frameworkEnhancement === 'string' ? fields.frameworkEnhancement : '';
    const contentEnhancement = typeof fields.contentEnhancement === 'string' ? fields.contentEnhancement : '';

    const round = Array.isArray(fields.round) ? fields.round[0] : fields.round;
    if (typeof round !== 'string' || !['Framework', 'Content', 'Interaction'].includes(round)) {
        return res.status(400).json({ error: 'Invalid round parameter' });
    }

    const systemPrompt = generateSystemPrompt(round as 'Framework' | 'Content' | 'Interaction', frameworkEnhancement, contentEnhancement);

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
              text: "This image is a low fidelity wireframe. Please analyze this wireframe image and output an analysis document."
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
