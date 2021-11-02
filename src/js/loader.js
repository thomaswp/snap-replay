const $ = require('../../node_modules/jquery');
const { Script } = require('./script');

export class ScriptLoader {
    constructor(path) {
        this.path = path;
        this.audioPath = path + 'audio.ogg';
        this.script = null;
        this.onLoaded = null;

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
            url: path + 'start.xml',
            converters: {"text xml": window.String},
        }).done(startXML => this.startXML = startXML);
        $(document).ajaxStop(() => {
            if (!this.logs) {
                console.error('Missing logs!');
                return;
            }
            this.script = new Script(this.logs, this.words || [], this.scriptYAML);
            this.script.slidesMD = this.slidesMD;
            this.script.startXML = this.startXML;
            if (this.onLoaded) this.onLoaded(this.script);
        });
    }

    loadAudio(audioID) {
        $(audioID).attr('src', this.audioPath)
            .attr('type', 'audio/ogg')
            .attr('controls', true);
    }
}