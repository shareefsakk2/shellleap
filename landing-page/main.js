import './style.css'

// Card Spotlight Effect
const grid = document.getElementById('card-grid');

if (grid) {
    grid.onmousemove = e => {
        for (const card of document.getElementsByClassName("card")) {
            const rect = card.getBoundingClientRect(),
                x = e.clientX - rect.left,
                y = e.clientY - rect.top;

            card.style.setProperty("--mouse-x", `${x}px`);
            card.style.setProperty("--mouse-y", `${y}px`);
        };
    }
}

console.log('Premium Animation Loaded');
