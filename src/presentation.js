/* presentation.js
 *
 * Copyright 2025 Nyarch Linux
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import GtkPixbuf from 'gi://GdkPixbuf';

export const PresentationWindow = GObject.registerClass({
    GTypeName: 'PresentationWindow',
    Template: 'resource:///moe/nyarchlinux/updater/presentation.ui',
    InternalChildren: [
        'next',
        'previous',
        'carousel'
    ],
}, class PresentationWindow extends Adw.ApplicationWindow {
    constructor(application, mainWindow) {
        super({ application });
        this.commands = {};
        this.mainWindow = mainWindow;
        this.init().catch(this.mainWindow.handleError.bind(this.mainWindow));
    }

    async init() {
        const update = this.mainWindow.newer;
        const firstSlide = {
            image: update.logo,
            title: `Nyarch Linux ${update.version}: ${update.codename}`,
            body: "",
            buttons: [
                {
                    label: "Release Notes",
                    style: "",
                    command: "xdg-open " + update.release_notes,
                    disabled: false
                },
                {
                    label: "Next",
                    style: "suggested-action",
                    command: "skip",
                    disabled: false
                },
                {
                    label: 'Execute All',
                    style: 'execute',
                    command: "all"
                }
            ]
        };
        const lastSlide = {
            icon: "check-round-outline-symbolic",
            iconclass: "success",
            title: `Done!`,
            body: "Nyarch has been updated. You can now enjoy the new release!",
            buttons: [
              {
                    label: 'Close Window',
                    style: 'suggested-action',
                    command: "closewindow"
              }]
        };
        this.pages = [firstSlide];
        this.pages.push(...this.formatPages(update));
        this.pages.push(lastSlide);

        this.buttonBoxes = new Array(this.pages.length).fill(undefined);

        for (const page of this.pages) {
            this._carousel.append(this.generatePage(page));
        }

        this._next.connect('clicked', this.next.bind(this));
        this._previous.connect('clicked', this.previous.bind(this));
        this._carousel.connect('page-changed', this.onPageChanged.bind(this));

        this.onPageChanged(this._carousel, 0);
    }

    get slides() {
        return this._carousel.get_n_pages();
    }

    next() {
        const position = this._carousel.get_position();
        const nPages = this._carousel.get_n_pages();
        const carouselContent = this._carousel.get_nth_page(this._carousel.get_position() + 1);
        if (position < nPages - 1) this._carousel.scroll_to(carouselContent, true);
    }

    goTo(page) {
        this._carousel.scroll_to(this._carousel.get_nth_page(page), true);
    }

    previous() {
        const position = this._carousel.get_position();
        if (position > 0) this._carousel.scroll_to(this._carousel.get_nth_page(this._carousel.get_position() - 1), true);
        if (!this._carousel.interactive) this._carousel.set_interactive(true);
    }

    onPageChanged(carousel, page) {
        this._previous.set_sensitive(page > 0);
        this._next.set_sensitive(page < carousel.get_n_pages() - 1);
        const position = carousel.get_position();

        const skipButton = this.buttonBoxes[position].find(button => button.label === 'Skip');
        if (skipButton && !skipButton.sensitive) {
            // prevent scrolling and next button from being enabled until the command is executed and command executed successfully
            this._next.set_sensitive(false);
            this._carousel.set_interactive(false);
            // if the skip button exists and is disabled, then a check success button must exist too
            const checkSuccessButton = this.buttonBoxes[position].find(button => button.label === 'Check Success');
            if (!checkSuccessButton) return;
            checkSuccessButton.set_sensitive(false);
        }
    }

    generatePage(page) {
        const builder = Gtk.Builder.new_from_resource('/moe/nyarchlinux/updater/carousel_page.ui');
        const uiPage = builder.get_object('page');
        const body = builder.get_object('body');
        const title = builder.get_object('title');
        const buttons = builder.get_object('buttonsBox');
        const image = builder.get_object('image');
        const icon = builder.get_object('icon');

        const buttonChilds = [];

        for (const buttonData of page.buttons) {
            if (!buttonData) continue;
            const button = Gtk.Button.new();
            if (buttonData.style) button.set_css_classes([buttonData.style]);
            if (buttonData.icon) {
                const content = Adw.ButtonContent.new();
                content.set_icon_name(buttonData.icon);
                content.set_use_underline(true);
                content.set_label(buttonData.label);
                button.set_child(content);
            } else {
                button.set_label(buttonData.label);
            }
            this.commands[button] = buttonData.command;
            button.set_sensitive(!buttonData.disabled);
            button.connect('clicked', this.onButtonClick.bind(this));
            buttons.append(button);
            buttonChilds.push(button);
        }

        if (page.image) {
            // Load the image. .catch() to solve the promise and ignore the error
            this.loadImage(page.image, image).catch(() => {});
        }
        if (page.icon) {
            icon.set_from_icon_name(page.icon);
            icon.set_pixel_size(200);
            icon.set_visible(true);
            if (page.iconclass) {
              icon.add_css_class(page.iconclass);
            }
        }

        title.set_label(page.title);
        body.set_label(page.body);

        this.buttonBoxes[this.pages.indexOf(page)] = buttonChilds;

        return uiPage;
    }

    async loadImage(imageUrl, image) {
          const response = await this.mainWindow.fetchBytes(imageUrl);
          const loader = new GtkPixbuf.PixbufLoader(response);
          loader.write_bytes(response);
          loader.close();
          image.set_pixbuf(loader.get_pixbuf());
          image.set_visible(true);
    }

    async onButtonClick(button) {
        const command = this.commands[button];
        if (!command) {
          log("Error: no command found for button", button);
          return;
        }
        if (command === 'skip') {
            this.next();
        } else if (command.startsWith('showCommand')) {
            const dialog = new Gtk.Dialog({ transient_for: this, modal: true });
            dialog.set_title('Command');
            dialog.set_default_size(800, 600);
            const content = new Gtk.TextView();
            content.set_editable(false);
            content.set_monospace(true);
            content.get_buffer().set_text(command.replace("showCommand ", ""), command.replace("showCommand ", "").length);
            dialog.set_child(content);
            const closeButton = new Gtk.Button({ label: 'Close' });
            closeButton.connect('clicked', () => dialog.close());
            dialog.add_action_widget(closeButton, Gtk.ResponseType.CLOSE);
            dialog.show();
        } else if (command === "closewindow") {
            this.destroy();
            this.mainWindow.window = null;
        } else if (command.startsWith('checkSuccess')) {
            let stdout = await this.mainWindow.spawnv(['flatpak-spawn', '--host', 'bash', '-c', command.replace("checkSuccess ", "")]).catch(this.mainWindow.handleError.bind(this.mainWindow));
            if (stdout) stdout = stdout.trim() === "true";
            const buttonBox = this.buttonBoxes[this._carousel.get_position()];
            if (!stdout) {
                const dialog = Adw.AlertDialog.new("An error occurred!", null);
                dialog.set_body("The command did not execute successfully. Please try again.");
                dialog.add_response("close", "_Close");
                dialog.set_default_response("close");
                dialog.set_close_response("close");
                dialog.connect("response", () => {
                    dialog.close();
                });
                dialog.present(dialog);
                // Allow the user to run the command again
                const executeButton = buttonBox.find(button => button.label === 'Execute');
                executeButton.set_sensitive(true);
                return;
            }

            const nextButton = buttonBox.find(button => button.label === 'Execute');
            if (nextButton) {
                nextButton.set_sensitive(true);
            }
            const skipButton = buttonBox.find(button => button.label === 'Skip');
            if (skipButton) {
                skipButton.set_sensitive(true);
            }
            const checkSuccessButton = buttonBox.find(button => button.label === 'Check Success');
            if (checkSuccessButton) {
                checkSuccessButton.set_sensitive(false);
            }

            this.next();
        } else {
            button.set_sensitive(false);
            if (command === 'all') {
                var fullCommand = "";
                for (const command of Object.values(this.commands)) {
                    // Ignore the commands that are not meant to be executed all at once
                    if (
                        ["all", "skip", "closewindow"].includes(command) ||
                        command.startsWith("xdg-open") ||
                        command.startsWith("showCommand") ||
                        command.startsWith("checkSuccess")
                    ) continue;
                    fullCommand += "\n" + command;
                }
                // wait for the terminal to finish executing the commands
                await this.mainWindow.spawnv(['flatpak-spawn', '--host', 'gnome-terminal', '--', 'bash', '-c', fullCommand]).catch(this.mainWindow.handleError.bind(this.mainWindow));
                this.goTo(Number(this.slides) - 1);
                return;
            }
            this.mainWindow.spawnv(['flatpak-spawn', '--host','gnome-terminal', '--', 'bash', '-c', command]).catch(() => {});
            const buttonBox = this.buttonBoxes[this._carousel.get_position()];
            const checkSuccessButton = buttonBox.find(button => button.label === 'Check Success');
            if (checkSuccessButton) {
                checkSuccessButton.set_sensitive(true);
            } else {
                this.next();
            }
        }
    }

    formatPages(fetchUpdatesResult) {
        const updates = fetchUpdatesResult.updates;

        return updates.map(update => {
            return {
                title: update.title,
                body: update.description,
                image: update.image,
                buttons: [
                    {
                        label: 'Skip',
                        style: 'destructive-action',
                        command: 'skip',
                        disabled: !update.skippable,
                    },
                    {
                        label: 'Execute',
                        style: 'suggested-action',
                        command: update.command
                    },
                    {
                        label: 'Show Command',
                        style: '',
                        command: 'showCommand ' + update.shown_command
                    },
                    update.checksuccess ? {
                        label: 'Check Success',
                        style: 'suggested-action',
                        command: 'checkSuccess ' + update.checksuccess
                    } : null
                ]
            };
        });
    }
});
