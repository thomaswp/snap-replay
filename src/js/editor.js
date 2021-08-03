const $ = require('../../node_modules/jquery');
const { Script } = require('./script');

export class Editor {
    constructor(path) {
        this.path = path;
        this.audioPath = path + 'audio.ogg';
        this.logs = [];
        this.words = [];
        this.scriptEvents = [];

        $('#audio').attr('src', this.audioPath)
            .attr('type', 'audio/ogg')
            .attr('controls', true);
        $.ajax({
            url: path + 'logs.json',
            success: (data) => this.addLogs(data)
        });
        $.ajax({
            url: path + 'transcript.json',
            success: (data) => this.addTranscript(data)
        });
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
        console.log(Script);
        const script = new Script();
        script.addLogs(this.logs);
        script.addTranscript(this.words);
        editor.setValue(script.toYAML());
    }
}

$(document).ready(() => {
    new Editor('sample/1627046605547/');
});