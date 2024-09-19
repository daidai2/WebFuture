/*
API for FEA Read the Name of Imported HTML
*/

import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fsPromises } from 'fs';
import path from 'path';

type Data = {
    fileNames?: string[];
    error?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method === 'GET') {
    const directoryPath = path.join(process.cwd(), "public", "importFiles");

    try {
      // Asynchronous reading of directory contents using fs.promises.readdir
      const fileNames = await fsPromises.readdir(directoryPath);

      const htmlFileNames = fileNames
        .filter((fileName: string) => fileName.endsWith('.html'))
        .map((fileName: string) => fileName.replace('.html', ''));

      res.status(200).json({ fileNames: htmlFileNames });
    } catch (err) {
      console.error('Error reading directory or files:', err);
      res.status(500).json({ error: 'Error reading directory or files' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}