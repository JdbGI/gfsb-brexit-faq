"use client";

import { useState, useEffect } from 'react';
import Footer from "@/components/Footer";
import Image from 'next/image';

export default function Home() {
    const [chatInput, setChatInput] = useState('');
    const [chatResponse, setChatResponse] = useState(null);
    const [sourcesUsed, setSourcesUsed] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [showBanner, setShowBanner] = useState(false);
    const [bannerVisible, setBannerVisible] = useState(false);

    useEffect(() => {
        const dismissed = localStorage.getItem('treaty-banner-dismissed');
        if (!dismissed) {
            setShowBanner(true);
            const timer = setTimeout(() => setBannerVisible(true), 500);
            return () => clearTimeout(timer);
        }
    }, []);

    const dismissBanner = () => {
        setBannerVisible(false);
        setTimeout(() => {
            setShowBanner(false);
            localStorage.setItem('treaty-banner-dismissed', 'true');
        }, 400);
    };

    // Helper function to convert URLs in text to clickable links
    const linkifyText = (text) => {
        if (!text) return null;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);

        return parts.map((part, index) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={index}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--gfsb-black)', textDecoration: 'underline', fontWeight: 'bold' }}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    const handleHeroSearch = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        setIsTyping(true);
        setChatResponse(null);
        setSourcesUsed([]);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: chatInput }),
            });
            const data = await response.json();
            setChatResponse(data.reply);
            setSourcesUsed(data.sourcesUsed || []);
        } catch (error) {
            setChatResponse("Sorry, I encountered an error. Please try again.");
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <main className="gfsb-grid-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
            {/* Treaty Release Notification Banner */}
            {showBanner && (
                <div className="treaty-banner" style={{
                    gridColumn: 'span 12',
                    background: 'var(--gfsb-black)',
                    color: 'var(--gfsb-white)',
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1rem',
                    fontFamily: 'var(--font-helvetica)',
                    fontSize: 'clamp(0.8rem, 2.5vw, 0.95rem)',
                    textAlign: 'center',
                    position: 'relative',
                    transform: bannerVisible ? 'translateY(0)' : 'translateY(-100%)',
                    opacity: bannerVisible ? 1 : 0,
                    transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease',
                    overflow: 'hidden',
                    flexShrink: 0,
                }}>
                    <span style={{ position: 'relative', zIndex: 1 }}>
                        🔔 <strong>NEW: The UK-EU Treaty on Gibraltar has been published.</strong>{' '}
                        This tool now lets you search and query the full 1,018-page agreement directly. Ask your first question below.
                    </span>
                    <button
                        onClick={dismissBanner}
                        aria-label="Dismiss notification"
                        style={{
                            background: 'none',
                            border: '1px solid rgba(255,255,255,0.4)',
                            color: 'var(--gfsb-white)',
                            cursor: 'pointer',
                            fontSize: '1.1rem',
                            lineHeight: 1,
                            padding: '0.25rem 0.5rem',
                            flexShrink: 0,
                            borderRadius: '2px',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
                        onMouseLeave={(e) => e.target.style.background = 'none'}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Hero Section */}
            <div className="gfsb-grid-item" style={{ gridColumn: "span 12", padding: "2rem 1rem", borderBottom: "1px solid var(--gfsb-black)", flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>

                {/* Join the GFSB Button */}
                <a
                    href="https://gfsb.gi/join-gfsb/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="join-gfsb-btn"
                >
                    Join the GFSB
                </a>

                <div style={{ marginBottom: '1rem', position: 'relative', width: '200px', height: '70px' }}>
                    <Image
                        src="/images/gfsb-logo.png"
                        alt="GFSB Logo"
                        fill
                        style={{ objectFit: 'contain' }}
                        priority
                    />
                </div>

                <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)', textTransform: "uppercase", textAlign: 'center', marginBottom: '0.75rem', lineHeight: 1.1 }}>
                    GFSB Treaty Q&amp;A –<br />UK-EU Agreement on Gibraltar
                </h1>

                <p style={{ textAlign: 'center', maxWidth: '600px', marginBottom: '1rem', opacity: 0.8, fontSize: 'clamp(0.85rem, 2.5vw, 1.1rem)', padding: '0 0.5rem' }}>
                    The full text of the UK-EU Agreement in respect of Gibraltar has been loaded into this AI-powered tool, broken down article by article across all 1,018 pages. Ask any question and get answers drawn directly from the treaty text — something standard AI chatbots cannot do, as the document is too large for them to process in full. Every answer is sourced and cited to specific articles.
                </p>

                <form onSubmit={handleHeroSearch} style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0 0.5rem' }}>
                    <div style={{ display: 'flex' }}>
                        <input
                            type="text"
                            placeholder="Ask a question..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '1rem',
                                fontSize: '1rem',
                                border: '2px solid var(--gfsb-black)',
                                borderRadius: 0
                            }}
                        />
                        <button
                            type="submit"
                            disabled={isTyping}
                            style={{
                                padding: '0 1.5rem',
                                background: 'var(--gfsb-black)',
                                color: 'var(--gfsb-white)',
                                border: 'none',
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                cursor: 'pointer'
                            }}
                        >
                            {isTyping ? '...' : 'ASK'}
                        </button>
                    </div>
                </form>



                {/* AI Response Area */}
                {(chatResponse || isTyping) && (
                    <div style={{
                        marginTop: '2rem',
                        width: '100%',
                        maxWidth: '600px',
                        padding: '1.5rem',
                        background: 'var(--gfsb-white)',
                        border: '2px solid var(--gfsb-black)',
                        boxShadow: '8px 8px 0 rgba(0,0,0,1)'
                    }}>
                        <h3 style={{ borderBottom: '1px solid black', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Answer:</h3>
                        {isTyping ? (
                            <p>Searching sources...</p>
                        ) : (
                            <>
                                <div style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{linkifyText(chatResponse)}</div>

                                {/* Sources Used */}
                                {sourcesUsed.length > 0 && (
                                    <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px dashed #ccc' }}>
                                        <strong style={{ fontSize: '0.9rem', color: '#666' }}>Sources searched ({sourcesUsed.length}):</strong>
                                        <ul style={{ margin: '0.5rem 0 0 1rem', fontSize: '0.85rem', color: '#666' }}>
                                            {sourcesUsed.map((source, i) => (
                                                <li key={i}>
                                                    {source.name}
                                                    {source.date && ` (${source.date})`}
                                                    {source.link && (
                                                        <a href={source.link} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '0.25rem', color: '#0066cc' }}>
                                                            [link]
                                                        </a>
                                                    )}
                                                    <span style={{ opacity: 0.5 }}> — {(source.score * 100).toFixed(0)}% match</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                <div style={{ maxWidth: '600px', marginTop: '1.5rem', padding: '0 0.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem' }}>
                        Please note that the answers provided are for general information only and do not constitute legal advice. Users should take care before relying on them.
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#666' }}>
                        You can also check out our other Brexit resources <a href="https://www.gfsb.gi/benefits/brexit/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gfsb-black)', textDecoration: 'underline' }}>here</a>.
                    </p>
                </div>
            </div>

            {/* Footer */}
            <Footer />

            {/* Blue striped pattern at bottom */}
            <div className="gfsb-grid-item gfsb-stripes" style={{ gridColumn: "span 12", height: "30px", marginTop: '0', flexShrink: 0 }}></div>
        </main>
    );
}
