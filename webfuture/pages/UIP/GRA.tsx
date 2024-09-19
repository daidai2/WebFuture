/*
Functional Panel of UIP
*/

import React, { useEffect, useState } from 'react';
import styles from './GRA.module.css';
import { useVersionContext } from './GlobalVar/VersionContext';

interface DialogProps {
  onGetContent: () => string;
}

const GRA: React.FC<DialogProps> = ({ onGetContent }) => {

  const [versions, setVersions] = useState<string[]>([]);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const { selectedVersion, maxVersion, setMaxVersion, setSelectedVersion } = useVersionContext();


  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const response = await fetch('/api/getFile', { method: "POST" });

        if (!response.ok) {
          throw new Error(`API request failed with status: ${response.status}`);
        }

        const data = await response.json();

        const sortedVersions = sortVersion(data.files);         
        const MaxVersion = sortedVersions[0];                   

        if (data && data.files) {
          if (maxVersion == null) {
            setMaxVersion(MaxVersion);                          
            setSelectedVersion(MaxVersion);                     
          }
          
          if (selectedVersion) {
            setCurrentVersion(selectedVersion);
          }

          setVersions(sortedVersions);                          
        }

      } catch (error) {
        console.error('Error fetching versions:', error);
      }
    };

    fetchVersions();
  }, [selectedVersion]);

  const compareVersions = (a: string, b: string): number => {
    const partsA = a.split('.').map(part => parseInt(part, 10));
    const partsB = b.split('.').map(part => parseInt(part, 10));

    
    if (partsA[0] !== partsB[0]) {
      return partsA[0] - partsB[0];
    }

    return (partsA[1] || 0) - (partsB[1] || 0);
  };

  const sortVersion = (versions: string[]): string[] => {
    const sortedVersions = versions.sort((a, b) => -compareVersions(a.substring(1), b.substring(1)));
    return sortedVersions;
  };
  
  const handleRefresh = () => {
    setSelectedVersion(currentVersion);
  };

  const handleSave = async () => {
    const codeMirrorContent = onGetContent();

    const versionParts = selectedVersion!.substring(1).split('.');
    const majorVersion = parseInt(versionParts[0]);
    const newVersionNumber = (majorVersion + 1) + '.0';
    const newFileName = `draftV${newVersionNumber}.html`;
    try {
      const response = await fetch('/api/writeHtml', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ html: codeMirrorContent, file: newFileName, path: 'htmls' })
      });

      if (!response.ok) {
        throw new Error('Failed to save HTML content');
      }

      const data = await response.json();
      console.log(data.message);
    } catch (error) {
      console.error('Error:', error);
    }

    const newVersionStr = `v${newVersionNumber}`;
    setMaxVersion(newVersionStr);
    setSelectedVersion(newVersionStr);
  };

  // Go to Generate Skeleton
  const handleDrawWireframe = () => {
    window.location.href = 'http://localhost:3000';
  };

  // Go to Page Briding
  const handleGenerateContent = () => {
    window.location.href = 'http://localhost:3000/FEA';
  };

  // Export File
  const handleExportFile = async () => {
    const fileName = prompt("Enter Exported File's Name:");

    if (!fileName) {
      console.log("Exporting is canceled");
      return;
    }

    const codeMirrorContent = onGetContent();
    const newFileName = `${fileName}.html`;

    try {
      const response = await fetch('/api/exportHtml', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ html: codeMirrorContent, file: newFileName })
      });

      if (!response.ok) {
        throw new Error('Failed to save HTML content');
      }

      const data = await response.json();
      console.log(data.message);

      alert("Export Successful");
    } catch (error) {
      console.error('Error:', error);
      alert("Export Failed, Check the Console");
    }
  }

  return (
    <div className={`${styles.controlPanel}`}>
      <div className={`${styles.row}`}>
        <label className={styles.label}>Current Page Version:</label>
        <select className={styles.select}
          value={currentVersion}
          onChange={(e) => setCurrentVersion(e.target.value)}>
          {versions.map(version => (
            <option key={version} value={version}>{version}</option>
          ))}
        </select>
        <button className={`${styles.button} ${styles.refreshButton}`} onClick={handleRefresh}>Refresh</button>
      </div>

      <div className={styles.row}>
        <button className={`${styles.button} ${styles.saveButton}`} onClick={handleSave}>Save File</button>
        <button className={`${styles.button} ${styles.exportButton}`} onClick={handleExportFile}>Export File</button>
      </div>

      <div className={styles.row}>
        <button className={`${styles.button} ${styles.wireframeButton}`} onClick={handleDrawWireframe}>Draw Wireframe</button>
        <button className={`${styles.button} ${styles.contentButton}`} onClick={handleGenerateContent}>Page Briding</button>
      </div>
    </div>
  );
}

export default GRA;
