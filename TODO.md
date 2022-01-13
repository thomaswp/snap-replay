## Bugs:

* Allow gifs for Modify task images.
* Don't crash when comments are added.
* Figure out why loading is low (probably b/c loading audio twice for duration...), speed it up (e.g. buffering?), add load icon

## Recording Features:

* Comments
* Finish custom blocks
* Finish variables (script, local)

## Replayer Features:

* Time in/remaining
* Questions
* Progress tracking: `(SELECT MAX(CAST(data AS int)) FROM 'replay' WHERE message='Playback.updatePlaying')`
* Config for maxplayback, show code, logging, etc.

## Testing:

* Variables: script vars
* Conditionals: just test thoroughly
* Procedures
   * Changing block types
   * Using inputs variables
   * The created reporter (record/set id)

## Editing:

* Audio transcription editing support
* Splicing in new content
* Debugging features to
