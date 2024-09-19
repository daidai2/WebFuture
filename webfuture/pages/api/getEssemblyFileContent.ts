/*
API for FEA Read the Content of Imported HTML
*/

import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fsPromises } from 'fs';
import path from 'path';

type Data = {
    htmlContent?: string;
    error?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method === 'GET') {
    const { fileName } = req.query;

    if (typeof fileName !== 'string') {
      res.status(400).json({ error: 'Invalid or missing file name' });
      return;
    }

    const filePath = path.join(process.cwd(), "public", "importFiles", `${fileName}.html`);

    try {
      const htmlContent = await fsPromises.readFile(filePath, 'utf-8');
      res.status(200).json({ htmlContent });
    } catch (err) {
      console.error('Error reading file:', err);
      res.status(500).json({ error: 'Error reading file' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}