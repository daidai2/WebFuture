/*
API for Filtering Briding Anchors from HTML File
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

      // Define arrays to store information about briding anchors
      const navigableElements: Array<{ id: string, text: string, type: string, target?: string, isSet: boolean }> = [];

      // Finding and handling briding anchors
      const processNavigableElements = (element: Element) => {
        const tagName = element.tagName.toLowerCase();

        if (tagName === 'a' || tagName === 'button' || (tagName === 'input' && ((element as HTMLInputElement).type === 'button' || (element as HTMLInputElement).type === 'submit'))) {
          let target = '';
          if (tagName === 'a') {
            const href = (element as HTMLAnchorElement).href;
            target = href.replace(/^https?:\/\/[^\/]+|about:blank#/g, '');
            target = target === '' ? '' : (target.startsWith('/') ? target.slice(1) : target);
          }
          else if (tagName === 'button') {
            const onclick = (element as HTMLButtonElement).getAttribute('onclick');
            const match = onclick?.match(/window\.location\.assign\('([^']+)'\)/);
            if (match) {
              target = match[1];
              target = target.startsWith('/') ? target.slice(1) : target;
            }
          }

          const isSet = target !== '';

          navigableElements.push({
            id: element.id,                             
            text: element.textContent?.trim() || '',    
            type: tagName,                              
            target: target,                             
            isSet: isSet                                
          });
        }

        element.childNodes.forEach(child => {
          if (child.nodeType === 1) {
            processNavigableElements(child as Element);
          }
        });
      };

      processNavigableElements(document.body);

      res.status(200).json(navigableElements);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Failed to process HTML', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
