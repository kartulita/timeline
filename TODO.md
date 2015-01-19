# Timeline TODO

 * Give timeline-days its own controller

    * Maybe move the scroll logic there too, or to a separate directive/controller pair.

 * Keep day name in view (like I implemented in the old timeline)

 * Android-style destruction of days that are scrolled far enough out, to minimize
   number of DOM nodes and watchers
