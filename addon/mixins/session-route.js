import Mixin from '@ember/object/mixin';
import { inject } from '@ember/service';

export default Mixin.create({

	surreal: inject(),

	beforeModel() {

		this._super(...arguments);

		// Ensure that we have attempted
		// to authenticate before continuing.

		return this.surreal.info().then(info => {
			this.surreal.set('session', this.session(info));
		});

	},

});
