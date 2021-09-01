
const $ = require('../../node_modules/jquery');
const { ScriptLoader } = require('./loader');
const { Slides } = require('./slides');
const { Script } = require('./script');

export class Playback {

    // 0 because we do this in the script itself now
    static BUFFER_MS = 0;

    constructor(path) {
        this.path = path;
        this.snapWindow = document.getElementById('isnap').contentWindow;
        $(this.snapWindow).on('click', () => this.snapFocused());
        this.loader = new ScriptLoader(path);
        this.loader.loadAudio('#audio');
        this.loader.onLoaded = (script) => {
            this.script = script;
            this.events = script.getEvents();
            console.log(this.events);
            this.addScript();
            this.restart();
            this.createSlides();
        }
        $('#isnap').on('load', () => {
            if (this.snapWindow.recorder) {
                this.restart();
            } else {
                this.snapWindow.onWorldLoaded = () => {
                    this.restart();
                };
            }
        });
        this.audio = $('#audio')[0];
        this.$scrubber = $('#scrubber');
        this.$scrubber.on("change", () => this.finishSettingDuration());
        this.$scrubber.on("change input", () => this.setDuration());
        this.$script = $('#script');
        this.time = 0;
        this.playing = false;
        this.snapEdits = 0;
        this.duration = 0;
        this.highlightedBlocks = [];
        this.highlights = [];
        this.playingAction = false;
        this.answeredQs = [];
        this.maxDuration = 0;

        $('body').keyup((e) => {
            if (e.keyCode == 32) {
                this.togglePlay();
            }
        });

        // Playback.getDuration(this.loader.audioPath, (duration) => {
        //     this.duration = Math.max(this.duration, duration * 1000);
        //     this.$scrubber.attr('max', Math.round(this.duration));
        //     this.update();
        // });

        // TODO: Use actual callback!
        setTimeout(() => {
            this.snapWindow.Trace.addLoggingHandler('Block.snapped',
                () => this.snapEdits++);
        }, 2000);

        let noop = () => {};
        navigator.mediaSession.setActionHandler('play', noop);
        navigator.mediaSession.setActionHandler('pause', noop);
        navigator.mediaSession.setActionHandler('seekbackward', noop);
        navigator.mediaSession.setActionHandler('seekforward', noop);
        navigator.mediaSession.setActionHandler('previoustrack', noop);
        navigator.mediaSession.setActionHandler('nexttrack', noop);

        this.createClickHighlight();
    }

    createSlides() {
        if (!this.script.slidesMD) return;
        this.slides = new Slides();
        this.slides.loadMarkdown(this.script.slidesMD);
        this.slides.onQStarted = (id) => this.waitForAnswer(id);
        this.slides.onQFinished = (id) => this.answerReceived(id);
    }

    waitForAnswer(id) {
        if (this.answeredQs.includes(id)) {
            // console.log("Skipping answered", id);
            this.slides.setSlideById(id);
            return;
        }
        // console.log("Asking", id);
        this.askingQuestion = id;
        this.pause();
    }

    answerReceived(id) {
        if (!this.askingQuestion) return;
        // console.log("Answered", id);
        this.answeredQs.push(id);
        this.askingQuestion = null;
        this.play();
    }

    createClickHighlight() {
        // create a DIV element, give it an ID and add it
        // to the body
        this.clickHighlight = document.createElement('div');
        this.clickHighlight.id = 'clickHighlight';
        document.body.appendChild(this.clickHighlight);
        // define offset as half the width of the DIV
        // (this is needed to put the mouse cursor in
        // its centre)
        var plot = this.clickHighlight;
        var offset = plot.offsetWidth / 2;
        // move the DIV to x and y with the correct offset
        this.clickHighlight.trigger = (x, y) => {
            plot.style.left = x - offset + 'px';
            plot.style.top = y - offset + 'px';
            plot.classList.add('down');
            setTimeout(() => plot.classList.remove('down'), 200);
        }
    }

    static getDuration = function (url, next) {
        var _player = new Audio(url);
        _player.addEventListener("durationchange", function (e) {
            if (this.duration!=Infinity) {
               var duration = this.duration
               _player.remove();
               next(duration);
            };
        }, false);      
        _player.load();
        _player.currentTime = 24*60*60; //fake big time
        _player.volume = 0;
        try {
            _player.play();
        } catch {}
        //waiting...
    };

    addScript() {
        this.texts = [];
        this.logs = [];
        this.highlights = [];
        this.events.forEach(event => {
            if (event.type === Script.LOG) {
                this.logs.push(event);    
                return;
            } else if (event.type === Script.HIGHLIGHT) {
                this.highlights.push(event);
                return;
            }
            this.texts.push(event);
            let $div = $(document.createElement('div'));
            $div.addClass('text');
            $div.text(event.description);
            $div.attr('id', 'script-' + event.startIndex);
            event.div = $div;
            this.$script.append($div);
        });
    }

    restart() {
        if (!this.script) return;
        this.resetSnap();
        this.time = 0;
        this.clearCurrentText();
        let duration = Math.max(...this.events.map(e => e.endTime)) * 1000 + Playback.BUFFER_MS;
        this.duration = Math.max(this.duration, duration);
        this.updateScrubberBG();
        this.$scrubber.attr('max', Math.round(this.duration));
        this.playStartDuration = 0;
        this.$scrubber.val(0);
        this.updateHighlights();
        $('.text').removeClass('.highlight');
    }

    resetSnap() {
        if (this.slides) this.slides.reset();
        this.highlightedBlocks = []
        if (this.snapWindow.ide) {
            this.snapWindow.ide.newProject();
            this.snapWindow.ide.changeCategory('motion');
            let instances = this.snapWindow.DialogBoxMorph.prototype.instances;
            Object.keys(instances).forEach(stamp => {
                if (!instances.hasOwnProperty(stamp)) return;
                let dialogs = instances[stamp];
                Object.keys(dialogs).forEach(key => {
                    if (dialogs[key].destroy) {
                        dialogs[key].destroy();
                    }
                });
            });
            // Clear console logging
            // TODO: may want to remove this for deploy
            this.snapWindow.Trace = new this.snapWindow.Logger(1000);
        }
        this.currentLogIndex = 0;
        this.playingLog = null;
        this.recorder = this.snapWindow.recorder;
        if (this.snapWindow.recorder) {
            this.recorder.constructor.resetBlockMap();
            this.recorder.constructor.setRecordScale(this.script.config.blockScale);
            this.recorder.constructor.setOnClickCallback(
                (x, y) => this.clickHighlight.trigger(x, y));
        }
    }

    snapFocused() {
        // console.log('focus', this.playingAction);
        // if (this.playingAction) {
        //     setTimeout(() => {
        //         this.snapWindow.document.activeElement.blur();
        //         $('play').focus();
        //         console.log('focus play');
        //     }, 1);
        //     return;
        // }
        this.clearHighlights();
        if (this.getCurrentDuration() > 0) {
            this.warnResume = true;
        }
        if (this.playing) {
            this.pause();
            this.snapEdits = 0;
        }
    }

    togglePlay() {
        if (this.playing) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        if (this.playing) return;
        if (this.events.length == 0) return;

        if (this.askingQuestion) {
            alert("Please answer the question first.");
            return;
        }

        this.recorder = this.snapWindow.recorder;
        if (!this.recorder) return;
        if (this.warnResume && this.snapEdits > 0) {
            if (confirm('Playing will overwrite your changes to the code. Continue?')) {
                this.resetSnap();
            } else {
                return;
            }
        }
        this.playingAction = false;
        this.warnResume = false;
        // Subtract 0.1 to avoid float rounding issues
        if (this.getCurrentDuration() >= this.duration - 0.1) {
            this.restart();
        }
        $('#play').addClass('pause');
        this.playStartTime = new Date().getTime();
        this.playing = true;
        this.clearCurrentText();
        this.update();
        this.tickTimeout = setInterval(() => {
            this.update();
        }, 50);
    }

    pause() {
        if (!this.playing) return;
        $('#play').removeClass('pause');
        this.playStartDuration = this.getCurrentDuration();
        this.audio.pause();
        this.playing = false;
        clearInterval(this.tickTimeout);
        this.tickTimeout = null;
    }

    setDuration() {
        this.recorder = this.snapWindow.recorder;
        this.askingQuestion = null;
        
        if (!this.recorder) return;
        if (this.playing) {
            this.pause();
            this.wasPlaying = true;
        }
        this.playStartDuration = this.getCurrentDuration();
        this.$scrubber.val(Math.round(this.playStartDuration));
        this.updateEvents(true);
    }

    finishSettingDuration() {
        this.updateEvents();
        if (this.wasPlaying)  {
            setTimeout(() => this.play(), 1);
        }
        this.wasPlaying = false;
    }

    update() {
        if (!this.playing) return;
        let duration = this.getCurrentDuration();
        this.maxDuration = Math.max(this.maxDuration, duration);
        this.updateScrubberBG();
        this.$scrubber.val(Math.round(this.getCurrentDuration()));
        this.updateEvents();
        if (duration > this.duration) this.pause();
    }

    updateScrubberBG() {
        let margin = 0.005;
        let perc = 100 * (margin + this.maxDuration / this.duration * (1 - margin * 2));
        let left = Math.max(0, perc), right = Math.min(100, perc + 0.5);
        $('#scrubber-bg').css('background', `linear-gradient(90deg, rgb(152 203 255) ${left}%, #ffffff00 ${right}%)`);
    }

    updateEvents(noReset) {
        this.updateLogs(noReset);
        this.updateText();
        this.updateHighlights();
    }

    getCurrentDuration() {
        if (!this.playing) {
            return Math.min(parseInt(this.$scrubber.val()), this.maxDuration);
        }
        return this.playStartDuration + new Date().getTime() - this.playStartTime;
    }

    clearCurrentText() {
        if (this.currentText) {
            this.currentText.div.removeClass('highlight');
        }
        this.currentText = null;
    }

    getActiveEvents(events, timeS, buf) {
        return events.filter(t => t.startTime <= timeS + buf && t.endTime >= timeS - buf);
    }

    updateText() {
        let buf = Playback.BUFFER_MS / 1000;
        let durationS = this.getCurrentDuration() / 1000;
        if (this.currentText != null) {
            if (this.currentText.endTime < durationS - buf || this.currentText.startTime > durationS + buf) {
                this.clearCurrentText();
                if (this.playing) this.audio.pause();
            }
        }
        if (!this.currentText) {
            let active = this.getActiveEvents(this.texts, durationS, buf);
            if (active.length > 0) {
                this.currentText = active[active.length - 1];
                this.currentText.div.addClass('highlight');
                let scroll = this.$script.scrollTop() + 
                    this.currentText.div.position().top - this.$script.position().top;
                this.$script.stop();
                this.$script.animate({
                    scrollTop: scroll,
                }, 500);
                // TODO: At some point need to calculate relative duration to 
                // find the right time in the audio
                // The edited events should all use deltas (so you can easily delete),
                // but the audio needs to keep a reference to the start/end time in the original file
                if (this.playing)  {
                    let time = this.currentText.audioStart + durationS - this.currentText.startTime;
                    if (isNaN(time) || !isFinite(time)) {
                        console.error('NaN time', time, this.currentText, this.currentText.audioStart, durationS, this.currentText.startTime);
                        return;
                    }
                    this.audio.currentTime = time;
                    console.log('Audio to ', this.audio.currentTime);
                    this.audio.play();
                }
            }
        }
    }

    updateLogs(noReset) {
        if (this.playingLog || this.warnResume) return;

        let durationS = this.getCurrentDuration() / 1000;
        if (this.currentLogIndex > 0) {
            let lastLog = this.logs[this.currentLogIndex - 1];
            if (lastLog.startTime > durationS) {
                if (noReset) {
                    return;
                }
                this.resetSnap();
                this.nextTimeout = setTimeout(() => this.update(), 1);
                return;
            }
        }

        let event = this.logs[this.currentLogIndex];
        if (!event) return;
        if (durationS < event.startTime) {
            if (this.nextTimeout) return;
            let nextTime = (event.startTime - durationS) * 1000;
            this.nextTimeout = setTimeout(() => {
                this.update();
            }, nextTime);
            return;
        }
        
        // We go faster if the playback is more than .25s behind
        let fast = durationS - event.startTime > 0.25;
        this.nextTimeout = null;
        // console.log('Event: ', event);
        let record = this.script.getLog(event);
        // console.log('Playing', record);
        // First, try to see if the Slides class can replay this
        let slidesRecord = this.slides ? this.slides.loadRecord(record) : null;
        if (slidesRecord == null) {
            [record] = this.recorder.loadRecords([record]);
        } else {
            record = slidesRecord;
        }
        this.playingLog = event;
        this.playingAction = true;
        try {
            record.replay(() => {
                // console.log('Clear playing');
                this.playingLog = null;
                this.updateLogs();
            }, fast);
        } catch (e) {
            console.error(e);
            this.playingLog = null;
        }
        this.playingAction = false;
        this.currentLogIndex++;
    }

    updateHighlights() {
        if (this.warnResume) return;
        let blocksToHighlight = [];
        let active = this.getActiveEvents(this.highlights, this.getCurrentDuration() / 1000, 0);
        active.forEach(h => {
            if (!blocksToHighlight.includes(h.blockID)) blocksToHighlight.push(h.blockID);
        });
        this.highlightedBlocks.forEach(id => {
            if (!blocksToHighlight.includes(id)) {
                this.setHighlight(id, false);
            };
        });
        blocksToHighlight.forEach(id => {
            if (!this.highlightedBlocks.includes(id)) {
                this.setHighlight(id, true);
            };
        });
        this.highlightedBlocks = blocksToHighlight;
    }

    setHighlight(blockID, highlighted) {
        var block = this.recorder.constructor.getBlock(blockID);
        // console.log('setHighlight', blockID, highlighted, block);
        if (!block) return;
        if (highlighted) {
            block.addHighlight();
        } else {
            block.removeHighlight();
        }
    }

    clearHighlights() {
        this.highlightedBlocks.forEach(b => this.setHighlight(b, false));
        this.highlightedBlocks = [];
    }
}