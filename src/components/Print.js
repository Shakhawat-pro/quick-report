"use client";
import React from "react";

/**
 * Reliable print via hidden iframe (avoids blank about:blank issues & popup blockers)
 * Props:
 *  - targetRef: ref to DOM node
 *  - className: extra classes
 */
export default function Print({ targetRef, className = "" }) {
	const handlePrint = () => {
		if (!targetRef?.current) return;

		// Create iframe
		const iframe = document.createElement('iframe');
		iframe.style.position = 'fixed';
		iframe.style.right = '0';
		iframe.style.bottom = '0';
		iframe.style.width = '0';
		iframe.style.height = '0';
		iframe.style.border = '0';
		document.body.appendChild(iframe);

		const doc = iframe.contentDocument || iframe.contentWindow.document;
		const cloned = targetRef.current.cloneNode(true);
		preserveFormValues(targetRef.current, cloned);

		// Collect styles (links + style tags) without reading cssRules (avoids CORS errors)
		const headHtml = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
			.map(el => el.outerHTML)
			.join('\n');

		doc.open();
		doc.write(`<!DOCTYPE html><html><head><title>Print</title>${headHtml}<style>
			html,body { font-family: system-ui, Arial, sans-serif; }
			body { margin:10px; }
			@page { size: A4; margin:5mm; }
			textarea,input { border:1px solid #ccc; }
		</style></head><body></body></html>`);
		doc.close();
		doc.body.appendChild(cloned);

		// Wait for fonts & layout
		setTimeout(() => {
			iframe.contentWindow.focus();
			iframe.contentWindow.print();
			// Cleanup after short delay
			setTimeout(() => {
				iframe.remove();
			}, 500);
		}, 150);
	};

	return (
		<button onClick={handlePrint} className={`px-3 py-2 text-xs rounded-md bg-slate-600 hover:bg-slate-500 text-white font-medium shadow cursor-pointer ${className}`}>
			Print
		</button>
	);
}

// Copies values from inputs / textareas to cloned node so printed content reflects user edits.
function preserveFormValues(srcParent, cloneParent) {
	const srcFields = srcParent.querySelectorAll('input, textarea, select');
	const cloneFields = cloneParent.querySelectorAll('input, textarea, select');
	cloneFields.forEach((field, i) => {
		const src = srcFields[i];
		if (!src) return;
		if (field.tagName === 'INPUT') field.setAttribute('value', src.value);
		else if (field.tagName === 'TEXTAREA') field.textContent = src.value;
		else if (field.tagName === 'SELECT') {
			Array.from(field.options).forEach(o => { o.selected = src.value === o.value; });
		}
	});
}
