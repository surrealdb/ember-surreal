import Mixin from '@ember/object/mixin';
import DS from 'ember-data';

export default Mixin.create({

	meta: DS.attr({
		readOnly: true,
	}),

	becameError() {
		this._super(...arguments);
		this.rollbackAttributes();
	},

	becameInvalid() {
		this._super(...arguments);
		this.rollbackAttributes();
	},

});
