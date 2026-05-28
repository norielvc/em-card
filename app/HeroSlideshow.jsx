'use client';

import { useState, useEffect } from 'react';

const slides = [
  '/pexels-dave-36033605.jpg',
  '/pexels-denniz-futalan-339724-3453056.jpg',
  '/pexels-furdi-de-rivera-93670268-11070005.jpg',
  '/pexels-gasparclarence01-37364004.jpg',
  '/pexels-ian-panelo-34239123.jpg',
  '/pexels-reynante-lacbain-74116714-8789539.jpg',
];

export default function HeroSlideshow() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {slides.map((src, i) => (
        <div
          key={src}
          className={`hero-slide ${i === current ? 'active' : ''}`}
          style={{ backgroundImage: `url('${src}')` }}
        />
      ))}
      <div className="hero-overlay" />
    </>
  );
}
