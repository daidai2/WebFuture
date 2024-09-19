/*
Interaction Dialog
*/
import React, { useState, useEffect, useRef } from 'react';
import { useVersionContext } from './GlobalVar/VersionContext';
import styles from './UIO.module.css';

interface DialogProps {
    onGetContent: () => string;
    onUpdateHtml: (html: string) => void;
    setIsLoading: (isLoading: boolean) => void;
    dialogContent: string[];
    setDialogContent: (dialogContent: string[]) => void;
}


const Dialog: React.FC<DialogProps> = ({ onGetContent, onUpdateHtml, setIsLoading, dialogContent, setDialogContent }) => {
    const [input, setInput] = useState('');
    const [maxHeight, setMaxHeight] = useState('0px');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dialogFrameRef = useRef<HTMLDivElement>(null);

    const [lastHtmlContent, setLastHtmlContent] = useState<string>('');
    const [lastInput, setLastInput] = useState<string>('');
    const [goalVersionFileName, setGoalVersionFileName] = useState<string | null>(null);


    const { maxVersion, selectedVersion, setMaxVersion, setSelectedVersion } = useVersionContext();

    /* UI Design */
    useEffect(() => {
        if (dialogFrameRef.current) {
            const height = dialogFrameRef.current.clientHeight;
            setMaxHeight(`${height}px`);
        }
    }, []);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const newHeight = Math.min(textareaRef.current.scrollHeight, 100);
            textareaRef.current.style.height = `${newHeight}px`;
        }
    }, [input]);

    /* Function */
    const submitCode = async (submitHtml: string, submitInput: string) => {
        const response = await fetch('/api/optHtml', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ htmlContent: submitHtml, additionalText: submitInput }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        const message = result.choices[0].message.content;
        const start = message.indexOf("<FlexGPT>");
        const end = message.indexOf("</FlexGPT>");

        const updateHtml = message.slice(start + "<FlexGPT>".length, end).trim();

        if (start === -1 || end === -1 || updateHtml === '') {
            console.error("HTML content is empty, message content: ", message);
            throw new Error("Generated HTML content is empty. Message content: " + message);
        }

        return updateHtml;
    }

    const injectCodeIntoHtml = async (codeMirrorContent: string, updateHtml: string): Promise<string> => {
        const response = await fetch('/api/codeInjection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                html: codeMirrorContent,
                updateHtml: updateHtml,
            }),
        });

        if (!response.ok) {
            throw new Error('API call failed');
        }

        const data = await response.json();

        return data.modifyHtml;
    };

    // DOM Naming
    const assignNumberToHtml = async (modifyHtml: string): Promise<string> => {
        const response = await fetch('/api/addIds', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ html: modifyHtml })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.assignNumberHtml;
    }

    const saveFile = async (html: string, newFileName: string) => {

        try {
            const response = await fetch('/api/writeHtml', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ html: html, file: newFileName, path: 'htmls' })
            });

            if (!response.ok) {
                throw new Error('Failed to save HTML content');
            }

            const data = await response.json();
        } catch (error) {
            console.error('Error:', error);
        }
    }

    const handleSubmit = async () => {
        if (input.trim() === '') {
            return;
        }

        setIsLoading(true);

        const codeMirrorContent = onGetContent();

        setLastHtmlContent(codeMirrorContent);
        setLastInput(input);

        const versionParts = selectedVersion!.substring(1).split('.').map(part => parseInt(part, 10));
        const majorVersion = versionParts[0];
        let minorVersion = versionParts[1] + 1;
        const newVersionNumber = minorVersion < 10
            ? `${majorVersion}.${minorVersion}`
            : `${majorVersion}.${minorVersion.toString().padStart(2, '0')}`;
        const newFileName = `draftV${newVersionNumber}.html`;
        setGoalVersionFileName(newFileName);

        try {
            const assignHtml = await assignNumberToHtml(codeMirrorContent);                 
            const updateHtml = await submitCode(assignHtml, input);                         
            const updateNewHtml = await injectCodeIntoHtml(assignHtml, updateHtml);         

            await saveFile(updateNewHtml, newFileName);

            const newVersionStr = `v${newVersionNumber}`;
            setMaxVersion(newVersionStr);
            setSelectedVersion(newVersionStr);

            onUpdateHtml(updateNewHtml);
            setDialogContent([...dialogContent, `YOU:\n${input}`, `LLM:\nRequest Successful! Preview has been updated.`]);
        } catch (error) {
            console.error('An error occurred while requesting the API:', error);
            setDialogContent([...dialogContent, `YOU:\n${input}`, 'LLM:\nRequest Failed']);
        } finally {
            setInput('');
            setIsLoading(false);
        }
    };

    const handleRegenerate = async () => {
        setIsLoading(true);

        const reinforceInput = "The last generation didn't meet my requirements:" + lastInput;
        try {
            const assignHtml = await assignNumberToHtml(lastHtmlContent);                 
            const updateHtml = await submitCode(assignHtml, reinforceInput);              
            const updateNewHtml = await injectCodeIntoHtml(assignHtml, updateHtml);       

            await saveFile(updateNewHtml, goalVersionFileName!);

            onUpdateHtml(updateHtml);
            setDialogContent([...dialogContent, `YOU:\n${lastInput}`, `LLM:\nRequest Successful! Preview has been updated`]);
        } catch (error) {
            console.error('An error occurred while requesting the API:', error);
            setDialogContent([...dialogContent, 'LLM:\nRequest Failed']);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div ref={dialogFrameRef} className={styles.dialogFrame}>
            <div className={styles.dialogBox} style={{ maxHeight: maxHeight }}>
                <div>
                    {dialogContent.map((line, index) => (
                        <p key={index}>{line}</p>
                    ))}
                    {/* Add Regenerate Button */}
                    {dialogContent.length > 0 && (
                        <button className={styles.regenerateButton} onClick={handleRegenerate}>
                        </button>
                    )}
                </div>
            </div>
            <div className={styles.inputArea}>
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className={styles.inputTextarea}
                />
                <button
                    onClick={handleSubmit}
                    className={styles.submitButton}
                >
                    Submit
                </button>
            </div>
        </div>
    );
};

export default Dialog;
