const $ = require('../../node_modules/jquery');
const { Script } = require('./script');

export class ScriptLoader {
    constructor(path) {
        this.path = path;
        this.audioPath = path + 'audio.ogg';
        this.script = null;
        this.onLoaded = null;
        this.duration = null;
        this.ajaxDone = false;

        $.ajax({
            url: path + 'logs.json',
        }).done(logs => this.logs = logs);
        $.ajax({
            url: path + 'transcript.json',
        }).done(words => this.words = words.transcripts[0].words);
        $.ajax({
            url: path + 'script.yaml',
        }).done(scriptYAML => this.scriptYAML = scriptYAML);
        $.ajax({
            url: path + 'slides.md',
        }).done(slidesMD => this.slidesMD = slidesMD);
        $.ajax({
            // dataType: "x-binary",
            xhr: () => {
                let xhr = new XMLHttpRequest();
                xhr.responseType = 'arraybuffer';
                return xhr;
            },
            url: path + 'audio.ogg',
        }).done(audio => this.getDuration(audio));
        $.ajax({
            url: path + 'start.xml',
            converters: {"text xml": window.String},
        }).done(startXML => this.startXML = startXML);
        $(document).ajaxStop(() => {
            if (!this.logs) {
                console.error('Missing logs!');
                return;
            }
            this.ajaxDone = true;
            this.createScript();
        });
    }

    createScript() {
        // Don't call twice, and wait on ajax (shouldn't be an issue)
        if (this.script || !this.ajaxDone) return;
        // Wait on audio duration
        if (this.duration === 'pending') return;
        this.script = new Script(this.logs, this.words || [], this.duration, this.scriptYAML);
        this.script.slidesMD = this.slidesMD;
        this.script.startXML = this.startXML;
        if (this.onLoaded) this.onLoaded(this.script);
    }

    getDuration(audio) {
        if (this.scriptYAML) return;
        var audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (!audioContext) return;
        this.duration = 'pending';
        audioContext.decodeAudioData(audio, buffer => {
            this.duration = buffer.duration;
            this.createScript();
        }, () => {
            // On error, just proceed.
            this.duration = null;
            this.createScript();
        });
    }

    loadAudio(audioID) {
        $(audioID).attr('src', this.audioPath)
            .attr('type', 'audio/ogg')
            .attr('controls', true);
    }
}