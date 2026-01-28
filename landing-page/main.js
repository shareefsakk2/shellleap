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

// OS Detection & Dynamic Download
const REPO_OWNER = 'shareefsakk2';
const REPO_NAME = 'shellleap';
const DEFAULT_VERSION = '0.1.0';

function detectOS() {
    const platform = window.navigator.platform.toLowerCase();
    const userAgent = window.navigator.userAgent.toLowerCase();

    if (platform.includes('win') || userAgent.includes('win')) return 'windows';
    if (platform.includes('mac') || userAgent.includes('mac')) return 'macos';
    if (platform.includes('linux') || userAgent.includes('linux')) return 'linux';
    return 'unknown';
}

async function updateDownloadButtons() {
    let version = DEFAULT_VERSION;

    try {
        // Fetch latest release from GitHub API
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`);
        if (response.ok) {
            const data = await response.json();
            version = data.tag_name.replace('v', '');
            console.log(`Synced with latest release: v${version}`);
        }
    } catch (e) {
        console.warn('Could not fetch latest release, falling back to default.', e);
    }

    const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/v${version}`;
    const os = detectOS();
    const heroBtn = document.getElementById('download-btn-hero');
    const ctaBtn = document.getElementById('download-btn-cta');

    const config = {
        windows: {
            text: 'Download for Windows',
            file: `ShellLeap-Setup-${version}.exe`
        },
        macos: {
            text: 'Download for macOS',
            file: `ShellLeap-${version}.dmg`
        },
        linux: {
            text: 'Download for Linux',
            file: `shell-leap_${version}_amd64.deb`
        },
        unknown: {
            text: 'Download ShellLeap',
            file: `shell-leap_${version}_amd64.deb`
        }
    };

    const settings = config[os] || config.unknown;

    [heroBtn, ctaBtn].forEach(btn => {
        if (btn) {
            const textSpan = btn.querySelector('.btn-text');
            if (textSpan) textSpan.innerText = settings.text;
            btn.href = `${REPO_URL}/${settings.file}`;
        }
    });
}

document.addEventListener('DOMContentLoaded', updateDownloadButtons);

console.log('ShellLeap Landing Page Initialized');
