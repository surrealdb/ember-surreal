import { inject as service } from '@ember/service';
import Mixin from '@ember/object/mixin';
import { schedule } from '@ember/runloop';
import { resolve } from 'rsvp';

export default Mixin.create({

	store: service(),

	surreal: service(),

	storage: service(),

	session: resolve,

	connect: resolve,

	disconnect: resolve,

	invalidate: resolve,

	authenticate: resolve,

	beforeModel() {

		this._super(...arguments);

		// Get the data store

		let store = this.get('store');

		// Get the surreal service

		let surreal = this.get('surreal');

		// If the Surreal connection
		// is opened, then run this.

		surreal.on('opened', () => {
			schedule('actions', () => {
				this.connect();
			});
		});

		// If the Surreal connection
		// is closed, then run this.

		surreal.on('closed', () => {
			schedule('actions', () => {
				this.disconnect();
			});
		});

		// If the invalidation status is
		// changed then update the session.

		surreal.on('invalidated', () => {
			schedule('actions', () => {
				store.unloadAll();
				this.invalidate();
				this.session().then(s => {
					surreal.set('session', s);
				});
			});
		});

		// If the authentication status is
		// changed then update the session.

		surreal.on('authenticated', () => {
			schedule('actions', () => {
				this.authenticate();
				this.session().then(s => {
					surreal.set('session', s);
				});
			});
		});

		// Ensure that we have a connection
		// to Surreal before continuing.

		return surreal.wait('opened');

	},

});
