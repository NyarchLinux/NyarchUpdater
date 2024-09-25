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
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';

export const NyarchupdaterWindow = GObject.registerClass({
    GTypeName: 'NyarchupdaterWindow',
    Template: 'resource:///moe/nyarchlinux/updater/window.ui',
    InternalChildren: ['updates_box', 'refresh_button'],
}, class NyarchupdaterWindow extends Adw.ApplicationWindow {
    constructor(application) {
        super({ application});

        this._refresh_button.connect("clicked", async () => {
            console.log(await this.fetchUpdatesEndpoint());
        });
    }

    fetchUpdatesEndpoint() {
        return new Promise(async (resolve, reject) => {
            try {
                const session = Soup.Session.new();
                let message = new Soup.Message({
                    method: "GET",
                    uri: GLib.uri_parse("https://nyarchlinux.moe/update.json", GLib.UriFlags.NONE)
                });
                session.send_and_read_async(
                    message,
                    GLib.PRIORITY_DEFAULT,
                    null,
                    (session, result) => {
                        if (message.get_status() === Soup.Status.OK) {
                            let bytes = session.send_and_read_finish(result);
                            let decoder = new TextDecoder('utf-8');
                            const response = decoder.decode(bytes.get_data());
                            const json = JSON.parse(response);
                            resolve(json);
                        }
                    }
                );
            } catch (err) {
                reject(err);
            }
        })
    }
});
