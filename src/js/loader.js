const $ = require('../../node_modules/jquery');
const { Script } = require('./script');

export class ScriptLoader {
    constructor(path) {
        this.path = path;
        this.audioPath = path + 'audio.ogg';
        // TODO: Decide where this is stored
        this.logs = [];
        this.words = [];
        this.script = null;
        this.onLoaded = null;

        $.ajax({
            url: path + 'logs.json',
            success: (data) => this.addLogs(data)
        });
        $.ajax({
            url: path + 'transcript.json',
            success: (data) => this.addTranscript(data)
        });
    }

    loadAudio(audioID) {
        $(audioID).attr('src', this.audioPath)
            .attr('type', 'audio/ogg')
            .attr('controls', true);
    }

    addLogs(json) {
        // TODO convert
        this.logs.push(...json);
        this.generateScript();
    }

    addTranscript(json) {
        this.words.push(...json.transcripts[0].words);
        this.generateScript();
    }

    generateScript() {
        if (this.logs.length == 0 || this.words.length == 0) return;
        this.script = new Script();
        this.script.addLogs(this.logs);
        this.script.addTranscript(this.words);
        if (this.onLoaded) {
            this.onLoaded(this.script);
        }
    }
}