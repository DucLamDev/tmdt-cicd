import { useState, useRef } from 'react';

const ImageZoom = ({ src, alt, style }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
  const imgRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setLensPos({ x, y });
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', cursor: isZoomed ? 'zoom-out' : 'zoom-in', ...style }}>
      <img ref={imgRef} src={src} alt={alt}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', transform: isZoomed ? 'scale(2)' : 'scale(1)', transformOrigin: `${lensPos.x}% ${lensPos.y}%` }}
        onClick={() => setIsZoomed(!isZoomed)}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setIsZoomed(false)} />
    </div>
  );
};

export default ImageZoom;
