/*
Preview Modal
*/
"use client";

import { use, useEffect, useState } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-cshtml";
import "prismjs/themes/prism-tomorrow.css";
import styles from './PreviewModal.module.css';

export function PreviewModal({
  html,
  setHtml,
}: {
  html: string | null;
  setHtml: (html: string | null) => void;
}) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");

  useEffect(() => {
    const highlight = async () => {
      await Prism.highlightAll();
    };
    highlight();
  }, [html, activeTab]);

  if (!html) {
    return null;
  }

  const saveFile = async () => {
    try {
      const response = await fetch('/api/writeHtml', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: html,
          file: 'draftV0.0.html',
          path: 'htmls'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save HTML content');
      }

      const data = await response.json();
      console.log(data.message);
      alert('Save Successful');
    } catch (error) {
      console.error(error);
      alert('Save Failed');
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()} className={styles.modal}>
      <div className={styles.header}>
        <div className="flex space-x-1">
          <TabButton
            active={activeTab === "preview"}
            onClick={() => setActiveTab("preview")}
          >
            Page Preview
          </TabButton>
          <TabButton
            active={activeTab === "code"}
            onClick={() => setActiveTab("code")}
          >
            Source Code
          </TabButton>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={saveFile}
            className={styles.saveButton}
          >
            Save File
          </button>
          <button
            onClick={() => setHtml(null)}
            className={styles.closeButton}
          >
            <svg className={styles.svgIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      {activeTab === "preview" ? (
        <iframe className="w-full h-full" srcDoc={html} />
      ) : (
        <pre className={styles.codeBlock}>
          <code className="language-markup">{html}</code>
        </pre>
      )}
    </div>
  );
}

interface TabButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  active: boolean;
}

function TabButton({ active, ...buttonProps }: TabButtonProps) {
  const buttonClass = active ? `${styles.tabButton} ${styles.tabButtonActive}` : `${styles.tabButton} ${styles.tabButtonInactive}`;
  return <button className={buttonClass} {...buttonProps}></button>;
}