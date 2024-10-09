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
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';
import Pango from 'gi://Pango';

export const NyarchupdaterWindow = GObject.registerClass({
    GTypeName: 'NyarchupdaterWindow',
    Template: 'resource:///moe/nyarchlinux/updater/window.ui',
    InternalChildren: ['updates_box', 'refresh_button'],
}, class NyarchupdaterWindow extends Adw.ApplicationWindow {
    constructor(application) {
        super({ application});

        this._refresh_button.connect("clicked", async () => {
            await this.checkForUpdates().catch(console.error);
        });
        this.launcher = new Gio.SubprocessLauncher({
            flags: (Gio.SubprocessFlags.STDOUT_PIPE |
                Gio.SubprocessFlags.STDERR_PIPE)
        });
        this.launcher.setenv("LANG", "C", true);
        this._updates_box_childs = [];
    }

    /**
     * Used to fetch the releases from the endpoint
     * @returns {Promise<string>}
     */
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
                            // make const current that is the content of the /version file in the filesystem
                            const [ok, current] = GLib.file_get_contents("/version");
                            if (!ok) {
                                reject("Could not read /version file");
                                return;
                            }
                            const currentVersion = new TextDecoder().decode(current).trim().match(/.{1,2}/g);
                            currentVersion.pop();
                            const newer = json[currentVersion.join('.')];
                            if (!newer) {
                                resolve(null);
                            } else {
                                resolve(newer);
                            }
                        }
                    }
                );
            } catch (err) {
                reject(err);
            }
        })
    }

    /**
     * Package information
     * @typedef UpdatePackageInfo
     * @prop {string} name
     * @prop {string} current
     * @prop {string} latest
     */
    /**
     * Used to fetch local package updates using checkupdates
     * @returns {Promise<Array<UpdatePackageInfo>>}
     */
    fetchLocalUpdates() {
        return new Promise(async (resolve, reject) => {
            try {
                let proc = this.launcher.spawnv(['flatpak-spawn', '--host', 'bash', '-c', "/usr/bin/checkupdates"]);
                proc.communicate_utf8_async(null, null, (proc, res) => {
                    let [,stdout,] = proc.communicate_utf8_finish(res);
                    if (proc.get_successful()) {
                        const lines = stdout.split('\n');
                        console.log(lines);
                        const updateList = [];
                        for (const line of lines) {
                            const match = line.match(/(\S+)\s(\S+)\s->\s(\S+)/); // regex to match the package name, current version, and latest version from "packagename current -> latest"
                            if (match) {
                                updateList.push({
                                    name: match[1],
                                    current: match[2],
                                    latest: match[3]
                                });
                            }
                        }
                        resolve(updateList);
                    } else {
                        resolve([]);
                    }
                });
            } catch (e) {
                reject(e)
            }
        });
    }

    /**
     * Update types
     * @typedef {"local"|"release"|"all"|string} UpdateType
     */
    /**
     * Used to update the Updates Box in the window.
     * @param {any[]} localUpdates
     * @param {any[]} endpointUpdates
     * @returns {Promise<void>}
     */
    async updateUpdatesBox(localUpdates, endpointUpdates) {
        const updatesBox = this._updates_box;
        if (this._updates_box_childs.length) this._updates_box_childs.forEach(child => updatesBox.remove(child));
        if (endpointUpdates) {
            const releaseUpdateLabel = Gtk.Label.new(null);
            releaseUpdateLabel.set_markup("<span line_height=\"2\" size=\"x-large\"><b>Release Updates</b></span>");
            releaseUpdateLabel.set_halign(Gtk.Align.START);
            this._updates_box_childs.push(releaseUpdateLabel);
            updatesBox.append(releaseUpdateLabel);
            const label = Gtk.Label.new(null);
            label.set_markup(`<span color="#f9c89f"><b>New release available: <span font_weight="ultrabold">${endpointUpdates.version}</span></b></span>`);
            label.set_halign(Gtk.Align.START);
            updatesBox.append(label);
            this._updates_box_childs.push(label);
        } else {
            const label = Gtk.Label.new(null);
            label.set_markup("<span line_height=\"2\" size=\"x-large\"><b>You are up to date with the releases!</b></span>");
            label.set_halign(Gtk.Align.START);
            updatesBox.append(label);
            this._updates_box_childs.push(label);
        }
        if (!localUpdates.length) {
            const label = Gtk.Label.new(null);
            label.set_markup("<span line_height=\"2\" size=\"x-large\"><b>You are up to date with the package packages!</b></span>");
            label.set_halign(Gtk.Align.START);
            updatesBox.append(label);
            this._updates_box_childs.push(label);
        } else {
            const localUpdateLabel = Gtk.Label.new(null);
            localUpdateLabel.set_markup("<span line_height=\"2\" size=\"x-large\"><b>Package Updates</b></span>");
            localUpdateLabel.set_halign(Gtk.Align.START);
            this._updates_box_childs.push(localUpdateLabel);
            updatesBox.append(localUpdateLabel);
            for (const update of localUpdates) {
                const label = Gtk.Label.new(`${update.name} ${update.current} -> ${update.latest}`);
                label.set_halign(Gtk.Align.START);
                updatesBox.append(label);
                this._updates_box_childs.push(label);
            }
        }
    }

    /**
     * Used to check for updates (both local and from the endpoint)
     * @returns {Promise<void>}
     */
    async checkForUpdates() {
        this._refresh_button.set_sensitive(false);
        const box = Gtk.CenterBox.new();
        const spinner = Gtk.Spinner.new();
        const loadingLabel = Gtk.Label.new("Checking for updates...");
        const doneLabel = Gtk.Label.new("Check for updates");
        box.set_start_widget(spinner);
        box.set_center_widget(loadingLabel);
        this._refresh_button.set_child(box);
        spinner.start();
        const localUpdates = await this.fetchLocalUpdates();
        const endpointUpdates = await this.fetchUpdatesEndpoint();
        this._refresh_button.set_sensitive(true);
        spinner.stop();
        box.set_center_widget(doneLabel);
        this.updateUpdatesBox(localUpdates, endpointUpdates).catch(console.error);
    }
});
