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
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Soup from 'gi://Soup';

export const NyarchupdaterWindow = GObject.registerClass({
    GTypeName: 'NyarchupdaterWindow',
    Template: 'resource:///moe/nyarchlinux/updater/window.ui',
    InternalChildren: ['updates_box', 'refresh_button'],
}, class NyarchupdaterWindow extends Adw.ApplicationWindow {
    constructor(application) {
        super({ application});

        this._refresh_button.connect("clicked", async () => {
            await this.fetchUpdatesEndpoint();
        });
    }

    async fetchUpdatesEndpoint() {
        try {
            const session = new Soup.Session();
            const message = Soup.soup_message_new("GET", "https://google.com");
            const json = session.send_async(session, message)

            console.log(json);
        } catch (err) {
            console.log(err);
        }
    }
});