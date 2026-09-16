(() => {
    const styleId = 'mr-deng-global-nav-style';
    const navClass = 'topbar';
    const navInnerClass = 'topbar-inner';
    const navBrandClass = 'topbar-brand';
    const navTitleClass = 'topbar-title';
    const navLinksClass = 'topbar-nav';
    const navLinkClass = 'topbar-link';
    const navLinkActiveClass = 'active';
    const navBrandLinkClass = 'topbar-title';
    const faviconId = 'mr-deng-favicon-link';

    if (document.getElementById(styleId)) {
        return;
    }

    const path = (window.location.pathname || '').replace(/\\/g, '/');
    const segments = path.split('/').filter(Boolean);
    const appIndex = segments.lastIndexOf('app');
    const quizIndex = segments.lastIndexOf('quiz');
    const worksheetIndex = segments.lastIndexOf('worksheet');
    const inApp = appIndex !== -1 && appIndex >= quizIndex && appIndex >= worksheetIndex;
    const inQuiz = quizIndex !== -1 && quizIndex >= appIndex && quizIndex >= worksheetIndex;
    const inWorksheet = worksheetIndex !== -1 && worksheetIndex >= appIndex && worksheetIndex >= quizIndex;

    const prefixes = (() => {
        if (inApp) {
            const depth = Math.max(0, segments.length - appIndex - 1);
            const up = '../'.repeat(depth);
            return {
                home: `${up}../`,
                apps: up || './',
                quiz: `${up}../quiz/`,
                worksheet: `${up}../worksheet/`,
                active: 'apps'
            };
        }

        if (inQuiz) {
            const depth = Math.max(0, segments.length - quizIndex - 1);
            const up = '../'.repeat(depth);
            return {
                home: `${up}../`,
                apps: `${up}../app/`,
                quiz: up || './',
                worksheet: `${up}../worksheet/`,
                active: 'quiz'
            };
        }

        if (inWorksheet) {
            const depth = Math.max(0, segments.length - worksheetIndex - 1);
            const up = '../'.repeat(depth);
            return {
                home: `${up}../`,
                apps: `${up}../app/`,
                quiz: `${up}../quiz/`,
                worksheet: up || './',
                active: 'worksheet'
            };
        }

        return {
            home: './',
            apps: './app/',
            quiz: './quiz/',
            worksheet: './worksheet/',
            active: 'home'
        };
    })();

    const existingNav = document.querySelector('.topbar-nav, .nav-links, nav[aria-label="Primary navigation"]');
    const links = [
        { href: prefixes.apps, label: 'Apps', key: 'apps' },
        { href: prefixes.quiz, label: 'Quiz', key: 'quiz' },
        { href: prefixes.worksheet, label: 'Worksheet', key: 'worksheet' }
    ];

    const existingSearch = document.getElementById('appSearch');
    const searchMarkup = existingSearch
        ? `<input id="appSearch" class="mr-deng-global-nav__search" type="search" placeholder="${existingSearch.getAttribute('placeholder') || 'Search apps...'}" aria-label="${existingSearch.getAttribute('aria-label') || 'Search apps'}">`
        : '';

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .${navClass} {
            position: sticky;
            top: 0.75rem;
            z-index: 1000;
            width: min(1180px, calc(100% - 2rem));
            margin: 0.75rem auto 1rem;
            padding: 0.9rem 1rem;
            border: 1px solid rgba(255, 255, 255, 0.65);
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(16px);
            box-shadow: 0 10px 30px rgba(16, 36, 58, 0.08);
        }

        .${navClass}__inner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .${navClass}__brand {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-family: 'Roboto Slab', serif;
            font-size: 1.1rem;
            color: #002d4a;
            font-weight: 700;
            white-space: nowrap;
        }

        .${navBrandLinkClass} {
            display: inline-flex;
            align-items: center;
            gap: 0.7rem;
            padding: 0.45rem 0.95rem 0.45rem 0.55rem;
            border-radius: 999px;
            color: inherit;
            text-decoration: none;
            background: rgba(16, 36, 58, 0.03);
            border: 1px solid rgba(16, 36, 58, 0.08);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
            transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
        }

        .${navBrandLinkClass}:hover {
            text-decoration: none;
            transform: translateY(-1px);
            background: rgba(0, 91, 148, 0.08);
            box-shadow: 0 10px 20px rgba(16, 36, 58, 0.08);
        }

        .${navClass}__brand-mark {
            width: 2.6rem;
            height: 2.6rem;
            border-radius: 14px;
            display: grid;
            place-items: center;
            font-family: 'Poppins', sans-serif;
            font-size: 1.25rem;
            background: linear-gradient(135deg, #005b94, #19a7ce);
            color: #ffffff;
            box-shadow: 0 10px 24px rgba(11, 110, 168, 0.22);
        }

        .${navLinkClass} {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.45rem 0.85rem;
            margin: 0.1rem;
            border-radius: 999px;
            text-decoration: none;
            font-family: 'Poppins', sans-serif;
            font-size: 0.95rem;
            font-weight: 700;
            color: #334155;
            transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
        }

        .${navLinkClass}:hover {
            transform: translateY(-1px);
            background: rgba(0, 91, 148, 0.08);
        }

        .${navLinkActiveClass} {
            background: linear-gradient(135deg, #005b94, #19a7ce);
            color: #ffffff !important;
        }

        .${navClass}__links,
        .${navLinksClass} {
            display: flex;
            align-items: center;
            gap: 0.3rem;
            flex-wrap: wrap;
        }

        .${navClass}__search {
            width: min(520px, 100%);
            border: 1px solid #d1d5db;
            border-radius: 999px;
            padding: 0.78rem 1.05rem;
            font-family: 'Poppins', sans-serif;
            font-size: 0.95rem;
            color: #1f2937;
            background: #f8fafc;
            box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.08);
        }

        .${navClass}__search:focus {
            outline: none;
            border-color: #2563eb;
            background-color: #ffffff;
        }

        .${navClass}__links--fallback {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.3rem;
            flex-wrap: wrap;
        }

        .${navClass}__fallback-title {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        body > .${navClass}:first-child {
            margin-top: 0.5rem;
        }

        @media (max-width: 720px) {
            .${navClass} {
                width: min(100% - 0.75rem, 1180px);
                border-radius: 24px;
            }

            .${navClass}__inner {
                justify-content: center;
                text-align: center;
            }

            .${navClass}__brand {
                width: 100%;
                justify-content: center;
            }

            .${navClass}__links,
            .${navClass}__links--fallback {
                justify-content: center;
            }

            .${navClass}__search {
                width: 100%;
            }
        }
    `;
    document.head.appendChild(style);

    if (!document.getElementById(faviconId)) {
        const favicon = document.createElement('link');
        favicon.id = faviconId;
        favicon.rel = 'icon';
        favicon.type = 'image/svg+xml';
        favicon.href = `${prefixes.home}favicon.svg`;
        document.head.appendChild(favicon);
    }

    const linkMarkup = links
        .map((link) => `<a href="${link.href}" class="${navLinkClass}${prefixes.active === link.key ? ` ${navLinkActiveClass}` : ''}">${link.label}</a>`)
        .join('');

    const buildNavMarkup = () => `
        <div class="${navInnerClass}">
            <div class="${navBrandClass}">
                <a href="${prefixes.home}" class="${navBrandLinkClass}">Mr Deng Maths</a>
                <nav class="${navLinksClass}" aria-label="Primary navigation">
                    ${linkMarkup}
                </nav>
            </div>
            ${searchMarkup}
        </div>
    `;

    const applyFloatingHeaderStyles = (element) => {
        element.style.position = 'sticky';
        element.style.top = '0.75rem';
        element.style.zIndex = '1000';
        element.style.width = 'min(1180px, calc(100% - 2rem))';
        element.style.margin = '0.75rem auto 1rem';
        element.style.padding = '0.9rem 1rem';
        element.style.border = '1px solid rgba(255, 255, 255, 0.65)';
        element.style.borderRadius = '999px';
        element.style.background = 'rgba(255, 255, 255, 0.8)';
        element.style.backdropFilter = 'blur(16px)';
        element.style.boxShadow = '0 10px 30px rgba(16, 36, 58, 0.08)';

        const bodyPaddingTop = parseFloat(window.getComputedStyle(document.body).paddingTop || '0');
        if (!Number.isNaN(bodyPaddingTop) && bodyPaddingTop >= 100) {
            document.body.style.paddingTop = '2rem';
        }
    };

    if (existingNav) {
        const existingHeader = existingNav.closest('header') || existingNav.parentElement;
        if (existingHeader) {
            applyFloatingHeaderStyles(existingHeader);
            existingHeader.classList.add(navClass);
            existingHeader.innerHTML = buildNavMarkup();
            return;
        }
    }

    const fallback = document.createElement('header');
    fallback.className = navClass;
    fallback.setAttribute('aria-label', 'Primary navigation');
    fallback.innerHTML = buildNavMarkup();

    document.body.insertBefore(fallback, document.body.firstChild);
})();