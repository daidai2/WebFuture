/*
API for Adding Route
*/

import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

type Data = {
  message?: string;
  error?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { routes } = req.body;

    if (!routes || !Array.isArray(routes)) {
      throw new Error("Invalid input: 'routes' must be an array of strings.");
    }

    const serverJsPath = path.join(process.cwd(), 'public/infoStation/server.js');

    const routesContent = routes.join('\n') + '\n';

    await fs.appendFile(serverJsPath, routesContent, 'utf8');

    res.status(200).json({ message: 'Routes have been successfully appended to server.js.' });
  } catch (error) {
    console.error('Failed to append routes:', error);
    res.status(500).json({ error: `Error appending routes` });
  }
}