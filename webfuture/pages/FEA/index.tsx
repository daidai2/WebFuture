/*
Main Page of Page Briding
*/
"use client";

import React, { useState, useRef, useEffect } from 'react';
import styles from './FEA.module.css';
import RouteModal from './routeModal';

interface NavItem {
    id: number;
    text: string;
}

interface TableRow {
    key: string;
    elementName: string;
    elementID: string;
    elementClass: string;
    target: string;
    isSet: boolean;
}

const Home = () => {
    const [selectFile, setSelectFile] = useState('');                               
    const [html, setHtml] = useState('<h1>Import Your First File</h1>');            
    const [selectedId, setSelectedId] = useState<number | null>(null);              
    const fileInputRef = useRef<HTMLInputElement>(null);                            
    const [showModal, setShowModal] = useState(false);                              
    const [navItems, setNavItems] = useState<Array<NavItem>>([]);                   
    const [tableRows, setTableRows] = useState<TableRow[]>([]);                     

    /* Top navigation bar function */
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files ? event.target.files[0] : null;
        if (file && file.type === "text/html") {
            setShowModal(true);
        }
    };

    const saveFile = async (newName: string) => {
        const fileNameWithExtension = `${newName}.html`;
        if (fileInputRef.current && fileInputRef.current.files && fileInputRef.current.files.length > 0) {
            const file = fileInputRef.current.files[0];
            const reader = new FileReader();
            reader.onload = async (e: ProgressEvent<FileReader>) => {
                const htmlContent = e.target?.result as string;
                try {
                    const addIdsResponse = await fetch('/api/addIds', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ html: htmlContent })
                    });
                    const { assignNumberHtml } = await addIdsResponse.json();
                    const response = await fetch('/api/writeHtml', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ html: assignNumberHtml, file: fileNameWithExtension, path: 'importFiles' })
                    });
                    const result = await response.json();
                    if (result.message === 'HTML content written successfully') {
                        await fetchFileNames(newName);
                    }
                } catch (error) {
                    console.error('Error saving file:', error);
                }
            };
            reader.readAsText(file);
        } else {
            console.error('No file selected or file input is not accessible.');
        }
        setShowModal(false);
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    // Page Briding
    const mpaEssembly = async () => {
        let routes = [];
        try {
            const response = await fetch('/api/moveFiles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();

            if (response.ok) {
                console.log("Files have been moved successfully:", data);
                routes = data.routes;
                appendRoutesToServer(routes);
                alert("Documents have been successfully migrated!");
            } else {
                throw new Error(data.message || "An error occurred during the file move operation.");
            }
        } catch (error) {
            console.error("Failed to move files:", error);
        }
    }

    const appendRoutesToServer = async (routes: string[]) => {
        try {
            const response = await fetch('/api/appendRoutes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ routes })
            });
            const result = await response.json();
            if (response.ok) {
                console.log("Routes have been successfully added to server.js:", result);
            } else {
                throw new Error(result.message || "An error occurred while appending routes.");
            }
        } catch (error) {
            console.error("Error appending routes to server.js:", error);
        }
    }

    /* Side navigation bar function */
    const fetchFileNames = async (newFileName = '') => {
        try {
            const response = await fetch('/api/getEssemblyFileName');
            const data = await response.json();
            if (data.fileNames) {
                const loadedNavItems = data.fileNames.map((fileName: string, index: number) => ({
                    id: index + 1,
                    text: fileName
                }));
                setNavItems(loadedNavItems);
                if (newFileName) {
                    const newItem = loadedNavItems.find((item: NavItem) => item.text === newFileName);
                    if (newItem) {
                        setSelectFile(newItem.text);
                        setSelectedId(newItem.id);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch file names:', error);
        }
    };

    useEffect(() => {
        fetchFileNames();
    }, []);

    const handleItemClick = (item: NavItem) => {
        if (item.text) {
            setSelectFile(item.text);
            setSelectedId(item.id);
        }
    };

    useEffect(() => {
        if (selectedId !== null) {
            const item = navItems.find(item => item.id === selectedId);
            if (item) {
                fetchFileContent(item.text);
            }
        }
    }, [navItems, selectedId]);

    /* Preview Area */
    const fetchFileContent = async (fileName: string) => {
        try {
            const response = await fetch(`/api/getEssemblyFileContent?fileName=${fileName}`);
            const data = await response.json();
            if (data.htmlContent) {
                setHtml(data.htmlContent);
                fetchJumpElements(data.htmlContent);
            }
        } catch (error) {
            console.error('Failed to fetch file content:', error);
            setHtml('<h1>Error loading the file</h1>');
            setTableRows([]);
        }
    };

    /* Briding Anchors Table */
    const fetchJumpElements = async (htmlContent: string) => {
        try {
            const response = await fetch('/api/getJumpElements', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ html: htmlContent })
            });
            const result = await response.json();
            if (response.ok) {
                const jumpElements = result.map((item: any, index: number) => ({
                    key: `row-${index}`,
                    elementName: item.text,
                    elementID: item.id,
                    elementClass: item.type,
                    target: item.target,
                    isSet: item.isSet
                }));
                setTableRows(jumpElements);
            } else {
                console.error('Failed to fetch jump elements:', result.message);
                setTableRows([]);
            }
        } catch (error) {
            console.error('Error fetching jump elements:', error);
            setTableRows([]);
        }
    };

    const handleInputChange = (index: number, value: string): void => {
        const newRows = [...tableRows];
        newRows[index].target = value;
        setTableRows(newRows);
    };

    const toggleCheck = (index: number): void => {
        const newRows = [...tableRows];
        newRows[index].isSet = !newRows[index].isSet;
        setTableRows(newRows);
    };

    const handleCompleteSetup = async () => {
        const fileName = navItems.find(item => item.id === selectedId)?.text;
        if (!fileName || !html || tableRows.length === 0) {
            console.error("No file selected or no jump elements to process.");
            return;
        }

        try {
            const jumpCodeResponse = await fetch('/api/jumpCodeInjection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ html, jumpElements: tableRows })
            });

            if (jumpCodeResponse.ok) {
                const { updatedHtml } = await jumpCodeResponse.json();

                const response = await fetch('/api/writeHtml', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ html: updatedHtml, file: `${fileName}.html`, path: 'importFiles' })
                });
                const result = await response.json();
                if (result.message === 'HTML content written successfully') {
                    console.log("HTML content successfully updated and written to file.");
                } else {
                    console.error("Failed to write HTML content:", result.message);
                }
            } else {
                const error = await jumpCodeResponse.json();
                console.error("Failed to inject jump codes:", error.message);
            }
        } catch (error) {
            console.error("Error processing jump code injection and saving HTML:", error);
        }
    };

    const handleResetTable = () => {
        const resetRows = tableRows.map(row => ({
            ...row,
            target: '',
            isSet: false
        }));
        setTableRows(resetRows);
    };

    return (
        <div className={styles.bgFlexCol}>
            <RouteModal isOpen={showModal} onSave={saveFile} onClose={() => setShowModal(false)} />
            <div className={styles.topBar}>
                <button className={`${styles.button} ${styles.importButton}`} onClick={triggerFileInput}>Import File</button>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} accept=".html" />
                <div>
                    <button className={`${styles.button} ${styles.mpaButton}`} onClick={mpaEssembly}>Page Briding</button>
                </div>
            </div>
            <div className="flex flex-1 overflow-hidden">
                <div className={styles.sideNav}>
                    {navItems.map(item => (
                        <div key={item.id} className={styles.navItem}>
                            <div
                                className={`${styles.navItemText} ${item.id === selectedId ? styles.navItemTextSelected : ''}`}
                                onClick={() => handleItemClick(item)}
                            >
                                {item.text}
                            </div>
                        </div>
                    ))}
                </div>
                <div className={styles.mainContent}>
                    <div className={styles.iframeContainer}>
                        <div className={styles.previewLabel}>Preview Area</div>
                        <iframe srcDoc={html} className={styles.iframeFull}></iframe>
                    </div>
                    <div className={styles.tableContainer}>
                        <div className={styles.fileLabelRow}>
                            <div className={styles.fileLabel}>File Name: {selectFile}</div>
                            <div>
                                <button className={`${styles.button} ${styles.resetButton}`} onClick={handleResetTable}>Reset Table</button>
                                <button className={`${styles.button} ${styles.finishButton}`} onClick={handleCompleteSetup}>Inject Code</button>
                            </div>
                        </div>
                        <div className={styles.scrollable}>
                            <table className={styles.jumpTable}>
                                <thead>
                                    <tr>
                                        <th>Briding Anchor</th>
                                        <th>Element ID</th>
                                        <th>Element Type</th>
                                        <th>Target Route</th>
                                        <th>Is Redirect Set</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableRows.map((row, index) => (
                                        <tr key={row.key}>
                                            <td>{row.elementName}</td>
                                            <td>{row.elementID}</td>
                                            <td>{row.elementClass}</td>
                                            <td><input type="text" className={styles.inputCell} value={row.target} onChange={(e) => handleInputChange(index, e.target.value)} /></td>
                                            <td className={styles.checkboxContainer}> <div className={row.isSet ? styles.checked : styles.unchecked} onClick={() => toggleCheck(index)} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Home;
