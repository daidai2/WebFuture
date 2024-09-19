/*
Preview Window
*/

import React from 'react';
import { useRef, useEffect } from 'react';

const IFrameComponent = React.memo(({ htmlContent }: { htmlContent: string }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    
    // Re-render the page when the CodeMirror content changes
    useEffect(() => {
        if (iframeRef.current) {
            iframeRef.current.srcdoc = htmlContent;
        }
    }, [htmlContent]);

    return (
        <iframe srcDoc={htmlContent} className="w-full h-full" />
    );
});

export default IFrameComponent;