/*
API for Injecting Briding Code
*/

import type { NextApiRequest, NextApiResponse } from 'next';
import { JSDOM } from 'jsdom';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        try {
            const { html, jumpElements } = req.body;

            if (typeof html !== 'string') {
                throw new Error('Invalid HTML input');
            }

            const dom = new JSDOM(html);
            const document = dom.window.document;

            jumpElements.forEach((element: { elementID: string, elementClass: string, target: string, isSet: boolean }) => {
                if (element.isSet) {
                    const htmlElement = document.getElementById(element.elementID);
                    if (htmlElement) {
                        switch (element.elementClass) {
                            case 'a':
                                htmlElement.setAttribute('href', `/${element.target}`);
                                break;
                            case 'button':
                                htmlElement.setAttribute('onclick', `window.location.assign('/${element.target}')`);
                                break;
                        }
                    }
                }
            });

            const updatedHtml = dom.serialize();
            res.status(200).json({ updatedHtml });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Failed to inject jump codes', error: error instanceof Error ? error.message : 'Unknown error' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
