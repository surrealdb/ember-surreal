import { inject as service } from '@ember/service';
import Mixin from '@ember/object/mixin';

export default Mixin.create({

	surreal: service(),

	redirectIfAuthenticated: 'index',

	activate() {

		this._super(...arguments);

		// Listen to invalidation events
		// so that we can redirect routes.

		this.get('surreal').on('authenticated', this, this.authenticate);

	},

	deactivate() {

		this._super(...arguments);

		// Listen to invalidation events
		// so that we can redirect routes.

		this.get('surreal').off('authenticated', this, this.authenticate);

	},

	authenticate() {

		// Get the route to which we need
		// to redirect, in the event of an
		// authentication event.

		const redirect = this.get('redirectIfAuthenticated');

		// Check to see if there was any
		// previously accessed route before
		// the user authenticated.

		const previous = this.get('surreal.redirectedRoute');

		// Redirect the user to the main
        // authenticated route if there is
        // no previously accessed route.

		if (previous) {
			previous.retry();
		} else {
			this.transitionTo(redirect);
		}

	},

	redirect() {

		// Wait for Surreal to be ready.

		return this.get('surreal').wait('attempted').then( () => {

			// If we are authenticated then redirect.

			if (this.get('surreal.authenticated')) {

				// Redirect to the internal route.

				let r = this.get('redirectIfAuthenticated');
				return this.transitionTo(r);

			}

			return this._super(...arguments);

		});

	},

});
