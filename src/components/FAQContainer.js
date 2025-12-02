"use client";
import { useState, useMemo } from 'react';
import SearchBar from './SearchBar';
import FAQList from './FAQList';

export default function FAQContainer({ initialFaqs }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    // Extract unique categories
    const categories = useMemo(() => {
        const cats = new Set(initialFaqs.map(f => f.category).filter(Boolean));
        return Array.from(cats);
    }, [initialFaqs]);

    // Filter FAQs
    const filteredFaqs = useMemo(() => {
        return initialFaqs.filter(faq => {
            const matchesSearch =
                faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory ? faq.category === selectedCategory : true;

            return matchesSearch && matchesCategory;
        });
    }, [initialFaqs, searchTerm, selectedCategory]);

    return (
        <div style={{ border: '1px solid var(--gfsb-black)', background: 'var(--gfsb-cyan)' }}>
            <SearchBar
                onSearch={setSearchTerm}
                onCategoryChange={setSelectedCategory}
                categories={categories}
            />
            <FAQList faqs={filteredFaqs} />
        </div>
    );
}
