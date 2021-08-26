const Reveal = require('../../node_modules/reveal.js').default;
const Markdown = require('../../node_modules/reveal.js/plugin/markdown/markdown.esm.js').default;

export class Slides {
    constructor() {
        
    }

    loadMarkdown(markdown) {
        this.markdown = markdown;
        this.maximized = false;

        $('#markdown').html(markdown);
        let deck = new Reveal({
            plugins: [Markdown],
        })
        deck.initialize({
            'embedded': true,
        });
        this.deck = deck; 

        $('#slides').removeClass('hidden');
        $('#slides-toggle').removeClass('hidden');
        $('#slides-toggle').attr('title', 'Toggle the slides.');
        
        $('#slides-toggle').on('click', () => {
            this.toggleMaximized();
        });
    }

    loadURL(url) {
        $.get(url, markdown => this.loadMarkdown(markdown));
    }

    toggleMaximized() {
        this.setMaximized(!this.maximized);
    }

    setMaximized(maximized) {
        this.maximized = maximized;
        if (maximized) {
            $('#slides').removeClass('minimized');
            $('#slides-toggle').text('\u2198');
        } else {
            $('#slides').addClass('minimized');
            $('#slides-toggle').text('\u2196');
        }
        setTimeout(() => this.deck.layout(), 500);
    }
}