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
        super(application)
        this.app = application;
        this.commands = {};
        this.mainWindow = mainWindow;
        this.init().catch(this.mainWindow.handleError.bind(this.mainWindow));
    }

    async init() {
        this.pages = this.formatPages(await this.mainWindow.fetchUpdatesEndpoint().catch(this.mainWindow.handleError.bind(this.mainWindow)));

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

        for (const buttonData of page.buttons) {
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
            button.connect('clicked', this.onButtonClick.bind(this));
            buttons.append(button);
        }

        title.set_label(page.title);
        body.set_label(page.body);

        return uiPage;
    }

    onButtonClick(button) {
        if (this.commands[button] === 'skip') {
            this.next();
            return;
        }
        if (this.commands[button] === 'all') {
            for (const command of Object.values(this.commands)) {
                if (command === 'skip' || command === 'all') continue;
                // TODO check if multiple command taking long times runs in parallel, if son, run them in sequence
                this.mainWindow.spawnv(['flatpak-spawn', '--host', 'bash', '-c', 'pkexec', command]);
            }
            return;
        }
        this.mainWindow.spawnv(['flatpak-spawn', '--host', 'bash', '-c', 'pkexec', this.commands[button]]);
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
                        command: 'skip'
                    },
                    {
                        label: 'Execute',
                        style: 'suggested-action',
                        command: update.command
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