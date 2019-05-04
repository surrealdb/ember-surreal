/*eslint no-console: "off"*/
import WebSocket from '../utils/ws';

const settings = {
	// Show debug messages?
	log: false,
	// Connect automatically?
	autoConnect: false,
	// Delay in milliseconds before failing
	timeoutInterval: 5000,
	// Delay in milliseconds before reconnecting
	reconnectInterval: 1000,
	// Maximum delay in milliseconds before reconnecting
	maxReconnectInterval: 15000,
	// The backoff rate for reconnection timeout delays
	reconnectDecay: 1.5,
	// The binary type, possible values 'blob' or 'arraybuffer'
	binaryType: 'blob'
};

export default class Socket {

	constructor(url, protocols=["json", "pack"], options={}) {

		for (var key in settings) {
			if (typeof options[key] !== 'undefined') {
				this[key] = options[key];
			} else {
				this[key] = settings[key];
			}
		}

		// The websocket
		this.ws = null;

		// The websocket URL
		this.url = url;

		// If force closed or not
		this.closed = false;

		// If socket timedout or not
		this.timedout = false;

		// The selected websocket protocol
		this.protocol = null;

		// The predefined allowed protocols
		this.protocols = protocols;

		// The number of attempted reconnects sofar
		this.reconnectAttempts = 0;

		// Normalize the url if a http or https endpoint has been defined.
		this.url = String(this.url).replace('http://', 'ws://')
		this.url = String(this.url).replace('https://', 'wss://');

		this.autoConnect ? this.open() : null;

	}

	open() {

		this.ws = new WebSocket(this.url, this.protocols);

		this.debug('connecting');

		this.onconnecting ? this.onconnecting() : null;

		var timeout = setTimeout( () => {
			this.debug('timeout');
			this.timedout = true;
			this.ws.close();
			this.timedout = false;
		}, this.timeoutInterval);

		this.ws.onopen = (e) => {
			this.debug('opened');
			clearTimeout(timeout);
			this.onopen ? this.onopen(e) : null;
			this.protocol = this.ws.protocol;
			this.reconnectAttempts = 0;
		};

		this.ws.onclose = (e) => {
			this.debug('closed');
			clearTimeout(timeout);
			this.onclose ? this.onclose(e) : null;
			if (this.closed === false) {
				setTimeout( () => {
					this.reconnectAttempts++;
					this.open();
				}, this.time());
			}
		};

		this.ws.onerror = (e) => {
			this.debug('failed');
			this.onerror ? this.onerror(e) : null;
		};

		this.ws.onmessage = (e) => {
			this.debug('received', e.data);
			this.onmessage ? this.onmessage(e) : null;
		};

	}

	time() {
		let decay = this.reconnectDecay;
		let delay = this.reconnectInterval;
		let count = this.reconnectAttempts;
		let calcs = delay * Math.pow(decay, count);
		return Math.min(calcs, this.maxReconnectInterval);
	}

	send(data) {
		this.debug('sending', data);
		this.ws ? this.ws.send(data) : null;
	}

	close(code, reason) {
		this.closed = true;
		this.ws ? this.ws.close(code, reason) : null;
	}

	debug(t, j="{}") {

		if (!this.log) return;

		let d = JSON.parse(j);

		if (d.error) {
			console.group('[WebSocket]', t, this.url, d.id);
			console.error( new Error(d.error.message) );
			console.groupEnd();
			return;
		}

		if (d.method) {
			console.group('[WebSocket]', t, this.url, d.id);
			console.info( { method:d.method, params:d.params } );
			console.groupEnd();
			return;
		}

		if (d.result) {
			console.group('[WebSocket]', t, this.url, d.id);
			if (Array.isArray(d.result)) {
				d.result.forEach(q => { console.info(q) });
			} else {
				console.info(d.result);
			}
			console.groupEnd();
			return;
		}

		console.info('[WebSocket]', t, this.url);

	}

}


