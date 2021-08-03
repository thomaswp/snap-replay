const $ = require('../../node_modules/jquery');
const { ScriptLoader } = require('./loader');
const { Script } = require('./script');

export class Playback {

    static BUFFER_MS = 500;

    constructor(path) {
        this.path = path;
        this.snapWindow = document.getElementById('isnap').contentWindow;
        $(this.snapWindow).on('focus', () => this.snapFocused());
        this.loader = new ScriptLoader(path);
        this.loader.loadAudio('#audio');
        this.loader.onLoaded = (script) => {
            this.script = script;
            this.events = script.events;
            this.addScript();
            this.restart();
        }
        this.audio = $('#audio')[0];
        this.$scrubber = $('#scrubber');
        this.$scrubber.on("change", () => this.finishSettingDuration());
        this.$scrubber.on("change input", () => this.setDuration());
        this.$script = $('#script');
        this.time = 0;
        this.playing = false;
        this.duration = 0;
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
        this.events.forEach(event => {
            if (event.type === Script.LOG) {
                this.logs.push(event);    
                return;
            }
            this.texts.push(event);
            let $div = $(document.createElement('div'));
            $div.text(event.description);
            $div.attr('id', 'script-' + event.startIndex);
            this.$script.append($div);
        });
    }

    restart() {
        this.resetSnap();
        this.time = 0;
        this.currentText = null;
        let duration = Math.max(...this.events.map(e => e.endTime)) * 1000 + Playback.BUFFER_MS;
        this.duration = Math.max(this.duration, duration);
        this.$scrubber.attr('max', Math.round(this.duration));
        this.playStartDuration = 0;
        this.$scrubber.val(0);
        console.log(this.$scrubber.val())
    }

    resetSnap() {
        if (this.snapWindow.ide) {
            this.snapWindow.ide.newProject();
        }
        this.currentLogIndex = 0;
        this.playingLog = null;
        this.recorder = this.snapWindow.recorder;
        if (this.snapWindow.recorder) {
            this.recorder.resetBlockMap();
        }
    }

    snapFocused() {
        if (this.playing) {
            this.pause();
            this.warnResume = true;
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
        this.recorder = this.snapWindow.recorder;
        if (!this.recorder) return;
        if (this.warnResume && this.snapEdits > 0) {
            if (confirm('Playing will overwrite your changes to the code. Continue?')) {
                this.resetSnap();
            } else {
                return;
            }
        }
        this.warnResume = false;
        if (this.getCurrentDuration() >=  this.duration) {
            this.restart();
        }
        $('#play').addClass('pause');
        this.playStartTime = new Date().getTime();
        this.playing = true;
        this.update();
        this.currentText = null;
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
        if (!this.recorder) return;
        if (this.playing) {
            this.pause();
            this.wasPlaying = true;
        }
        this.playStartDuration = this.getCurrentDuration();
        this.updateLogs(true);
    }

    finishSettingDuration() {
        this.updateLogs();
        if (this.wasPlaying)  {
            setTimeout(() => this.play(), 1);
        }
        this.wasPlaying = false;
    }

    update() {
        if (!this.playing) return;
        let duration = this.getCurrentDuration();
        this.$scrubber.val(Math.round(this.getCurrentDuration()));
        this.updateLogs();
        this.updateText();   
        if (duration > this.duration) this.pause();
    }

    getCurrentDuration() {
        if (!this.playing) {
            return parseInt(this.$scrubber.val());
        }
        return this.playStartDuration + new Date().getTime() - this.playStartTime;
    }

    updateText() {
        if (!this.playing) return;
        let buf = Playback.BUFFER_MS / 1000;
        let durationS = this.getCurrentDuration() / 1000;
        if (this.currentText != null) {
            if (this.currentText.endTime < durationS - buf || this.currentText.startTime > durationS + buf) {
                this.currentText = null;
                this.audio.pause();
            }
        }
        if (!this.currentText) {
            let active = this.texts.filter(t => t.startTime <= durationS + buf && t.endTime >= durationS - buf);
            if (active.length > 0) {
                this.currentText = active[active.length - 1];
                // TODO: At some point need to calculate relative duration to 
                // find the right time in the audio
                // The edited events should all use deltas (so you can easily delete),
                // but the audio needs to keep a reference to the start/end time in the original file
                this.audio.currentTime = durationS;
                this.audio.play();
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
                console.log('Reset!', this.currentLogIndex);
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
        
        this.nextTimeout = null;
        console.log('Event: ', event);
        let record = this.script.getLog(event);
        console.log('Playing', record);
        [record] = this.recorder.loadRecords([record]);
        // TODO: First confirm that the last event finished
        this.playingLog = event;
        record.replay(() => {
            console.log('Clear playing');
            this.playingLog = null;
            this.updateLogs();
        });
        this.currentLogIndex++;
    }


}