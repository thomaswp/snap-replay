## Bugs:

* Don't crash when comments are added.
* Figure out why loading is slow (probably b/c loading audio twice for duration...), speed it up (e.g. buffering?), add load icon
* Editing inputs still can pause the replay (esp. when FFing)
* Disable media play/pause or make it do the right thing.

## Recording Features:
* Comments
* Finish custom blocks
* Finish variables (script, local)
* Fix block drag-n-drop bug where it goes to the pallete again (!)
* Misc mouse movements: editor buttons, sprite dragging

## Replayer Features:
* Custom block editor resizing (!)
* Better code: hashed assignmentID + hashed userID + checksum (+)
* Volume
* Questions
* Progress tracking: `(SELECT MAX(CAST(data AS int)) FROM 'replay' WHERE message='Playback.updatePlaying')`
* Config for maxplayback, show code, logging, etc.

## Testing:

* Variables:
  * Script vars / renaming
* Conditionals: just test thoroughly
* Procedures
   * Changing block types
   * The created reporter (record/set id)

## Editing:

* Audio transcription editing support
* Splicing in new content
* Debugging features to
