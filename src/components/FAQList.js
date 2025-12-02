"use client";
import { useState } from 'react';

function FAQItem({ question, answer, category }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div style={{ borderBottom: '1px solid var(--gfsb-black)' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '1.5rem',
                    background: isOpen ? 'var(--gfsb-black)' : 'transparent',
                    color: isOpen ? 'var(--gfsb-white)' : 'var(--gfsb-black)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontFamily: 'inherit',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease'
                }}
            >
                <span>{question}</span>
                <span>{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && (
                <div style={{
                    padding: '1.5rem',
                    background: 'var(--gfsb-white)',
                    borderTop: '1px solid var(--gfsb-black)'
                }}>
                    <div style={{ marginBottom: '1rem', fontSize: '0.9rem', opacity: 0.6, textTransform: 'uppercase' }}>
                        {category}
                    </div>
                    <p style={{ lineHeight: 1.6 }}>{answer}</p>
                </div>
            )}
        </div>
    );
}

export default function FAQList({ faqs }) {
    if (faqs.length === 0) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>No questions found matching your criteria.</div>;
    }

    return (
        <div className="faq-list">
            {faqs.map((faq, index) => (
                <FAQItem key={index} {...faq} />
            ))}
        </div>
    );
}
