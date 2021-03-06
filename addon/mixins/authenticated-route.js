import Mixin from '@ember/object/mixin';
import { inject } from '@ember/service';

export default Mixin.create({

	surreal: inject(),

	redirectIfInvalidated: 'signin',

	activate() {

		this._super(...arguments);

		// Listen to invalidation events
		// so that we can redirect routes.

		this.surreal.on('invalidated', this, this.invalidate);

	},

	deactivate() {

		this._super(...arguments);

		// Listen to invalidation events
		// so that we can redirect routes.

		this.surreal.off('invalidated', this, this.invalidate);

	},

	invalidate() {

		// Get the route to which we need
		// to redirect, in the event of an
		// invalidation event.

		const redirect = this.get('redirectIfInvalidated');

        // Redirect the user to the main
        // unauthenticated route in order
        // that they reauthenticate.

		this.transitionTo(redirect);

	},

	redirect(model, transition) {

		// Store the current desired route.

		this.set('surreal.redirectedRoute', transition);

		// Wait for Surreal to be ready.

		return this.surreal.wait('attempted').then( () => {

			// If we are not authenticated then redirect.

			if (!this.get('surreal.authenticated')) {

				// Redirect to the external route.

				let r = this.get('redirectIfInvalidated');
				return this.transitionTo(r);

			}

			return this._super(...arguments);

		});

	},

});
