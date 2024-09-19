/*
API for Adding IDs to components of an HTML file
*/

import type { NextApiRequest, NextApiResponse } from 'next';
import { JSDOM } from 'jsdom';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { html } = req.body;

      if (typeof html !== 'string') {
        throw new Error('Invalid HTML input');
      }

      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Global counter to keep track of the number of instances of each tag
      const globalCounter: Record<string, number> = {};

      // Recursive function to process each element and its children
      const processElement = function (element: Element, parentPath: string = ''): void {
          const tagName = element.tagName.toLowerCase();
          const tagCount = (globalCounter[tagName] || 0) + 1;
          globalCounter[tagName] = tagCount;
          const currentId = parentPath ? `${parentPath}-${tagName}${tagCount}` : `${tagName}${tagCount}`;
          element.id = currentId;

          element.childNodes.forEach((child) => {
            if (child.nodeType === 1) { 
              processElement(child as Element, currentId);
            }
          });
      }

      processElement(document.body);

      const assignNumberHtml = dom.serialize();

      res.status(200).json({ assignNumberHtml });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Failed to process HTML', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}