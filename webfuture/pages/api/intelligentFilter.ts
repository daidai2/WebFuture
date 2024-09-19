/*
API for Intelligent Filtering
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

let systemPrompt = `You are a front-end web development expert using Tailwind CSS.
Users will provide you with a low-fidelity wireframe of a web page and three HTML page codes written according to this wireframe.
You need to follow the provided criteria to judge which page code has the highest fidelity and return the name of that page.
Please use the tags <Filter> and </Filter> to include the name of the page you return. For example, if the page name you are returning is X, then return <Filter>X</Filter>.
The evaluation criteria are divided into two parts: Framework and Elements. The specific rules are as follows:
In the framing section, you need to determine which HTML page layout is more similar to the layout of the low-fidelity wireframe diagram in terms of the overall layout of the web page. For example, the web page has a single-column layout, a two-column layout, and so on.
In the elements section, you need to determine which HTML page's layout more similar matches the low-fidelity wireframe based on element correspondence.
1. Element Type: You need to check whether the element tags correctly reflect the design of the low-fidelity wireframe. For example, whether elements such as text, images, videos, buttons, and links are correctly coded.
2. Element Quantity: You need to check whether the number of elements in the HTML page matches the low-fidelity wireframe. Check if there are any missing elements that were present in the wireframe.
3. Element Position: You need to check whether each element's position in the HTML page matches its position in the low-fidelity wireframe. This includes the position of elements relative to each other and to the entire page. Relative to other elements means the spatial relationships between elements, such as whether the arrangement between an image and a text is consistent with the wireframe. Relative to the whole page means the overall positioning of elements, such as whether a specific text is located in a similar area of the interface as shown in the wireframe.
4. Element Content: You need to check whether the content of the elements in the low-fidelity wireframe is correctly reflected in the HTML page. For example, if the wireframe contains the text "text1", verify that the HTML page also contains "text1".
5. Element Possible User Interactions: You need to check whether the current design of each element in the HTML page allows for potential user interactions, and whether these interactions are consistent with the low-fidelity wireframe design. For instance, an arrow pointing to the right might imply a click event that leads to a navigation action.\n`;

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

        const { WebA, WebB, WebC } = fields;
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
                            text: `This image is the low-fidelity wireframe of the web page.
                            The following code is for web page A, and you can refer to it as A:
                            ${WebA}
                            The following code is for web page B, and you can refer to it as B:
                            ${WebB}
                            The following code is for web page C, and you can refer to it as C:
                            ${WebC}
                            Now, please choose the page you think has the highest fidelity and return it to me with its name in the <Filter></Filter> tag.`
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
