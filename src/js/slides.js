const Reveal = require('../../node_modules/reveal.js').default;
const Markdown = require('../../node_modules/reveal.js/plugin/markdown/markdown.esm.js').default;

export class Slides {
    constructor(useControls) {
        this.onQFinished = null;
        this.onQStarted = null;
        this.useControls = useControls;
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
            'controls': this.useControls,
            'markdown': {
                smartLists: true,
            }
        });
        this.deck = deck; 

        $('#slides').removeClass('hidden');
        $('#slides-toggle').removeClass('hidden');
        $('#slides-toggle').attr('title', 'Toggle the slides.');
        
        $('#slides-toggle').on('click', () => {
            this.toggleMaximized();
        });

        this.qn = 0;
        $('#question-pause').on('click', () => {
            let id = deck.getCurrentSlide().id;
            if (!this.maximized) id = this.qn++;
            slides.recordEvent('questionPause', {id: id});
        });

        deck.on('q-finished', () => {
            let id = deck.getCurrentSlide().id;
            if (this.onQFinished) {
                this.onQFinished(id);
            }
            this.recordEvent('waitForQuestion', {
                id: id,
            });
        });

        deck.on('slidechanged', event => {
            // Skip this if we're going to the end of a question.
            if (event.currentSlide.classList.contains('q-finished')) {
                return;
            }
            this.recordEvent('slideChanged', {
                id: event.currentSlide.id,
                indexh: event.indexh,
                indexv: event.indexv,
            });
        });
    }

    reset() {
        this.deck.slide(0, 0);
        this.setMaximized(false);
    }

    loadRecord(record) {
        let playFn = this.createRecord(record);
        if (!playFn) return null;
        return {
            'replay': playFn,
        };
    }

    createRecord(record) {
        let data = record.data;
        switch (record.type) {
            case 'slideChanged':
                return (callback, fast) => {
                    if (!this.setSlideByID(data.id)) {
                        this.deck.slide(data.indexh, data.indexv);
                    }
                    setTimeout(callback, 1);
                };
            case 'slidesToggled':
                return (callback, fast) => {
                    this.setMaximized(data.value);
                    setTimeout(callback, 1);
                };
            case 'waitForQuestion':
                return (callback, fast) => {
                    if (fast) {
                        this.setSlideByID(data.id);
                    } else if (this.onQStarted) {
                        this.onQStarted(data.id, false);
                    }
                    setTimeout(callback, 1);
                };
            case 'questionPause':
                return (callback, fast) => {
                    if (!fast) {
                        this.onQStarted(data.id, true);
                    }
                    setTimeout(callback, 1);
                };
        }
        return null;
    }

    showHint(questionID) {
        console.log(questionID);
        this.setSlideByID(questionID + '-hint');
        this.setMaximized(true);
    }

    hasHint(questionID) {
        let slide = document.getElementById(questionID + '-hint');
        return !!slide;
    }

    setSlideByID(id) {
        let slide = document.getElementById(id);
        if (!slide) return false;
        let indices = this.deck.getIndices(slide);
        if (!indices) return false;
        this.deck.slide(indices.h, indices.v);
        return true;
    }

    loadURL(url) {
        $.get(url, markdown => this.loadMarkdown(markdown));
    }

    toggleMaximized() {
        this.setMaximized(!this.maximized);
    }

    recordEvent(type, data) {
        let iframe = document.getElementById('isnap');
        if (iframe) {
            let recorder = iframe.contentWindow.recorder;
            if (recorder) {
                recorder.recordEvent(type, data);
            }
        }
    }

    setMaximized(maximized) {
        this.maximized = maximized;
        this.recordEvent('slidesToggled', {value: this.maximized});
        if (maximized) {
            $('#slides').removeClass('minimized');
        } else {
            $('#slides').addClass('minimized');
        }
        $('#slides-toggle-icon').toggleClass('bi-arrow-up-left', !maximized);
        $('#slides-toggle-icon').toggleClass('bi-arrow-down-right', maximized);
        setTimeout(() => this.deck.layout(), 500);
    }
}