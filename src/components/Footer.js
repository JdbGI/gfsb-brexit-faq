"use client";

import Image from 'next/image';
import { useState } from 'react';

export default function Footer() {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <footer
            style={{
                gridColumn: 'span 12',
                padding: '1.5rem 1rem',
                borderTop: '2px solid var(--gfsb-black)',
                background: 'var(--gfsb-cyan)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Subtle animated background accent */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '4px',
                    background: 'var(--gfsb-black)',
                    transform: isHovered ? 'scaleX(1)' : 'scaleX(0)',
                    transformOrigin: 'left',
                    transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            />

            {/* Barton Logo with subtle animation */}
            <div
                style={{
                    position: 'relative',
                    width: '150px',
                    height: '45px',
                    transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                <Image
                    src="/barton-logo.png"
                    alt="Barton Solutions Logo"
                    fill
                    style={{
                        objectFit: 'contain',
                        transition: 'filter 0.4s ease'
                    }}
                />
            </div>

            {/* Text with subtle fade-in animation */}
            <p
                style={{
                    fontSize: '0.95rem',
                    fontWeight: '500',
                    letterSpacing: '0.5px',
                    color: 'var(--gfsb-black)',
                    textAlign: 'center',
                    opacity: isHovered ? 1 : 0.85,
                    transition: 'opacity 0.4s ease',
                    margin: 0
                }}
            >
                Built for the <strong>GFSB</strong> by <strong>Barton Solutions</strong>
            </p>

            {/* Decorative element */}
            <div
                style={{
                    width: isHovered ? '60px' : '40px',
                    height: '2px',
                    background: 'var(--gfsb-black)',
                    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            />
        </footer>
    );
}
