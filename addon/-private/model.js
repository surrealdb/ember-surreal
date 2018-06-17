import Mixin from '@ember/object/mixin';
import DS from 'ember-data';

export default Mixin.create({

	meta: DS.attr({
		readOnly: true,
	}),

	didLoad() {
		this._super(...arguments);
		this.store.didLoad(this);
	},

	didCreate(record) {
		this._super(...arguments);
		this.store.didCreate(record);
	},

	didUpdate(record) {
		this._super(...arguments);
		this.store.didUpdate(record);
	},

	didDelete(record) {
		this._super(...arguments);
		this.store.didDelete(record);
	},

	rolledBack(record) {
		this._super(...arguments);
		this.store.didUpdate(record);
	},

	becameError() {
		this._super(...arguments);
		this.rollbackAttributes();
	},

	becameInvalid() {
		this._super(...arguments);
		this.rollbackAttributes();
	},

});
