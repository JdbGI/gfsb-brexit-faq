"use client";

export default function SearchBar({ onSearch, onCategoryChange, categories }) {
    return (
        <div className="search-container" style={{ padding: '2rem', borderBottom: '1px solid var(--gfsb-black)' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <input
                    type="text"
                    placeholder="Search questions..."
                    onChange={(e) => onSearch(e.target.value)}
                    style={{
                        flex: 1,
                        padding: '1rem',
                        border: '1px solid var(--gfsb-black)',
                        background: 'var(--gfsb-white)',
                        fontFamily: 'inherit',
                        fontSize: '1rem',
                        borderRadius: 0, // Brutalist
                    }}
                />
                <select
                    onChange={(e) => onCategoryChange(e.target.value)}
                    style={{
                        padding: '1rem',
                        border: '1px solid var(--gfsb-black)',
                        background: 'var(--gfsb-white)',
                        fontFamily: 'inherit',
                        fontSize: '1rem',
                        borderRadius: 0,
                        minWidth: '200px'
                    }}
                >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}
