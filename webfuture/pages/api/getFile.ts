/*
API for Geting File Lists in GRA
*/

import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fsPromises } from 'fs';
import path from 'path';

type Data = {
  files?: string[];
  error?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method === 'POST') {
    const directoryPath = path.join(process.cwd(), "public", 'htmls');

    try {
      const files = await fsPromises.readdir(directoryPath);

      const draftFiles = files
        .filter((file: string) => file.startsWith('draft'))
        .map((file: string) => file.replace('draftV', 'v').replace('.html', ''));

      res.status(200).json({ files: draftFiles });
    } catch (err) {
      console.error('Error reading directory:', err);
      res.status(500).json({ error: 'Error reading directory' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

