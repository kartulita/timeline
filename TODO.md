# Timeline TODO

 * Give timeline-days its own controller

    * Maybe move the scroll logic there too, or to a separate directive/controller pair.

 * Android-style destruction of days that are scrolled far enough out, to minimize
   number of DOM nodes and watchers

 * Date-picker appears in wrong position (too high) if opened while page is
   scrolled downwards.  suspect we're subtracting scrollTop where we shouldn't
   be.
