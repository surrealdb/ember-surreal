import Service from '@ember/service';
import Evented from '@ember/object/evented';
import { computed } from '@ember/object';
import { A } from '@ember/array';
import { key } from '../utils/conf';
import guid from '../utils/guid';
import { Promise } from 'rsvp';
import Config from '../-private/config';
import Storage from '../classes/storage';
import Socket from '../classes/socket';
import Poller from '../classes/poller';
import Live from '../classes/live';
import JWT from '../utils/jwt';
import DS from 'ember-data';

export default Service.extend(Config, Evented, {

	// The underlying instance of
	// the WebSocket used for
	// sending and receiving data.

	ws: null,

	// The contents of the decoded
	// JWT token used for retrieving
	// the scope and JWT details.

	jwt: null,

	// Store the requests which are
	// currently waiting for the
	// server to respond.

	events: A(),

	// Whether we can proceed to
	// transition to authenticated
	// and unauthenticated routes.

	opened: false,

	// Whether there is an active
	// connection with the Surreal
	// database server over Socket.

	attempted: false,

	// Whether the connection to the
	// Surreal database has been
	// invalidated with no token.

	invalidated: false,

	// Whether the connection to the
	// Surreal database has been
	// authenticated with a token.

	authenticated: false,

	// Add a computed property for
	// the authentication token so
	// we can get it when needed.

	token: computed(function() {
		return this.storage.get(key);
	}),

	// A computed property which
	// will be true if there are
	// any open server requests.

	loading: computed('events.length', function() {
		return this.get('events.length') > 0;
	}),

	// Setup the Surreal service,
	// listening for token changes
	// and connecting to the DB.

	init() {

		this._super(...arguments);

		// Create a new storage instance so that
		// we can store and persist all session
		// authentication information.

		this.storage = new Storage();

		// Create a new poller for sending ping
		// requests in a repeated manner in order
		// to keep loadbalancing requests open.

		this.pinger = new Poller(60000);

		// Listen for changes to the local storage
		// authentication key, and reauthenticate
		// if the token changes from another tab.

		if (window && window.addEventListener) {

			window.addEventListener('storage', (e) => {
				if (e.key == key) {
					this.authenticate(e.newValue);
				}
			});

		}

		// Listen for invalidation events so that
		// we can decode the JWT contents in order
		// to store it in the JWT object.

		this.on('invalidated', function() {
			let t = this.get('token');
			this.set('jwt', JWT(t));
		});

		// Listen for authentication events so that
		// we can decode the JWT contents in order
		// to store it in the JWT object.

		this.on('authenticated', function() {
			let t = this.get('token');
			this.set('jwt', JWT(t));
		});

		// Next we setup the websocket connection
		// and listen for events on the socket,
		// specifying whether logging is enabled.

		this.ws = new Socket(this.config.url, this.config.opts, {
			log: this.get('storage.debug') === '*',
		});

		// When the connection is closed we
		// change the relevant properties
		// stop live queries, and trigger.

		this.ws.onclose = () => {

			this.pinger.clear();

			this.setProperties({
				events: A(),
				opened: false,
				closed: true,
				attempted: false,
				invalidated: false,
				authentcated: false,
			});

			this.trigger("closed");

		};

		// When the connection is opened we
		// change the relevant properties
		// open live queries, and trigger.

		this.ws.onopen = () => {

			this.pinger.start(this, () => {
				this._send(guid(), 'Ping');
			});

			this.setProperties({
				events: A(),
				opened: true,
				closed: false,
				attempted: false,
				invalidated: false,
				authentcated: false,
			});

			this.trigger("opened");

			this._attempt();

		};

		// When we receive a socket message
		// we process it. If it has an ID
		// then it is a query response.

		this.ws.onmessage = (e) => {
			let d = JSON.parse(e.data);
			if (d.id) {
				this.trigger(d.id, d);
			} else {
				this.trigger(d.method, d.params);
			}
		};

		// Open the websocket for the first
		// time. This will automatically
		// attempt to reconnect on failure.

		this.ws.open();

	},

	// Tear down the Surreal service,
	// ensuring we stop the pinger,
	// and close the WebSocket.

	willDestroy() {

		this.pinger.clear();

		this.ws.close();

		this.ws.onopen = () => {};
		this.ws.onclose = () => {};
		this.ws.onmessage = () => {};

		this._super(...arguments);

	},

	// --------------------------------------------------
	// Helper methods
	// --------------------------------------------------

	sync() {
		return new Live(this, ...arguments);
	},

	when(e, f) {
		return this.get(e) ? f() : this.on(e, f);
	},

	wait(e) {
		return new Promise( (resolve) => {
			return this.get(e) ? resolve() : this.one(e, resolve);
		});
	},

	// --------------------------------------------------
	// Methods for authentication
	// --------------------------------------------------

	signup(v={}) {
		let id = guid();
		return this.wait('opened').then( () => {
			return new Promise( (resolve, reject) => {
				this.one(id, e => this._signup(e, resolve, reject) );
				this._send(id, "Signup", [v]);
			});
		});
	},

	signin(v={}) {
		let id = guid();
		return this.wait('opened').then( () => {
			return new Promise( (resolve, reject) => {
				this.one(id, e => this._signin(e, resolve, reject) );
				this._send(id, "Signin", [v]);
			});
		});
	},

	invalidate() {
		let id = guid();
		return this.wait('opened').then( () => {
			return new Promise( (resolve, reject) => {
				this.one(id, e => this._invalidate(e, resolve, reject) );
				this._send(id, "Invalidate");
			});
		});
	},

	authenticate(t) {
		let id = guid();
		return this.wait('opened').then( () => {
			return new Promise( (resolve, reject) => {
				this.one(id, e => this._authenticate(e, resolve, reject) );
				this._send(id, "Authenticate", [t]);
			});
		});
	},

	// --------------------------------------------------
	// Methods for live queries
	// --------------------------------------------------

	live(c) {
		let id = guid();
		return this.wait('attempted').then( () => {
			return new Promise( (resolve, reject) => {
				this.one(id, e => this._return(e, resolve, reject) );
				this._send(id, "Live", [c]);
			});
		});
	},

	kill(q) {
		let id = guid();
		return this.wait('attempted').then( () => {
			return new Promise( (resolve, reject) => {
				this.one(id, e => this._return(e, resolve, reject) );
				this._send(id, "Kill", [q]);
			});
		});
	},

	// --------------------------------------------------
	// Methods for static queries
	// --------------------------------------------------

	info() {
		let id = guid();
		return this.wait('attempted').then( () => {
			return new Promise( (resolve, reject) => {
				this.one(id, e => this._return(e, resolve, reject) );
				this._send(id, "Info");
			});
		});
	},

	query(q, v={}) {
		let id = guid();
		return this.wait('attempted').then( () => {
			return new Promise( (resolve, reject) => {
				this.one(id, e => this._return(e, resolve, reject) );
				this._send(id, "Query", [q, v]);
			});
		});
	},

	select(c, t=null) {
		let id = guid();
		return this.wait('attempted').then( () => {
			return new Promise( (resolve, reject) => {
				this.one(id, e => this._result(e, t, 'select', resolve, reject) );
				this._send(id, "Select", [c, t]);
			});
		});
	},

	create(c, t=null, d={}) {
		let id = guid();
		return this.wait('attempted').then( () => {
			return new Promise( (resolve, reject) => {
				this.one(id, e => this._result(e, t, 'create', resolve, reject) );
				this._send(id, "Create", [c, t, d]);
			});
		});
	},

	update(c, t=null, d={}) {
		let id = guid();
		return this.wait('attempted').then( () => {
			return new Promise( (resolve, reject) => {
				this.one(id, e => this._result(e, t, 'update', resolve, reject) );
				this._send(id, "Update", [c, t, d]);
			});
		});
	},

	change(c, t=null, d={}) {
		let id = guid();
		return this.wait('attempted').then( () => {
			return new Promise( (resolve, reject) => {
				this.one(id, e => this._result(e, t, 'change', resolve, reject) );
				this._send(id, "Change", [c, t, d]);
			});
		});
	},

	modify(c, t=null, d={}) {
		let id = guid();
		return this.wait('attempted').then( () => {
			return new Promise( (resolve, reject) => {
				this.one(id, e => this._result(e, t, 'modify', resolve, reject) );
				this._send(id, "Modify", [c, t, d]);
			});
		});
	},

	delete(c, t=null) {
		let id = guid();
		return this.wait('attempted').then( () => {
			return new Promise( (resolve, reject) => {
				this.one(id, e => this._result(e, t, 'delete', resolve, reject) );
				this._send(id, "Delete", [c, t]);
			});
		});
	},

	// --------------------------------------------------
	// Private methods
	// --------------------------------------------------

	_send(id, method, params=[]) {
		this.events.pushObject(id);
		this.one(id, () => this.events.removeObject(id) );
		this.ws.send(JSON.stringify({
			id, method, params, async:true
		}));
	},

	_return(e, resolve, reject) {
		if (e.error) {
			return reject( new Error(e.error.message) );
		} else if (e.result) {
			return resolve(e.result);
		}
		return resolve();
	},

	_result(e, t, a, resolve, reject) {
		if (e.error) {
			return reject( new DS.InvalidError(e.error.message) );
		} else if (e.result) {
			return this._output(
				e.result[0].status,
				e.result[0].result,
				e.result[0].detail,
				a, t, resolve, reject,
			)
		}
		return resolve();
	},

	_output(s, r, m, a, t, resolve, reject) {
		switch (s) {
		default:
			return reject( new Error(m) );
		case 'ERR_DB':
			return reject( new DS.ServerError() );
		case 'ERR_KV':
			return reject( new DS.ServerError() );
		case 'ERR_TO':
			return reject( new DS.TimeoutError() );
		case 'ERR_PE':
			return reject( new DS.ForbiddenError() );
		case 'ERR_EX':
			return reject( new DS.ConflictError() );
		case 'ERR_FD':
			return reject( new DS.InvalidError() );
		case 'ERR_IX':
			return reject( new DS.ConflictError() );
		case 'OK':
			switch (a) {
			case 'delete':
				return resolve();
			case 'modify':
				return r && r.length ? resolve(r[0]) : resolve([]);
			case 'create':
				return r && r.length ? resolve(r[0]) : resolve({});
			case 'update':
				return r && r.length ? resolve(r[0]) : resolve({});
			default:
				if (typeof t === "string") {
					return r && r.length ? resolve(r[0]) : reject( new DS.NotFoundError() );
				} else {
					return r && r.length ? resolve(r) : resolve([]);
				}
			}

		}
	},

	_signup(e, resolve, reject) {
		if (e.error) {
			this.storage.set(key, e.result);
			this.setProperties({ attempted: true, invalidated: true, authenticated: false });
			this.trigger('attempted');
			this.trigger('invalidated');
			return reject();
		} else {
			this.storage.set(key, e.result);
			this.setProperties({ attempted: true, invalidated: false, authenticated: true });
			this.trigger('attempted');
			this.trigger('authenticated');
			return resolve();
		}
	},

	_signin(e, resolve, reject) {
		if (e.error) {
			this.storage.set(key, e.result);
			this.setProperties({ attempted: true, invalidated: true, authenticated: false });
			this.trigger('attempted');
			this.trigger('invalidated');
			return reject();
		} else {
			this.storage.set(key, e.result);
			this.setProperties({ attempted: true, invalidated: false, authenticated: true });
			this.trigger('attempted');
			this.trigger('authenticated');
			return resolve();
		}
	},

	_attempt() {
		let token = this.get('token');
		if (token) {
			this.authenticate(token);
		} else {
			this.set('attempted', true);
			this.trigger('attempted');
		}
	},

	_invalidate(e, resolve) {
		this.storage.set(key, null);
		this.setProperties({ attempted: true, invalidated: true, authenticated: false });
		this.trigger('attempted');
		this.trigger('invalidated');
		return resolve();
	},

	_authenticate(e, resolve) {
		if (e.error) {
			this.setProperties({ attempted: true, invalidated: true, authenticated: false });
			this.trigger('attempted');
			this.trigger('invalidated');
			return resolve();
		} else {
			this.setProperties({ attempted: true, invalidated: false, authenticated: true });
			this.trigger('attempted');
			this.trigger('authenticated');
			return resolve();
		}
	},

});
