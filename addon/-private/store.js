import Mixin from '@ember/object/mixin';
import Evented from '@ember/object/evented';
import { inject } from '@ember/service';
import { A } from '@ember/array';

export default Mixin.create(Evented, {

	surreal: inject(),

	init() {

		this._super(...arguments);

		this.get('surreal').on('notify', data => {

			A(data).forEach(item => {
				switch (item.action) {
				case "CREATE":
					return this.didModify(item.action, item.result);
				case "UPDATE":
					return this.didModify(item.action, item.result);
				case "DELETE":
					return this.didRemove(item.action, item.result);
				}
			});

		});

	},

	didRemove(action, id) {

		this._super(...arguments);

		let [tb] = id.split(':', 1);

		let record = this.peekRecord(tb, id);

		if (record) record.unloadRecord();

	},

	didModify(action, data) {

		this._super(...arguments);

		// Get the record model types
		let type = this.modelFor(data.meta.tb);
		let serializer = this.serializerFor(data.meta.tb);

		// Serialize the created/updated record
		let json = serializer.normalizeSingleResponse(this, type, data, data.id);

		// Push the created/updated record to the store
		let record = this.push(json);

		// Trigger a notification
		this.trigger(action, data.meta.tb, record);

	},

});
