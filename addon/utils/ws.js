/* globals window, FastBoot */

export default function() {

	let ws = undefined;

	if (typeof FastBoot === 'undefined') {
		ws = window && window.WebSocket;
	}

	if (typeof FastBoot !== 'undefined') {
		ws = FastBoot && FastBoot.require('ws');
	}

	return ws ? new ws(...arguments) : undefined;

}
