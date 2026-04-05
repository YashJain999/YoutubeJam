import React, { useState } from 'react'

const SearchBar = ({ onVideoSelect }) => {

    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);

    const API_KEY = 'AIzaSyCgYBjCs1MyW1D4DUtiwEUE5fVrx4YPbx4';

    const search = async () => {
        const res = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(query)}&key=${API_KEY}`
        )
        const data = await res.json();
        setResults(data``.items)
    }
    return (
        <div>
            <input
                type="text"
                placeholder="Search YouTube"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <button onClick={search}>Search</button>
            <ul>
                {results.map((item) => (
                    <li key={item.id.videoId}>
                        <img src={item.snippet.thumbnails.default.url} alt="" />
                        <button onClick={() => onVideoSelect(item.id.videoId)}>
                            {item.snippet.title}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default SearchBar