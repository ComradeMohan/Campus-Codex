'use client';

import { useState, useEffect, useRef, type RefObject } from 'react';

interface UseInViewOptions extends IntersectionObserverInit {
  triggerOnce?: boolean;
}

export const useInView = (options?: UseInViewOptions): [RefObject<any>, boolean] => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (options?.triggerOnce) {
            observer.unobserve(element);
          }
        } else {
          if (!options?.triggerOnce) {
            setInView(false);
          }
        }
      },
      { root: options?.root, rootMargin: options?.rootMargin, threshold: options?.threshold }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [options]);

  return [ref, inView];
};
