/*eslint no-console: "off"*/

export default function(url, protocols=["json", "pack"], options={}) {

	var settings = {
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
		/** The binary type, possible values 'blob' or 'arraybuffer', default 'blob'. */
		binaryType: 'blob'
	}

	for (var key in settings) {
		if (typeof options[key] !== 'undefined') {
			this[key] = options[key];
		} else {
			this[key] = settings[key];
		}
	}

	var self = this;

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
	this.url = String(this.url).replace('http://', 'ws://').replace('https://', 'wss://');

	this.open = function() {

		self.ws = new WebSocket(this.url, this.protocols);

		self.debug('connecting');

		self.onconnecting ? self.onconnecting() : null;

		var timeout = setTimeout(function() {
			self.debug('timeout');
			self.timedout = true;
			self.ws.close();
			self.timedout = false;
		}, self.timeoutInterval);

		self.ws.onopen = function(e) {
			self.debug('opened');
			clearTimeout(timeout);
			self.onopen ? self.onopen(e) : null;
			self.protocol = self.ws.protocol;
			self.reconnectAttempts = 0;
		};

		self.ws.onclose = function(e) {
			self.debug('closed');
			clearTimeout(timeout);
			self.onclose ? self.onclose(e) : null;
			if (self.closed === false) {
				setTimeout(function() {
					self.reconnectAttempts++;
					self.open();
				}, self.time());
			}
		};

		self.ws.onerror = function(e) {
			self.debug('failed');
			self.onerror ? self.onerror(e) : null;
		};

		self.ws.onmessage = function(e) {
			self.debug('received', e.data);
			self.onmessage ? self.onmessage(e) : null;
		};

	};

	this.time = function() {
		let decay = self.reconnectDecay;
		let delay = self.reconnectInterval;
		let count = self.reconnectAttempts;
		let calcs = delay * Math.pow(decay, count);
		return Math.min(calcs, self.maxReconnectInterval);
	};

	this.send = function(data) {
		self.debug('sending', data);
		self.ws ? self.ws.send(data) : null;
	};

	this.close = function(code=1000, reason) {
		self.closed = true;
		self.ws ? self.ws.close(code, reason) : null;
	};

	this.debug = function(t, j="{}") {

		if (!this.log) return;

		let d = JSON.parse(j);

		if (d.error) {
			console.group('[WebSocket]', t, self.url, d.id);
			console.error( new Error(d.error.message) );
			console.groupEnd();
			return;
		}

		if (d.method) {
			console.group('[WebSocket]', t, self.url, d.id);
			console.info( { method:d.method, params:d.params } );
			console.groupEnd();
			return;
		}

		if (d.result) {
			console.group('[WebSocket]', t, self.url, d.id);
			if (Array.isArray(d.result)) {
				d.result.forEach(q => { console.info(q) });
			} else {
				console.info(d.result);
			}
			console.groupEnd();
			return;
		}

		console.info('[WebSocket]', t, self.url);

	};

	this.autoConnect ? this.open() : null;

	return this;

}
