
'use client';

import React, { useEffect, useRef, useState } from 'react';

// A mapping of CSS cursor styles to state names for the body class
const CURSOR_STYLE_TO_STATE: { [key: string]: string } = {
  'pointer': 'pointer',
  'text': 'text',
  'wait': 'wait',
  'progress': 'progress',
  'not-allowed': 'not-allowed',
  'grab': 'grab',
  'grabbing': 'grabbing',
  'crosshair': 'crosshair',
};

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const outlineRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // This effect handles the cursor's movement animation
    const animateCursor = (time: number) => {
      if (previousTimeRef.current !== undefined) {
        // Smoothly interpolate the cursor's position towards the mouse position
        if (dotRef.current) {
          const currentX = parseFloat(dotRef.current.style.left || '0');
          const currentY = parseFloat(dotRef.current.style.top || '0');
          dotRef.current.style.left = `${currentX + (mousePosition.x - currentX) * 0.9}px`;
          dotRef.current.style.top = `${currentY + (mousePosition.y - currentY) * 0.9}px`;
        }
        if (outlineRef.current) {
          const currentX = parseFloat(outlineRef.current.style.left || '0');
          const currentY = parseFloat(outlineRef.current.style.top || '0');
          outlineRef.current.style.left = `${currentX + (mousePosition.x - currentX) * 0.3}px`;
          outlineRef.current.style.top = `${currentY + (mousePosition.y - currentY) * 0.3}px`;
        }
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animateCursor);
    };

    requestRef.current = requestAnimationFrame(animateCursor);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [mousePosition]);


  useEffect(() => {
    // This effect tracks the mouse position and updates the state
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });

      const target = event.target as HTMLElement;
      if (target) {
        // Get the computed cursor style of the hovered element
        const cursorStyle = window.getComputedStyle(target).getPropertyValue('cursor');
        const stateName = CURSOR_STYLE_TO_STATE[cursorStyle] || 'default';
        
        // Reset all cursor state classes on the body
        Object.values(CURSOR_STYLE_TO_STATE).forEach(name => {
          document.body.classList.remove(`cursor-state-${name}`);
        });

        // Add the new state class if it's not the default
        if (stateName !== 'default') {
          document.body.classList.add(`cursor-state-${stateName}`);
        }
      }
    };

    const handleMouseLeave = () => {
       if (dotRef.current) dotRef.current.style.opacity = '0';
       if (outlineRef.current) outlineRef.current.style.opacity = '0';
    };

    const handleMouseEnter = () => {
        if (dotRef.current) dotRef.current.style.opacity = '1';
        if (outlineRef.current) outlineRef.current.style.opacity = '1';
    };


    window.addEventListener('mousemove', handleMouseMove);
    document.body.addEventListener('mouseleave', handleMouseLeave);
    document.body.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
      document.body.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cursor-dot" />
      <div ref={outlineRef} className="cursor-outline" />
    </>
  );
}

