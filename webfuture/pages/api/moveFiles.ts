/*
API for File Migration
*/

import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

type Data = {
  message?: string;
  error?: string;
  routes?: string[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method === 'POST') {
    const tasks = [
      { src: 'public/importFiles', dest: 'public/infoStation/public', pattern: /\.html$/ },
      { src: 'public/pics', dest: 'public/infoStation/public/pics', pattern: /\.(jpeg|jpg|png|gif)$/ }
    ];
    const newRoutes: string[] = [];

    try {
      for (const task of tasks) {
        const srcPath = path.join(process.cwd(), task.src);         
        const destPath = path.join(process.cwd(), task.dest);       
        const files = await fsPromises.readdir(srcPath);            


        for (const file of files) {
          if (file.match(task.pattern)) {
            const filePath = path.join(srcPath, file);
            const destFilePath = path.join(destPath, file);
            const fileName = path.parse(file).name;

 
            if (task.pattern.test('.html')) {
              const htmlContent = await fsPromises.readFile(filePath, 'utf8');
              const dom = new JSDOM(htmlContent);
              const document = dom.window.document;

              const allElements = document.querySelectorAll('*');
              allElements.forEach(element => {
                element.removeAttribute('id');
              });

              allElements.forEach(element => {
                const dataId = element.getAttribute('data-id');
                if (dataId) {
                  element.setAttribute('id', dataId);
                }
              });

              const updatedHtml = dom.serialize();

              await fsPromises.writeFile(filePath, updatedHtml, 'utf8');

              newRoutes.push(`app.get('/${fileName}', (req, res) => res.sendFile(path.join(__dirname, '/public/${fileName}.html')));`);
            }


            await fsPromises.rename(filePath, destFilePath);
          }
        }
      }

      res.status(200).json({ message: 'Files migrated successfully', routes: newRoutes });
    } catch (err) {
      console.error('Error processing files:', err);
      res.status(500).json({ error: 'Error processing files' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}