/* window.js
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
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';

import { PresentationWindow } from './presentation.js';
import { stackLog, compareVersions } from './utils.js';

export const NyarchupdaterWindow = GObject.registerClass({
    GTypeName: 'NyarchupdaterWindow',
    Template: 'resource:///moe/nyarchlinux/updater/window.ui',
    InternalChildren: [
        'refresh_button',
        'arch_label',
        'arch_spinner',
        'arch_success',
        'arch_button',
        'arch_error',
        'nyarch_spinner',
        'nyarch_success',
        'nyarch_button',
        'nyarch_error',
        'flatpak_label',
        'flatpak_spinner',
        'flatpak_success',
        'flatpak_button',
        'flatpak_error'
    ],
}, class NyarchupdaterWindow extends Adw.ApplicationWindow {
    constructor(application) {
        super({ application });

        this.launcher = new Gio.SubprocessLauncher({
            flags: (Gio.SubprocessFlags.STDOUT_PIPE |
                Gio.SubprocessFlags.STDERR_PIPE)
        });
        this.launcher.setenv("LANG", "C", true);
        this.configDir = GLib.get_user_config_dir();
        this.init();
        this.application = application;
        this.settings = new Gio.Settings({ schema_id: 'moe.nyarchlinux.updater' });
        this.firstStart = this.settings.get_boolean('first-start');
        if (this.firstStart) {
            this.settings.set_boolean('first-start', false);
            this.importKey().catch(this.handleError.bind(this));
        }
    }

    /**
     * Used to import the public key
     */
    async importKey() {
        const command = `gpg --import /app/data/public.asc`
        await this.spawnv(['bash', '-c', command]).catch(this.handleError.bind(this));
    }
    /**
     * Used to download the file in {configDir}/cache/update.json and to check if the update is signed with the right key
     * @returns {Promise<boolean>}
     */
    checkSign() {
        return new Promise(async (resolve) => {
            const command = `rm -rf ${this.configDir}/cache && mkdir -p ${this.configDir}/cache && cd ${this.configDir}/cache && wget -T 5 -t 1 https://nyarchlinux.moe/update.json && wget -T 5 -t 1 https://nyarchlinux.moe/update.json.sig && gpg --verify update.json.sig update.json`
            const stdout = await this.spawnv(['bash', '-c', command]).catch(() => {
                resolve(false);
            });
            if (!stdout) {
                stackLog("log", command)
                resolve(false);
            } else {
                resolve(true);
            }
        });
    }

    /**
     * Used to fetch the releases from the endpoint
     * @returns {Promise<string>}
     */
    fetchUpdatesEndpoint() {
        return new Promise(async (resolve, reject) => {
            try {
                const sign = await this.checkSign();
                if (!sign) {
                  // Attempt to download the update.json file separately to determine the error type
                  log("Sign check failed");
                  const command = `cd ${this.configDir}/cache && wget -T 5 -t 1 https://nyarchlinux.moe/update.json && [ -e "update.json" ]`
                  const stdout = await this.spawnv(['bash', '-c', command]);
                  if (!stdout) {
                    this.createDialog("Connection Error", "Failed to connect to the update server. Please check your internet connection and try again.");
                    reject(err);
                    return;
                  }

                  // If update.json downloads successfully, it's likely a signature error
                  if (stdout) {
                    this.createDialog("Signature Error", "The downloaded update file could not be verified with the correct signature. This might indicate a security issue. Check Nyarch news channels");
                    reject(null);
                  }
                  return;
                }
                const decoder = new TextDecoder('utf-8');
                const json = JSON.parse(decoder.decode(GLib.file_get_contents(this.configDir + "/cache/update.json")[1]));
                const [ok, current] = GLib.file_get_contents("/version");
                if (!ok) {
                    reject("Could not read /version file");
                    return;
                }
                const currentVersion = new TextDecoder().decode(current).trim();
                const newer = json[currentVersion];
                this.newer = newer
                if (!newer) {
                    resolve(null);
                } else {
                    resolve(newer);
                }
            } catch (err) {
                reject(err);
            }
        })
    }

    /**
     * Package information
     * @typedef ArchUpdatePackageInfo
     * @prop {string} name
     * @prop {string} current
     * @prop {string} latest
     */
    /**
     * Used to fetch local package updates using checkupdates
     * @returns {Promise<Array<ArchUpdatePackageInfo>>}
     */
    async fetchLocalUpdates() {
        const stdout = await this.spawnv(['flatpak-spawn', '--host', 'bash', '-c', '/usr/bin/checkupdates']).catch(() => {
            reject(null);
        });
        if (!stdout) {
            return [];
        }

        const lines = stdout.split('\n');
        const updateList = [];
        for (const line of lines) {
            // regex to match the package name, current version, and latest version from "packagename current -> latest"
            const match = line.match(/(\S+)\s(\S+)\s->\s(\S+)/);
            if (match) {
                updateList.push({
                    name: match[1],
                    current: match[2],
                    latest: match[3]
                });
            }
        }
        return updateList;
    }

    /**
     * Package information
     * @typedef FlatpakUpdatePackageInfo
     * @prop {string} name
     * @prop {string} latest
     */
    /**
     * Used to fetch local package updates using checkupdates
     * @returns {Promise<Array<FlatpakUpdatePackageInfo>>}
     */
    async fetchFlatpakUpdates() {
        const stdout = await this.spawnv(['flatpak-spawn', '--host', 'bash', '-c', "flatpak remote-ls --updates"]);
        if (!stdout) {
            return [];
        }
        const lines = stdout.split('\n');
        const updateList = [];
        for (const line of lines) {
            // regex to match the package name, current version, and latest version from platpak remote-ls --updates
            // Name             Application ID   Version  Branch Installation
            // org.kde.kdenlive org.kde.kdenlive 21.08.2  stable system
            const match = line.match(/^(\S+)\s+(.+?)\s+(\S+)\s+(\S+)\s+(\S+)$/);
            if (match) {
                updateList.push({
                    name: match[0].split("\t")[0],
                    latest: match[3]
                });
            }
        }
        return updateList;
    }

    /**
     * Update types
     * @typedef {"local"|"release"|"all"|string} UpdateType
     */
    /**
     * Used to update the content of the window
     * @param {any[]} localUpdates
     * @param {any[]} endpointUpdates
     * @param {any[]} flatpakUpdates
     * @param {boolean[]} errors
     * @returns {Promise<void>}
     */
    async updateWindow(localUpdates, endpointUpdates, flatpakUpdates, errors) {
        if (endpointUpdates) {
            this.setState("nyarch", "updateAvailable", `A new version of Nyarch Linux is available: ${endpointUpdates}`);
        } else if (errors[1]) {
            this.setState("nyarch", "error");
        } else {
            this.setState("nyarch", "success");
        }

        if (localUpdates.length) {
            // the count variable you putted in the for loop is not used, so I removed it, as count is literally the length of the array. As for the text, simply join() the array with a newline character
            this.setState("arch", "updateAvailable", localUpdates.map(update => `${update.name} ${update.current} -> ${update.latest}`).join('\n'));
        } else if (errors[0]) {
            this.setState("arch", "error");
        } else {
            this.setState("arch", "success");
        }

        if (flatpakUpdates.length) {
            this.setState("flatpak", "updateAvailable", flatpakUpdates.map(update => `${update.name} -> ${update.latest}`).join('\n'));
        } else if (errors[2]) {
            this.setState("flatpak", "error");
        } else {
            this.setState("flatpak", "success");
        }
    }

    /**
     * Used to check for all updates
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
        const errors = [false, false, false];
        const localUpdatesPromise = this.fetchLocalUpdates().catch(() => {
            this.resetButton(box, spinner);
            errors[0] = true;
        });
        const endpointUpdatesPromise = this.fetchUpdatesEndpoint().catch(() => {
            this.resetButton(box, spinner);
            errors[1] = true;
        });
        const flatpakUpdatesPromise = this.fetchFlatpakUpdates().catch(() => {
            this.resetButton(box, spinner);
            errors[2] = true;
        });

        const localUpdates = await localUpdatesPromise;
        const endpointUpdates = await endpointUpdatesPromise;
        const flatpakUpdates = await flatpakUpdatesPromise;
        this._refresh_button.set_sensitive(true);
        spinner.stop();
        box.set_center_widget(doneLabel);
        this.updateWindow(localUpdates, endpointUpdates, flatpakUpdates, errors).catch(this.handleError.bind(this));
        await this.fetchAppUpdates().catch((err) => {
            log("Error fetching app updates");
            log(err)
        });
    }

    /**
     * Resets all states of the window, to initialize it
     */
    init() {
        this.setState("arch");
        this.setState("flatpak");
        this.setState("nyarch");

        this._refresh_button.connect("clicked", async () => {
            await this.checkForUpdates().catch(this.handleError.bind(this));
        });
        this._arch_button.connect("clicked", async () => {
            await this.updateArch().catch(this.handleError.bind(this));
        });
        this._flatpak_button.connect("clicked", async () => {
            await this.updateFlatpak().catch(this.handleError.bind(this));
        });
        this._nyarch_button.connect("clicked", async () => {
            await this.updateNyarch().catch(this.handleError.bind(this));
        });
        this.checkForUpdates().catch(this.handleError.bind(this));
    }

    resetButton(box, spinner) {
        const doneLabel = Gtk.Label.new("Check for updates");
        this._refresh_button.set_sensitive(true);
        spinner.stop();
        box.set_center_widget(doneLabel);
    }

    /**
     * Element types
     * @typedef {"loading"|"success"|"error"|"idle"|"updateAvailable"|string} StateType
     */
    /**
     * Type of elements
     * @typedef {"arch"|"flatpak"|"nyarch"|string} ElementType
     */
    /**
     * Used to set the state of a specific type (Arch Updates, Flatpak Updates, Nyarch Updates)
     * @param {ElementType} type The type of the element to set the state of
     * @param {StateType} state The state to set the element to
     * @param {string} [label] The content of the label
     */
    setState(type, state = "loading", label) {
        switch(state) {
            case "loading":
                if (type !== "nyarch") this[`_${type}_label`].set_label(label || "Checking for updates...");
                this[`_${type}_success`].set_visible(false);
                this[`_${type}_spinner`].set_visible(true);
                this[`_${type}_button`].set_visible(false);
                this[`_${type}_error`].set_visible(false);
                break;
            case "success":
                if (type !== "nyarch")this[`_${type}_label`].set_label(label || "No update needed");
                this[`_${type}_success`].set_visible(true);
                this[`_${type}_spinner`].set_visible(false);
                this[`_${type}_button`].set_visible(false);
                this[`_${type}_error`].set_visible(false);
                break;
            case "error":
                if (type !== "nyarch")this[`_${type}_label`].set_label(label || "An error occurred");
                this[`_${type}_success`].set_visible(false);
                this[`_${type}_spinner`].set_visible(false);
                this[`_${type}_button`].set_visible(false);
                this[`_${type}_error`].set_visible(true);
                break;
            case "idle":
                if (type !== "nyarch")this[`_${type}_label`].set_label(label || "No update needed");
                this[`_${type}_success`].set_visible(true);
                this[`_${type}_spinner`].set_visible(false);
                this[`_${type}_button`].set_visible(false);
                this[`_${type}_error`].set_visible(false);
                break;
            case "updateAvailable":
                if (type !== "nyarch")this[`_${type}_label`].set_label(label || "Update available");
                this[`_${type}_success`].set_visible(false);
                this[`_${type}_spinner`].set_visible(false);
                this[`_${type}_button`].set_visible(true);
                this[`_${type}_error`].set_visible(false);
                break;
            default:
                if (type !== "nyarch")this[`_${type}_label`].set_label(label || "No update needed");
                this[`_${type}_success`].set_visible(false);
                this[`_${type}_spinner`].set_visible(false);
                this[`_${type}_button`].set_visible(false);
                this[`_${type}_error`].set_visible(false);
        }
    }

    handleError(error) {
        log("Error");
        this.setState("arch", "error", "An error occurred");
        this.setState("flatpak", "error", "An error occurred");
        this.setState("nyarch", "error", "An error occurred");

        this.createDialog("An error occurred", `Oopsie, an error occurred during the update check! \nError message: ${error.message}`);

        logError(error);
    }

    spawnv(args) {
        return new Promise(async (resolve, reject) => {
            try {
                let proc = this.launcher.spawnv(args);
                proc.communicate_utf8_async(null, null, (proc, res) => {
                    let [,stdout,] = proc.communicate_utf8_finish(res);
                    if (proc.get_successful()) {
                        resolve(stdout);
                    } else {
                        resolve(null);
                    }
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    async fetch(url) {
        const response = await this.fetchBytes(url);
        const decoder = new TextDecoder("utf-8");
        const decoded = decoder.decode(response);
        return JSON.parse(decoded);
    }

    fetchBytes(url) {
        return new Promise(async (resolve, reject) => {
            try {
                const session = Soup.Session.new();
                session.timeout = 10;
                let message = new Soup.Message({
                    method: "GET",
                    uri: GLib.uri_parse(url, GLib.UriFlags.NONE)
                });
                message.request_headers.append('User-Agent', 'GJS-Soup-Client/1.0');
                session.send_and_read_async(
                    message,
                    GLib.PRIORITY_DEFAULT,
                    null,
                    (session, result) => {
                        if (message.get_status() === Soup.Status.OK) {
                            let bytes = session.send_and_read_finish(result);
                            resolve(bytes);
                        } else {
                            reject(message.get_status());
                        }
                    }
                );
            } catch (err) {
                reject(err);
            }
        });
    }

    async updateArch() {
        // gnome-terminal -- /bin/sh -c \"sudo pacman -Syu ; echo Done - Press enter to exit; read _\" command
        await this.launcher.spawnv(['flatpak-spawn', '--host', 'gnome-terminal', '--', 'bash', '-c', "sudo pacman -Syu ; echo Done - Press enter to exit; read _"]);
    }

    async updateFlatpak() {
        await this.launcher.spawnv(['flatpak-spawn', '--host', 'gnome-terminal', '--', 'bash', '-c', "sudo flatpak update ; echo Done - Press enter to exit; read _"]);
    }

    async updateNyarch() {
        if (!this.window) this.window = new PresentationWindow(this.application, this);
        const window = this.window;
        window.present();
        window.connect("close-request", () => {
            window.close();
            this.window = null;
        });
    }

    createDialog(title, message, options = []) {
        const dialog = Adw.AlertDialog.new(title, null);
        dialog.set_body(message);
        dialog.add_response("close", "_Close");
        dialog.set_default_response("close");
        dialog.set_close_response("close");
        if (options.length) {
            for (const option of options) {
                dialog.add_response(option.responseId, option.responseLabel);
            }
        }
        dialog.connect("response", (_source, response) => {
            if (options.length) {
                for (const option of options) {
                    if (response === option.responseId) option.callback();
                }
            }
            if (response === "close") dialog.close();
        });
        dialog.present(dialog);
    }

    async fetchAppUpdates() {
        log("Fetching app updates");
        const res = await this.fetch("https://api.github.com/repos/NyarchLinux/NyarchUpdater/releases/latest");
        const currentVersion = this.application.version;
        const latestVersion = res.tag_name;
        if (compareVersions(currentVersion, latestVersion) !== 1) return;

        this.createDialog("Nyarch Updater Update", `A new version of Nyarch Updater is available: ${latestVersion}`, [{
            responseId: "update",
            responseLabel: "Update",
            callback: () => {
                this.spawnv([
                    'flatpak-spawn',
                    '--host',
                    'gnome-terminal',
                    '--',
                    'bash',
                    '-c',
                    `cd /tmp && wget https://github.com/nyarchlinux/nyarchupdater/releases/latest/download/nyarchupdater.flatpak && flatpak install nyarchupdater.flatpak`
                ]);
            }
        }]);
    }

    async installAlbertIfNotPresent() {
        log("checking if albert is installed")
        
    }
});
