import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * A fixed "scroll to top" button that appears once the user scrolls
 * down more than 300 px. Clicking it smoothly scrolls back to the top.
 */
const ScrollToTopButton: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      title="Scroll to top"
      className={`
        fixed bottom-6 right-6 z-50
        flex items-center justify-center
        w-11 h-11 rounded-full
        bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
        text-white shadow-lg hover:shadow-indigo-500/40
        transition-all duration-300 ease-in-out
        ${visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}
      `}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
};

export default ScrollToTopButton;
