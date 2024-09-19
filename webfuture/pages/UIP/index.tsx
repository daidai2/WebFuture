/*
Main Page of the Collaborative Optimization
*/
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { xml } from '@codemirror/lang-xml';
import { basicLight } from '@uiw/codemirror-theme-basic';
import UIO from './UIO'
import GRA from './GRA';
import 'codemirror/lib/codemirror.css';
import { html as beautifyHtml } from 'js-beautify';
import { useVersionContext } from './GlobalVar/VersionContext';
import styles from './UIP.module.css';
import React from 'react';
import IFrameComponent from './IFrameComponent';

const Home = () => {
  const [html, setHtml] = useState('');                               
  const { selectedVersion, maxVersion } = useVersionContext();        
  const [dialogContent, setDialogContent] = useState<string[]>([]);   

  const [isLoading, setIsLoading] = useState(false);                  

  const htmlRef = useRef(html);
  useEffect(() => {
    htmlRef.current = html;
  }, [html]);

  const getCodeMirrorContent = useCallback(() => {
    return htmlRef.current;
  }, []);

  const updateCodeMirrorHtml = useCallback((newHtml: string) => {
    setHtml(newHtml);
  }, []);

  // Load HTML
  async function loadHtml() {
    // Construct File's Name
    const version = selectedVersion?.replace("v", "V");
    const fileName = `/htmls/draft${version}.html`;

    fetch(fileName)
      .then(response => response.text())
      .then(data => {
        const formattedHtml = beautifyHtml(data, {
          indent_size: 2,             
          preserve_newlines: true,    
          max_preserve_newlines: 5,   
          extra_liners: ["head", "body", "/html"]
        });
        setHtml(formattedHtml);
      })
      .catch(error => console.error('Error fetching HTML:', error));
  }

  // Re-Load HTML
  useEffect(() => {
    if (selectedVersion) {
      loadHtml();
    }
  }, [selectedVersion]);

  return (
    <div className={styles.container}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
        </div>
      )}
      <div className={styles.leftPanel}>
        <IFrameComponent htmlContent={html} />
      </div>
      <div className={styles.rightPanel}>
        <div className={styles.controlPanel}>
          <GRA onGetContent={getCodeMirrorContent} />
        </div>
        <div className={styles.codeMirrorPanel}>
          <CodeMirror
            value={html}
            extensions={[xml()]}
            theme={basicLight}
            onChange={(value, viewUpdate) => {
              setHtml(value);
            }}
            className={styles.codeMirror}
          />
        </div>
        <div className={styles.uioPanel}>
          <UIO onGetContent={getCodeMirrorContent} onUpdateHtml={updateCodeMirrorHtml} setIsLoading={setIsLoading} dialogContent={dialogContent} setDialogContent={setDialogContent} />
        </div>
      </div>
    </div>
  );
}

export default Home;
