import { inject as service } from '@ember/service';
import Mixin from '@ember/object/mixin';

export default Mixin.create({

	store: service(),

	surreal: service(),

	redirectAfterSignout: 'login',

	redirect() {

		// Signout and remove the token.

		return this.get('surreal').invalidate().then( () => {

			// Unload all data store records.

			this.get('store').unloadAll();

			// Redirect to the specified route.

			let r = this.get('redirectAfterSignout');
			return this.transitionTo(r);

		});

	},

});
