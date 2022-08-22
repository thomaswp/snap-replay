const Reveal = require('../../node_modules/reveal.js').default;
const Markdown = require('../../node_modules/reveal.js/plugin/markdown/markdown.esm.js').default;

if (!window.Trace) {
    window.Trace = {
        log: (message, data) => {
            console.info('Logging:', message, data);
        }
    }
}

export class Slides {
    constructor(path, useControls) {
        this.path = path;
        this.onQFinished = null;
        this.onQStarted = null;
        this.useControls = useControls;
        this.logSlideChanges = true;
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

        let path = this.path;
        deck.on('ready', event => {
            $('#slides img').each(function() {
                let src = path + $(this).attr('src')
                $(this).attr('src', src);
            });
        });

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
            this.lastQuestionID = id;
            Slides.recordEvent('questionPause', {id: id});
        });
        $('#question-answered').on('click', () => {
            Slides.recordEvent('questionAnswered', {id: this.lastQuestionID});
        });

        deck.on('q-finished', () => {
            let id = deck.getCurrentSlide().id;
            if (this.onQFinished) {
                this.onQFinished(id);
            }
            // We use skipping to the answer as a way to mark the start of the q
            Slides.recordEvent('waitForQuestion', {
                id: id,
            });
        });

        deck.on('slidechanged', event => {
            const slideData = {
                id: event.currentSlide.id,
                indexh: event.indexh,
                indexv: event.indexv,
            };
            if (this.logSlideChanges) {
                Trace.log('Slides.userChangedSlide', slideData)
            }
            // Skip this if we're going to the end of a question.
            if (event.currentSlide.dataset.state === 'q-finished') {
                return;
            }
            Slides.recordEvent('slideChanged', slideData);
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
        // console.log("Creating", record);
        let data = record.data;
        switch (record.type) {
            case 'slideChanged':
                return (callback, fast) => {
                    this.logSlideChanges = false;
                    if (!this.setSlideByID(data.id)) {
                        this.deck.slide(data.indexh, data.indexv);
                    }
                    this.logSlideChanges = true;
                    setTimeout(callback, 1);
                };
            case 'slidesToggled':
                return (callback, fast) => {
                    this.setMaximized(data.value);
                    setTimeout(callback, 1);
                };
            case 'waitForQuestion':
                // Recorded when the recorder goes to the answer slide
                // (that slideChanged event is skipped) to mark when
                // the question should be posed
                return (callback, fast) => {
                    if (fast) {
                        this.setSlideByID(data.id);
                    } else if (this.onQStarted) {
                        this.onQStarted(data.id, false);
                    }
                    setTimeout(callback, 1);
                };
            case 'questionPause':
                // Recorded when the [?] button is pressed to indicate
                // the start of a modify question
                return (callback, fast) => {
                    if (!fast) {
                        this.onQStarted(data.id, true);
                    }
                    setTimeout(callback, 1);
                };
            case 'questionAnswered':
                // Recorded when the [check] button is pressed to indicate
                // the recorder has finished demonstrating the answer to a
                // modify question
                return (callback, fast) => {
                    setTimeout(callback, 1);
                };
        }
        return null;
    }

    showHint(questionID) {
        Trace.log('Slides.showHint', {
            'id': questionID,
        });
        // console.log(questionID);
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
        Trace.log('Slides.toggle', {
            'showing': this.maximized,
        });
    }

    static recordEvent(type, data) {
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
        Slides.recordEvent('slidesToggled', {value: this.maximized});
        if (maximized) {
            $('#slides').removeClass('minimized');
        } else {
            $('#slides').addClass('minimized');
        }
        $('#slides-toggle-icon').toggleClass('bi-arrow-up-left', !maximized);
        $('#slides-toggle-icon').toggleClass('bi-arrow-down-right', maximized);
        if (!maximized) $('#slides-toggle').removeClass('blinking');
        setTimeout(() => this.deck.layout(), 500);
    }
}