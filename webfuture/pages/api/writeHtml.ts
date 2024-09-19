/*
API for Writing HTML
*/

import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { html as beautifyHtml } from 'js-beautify';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const htmlContent = req.body.html;
      const fileName = req.body.file;
      const directoryPath = req.body.path;

      const formattedHtml = beautifyHtml(htmlContent, {
        indent_size: 2,
        extra_liners: []
      });

      const filePath = path.join(process.cwd(), 'public', directoryPath, fileName);

      fs.writeFileSync(filePath, formattedHtml, 'utf8');

      res.status(200).json({ message: 'HTML content written successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to write HTML content' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}