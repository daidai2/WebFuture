/*
API for Reading HTML
*/
import { promises as fs } from 'fs';
import path from 'path';

export async function readHtmlFile(filename: string): Promise<string> {
    try {
        const filePath = path.join(__dirname, '/public/htmls/', filename);
        const htmlContent = await fs.readFile(filePath, 'utf-8');
        return htmlContent;
    } catch (error) {
        console.error('Error reading HTML file:', error);
        throw error;
    }
}
