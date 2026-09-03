"use client";
import React, { useLayoutEffect, useRef, useState } from 'react';

export default function AutoWidthInput({ value, onChange, placeholder, style }) {
  const spanRef = useRef(null);
  const [w, setW] = useState(60);
  useLayoutEffect(() => {
    if (spanRef.current) {
      const width = spanRef.current.getBoundingClientRect().width;
      setW(Math.max(40, Math.min(width + 12, 260)));
    }
  }, [value, placeholder]);

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        ref={spanRef}
        style={{ position: 'absolute', visibility: 'hidden', whiteSpace: 'pre', font: 'inherit', padding: '0 6px', fontWeight: 400 }}
      >
        {value || placeholder}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{
          font: 'inherit',
          fontWeight: 400,
          height: '24px',
          padding: '0 6px',
          border: '0',
          outline: 'none',
          background: 'transparent',
          width: w,
          boxSizing: 'content-box',
          ...style
        }}
      />
    </span>
  );
}
