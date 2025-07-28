/* utils.js
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

/**
 * Used to log in the console with a small stack trace saying where the log was called from
 * @param {string} type The type of log to be used (console[type])
 * @param {any[]} args The arguments to be logged
 */
export function stackLog(type, ...args) {
    let initiator = 'unknown place';
    const e = new Error();
    if (typeof e.stack === 'string') {
        let isFirst = true;
        for (const line of e.stack.split('\n')) {
            const matches = line.match(/^\s+at\s+(.*)/);
            if (matches) {
                // first line - current function
                if (!isFirst) {
                    // second line - caller (what we are looking for)
                    initiator = matches[1];
                    break;
                }
                isFirst = false;
            }
        }
    }
    console[type](...args, '\n', `  at ${initiator}`);
}

/**
 * Compare two version strings
 * @param old The old version string
 * @param newer The new version string
 * @returns {number} -1 if the old version is greater, 1 if the new version is greater, 0 if they are equal
 */
export function compareVersions(old, newer) {
    const oldParts = old.split('.').map(Number);
    const newParts = newer.split('.').map(Number);

    for (let i = 0; i < Math.max(oldParts.length, newParts.length); i++) {
        const oldPart = oldParts[i] || 0;
        const newPart = newParts[i] || 0;

        if (oldPart > newPart) {
            return -1;
        } else if (oldPart < newPart) {
            return 1;
        }
    }
    return 0;
}