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