import Mixin from '@ember/object/mixin';
import { inject } from '@ember/service';

export default Mixin.create({

	store: inject(),

	surreal: inject(),

	redirectAfterSignout: 'login',

	redirect() {

		// Signout and remove the token.

		return this.surreal.invalidate().then( () => {

			// Unload all data store records.

			this.get('store').unloadAll();

			// Redirect to the specified route.

			let r = this.get('redirectAfterSignout');
			return this.transitionTo(r);

		});

	},

});
