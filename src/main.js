/* main.js
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
import Gio from 'gi://Gio';
import Adw from 'gi://Adw?version=1';

import { NyarchupdaterWindow } from './window.js';
import { FAQWindow } from "./faq.js";

pkg.initGettext();
pkg.initFormat();


export const NyarchupdaterApplication = GObject.registerClass(
    class NyarchupdaterApplication extends Adw.Application {
        constructor() {
            super({ application_id: 'moe.nyarchlinux.updater', flags: Gio.ApplicationFlags.DEFAULT_FLAGS });

            this.faqWindow = null;

            const quitAction = new Gio.SimpleAction({ name: 'quit' });
                quitAction.connect('activate', () => {
                this.quit();
            });
            this.add_action(quitAction);
            this.set_accels_for_action('app.quit', ['<primary>q']);

            this.set_version("0.1.11");

            const showAboutAction = new Gio.SimpleAction({ name: 'about' });
            showAboutAction.connect('activate', () => {
                const aboutParams = {
                    transient_for: this.active_window,
                    application_name: 'Nyarch Updater',
                    application_icon: 'moe.nyarchlinux.updater',
                    issue_url: 'https://github.com/NyarchLinux/NyarchUpdater/issues',
                    developer_name: 'Nyarch Linux',
                    version: this.version,
                    developers: [
                        'Adam Billard'
                    ],
                    copyright: '© 2025 Nyarch Linux',
                    website: "https://nyarchlinux.moe",
                    license: "GPL-3.0-or-later",
                    support_url: "https://discord.gg/xuw6BNXXE7"
                };
                const aboutWindow = new Adw.AboutWindow(aboutParams);
                aboutWindow.present();
            });

            const faqAction = new Gio.SimpleAction({ name: 'faq' });
            faqAction.connect('activate', () => {
                if (!this.faqWindow) {
                    this.faqWindow = new FAQWindow(this);
                }
                this.faqWindow.present();

                this.faqWindow.connect('close-request', () => {
                    this.faqWindow = null; // Clear the reference when the window is closed
                });
            });

            this.add_action(showAboutAction);
            this.add_action(faqAction);
        }

        vfunc_activate() {
            let { active_window } = this;

            if (!active_window) active_window = new NyarchupdaterWindow(this);

            active_window.present();
        }
    }
);

export function main(argv) {
    const application = new NyarchupdaterApplication();
    return application.runAsync(argv).catch((err) => {
        console.error('Failed to run the application:', err);
        return 1; // Return a non-zero exit code on error
    });
}
