import React, { useState, useRef, useEffect } from 'react';
import { Idol } from '../types';

export interface MousePos {
  x: number;
  y: number;
}

interface IdolCardProps {
  idol: Idol;
  onChoose: () => void;
  containerClassName?: string;
  mousePos: MousePos;
  isInteractive?: boolean;
  isClickable?: boolean;
  animationStagger?: number;
  allowIdleAnimation?: boolean;
  size?: 'default' | 'small';
  borderColor?: string;
}

type CardStyle = React.CSSProperties & { [key: `--${string}`]: string | number };

const MAX_ROTATION = 7; // degrees
const NEUTRAL_STYLE: CardStyle = {
  '--rx': '0deg', '--ry': '0deg', '--mx': '50%', '--my': '50%',
  '--posx': '50%', '--posy': '50%', '--hyp': 0.1, '--tx': '0px', '--ty': '0px', '--s': 1,
};

const textShadowStyle = { textShadow: '1px 1px 4px rgba(0, 0, 0, 0.8)' };

// State for dynamic styles including font size and padding
interface DynamicStyles {
  nameSizeStyle?: React.CSSProperties;
  groupSizeStyle?: React.CSSProperties;
  paddingStyle?: React.CSSProperties;
}


const IdolCard: React.FC<IdolCardProps> = ({ 
  idol, 
  onChoose, 
  containerClassName = '', 
  mousePos, 
  isInteractive = true,
  isClickable = true,
  animationStagger = 0, 
  allowIdleAnimation = true,
  size = 'default',
  borderColor,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const cardFrontRef = useRef<HTMLDivElement>(null);
  const resetTimerRef = useRef<number | null>(null);
  const [style, setStyle] = useState<CardStyle>({ ...NEUTRAL_STYLE, '--stagger': `${animationStagger}s`});
  const [isHovering, setIsHovering] = useState(false);
  const [dynamicStyles, setDynamicStyles] = useState<DynamicStyles>({});

  useEffect(() => {
    const element = cardFrontRef.current;
    if (!element) return;

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const width = entry.contentRect.width;

        let nameRatio: number, groupRatio: number, paddingRatio: number, paddingTopRatio: number;

        if (size === 'small') {
          // Final Rankings Card: Based on desired styles at its container's max-width of 240px.
          const maxCardWidth = 240;
          const maxNameSize = 30;
          const maxGroupSize = 20;
          const maxPadding = 16; // Corresponds to p-4
          const maxPaddingTop = 40; // Corresponds to pt-10

          nameRatio = maxNameSize / maxCardWidth;
          groupRatio = maxGroupSize / maxCardWidth;
          paddingRatio = maxPadding / maxCardWidth;
          paddingTopRatio = maxPaddingTop / maxCardWidth;

        } else {
          // Sorting Card: Based on desired styles at its container's max-width of 672px.
          const maxCardWidth = 672; 
          const maxNameSize = 60;   // text-6xl
          const maxGroupSize = 36;  // text-4xl
          const maxPadding = 32;    // p-8
          const maxPaddingTop = 64; // pt-16
          
          nameRatio = maxNameSize / maxCardWidth;
          groupRatio = maxGroupSize / maxCardWidth;
          paddingRatio = maxPadding / maxCardWidth;
          paddingTopRatio = maxPaddingTop / maxCardWidth;
        }

        const newNameSize = width * nameRatio;
        const newGroupSize = width * groupRatio;
        const newPadding = width * paddingRatio;
        const newPaddingTop = width * paddingTopRatio;
        
        setDynamicStyles({
          nameSizeStyle: { fontSize: `${newNameSize}px` },
          groupSizeStyle: { fontSize: `${newGroupSize}px` },
          paddingStyle: { 
            paddingLeft: `${newPadding}px`,
            paddingRight: `${newPadding}px`,
            paddingBottom: `${newPadding}px`,
            paddingTop: `${newPaddingTop}px`,
          },
        });
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [size]);


  useEffect(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    if (!cardRef.current || !mousePos) {
      if (isHovering) setIsHovering(false);
      return;
    }
    
    const elementUnderCursor = document.elementFromPoint(mousePos.x, mousePos.y);
    const isInside = cardRef.current.contains(elementUnderCursor);

    setIsHovering(isInside);

    if (isInside && isInteractive) {
      const rect = cardRef.current.getBoundingClientRect();
      const { width, height, left, top } = rect;
      const x = mousePos.x - left;
      const y = mousePos.y - top;

      const mouseXPercent = (x / width) * 100;
      const mouseYPercent = (y / height) * 100;
      
      const centerX = width / 2;
      const centerY = height / 2;

      const deltaX = x - centerX;
      const deltaY = y - centerY;

      const rotateY = -(deltaX / centerX) * MAX_ROTATION;
      const rotateX = (deltaY / centerY) * MAX_ROTATION;
      
      const dist = Math.sqrt(deltaX ** 2 + deltaY ** 2);
      const maxDist = Math.sqrt(centerX ** 2 + centerY ** 2);
      const hypotenuse = Math.min(1, dist / maxDist);

      const newStyle: CardStyle = {
        '--mx': `${mouseXPercent}%`,
        '--my': `${mouseYPercent}%`,
        '--rx': `${rotateX.toPrecision(4)}deg`,
        '--ry': `${rotateY.toPrecision(4)}deg`,
        '--posx': `${mouseXPercent}%`,
        '--posy': `${mouseYPercent}%`,
        '--hyp': hypotenuse.toPrecision(4),
        '--tx': '0px',
        '--ty': '0px',
        '--s': 1,
        '--stagger': `${animationStagger}s`
      };
      setStyle(newStyle);
    } else {
      setStyle(prev => ({...NEUTRAL_STYLE, '--stagger': prev['--stagger']}));
    }

    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, [mousePos, isInteractive, animationStagger]);
  
  const isCurrentlyInteracting = isHovering && isInteractive;

  const finalStyle: CardStyle = { ...style };
  if (borderColor) {
    finalStyle['--border-color'] = borderColor;
  }

  return (
    <div className={`${containerClassName} transition-all duration-300 ease-out`}>
      <div
        ref={cardRef}
        className={`card ${isCurrentlyInteracting ? 'interacting' : (isInteractive && allowIdleAnimation) ? 'idle-animating' : ''}`}
        style={finalStyle}
      >
        <div className="card__translater">
          <div
            className="card__rotator"
            onClick={isInteractive && isClickable ? onChoose : undefined}
            style={isInteractive && isClickable ? undefined : { cursor: 'default' }}
          >
            <div 
              ref={cardFrontRef}
              className="card__front relative rounded-2xl aspect-[2/3] overflow-hidden bg-cover bg-center"
              style={{ backgroundImage: `url(${idol.imageUrl})` }}
            >
              <div className="card__shine absolute w-full h-full top-0 left-0 z-10 pointer-events-none"></div>
              
              <div 
                className="absolute bottom-0 left-0 right-0 bg-[radial-gradient(ellipse_160%_140%_at_-20%_120%,black,transparent_75%)] flex flex-col justify-end text-white z-20"
                style={dynamicStyles.paddingStyle}
              >
                <h3 className="font-bold" style={{ ...textShadowStyle, ...dynamicStyles.nameSizeStyle }}>{idol.name}</h3>
                <p className="text-slate-300" style={{ ...textShadowStyle, ...dynamicStyles.groupSizeStyle }}>{idol.group}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdolCard;