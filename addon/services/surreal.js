import { Promise as EmberPromise, reject } from 'rsvp';
import Evented from '@ember/object/evented';
import Service, { inject as service } from '@ember/service';
import { alias } from '@ember/object/computed';
import { computed } from '@ember/object';
import { A } from '@ember/array';
import { key } from '../utils/conf';
import guid from '../utils/guid';
import Live from '../classes/live';
import Config from '../mixins/config';
import Socket from '../classes/socket';
import DS from 'ember-data';
import EA from 'ember-ajax/errors';

const socket = (window.WebSocket !== undefined);

export default Service.extend(Config, Evented, {

	// The underlying instance of
	// the WebSocket used for
	// sending and receiving data.

	ws: null,

	// Stores the collection of live
	// query connections which are
	// currently open with Surreal.

	lives: A(),

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

	// Import the ajax service so
	// we can make xmlhttprequest
	// calls to the Surreal API.

	ajax: service(),

	// Import the storage service
	// so we can get and set local
	// data regardless of browser.

	storage: service(),

	// Add a computed property for
	// the authentication token so
	// we can get it when needed.

	token: alias(`storage.${key}`),

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

		// If the browser doesn't support sockets
		// then we mark it as connected so that
		// the application can progress.

		if (socket === false) {

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

		}

		// If the browser does support websockets
		// then we setup the websocket connection
		// and listen for events on the socket.

		if (socket === true) {

			this.ws = new Socket(this.conf.url, this.conf.opts, {
				log: this.get('storage.debug') === '*',
			});

			// When the connection is closed we
			// change the relevant properties
			// stop live queries, and trigger.

			this.ws.onclose = () => {

				clearInterval(this.ping);

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

				this.ping = setInterval( () => {
					this._send(guid(), 'Ping');
				}, 60 * 1000);

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

		}

	},

	sync(from, vars) {

		if (socket === false) return;

		let live = new Live(this, from, vars);

		this.lives.push(live);

		return live;

	},

	// --------------------------------------------------
	// Helper methods
	// --------------------------------------------------

	when(e, f) {
		this.on(e, f);
		if (this.get(e)) f();
	},

	wait(e) {
		switch (e) {
		default:
			if (this.get('opened') === false) {
				return reject( new DS.AbortError() );
			}
			// falls through
		case 'opened':
		case 'closed':
			return new EmberPromise( (resolve) => {
				if (this.get(e)) return resolve();
				this.one(e, resolve);
			});
		}
	},

	// --------------------------------------------------
	// Methods for authentication
	// --------------------------------------------------

	signup(v={}) {
		let id = guid();
		return this.wait('opened').then( () => {
			return new EmberPromise( (resolve, reject) => {
				this.one(id, e => this._signup(e, resolve, reject) );
				this._send(id, "Signup", [v]);
			});
		});
	},

	signin(v={}) {
		let id = guid();
		return this.wait('opened').then( () => {
			return new EmberPromise( (resolve, reject) => {
				this.one(id, e => this._signin(e, resolve, reject) );
				this._send(id, "Signin", [v]);
			});
		});
	},

	invalidate() {
		let id = guid();
		return this.wait('opened').then( () => {
			return new EmberPromise( (resolve, reject) => {
				this.one(id, e => this._invalidate(e, resolve, reject) );
				this._send(id, "Invalidate");
			});
		});
	},

	authenticate(t) {
		let id = guid();
		return this.wait('opened').then( () => {
			return new EmberPromise( (resolve, reject) => {
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
			return new EmberPromise( (resolve, reject) => {
				this.one(id, e => this._return(e, resolve, reject) );
				this._send(id, "Live", [c]);
			});
		});
	},

	kill(q) {
		let id = guid();
		return this.wait('attempted').then( () => {
			return new EmberPromise( (resolve, reject) => {
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
			return new EmberPromise( (resolve, reject) => {
				this.one(id, e => this._return(e, resolve, reject) );
				this._send(id, "Info");
			});
		});
	},

	query(q, v={}) {
		let id = guid();
		return this.wait('attempted').then( () => {
			return new EmberPromise( (resolve, reject) => {
				this.one(id, e => this._return(e, resolve, reject) );
				this._send(id, "Query", [q, v]);
			});
		});
	},

	select(c, t=null) {
		let id = guid();
		return this.wait('attempted').then( () => {
			return new EmberPromise( (resolve, reject) => {
				this.one(id, e => this._result(e, t, resolve, reject) );
				this._send(id, "Select", [c, t]);
			});
		});
	},

	create(c, t=null, d={}) {
		let id = guid();
		return this.wait('attempted').then( () => {
			return new EmberPromise( (resolve, reject) => {
				this.one(id, e => this._result(e, t, resolve, reject) );
				this._send(id, "Create", [c, t, d]);
			});
		});
	},

	update(c, t=null, d={}) {
		let id = guid();
		return this.wait('attempted').then( () => {
			return new EmberPromise( (resolve, reject) => {
				this.one(id, e => this._result(e, t, resolve, reject) );
				this._send(id, "Update", [c, t, d]);
			});
		});
	},

	change(c, t=null, d={}) {
		let id = guid();
		return this.wait('attempted').then( () => {
			return new EmberPromise( (resolve, reject) => {
				this.one(id, e => this._result(e, t, resolve, reject) );
				this._send(id, "Change", [c, t, d]);
			});
		});
	},

	modify(c, t=null, d={}) {
		let id = guid();
		return this.wait('attempted').then( () => {
			return new EmberPromise( (resolve, reject) => {
				this.one(id, e => this._result(e, t, resolve, reject) );
				this._send(id, "Modify", [c, t, d]);
			});
		});
	},

	delete(c, t=null) {
		let id = guid();
		return this.wait('attempted').then( () => {
			return new EmberPromise( (resolve, reject) => {
				this.one(id, e => this._delete(e, t, resolve, reject) );
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
		if (socket === true) {
			this.ws.send(JSON.stringify({
				id, method, params, async:true
			}));
		} else {
			let token = this.get('token');
			if (token) {
				this.conf.headers.Authorization = `Bearer ${token}`;
			}
			this.get('ajax').post(`${this.conf.uri}/rpc`, {
				contentType: 'application/json',
				headers: this.conf.headers,
				data: { id, method, params },
			}).then(d => {
				this.trigger(d.id, d);
			}).catch(e => {
				if (e instanceof EA.UnauthorizedError) {
					this.get('storage').set(key, null);
				}
				throw e;
			});
		}
	},

	_return(e, resolve, reject) {
		if (e.error) {
			return reject( new Error(e.error.message) );
		} else if (e.result) {
			return resolve(e.result);
		}
		return resolve();
	},

	_delete(e, t, resolve, reject) {
		if (e.error) {
			return reject( new DS.InvalidError(e.error.message) );
		} else if (e.result) {
			return this._output(
				e.result[0].status,
				e.result[0].result,
				e.result[0].detail,
				-1, t, resolve, reject,
			)
		}
		return resolve();
	},

	_result(e, t, resolve, reject) {
		if (e.error) {
			return reject( new DS.InvalidError(e.error.message) );
		} else if (e.result) {
			return this._output(
				e.result[0].status,
				e.result[0].result,
				e.result[0].detail,
				+1, t, resolve, reject,
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
			case -1: // delete
				return resolve();
			case +1: // others
				if (t) {
					return r ? resolve(r) : reject( new DS.NotFoundError() );
				} else {
					return r ? resolve(r) : resolve([]);
				}
			}

		}
	},

	_signup(e, resolve, reject) {
		if (e.error) {
			this.get('storage').set(key, e.result);
			this.setProperties({ attempted: true, invalidated: true, authenticated: false });
			this.trigger('attempted');
			this.trigger('invalidated');
			return reject();
		} else {
			this.get('storage').set(key, e.result);
			this.setProperties({ attempted: true, invalidated: false, authenticated: true });
			this.trigger('attempted');
			this.trigger('authenticated');
			return resolve();
		}
	},

	_signin(e, resolve, reject) {
		if (e.error) {
			this.get('storage').set(key, e.result);
			this.setProperties({ attempted: true, invalidated: true, authenticated: false });
			this.trigger('attempted');
			this.trigger('invalidated');
			return reject();
		} else {
			this.get('storage').set(key, e.result);
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
		this.get('storage').set(key, null);
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
