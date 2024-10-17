/* window.js
 *
 * Copyright 2024 Nyarch Linux
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
        const update = await this.mainWindow.fetchUpdatesEndpoint().catch(this.mainWindow.handleError.bind(this.mainWindow));
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
                }
            ]
        };
        this.pages = [firstSlide];
        this.pages.push(...this.formatPages(update));

        for (const page of this.pages) {
            this._carousel.append(await this.generatePage(page));
        }

        this._next.connect('clicked', this.next.bind(this));
        this._previous.connect('clicked', this.previous.bind(this));
        this._carousel.connect('page-changed', this.onPageChanged.bind(this));

        this.onPageChanged(this._carousel, 0);
    }

    next() {
        const position = this._carousel.get_position();
        const nPages = this._carousel.get_n_pages();
        if (position < nPages - 1) this._carousel.scroll_to(this._carousel.get_nth_page(this._carousel.get_position() + 1), true);
    }

    previous() {
        const position = this._carousel.get_position();
        if (position > 0) this._carousel.scroll_to(this._carousel.get_nth_page(this._carousel.get_position() - 1), true);
    }

    onPageChanged(carousel, page) {
        this._previous.set_sensitive(page > 0);
        this._next.set_sensitive(page < carousel.get_n_pages() - 1);
    }

    async generatePage(page) {
        const builder = Gtk.Builder.new_from_resource('/moe/nyarchlinux/updater/carousel_page.ui');
        const uiPage = builder.get_object('page');
        const body = builder.get_object('body');
        const title = builder.get_object('title');
        const buttons = builder.get_object('buttonsBox');
        const image = builder.get_object('image');

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
        }

        if (page.image) {
            const response = await this.mainWindow.fetchBytes(page.image);
            const loader = new GtkPixbuf.PixbufLoader(response);
            loader.write_bytes(response);
            loader.close();
            image.set_from_pixbuf(loader.get_pixbuf());
        }

        title.set_label(page.title);
        body.set_label(page.body);

        return uiPage;
    }

    onButtonClick(button) {
        const command = this.commands[button];
        if (command === 'skip') {
            this.next();
        } else if (command.startsWith('showCommand')) {
            // show a new window with the command and a close button
            const dialog = new Gtk.Dialog({transient_for: this, modal: true});
            dialog.set_title('Command');
            dialog.set_default_size(800, 600);
            const content = new Gtk.TextView();
            content.set_editable(false);
            content.set_monospace(true);
            content.get_buffer().set_text(command.replace("showCommand ", ""), command.replace("showCommand ", "").length);
            dialog.set_child(content);
            const closeButton = new Gtk.Button({label: 'Close'});
            closeButton.connect('clicked', () => dialog.close());
            dialog.add_action_widget(closeButton, Gtk.ResponseType.CLOSE);
            dialog.show();
        } else {
            button.set_sensitive(false);
            if (command === 'all') {
                for (const command of Object.values(this.commands)) {
                    if (command === 'skip' || command === 'all') continue;
                    // TODO check if multiple command taking long times runs in parallel, if son, run them in sequence
                    this.mainWindow.spawnv(['flatpak-spawn', '--host', 'bash', '-c', 'pkexec', command]).catch(this.mainWindow.handleError.bind(this.mainWindow));
                }
                return;
            }
            this.mainWindow.spawnv(['flatpak-spawn', '--host', 'bash', '-c', 'pkexec', command]).catch(this.mainWindow.handleError.bind(this.mainWindow));
        }
    }

    formatPages(fetchUpdatesResult) {
        const updates = fetchUpdatesResult.updates;

        return updates.map(update => {
            const index = updates.indexOf(update);

            return {
                title: update.title,
                body: update.description,
                buttons: [
                    {
                        label: 'Skip',
                        style: 'destructive-action',
                        command: 'skip',
                        disabled: !update.skippable
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
                    index === 0 ? {
                        label: 'Execute All',
                        style: 'execute',
                        command: "all"
                    } : undefined
                ]
            };
        });
    }
});