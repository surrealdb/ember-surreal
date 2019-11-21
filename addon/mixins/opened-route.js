import Mixin from '@ember/object/mixin';
import { inject } from '@ember/service';

export default Mixin.create({

	surreal: inject(),

	beforeModel() {

		this._super(...arguments);

		// Ensure that we have a connection
		// to Surreal before continuing.

		return this.surreal.wait('opened');

	},

});
