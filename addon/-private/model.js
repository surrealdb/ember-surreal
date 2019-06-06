import Mixin from '@ember/object/mixin';
import { observer } from '@ember/object';
import { inject } from '@ember/service';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency';
import { on } from '@ember/object/evented';
import DS from 'ember-data';

export default Mixin.create({

	surreal: inject(),

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

	findsave: on('init', observer('dirtyType', function() {
		this.get('autosave').perform();
	})),

	autosave: task(function* () {

		yield timeout(100);

		if (this.dirtyType === 'updated') {
			yield this.save();
		}

	}).restartable(),

	deleter: task(function* (store, type, snapshot) {

		return yield this.surreal.delete(type.modelName, snapshot.id);

	}).restartable(),

	creater: task(function* (store, type, snapshot) {

		try {

			let data = this.serialize();

			return yield this.surreal.create(type.modelName, snapshot.id, data);

		} catch (e) {

			return null;

		}

	}).restartable(),

	updater: task(function* (store, type, snapshot) {

		try {

			yield timeout(1000);

			let data = this.serialize();

			return yield this.surreal.change(type.modelName, snapshot.id, data);

		} catch (e) {

			return null;

		}

	}).restartable(),

});
