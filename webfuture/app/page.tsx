/*
Generate Web Skeleton by Low-fidelity wireframes
*/

"use client";

import { Tldraw } from "tldraw";
import "./index.css";
import { useEditor } from "tldraw";
import { getSvgAsImage } from "@/lib/getSvgAsImage";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { PreviewModal } from "./UIG/PreviewModal";
import styles from './UIG/UIG.module.css';

export default function Home() {
  const [html, setHtml] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);

  return (
    <>
      <div>
        {loading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
          </div>
        )}
        <div className={`w-screen h-screen`}>
          <Tldraw persistenceKey="tldraw">
            <div className="fixed bottom-4 right-4 flex space-x-4" style={{ zIndex: 1000 }}>
              <GenerateButton setHtml={setHtml} setLoading={setLoading} />
              <JumpButton />
            </div>
            <JumpButton />
          </Tldraw>
        </div>
        {html && (
          <ModalContainer>
            <PreviewModal html={html} setHtml={setHtml} />
          </ModalContainer>
        )}
      </div>
    </>
  );
}

interface ModalContainerProps {
  children: React.ReactNode;
}

/* Preview Modal */
function ModalContainer({ children }: ModalContainerProps) {
  return ReactDOM.createPortal(
    <div
      className="fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center"
      style={{ zIndex: 500, backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      {children}
    </div>,
    document.body
  );
}

// Enhance Prompting
async function fetchEnhancedPrompt(formData: FormData, round: string) {
  formData.set("round", round);

  const response = await fetch("/api/enhancePrompt", {
    method: "POST",
    body: formData,
  });

  const jsonResponse = await response.json();
  if (jsonResponse.error) {
    throw new Error("Error from open ai: " + JSON.stringify(jsonResponse.error));
  }

  const enhanceMessage = jsonResponse.choices[0].message.content;
  const enhanceStart = enhanceMessage.indexOf("<Enhance>");
  const enhanceEnd = enhanceMessage.indexOf("</Enhance>");

  if (enhanceStart === -1 || enhanceEnd === -1 || enhanceStart >= enhanceEnd) {
    console.error("Enhance tags not found or invalid content.");
    return "";
  }

  return enhanceMessage.slice(enhanceStart + "<Enhance>".length, enhanceEnd);
}

// Generate Skeleton
async function fetchDraft(formData: FormData) {
  const resp = await fetch("/api/generateDraft", {
    method: "POST",
    body: formData,
  });

  const json = await resp.json();
  if (json.error) {
    throw new Error("Error from open ai: " + JSON.stringify(json.error));
  }

  const message = json.choices[0].message.content;
  const start = message.indexOf("<!DOCTYPE html>");
  const end = message.indexOf("</html>");

  if (start === -1 || end === -1 || start >= end) {
    console.error("Html tags not found or invalid content.");
    return "";
  }

  return message.slice(start, end + "</html>".length);
}

// Intelligent Filtering
async function fetchIntelligentFilter(formData: FormData) {
  const resp = await fetch("/api/intelligentFilter", {
    method: "POST",
    body: formData,
  });

  const json = await resp.json();
  if (json.error) {
    throw new Error("Error from open ai: " + JSON.stringify(json.error));
  }

  const filterMessage = json.choices[0].message.content;
  const filterStart = filterMessage.indexOf("<Filter>");
  const filterEnd = filterMessage.indexOf("</Filter>");

  if (filterStart === -1 || filterEnd === -1 || filterStart >= filterEnd) {
    console.error("Filter tags not found or invalid content.");
    return "";
  }

  return filterMessage.slice(filterStart + "<Filter>".length, filterEnd).trim();
}

/* Generate Skeleton Button*/
function GenerateButton({ setHtml, setLoading }:
  {
    setHtml: (html: string) => void,
    setLoading: (loading: boolean) => void,
  }) {
  const editor = useEditor();
  return (
    <button
      onClick={async (e) => {
        setLoading(true);
        try {
          e.preventDefault();
          const shapeIds = editor.getCurrentPageShapeIds();
          const svg = await editor.getSvg(Array.from(shapeIds));
          if (!svg) {
            return;
          }
          const png = await getSvgAsImage(svg, {
            type: "png",
            quality: 1,
            scale: 1,
          });

          if (!png) {
            throw new Error("Failed to generate PNG from SVG.");
          }

          const file = new File([png], "wireframe.png", { type: "image/png" });

          const formData = new FormData();
          formData.append("image", file);
          formData.append("round", "Framework");

          const enhancePromptF = await fetchEnhancedPrompt(formData, "Framework");
          const enhancePromptC = await fetchEnhancedPrompt(formData, "Content");
          const enhancePromptI = await fetchEnhancedPrompt(formData, "Interaction");

          const UserText = `The following document analyzes wireframes in terms of frame elements, content elements, and user interaction elements, and can provide guidance for you to generate code.
          <Analysis Document>
          (1) Frame Elements
          This section includes descriptions of the frame elements within the page, including <header>, <footer>, <nav>, <section>, <article>, <aside>, <div>, <table>, <span>, <iframe>.
          ${enhancePromptF}
          (2) Content Elements
          This section includes descriptions of content-related elements on the page, including text elements (<h1> to <h6>, <p>, etc.), image elements (<img>, <figure>, etc.), and video elements (<audio>, <video>, etc.).
          ${enhancePromptC}
          (3) User Interaction Elements
          This section includes descriptions of elements related to user interaction on the page, such as <button>, <a>, <textarea>, <select>, <option>, and form-related elements (<form>, <fieldset>, etc.).
          ${enhancePromptI}
          </Analysis Document>
          Please generate the page.`
          formData.append("UserText",UserText);

          const htmlWebA = await fetchDraft(formData);
          formData.append("WebA", htmlWebA);
          const htmlWebB = await fetchDraft(formData);
          formData.append("WebB", htmlWebB);
          const htmlWebC = await fetchDraft(formData);
          formData.append("WebC", htmlWebC);

          const filterResult = await fetchIntelligentFilter(formData);

          if (filterResult === "A") {
            setHtml(htmlWebA);
          } else if (filterResult === "B") {
            setHtml(htmlWebB);
          } else if (filterResult === "C") {
            setHtml(htmlWebC);
          } else {
            console.log("Filter result not recognized:", filterResult);
          }
        } catch (error) {
          console.error('Error:', error);
        } finally {
          setLoading(false);
        }
      }}
      className="hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      style={{ backgroundColor: '#068488' }}
    >
      Generate Skeleton
    </button>
  );
}

/* Go to Collaborative Optimization */
function JumpButton() {
  return (
    <button
      onClick={async (e) => {
        e.preventDefault();
        window.location.href = 'http://localhost:3000/UIP';
      }}
      className="hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      style={{ backgroundColor: '#324B4C' }}
    >
      Collaborative Optimization
    </button>
  );
}
