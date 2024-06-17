const gi = require("node-gtk");
const Gtk = gi.require("Gtk", "4.0");
// Errors
const Adw = gi.require("Adw", "1");

gi.startLoop();
Gtk.init();

const win = new Gtk.Window({ title: "Hello, World!" });
win.on("destroy", Gtk.mainQuit);
win.add(new Gtk.Label({ label: 'Hello Gtk+' }))

win.showAll();
Gtk.main();

/**
 * Basic Structure
 */