import { useState, useEffect, useRef, useCallback } from 'react';

export default function Ecclesiastes() {
  const [current, setCurrent] = useState(0);
  const [tappedWord, setTappedWord] = useState(null);
  
  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const targetPosRef = useRef({ x: 0, y: 0, scale: 0.44, slotWidth: 0 });
  const touchRef = useRef({ x: 0, y: 0, p: 0 });
  const wheelTimerRef = useRef(null);
  
  const elEnRef = useRef(null);
  const elHeRef = useRef(null);
  const elVerseRef = useRef(null);
  const slotRef = useRef(null);
  const titleHeRef = useRef(null);
  const wordRef = useRef(null);

  const LERP = 0.085;
  const ANCHORS = [0, 0.5, 1];

  const K = {
    en: {
      0: [1, 1, 0, 0],
      0.3: [1, 1, -40, 0],
      0.5: [1, 1, -55, 0],
      0.7: [0.3, 0.97, -65, 0],
      1: [0, 0.94, -75, 0]
    },
    verse: {
      0: [0, 1.05, 40, 0],
      0.5: [0, 1.03, 30, 0],
      0.65: [0, 1.02, 18, 0],
      0.75: [0.5, 1.01, 10, 0],
      0.85: [0.8, 1, 5, 0],
      0.95: [0.95, 1, 1, 0],
      1: [1, 1, 0, 0]
    }
  };

  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  const getVal = (kf, p, i) => {
    const pts = Object.keys(kf).map(Number).sort((a, b) => a - b);
    let lo = pts[0], hi = pts[pts.length - 1];
    for (let j = 0; j < pts.length - 1; j++) {
      if (p >= pts[j] && p <= pts[j + 1]) { lo = pts[j]; hi = pts[j + 1]; break; }
    }
    const range = hi - lo || 1;
    const t = (p - lo) / range;
    return lerp(kf[lo][i], kf[hi][i], ease(t));
  };

  const calcTarget = useCallback(() => {
    if (!elHeRef.current || !elVerseRef.current || !slotRef.current || !titleHeRef.current || !wordRef.current) return;

    const oldHeTransform = elHeRef.current.style.transform;
    const oldVerseTransform = elVerseRef.current.style.transform;
    const oldVerseOpacity = elVerseRef.current.style.opacity;
    const oldSlotWidth = slotRef.current.style.width;

    elHeRef.current.style.transform = 'none';
    elVerseRef.current.style.transform = 'none';
    elVerseRef.current.style.opacity = '1';

    const titleHeRect = titleHeRef.current.getBoundingClientRect();
    const verseWordSize = parseFloat(getComputedStyle(wordRef.current).fontSize);
    const titleSize = parseFloat(getComputedStyle(titleHeRef.current).fontSize);
    const targetScale = verseWordSize / titleSize;

    const slotWidth = titleHeRect.width * targetScale;
    slotRef.current.style.width = slotWidth + 'px';
    slotRef.current.offsetHeight;

    const slotRect = slotRef.current.getBoundingClientRect();
    const titleCenterX = titleHeRect.left + titleHeRect.width / 2;
    const titleCenterY = titleHeRect.top + titleHeRect.height / 2;
    const slotCenterX = slotRect.left + slotRect.width / 2;
    const slotCenterY = slotRect.top + slotRect.height / 2;

    targetPosRef.current = {
      x: slotCenterX - titleCenterX,
      y: slotCenterY - titleCenterY,
      scale: targetScale,
      slotWidth
    };

    elHeRef.current.style.transform = oldHeTransform;
    elVerseRef.current.style.transform = oldVerseTransform;
    elVerseRef.current.style.opacity = oldVerseOpacity;
    slotRef.current.style.width = oldSlotWidth;
  }, []);

  const snap = useCallback(() => {
    let best = ANCHORS[0], dist = Math.abs(targetRef.current - best);
    for (const a of ANCHORS) {
      const d = Math.abs(targetRef.current - a);
      if (d < dist) { dist = d; best = a; }
    }
    targetRef.current = best;
  }, []);

  const next = useCallback(() => {
    for (const a of ANCHORS) {
      if (a > targetRef.current + 0.01) { targetRef.current = a; return; }
    }
  }, []);

  const prev = useCallback(() => {
    for (let i = ANCHORS.length - 1; i >= 0; i--) {
      if (ANCHORS[i] < targetRef.current - 0.01) { targetRef.current = ANCHORS[i]; return; }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      calcTarget();
    }, 100);

    const handleResize = () => calcTarget();
    window.addEventListener('resize', handleResize);

    let animationId;
    const render = () => {
      const d = targetRef.current - currentRef.current;
      currentRef.current = Math.abs(d) > 0.0001 ? currentRef.current + d * LERP : targetRef.current;
      currentRef.current = Math.max(0, Math.min(1, currentRef.current));

      const p = currentRef.current;
      const { x: tX, y: tY, scale: tS, slotWidth } = targetPosRef.current;

      // English title
      if (elEnRef.current) {
        const o = getVal(K.en, p, 0);
        const s = getVal(K.en, p, 1);
        const y = getVal(K.en, p, 2);
        elEnRef.current.style.opacity = o;
        elEnRef.current.style.transform = `translateY(${y}px) scale(${s})`;
        elEnRef.current.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
      }

      // Hebrew title (the ONE קֹהֶלֶת)
      if (elHeRef.current) {
        let o, s, x, y;
        if (p <= 0.2) {
          const t = p / 0.2;
          o = ease(t);
          s = lerp(1.1, 1, ease(t));
          y = lerp(28, 20, ease(t));
          x = 0;
        } else if (p <= 0.5) {
          o = 1;
          s = 1;
          y = lerp(20, 15, (p - 0.2) / 0.3);
          x = 0;
        } else {
          const journey = (p - 0.5) / 0.5;
          const ej = ease(journey);
          o = 1;
          s = lerp(1, tS, ej);
          y = lerp(15, tY, ej);
          x = lerp(0, tX, ej);
        }
        elHeRef.current.style.opacity = o;
        elHeRef.current.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
        elHeRef.current.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
      }

      // Verse
      if (elVerseRef.current) {
        const o = getVal(K.verse, p, 0);
        const s = getVal(K.verse, p, 1);
        const y = getVal(K.verse, p, 2);
        elVerseRef.current.style.opacity = o;
        elVerseRef.current.style.transform = `translateY(${y}px) scale(${s})`;
        elVerseRef.current.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
      }

      // Slot
      if (slotRef.current) {
        const slotProgress = Math.max(0, (p - 0.6) / 0.4);
        slotRef.current.style.width = (slotWidth * ease(slotProgress)) + 'px';
      }

      setCurrent(currentRef.current);
      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    // Input handlers
    const handleTouchStart = (e) => {
      touchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        p: targetRef.current
      };
    };

    const handleTouchMove = (e) => {
      const dx = e.touches[0].clientX - touchRef.current.x;
      const dy = e.touches[0].clientY - touchRef.current.y;
      const delta = Math.abs(dy) > Math.abs(dx) ? -dy : -dx;
      targetRef.current = Math.max(0, Math.min(1, touchRef.current.p + delta / 350));
    };

    const handleWheel = (e) => {
      e.preventDefault();
      const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      targetRef.current = Math.max(0, Math.min(1, targetRef.current + d / 600));
      clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(snap, 150);
    };

    const handleKeyDown = (e) => {
      if (['ArrowDown', 'ArrowRight', ' '].includes(e.key)) { e.preventDefault(); next(); }
      else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); prev(); }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', snap, { passive: true });
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', snap);
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [calcTarget, snap, next, prev]);

  const handleWordClick = (word) => (e) => {
    e.stopPropagation();
    setTappedWord(tappedWord === word ? null : word);
  };

  const handleContainerClick = () => setTappedWord(null);

  const Word = ({ hebrew, meaning, id }) => {
    const isTitle = id === 'title';
    const isTapped = tappedWord === id;
    
    return (
      <span
        ref={id === 'firstWord' ? wordRef : undefined}
        className={`word ${isTapped ? 'tapped' : ''}`}
        onClick={handleWordClick(id)}
        style={isTitle ? {} : undefined}
      >
        {hebrew}
        <span className="meaning">{meaning}</span>
      </span>
    );
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,400&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }

        .container {
          height: 100vh;
          width: 100vw;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Cormorant Garamond', Georgia, serif;
          overflow: hidden;
          position: relative;
        }

        .el {
          position: absolute;
          will-change: transform, opacity;
        }

        .title-en {
          font-size: clamp(24px, 6vw, 35px);
          font-weight: 300;
          color: #e8e4dc;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .title-he {
          font-size: clamp(48px, 12vw, 75px);
          font-weight: 400;
          color: #daa520;
          direction: rtl;
          position: relative;
          padding: 8px 16px 12px;
          cursor: pointer;
        }

        .verse {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: min(90vw, 600px);
          padding: 0 12px;
        }

        .verse-he {
          direction: rtl;
          text-align: center;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0 clamp(4px, 1.5vw, 10px);
          row-gap: clamp(28px, 6vw, 38px);
        }

        .word {
          position: relative;
          padding: 2px 4px;
          color: #daa520;
          font-size: clamp(24px, 6vw, 33px);
          font-weight: 400;
          cursor: pointer;
        }

        .verse-en {
          font-size: clamp(17px, 4.2vw, 22px);
          font-weight: 300;
          font-style: italic;
          color: #e8e4dc;
          line-height: 1.8;
          margin-top: clamp(16px, 4vw, 28px);
          text-align: center;
        }

        .meaning {
          position: absolute;
          left: 50%;
          top: 100%;
          transform: translateX(-50%) translateY(2px);
          font-size: clamp(10px, 2.2vw, 13px);
          font-weight: 300;
          font-style: italic;
          color: rgba(232, 228, 220, 0.85);
          white-space: nowrap;
          direction: ltr;
          opacity: 0;
          pointer-events: none;
        }

        .title-he .meaning {
          font-size: clamp(13px, 2.8vw, 17px);
        }

        @keyframes meaningReveal {
          0% { opacity: 0; transform: translateX(-50%) translateY(-3px) scale(0.96); }
          50% { opacity: 0.9; transform: translateX(-50%) translateY(1px) scale(1.01); }
          75% { transform: translateX(-50%) translateY(-0.5px) scale(1); }
          100% { opacity: 1; transform: translateX(-50%) translateY(2px) scale(1); }
        }

        @keyframes meaningRevealTitle {
          0% { opacity: 0; transform: translateX(-50%) translateY(-3px) scale(0.96); }
          50% { opacity: 0.9; transform: translateX(-50%) translateY(2px) scale(1.01); }
          75% { transform: translateX(-50%) translateY(0px) scale(1); }
          100% { opacity: 1; transform: translateX(-50%) translateY(4px) scale(1); }
        }

        .word:hover .meaning,
        .word.tapped .meaning {
          animation: meaningReveal 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .title-he:hover .meaning,
        .title-he.tapped .meaning {
          animation: meaningRevealTitle 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .word-slot {
          display: inline-block;
          width: 0;
        }

        .progress {
          position: fixed;
          bottom: 0;
          left: 0;
          height: 2px;
          background: rgba(218, 165, 32, 0.5);
        }
      `}</style>

      <div className="container" onClick={handleContainerClick}>
        <div className="el" ref={elEnRef} style={{ opacity: 1 }}>
          <span className="title-en">Ecclesiastes</span>
        </div>

        <div className="el" ref={elHeRef} style={{ opacity: 0, transform: 'translateY(28px) scale(1.1)' }}>
          <span 
            ref={titleHeRef}
            className={`title-he ${tappedWord === 'title' ? 'tapped' : ''}`}
            onClick={handleWordClick('title')}
          >
            קֹהֶלֶת
            <span className="meaning">the Teacher</span>
          </span>
        </div>

        <div className="el" ref={elVerseRef} style={{ opacity: 0, transform: 'translateY(40px) scale(1.05)' }}>
          <div className="verse">
            <div className="verse-he">
              <Word hebrew="דִּבְרֵי" meaning="words of" id="firstWord" />
              <span className="word-slot" ref={slotRef}></span>
              <Word hebrew="בֶּן" meaning="son of" id="ben" />
              <Word hebrew="דָּוִד" meaning="David" id="david" />
              <Word hebrew="מֶלֶךְ" meaning="king" id="melekh" />
              <Word hebrew="בִּירוּשָׁלָֽ͏ִם" meaning="in Jerusalem" id="jerusalem" />
            </div>
            <p className="verse-en">The words of the Teacher, son of David, king in Jerusalem</p>
          </div>
        </div>
      </div>

      <div className="progress" style={{ width: `${current * 100}%` }} />
    </>
  );
}
