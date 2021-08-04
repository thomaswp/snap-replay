const $ = require('../../node_modules/jquery');
const { ScriptLoader } = require('./loader');

export class Editor {
    constructor(path) {
        this.loader = new ScriptLoader(path);
        this.loader.loadAudio('#audio');
        this.loader.onLoaded = (script) => {
            editor.setValue(script.toYAML(), -1);
        }
    }
}