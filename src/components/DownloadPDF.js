"use client";
import React from "react";

/**
 * DownloadPDF now leverages the same hidden iframe print approach as Print.
 * The browser print dialog lets the user choose "Save as PDF" for perfect fidelity.
 * NOTE: Programmatically auto‑saving as PDF without the dialog isn't allowed by browsers.
 */
export default function DownloadPDF({ targetRef, className = "", title = "Report", fileName }) {
	// Sanitize provided file name (or fallback to title) for browser suggested PDF name.
	const safeName = slugify(fileName || title || 'report');
	const handlePrintToPdf = () => {
		if (!targetRef?.current) return;

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

		const headHtml = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
			.map(el => el.outerHTML)
			.join('\n');

		doc.open();
	doc.write(`<!DOCTYPE html><html><head><title>${safeName}</title>${headHtml}<style>
			html,body { font-family: system-ui, Arial, sans-serif; }
			body { margin:10px; }
			@page { size: A4; margin:5mm; }
			textarea,input { border:1px solid #ccc; }
		</style></head><body></body></html>`);
		doc.close();
		doc.body.appendChild(cloned);

		setTimeout(() => {
			// Temporarily set top-level document title so browsers use it for suggested PDF filename
			const originalTitle = document.title;
			document.title = safeName;
			try { iframe.contentDocument.title = safeName; } catch {}
			iframe.contentWindow.focus();
			iframe.contentWindow.print();
			// Restore title & cleanup
			setTimeout(() => {
				document.title = originalTitle;
				iframe.remove();
			}, 800);
		}, 150);
	};

	return (
		<button onClick={handlePrintToPdf} className={`px-3 py-2 text-xs rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow cursor-pointer ${className}`}>
			Save / Print PDF
		</button>
	);
}

// Reuse value preservation so user edits appear in PDF.
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

function slugify(str = '') {
	return str
		.toString()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '') // remove diacritics
		.replace(/[^a-zA-Z0-9-_ ]/g, '')
		.trim()
		.replace(/\s+/g, '_')
		.substring(0, 60) || 'report';
}
