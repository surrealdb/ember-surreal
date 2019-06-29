import Mixin from '@ember/object/mixin';
import { inject } from '@ember/service';
import { schedule } from '@ember/runloop';
import { resolve } from 'rsvp';

export default Mixin.create({

	store: inject(),

	surreal: inject(),

	storage: inject(),

	session: resolve,

	connect: resolve,

	disconnect: resolve,

	invalidate: resolve,

	authenticate: resolve,

	beforeModel() {

		this._super(...arguments);

		// If the Surreal connection
		// is opened, then run this.

		this.surreal.on('opened', () => {
			schedule('actions', () => {
				this.connect();
			});
		});

		// If the Surreal connection
		// is closed, then run this.

		this.surreal.on('closed', () => {
			schedule('actions', () => {
				this.disconnect();
			});
		});

		// If the invalidation status is
		// changed then update the session.

		this.surreal.on('invalidated', () => {
			schedule('actions', () => {
				this.invalidate();
				this.store.unloadAll();
				this.surreal.info().then(info => {
					this.surreal.set('session', this.session(info));
				});
			});
		});

		// If the authentication status is
		// changed then update the session.

		this.surreal.on('authenticated', () => {
			schedule('actions', () => {
				this.authenticate();
				this.surreal.info().then(info => {
					this.surreal.set('session', this.session(info));
				});
			});
		});

		// Ensure that we have a connection
		// to Surreal before continuing.

		return this.surreal.wait('opened');

	},

});
