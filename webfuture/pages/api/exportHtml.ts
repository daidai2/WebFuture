/*
API for Export Files
*/

import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { html as beautifyHtml } from 'js-beautify';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      let htmlContent = req.body.html;
      const fileName = req.body.file;
      htmlContent = htmlContent.replace(/\/pics\//g, './pics/');

      const formattedHtml = beautifyHtml(htmlContent, {
        indent_size: 2,
        extra_liners: []
      });

      const folderPath = path.join(process.cwd(), 'public', 'exportFiles', fileName.split('.')[0]);
      const picsFolderPath = path.join(folderPath, 'pics');

      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      if (!fs.existsSync(picsFolderPath)) {
        fs.mkdirSync(picsFolderPath);
      }

      const regex = /\/pics\/[^"')]+/g;
      const picsPaths = htmlContent.match(regex) || [];

      picsPaths.forEach((picPath: string) => {
        const picName = path.basename(picPath);
        const srcPath = path.join(process.cwd(), 'public', picPath);
        const destPath = path.join(picsFolderPath, picName);
      
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
        }
      });

      const filePath = path.join(folderPath, fileName);
      fs.writeFileSync(filePath, formattedHtml, 'utf8');

      res.status(200).json({ message: 'HTML content exported successfully.' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to export HTML content.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
